import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AttackMap } from '../../components/monitoring/AttackMap.jsx';
import { LiveAttackFeed } from '../../components/monitoring/LiveAttackFeed.jsx';
import { ThreatMetricsPanel } from '../../components/monitoring/ThreatMetricsPanel.jsx';
import { ProtectionThreatPanel } from '../../components/monitoring/ProtectionThreatPanel.jsx';
import { IncidentDetailPanel } from '../../components/monitoring/IncidentDetailPanel.jsx';
import { IncidentDetailModal } from '../../components/monitoring/IncidentDetailModal.jsx';
import { ThreatAIChatPanel } from '../../components/monitoring/ThreatAIChatPanel.jsx';
import { connectAttackSocket } from '../../services/socket';
import {
  fetchHistoryIncidents,
  fetchMyHistoryIncidents,
  fetchMyRecentIncidents,
  fetchRecentIncidents,
} from '../../services/bridgeIncidents.js';
import { fetchAuthStatus } from '../../services/auth.js';
import { THREAT_CATEGORY } from '../../constants/threatCategories.js';
import { normalizeAttackPayload } from '../../utils/normalizeAttack.js';
import { fingerprintForEntry } from '../../utils/attackDedupe.js';
import { EXPECTED_BRIDGE_VERSION } from '../../bridgeConstants.js';
import { buildRandomDemoPayload } from '../../data/demoThreatRoutes.js';
import {
  getNotificationPermission,
  notificationsSupported,
  notifySecurityIncident,
  requestNotificationPermission,
} from '../../utils/browserNotify.js';
import { MAX_LIVE_ATTACKS } from '../../constants/monitoringLimits.js';

export const MAX_ATTACKS = MAX_LIVE_ATTACKS;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const SOCKET_DISABLED = import.meta.env.VITE_SOCKET_DISABLED === 'true';
/** Simulated cross-border incidents (Checkpoint-style demo) — arcs + feed labels match source → target. */
const DEMO_ATTACKS = import.meta.env.VITE_DEMO_ATTACKS === 'true';

const LIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

function getBridgeAdminSecret() {
  try {
    const env = import.meta.env.VITE_BRIDGE_ADMIN_SECRET;
    if (typeof env === 'string' && env.trim()) return env.trim();
    return (localStorage.getItem('pd-admin-secret') || '').trim();
  } catch {
    return (import.meta.env.VITE_BRIDGE_ADMIN_SECRET || '').trim();
  }
}

function mergeIncidentLists(prev, incoming) {
  const map = new Map(prev.map((a) => [a.id, a]));
  for (const n of incoming) {
    const o = map.get(n.id);
    if (!o || o.createdAt <= n.createdAt) map.set(n.id, n);
  }
  const arr = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
  return arr.length > MAX_ATTACKS ? arr.slice(-MAX_ATTACKS) : arr;
}

const notifiedAttackIds = new Set();

