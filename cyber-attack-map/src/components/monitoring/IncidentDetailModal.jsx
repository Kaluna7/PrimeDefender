import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { CATEGORY_STYLE, THREAT_CATEGORY, threatCategoryLabelKey } from '../../constants/threatCategories.js';
import { exportIncidentPdf } from '../../utils/exportIncidentPdf.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { buildThreatReadoutText } from '../../utils/threatAiPrompt.js';
import { describeAttackActivity } from '../../utils/describeAttackActivity.js';
import { buildAttackLogLines, formatAttackConfidence } from '../../utils/attackLogFormatter.js';

function dash(value) {
  return value && String(value).trim() ? String(value).trim() : '—';
}

function DetailItem({ label, value, mono = false, dark = false }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        dark ? 'border-slate-600/50 bg-white/[0.04]' : 'border-slark-border bg-slark-bg'
      }`}
    >
      <p className={`text-[9px] font-semibold uppercase tracking-[0.16em] ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
        {label}
      </p>
      <p className={`mt-1 break-words text-[12px] ${mono ? 'break-all font-mono' : ''} ${dark ? 'text-slate-200' : 'text-slark-text'}`}>
        {value}
      </p>
    </div>
  );
}

function DetailSection({ title, children, dark = false }) {
  return (
    <section
      className={`rounded-2xl border p-3 ${
        dark ? 'border-slate-600/50 bg-white/[0.03]' : 'border-slark-border bg-slark-card'
      }`}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slark-primary">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * @param {{
 *   attack: object | null;
 *   onClose: () => void;
 *   onSendToAI?: () => void;
 *   variant?: 'light' | 'dark';
 * }} props
 */
