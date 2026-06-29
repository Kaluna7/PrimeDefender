/** Animated grid-line background for the About us page. */
export function AboutPageBackground({ contained = false }) {
  return (
    <div
      className={`about-page-bg pointer-events-none ${contained ? 'absolute' : 'fixed'} inset-0 z-0 overflow-hidden`}
      aria-hidden
    >
      <div className="about-bg-grid-fine absolute inset-0" />
      <div className="about-bg-grid-major absolute inset-0" />
      <div className="about-bg-grid-accent absolute inset-0" />
      <div className="about-bg-grid-vignette absolute inset-0" />
    </div>
  );
}
