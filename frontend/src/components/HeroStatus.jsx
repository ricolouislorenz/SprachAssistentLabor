import { Mic, MicOff, Loader2, Radio } from "lucide-react";

export function HeroStatus({
  supported,
  listening,
  recording,
  transcribing,
  structuring,
  reportNumber,
  onStart,
  onStop
}) {
  const stage = (() => {
    if (!supported) return "unsupported";
    if (structuring) return "structuring";
    if (transcribing) return "transcribing";
    if (recording) return "recording";
    if (listening) return "listening";
    return "idle";
  })();

  const headline = {
    unsupported: "Sprachsteuerung nicht verfügbar",
    structuring: "Strukturiere Protokoll …",
    transcribing: "Transkribiere Aufnahme …",
    recording: "Konrad hört dein Diktat",
    listening: "Konrad ist bereit",
    idle: "Konrad schläft"
  }[stage];

  const sub = {
    unsupported: "Dieser Browser unterstützt die Web-Speech-API nicht. Bitte Chrome oder Edge öffnen.",
    structuring: "Aus dem Transkript wird ein strukturiertes Laborprotokoll erzeugt.",
    transcribing: "Die Audiodatei wird an das Backend gesendet und transkribiert.",
    recording: `Sage „Tschüss Konrad“, um die Aufnahme zu beenden — oder „Konrad, Protokoll erstellen“.`,
    listening: `Sage „Hey Konrad“, um die Aufnahme zu starten.`,
    idle: "Aktiviere die Sprachsteuerung, um Konrad zu wecken."
  }[stage];

  return (
    <section className="hero no-print" data-stage={stage}>
      <div className="hero-visual" aria-hidden="true">
        <div className={`hero-orb hero-orb-${stage}`}>
          {stage === "transcribing" || stage === "structuring" ? (
            <Loader2 size={36} className="spin" />
          ) : stage === "recording" ? (
            <Mic size={36} />
          ) : stage === "listening" ? (
            <Radio size={36} />
          ) : (
            <MicOff size={36} />
          )}
        </div>
      </div>

      <div className="hero-body">
        <div className="hero-eyebrow">Aktueller Zustand</div>
        <h2 className="hero-headline">{headline}</h2>
        <p className="hero-sub">{sub}</p>

        <div className="hero-meta">
          {reportNumber && (
            <div className="hero-meta-item">
              <span className="hero-meta-label">Bericht-Nr.</span>
              <span className="hero-meta-value">{reportNumber}</span>
            </div>
          )}
        </div>

        <div className="hero-actions">
          {!listening ? (
            <button onClick={onStart} disabled={!supported} className="primary">
              <Radio size={16} />
              Sprachsteuerung aktivieren
            </button>
          ) : (
            <button onClick={onStop} className="secondary">
              <Radio size={16} />
              Sprachsteuerung deaktivieren
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
