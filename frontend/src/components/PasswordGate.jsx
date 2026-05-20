import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

export function PasswordGate({ onUnlock, verifyPassword }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!password) {
      setError("Bitte Passwort eingeben.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ok = await verifyPassword(password);
      if (ok) {
        onUnlock(password);
      } else {
        setError("Passwort ist falsch oder Backend nicht erreichbar.");
      }
    } catch (err) {
      setError(err?.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={handleSubmit}>
        <div className="gate-brand">
          <div className="gate-logo">LK</div>
          <div>
            <div className="gate-title">Laborassistent · Konrad</div>
            <div className="gate-subtitle">Geschützter Bereich</div>
          </div>
        </div>

        <p className="gate-description">
          Dieser Prototyp ist passwortgeschützt, um Fremdnutzung und unkontrollierte
          API-Kosten zu verhindern.
        </p>

        <label className="gate-label">
          <span>App-Passwort</span>
          <div className="gate-input-wrap">
            <Lock size={16} className="gate-input-icon" aria-hidden="true" />
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={busy}
            />
          </div>
        </label>

        {error && <div className="gate-error">{error}</div>}

        <button type="submit" className="gate-submit" disabled={busy || !password}>
          {busy ? (
            <>
              <Loader2 size={16} className="spin" />
              Prüfe …
            </>
          ) : (
            <>
              <Lock size={16} />
              Entsperren
            </>
          )}
        </button>
      </form>
    </div>
  );
}
