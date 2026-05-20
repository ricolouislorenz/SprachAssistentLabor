import magnesiaLogo from "../assets/magnesia-logo.svg";

function fallback(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

function paragraphFor(value) {
  const text = fallback(value);
  if (text === "—") return <p className="report-empty">Keine Angabe.</p>;
  return <p className="report-paragraph">{text}</p>;
}

function formatDateTime(date) {
  if (!date) return "—";
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function PrintReport({ protocol, reportNumber, generatedAt }) {
  const datum = fallback(protocol.datum);
  const hasNotices =
    (protocol.fehlende_angaben?.length ?? 0) > 0 ||
    (protocol.unsicherheiten?.length ?? 0) > 0;

  return (
    <article className="print-report print-only" aria-label="Prüfbericht">
      <header className="print-report__header">
        <div className="print-report__brand">
          <img
            className="print-report__company-logo"
            src={magnesiaLogo}
            alt="Magnesia Mineral Compounds"
          />
        </div>
        <div className="print-report__header-meta">
          <div>
            <span className="meta-label">Bericht-Nr.</span>
            <span className="meta-value">{reportNumber || "—"}</span>
          </div>
          <div>
            <span className="meta-label">Erstellt am</span>
            <span className="meta-value">{formatDateTime(generatedAt)}</span>
          </div>
        </div>
      </header>

      <h1 className="print-report__title">Prüfbericht</h1>

      <p className="print-report__disclaimer">
        Dieser Bericht wurde aus einem Sprachdiktat automatisch erzeugt. Vor
        Freigabe sind alle Angaben durch den/die Prüfer/in zu prüfen und
        gegebenenfalls zu korrigieren.
      </p>

      <section className="report-section">
        <h2>1. Identifikation</h2>
        <table className="identification-table">
          <tbody>
            <tr>
              <th scope="row">Produktname</th>
              <td>{fallback(protocol.produktname)}</td>
              <th scope="row">Chargennummer</th>
              <td>{fallback(protocol.chargennummer)}</td>
            </tr>
            <tr>
              <th scope="row">Artikelnummer</th>
              <td>{fallback(protocol.artikelnummer)}</td>
              <th scope="row">Lieferant</th>
              <td>{fallback(protocol.lieferant)}</td>
            </tr>
            <tr>
              <th scope="row">Prüfer/in</th>
              <td>{fallback(protocol.pruefer)}</td>
              <th scope="row">Prüfdatum</th>
              <td>{datum}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2>2. Anlass der Prüfung</h2>
        {paragraphFor(protocol.anlass)}
      </section>

      <section className="report-section">
        <h2>3. Durchführung</h2>
        {paragraphFor(protocol.durchfuehrung)}
      </section>

      <section className="report-section">
        <h2>4. Beobachtungen</h2>
        {paragraphFor(protocol.beobachtung)}
      </section>

      <section className="report-section">
        <h2>5. Messwerte</h2>
        {protocol.messwerte?.length > 0 ? (
          <table className="report-measurements">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Parameter</th>
                <th>Wert</th>
                <th>Einheit</th>
                <th>Bemerkung</th>
              </tr>
            </thead>
            <tbody>
              {protocol.messwerte.map((m, index) => (
                <tr key={index}>
                  <td className="numeric">{index + 1}</td>
                  <td>{fallback(m.parameter)}</td>
                  <td className="numeric">{fallback(m.wert)}</td>
                  <td>{fallback(m.einheit)}</td>
                  <td>{fallback(m.bemerkung)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="report-empty">Keine Messwerte erfasst.</p>
        )}
      </section>

      <section className="report-section">
        <h2>6. Abweichungen</h2>
        {paragraphFor(protocol.abweichungen)}
      </section>

      <section className="report-section report-section--highlight">
        <h2>7. Bewertung</h2>
        {paragraphFor(protocol.bewertung)}
      </section>

      <section className="report-section">
        <h2>8. Empfohlene nächste Schritte</h2>
        {paragraphFor(protocol.naechste_schritte)}
      </section>

      {hasNotices && (
        <section className="report-section report-section--notice">
          <h2>9. Hinweise zur Datenlage</h2>
          {protocol.fehlende_angaben?.length > 0 && (
            <div className="notice-block">
              <h3>Fehlende Angaben</h3>
              <ul>
                {protocol.fehlende_angaben.map((item, index) => (
                  <li key={`fa-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {protocol.unsicherheiten?.length > 0 && (
            <div className="notice-block">
              <h3>Unsicherheiten</h3>
              <ul>
                {protocol.unsicherheiten.map((item, index) => (
                  <li key={`un-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="report-section report-section--signature">
        <h2>Freigabe</h2>
        <div className="signature-grid">
          <div className="signature-cell">
            <div className="signature-line" />
            <div className="signature-label">Ort, Datum</div>
          </div>
          <div className="signature-cell">
            <div className="signature-line" />
            <div className="signature-label">
              Unterschrift Prüfer/in
              <span className="signature-sub">
                {protocol.pruefer ? ` (${protocol.pruefer})` : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="print-report__footer">
        <div>
          Bericht-Nr.&nbsp;{reportNumber || "—"} · Erstellt mit Laborassistent
          (Konrad)
        </div>
        <div className="print-report__pagebadge">
          Seite <span className="page-current" /> / <span className="page-total" />
        </div>
      </footer>
    </article>
  );
}
