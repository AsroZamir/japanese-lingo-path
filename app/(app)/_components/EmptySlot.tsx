export function EmptySlot({ label, title, copy }: { label: string; title: string; copy: string }) {
  return (
    <section className="empty-slot">
      <div className="empty-icon">＋</div>
      <div><span className="card-kicker dark">{label}</span><h3>{title}</h3><p>{copy}</p></div>
    </section>
  );
}
