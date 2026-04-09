import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';

export function HomePage() {
  const { t, locale } = useI18n();

  useEffect(() => {
    document.title = `${t('brand.name')} – Home`;
  }, [t, locale]);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-gradient-to-b from-black via-slate-950 to-black">
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-16 text-center">
        <p className="font-cyber text-xs uppercase tracking-[0.4em] text-cyan-600">{t('brand.name')}</p>
        <h1 className="font-cyber mt-4 text-3xl font-bold leading-tight text-cyan-50 md:text-4xl">
          {t('home.heroTitle')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-cyan-600/95">
          {t('home.heroSubtitle')}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/monitoring"
            className="rounded border border-cyan-500/60 bg-cyan-950/50 px-6 py-3 text-sm font-bold uppercase tracking-wider text-cyan-100 shadow-neon transition hover:bg-cyan-900/60"
          >
            {t('home.ctaMonitoring')}
          </Link>
          <Link
            to="/settings"
            className="rounded border border-slate-600 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-300 transition hover:border-cyan-700 hover:text-cyan-200"
          >
            {t('home.ctaSettings')}
          </Link>
          <Link
            to="/docs"
            className="rounded border border-cyan-800/50 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-cyan-400 transition hover:border-cyan-600 hover:text-cyan-200"
          >
            {t('nav.docs')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-cyan-900/40 px-5 py-16">
        <h2 className="font-cyber text-center text-lg uppercase tracking-[0.3em] text-cyan-200/90">
          {t('home.sectionFeatures')}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { title: t('home.feature1Title'), body: t('home.feature1Body') },
            { title: t('home.feature2Title'), body: t('home.feature2Body') },
            { title: t('home.feature3Title'), body: t('home.feature3Body') },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-cyan-900/40 bg-slate-950/60 p-5 text-left shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]"
            >
              <h3 className="font-cyber text-sm font-bold text-cyan-100">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-cyan-600/90">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-cyan-900/40 px-5 py-16">
        <h2 className="font-cyber text-center text-lg uppercase tracking-[0.3em] text-cyan-200/90">
          {t('home.sectionPricing')}
        </h2>
        <p className="mt-3 text-center text-xs text-cyan-700">{t('home.pricingFootnote')}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-cyan-900/50 bg-black/50 p-6">
            <h3 className="font-cyber text-sm font-bold text-cyan-100">{t('home.tierObserver')}</h3>
            <p className="mt-3 font-cyber text-3xl text-neon-amber">
              {t('home.tierObserverPrice')}
              <span className="text-sm font-normal text-cyan-600">{t('home.perMonth')}</span>
            </p>
            <p className="mt-4 text-xs leading-relaxed text-cyan-600/90">{t('home.tierObserverDesc')}</p>
          </div>

          <div className="relative rounded-xl border border-amber-500/40 bg-amber-950/15 p-6 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-amber-500/50 bg-amber-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
              {t('home.popular')}
            </span>
            <h3 className="font-cyber text-sm font-bold text-cyan-100">{t('home.tierSentinel')}</h3>
            <p className="mt-3 font-cyber text-3xl text-neon-amber">
              {t('home.tierSentinelPrice')}
              <span className="text-sm font-normal text-cyan-600">{t('home.perMonth')}</span>
            </p>
            <p className="mt-4 text-xs leading-relaxed text-cyan-600/90">{t('home.tierSentinelDesc')}</p>
          </div>

          <div className="rounded-xl border border-cyan-900/50 bg-black/50 p-6">
            <h3 className="font-cyber text-sm font-bold text-cyan-100">{t('home.tierFortress')}</h3>
            <p className="mt-3 font-cyber text-3xl text-cyan-100">{t('home.tierFortressPrice')}</p>
            <p className="mt-4 text-xs leading-relaxed text-cyan-600/90">{t('home.tierFortressDesc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
