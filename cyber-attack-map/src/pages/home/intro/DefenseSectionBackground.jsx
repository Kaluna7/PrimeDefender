import { Component } from 'react';
import { DefenseSectionMapBackground } from './DefenseSectionMapBackground.jsx';

class MapBgErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[DefenseSectionMapBackground]', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/** Grid + ECharts demo map background for the defense section. */
export function DefenseSectionBackground() {
  return (
    <div className="defense-section-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <MapBgErrorBoundary>
        <DefenseSectionMapBackground />
      </MapBgErrorBoundary>
      <div className="defense-bg-grid-fine absolute inset-0" />
      <div className="defense-bg-grid-major absolute inset-0" />
      <div className="defense-bg-grid-accent absolute inset-0" />
      <div className="defense-bg-grid-vignette absolute inset-0" />
    </div>
  );
}
