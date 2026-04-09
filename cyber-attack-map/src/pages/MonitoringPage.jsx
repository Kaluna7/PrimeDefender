import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { AttackMap } from '../components/AttackMap';
import { LiveAttackFeed } from '../components/LiveAttackFeed';
import { ThreatMetricsPanel } from '../components/ThreatMetricsPanel';
import { ProtectionThreatPanel } from '../components/ProtectionThreatPanel.jsx';
import { IncidentDetailPanel } from '../components/IncidentDetailPanel.jsx';
import { connectAttackSocket } from '../services/socket';
import { THREAT_CATEGORY } from '../constants/threatCategories.js';
import { normalizeAttackPayload } from '../utils/normalizeAttack.js';
import { EXPECTED_BRIDGE_VERSION } from '../bridgeConstants.js';
import { MAP_CARD_MAX } from '../config/googleThreatMap.js';
import {
  getNotificationPermission,
  notificationsSupported,
  notifySecurityIncident,
  requestNotificationPermission,
} from '../utils/browserNotify.js';

export const MAX_ATTACKS = 100;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const SOCKET_DISABLED = import.meta.env.VITE_SOCKET_DISABLED === 'true';

const notifiedAttackIds = new Set();

function pushAttack(prev, payload) {
  const entry = normalizeAttackPayload({
    ...payload,
    createdAt: payload.createdAt ?? Date.now(),
  });
  const next = [...prev, entry];
  return next.length > MAX_ATTACKS ? next.slice(-MAX_ATTACKS) : next;
}

