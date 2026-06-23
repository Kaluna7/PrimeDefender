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

/** Offset layar POS (Html) di atas badan mesin kasir — world space relatif ke grup. */
const CASH_POS_DISPLAY_Y = 0.56;
const CASH_POS_DISPLAY_Z = 0.24;

function CashUnit({
  reveal,
  onSelect,
  enabled,
  hoverLabel,
  rowPosition,
  focusScale = 1,
  cashZoomExtraRef,
  cashPostCameraHum = false,
  cashPosHudVisible = false,
  cashPosLine = '',
  cashPosComplete = false,
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
    const extra =
      cashZoomExtraRef?.current && typeof cashZoomExtraRef.current.extraScale === 'number'
        ? cashZoomExtraRef.current.extraScale
        : 1;
    let buzz = 1;
    if (cashPostCameraHum) buzz *= 1 + 0.018 * Math.sin(t * 7.2);
    if (cashPosHudVisible) buzz *= 1 + 0.036 * Math.sin(t * 15.5);
    g.scale.setScalar(r * breath * MONITOR_BASE_SCALE * focusScale * hoverScaleSmoothed.current * extra * buzz);
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
        {enabled && !cashPosHudVisible && (
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
        {cashPosHudVisible && (
          <Html
            position={[0, CASH_POS_DISPLAY_Y, CASH_POS_DISPLAY_Z]}
            center
            distanceFactor={4.15}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[60, 0]}
          >
            <div className="pointer-events-none min-w-[200px] max-w-[min(92vw,340px)] rounded-lg border border-[var(--hero-border)] bg-[var(--hero-card)] px-2.5 py-2 shadow-slark sm:min-w-[260px] sm:px-3 sm:py-2.5">
              <p className="font-mono text-[10px] uppercase leading-snug tracking-wide text-[var(--hero-text)] sm:text-xs">
                {cashPosLine}
                {!cashPosComplete ? (
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[var(--hero-primary)] align-middle" />
                ) : null}
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

function CameraRig({ view, cashOverheadTRef }) {
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
    cashOverheadPos,
    cashOverheadLook,
  } = useMemo(() => {
      const narrow = size.width < 640;
      const commandZWide = narrow ? 6.35 : 5.45;
      const commandYWide = narrow ? 0.08 : 0.16;
      const zFocus = narrow ? 2.35 : 1.95;
      const yFocus = narrow ? 0.26 : 0.32;
      const zBook = narrow ? 2.05 : 1.72;
      const ry = 0;
      const ohY = narrow ? 4.85 : 5.35;
      const ohZ = narrow ? 2.05 : 1.75;
      return {
        commandWidePos: new THREE.Vector3(0, commandYWide, commandZWide),
        commandWideLook: new THREE.Vector3(0, 0, 0),
        monitorFocusPos: new THREE.Vector3(0, ry + yFocus, zFocus),
        monitorLook: new THREE.Vector3(0, ry + 0.05, 0),
        bookFocusPos: new THREE.Vector3(0, ry + 0.36, zBook),
        bookLook: new THREE.Vector3(0, ry + 0.05, 0),
        cashOverheadPos: new THREE.Vector3(0, ohY, ohZ),
        cashOverheadLook: new THREE.Vector3(0, -0.18, 0),
      };
    }, [size.width]);

  useFrame((_, delta) => {
    const cashT =
      view === 'command' && cashOverheadTRef?.current && typeof cashOverheadTRef.current.t === 'number'
        ? cashOverheadTRef.current.t
        : 0;

    if (view === 'command' && cashT > 0.0005) {
      camera.position.lerpVectors(commandWidePos, cashOverheadPos, cashT);
      lookCur.lerpVectors(commandWideLook, cashOverheadLook, cashT);
      camera.lookAt(lookCur);
      return;
    }

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
  cashZoomExtraRef,
  cashOverheadTRef,
  cashPostCameraHum,
  cashPosHudVisible,
  cashPosLine,
  cashPosComplete,
  palette,
}) {
  const monitorRef = useRef(null);
  const slot = carouselIndex % 3;
  const showMonitor = (view === 'command' && slot === 0) || view === 'detail';
  const showBook = (view === 'command' && slot === 1) || view === 'bookDetail';
  const showCash = view === 'command' && slot === 2;
  const showCmdGrid = view === 'command' || view === 'detail' || view === 'bookDetail';

  return (
    <>
      <CameraRig view={view} cashOverheadTRef={cashOverheadTRef} />
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
      )}
      {showBook && (
        <BookUnit
          reveal={monitorReveal}
          onSelect={onBookSelect}
          enabled={view === 'command'}
          hoverLabel={bookHoverLabel}
          bookOpenProgressRef={bookOpenProgressRef}
          rowPosition={ORIGIN}
          focusScale={CAROUSEL_FOCUS_SCALE}
        />
      )}
      {showCash && (
        <CashUnit
          reveal={monitorReveal}
          onSelect={onCashSelect}
          enabled={view === 'command'}
          hoverLabel={cashHoverLabel}
          rowPosition={ORIGIN}
          focusScale={CAROUSEL_FOCUS_SCALE}
          cashZoomExtraRef={cashZoomExtraRef}
          cashPostCameraHum={cashPostCameraHum}
          cashPosHudVisible={cashPosHudVisible}
          cashPosLine={cashPosLine}
          cashPosComplete={cashPosComplete}
        />
      )}
    </>
  );
}

/**
 * Hub 3D (monitor / buku / kasir).
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
  /** Skala ekstra pada mesh kasir saat animasi “checkout” (GSAP mengisi `extraScale`). */
  const cashZoomExtraRef = useRef({ extraScale: 1 });
  /** 0 → 1: kamera dari sudut command lebar ke sorotan dari atas menuju kasir. */
  const cashOverheadTRef = useRef({ t: 0 });
  const cashPurchaseLockRef = useRef(false);
  const cashSpotlightElRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [showCashSpotlight, setShowCashSpotlight] = useState(false);
  /** Jeda setelah kamera overhead: mesin “hidup” halus sebelum teks POS. */
  const [cashPostCameraHum, setCashPostCameraHum] = useState(false);
  const [cashPosHudVisible, setCashPosHudVisible] = useState(false);
  const [cashPosLine, setCashPosLine] = useState('');
  const [cashPosComplete, setCashPosComplete] = useState(false);
  const cashPurchaseTimelineRef = useRef(/** @type {import('gsap').core.Timeline | null} */ (null));
  const goCarouselPrev = () => setCarouselIndex((i) => (i + 2) % 3);
  const goCarouselNext = () => setCarouselIndex((i) => (i + 1) % 3);

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

  useEffect(() => {
    return () => {
      gsap.killTweensOf(cashZoomExtraRef.current);
      gsap.killTweensOf(cashOverheadTRef.current);
      cashPurchaseTimelineRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    if (!showCashSpotlight || !cashSpotlightElRef.current) return undefined;
    const el = cashSpotlightElRef.current;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.42, ease: 'power2.out' });
    return () => {
      gsap.killTweensOf(el);
    };
  }, [showCashSpotlight]);

  const runCashPurchaseSequence = () => {
    if (cashPurchaseLockRef.current) return;
    cashPurchaseLockRef.current = true;
    cashPurchaseTimelineRef.current?.kill();
    setCarouselIndex(2);
    setShowCashSpotlight(true);
    setCashPostCameraHum(false);
    setCashPosHudVisible(false);
    setCashPosLine('');
    setCashPosComplete(false);

    cashZoomExtraRef.current.extraScale = 1;
    cashOverheadTRef.current.t = 0;
    gsap.killTweensOf(cashZoomExtraRef.current);
    gsap.killTweensOf(cashOverheadTRef.current);

    const fullLine = t('home.cashRegisterTypingLine');
    let lastN = 0;

    const master = gsap.timeline({
      onComplete: () => {
        navigate('/purchase');
      },
    });
    cashPurchaseTimelineRef.current = master;

    master.to(cashOverheadTRef.current, { t: 1, duration: 0.92, ease: 'power2.inOut' }, 0);
    master.to(cashZoomExtraRef.current, { extraScale: 0.94, duration: 0.09, ease: 'power2.in' }, 0);
    master.to(cashZoomExtraRef.current, { extraScale: 1.26, duration: 0.62, ease: 'power2.out' }, 0.09);

    master.addLabel('camDone', 0.92);
    master.call(
      () => {
        setCashPostCameraHum(true);
      },
      null,
      'camDone',
    );
    master.to({}, { duration: 0.72 }, 'camDone');
    master.call(() => {
      setCashPostCameraHum(false);
      setCashPosHudVisible(true);
      lastN = 0;
    });
    master.to({}, {
      duration: Math.max(0.038 * fullLine.length, 0.95),
      ease: 'none',
      onUpdate: function onCashTypeUpdate() {
        const n = Math.max(0, Math.ceil(this.progress() * fullLine.length));
        if (n !== lastN) {
          lastN = n;
          setCashPosLine(fullLine.slice(0, n));
        }
      },
      onComplete: () => {
        setCashPosLine(fullLine);
        setCashPosComplete(true);
      },
    });
    master.to({}, { duration: 0.52 });
  };

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--hero-bg)] text-[var(--hero-text)]"
      style={themeStyle}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
        <div
          className={`relative min-h-[min(50vh,560px)] w-full flex-1 overflow-hidden md:min-h-0 ${
            view === 'detail' || view === 'bookDetail' ? 'md:flex-[1.15]' : ''
          }`}
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
            className="absolute inset-0 z-[1] block h-full w-full touch-none bg-[var(--hero-bg)]"
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
                onCashSelect={runCashPurchaseSequence}
                monitorHoverLabel={t('nav.monitoring')}
                bookHoverLabel={t('home.guidebookCta')}
                cashHoverLabel={t('home.cashHoverCta')}
                bookOpenProgressRef={bookOpenTweenRef}
                cashZoomExtraRef={cashZoomExtraRef}
                cashOverheadTRef={cashOverheadTRef}
                cashPostCameraHum={cashPostCameraHum}
                cashPosHudVisible={cashPosHudVisible}
                cashPosLine={cashPosLine}
                cashPosComplete={cashPosComplete}
                palette={palette}
              />
            </Suspense>
          </Canvas>

          {showCashSpotlight && (
            <>
              <div className="absolute inset-0 z-[7] cursor-wait bg-transparent" aria-hidden />
              <div
                ref={cashSpotlightElRef}
                className="pointer-events-none absolute inset-0 z-[8] bg-gradient-to-b from-red-950/35 from-0% via-[color-mix(in_srgb,var(--hero-card)_35%,transparent)] via-38% to-[color-mix(in_srgb,var(--hero-bg)_96%,transparent)] to-100%"
                style={{ opacity: 0 }}
                aria-hidden
              />
            </>
          )}

          <div className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-6">
            <p className="font-cyber text-[10px] uppercase tracking-[0.45em] text-[var(--hero-primary)] opacity-90">{t('brand.name')}</p>
          </div>

          {view === 'command' && monitorReveal > 0.2 && (
            <div className="pointer-events-none absolute left-0 right-0 top-8 z-10 flex justify-center px-4 md:top-10">
              <p
                className="max-w-md text-center font-cyber text-xs uppercase tracking-[0.2em] text-[var(--hero-muted)] opacity-95 transition-opacity duration-500"
                style={{ opacity: Math.min(1, (monitorReveal - 0.2) / 0.5) }}
              >
                {t('home.tapMonitorHint')}
              </p>
            </div>
          )}

          {view === 'command' && monitorReveal > 0.15 && (
            <>
              <div className="pointer-events-auto absolute left-[calc(40%-clamp(4.25rem,20vw,7rem))] top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 md:gap-2">
                <button
                  type="button"
                  aria-label={t('home.carouselPrev')}
                  onClick={goCarouselPrev}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--hero-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--hero-bg)_90%,transparent)] text-[var(--hero-text)] shadow-[0_0_20px_rgba(198,40,40,0.18)] backdrop-blur-sm active:scale-95 md:h-12 md:w-12"
                >
                  <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="pointer-events-none max-w-[6.5rem] text-center font-cyber text-[0.55rem] uppercase leading-tight tracking-[0.18em] text-[var(--hero-muted)] opacity-95 md:max-w-[8rem] md:text-[0.62rem] md:tracking-[0.22em]">
                  {t('home.carouselPrev')}
                </span>
              </div>
              <div className="pointer-events-auto absolute left-[calc(60%+clamp(4.25rem,20vw,7rem))] top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 md:gap-2">
                <button
                  type="button"
                  aria-label={t('home.carouselNext')}
                  onClick={goCarouselNext}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--hero-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--hero-bg)_90%,transparent)] text-[var(--hero-text)] shadow-[0_0_20px_rgba(198,40,40,0.18)] backdrop-blur-sm active:scale-95 md:h-12 md:w-12"
                >
                  <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <span className="pointer-events-none max-w-[6.5rem] text-center font-cyber text-[0.55rem] uppercase leading-tight tracking-[0.18em] text-[var(--hero-muted)] opacity-95 md:max-w-[8rem] md:text-[0.62rem] md:tracking-[0.22em]">
                  {t('home.carouselNext')}
                </span>
              </div>
            </>
          )}
        </div>

        {view === 'detail' && (
          <aside className="flex max-h-[min(88vh,640px)] w-full shrink-0 flex-col justify-center overflow-y-auto border-t border-[var(--hero-border)] bg-[color-mix(in_srgb,var(--hero-card)_98%,transparent)] p-6 shadow-slark backdrop-blur-md md:max-h-none md:w-[min(100%,400px)] md:border-l md:border-t-0 md:py-10">
            <p className="font-cyber text-[10px] uppercase tracking-[0.4em] text-[var(--hero-primary)]">{t('brand.name')}</p>
            <h2 className="font-cyber mt-4 text-xl font-bold tracking-tight text-[var(--hero-text)] md:text-2xl">
              {t('home.monitorDetailTitle')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--hero-muted)]">{t('home.monitorDetailBody')}</p>
            <p className="mt-4 text-xs leading-relaxed text-[var(--hero-muted)] opacity-90">{t('home.heroSubtitle')}</p>
            <button
              type="button"
              onClick={() => navigate('/monitoring')}
              className="font-cyber mt-8 w-full rounded-xl border border-[var(--hero-primary)] bg-[var(--hero-primary)] py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-slark transition hover:border-[var(--hero-primary-hover)] hover:bg-[var(--hero-primary-hover)]"
            >
              {t('home.goToMonitoringPage')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCarouselIndex(0);
                setView('command');
              }}
              className="font-cyber mt-3 w-full rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)] py-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--hero-text)] transition hover:border-[var(--hero-primary)] hover:text-[var(--hero-primary)]"
            >
              {t('home.exitView')}
            </button>
          </aside>
        )}

        {view === 'bookDetail' && (
          <aside className="flex max-h-[min(88vh,640px)] w-full shrink-0 flex-col justify-center overflow-y-auto border-t border-[var(--hero-border)] bg-[color-mix(in_srgb,var(--hero-card)_98%,transparent)] p-6 shadow-slark backdrop-blur-md md:max-h-none md:w-[min(100%,400px)] md:border-l md:border-t-0 md:py-10">
            <p className="font-cyber text-[10px] uppercase tracking-[0.4em] text-[var(--hero-primary)]">{t('brand.name')}</p>
            <h2 className="font-cyber mt-4 text-xl font-bold tracking-tight text-[var(--hero-text)] md:text-2xl">
              {t('home.bookDetailTitle')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--hero-muted)]">{t('home.bookDetailBody')}</p>
            <button
              type="button"
              onClick={openGuideFrom3dBook}
              className="font-cyber mt-6 w-full rounded-xl border border-[var(--hero-primary)] bg-[var(--hero-primary)] py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:border-[var(--hero-primary-hover)] hover:bg-[var(--hero-primary-hover)]"
            >
              {t('home.bookDetailOpenGuide')}
            </button>
            <button
              type="button"
              onClick={exitBookDetail}
              className="font-cyber mt-3 w-full rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)] py-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--hero-text)] transition hover:border-[var(--hero-primary)] hover:text-[var(--hero-primary)]"
            >
              {t('home.exitView')}
            </button>
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
