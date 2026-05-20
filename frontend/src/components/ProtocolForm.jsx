import { MeasurementTable } from "./MeasurementTable";
import { NoticeBox } from "./NoticeBox";

function Field({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function LongField({ label, value, onChange }) {
  return (
    <label className="field long">
      <span>{label}</span>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ProtocolForm({ protocol, onFieldChange, onMeasurementsChange }) {
  const update = (field) => (value) => onFieldChange(field, value);

  return (
    <main className="protocol">
      <h2>Laborprotokoll</h2>

      <div className="grid">
        <Field label="Produktname" value={protocol.produktname} onChange={update("produktname")} />
        <Field label="Artikelnummer" value={protocol.artikelnummer} onChange={update("artikelnummer")} />
        <Field label="Lieferant" value={protocol.lieferant} onChange={update("lieferant")} />
        <Field label="Chargennummer" value={protocol.chargennummer} onChange={update("chargennummer")} />
        <Field label="Prüfer/in" value={protocol.pruefer} onChange={update("pruefer")} />
        <Field label="Datum" value={protocol.datum} onChange={update("datum")} />
      </div>

      <LongField label="Anlass" value={protocol.anlass} onChange={update("anlass")} />
      <LongField label="Durchführung" value={protocol.durchfuehrung} onChange={update("durchfuehrung")} />
      <LongField label="Beobachtung" value={protocol.beobachtung} onChange={update("beobachtung")} />

      <MeasurementTable
        rows={protocol.messwerte}
        onChange={onMeasurementsChange}
      />

      <LongField label="Abweichungen" value={protocol.abweichungen} onChange={update("abweichungen")} />
      <LongField label="Bewertung" value={protocol.bewertung} onChange={update("bewertung")} />
      <LongField label="Nächste Schritte" value={protocol.naechste_schritte} onChange={update("naechste_schritte")} />

      <NoticeBox
        title="Fehlende Angaben"
        items={protocol.fehlende_angaben}
        variant="warn"
      />
      <NoticeBox
        title="Unsicherheiten"
        items={protocol.unsicherheiten}
        variant="info"
      />
    </main>
  );
}
