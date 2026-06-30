import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, Environment, Grid, Html, useCursor, useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { GuidebookModal } from './GuidebookModal.jsx';
import {
  BOOK_CLOSED_EULER,
  BOOK_OPEN_EULER,
  cloneBookToMonitorSize,
  cloneCashToMonitorSize,
  cloneMeshMaterialsDeep,
  MONITOR_BASE_SCALE,
  solidifyMeshMaterials,
} from './homeBook3d.js';
import { CASH_MODEL_URL, MONITOR_MODEL_URL, MYBOOK_MODEL_URL } from '../../assets/home3d.js';
import { heroThemeClearHex, heroThemeCssVars, resolveHeroTheme } from './heroTheme.js';

useGLTF.preload(MONITOR_MODEL_URL);
useGLTF.preload(MYBOOK_MODEL_URL);
useGLTF.preload(CASH_MODEL_URL);

const HERO_LABEL_CLASS =
  'font-cyber text-center text-2xl font-bold leading-none tracking-normal text-[var(--hero-text)] normal-case drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] whitespace-nowrap sm:text-3xl md:text-4xl';
/** Faktor scale tambahan saat pointer di atas monitor / buku (di-lerp per frame). */
const HOVER_SCALE_TARGET = 1.1;
/** Skala tambahan untuk satu-satunya item carousel (terpilih) di tengah. */
const CAROUSEL_FOCUS_SCALE = 1.22;
const ORIGIN = new THREE.Vector3(0, 0, 0);
/**
 * Anchor label di bawah model (sumbu Y world; lebih negatif = teks lebih jauh dari mesh).
 * Satu nilai untuk monitor / buku / cash agar jarak terasa konsisten di carousel.
 */
const HERO_LABEL_OFFSET_Y = -1.52;
/** Emissive monitor & buku: dasar + kontribusi `reveal` (lebih terang agar sejajar dengan pencahayaan scene). */
const HERO_EMISSIVE_BASE = 0.36;
const HERO_EMISSIVE_REVEAL = 0.62;

/** @param {{ scene: THREE.Object3D }} scene */
function collectEmissiveMaterials(scene) {
  /** @type {import('three').MeshStandardMaterial[]} */
  const list = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      m.depthTest = true;
      if ('side' in m) m.side = THREE.FrontSide;
      if (m.emissive && typeof m.emissive.set === 'function') {
        m.emissive.set('#22d3ee');
      }
      if ('emissiveIntensity' in m) {
        list.push(m);
      }
    });
    o.renderOrder = 1;
  });
  return list;
}

