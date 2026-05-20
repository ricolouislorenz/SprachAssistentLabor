import { Plus, Trash2 } from "lucide-react";
import { emptyMeasurement } from "../utils/initialProtocol";

export function MeasurementTable({ rows = [], onChange }) {
  function updateCell(index, field, value) {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { ...emptyMeasurement }]);
  }

  function removeRow(index) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <section>
      <h3>Messwerte</h3>
      {rows.length === 0 ? (
        <p className="muted">Keine Messwerte angegeben.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Wert</th>
              <th>Einheit</th>
              <th>Bemerkung</th>
              <th className="no-print" aria-label="Aktion" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <input
                    value={row.parameter || ""}
                    onChange={(e) => updateCell(index, "parameter", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={row.wert || ""}
                    onChange={(e) => updateCell(index, "wert", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={row.einheit || ""}
                    onChange={(e) => updateCell(index, "einheit", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={row.bemerkung || ""}
                    onChange={(e) => updateCell(index, "bemerkung", e.target.value)}
                  />
                </td>
                <td className="no-print">
                  <button
                    type="button"
                    className="icon-only secondary"
                    onClick={() => removeRow(index)}
                    aria-label="Zeile entfernen"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="button-row no-print">
        <button type="button" className="secondary" onClick={addRow}>
          <Plus size={16} />
          Messwert hinzufügen
        </button>
      </div>
    </section>
  );
}
