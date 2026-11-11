// Shown right away while a page is loading, so the screen is never blank.
export default function Loading() {
  return (
    <div className="wrap pgload" role="status" aria-live="polite">
      <span className="spin" aria-hidden="true" />
      <span>Loading…</span>
      <div className="sk sk-h" />
      <div className="sk sk-row" />
      <div className="sk sk-row" />
      <div className="sk sk-row" />
    </div>
  );
}
