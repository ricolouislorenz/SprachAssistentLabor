import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import OpenAI from "openai";

dotenv.config();

const app = express();
const uploadDir = "uploads";

const APP_PASSWORD = process.env.APP_PASSWORD || "";
const AUTH_ENABLED = APP_PASSWORD.length > 0;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Single-User-Session: nur eine aktive Anmeldung gleichzeitig. Jeder
// erfolgreiche Login erzeugt ein neues Token und ersetzt das vorherige
// — die zuvor aktive Sitzung wird damit automatisch ungültig (last-login wins).
// In-Memory: nach einem Server-Restart muss neu angemeldet werden.
let currentSession = null; // { token: string, createdAt: number }

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function requireSession(req, res, next) {
  if (!AUTH_ENABLED) return next();
  const provided = req.get("X-Session-Token") || "";
  if (!currentSession || !timingSafeEqual(provided, currentSession.token)) {
    return res.status(401).json({
      error: "Nicht autorisiert.",
      details: "Sitzung ungültig oder durch eine andere Anmeldung beendet."
    });
  }
  next();
}

// Upload-Ordner sicherstellen
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Wichtig: Datei mit Endung speichern, damit OpenAI das Audioformat erkennt
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const originalExt = path.extname(file.originalname || "").toLowerCase();

    // Für den aktuellen Frontend-Recorder ist webm der erwartete Standard
    const safeExt = originalExt || ".webm";

    cb(null, `${Date.now()}-aufnahme${safeExt}`);
  }
});

const upload = multer({ storage });

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: false,
    allowedHeaders: ["Content-Type", "X-Session-Token"]
  })
);
app.use(express.json({ limit: "20mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    openaiKeyLoaded: Boolean(process.env.OPENAI_API_KEY),
    authRequired: AUTH_ENABLED
  });
});

// Login: prüft Passwort, erzeugt neues Session-Token, verdrängt eine evtl.
// vorhandene andere Session. Antwort enthält das Token, das der Client als
// X-Session-Token-Header bei allen geschützten Endpoints mitsenden muss.
app.post("/api/auth/login", (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({ ok: true, token: "", authRequired: false });
  }
  const password = (req.body && req.body.password) || "";
  if (!timingSafeEqual(password, APP_PASSWORD)) {
    return res.status(401).json({
      error: "Nicht autorisiert.",
      details: "App-Passwort fehlt oder ist falsch."
    });
  }
  const token = crypto.randomBytes(32).toString("hex");
  currentSession = { token, createdAt: Date.now() };
  console.log("Neue Session erzeugt — vorherige Sitzung wurde verdrängt.");
  res.json({ ok: true, token, authRequired: true });
});

// Logout: nur die eigene Session wird beendet (verhindert, dass ein fremder
// Client die aktive Sitzung eines anderen Nutzers killen kann).
app.post("/api/auth/logout", (req, res) => {
  if (!AUTH_ENABLED) return res.json({ ok: true });
  const provided = req.get("X-Session-Token") || "";
  if (currentSession && timingSafeEqual(provided, currentSession.token)) {
    currentSession = null;
  }
  res.json({ ok: true });
});

// Verifiziert nur die Session — keine Inhalte, keine OpenAI-Kosten.
// Vom Frontend periodisch aufgerufen, um eine durch fremde Anmeldung
// beendete Sitzung zu erkennen.
app.get("/api/auth/verify", requireSession, (req, res) => {
  res.json({ ok: true });
});

