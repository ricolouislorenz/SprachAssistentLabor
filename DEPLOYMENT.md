# Deployment

Der Prototyp besteht aus zwei Teilen, die getrennt deployed werden müssen:

| Teil | Empfohlenes Hosting | Was läuft dort |
| --- | --- | --- |
| **Frontend** (`frontend/`) | GitHub Pages | Statische React-App |
| **Backend** (`backend/`) | Render, Railway, Fly.io, Vercel-Functions, eigener Server | Express + OpenAI-Calls |

Das Backend **darf nicht** auf GitHub Pages laufen, weil dort nur statische Dateien ausgeliefert werden und der OpenAI-API-Key nie an den Browser gelangen darf.

## 1. Backend hosten

1. Repo bei einem Node-fähigen Hosting-Anbieter verbinden.
2. Start-Befehl: `npm install && npm start` im Ordner `backend/`.
3. Environment-Variablen setzen (siehe `backend/.env.example`):
   - `OPENAI_API_KEY` — dein OpenAI-Key
   - `APP_PASSWORD` — geteiltes Passwort für die Authentifizierung
   - `ALLOWED_ORIGINS` — Komma-Liste, mindestens deine GitHub-Pages-URL (`https://USER.github.io`)
   - `PORT` — wird vom Anbieter meist automatisch gesetzt
4. Nach dem Deploy die öffentliche HTTPS-URL notieren (z. B. `https://laborassistent-backend.onrender.com`).
5. Test: `curl https://<backend-url>/health` muss `{"ok":true,...}` liefern.

## 2. GitHub-Pages-Deployment einrichten

1. Repository auf GitHub anlegen / pushen.
2. In den Repo-Settings unter **Pages → Build and deployment** als Source **„GitHub Actions"** auswählen.
3. Unter **Settings → Secrets and variables → Actions** ein neues **Repository secret** anlegen:
   - Name: `VITE_BACKEND_URL`
   - Value: die öffentliche HTTPS-URL deines gehosteten Backends
4. Push auf `main` (oder `master`) triggert den Workflow in `.github/workflows/deploy.yml`.
5. Die App ist danach unter `https://USER.github.io/REPO/` erreichbar.

Der Workflow setzt automatisch:
- `VITE_BASE_PATH=/REPO/` (Repo-Name aus Github-Kontext)
- `VITE_BACKEND_URL=<dein Secret>`

## 3. Lokal entwickeln

```bash
# Backend
cd backend
cp .env.example .env
# OPENAI_API_KEY und (optional) APP_PASSWORD eintragen
npm install
npm run dev

# Frontend (in zweitem Terminal)
cd frontend
cp .env.example .env
# VITE_BACKEND_URL=http://localhost:3001 reicht
npm install
npm run dev
```

Frontend läuft auf `http://localhost:5173`. Chrome oder Edge verwenden — Firefox unterstützt die Web-Speech-API nicht zuverlässig.

## 4. Passwortschutz

- Wenn `APP_PASSWORD` im Backend gesetzt ist, blockiert die `PasswordGate`-Komponente die App, bis das Passwort eingegeben wurde.
- Das Passwort wird nach Eingabe im `localStorage` des Browsers gespeichert; Nutzer müssen sich nicht bei jedem Aufruf erneut anmelden.
- Im UI gibt es einen **Abmelden**-Button in der TopBar, der das gespeicherte Passwort löscht.
- Setze ein starkes, zufälliges Passwort — alle berechtigten Nutzer teilen es.
- Wenn `APP_PASSWORD` leer bleibt, ist die Auth deaktiviert (sinnvoll nur lokal).

## 5. Wichtig

- **OpenAI-Key niemals committen** — `.env` ist in `.gitignore`.
- **CORS**: `ALLOWED_ORIGINS` im Backend muss die GitHub-Pages-URL enthalten, sonst blockiert der Browser die API-Calls.
- **HTTPS für die Web-Speech-API**: Browser erlauben Mikrofonzugriff nur auf `localhost` oder `https://`. GitHub Pages liefert HTTPS aus.
