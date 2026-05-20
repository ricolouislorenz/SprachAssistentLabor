import { Volume2 } from "lucide-react";

const COMMANDS = [
  { phrase: `„Hey Konrad“`, action: "Aufnahme starten" },
  { phrase: `„Tschüss Konrad“`, action: "Aufnahme stoppen" },
  { phrase: `„Konrad, weiter aufnehmen“`, action: "Aufnahme fortsetzen" },
  { phrase: `„Konrad, Protokoll erstellen“`, action: "Transkript strukturieren" },
  { phrase: `„Konrad, zurücksetzen“`, action: "Sitzung verwerfen" }
];

export function CommandPanel({ supported, lastUtterance, lastCommandLabel }) {
  return (
    <section className="card no-print">
      <header className="card-header">
        <div>
          <h2>Sprachbefehle</h2>
          <p className="card-sub">
            Alle Befehle beginnen mit dem Wakeword „Konrad" — so wird normales
            Laborgespräch nicht versehentlich interpretiert.
          </p>
        </div>
      </header>

      <ul className="command-list">
        {COMMANDS.map(({ phrase, action }) => (
          <li key={phrase}>
            <span className="command-phrase">{phrase}</span>
            <span className="command-arrow" aria-hidden="true">→</span>
            <span className="command-action">{action}</span>
          </li>
        ))}
      </ul>

      <div className="command-echo" aria-live="polite">
        <Volume2 size={14} aria-hidden="true" />
        <div>
          <span className="command-echo-label">Zuletzt gehört</span>
          <span className="command-echo-value">
            {lastCommandLabel
              ? `${lastCommandLabel} — „${lastUtterance || ""}"`
              : lastUtterance || "—"}
          </span>
        </div>
      </div>

      {!supported && (
        <p className="card-warn">
          Dieser Browser unterstützt die Web-Speech-API nicht zuverlässig. Bitte
          Chrome oder Edge verwenden.
        </p>
      )}
    </section>
  );
}
