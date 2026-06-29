import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AttackMap } from '../../components/monitoring/AttackMap.jsx';
import { LiveAttackFeed } from '../../components/monitoring/LiveAttackFeed.jsx';
import { ThreatMetricsPanel } from '../../components/monitoring/ThreatMetricsPanel.jsx';
import { ThreatDailyChart } from '../../components/monitoring/ThreatDailyChart.jsx';
import { ThreatDailyCommentary } from '../../components/monitoring/ThreatDailyCommentary.jsx';
import { ProtectionThreatPanel } from '../../components/monitoring/ProtectionThreatPanel.jsx';
import { IncidentDetailPanel } from '../../components/monitoring/IncidentDetailPanel.jsx';
import { HistoryTabView } from './history/HistoryTabView.jsx';
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
import { normalizeAttackPayload } from '../../utils/normalizeAttack.js';
import { fingerprintForEntry } from '../../utils/attackDedupe.js';
import { EXPECTED_BRIDGE_VERSION } from '../../bridgeConstants.js';
import { buildRandomDemoPayload } from '../../data/demoThreatRoutes.js';
import {
  notifySecurityIncident,
} from '../../utils/browserNotify.js';
import { MAX_LIVE_ATTACKS } from '../../constants/monitoringLimits.js';
import { ProfileMenu } from '../../components/layout/ProfileMenu.jsx';

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
    return (localStorage.getItem('slark-admin-secret') || localStorage.getItem('pd-admin-secret') || '').trim();
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

/** Keys for left rail — each tab shows a different panel set */
const MONITORING_TAB = {
  MAP: 'map',
  HISTORY: 'history',
  ATTACKER: 'attacker',
  INTEL: 'intel',
  ASSISTANT: 'assistant',
};

