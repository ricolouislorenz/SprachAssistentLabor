// Wakeword: "Konrad". Befehle verlangen das Wakeword als Schutz vor Fehlauslösung.

export const COMMANDS = {
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
  RESUME: "resume",
  BUILD_PROTOCOL: "build_protocol",
  RESET: "reset"
};

export function normalizeTranscript(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const WAKEWORD_VARIANTS = [
  "konrad",
  "conrad",
  "konratt",
  "konrat"
];

export function containsWakeword(normalized) {
  return WAKEWORD_VARIANTS.some((w) => normalized.includes(w));
}

const ACTIVATE_PATTERNS = [
  /\bhey (konrad|conrad|konratt|konrat)\b/,
  /\bhallo (konrad|conrad|konratt|konrat)\b/,
  /\b(konrad|conrad|konratt|konrat)[, ]+(starten|start|aufnahme starten|los)\b/
];

const DEACTIVATE_PATTERNS = [
  /\btschuess (konrad|conrad|konratt|konrat)\b/,
  /\btschuss (konrad|conrad|konratt|konrat)\b/,
  /\bauf wiedersehen (konrad|conrad|konratt|konrat)\b/,
  /\b(konrad|conrad|konratt|konrat)[, ]+(stoppen|stopp|aufnahme stoppen|pause|ende)\b/
];

const RESUME_PATTERNS = [
  /\b(konrad|conrad|konratt|konrat)[, ]+(weiter|weiter aufnehmen|fortsetzen|weitermachen)\b/
];

const BUILD_PROTOCOL_PATTERNS = [
  /\b(konrad|conrad|konratt|konrat)[, ]+(protokoll erstellen|protokoll erzeugen|protokoll generieren|auswerten)\b/
];

const RESET_PATTERNS = [
  /\b(konrad|conrad|konratt|konrat)[, ]+(zuruecksetzen|zurueck setzen|reset|neu starten|alles loeschen)\b/
];

// Replace common umlaut spellings the SpeechRecognition engine emits with
// ascii so the patterns above stay readable.
function flattenUmlauts(text) {
  return text
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export function parseCommand(rawText) {
  const normalized = flattenUmlauts(normalizeTranscript(rawText));

  if (!containsWakeword(normalized)) return null;

  if (ACTIVATE_PATTERNS.some((p) => p.test(normalized))) return COMMANDS.ACTIVATE;
  if (DEACTIVATE_PATTERNS.some((p) => p.test(normalized))) return COMMANDS.DEACTIVATE;
  if (RESUME_PATTERNS.some((p) => p.test(normalized))) return COMMANDS.RESUME;
  if (BUILD_PROTOCOL_PATTERNS.some((p) => p.test(normalized))) return COMMANDS.BUILD_PROTOCOL;
  if (RESET_PATTERNS.some((p) => p.test(normalized))) return COMMANDS.RESET;

  return null;
}

// Entfernt Befehlsphrasen aus dem Live-Transkript, damit das spätere Protokoll
// nicht "Hey Konrad ..." enthält.
const COMMAND_PHRASE_REGEXES = [
  /hey\s+(konrad|conrad|konratt|konrat)[.,!? ]*/gi,
  /hallo\s+(konrad|conrad|konratt|konrat)[.,!? ]*/gi,
  /tsch[üu]ess?\s+(konrad|conrad|konratt|konrat)[.,!? ]*/gi,
  /auf\s+wiedersehen\s+(konrad|conrad|konratt|konrat)[.,!? ]*/gi,
  /(konrad|conrad|konratt|konrat)[,\s]+(protokoll\s+(erstellen|erzeugen|generieren))[.,!? ]*/gi,
  /(konrad|conrad|konratt|konrat)[,\s]+(aufnahme\s+(starten|stoppen))[.,!? ]*/gi,
  /(konrad|conrad|konratt|konrat)[,\s]+(weiter(\s+aufnehmen)?|fortsetzen|weitermachen)[.,!? ]*/gi,
  /(konrad|conrad|konratt|konrat)[,\s]+(zur[üu]cksetzen|reset|neu\s+starten|alles\s+l[öo]schen|stoppen|stopp|starten|start|pause|ende|los|auswerten)[.,!? ]*/gi
];

export function stripCommandPhrases(text) {
  let cleaned = text;
  for (const re of COMMAND_PHRASE_REGEXES) {
    cleaned = cleaned.replace(re, " ");
  }
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

export const COMMAND_LABELS = {
  [COMMANDS.ACTIVATE]: "Aufnahme starten",
  [COMMANDS.DEACTIVATE]: "Aufnahme stoppen",
  [COMMANDS.RESUME]: "Aufnahme fortsetzen",
  [COMMANDS.BUILD_PROTOCOL]: "Protokoll erstellen",
  [COMMANDS.RESET]: "Zurücksetzen"
};
