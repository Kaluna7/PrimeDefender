/** Incidents kept in Monitoring state (socket + DB merge). */
export const MAX_LIVE_ATTACKS = 100;
/** Arcs drawn on map — each new incident adds a line until this cap (oldest dropped). */
export const MAX_MAP_ARCS = MAX_LIVE_ATTACKS;
