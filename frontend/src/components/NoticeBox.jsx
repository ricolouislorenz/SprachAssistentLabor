export function NoticeBox({ title, items = [], variant = "warn" }) {
  if (!items || items.length === 0) return null;

  return (
    <section className={`notice notice-${variant}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
