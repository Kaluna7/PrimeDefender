import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import { integrationGuide } from '../../content/integrationGuide.js';
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
          <div
            className={`relative h-44 min-h-[176px] w-full shrink-0 overflow-hidden sm:h-[min(260px,32vh)] sm:min-h-[200px] sm:w-[42%] sm:max-w-[280px] ${
              theme
                ? 'bg-gradient-to-br from-[var(--hero-card)] via-[var(--hero-bg)] to-[var(--hero-card)]'
                : 'bg-gradient-to-br from-slark-card via-slark-bg to-slark-card'
            }`}
          >
            <BookCanvas bookPresentationOpen={bookPresentationOpen} />
          </div>
          <div className="flex flex-1 flex-col justify-center px-4 py-4 sm:py-5 sm:pr-6">
            <h2
              id="guidebook-title"
              className={`font-cyber text-lg font-bold tracking-tight sm:text-xl ${
                theme ? 'text-[var(--hero-text)]' : 'text-slark-text'
              }`}
            >
              {guide.title}
            </h2>
            <p
              className={`mt-2 text-xs leading-relaxed sm:text-sm ${
                theme ? 'text-[var(--hero-muted)] opacity-95' : 'text-slark-muted/95'
              }`}
            >
              {guide.subtitle}
            </p>
          </div>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {guide.sections.map((section) => (
            <section key={section.h} className="mb-6 last:mb-0">
              <h3
                className={`font-cyber text-sm font-semibold ${
                  theme ? 'text-[var(--hero-primary)] opacity-95' : 'text-slark-primary/95'
                }`}
              >
                {section.h}
              </h3>
              <ul
                className={`mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed sm:text-sm ${
                  theme ? 'text-[var(--hero-text)] opacity-90' : 'text-slark-text/88'
                }`}
              >
                {section.p.map((line, i) => (
                  <li key={i} className={theme ? 'marker:text-[var(--hero-muted)]' : 'marker:text-slark-muted'}>
                    {line.split('`').map((part, j) =>
                      j % 2 === 1 ? (
                        <code
                          key={j}
                          className={`rounded px-1 py-0.5 font-mono text-[0.7rem] sm:text-[0.75rem] ${
                            theme
                              ? 'bg-[color-mix(in_srgb,var(--hero-card)_80%,transparent)] text-[var(--hero-primary)]'
                              : 'bg-slark-card/80 text-slark-primary'
                          }`}
                        >
                          {part}
                        </code>
                      ) : (
                        <span key={j}>{part}</span>
                      ),
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div
          className={`flex shrink-0 flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
            theme ? 'border-[var(--hero-border)] bg-[var(--hero-card)]' : 'border-slark-border bg-slark-card'
          }`}
        >
          <Link
            to="/docs"
            className={`text-center font-cyber text-xs font-semibold uppercase tracking-wider underline-offset-4 hover:underline ${
              theme
                ? 'text-[var(--hero-muted)] hover:text-[var(--hero-primary)]'
                : 'text-slark-muted hover:text-slark-primary'
            }`}
            onClick={onClose}
          >
            {t('home.guideModalFullDocs')}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className={`font-cyber rounded-xl border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition ${
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
