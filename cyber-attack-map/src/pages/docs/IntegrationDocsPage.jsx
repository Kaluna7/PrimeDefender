import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { CodeBlock } from '../../components/ui/CodeBlock.jsx';
import { CODE_SAMPLES, integrationGuide } from '../../content/integrationGuide.js';

export function IntegrationDocsPage() {
  const { locale, t } = useI18n();
  const doc = integrationGuide[locale] || integrationGuide.en;

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.docs')}`;
  }, [t, locale]);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-slark-bg px-4 py-10 pb-24 dark:bg-slark-dark">
      <div className="mx-auto max-w-3xl">
        <p className="font-cyber text-xs uppercase tracking-[0.35em] text-slark-primary">{t('brand.name')}</p>
        <h1 className="font-cyber mt-2 text-2xl font-bold text-slark-text dark:text-white md:text-3xl">{doc.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-slark-muted">{doc.subtitle}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/monitoring"
            className="rounded-xl bg-slark-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slark-primary-hover"
          >
            {t('nav.monitoring')}
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-slark-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:border-slark-primary hover:text-slark-primary"
          >
            {t('nav.home')}
          </Link>
        </div>

        <article className="mt-12 space-y-12">
          {doc.sections.map((section) => (
            <section key={section.h}>
              <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary">
                {section.h}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-slark-muted">
                {section.p.map((para, i) => (
                  <p
                    key={i}
                    className="[&_code]:rounded [&_code]:bg-slark-card [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_code]:text-slark-dark dark:[&_code]:bg-slark-dark/60 dark:[&_code]:text-slark-primary"
                    dangerouslySetInnerHTML={{
                      __html: para
                        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                        .replace(/`([^`]+)`/g, '<code>$1</code>')
                        .replace(/\n/g, '<br />'),
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </article>

        <div className="mt-14 space-y-8">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary">
            {locale === 'id' ? 'Contoh variabel lingkungan' : 'Environment examples'}
          </h2>
          <CodeBlock title="Bridge (.env)" code={CODE_SAMPLES.envBridge} />
          <CodeBlock title="Dashboard (.env)" code={CODE_SAMPLES.envFrontend} />
        </div>

        <div className="mt-14 space-y-8">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary">
            {locale === 'id' ? 'Contoh kode di server pelanggan' : 'Customer server code samples'}
          </h2>
          <CodeBlock title="Node.js (fetch)" code={CODE_SAMPLES.nodeFetch} />
          <CodeBlock
            title={
              locale === 'id'
                ? 'Express — MVP (7 deteksi)'
                : 'Express — MVP (7 detections)'
            }
            code={CODE_SAMPLES.detectionExpress}
          />
          <CodeBlock title="Python (requests)" code={CODE_SAMPLES.python} />
          <CodeBlock
            title={
              locale === 'id'
                ? 'FastAPI — proxy / ngrok (GeoIP akurat)'
                : 'FastAPI — proxy / ngrok (accurate GeoIP)'
            }
            code={CODE_SAMPLES.fastapiProxy}
          />
          <CodeBlock title="cURL" code={CODE_SAMPLES.curl} />
        </div>

        <div className="mt-14">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary">
            {locale === 'id' ? 'Skema payload (referensi)' : 'Payload schema (reference)'}
          </h2>
          <div className="mt-4">
            <CodeBlock code={CODE_SAMPLES.payloadExample} />
          </div>
        </div>
      </div>
    </div>
  );
}
