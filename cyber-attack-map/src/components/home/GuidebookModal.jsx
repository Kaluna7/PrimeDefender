import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import { integrationGuide } from '../../pages/docs/integrationGuide.js';
import { IntegrationGuideSections } from '../../pages/docs/IntegrationGuideSections.jsx';
import { MONITOR_MODEL_URL, MYBOOK_MODEL_URL } from '../../assets/home3d.js';
import {
  BOOK_CLOSED_EULER,
  BOOK_OPEN_EULER,
  cloneBookToMonitorSize,
  MONITOR_BASE_SCALE,
} from './homeBook3d.js';
import { heroThemeCssVars } from './heroTheme.js';

useGLTF.preload(MYBOOK_MODEL_URL);
useGLTF.preload(MONITOR_MODEL_URL);

function BookPreview({ bookPresentationOpen }) {
  const { scene: bookScene } = useGLTF(MYBOOK_MODEL_URL);
  const { scene: monitorScene } = useGLTF(MONITOR_MODEL_URL);
  const breathRef = useRef(null);
  const cloned = useMemo(
    () => cloneBookToMonitorSize(bookScene, monitorScene),
    [bookScene, monitorScene],
  );
  const euler = bookPresentationOpen ? BOOK_OPEN_EULER : BOOK_CLOSED_EULER;

  useFrame((state) => {
    const g = breathRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const breath = 1 + 0.014 * Math.sin(t * 1.85);
    g.scale.setScalar(breath * MONITOR_BASE_SCALE);
  });

  return (
    <group ref={breathRef}>
      <group rotation={euler}>
        <Center>
          <primitive object={cloned} />
        </Center>
      </group>
    </group>
  );
}

function BookCanvas({ bookPresentationOpen }) {
  return (
    <Canvas
      className="absolute inset-0 block h-full w-full touch-none"
      gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.15, 4.2], fov: 42, near: 0.05, far: 200 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#e8f8ff', '#060a10', 0.75]} />
      <directionalLight position={[5, 10, 8]} intensity={1.15} color="#ffffff" />
      <pointLight position={[-4, 3, 5]} intensity={0.65} color="#5eead4" />
      <Suspense fallback={null}>
        <BookPreview bookPresentationOpen={bookPresentationOpen} />
      </Suspense>
    </Canvas>
  );
}

/**
 * @param {object} props
 * @param {boolean} props.bookPresentationOpen — pose “terbuka” di header hanya setelah klik buku 3D di hero
 * @param {import('./heroTheme.js').HERO_THEME_LIGHT} [props.theme]
 */
export function GuidebookModal({ open, onClose, bookPresentationOpen = false, locale, t, theme }) {
  const guide = integrationGuide[locale] ?? integrationGuide.en;
  const themeStyle = theme ? heroThemeCssVars(theme) : undefined;
  const [showBookPreview, setShowBookPreview] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setShowBookPreview(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidebook-title"
    >
      <button
        type="button"
        className={`absolute inset-0 backdrop-blur-[2px] ${theme ? 'bg-black/60' : 'bg-slark-dark/50'}`}
        onClick={onClose}
        aria-label={t('home.guideModalClose')}
      />
      <div
        className={`relative z-[101] m-0 flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border shadow-slark-lg sm:m-4 sm:rounded-2xl ${
          theme
            ? 'border-[var(--hero-border)] bg-[var(--hero-bg)]'
            : 'border-slark-border bg-slark-bg'
        }`}
        style={themeStyle}
      >
        <div
          className={`flex shrink-0 flex-col border-b sm:flex-row ${
            theme ? 'border-[var(--hero-border)]' : 'border-slark-border'
          }`}
        >
          {showBookPreview ? (
            <div
              className={`relative h-[min(260px,32vh)] min-h-[200px] w-[42%] max-w-[280px] shrink-0 overflow-hidden ${
                theme
                  ? 'bg-gradient-to-br from-[var(--hero-card)] via-[var(--hero-bg)] to-[var(--hero-card)]'
                  : 'bg-gradient-to-br from-slark-card via-slark-bg to-slark-card'
              }`}
            >
              <BookCanvas bookPresentationOpen={bookPresentationOpen} />
            </div>
          ) : null}
          <div className="flex flex-1 flex-col justify-center px-4 py-3.5 sm:py-5 sm:pr-6">
            <h2
              id="guidebook-title"
              className={`font-cyber text-xl font-bold leading-tight tracking-tight sm:text-xl ${
                theme ? 'text-[var(--hero-text)]' : 'text-slark-text dark:text-white'
              }`}
            >
              {guide.title}
            </h2>
            <p
              className={`mt-1.5 text-[15px] leading-relaxed sm:text-sm ${
                theme ? 'text-[var(--hero-muted)] opacity-95' : 'text-slark-muted'
              }`}
            >
              {guide.subtitle}
            </p>
            <Link
              to="/docs"
              className={`mt-3 inline-flex font-cyber text-sm font-semibold uppercase tracking-wide underline-offset-4 hover:underline sm:text-xs sm:tracking-wider ${
                theme ? 'text-[var(--hero-primary)] hover:text-[var(--hero-primary)]' : 'text-slark-primary hover:text-slark-primary-hover'
              }`}
              onClick={onClose}
            >
              {t('home.guideModalFullDocs')}
            </Link>
          </div>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-5">
          <IntegrationGuideSections variant="modal" locale={locale} theme={Boolean(theme)} />
        </div>

        <div
          className={`flex shrink-0 justify-end border-t px-4 py-3.5 sm:px-6 sm:py-4 ${
            theme ? 'border-[var(--hero-border)] bg-[var(--hero-card)]' : 'border-slark-border bg-slark-card'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`font-cyber w-full rounded-xl border px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] transition sm:w-auto sm:py-2.5 sm:text-xs sm:tracking-[0.2em] ${
              theme
                ? 'border-[var(--hero-border)] bg-[var(--hero-bg)] text-[var(--hero-text)] hover:border-[var(--hero-primary)] hover:bg-[var(--hero-card)]'
                : 'border-slark-border bg-slark-bg text-slark-text hover:border-slark-primary hover:bg-slark-card'
            }`}
          >
            {t('home.guideModalClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