function useBridgeHandshake(enabled) {
  const [state, setState] = useState(() => (enabled ? 'checking' : 'off'));

  useEffect(() => {
    if (!enabled) {
      setState('off');
      return;
    }
    let cancelled = false;
    setState('checking');
    fetch(`${SOCKET_URL}/health`, { method: 'GET', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data.version === EXPECTED_BRIDGE_VERSION) {
          setState('ok');
        } else {
          setState('bad');
        }
      })
      .catch(() => {
        if (!cancelled) setState('bad');
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

export function MonitoringPage() {
  const { t, locale } = useI18n();
  const [attacks, setAttacks] = useState([]);
  const [selectedAttackId, setSelectedAttackId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState(() => getNotificationPermission());

  const socketEnabled = !SOCKET_DISABLED;
  const bridgeState = useBridgeHandshake(socketEnabled);

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.monitoring')}`;
  }, [t, locale]);

  useEffect(() => {
    if (!socketEnabled || bridgeState !== 'ok') {
      setSocketConnected(false);
      return undefined;
    }
    return connectAttackSocket(
      (payload) => setAttacks((p) => pushAttack(p, payload)),
      setSocketConnected
    );
  }, [socketEnabled, bridgeState]);

  useEffect(() => {
    if (attacks.length === 0) return;
    const last = attacks[attacks.length - 1];
    if (notifiedAttackIds.has(last.id)) return;
    notifiedAttackIds.add(last.id);
    const parts = [last.sourceLabel, last.targetLabel].filter((s) => s && String(s).trim());
    notifySecurityIncident(last, {
      title: t('notifications.title'),
      body: parts.length > 0 ? parts.join(' → ') : t('notifications.bodyFallback'),
    });
  }, [attacks, t]);

  const eventsPerMin = useMemo(() => {
    const now = Date.now();
    return attacks.filter((a) => now - a.createdAt < 60000).length;
  }, [attacks]);

  const ddosLive = useMemo(
    () => attacks.filter((a) => a.category === THREAT_CATEGORY.DDOS).length,
    [attacks]
  );

  const selectedAttack = useMemo(
    () => attacks.find((a) => a.id === selectedAttackId) ?? null,
    [attacks, selectedAttackId]
  );

  useEffect(() => {
    if (selectedAttackId && !attacks.some((a) => a.id === selectedAttackId)) {
      setSelectedAttackId(null);
    }
  }, [attacks, selectedAttackId]);

  async function onRequestNotify() {
    const p = await requestNotificationPermission();
    setNotifyPerm(p === 'unsupported' ? 'denied' : p);
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-black text-cyan-100">
      <div className="pointer-events-none absolute inset-0 cyber-grid opacity-70" />

      {bridgeState === 'bad' && (
        <div className="relative z-30 border-b border-rose-800/60 bg-rose-950/50 px-4 py-3 text-center backdrop-blur-sm">
          <p className="text-sm font-semibold text-rose-100">
            {t('monitoring.bridgeBadTitle', { url: SOCKET_URL, version: EXPECTED_BRIDGE_VERSION })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-rose-200/90">{t('monitoring.bridgeBadBody')}</p>
        </div>
      )}

      <header className="relative z-10 flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-cyan-900/40 bg-black/80 px-5 py-3 backdrop-blur-sm">
        <div>
          <h1 className="font-cyber text-neon text-lg font-bold tracking-[0.35em] md:text-xl">
            {t('monitoring.title')}
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-snug text-cyan-600/95">
            {t('monitoring.subtitle', { version: EXPECTED_BRIDGE_VERSION })}
          </p>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-wider text-cyan-600">{t('monitoring.events')}</span>
            <span className="font-cyber text-neon-amber text-3xl tabular-nums drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]">
              {attacks.length}
            </span>
          </div>

          <div className="flex items-baseline gap-2 border-l border-cyan-800/50 pl-3">
            <span className="text-xs uppercase tracking-wider text-rose-400/80">{t('monitoring.ddos')}</span>
            <span className="font-cyber text-2xl tabular-nums text-rose-200 drop-shadow-[0_0_12px_rgba(251,113,133,0.35)]">
              {ddosLive}
            </span>
          </div>

          <div className="hidden h-8 w-px bg-cyan-800/60 sm:block" />

          <div className="flex max-w-[15rem] flex-col items-end gap-0.5 text-xs">
            {!socketEnabled ? (
              <span className="text-slate-500">{t('monitoring.socketOff')}</span>
            ) : bridgeState === 'checking' ? (
              <span className="text-amber-400">
                {t('monitoring.bridgeCheck', { version: EXPECTED_BRIDGE_VERSION })}
              </span>
            ) : bridgeState === 'bad' ? (
              <span className="text-rose-400">{t('monitoring.bridgeRejected')}</span>
            ) : socketConnected ? (
              <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                {t('monitoring.listening', { version: EXPECTED_BRIDGE_VERSION })}
              </span>
            ) : (
              <span className="text-amber-500/90">{t('monitoring.connecting')}</span>
            )}
            <span className="truncate font-mono text-[10px] text-cyan-700" title={SOCKET_URL}>
              {SOCKET_URL}
            </span>
          </div>

          {notificationsSupported() && notifyPerm !== 'granted' && (
            <button
              type="button"
              onClick={onRequestNotify}
              className="rounded border border-amber-600/50 bg-amber-950/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/95 hover:bg-amber-950/70"
            >
              {notifyPerm === 'denied' ? t('monitoring.notifyBlocked') : t('monitoring.notifyAllow')}
            </button>
          )}
          {notificationsSupported() && notifyPerm === 'granted' && (
            <span className="text-[10px] text-emerald-500/90">{t('monitoring.notifyOn')}</span>
          )}
        </div>
      </header>

      <div className="relative z-0 flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-shrink-0 flex-col overflow-y-auto border-r border-cyan-900/35">
          <ThreatMetricsPanel attacks={attacks} eventsPerMin={eventsPerMin} />
          <ProtectionThreatPanel attacks={attacks} />
        </div>
        <main className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-black px-2 py-3 sm:px-4 md:px-6">
          <div
            className="relative isolate mx-auto box-border w-full shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black shadow-[0_4px_48px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-black/40"
            style={{
              aspectRatio: `${MAP_CARD_MAX.widthPx} / ${MAP_CARD_MAX.heightPx}`,
              width: `min(92vw, ${MAP_CARD_MAX.widthPx}px)`,
              maxWidth: `${MAP_CARD_MAX.widthPx}px`,
              maxHeight: `${MAP_CARD_MAX.heightPx}px`,
            }}
          >
            <AttackMap attacks={attacks} />
          </div>
        </main>
        <div className="hidden min-h-0 w-[min(100%,22rem)] shrink-0 md:flex md:flex-col">
          <LiveAttackFeed
            attacks={attacks}
            socketEnabled={socketEnabled}
            socketConnected={socketConnected && bridgeState === 'ok'}
            bridgeState={bridgeState}
            selectedId={selectedAttackId}
            onSelectAttack={(a) => setSelectedAttackId(a.id)}
          />
          <IncidentDetailPanel
            attack={selectedAttack}
            onClose={() => setSelectedAttackId(null)}
          />
        </div>
      </div>

      <div className="flex max-h-[55vh] min-h-0 flex-col border-t border-cyan-900/40 md:hidden">
        <LiveAttackFeed
          attacks={attacks}
          maxRows={8}
          socketEnabled={socketEnabled}
          socketConnected={socketConnected && bridgeState === 'ok'}
          bridgeState={bridgeState}
          selectedId={selectedAttackId}
          onSelectAttack={(a) => setSelectedAttackId(a.id)}
        />
        <IncidentDetailPanel
          attack={selectedAttack}
          onClose={() => setSelectedAttackId(null)}
        />
      </div>
    </div>
  );
}
