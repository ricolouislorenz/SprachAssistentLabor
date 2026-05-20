import { Mic, Square, FileText, Wand2, Printer, RotateCcw } from "lucide-react";

export function RecordingPanel({
  recording,
  hasAudio,
  transcript,
  transcribing,
  structuring,
  onStartRecording,
  onStopRecording,
  onTranscribeAndStructure,
  onRestructure,
  onReset,
  onPrint,
  onTranscriptChange
}) {
  const busy = transcribing || structuring;

  return (
    <section className="card no-print">
      <h2>2. Manuelle Steuerung &amp; Live-Transkript</h2>

      <div className="button-row">
        {!recording ? (
          <button onClick={onStartRecording} disabled={busy}>
            <Mic size={18} />
            Aufnahme starten
          </button>
        ) : (
          <button onClick={onStopRecording} className="danger">
            <Square size={18} />
            Aufnahme stoppen
          </button>
        )}

        <button
          onClick={onTranscribeAndStructure}
          disabled={!hasAudio || busy || recording}
        >
          <FileText size={18} />
          Transkribieren &amp; Protokoll befüllen
        </button>

        <button
          onClick={onRestructure}
          disabled={!transcript || busy || recording}
        >
          <Wand2 size={18} />
          Nur Protokoll neu befüllen
        </button>

        <button onClick={onReset} className="secondary" disabled={busy}>
          <RotateCcw size={18} />
          Zurücksetzen
        </button>

        <button onClick={onPrint}>
          <Printer size={18} />
          PDF drucken
        </button>
      </div>

      <div className="state-badges">
        {recording && <span className="badge badge-recording">● Aufnahme läuft</span>}
        {transcribing && <span className="badge badge-busy">Transkribiere …</span>}
        {structuring && <span className="badge badge-busy">Strukturiere …</span>}
        {!busy && !recording && hasAudio && (
          <span className="badge badge-ready">Aufnahme bereit zur Auswertung</span>
        )}
      </div>

      <label>
        Transkript
        {recording && (
          <span className="live-indicator"> · Live-Transkription läuft</span>
        )}
      </label>
      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder="Während der Aufnahme erscheint hier das Live-Transkript. Du kannst es vor der Protokollerstellung korrigieren."
      />
    </section>
  );
}