function pushAttack(prev, payload) {
  const entry = normalizeAttackPayload({
    ...payload,
    createdAt: payload.createdAt ?? Date.now(),
  });
  const fp = fingerprintForEntry(entry);
  const idx = prev.findIndex((a) => fingerprintForEntry(a) === fp);

  if (idx !== -1) {
    const old = prev[idx];
    const merged = {
      ...entry,
      id: old.id,
      from: old.from,
      to: old.to,
      createdAt: old.createdAt,
      lastSeenAt: Date.now(),
    };
    const next = [...prev];
    next[idx] = merged;
    return next;
  }

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

function bridgeStatusDot(socketEnabled, bridgeState, socketConnected) {
  if (!socketEnabled) return 'bg-slark-muted';
  if (bridgeState === 'checking') return 'animate-pulse bg-amber-400';
  if (bridgeState === 'bad') return 'bg-slark-primary';
  if (socketConnected) return 'bg-emerald-500';
  return 'animate-pulse bg-amber-400';
}

/** Keys for left rail — each tab shows a different panel set */
const MONITORING_TAB = {
  STATUS: 'status',
  MAP: 'map',
  HISTORY: 'history',
  ATTACKER: 'attacker',
  INTEL: 'intel',
  READOUT: 'readout',
  ASSISTANT: 'assistant',
};

function MonitoringSectionNav({ t, activeTab, onSelectTab, bridgeBannerVisible }) {
  const items = [
    {
      id: MONITORING_TAB.STATUS,
      labelKey: 'navStatus',
      icon: (
        <path d="M4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm8-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a1 1 0 0 1 1 1v4.5l2.5 1.5a1 1 0 1 1-1 1.73L11 15.2V9a1 1 0 0 1 1-1z" />
      ),
    },
    {
      id: MONITORING_TAB.MAP,
      labelKey: 'navMonitoring',
      icon: (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      ),
    },
    {
      id: MONITORING_TAB.HISTORY,
      labelKey: 'navHistory',
      icon: (
        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7v2a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
      ),
    },
    {
      id: MONITORING_TAB.ATTACKER,
      labelKey: 'navAttacker',
      icon: (
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      ),
    },
    {
      id: MONITORING_TAB.INTEL,
      labelKey: 'navIntel',
      icon: (
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
      ),
    },
    {
      id: MONITORING_TAB.READOUT,
      labelKey: 'navReadout',
      icon: (
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      ),
    },
    {
      id: MONITORING_TAB.ASSISTANT,
      labelKey: 'navAssistant',
      icon: (
        <path d="M12 2a7 7 0 0 1 6.99 7.5c0 3.04-1.94 5.64-4.64 6.62L14 21h-4l-.35-1.88C6.95 18.14 5 15.54 5 12.5 5 8.36 8.36 5 12.5 5c.17 0 .34.01.5.02A7 7 0 0 1 12 2zm0 2c-2.76 0-5 2.24-5 5 0 2.32 1.58 4.27 3.71 4.84l.29.08.45 2.41h1.1l.45-2.41.29-.08C15.42 13.27 17 11.32 17 9c0-2.76-2.24-5-5-5zm-1 4h2v2h-2V8zm0 3h2v2h-2v-2z" />
      ),
    },
  ];

  const railPosition =
    bridgeBannerVisible === true
      ? 'top-[5.75rem] h-[calc(100dvh-5.75rem)]'
      : 'top-0 h-screen';

  return (
    <nav
      aria-label={t('monitoring.sidebarNav')}
      className={`group/nav fixed left-0 z-40 flex w-[3.25rem] flex-col gap-0.5 overflow-hidden border-r border-slark-border bg-slark-bg py-2 shadow-sm transition-[width] duration-300 ease-out hover:w-52 focus-within:w-52 ${railPosition}`}
    >
      {items.map(({ id, labelKey, icon }) => {
        const label = t(`monitoring.${labelKey}`);
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelectTab(id)}
            className={`flex w-full items-center gap-2 rounded-r-lg py-2 pl-2 pr-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-slark-primary/40 ${
              isActive
                ? 'bg-slark-card text-slark-primary ring-1 ring-slark-primary/25'
                : 'text-slark-muted hover:bg-slark-card'
            }`}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slark-border bg-slark-card text-slark-dark"
              aria-hidden
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
            </span>
            <span className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slark-text opacity-0 transition-all duration-300 ease-out group-hover/nav:max-w-[11rem] group-hover/nav:opacity-100 group-focus-within/nav:max-w-[11rem] group-focus-within/nav:opacity-100">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function MonitoringPage() {
  const { t, locale } = useI18n();
  const [attacks, setAttacks] = useState([]);
  const [historyAttacks, setHistoryAttacks] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetchError, setHistoryFetchError] = useState(false);
  const [selectedAttackId, setSelectedAttackId] = useState(null);
  /** Popup detail when user clicks feed row or map arc/point */
  const [modalAttack, setModalAttack] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState(() => getNotificationPermission());
  const threatAiRef = useRef(null);
  const ownerUserIdRef = useRef(/** @type {string | null} */ (null));
  const [activeTab, setActiveTab] = useState(MONITORING_TAB.MAP);

  const socketEnabled = !SOCKET_DISABLED;
  const bridgeState = useBridgeHandshake(socketEnabled);

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.monitoring')}`;
  }, [t, locale]);

  useEffect(() => {
    let cancelled = false;
    fetchAuthStatus().then((auth) => {
      if (!cancelled) ownerUserIdRef.current = auth.ok && auth.user?.id ? auth.user.id : null;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socketEnabled || bridgeState !== 'ok') {
      setSocketConnected(false);
      return undefined;
    }
    return connectAttackSocket((payload) => {
      const entry = normalizeAttackPayload(payload);
      const ownerId = ownerUserIdRef.current;
      if (ownerId) {
        if (entry.ownerUserId && entry.ownerUserId !== ownerId) return;
        if (!entry.ownerUserId) return;
      }
      setAttacks((p) => pushAttack(p, payload));
    }, setSocketConnected);
  }, [socketEnabled, bridgeState]);

  useEffect(() => {
    if (bridgeState !== 'ok') return undefined;
    let cancelled = false;
    (async () => {
      const auth = await fetchAuthStatus();
      if (cancelled) return;
      ownerUserIdRef.current = auth.ok && auth.user?.id ? auth.user.id : null;

      let ok = false;
      let incidents = [];
      if (auth.ok && auth.user?.id) {
        ({ ok, incidents } = await fetchMyRecentIncidents(SOCKET_URL, 24));
      } else {
        const secret = getBridgeAdminSecret();
        if (!secret) return;
        ({ ok, incidents } = await fetchRecentIncidents(SOCKET_URL, secret, 24));
      }
      if (cancelled || !ok || !Array.isArray(incidents)) return;
      setAttacks((prev) =>
        mergeIncidentLists(
          prev,
          incidents.map((raw) => normalizeAttackPayload(raw))
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [bridgeState]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const cutoff = Date.now() - LIVE_WINDOW_MS;
      setAttacks((prev) => prev.filter((a) => a.createdAt >= cutoff));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!DEMO_ATTACKS) return undefined;
    setAttacks((prev) => {
      let p = prev;
      for (let i = 0; i < 5; i += 1) {
        p = pushAttack(p, buildRandomDemoPayload());
      }
      return p;
    });
    const tick = () => {
      setAttacks((p) => pushAttack(p, buildRandomDemoPayload()));
    };
    const id = window.setInterval(tick, 4500 + Math.random() * 3500);
    return () => window.clearInterval(id);
  }, [DEMO_ATTACKS]);

  useEffect(() => {
    if (attacks.length === 0) return;
    const last = attacks[attacks.length - 1];
    if (typeof last.id === 'string' && last.id.startsWith('demo-')) return;
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
    () =>
      attacks.find((a) => a.id === selectedAttackId) ??
      historyAttacks.find((a) => a.id === selectedAttackId) ??
      null,
    [attacks, historyAttacks, selectedAttackId]
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryFetchError(false);
    try {
      const auth = await fetchAuthStatus();
      let ok = false;
      let incidents = [];
      if (auth.ok && auth.user?.id) {
        ({ ok, incidents } = await fetchMyHistoryIncidents(SOCKET_URL, {
          windowHours: 24,
          limit: 100,
          skip: 0,
        }));
      } else {
        const secret = getBridgeAdminSecret();
        if (!secret) {
          setHistoryFetchError(true);
          setHistoryAttacks([]);
          return;
        }
        ({ ok, incidents } = await fetchHistoryIncidents(SOCKET_URL, secret, {
          windowHours: 24,
          limit: 100,
          skip: 0,
        }));
      }
      if (!ok) {
        setHistoryFetchError(true);
        setHistoryAttacks([]);
        return;
      }
      setHistoryAttacks(incidents.map((raw) => normalizeAttackPayload(raw)));
    } catch {
      setHistoryFetchError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== MONITORING_TAB.HISTORY) return;
    loadHistory();
  }, [activeTab, loadHistory]);

  const openIncidentModal = useCallback((a) => {
    setSelectedAttackId(a.id);
    setModalAttack(a);
  }, []);

  const handleMapSelectAttackId = useCallback(
    (id) => {
      const a = attacks.find((x) => x.id === id) ?? historyAttacks.find((x) => x.id === id);
      setSelectedAttackId(id);
      if (a) setModalAttack(a);
    },
    [attacks, historyAttacks]
  );

  useEffect(() => {
    if (!selectedAttackId) return;
    const inLive = attacks.some((a) => a.id === selectedAttackId);
    const inHist = historyAttacks.some((a) => a.id === selectedAttackId);
    if (!inLive && !inHist) {
      setSelectedAttackId(null);
      setModalAttack(null);
    }
  }, [attacks, historyAttacks, selectedAttackId]);

  async function onRequestNotify() {
    const p = await requestNotificationPermission();
    setNotifyPerm(p === 'unsupported' ? 'denied' : p);
  }

  const statusLine = (() => {
    if (!socketEnabled) return t('monitoring.socketOff');
    if (bridgeState === 'checking') return t('monitoring.bridgeCheck', { version: EXPECTED_BRIDGE_VERSION });
    if (bridgeState === 'bad') return t('monitoring.bridgeRejected');
    if (socketConnected) return t('monitoring.listening', { version: EXPECTED_BRIDGE_VERSION });
    return t('monitoring.connecting');
  })();

  const statusStripEl = (
    <div className="relative z-10 flex w-full flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex min-w-[5.5rem] flex-col rounded-xl border border-slark-border bg-slark-bg px-3 py-2 shadow-sm">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slark-muted">
          {t('monitoring.events')}
        </span>
        <span className="font-cyber text-2xl font-bold tabular-nums leading-tight text-slark-text">
          {attacks.length}
        </span>
      </div>
      <div className="flex min-w-[5.5rem] flex-col rounded-xl border border-slark-primary/20 bg-slark-card px-3 py-2 shadow-sm">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slark-primary">
          {t('monitoring.ddos')}
        </span>
        <span className="font-cyber text-2xl font-bold tabular-nums leading-tight text-slark-primary">
          {ddosLive}
        </span>
      </div>
      <div
        className={`flex min-w-0 max-w-[14rem] flex-1 flex-col rounded-xl border px-3 py-2 shadow-sm lg:max-w-[16rem] ${
          !socketEnabled
            ? 'border-slark-border bg-slark-card'
            : bridgeState === 'bad'
              ? 'border-slark-primary/30 bg-slark-card'
              : socketConnected && bridgeState === 'ok'
                ? 'border-emerald-200/90 bg-emerald-50/80'
                : 'border-amber-200/90 bg-amber-50/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${bridgeStatusDot(socketEnabled, bridgeState, socketConnected)}`}
            aria-hidden
          />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slark-muted">
            Bridge
          </span>
        </div>
        <p className="mt-0.5 text-[10px] font-medium leading-snug text-slark-text">{statusLine}</p>
        <p className="mt-1 truncate font-mono text-[9px] text-slark-muted" title={SOCKET_URL}>
          {SOCKET_URL}
        </p>
      </div>
      {notificationsSupported() && notifyPerm !== 'granted' && (
        <button
          type="button"
          onClick={onRequestNotify}
          className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-amber-900 shadow-sm transition hover:bg-amber-100"
        >
          {notifyPerm === 'denied' ? t('monitoring.notifyBlocked') : t('monitoring.notifyAllow')}
        </button>
      )}
      {notificationsSupported() && notifyPerm === 'granted' && (
        <span className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-[10px] font-medium text-emerald-800">
          {t('monitoring.notifyOn')}
        </span>
      )}
    </div>
  );

  const mapCardClass =
    'relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slark-border bg-slark-bg shadow-slark ring-1 ring-slark-border/60';

  const asideShellClass =
    'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slark-border bg-slark-bg shadow-sm';

  const incidentPanelProps = {
    attack: selectedAttack,
    onClose: () => setSelectedAttackId(null),
    onSendToAI: selectedAttack
      ? () => {
          threatAiRef.current?.explainAttack(selectedAttack);
        }
      : undefined,
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden overflow-x-hidden bg-slark-card text-slark-text">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(198,40,40,0.05),transparent)]" />

      {bridgeState === 'bad' && (
        <div className="relative z-50 shrink-0 border-b border-slark-primary/20 bg-slark-card px-4 py-3 text-center shadow-sm">
          <p className="text-sm font-semibold text-slark-primary">
            {t('monitoring.bridgeBadTitle', { url: SOCKET_URL, version: EXPECTED_BRIDGE_VERSION })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slark-muted">{t('monitoring.bridgeBadBody')}</p>
        </div>
      )}

      <MonitoringSectionNav
        t={t}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bridgeBannerVisible={bridgeState === 'bad'}
      />

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col pl-[3.25rem]">
        {activeTab === MONITORING_TAB.STATUS && (
          <div className="thin-scrollbar mx-auto flex w-full max-w-[1920px] flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">
            {statusStripEl}
          </div>
        )}

        <div
          className={
            activeTab === MONITORING_TAB.MAP
              ? 'relative z-0 flex min-h-0 w-full flex-1 flex-col px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3 lg:px-4 lg:pb-4 lg:pt-4'
              : 'hidden'
          }
          aria-hidden={activeTab !== MONITORING_TAB.MAP}
        >
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 lg:flex-row">
            <main className="relative flex min-h-0 min-w-0 flex-[3] flex-col lg:min-h-0 lg:flex-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:h-full">
                <div className={`${mapCardClass} min-h-0 flex-1`}>
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-slark-primary/30 to-transparent" />
                  <AttackMap
                    attacks={attacks}
                    selectedAttackId={selectedAttackId}
                    onSelectAttackId={handleMapSelectAttackId}
                  />
                </div>
              </div>
            </main>
            <aside
              className={`${asideShellClass} mt-3 flex min-h-0 flex-[2] lg:mt-0 lg:max-w-[min(100%,26rem)] lg:flex-none lg:shrink-0 lg:basis-[clamp(16rem,26vw,26rem)]`}
              aria-label={t('monitoring.detailsRegion')}
            >
              <div className="thin-scrollbar flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-slark-bg">
                <ThreatMetricsPanel attacks={attacks} eventsPerMin={eventsPerMin} />
                <ProtectionThreatPanel attacks={attacks} />
              </div>
            </aside>
          </div>
        </div>

        {activeTab === MONITORING_TAB.HISTORY && (
          <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4 lg:flex-row lg:px-5 lg:py-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <p className="max-w-xl text-[11px] leading-relaxed text-slark-muted">
                  {t('monitoring.historySubtitle')}
                </p>
                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="shrink-0 rounded-lg border border-slark-border bg-slark-bg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slark-text shadow-sm transition hover:bg-slark-card disabled:opacity-50"
                >
                  {historyLoading ? t('monitoring.historyLoading') : t('monitoring.historyLoad')}
                </button>
              </div>
              {historyFetchError ? (
                <p className="text-[11px] text-slark-primary">{t('monitoring.historyError')}</p>
              ) : null}
              <div className={`${asideShellClass} min-h-0 flex-1`}>
                <LiveAttackFeed
                  attacks={historyAttacks}
                  maxRows={48}
                  socketEnabled={socketEnabled}
                  socketConnected={Boolean(socketConnected && bridgeState === 'ok')}
                  bridgeState={bridgeState}
                  selectedId={selectedAttackId}
                  onSelectAttack={openIncidentModal}
                  emptyHint={t('monitoring.historyEmpty')}
                  className="min-h-0 flex-1 border-l-0 bg-transparent"
                />
              </div>
            </div>
            <div className={`${asideShellClass} w-full shrink-0 lg:max-w-md`}>
              <IncidentDetailPanel {...incidentPanelProps} />
            </div>
          </div>
        )}

        {activeTab === MONITORING_TAB.ATTACKER && (
          <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4 lg:flex-row lg:px-5 lg:py-4">
            <div
              className={`${asideShellClass} flex min-h-0 min-w-0 flex-1 flex-col`}
            >
              <LiveAttackFeed
                attacks={attacks}
                maxRows={24}
                socketEnabled={socketEnabled}
                socketConnected={socketConnected && bridgeState === 'ok'}
                bridgeState={bridgeState}
                selectedId={selectedAttackId}
                onSelectAttack={openIncidentModal}
                className="min-h-0 flex-1 border-l-0 bg-transparent"
              />
            </div>
            <div className={`${asideShellClass} w-full shrink-0 lg:max-w-md`}>
              <IncidentDetailPanel {...incidentPanelProps} />
            </div>
          </div>
        )}

        {activeTab === MONITORING_TAB.INTEL && (
          <div className="thin-scrollbar mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-0 overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">
            <div className="rounded-2xl border border-slark-border bg-slark-bg">
              <ThreatMetricsPanel attacks={attacks} eventsPerMin={eventsPerMin} />
              <ProtectionThreatPanel attacks={attacks} />
            </div>
          </div>
        )}

        {activeTab === MONITORING_TAB.READOUT && (
          <div className="thin-scrollbar mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">
            <div className={asideShellClass}>
              <IncidentDetailPanel {...incidentPanelProps} />
            </div>
          </div>
        )}

        {activeTab === MONITORING_TAB.ASSISTANT && (
          <section
            className="relative z-0 mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col border-t border-slark-border bg-slark-bg px-3 pb-3 pt-2 sm:px-4 lg:px-5"
            aria-label={t('aiChat.title')}
          >
            <ThreatAIChatPanel
              ref={threatAiRef}
              className="flex min-h-0 flex-1 flex-col rounded-t-2xl shadow-slark"
            />
          </section>
        )}
      </div>

      <IncidentDetailModal
        attack={modalAttack}
        onClose={() => setModalAttack(null)}
        onSendToAI={
          modalAttack
            ? () => {
                threatAiRef.current?.explainAttack(modalAttack);
              }
            : undefined
        }
      />
    </div>
  );
}
