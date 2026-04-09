import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { CodeBlock } from '../components/CodeBlock.jsx';
import { CODE_SAMPLES, integrationGuide } from '../content/integrationGuide.js';

export function IntegrationDocsPage() {
  const { locale, t } = useI18n();
  const doc = integrationGuide[locale] || integrationGuide.en;

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.docs')}`;
  }, [t, locale]);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-black px-4 py-10 pb-24">
      <div className="mx-auto max-w-3xl">
        <p className="font-cyber text-xs uppercase tracking-[0.35em] text-cyan-600">{t('brand.name')}</p>
        <h1 className="font-cyber mt-2 text-2xl font-bold text-cyan-50 md:text-3xl">{doc.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-cyan-600/95">{doc.subtitle}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/monitoring"
            className="rounded border border-cyan-600/50 bg-cyan-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-900/50"
          >
            {t('nav.monitoring')}
          </Link>
          <Link
            to="/"
            className="rounded border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:border-cyan-800 hover:text-cyan-200"
          >
            {t('nav.home')}
          </Link>
        </div>

        <article className="mt-12 space-y-12">
          {doc.sections.map((section) => (
            <section key={section.h}>
              <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200/95">
                {section.h}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-cyan-600/95">
                {section.p.map((para, i) => (
                  <p
                    key={i}
                    className="[&_code]:rounded [&_code]:bg-slate-900/80 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_code]:text-cyan-300"
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
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200/95">
            {locale === 'id' ? 'Contoh variabel lingkungan' : 'Environment examples'}
          </h2>
          <CodeBlock title="Bridge (.env)" code={CODE_SAMPLES.envBridge} />
          <CodeBlock title="Dashboard (.env)" code={CODE_SAMPLES.envFrontend} />
        </div>

        <div className="mt-14 space-y-8">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200/95">
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
          <CodeBlock title="cURL" code={CODE_SAMPLES.curl} />
        </div>

        <div className="mt-14">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200/95">
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