app.post("/api/transcribe", requireSession, upload.single("audio"), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log("Transkription angefragt.");

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY fehlt.",
        details: "Bitte prüfe die .env-Datei im Backend-Ordner."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Keine Audiodatei erhalten."
      });
    }

    uploadedPath = req.file.path;

    console.log("Upload-Datei erhalten:", {
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    if (!req.file.size || req.file.size === 0) {
      return res.status(400).json({
        error: "Audiodatei ist leer.",
        details: "Die Aufnahme wurde erstellt, enthält aber keine Audiodaten."
      });
    }

    const transcription = await client.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file: fs.createReadStream(uploadedPath),
      response_format: "json",
      language: "de"
    });

    console.log("Transkription erfolgreich.");

    res.json({
      text: transcription.text || ""
    });
  } catch (error) {
    console.error("Fehler bei Transkription:", error);

    res.status(500).json({
      error: "Transkription fehlgeschlagen.",
      details: error?.message || String(error),
      code: error?.code || null,
      type: error?.type || null,
      param: error?.param || null
    });
  } finally {
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
  }
});

app.post("/api/structure", requireSession, async (req, res) => {
  try {
    console.log("Strukturierung angefragt.");

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY fehlt.",
        details: "Bitte prüfe die .env-Datei im Backend-Ordner."
      });
    }

    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({
        error: "Kein Transkript erhalten."
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
Du bist ein Labor-Dokumentationsassistent.

Aufgabe:
Wandle ein deutsches Labor-Diktat in ein strukturiertes Laborprotokoll um.

Wichtige Regeln:
- Erfinde keine Angaben.
- Übernimm Artikelnummern, Chargennummern, Messwerte und Einheiten möglichst exakt.
- Wenn Angaben fehlen, trage sie in "fehlende_angaben" ein.
- Wenn Angaben unsicher klingen, trage sie in "unsicherheiten" ein.
- Entferne Sprachbefehle wie "Laborassistent Aufnahme starten", "Laborassistent Aufnahme stoppen", "Laborassistent Protokoll erstellen".
- Formuliere Beobachtungen sachlich und dokumentationstauglich.
- Trenne Beobachtung und Bewertung klar.
- "Unauffällig", "entspricht", "nicht freigegeben" oder "freigegeben" gehört zur Bewertung.
- Keine medizinischen oder regulatorischen Bewertungen erfinden.
`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "laborprotokoll",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              produktname: { type: "string" },
              artikelnummer: { type: "string" },
              lieferant: { type: "string" },
              chargennummer: { type: "string" },
              pruefer: { type: "string" },
              datum: { type: "string" },
              anlass: { type: "string" },
              durchfuehrung: { type: "string" },
              beobachtung: { type: "string" },
              messwerte: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    parameter: { type: "string" },
                    wert: { type: "string" },
                    einheit: { type: "string" },
                    bemerkung: { type: "string" }
                  },
                  required: ["parameter", "wert", "einheit", "bemerkung"]
                }
              },
              abweichungen: { type: "string" },
              bewertung: { type: "string" },
              naechste_schritte: { type: "string" },
              unsicherheiten: {
                type: "array",
                items: { type: "string" }
              },
              fehlende_angaben: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: [
              "produktname",
              "artikelnummer",
              "lieferant",
              "chargennummer",
              "pruefer",
              "datum",
              "anlass",
              "durchfuehrung",
              "beobachtung",
              "messwerte",
              "abweichungen",
              "bewertung",
              "naechste_schritte",
              "unsicherheiten",
              "fehlende_angaben"
            ]
          }
        }
      }
    });

    const structured = JSON.parse(response.output_text);

    console.log("Strukturierung erfolgreich.");

    res.json(structured);
  } catch (error) {
    console.error("Fehler bei Strukturierung:", error);

    res.status(500).json({
      error: "Strukturierung fehlgeschlagen.",
      details: error?.message || String(error),
      code: error?.code || null,
      type: error?.type || null,
      param: error?.param || null
    });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Backend läuft auf http://localhost:${port}`);
  console.log(`App-Passwort: ${AUTH_ENABLED ? "aktiv" : "deaktiviert (APP_PASSWORD nicht gesetzt)"}`);
  if (allowedOrigins.length > 0) {
    console.log(`Erlaubte Origins: ${allowedOrigins.join(", ")}`);
  }
});