export function IncidentDetailModal({ attack, onClose, onSendToAI, variant = 'light' }) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';
  const loc = locale === 'id' ? 'id' : 'en';
  const logText = useMemo(() => (attack ? buildAttackLogLines(attack).join('\n') : ''), [attack]);

  useEffect(() => {
    if (!attack) return undefined;
    const scrollRoot = document.getElementById('app-scroll-root');
    const prevBody = document.body.style.overflow;
    const prevRoot = scrollRoot?.style.overflow ?? '';
    document.body.style.overflow = 'hidden';
    if (scrollRoot) scrollRoot.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevBody;
      if (scrollRoot) scrollRoot.style.overflow = prevRoot;
      window.removeEventListener('keydown', onKey);
    };
  }, [attack, onClose]);

  if (!attack) return null;

  const cat = CATEGORY_STYLE[attack.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
  const activity = describeAttackActivity(attack, loc);
  const readout = buildThreatReadoutText(attack, {
    inetScope: t('detail.inetScope'),
    protectedSite: t('detail.protectedSite'),
  });

  async function handleExportPdf() {
    const generatedAt = new Date().toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { hour12: false });

    await exportIncidentPdf({
      attack,
      logText,
      readout,
      activity,
      categoryLabel: t(threatCategoryLabelKey(attack.category)),
      labels: {
        brandName: t('brand.name'),
        reportTitle: t('incidentModal.pdfReport'),
        generatedAt: `${t('incidentModal.pdfGenerated')}: ${generatedAt}`,
        footerBy: t('incidentModal.pdfFooterBy'),
        page: t('incidentModal.pdfPage'),
        title: t('incidentModal.title'),
        subtitle: t('incidentModal.subtitle'),
        overview: t('incidentModal.overview'),
        attacker: t('incidentModal.attacker'),
        attackerValue: dash(attack.attackerIp) || t('incidentModal.unknownIp'),
        region: t('incidentModal.region'),
        regionValue: dash(attack.sourceLabel),
        time: t('incidentModal.time'),
        timeValue: new Date(attack.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { hour12: false }),
        geoLocation: t('incidentModal.geoLocation'),
        geoLocationValue: dash(attack.geoMeta?.location || attack.sourceLabel),
        geoCoordinates: t('incidentModal.geoCoordinates'),
        geoCoordinatesValue: dash(attack.geoMeta?.coordinates),
        requestBlock: t('incidentModal.requestBlock'),
        method: t('incidentModal.method'),
        methodValue: dash(attack.method),
        path: t('incidentModal.path'),
        pathValue: dash(attack.path),
        userAgentValue: dash(attack.userAgent),
        forwardedForValue: dash(attack.forwardedFor),
        detectionBlock: t('incidentModal.detectionBlock'),
        activity: t('incidentModal.activity'),
        target: t('incidentModal.target'),
        targetValue: dash(attack.targetService || attack.targetLabel),
        detectType: t('incidentModal.detectType'),
        detectTypeValue: dash(attack.detectType || attack.detection),
        confidence: t('incidentModal.confidence'),
        confidenceValue: formatAttackConfidence(attack.detectConfidence),
        mitigation: t('incidentModal.mitigation'),
        mitigationValue: dash(attack.mitigation || attack.action),
        blocked: t('incidentModal.blocked'),
        blockedValue: String(Boolean(attack.blocked)),
        responseBlock: t('incidentModal.responseBlock'),
        statusCode: t('incidentModal.statusCode'),
        statusCodeValue: dash(attack.responseStatus),
        responseTime: t('incidentModal.responseTime'),
        responseTimeValue: dash(attack.responseTimeMs),
        requests1m: t('incidentModal.requests1m'),
        requests1mValue: dash(attack.requestsLast1m),
        intelBlock: t('incidentModal.intelBlock'),
        ispValue: dash(attack.ipIntelIsp),
        logTitle: t('feed.logTitle'),
        technical: t('incidentModal.technical'),
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slark-dark/50 backdrop-blur-sm"
        aria-label={t('incidentModal.close')}
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex h-[92dvh] w-full min-h-0 max-w-5xl flex-col overflow-hidden rounded-t-3xl border shadow-slark-lg sm:h-auto sm:max-h-[92vh] sm:rounded-3xl ${
          dark ? 'border-slate-600/60 bg-slark-dark text-slate-200' : 'border-slark-border bg-slark-bg'
        }`}
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <div className={`shrink-0 border-b px-4 py-3 ${dark ? 'border-slate-600/50' : 'border-slark-border'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 pr-2">
              <h2
                id="incident-modal-title"
                className={`font-cyber text-xs font-bold tracking-wide sm:text-sm ${dark ? 'text-slate-100' : 'text-slark-text'}`}
              >
                {t('incidentModal.title')}
              </h2>
              <p className={`mt-1 text-[10px] leading-relaxed ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
                {t('incidentModal.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${cat.badgeClass}`}>
                {t(threatCategoryLabelKey(attack.category))}
              </span>
              <button
                type="button"
                onClick={handleExportPdf}
                className="min-h-9 flex-1 rounded-lg border border-slark-primary/30 bg-slark-primary px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-slark-primary-hover sm:flex-none sm:py-1.5 sm:text-[11px]"
              >
                {t('incidentModal.exportPdf')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                  dark
                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-200'
                    : 'border-rose-200/80 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100'
                }`}
                aria-label={t('incidentModal.close')}
              >
                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className={`thin-scrollbar${dark ? '-dark' : ''} min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4`}>
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <DetailSection title={t('incidentModal.overview')} dark={dark}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem dark={dark} label={t('incidentModal.attacker')} value={dash(attack.attackerIp) || t('incidentModal.unknownIp')} mono />
                  <DetailItem dark={dark} label={t('incidentModal.region')} value={dash(attack.sourceLabel)} />
                  <DetailItem dark={dark} label={t('incidentModal.requestId')} value={dash(attack.requestId || attack.incidentId || attack.id)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.time')} value={new Date(attack.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { hour12: false })} />
                  <DetailItem dark={dark} label={t('incidentModal.geoLocation')} value={dash(attack.geoMeta?.location || attack.sourceLabel)} />
                  <DetailItem dark={dark} label={t('incidentModal.geoCoordinates')} value={dash(attack.geoMeta?.coordinates)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.geoAccuracy')} value={dash(attack.geoMeta?.accuracy)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.geoNote')} value={dash(attack.geoMeta?.note)} />
                </div>
              </DetailSection>

              <DetailSection title={t('incidentModal.requestBlock')} dark={dark}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem dark={dark} label={t('incidentModal.method')} value={dash(attack.method)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.path')} value={dash(attack.path)} mono />
                  <DetailItem dark={dark} label="User-Agent" value={dash(attack.userAgent)} mono />
                  <DetailItem dark={dark} label="X-Forwarded-For" value={dash(attack.forwardedFor)} mono />
                </div>
              </DetailSection>

              <DetailSection title={t('incidentModal.detectionBlock')} dark={dark}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem dark={dark} label={t('incidentModal.activity')} value={activity} />
                  <DetailItem dark={dark} label={t('incidentModal.target')} value={dash(attack.targetService || attack.targetLabel)} />
                  <DetailItem dark={dark} label={t('incidentModal.detectType')} value={dash(attack.detectType || attack.detection)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.confidence')} value={formatAttackConfidence(attack.detectConfidence)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.authStatus')} value={dash(attack.authStatus)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.mitigation')} value={dash(attack.mitigation || attack.action)} mono />
                </div>
              </DetailSection>

              <DetailSection title={t('incidentModal.responseBlock')} dark={dark}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailItem dark={dark} label={t('incidentModal.statusCode')} value={dash(attack.responseStatus)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.responseTime')} value={dash(attack.responseTimeMs)} mono />
                  <DetailItem dark={dark} label={t('incidentModal.requests1m')} value={dash(attack.requestsLast1m)} mono />
                </div>
              </DetailSection>
            </div>

            <div className="space-y-4">
              <DetailSection title={t('feed.logTitle')} dark={dark}>
                <pre className={`thin-scrollbar${dark ? '-dark' : ''} max-h-[12rem] overflow-auto whitespace-pre-wrap break-all rounded-xl border p-3 font-mono text-[10px] leading-relaxed sm:max-h-[26rem] ${dark ? 'border-slate-600/50 bg-black/30 text-slate-200' : 'border-slark-border bg-slark-dark text-slark-bg'}`}>
                  {logText}
                </pre>
              </DetailSection>

              <DetailSection title={t('incidentModal.technical')} dark={dark}>
                <pre className={`thin-scrollbar${dark ? '-dark' : ''} max-h-[10rem] overflow-auto whitespace-pre-wrap break-all rounded-xl border p-3 font-mono text-[9px] leading-relaxed sm:max-h-[18rem] ${dark ? 'border-slate-600/50 bg-white/[0.04] text-slate-200' : 'border-slark-border bg-slark-card text-slark-dark'}`}>
                  {readout}
                </pre>
              </DetailSection>

              <DetailSection title={t('incidentModal.intelBlock')} dark={dark}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <DetailItem dark={dark} label="ISP" value={dash(attack.ipIntelIsp)} />
                  <DetailItem dark={dark} label={t('incidentModal.blocked')} value={String(Boolean(attack.blocked))} mono />
                </div>
              </DetailSection>
            </div>
          </div>
        </div>

        {onSendToAI ? (
          <div
            className={`flex shrink-0 flex-wrap items-center justify-stretch gap-2 border-t px-3 py-3 sm:justify-end sm:px-4 ${dark ? 'border-slate-600/50 bg-[#1a2332]' : 'border-slark-border bg-slark-card'}`}
          >
            <button
              type="button"
              onClick={onSendToAI}
              className="w-full rounded-lg border border-slark-primary/30 bg-slark-primary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-slark-primary-hover sm:w-auto sm:py-2"
            >
              {t('detail.sendToAI')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