function MonitorUnit({ reveal, groupRef, onSelect, enabled, hoverLabel, focusScale = 1 }) {
  const { scene } = useGLTF(MONITOR_MODEL_URL);
  const [hover, setHover] = useState(false);
  useCursor(hover && enabled);
  const materialsRef = useRef(/** @type {import('three').MeshStandardMaterial[]} */ ([]));
  const hoverScaleSmoothed = useRef(1);
  const meshGroupRef = useRef(/** @type {THREE.Group | null} */ (null));

  useEffect(() => {
    if (!enabled) setHover(false);
  }, [enabled]);

  const cloned = useMemo(() => {
    const c = scene.clone();
    cloneMeshMaterialsDeep(c);
    solidifyMeshMaterials(c);
    materialsRef.current = collectEmissiveMaterials(c);
    materialsRef.current.forEach((m) => {
      m.emissiveIntensity = 0.45;
    });
    return c;
  }, [scene]);

  useFrame((state, delta) => {
    const g = meshGroupRef.current;
    if (!g) return;
    const r = Math.max(0.001, reveal);
    const t = state.clock.elapsedTime;
    const breath = 1 + 0.02 * Math.sin(t * 2);
    const targetHover = enabled && hover ? HOVER_SCALE_TARGET : 1;
    hoverScaleSmoothed.current = THREE.MathUtils.lerp(
      hoverScaleSmoothed.current,
      targetHover,
      1 - Math.exp(-14 * delta),
    );
    g.scale.setScalar(r * breath * MONITOR_BASE_SCALE * focusScale * hoverScaleSmoothed.current);
    g.position.set(0, 0, 0);
    materialsRef.current.forEach((m) => {
      m.emissiveIntensity = HERO_EMISSIVE_BASE + r * HERO_EMISSIVE_REVEAL;
    });
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (enabled) onSelect();
      }}
      onPointerOver={() => enabled && setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <group ref={meshGroupRef}>
        <Center>
          <primitive object={cloned} />
        </Center>
      </group>
      {enabled && (
        <Html
          position={[0, HERO_LABEL_OFFSET_Y, 0]}
          center
          distanceFactor={5.5}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[50, 0]}
        >
          <div className="pointer-events-none flex justify-center px-2 [writing-mode:horizontal-tb]">
            <p className={HERO_LABEL_CLASS}>
              {hoverLabel}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

function BookUnit({ reveal, onSelect, enabled, hoverLabel, bookOpenProgressRef, rowPosition, focusScale = 1 }) {
  const { scene: bookScene } = useGLTF(MYBOOK_MODEL_URL);
  const { scene: monitorScene } = useGLTF(MONITOR_MODEL_URL);
  const [hover, setHover] = useState(false);
  useCursor(hover && enabled);
  const groupRef = useRef(null);
  const meshGroupRef = useRef(/** @type {THREE.Group | null} */ (null));
  const rotGroupRef = useRef(/** @type {THREE.Group | null} */ (null));
  const hoverScaleSmoothed = useRef(1);
  const bookMaterialsRef = useRef(/** @type {import('three').MeshStandardMaterial[]} */ ([]));

  useEffect(() => {
    if (!enabled) setHover(false);
  }, [enabled]);

  const cloned = useMemo(() => {
    const c = cloneBookToMonitorSize(bookScene, monitorScene);
    /** Sama seperti monitor: kunci daftar material + intensitas awal; per frame di bawah disamakan. */
    bookMaterialsRef.current = collectEmissiveMaterials(c);
    bookMaterialsRef.current.forEach((m) => {
      m.emissiveIntensity = 0.45;
    });
    return c;
  }, [bookScene, monitorScene]);

  useFrame((state, delta) => {
    const g = meshGroupRef.current;
    const rg = rotGroupRef.current;
    if (!g || !rg) return;
    const r = Math.max(0.001, reveal);
    const t = state.clock.elapsedTime;
    const breath = 1 + 0.015 * Math.sin(t * 1.9);
    const targetHover = enabled && hover ? HOVER_SCALE_TARGET : 1;
    hoverScaleSmoothed.current = THREE.MathUtils.lerp(
      hoverScaleSmoothed.current,
      targetHover,
      1 - Math.exp(-14 * delta),
    );
    g.scale.setScalar(r * breath * MONITOR_BASE_SCALE * focusScale * hoverScaleSmoothed.current);
    /** Samakan dengan MonitorUnit — intensitas emissive mengikuti `reveal`, tidak “meredup” saat slot aktif. */
    bookMaterialsRef.current.forEach((m) => {
      m.emissiveIntensity = HERO_EMISSIVE_BASE + r * HERO_EMISSIVE_REVEAL;
    });
    const pr = bookOpenProgressRef?.current;
    const p = Math.min(1, Math.max(0, pr?.p ?? 0));
    rg.rotation.set(
      THREE.MathUtils.lerp(BOOK_CLOSED_EULER[0], BOOK_OPEN_EULER[0], p),
      THREE.MathUtils.lerp(BOOK_CLOSED_EULER[1], BOOK_OPEN_EULER[1], p),
      THREE.MathUtils.lerp(BOOK_CLOSED_EULER[2], BOOK_OPEN_EULER[2], p),
    );
  });

  return (
    <group position={rowPosition}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          if (enabled) onSelect();
        }}
        onPointerOver={() => enabled && setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <group ref={meshGroupRef}>
          <group ref={rotGroupRef}>
            <Center>
              <primitive object={cloned} />
            </Center>
          </group>
        </group>
        {enabled && (
          <Html
            position={[0, HERO_LABEL_OFFSET_Y, 0]}
            center
            distanceFactor={5.2}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[50, 0]}
          >
            <div className="pointer-events-none flex justify-center px-2 [writing-mode:horizontal-tb]">
              <p className={HERO_LABEL_CLASS}>
                {hoverLabel}
              </p>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function CashUnit({
  reveal,
  onSelect,
  enabled,
  hoverLabel,
  rowPosition,
  focusScale = 1,
}) {
  const { scene: cashScene } = useGLTF(CASH_MODEL_URL);
  const { scene: monitorScene } = useGLTF(MONITOR_MODEL_URL);
  const [hover, setHover] = useState(false);
  useCursor(hover && enabled);
  const groupRef = useRef(null);
  const meshGroupRef = useRef(/** @type {THREE.Group | null} */ (null));
  const hoverScaleSmoothed = useRef(1);

  useEffect(() => {
    if (!enabled) setHover(false);
  }, [enabled]);

  const cloned = useMemo(
    () => cloneCashToMonitorSize(cashScene, monitorScene),
    [cashScene, monitorScene],
  );

  useFrame((state, delta) => {
    const g = meshGroupRef.current;
    if (!g) return;
    const r = Math.max(0.001, reveal);
    const t = state.clock.elapsedTime;
    const breath = 1 + 0.016 * Math.sin(t * 2.05);
    const targetHover = enabled && hover ? HOVER_SCALE_TARGET : 1;
    hoverScaleSmoothed.current = THREE.MathUtils.lerp(
      hoverScaleSmoothed.current,
      targetHover,
      1 - Math.exp(-14 * delta),
    );
    g.scale.setScalar(r * breath * MONITOR_BASE_SCALE * focusScale * hoverScaleSmoothed.current);
  });

  return (
    <group position={rowPosition}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          if (enabled) onSelect();
        }}
        onPointerOver={() => enabled && setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <group ref={meshGroupRef}>
          <Center>
            <primitive object={cloned} />
          </Center>
        </group>
        {enabled && (
          <Html
            position={[0, HERO_LABEL_OFFSET_Y, 0]}
            center
            distanceFactor={5.1}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[50, 0]}
          >
            <div className="pointer-events-none flex justify-center px-2 [writing-mode:horizontal-tb]">
              <p className={HERO_LABEL_CLASS}>
                {hoverLabel}
              </p>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function DynamicLights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#99f6e4', '#f8fafc']} intensity={0.42} position={[0, 6, 0]} />
      <directionalLight position={[6, 10, 8]} intensity={1.12} color="#f8fcff" />
      <pointLight position={[-4.5, 4.5, 5.5]} intensity={0.72} color="#5eead4" />
      <pointLight position={[4.5, 2, 6]} intensity={0.48} color="#7dd3fc" />
      <pointLight position={[3, -2.5, 4]} intensity={0.32} color="#0ea5e9" />
    </>
  );
}

function CameraRig({ view }) {
  const { camera, size } = useThree();
  const blend = useRef(0);
  const lookCur = useMemo(() => new THREE.Vector3(), []);
  /** Menjaga subjek zoom saat animasi keluar (command) agar kamera tidak melompat monitor ↔ buku. */
  const zoomSubjectRef = useRef(/** @type {'detail' | 'bookDetail'} */ ('detail'));

  useEffect(() => {
    if (view === 'detail' || view === 'bookDetail') zoomSubjectRef.current = view;
  }, [view]);

  const {
    commandWidePos,
    commandWideLook,
    monitorFocusPos,
    monitorLook,
    bookFocusPos,
    bookLook,
  } = useMemo(() => {
      const narrow = size.width < 640;
      const commandZWide = narrow ? 6.35 : 5.45;
      const commandYWide = narrow ? 0.08 : 0.16;
      const zFocus = narrow ? 2.35 : 1.95;
      const yFocus = narrow ? 0.2 : 0.32;
      const zBook = narrow ? 2.05 : 1.72;
      const ry = 0;
      return {
        commandWidePos: new THREE.Vector3(0, commandYWide, commandZWide),
        commandWideLook: new THREE.Vector3(0, 0, 0),
        monitorFocusPos: new THREE.Vector3(0, ry + yFocus, zFocus),
        monitorLook: new THREE.Vector3(0, ry - 0.06, 0),
        bookFocusPos: new THREE.Vector3(0, ry + 0.36, zBook),
        bookLook: new THREE.Vector3(0, ry + 0.05, 0),
      };
    }, [size.width]);

  useFrame((_, delta) => {
    const zoomed = view === 'detail' || view === 'bookDetail';
    const targetBlend = zoomed ? 1 : 0;
    blend.current = THREE.MathUtils.lerp(blend.current, targetBlend, 1 - Math.exp(-5 * delta));
    const kind =
      view === 'detail' || view === 'bookDetail' ? view : zoomSubjectRef.current;
    const focusPos = kind === 'bookDetail' ? bookFocusPos : monitorFocusPos;
    const lookFocus = kind === 'bookDetail' ? bookLook : monitorLook;
    camera.position.lerpVectors(commandWidePos, focusPos, blend.current);
    lookCur.lerpVectors(commandWideLook, lookFocus, blend.current);
    camera.lookAt(lookCur);
  });
  return null;
}

function CarouselSlideGroup({ children, slideOffsetRef, enabled }) {
  const groupRef = useRef(/** @type {THREE.Group | null} */ (null));

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (!enabled) {
      g.position.y = 0;
      g.scale.setScalar(1);
      return;
    }
    const { y, fade } = slideOffsetRef.current;
    g.position.y = y;
    const s = 0.93 + (fade ?? 1) * 0.07;
    g.scale.setScalar(s);
  });

  return <group ref={groupRef}>{children}</group>;
}

function SceneContent({
  monitorReveal,
  view,
  carouselIndex,
  onMonitorSelect,
  onBookSelect,
  onCashSelect,
  monitorHoverLabel,
  bookHoverLabel,
  cashHoverLabel,
  bookOpenProgressRef,
  palette,
  carouselSlideRef,
  carouselSlideEnabled,
}) {
  const monitorRef = useRef(null);
  const slot = carouselIndex % 3;
  const showMonitor = (view === 'command' && slot === 0) || view === 'detail';
  const showBook = (view === 'command' && slot === 1) || view === 'bookDetail';
  const showCash = view === 'command' && slot === 2;
  const showCmdGrid = view === 'command' || view === 'detail' || view === 'bookDetail';

  return (
    <>
      <CameraRig view={view} />
      <DynamicLights />
      <Environment preset="city" environmentIntensity={0.42} />

      {showCmdGrid && (
        <Grid
          renderOrder={-10}
          position={[0, -1.05, 0]}
          infiniteGrid
          fadeDistance={14}
          fadeStrength={1.35}
          cellSize={0.42}
          cellThickness={0.55}
          cellColor={palette.border}
          sectionSize={2.8}
          sectionThickness={0.7}
          sectionColor={palette.primary}
        />
      )}

      {showMonitor && (
        <CarouselSlideGroup slideOffsetRef={carouselSlideRef} enabled={carouselSlideEnabled}>
          <group position={[0, 0, 0]}>
            <MonitorUnit
              reveal={monitorReveal}
              groupRef={monitorRef}
              onSelect={onMonitorSelect}
              enabled={view === 'command'}
              hoverLabel={monitorHoverLabel}
              focusScale={CAROUSEL_FOCUS_SCALE}
            />
          </group>
        </CarouselSlideGroup>
      )}
      {showBook && (
        <CarouselSlideGroup slideOffsetRef={carouselSlideRef} enabled={carouselSlideEnabled}>
          <BookUnit
            reveal={monitorReveal}
            onSelect={onBookSelect}
            enabled={view === 'command'}
            hoverLabel={bookHoverLabel}
            bookOpenProgressRef={bookOpenProgressRef}
            rowPosition={ORIGIN}
            focusScale={CAROUSEL_FOCUS_SCALE}
          />
        </CarouselSlideGroup>
      )}
      {showCash && (
        <CarouselSlideGroup slideOffsetRef={carouselSlideRef} enabled={carouselSlideEnabled}>
          <CashUnit
            reveal={monitorReveal}
            onSelect={onCashSelect}
            enabled={view === 'command'}
            hoverLabel={cashHoverLabel}
            rowPosition={ORIGIN}
            focusScale={CAROUSEL_FOCUS_SCALE}
          />
        </CarouselSlideGroup>
      )}
    </>
  );
}

const CAROUSEL_MOBILE_SLIDE_OFFSET = 1.85;

/** @param {{ label: string; onClick: () => void; direction: 'up' | 'down' | 'left' | 'right'; disabled?: boolean }} props */
function CarouselNavControl({ label, onClick, direction, disabled = false }) {
  const paths = {
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M5 12l7 7 7-7',
    left: 'M15 18l-6-6 6-6',
    right: 'M9 18l6-6-6-6',
  };

  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--hero-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--hero-bg)_88%,transparent)] text-[var(--hero-text)] shadow-[0_0_24px_rgba(198,40,40,0.2)] backdrop-blur-md transition enabled:active:scale-95 enabled:hover:border-[var(--hero-primary)] enabled:hover:shadow-[0_0_28px_rgba(198,40,40,0.28)] disabled:cursor-not-allowed disabled:opacity-40 md:h-12 md:w-12"
      >
        <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d={paths[direction]} />
        </svg>
      </button>
      <span className="pointer-events-none max-w-[9rem] text-center font-cyber text-[10px] uppercase leading-tight tracking-[0.16em] text-[var(--hero-muted)] opacity-95 sm:max-w-[10rem] md:text-[0.62rem] md:tracking-[0.22em]">
        {label}
      </span>
    </div>
  );
}

