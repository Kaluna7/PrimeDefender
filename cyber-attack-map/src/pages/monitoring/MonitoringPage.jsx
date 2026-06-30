import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AttackMap } from '../../components/monitoring/AttackMap.jsx';
import { ThreatMetricsPanel } from '../../components/monitoring/ThreatMetricsPanel.jsx';
import { ProtectionThreatPanel } from '../../components/monitoring/ProtectionThreatPanel.jsx';
import { HistoryTabView } from './history/HistoryTabView.jsx';
import { AttackerTabView } from './attacker/AttackerTabView.jsx';
import { IntelTabView } from './intel/IntelTabView.jsx';
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
import { MONITORING_TAB, MonitoringSectionNav } from './MonitoringSectionNav.jsx';

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
  const [pendingExplainAttack, setPendingExplainAttack] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  const [assistantHistoryOpen, setAssistantHistoryOpen] = useState(false);

  const socketEnabled = !SOCKET_DISABLED;
  const bridgeState = useBridgeHandshake(socketEnabled);

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.monitoring')}`;
  }, [t, locale]);

  useEffect(() => {
    if (activeTab !== MONITORING_TAB.ASSISTANT) {
      setAssistantHistoryOpen(false);
    }
  }, [activeTab]);

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

  const handleSendToAI = useCallback((attack) => {
    if (!attack) return;
    setModalAttack(null);
    setPendingExplainAttack(attack);
    setActiveTab(MONITORING_TAB.ASSISTANT);
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
    'relative w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slark-dark text-slate-200 shadow-lg ring-1 ring-black/20 lg:min-h-0 lg:flex-1';

  const mapAsideShellClass =
    'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slark-dark text-slate-200 shadow-lg ring-1 ring-black/20 max-lg:overflow-visible';

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
        onAssistantHistory={() => setAssistantHistoryOpen(true)}
        assistantHistoryOpen={assistantHistoryOpen}
      />

      <div
        className={`relative z-0 flex min-h-0 min-w-0 flex-1 flex-col pl-0 thin-scrollbar-dark lg:pl-16 ${
          activeTab === MONITORING_TAB.ASSISTANT ? 'overflow-hidden' : 'overflow-y-auto overscroll-y-contain lg:overflow-hidden'
        }`}
      >
        <div
          className={
            activeTab === MONITORING_TAB.MAP
              ? 'relative z-0 flex w-full flex-col px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3 lg:min-h-0 lg:flex-1 lg:px-4 lg:pb-4 lg:pt-4'
              : 'hidden'
          }
          aria-hidden={activeTab !== MONITORING_TAB.MAP}
        >
          <div className="flex w-full flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row">
            <main className="relative flex min-w-0 flex-col lg:min-h-0 lg:flex-[3]">
              <div className="flex min-w-0 flex-col lg:min-h-0 lg:h-full lg:flex-1">
                <div className={`${mapCardClass} h-[50vh] min-h-[240px] max-h-[28rem] shrink-0 lg:h-auto lg:max-h-none`}>
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
              className={`${mapAsideShellClass} mt-3 flex shrink-0 flex-col max-lg:overflow-visible lg:mt-0 lg:h-full lg:min-h-0 lg:max-w-[min(100%,26rem)] lg:flex-none lg:shrink-0 lg:basis-[clamp(16rem,26vw,26rem)]`}
              aria-label={t('monitoring.detailsRegion')}
            >
              <div className="flex w-full flex-col bg-slark-dark lg:min-h-0 lg:flex-1 lg:overflow-hidden">
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
          <AttackerTabView attacks={attacks} onViewDetails={openIncidentModal} />
        )}

        {activeTab === MONITORING_TAB.INTEL && (
          <IntelTabView attacks={intelIncidents} shellClass="lg:min-h-0 lg:flex-1" />
        )}

        {activeTab === MONITORING_TAB.ASSISTANT && (
          <section
            className="relative z-0 flex min-h-0 w-full flex-1 flex-col lg:mx-auto lg:max-w-[1920px] lg:px-5 lg:pb-3 lg:pt-2"
            aria-label={t('aiChat.title')}
          >
            <ThreatAIChatPanel
              ref={threatAiRef}
              theme="dark"
              pendingExplainAttack={pendingExplainAttack}
              onPendingExplainHandled={() => setPendingExplainAttack(null)}
              historyOpen={assistantHistoryOpen}
              onHistoryOpenChange={setAssistantHistoryOpen}
              className="flex h-full min-h-0 flex-1 flex-col max-lg:rounded-none max-lg:border-0 max-lg:shadow-none max-lg:ring-0 lg:rounded-2xl lg:border lg:border-slate-700/60 lg:shadow-lg lg:ring-1 lg:ring-black/20"
            />
          </section>
        )}
      </div>

      <IncidentDetailModal
        attack={modalAttack}
        variant="dark"
        onClose={() => setModalAttack(null)}
        onSendToAI={modalAttack ? () => handleSendToAI(modalAttack) : undefined}
      />
    </div>
  );
}
