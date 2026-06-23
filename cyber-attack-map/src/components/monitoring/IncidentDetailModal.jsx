import { useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { CATEGORY_STYLE, THREAT_CATEGORY } from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { buildThreatReadoutText } from '../../utils/threatAiPrompt.js';
import { describeAttackActivity } from '../../utils/describeAttackActivity.js';
import { buildAttackLogLines, formatAttackConfidence } from '../../utils/attackLogFormatter.js';

function dash(value) {
  return value && String(value).trim() ? String(value).trim() : '—';
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slark-border bg-slark-bg px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slark-muted">{label}</p>
      <p className={`mt-1 text-[12px] text-slark-text ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slark-border bg-slark-card p-3">
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
 * }} props
 */
export function IncidentDetailModal({ attack, onClose, onSendToAI }) {
  const { t, locale } = useI18n();
  const loc = locale === 'id' ? 'id' : 'en';
  const logText = useMemo(() => (attack ? buildAttackLogLines(attack).join('\n') : ''), [attack]);

  useEffect(() => {
    if (!attack) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
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

  function handleExportPdf() {
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
    });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = margin;

    const writeBlock = (text, opts = {}) => {
      const fontSize = opts.fontSize || 10;
      const spacing = opts.spacing || 14;
      pdf.setFont('courier', opts.bold ? 'bold' : 'normal');
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(String(text), pageWidth - margin * 2);
      for (const line of lines) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += spacing;
      }
    };

    writeBlock(`${t('incidentModal.title')} - ${attack.requestId || attack.incidentId || attack.id}`, {
      fontSize: 14,
      spacing: 18,
      bold: true,
    });
    y += 6;
    writeBlock(`${t('incidentModal.subtitle')} | ${new Date(attack.createdAt).toISOString()}`, {
      fontSize: 9,
      spacing: 12,
    });
    y += 10;
    writeBlock(logText, { fontSize: 9, spacing: 12 });
    y += 10;
    writeBlock(readout, { fontSize: 8, spacing: 10 });

    const safeId = String(attack.requestId || attack.incidentId || attack.id || 'incident').replace(/[^\w.-]+/g, '_');
    pdf.save(`incident-${safeId}.pdf`);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slark-dark/40 backdrop-blur-sm"
        aria-label={t('incidentModal.close')}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slark-border bg-slark-bg shadow-slark-lg">
        <div className="flex items-start justify-between gap-3 border-b border-slark-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="incident-modal-title" className="font-cyber text-sm font-bold tracking-wide text-slark-text">
              {t('incidentModal.title')}
            </h2>
            <p className="mt-1 text-[10px] text-slark-muted">{t('incidentModal.subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${cat.badgeClass}`}>
              {cat.shortLabel}
            </span>
            <button
              type="button"
              onClick={handleExportPdf}
              className="rounded-lg border border-slark-primary/30 bg-slark-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-slark-primary-hover"
            >
              {t('incidentModal.exportPdf')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slark-border px-2 py-1 text-xs text-slark-muted hover:bg-slark-card"
            >
              {t('incidentModal.close')}
            </button>
          </div>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <DetailSection title={t('incidentModal.overview')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label={t('incidentModal.attacker')} value={dash(attack.attackerIp) || t('incidentModal.unknownIp')} mono />
                  <DetailItem label={t('incidentModal.region')} value={dash(attack.sourceLabel)} />
                  <DetailItem label={t('incidentModal.requestId')} value={dash(attack.requestId || attack.incidentId || attack.id)} mono />
                  <DetailItem label={t('incidentModal.time')} value={new Date(attack.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { hour12: false })} />
                  <DetailItem label={t('incidentModal.geoLocation')} value={dash(attack.geoMeta?.location || attack.sourceLabel)} />
                  <DetailItem label={t('incidentModal.geoCoordinates')} value={dash(attack.geoMeta?.coordinates)} mono />
                  <DetailItem label={t('incidentModal.geoAccuracy')} value={dash(attack.geoMeta?.accuracy)} mono />
                  <DetailItem label={t('incidentModal.geoNote')} value={dash(attack.geoMeta?.note)} />
                </div>
              </DetailSection>

              <DetailSection title={t('incidentModal.requestBlock')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label={t('incidentModal.method')} value={dash(attack.method)} mono />
                  <DetailItem label={t('incidentModal.path')} value={dash(attack.path)} mono />
                  <DetailItem label="User-Agent" value={dash(attack.userAgent)} mono />
                  <DetailItem label="X-Forwarded-For" value={dash(attack.forwardedFor)} mono />
                </div>
              </DetailSection>

              <DetailSection title={t('incidentModal.detectionBlock')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label={t('incidentModal.activity')} value={activity} />
                  <DetailItem label={t('incidentModal.target')} value={dash(attack.targetService || attack.targetLabel)} />
                  <DetailItem label={t('incidentModal.detectType')} value={dash(attack.detectType || attack.detection)} mono />
                  <DetailItem label={t('incidentModal.confidence')} value={formatAttackConfidence(attack.detectConfidence)} mono />
                  <DetailItem label={t('incidentModal.authStatus')} value={dash(attack.authStatus)} mono />
                  <DetailItem label={t('incidentModal.mitigation')} value={dash(attack.mitigation || attack.action)} mono />
                </div>
              </DetailSection>

              <DetailSection title={t('incidentModal.responseBlock')}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailItem label={t('incidentModal.statusCode')} value={dash(attack.responseStatus)} mono />
                  <DetailItem label={t('incidentModal.responseTime')} value={dash(attack.responseTimeMs)} mono />
                  <DetailItem label={t('incidentModal.requests1m')} value={dash(attack.requestsLast1m)} mono />
                </div>
              </DetailSection>
            </div>

            <div className="space-y-4">
              <DetailSection title={t('feed.logTitle')}>
                <pre className="thin-scrollbar max-h-[26rem] overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slark-border bg-slark-dark p-3 font-mono text-[10px] leading-relaxed text-slark-bg">
                  {logText}
                </pre>
              </DetailSection>

              <DetailSection title={t('incidentModal.technical')}>
                <pre className="thin-scrollbar max-h-[18rem] overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slark-border bg-slark-card p-3 font-mono text-[9px] leading-relaxed text-slark-dark">
                  {readout}
                </pre>
              </DetailSection>

              <DetailSection title={t('incidentModal.intelBlock')}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <DetailItem label="ISP" value={dash(attack.ipIntelIsp)} />
                  <DetailItem label={t('incidentModal.blocked')} value={String(Boolean(attack.blocked))} mono />
                </div>
              </DetailSection>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slark-border bg-slark-card px-4 py-3">
          {onSendToAI && (
            <button
              type="button"
              onClick={onSendToAI}
              className="rounded-lg border border-slark-primary/30 bg-slark-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-slark-primary-hover"
            >
              {t('detail.sendToAI')}
            </button>
          )}
          <button
            type="button"
            onClick={handleExportPdf}
            className="rounded-lg border border-slark-primary/30 bg-slark-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-slark-primary-hover"
          >
            {t('incidentModal.exportPdf')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slark-border px-4 py-2 text-[11px] font-semibold text-slark-text hover:bg-slark-bg"
          >
            {t('incidentModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