/** @param {{ activeIndex: number }} props */
function CarouselIndicators({ activeIndex }) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Carousel items">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          role="tab"
          aria-selected={activeIndex === i}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            activeIndex === i
              ? 'w-5 bg-[var(--hero-primary)]'
              : 'w-1.5 bg-[color-mix(in_srgb,var(--hero-muted)_45%,transparent)]'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * @param {{ initialView?: 'command' | 'detail' | 'bookDetail', theme?: import('./heroTheme.js').HERO_THEME_LIGHT }} props
 */
export function HomeInteractiveHero({ initialView = 'command', theme }) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const palette = useMemo(() => resolveHeroTheme(theme), [theme]);
  const themeStyle = useMemo(() => heroThemeCssVars(palette), [palette]);
  const canvasClearHex = useMemo(() => heroThemeClearHex(palette), [palette]);
  const [guideOpen, setGuideOpen] = useState(false);
  /** `true` hanya jika modal dibuka lewat klik buku 3D → pose “terbuka” di popup. */
  const [guideBookOpenInModal, setGuideBookOpenInModal] = useState(false);

  const openGuideFrom3dBook = () => {
    setGuideBookOpenInModal(true);
    setGuideOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    setGuideBookOpenInModal(false);
  };

  const [view, setView] = useState(/** @type {'command' | 'detail' | 'bookDetail'} */ (initialView));
  /** 0 = monitor, 1 = book, 2 = cash — hanya dipakai saat `view === 'command'`. */
  const [carouselIndex, setCarouselIndex] = useState(0);
  const bookOpenTweenRef = useRef({ p: 0 });
  const carouselSlideRef = useRef({ y: 0, fade: 1 });
  const isMobileCarouselRef = useRef(false);
  const carouselAnimatingRef = useRef(false);
  const [carouselAnimating, setCarouselAnimating] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => {
      isMobileCarouselRef.current = mq.matches;
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const animateCarouselSlide = (direction) => {
    if (!isMobileCarouselRef.current) {
      carouselSlideRef.current.y = 0;
      carouselSlideRef.current.fade = 1;
      return;
    }
    gsap.killTweensOf(carouselSlideRef.current);
    carouselAnimatingRef.current = true;
    setCarouselAnimating(true);
    carouselSlideRef.current.y = direction === 'next' ? CAROUSEL_MOBILE_SLIDE_OFFSET : -CAROUSEL_MOBILE_SLIDE_OFFSET;
    carouselSlideRef.current.fade = 0.5;
    gsap.to(carouselSlideRef.current, {
      y: 0,
      fade: 1,
      duration: 0.72,
      ease: 'expo.out',
      onComplete: () => {
        carouselAnimatingRef.current = false;
        setCarouselAnimating(false);
      },
    });
  };

  const goCarouselPrev = () => {
    if (carouselAnimatingRef.current) return;
    setCarouselIndex((i) => (i + 2) % 3);
    animateCarouselSlide('prev');
  };
  const goCarouselNext = () => {
    if (carouselAnimatingRef.current) return;
    setCarouselIndex((i) => (i + 1) % 3);
    animateCarouselSlide('next');
  };

  useEffect(() => {
    if (view !== 'bookDetail') return undefined;
    bookOpenTweenRef.current.p = 0;
    gsap.killTweensOf(bookOpenTweenRef.current);
    const tw = gsap.to(bookOpenTweenRef.current, {
      p: 1,
      duration: 1.05,
      ease: 'power2.out',
    });
    return () => tw.kill();
  }, [view]);

  const exitBookDetail = () => {
    setCarouselIndex(1);
    setView('command');
    gsap.killTweensOf(bookOpenTweenRef.current);
    gsap.to(bookOpenTweenRef.current, {
      p: 0,
      duration: 0.55,
      ease: 'power2.inOut',
    });
  };

  const [monitorReveal] = useState(1);

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--hero-bg)] text-[var(--hero-text)]"
      style={themeStyle}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
        <div
          className={`relative w-full overflow-hidden md:min-h-0 ${
            view === 'detail' || view === 'bookDetail'
              ? 'h-[min(42vh,400px)] max-h-[min(44vh,420px)] flex-none md:h-auto md:min-h-0 md:max-h-none md:flex-1'
              : 'min-h-[min(50vh,560px)] flex-1'
          } ${view === 'detail' || view === 'bookDetail' ? 'md:flex-[1.15]' : ''}`}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[var(--hero-bg)] bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,rgba(198,40,40,0.14),transparent_62%)]"
            aria-hidden
          />
          <Canvas
            gl={{
              alpha: false,
              antialias: true,
              powerPreference: 'high-performance',
              logarithmicDepthBuffer: true,
            }}
            dpr={[1, 1.5]}
            className={`absolute inset-x-0 bottom-0 z-[1] block h-full w-full touch-none bg-[var(--hero-bg)] ${
              view === 'detail' || view === 'bookDetail' ? 'max-md:top-10' : 'top-0'
            }`}
            onCreated={({ gl }) => {
              gl.setClearColor(canvasClearHex, 1);
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
            }}
          >
            <Suspense fallback={null}>
              <SceneContent
                monitorReveal={view === 'detail' || view === 'bookDetail' ? 1 : monitorReveal}
                view={view}
                carouselIndex={carouselIndex}
                onMonitorSelect={() => {
                  setCarouselIndex(0);
                  setView('detail');
                }}
                onBookSelect={() => {
                  setCarouselIndex(1);
                  setView('bookDetail');
                }}
                onCashSelect={() => navigate('/purchase')}
                monitorHoverLabel={t('nav.monitoring')}
                bookHoverLabel={t('home.guidebookCta')}
                cashHoverLabel={t('home.cashHoverCta')}
                bookOpenProgressRef={bookOpenTweenRef}
                palette={palette}
                carouselSlideRef={carouselSlideRef}
                carouselSlideEnabled={view === 'command'}
              />
            </Suspense>
          </Canvas>

          <div
            className="pointer-events-none absolute left-4 top-4 z-30 hidden md:left-6 md:top-6 md:block"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <p className="font-cyber transform-gpu text-xl font-bold uppercase tracking-[0.1em] text-[var(--hero-primary)] antialiased [text-shadow:0_1px_3px_rgba(15,23,42,0.9)] sm:text-xl sm:tracking-[0.12em] md:text-2xl md:tracking-[0.14em] md:[text-shadow:none]">
              {t('brand.name')}
            </p>
          </div>

          {view === 'command' && monitorReveal > 0.2 && (
            <div className="pointer-events-none absolute left-0 right-0 top-4 z-20 flex justify-center px-4 md:top-10">
              <p
                className="max-w-md text-center font-cyber text-[11px] uppercase tracking-[0.16em] text-[var(--hero-muted)] antialiased transition-opacity duration-500 [text-shadow:0_1px_2px_rgba(15,23,42,0.75)] sm:text-xs sm:tracking-[0.2em] sm:[text-shadow:none]"
                style={{ opacity: Math.min(1, (monitorReveal - 0.2) / 0.5) }}
              >
                {t('home.tapMonitorHint')}
              </p>
            </div>
          )}

          {view === 'command' && monitorReveal > 0.15 && (
            <>
              {/* Mobile — prev atas, next bawah, slide vertikal */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-[var(--hero-bg)] via-[color-mix(in_srgb,var(--hero-bg)_72%,transparent)] to-transparent md:hidden"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-gradient-to-t from-[var(--hero-bg)] via-[color-mix(in_srgb,var(--hero-bg)_72%,transparent)] to-transparent md:hidden"
                aria-hidden
              />

              <div className="pointer-events-auto absolute left-0 right-0 top-14 z-20 flex justify-center px-4 md:hidden">
                <CarouselNavControl
                  label={t('home.carouselPrev')}
                  onClick={goCarouselPrev}
                  direction="up"
                  disabled={carouselAnimating}
                />
              </div>

              <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-3 px-4 pb-5 md:hidden">
                <CarouselIndicators activeIndex={carouselIndex} />
                <CarouselNavControl
                  label={t('home.carouselNext')}
                  onClick={goCarouselNext}
                  direction="down"
                  disabled={carouselAnimating}
                />
              </div>

              {/* Desktop — kiri / kanan + indikator bawah */}
              <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-20 hidden justify-center md:flex">
                <CarouselIndicators activeIndex={carouselIndex} />
              </div>
              <div className="pointer-events-auto absolute left-[calc(40%-clamp(4.25rem,20vw,7rem))] top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                <CarouselNavControl
                  label={t('home.carouselPrev')}
                  onClick={goCarouselPrev}
                  direction="left"
                  disabled={carouselAnimating}
                />
              </div>
              <div className="pointer-events-auto absolute left-[calc(60%+clamp(4.25rem,20vw,7rem))] top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                <CarouselNavControl
                  label={t('home.carouselNext')}
                  onClick={goCarouselNext}
                  direction="right"
                  disabled={carouselAnimating}
                />
              </div>
            </>
          )}
        </div>

        {view === 'detail' && (
          <aside className="flex min-h-0 w-full flex-1 flex-col justify-between overflow-y-auto border-t border-[var(--hero-border)] bg-[color-mix(in_srgb,var(--hero-card)_98%,transparent)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[4.5rem] shadow-slark backdrop-blur-md max-md:mt-4 sm:px-5 sm:pt-20 md:mt-0 md:max-h-none md:w-[min(100%,400px)] md:flex-none md:justify-center md:px-6 md:py-10 md:pb-6 md:border-l md:border-t-0">
            <div className="min-h-0 shrink-0">
              <p className="font-cyber text-[9px] uppercase tracking-[0.32em] text-[var(--hero-primary)] sm:text-[10px] sm:tracking-[0.4em]">{t('brand.name')}</p>
              <h2 className="font-cyber mt-2 text-lg font-bold leading-tight tracking-tight text-[var(--hero-text)] sm:mt-3 sm:text-xl md:mt-4 md:text-2xl">
                {t('home.monitorDetailTitle')}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--hero-muted)] sm:mt-3 sm:text-sm md:mt-4">{t('home.monitorDetailBody')}</p>
              <p className="mt-2 hidden text-[11px] leading-relaxed text-[var(--hero-muted)] opacity-90 sm:mt-3 sm:block sm:text-xs md:mt-4">{t('home.monitorDetailHint')}</p>
            </div>
            <div className="mt-5 shrink-0 pt-1 sm:mt-6 md:mt-8">
              <button
                type="button"
                onClick={() => navigate('/monitoring')}
                className="font-cyber w-full rounded-xl border border-[var(--hero-primary)] bg-[var(--hero-primary)] py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-slark transition hover:border-[var(--hero-primary-hover)] hover:bg-[var(--hero-primary-hover)] sm:py-3 sm:text-xs sm:tracking-[0.16em] md:text-sm md:tracking-[0.18em]"
              >
                {t('home.goToMonitoringPage')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCarouselIndex(0);
                  setView('command');
                }}
                className="font-cyber mt-2.5 w-full rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)] py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--hero-text)] transition hover:border-[var(--hero-primary)] hover:text-[var(--hero-primary)] sm:mt-3 sm:py-3 sm:text-xs sm:tracking-[0.18em] md:text-sm md:tracking-[0.2em]"
              >
                {t('home.exitView')}
              </button>
            </div>
          </aside>
        )}

        {view === 'bookDetail' && (
          <aside className="flex min-h-0 w-full flex-1 flex-col justify-between overflow-y-auto border-t border-[var(--hero-border)] bg-[color-mix(in_srgb,var(--hero-card)_98%,transparent)] px-4 py-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-slark backdrop-blur-md sm:px-5 md:max-h-none md:w-[min(100%,400px)] md:flex-none md:justify-center md:px-6 md:py-10 md:pb-6 md:border-l md:border-t-0">
            <div className="min-h-0 shrink-0">
              <p className="font-cyber text-[9px] uppercase tracking-[0.32em] text-[var(--hero-primary)] sm:text-[10px] sm:tracking-[0.4em]">{t('brand.name')}</p>
              <h2 className="font-cyber mt-2 text-lg font-bold leading-tight tracking-tight text-[var(--hero-text)] sm:mt-3 sm:text-xl md:mt-4 md:text-2xl">
                {t('home.bookDetailTitle')}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--hero-muted)] sm:mt-3 sm:text-sm md:mt-4">{t('home.bookDetailBody')}</p>
            </div>
            <div className="mt-5 shrink-0 pt-1 sm:mt-6 md:mt-8">
              <button
                type="button"
                onClick={openGuideFrom3dBook}
                className="font-cyber w-full rounded-xl border border-[var(--hero-primary)] bg-[var(--hero-primary)] py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--hero-primary-hover)] hover:bg-[var(--hero-primary-hover)] sm:py-3 sm:text-xs sm:tracking-[0.16em] md:text-sm md:tracking-[0.18em]"
              >
                {t('home.bookDetailOpenGuide')}
              </button>
              <button
                type="button"
                onClick={exitBookDetail}
                className="font-cyber mt-2.5 w-full rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)] py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--hero-text)] transition hover:border-[var(--hero-primary)] hover:text-[var(--hero-primary)] sm:mt-3 sm:py-3 sm:text-xs sm:tracking-[0.18em] md:text-sm md:tracking-[0.2em]"
              >
                {t('home.exitView')}
              </button>
            </div>
          </aside>
        )}
      </div>

      <GuidebookModal
        open={guideOpen}
        onClose={closeGuide}
        bookPresentationOpen={guideBookOpenInModal}
        locale={locale === 'id' ? 'id' : 'en'}
        t={t}
        theme={palette}
      />
    </div>
  );
}