function MonitoringSectionNav({ t, activeTab, onSelectTab, bridgeBannerVisible }) {
  const navRef = useRef(/** @type {HTMLElement | null} */ (null));

  const handleNavPointerLeave = () => {
    const nav = navRef.current;
    const active = document.activeElement;
    if (nav && active instanceof HTMLElement && nav.contains(active)) {
      active.blur();
    }
  };

  const items = [
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
      ref={navRef}
      aria-label={t('monitoring.sidebarNav')}
      onMouseLeave={handleNavPointerLeave}
      className={`group/nav fixed left-0 z-40 flex w-16 min-h-0 flex-col gap-0.5 overflow-hidden border-r border-slate-700/60 bg-slark-dark py-2 text-slate-200 shadow-lg ring-1 ring-black/20 transition-[width] duration-300 ease-out hover:w-72 ${railPosition}`}
    >
      <Link
        to="/"
        onClick={(e) => e.currentTarget.blur()}
        className="mb-1 flex w-full items-center justify-center px-2 py-2.5 outline-none transition hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-slark-primary/40"
        title={t('brand.name')}
      >
        <span className="font-cyber text-[8px] font-bold uppercase tracking-[0.1em] text-slark-primary transition-all duration-300 ease-out group-hover/nav:text-[11px] group-hover/nav:tracking-[0.22em]">
          {t('brand.name')}
        </span>
      </Link>
      <div className="mx-2 mb-1 shrink-0 border-b border-slate-600/50" aria-hidden />

      <div className="thin-scrollbar-dark flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
      {items.map(({ id, labelKey, icon }) => {
        const label = t(`monitoring.${labelKey}`);
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
              onSelectTab(id);
              e.currentTarget.blur();
            }}
            className={`flex w-full items-center gap-2 rounded-r-lg py-2 pl-2 pr-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-slark-primary/40 ${
              isActive ? 'text-slark-primary' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                isActive
                  ? 'border-slark-primary/45 bg-slark-primary/15 text-slark-primary'
                  : 'border-slate-600/50 bg-white/[0.04] text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
              }`}
              aria-hidden
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                {icon}
              </svg>
            </span>
            <span
              className={`min-w-0 max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] opacity-0 transition-all duration-300 ease-out group-hover/nav:max-w-[15rem] group-hover/nav:opacity-100 ${
                isActive ? 'text-slark-primary' : 'text-slate-200'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
      </div>

      <ProfileMenu variant="sidebar" navDark />
    </nav>
  );
}

export function MonitoringPage() {
  const { t, locale } = useI18n();
  const [attacks, setAttacks] = useState([]);
  const [historyAttacks, setHistoryAttacks] = useState([]);
  const [historyFetchError, setHistoryFetchError] = useState(false);
  const [selectedAttackId, setSelectedAttackId] = useState(null);
  /** Popup detail when user clicks feed row or map arc/point */
  const [modalAttack, setModalAttack] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
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

  const loadHistory = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    if (activeTab !== MONITORING_TAB.HISTORY && activeTab !== MONITORING_TAB.INTEL) return;
    loadHistory();
  }, [activeTab, loadHistory]);

  const intelIncidents = useMemo(
    () => mergeIncidentLists(attacks, historyAttacks),
    [attacks, historyAttacks],
  );

  const openIncidentModal = useCallback((a) => {
    setSelectedAttackId(a.id);
    setModalAttack(a);
  }, []);

  const selectAttackPreview = useCallback((a) => {
    setSelectedAttackId(a.id);
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

  const mapCardClass =
    'relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-700/60 bg-slark-dark text-slate-200 shadow-lg ring-1 ring-black/20';

  const mapAsideShellClass =
    'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slark-dark text-slate-200 shadow-lg ring-1 ring-black/20';

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0f172a] text-slate-200">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(198,40,40,0.08),transparent)]" />

      {bridgeState === 'bad' && (
        <div className="relative z-50 shrink-0 border-b border-slark-primary/30 bg-slark-dark px-4 py-3 text-center shadow-lg">
          <p className="text-sm font-semibold text-slark-primary">
            {t('monitoring.bridgeBadTitle', { url: SOCKET_URL, version: EXPECTED_BRIDGE_VERSION })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{t('monitoring.bridgeBadBody')}</p>
        </div>
      )}

      <MonitoringSectionNav
        t={t}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bridgeBannerVisible={bridgeState === 'bad'}
      />

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col pl-16">
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
              className={`${mapAsideShellClass} mt-3 flex h-full min-h-0 flex-[2] lg:mt-0 lg:max-w-[min(100%,26rem)] lg:flex-none lg:shrink-0 lg:basis-[clamp(16rem,26vw,26rem)]`}
              aria-label={t('monitoring.detailsRegion')}
            >
              <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slark-dark">
                <ThreatMetricsPanel attacks={attacks} eventsPerMin={eventsPerMin} variant="dark" />
                <ProtectionThreatPanel attacks={attacks} variant="dark" />
              </div>
            </aside>
          </div>
        </div>

        {activeTab === MONITORING_TAB.HISTORY && (
          <HistoryTabView
            attacks={historyAttacks}
            error={historyFetchError ? t('monitoring.historyError') : null}
            selectedId={selectedAttackId}
            onSelectAttack={selectAttackPreview}
            onViewDetails={openIncidentModal}
          />
        )}

        {activeTab === MONITORING_TAB.ATTACKER && (
          <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4 lg:flex-row lg:px-5 lg:py-4">
            <div className={`${mapAsideShellClass} flex min-h-0 min-w-0 flex-1 flex-col`}>
              <LiveAttackFeed
                attacks={attacks}
                maxRows={24}
                socketEnabled={socketEnabled}
                socketConnected={socketConnected && bridgeState === 'ok'}
                bridgeState={bridgeState}
                selectedId={selectedAttackId}
                onSelectAttack={openIncidentModal}
                variant="dark"
                className="min-h-0 flex-1"
              />
            </div>
            <div className={`${mapAsideShellClass} flex min-h-0 w-full shrink-0 flex-col lg:max-w-md`}>
              <IncidentDetailPanel
                variant="dark"
                incidents={attacks}
                selectedId={selectedAttackId}
                onSelectAttack={openIncidentModal}
              />
            </div>
          </div>
        )}

        {activeTab === MONITORING_TAB.INTEL && (
          <div className="thin-scrollbar-dark flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-2 py-3 sm:px-3 lg:px-4">
            <div className={`${mapAsideShellClass} w-full overflow-hidden`}>
              <ThreatDailyChart key="intel-daily-chart" attacks={intelIncidents} variant="dark" />
              <ThreatDailyCommentary attacks={intelIncidents} variant="dark" />
            </div>
          </div>
        )}

        {activeTab === MONITORING_TAB.ASSISTANT && (
          <section
            className="relative z-0 mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-3 pb-3 pt-2 sm:px-4 lg:px-5"
            aria-label={t('aiChat.title')}
          >
            <ThreatAIChatPanel
              ref={threatAiRef}
              theme="dark"
              className="flex min-h-0 flex-1 flex-col rounded-2xl shadow-lg ring-1 ring-black/20"
            />
          </section>
        )}
      </div>

      <IncidentDetailModal
        attack={modalAttack}
        variant="dark"
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
