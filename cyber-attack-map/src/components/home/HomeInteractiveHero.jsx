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
} from './homeBook3d.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CASH_MODEL_URL, ELEVATOR_MODEL_URL, MONITOR_MODEL_URL, MYBOOK_MODEL_URL } from '../../assets/home3d.js';

useGLTF.preload(ELEVATOR_MODEL_URL);
useGLTF.preload(MONITOR_MODEL_URL);
useGLTF.preload(MYBOOK_MODEL_URL);
useGLTF.preload(CASH_MODEL_URL);

/** Skala world maks elevator.glb (bbox kecil; ditahan lebih kecil agar tidak mendominasi frame). */
const ELEVATOR_MAX_WORLD_SCALE = 10;
/** `elevatorZoomTRef.t` 0→1: mayoritas durasi dipakai untuk shot luar dulu, baru masuk mendekat. */
const ELEVATOR_ZOOM_OUTSIDE_END = 0.72;
/** Geser elevator di world space (turunkan jika terasa terlalu tinggi di frame). */
const ELEVATOR_BASE_Y = -5;
/**
 * Rotasi Y agar pintu/kabin menghadap kamera (+Z); GLB ini defaultnya menyamping.
 * Kebalikan dari -π/2 jika pintu membelakangi kamera.
 */
const ELEVATOR_Y_ROTATION = Math.PI / 2;
/** Naik kabin (hanya transform elevator). */
const ELEVATOR_RIDE_LIFT_Y = 0.72;

/**
 * Hanya parameter kamera untuk intro elevator — tidak mengikat `ELEVATOR_BASE_Y`, skala, atau rotasi model.
 */
const CAMERA_ELEVATOR_INTRO = {
  /** Titik lookAt (world Y) intro; independen dari posisi grup elevator. */
  lookY: -1.02,
  widePosYOffset: 0.72,
  outsidePosYOffset: 0.58,
  insidePosYOffset: 0.42,
  insideLookExtraY: 0.08,
};

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
      if (m.emissive && typeof m.emissive.set === 'function') {
        m.emissive.set('#22d3ee');
      }
      if ('emissiveIntensity' in m) {
        list.push(m);
      }
    });
  });
  return list;
}

function ElevatorUnit({ power, rideT, rideRef }) {
  const { scene } = useGLTF(ELEVATOR_MODEL_URL);
  const materialsRef = useRef(/** @type {import('three').MeshStandardMaterial[]} */ ([]));
  const innerRef = useRef(/** @type {THREE.Group | null} */ (null));
  const cloned = useMemo(() => {
    const c = cloneSkinned(scene);
    cloneMeshMaterialsDeep(c);
    materialsRef.current = collectEmissiveMaterials(c);
    materialsRef.current.forEach((m) => {
      m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.5);
    });
    return c;
  }, [scene]);

  useFrame((state) => {
    const inner = innerRef.current;
    if (!inner) return;
    const pe = THREE.MathUtils.clamp(power, 0, 1);
    /** Langsung dari ref GSAP (bukan hanya state React) supaya gerak tiap frame. */
    const rawRide =
      rideRef?.current && typeof rideRef.current.ride01 === 'number'
        ? rideRef.current.ride01
        : rideT;
    const rt = THREE.MathUtils.clamp(rawRide, 0, 1);
    materialsRef.current.forEach((m) => {
      m.emissiveIntensity = THREE.MathUtils.lerp(0.03, 0.9, pe);
    });
    /** Setelah READY cukup meluncur naik; tanpa getaran samping/depan-belakang. */
    inner.position.set(0, rt * ELEVATOR_RIDE_LIFT_Y, 0);
  });

  const pe = THREE.MathUtils.clamp(power, 0, 1);
  const elevatorScale = ELEVATOR_MAX_WORLD_SCALE * THREE.MathUtils.lerp(0.24, 1, pe);

  return (
    <group position={[0, ELEVATOR_BASE_Y, 0]} scale={elevatorScale}>
      <group ref={innerRef}>
        <Center>
          <primitive object={cloned} rotation={[0, ELEVATOR_Y_ROTATION, 0]} />
        </Center>
      </group>
    </group>
  );
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
            <p className="font-cyber text-center text-2xl leading-none tracking-normal text-white normal-case drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)] whitespace-nowrap sm:text-3xl md:text-4xl">
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
              <p className="font-cyber text-center text-2xl leading-none tracking-normal text-white normal-case drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)] whitespace-nowrap sm:text-3xl md:text-4xl">
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
              <p className="font-cyber text-center text-2xl leading-none tracking-normal text-white normal-case drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)] whitespace-nowrap sm:text-3xl md:text-4xl">
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
            <div className="pointer-events-none min-w-[200px] max-w-[min(92vw,340px)] rounded-md border border-emerald-500/45 bg-black/88 px-2.5 py-2 shadow-[0_0_22px_rgba(16,185,129,0.25)] sm:min-w-[260px] sm:px-3 sm:py-2.5">
              <p className="font-mono text-[10px] uppercase leading-snug tracking-wide text-emerald-400/95 sm:text-xs">
                {cashPosLine}
                {!cashPosComplete ? (
                  <span className="ml-0.5 inline-block w-1.5 animate-pulse bg-emerald-400/90 align-middle" />
                ) : null}
              </p>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

function DynamicLights({ introPower, introSceneActive }) {
  const ambRef = useRef(/** @type {import('three').AmbientLight | null} */ (null));
  const cyanRef = useRef(/** @type {import('three').PointLight | null} */ (null));
  const fillRef = useRef(/** @type {import('three').PointLight | null} */ (null));
  const hemiRef = useRef(/** @type {import('three').HemisphereLight | null} */ (null));

  useFrame(() => {
    const p = introSceneActive ? introPower : 1;
    /** Saat model intro “mati”, lantai intensitas cahaya. */
    const ambLo = introSceneActive ? 0.06 : 0.1;
    const hemiLo = introSceneActive ? 0.06 : 0.1;
    const cyanLo = introSceneActive ? 0.06 : 0.14;
    const fillLo = introSceneActive ? 0.06 : 0.12;
    if (ambRef.current) {
      ambRef.current.intensity = THREE.MathUtils.lerp(ambLo, 0.45, p);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(hemiLo, 0.42, p);
    }
    if (cyanRef.current) {
      cyanRef.current.intensity = THREE.MathUtils.lerp(cyanLo, 0.72, p);
    }
    if (fillRef.current) {
      fillRef.current.intensity = THREE.MathUtils.lerp(fillLo, 0.48, p);
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.1} />
      <hemisphereLight
        ref={hemiRef}
        args={['#99f6e4', '#0f172a']}
        intensity={0.28}
        position={[0, 6, 0]}
      />
      <directionalLight position={[6, 10, 8]} intensity={1.12} color="#f8fcff" />
      <pointLight ref={cyanRef} position={[-4.5, 4.5, 5.5]} intensity={0.14} color="#5eead4" />
      <pointLight ref={fillRef} position={[4.5, 2, 6]} intensity={0.22} color="#7dd3fc" />
      <pointLight position={[3, -2.5, 4]} intensity={0.32} color="#0ea5e9" />
    </>
  );
}

function IntroInfoCard({ title, body, className = '' }) {
  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050a12]/72 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(34,211,238,0.08)] backdrop-blur-md ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
        aria-hidden
      />
      <p className="font-cyber text-[10px] uppercase tracking-[0.32em] text-cyan-300/90">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-cyan-50/84">{body}</p>
    </div>
  );
}

function CameraRig({ view, cashOverheadTRef, elevatorZoomTRef, elevatorRideRef, elevatorPower }) {
  const { camera, size } = useThree();
  const blend = useRef(0);
  const lookCur = useMemo(() => new THREE.Vector3(), []);
  /** Menjaga subjek zoom saat animasi keluar (command) agar kamera tidak melompat monitor ↔ buku. */
  const zoomSubjectRef = useRef(/** @type {'detail' | 'bookDetail'} */ ('detail'));

  useEffect(() => {
    if (view === 'detail' || view === 'bookDetail') zoomSubjectRef.current = view;
  }, [view]);

  const {
    introWidePos,
    introWideLook,
    commandWidePos,
    commandWideLook,
    monitorFocusPos,
    monitorLook,
    bookFocusPos,
    bookLook,
    cashOverheadPos,
    cashOverheadLook,
    elevatorOutsidePos,
    elevatorOutsideLook,
    elevatorInsidePos,
    elevatorInsideLook,
  } = useMemo(() => {
      const narrow = size.width < 640;
      /** Shot intro khusus elevator: lebih jauh agar model terbaca utuh. */
      const introZWide = narrow ? 12.4 : 10.2;
      const lookY = CAMERA_ELEVATOR_INTRO.lookY;
      const introYWide = lookY + CAMERA_ELEVATOR_INTRO.widePosYOffset;
      /** Kamera command/detail dipisah agar perubahan elevator tidak mengecilkan menu GLB lain. */
      const commandZWide = narrow ? 6.35 : 5.45;
      const commandYWide = narrow ? 0.08 : 0.16;
      const zFocus = narrow ? 2.35 : 1.95;
      const yFocus = narrow ? 0.26 : 0.32;
      const zBook = narrow ? 2.05 : 1.72;
      const ry = 0;
      /** Sudut “dari atas” menuju mesin kasir: Y tinggi, Z kecil agar bidang pandang mencondong ke bawah. */
      const ohY = narrow ? 4.85 : 5.35;
      const ohZ = narrow ? 2.05 : 1.75;
      /**
       * Fase 1 dolly “Turn on”: mendekat tapi masih di luar — kabin terbaca penuh.
       * Fase 2: masuk ke dalam (z kecil).
       */
      const eoY = lookY + CAMERA_ELEVATOR_INTRO.outsidePosYOffset;
      const eoZ = narrow ? 6.4 : 5.25;
      /**
       * Fase akhir tetap mendekat ke pintu/kabin, tapi tidak sedalam sebelumnya
       * agar kamera tidak terasa sudah spawn di dalam elevator.
       */
      const eiY = lookY + CAMERA_ELEVATOR_INTRO.insidePosYOffset;
      const eiZ = narrow ? 3.2 : 2.55;
      return {
        introWidePos: new THREE.Vector3(0, introYWide, introZWide),
        introWideLook: new THREE.Vector3(0, lookY, 0),
        commandWidePos: new THREE.Vector3(0, commandYWide, commandZWide),
        commandWideLook: new THREE.Vector3(0, 0, 0),
        monitorFocusPos: new THREE.Vector3(0, ry + yFocus, zFocus),
        monitorLook: new THREE.Vector3(0, ry + 0.05, 0),
        bookFocusPos: new THREE.Vector3(0, ry + 0.36, zBook),
        bookLook: new THREE.Vector3(0, ry + 0.05, 0),
        cashOverheadPos: new THREE.Vector3(0, ohY, ohZ),
        cashOverheadLook: new THREE.Vector3(0, -0.18, 0),
        elevatorOutsidePos: new THREE.Vector3(0, eoY, eoZ),
        elevatorOutsideLook: new THREE.Vector3(0, lookY, 0),
        elevatorInsidePos: new THREE.Vector3(0, eiY, eiZ),
        elevatorInsideLook: new THREE.Vector3(0, lookY + CAMERA_ELEVATOR_INTRO.insideLookExtraY, 0),
      };
    }, [size.width]);

  useFrame((_, delta) => {
    const ez =
      view === 'intro' && elevatorZoomTRef?.current && typeof elevatorZoomTRef.current.t === 'number'
        ? elevatorZoomTRef.current.t
        : 0;

    const rideT =
      view === 'intro' && elevatorRideRef?.current && typeof elevatorRideRef.current.ride01 === 'number'
        ? THREE.MathUtils.clamp(elevatorRideRef.current.ride01, 0, 1)
        : 0;
    /** Sama seperti di ElevatorUnit: naik lokal × skala grup = perpindahan world Y kabin. */
    const elevatorScaleWorld =
      ELEVATOR_MAX_WORLD_SCALE *
      THREE.MathUtils.lerp(0.24, 1, THREE.MathUtils.clamp(elevatorPower ?? 0, 0, 1));
    const rideLift = rideT * ELEVATOR_RIDE_LIFT_Y * elevatorScaleWorld;

    if (view === 'intro') {
      if (ez <= 0.0005) {
        camera.position.copy(introWidePos);
        camera.position.y += rideLift;
        lookCur.copy(introWideLook);
        lookCur.y += rideLift;
        camera.lookAt(lookCur);
        return;
      }
      if (ez <= ELEVATOR_ZOOM_OUTSIDE_END) {
        const u = ez / ELEVATOR_ZOOM_OUTSIDE_END;
        camera.position.lerpVectors(introWidePos, elevatorOutsidePos, u);
        lookCur.lerpVectors(introWideLook, elevatorOutsideLook, u);
      } else {
        const u = (ez - ELEVATOR_ZOOM_OUTSIDE_END) / (1 - ELEVATOR_ZOOM_OUTSIDE_END);
        camera.position.lerpVectors(elevatorOutsidePos, elevatorInsidePos, u);
        lookCur.lerpVectors(elevatorOutsideLook, elevatorInsideLook, u);
      }
      camera.position.y += rideLift;
      lookCur.y += rideLift;
      camera.lookAt(lookCur);
      return;
    }

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
  elevatorVisible,
  elevatorPower,
  elevatorRideT,
  elevatorRideRef,
  elevatorZoomTRef,
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
}) {
  const monitorRef = useRef(null);
  const slot = carouselIndex % 3;
  const showMonitor =
    !elevatorVisible && ((view === 'command' && slot === 0) || view === 'detail');
  const showBook =
    !elevatorVisible && ((view === 'command' && slot === 1) || view === 'bookDetail');
  const showCash = !elevatorVisible && view === 'command' && slot === 2;
  const showCmdGrid =
    !elevatorVisible && (view === 'command' || view === 'detail' || view === 'bookDetail');

  return (
    <>
      <CameraRig
        view={view}
        cashOverheadTRef={cashOverheadTRef}
        elevatorZoomTRef={elevatorZoomTRef}
        elevatorRideRef={elevatorRideRef}
        elevatorPower={elevatorPower}
      />
      <DynamicLights introPower={elevatorPower} introSceneActive={elevatorVisible} />
      <Environment
        preset="city"
        environmentIntensity={
          elevatorVisible ? 0.12 + 0.32 * THREE.MathUtils.clamp(elevatorPower, 0, 1) : 0.42
        }
      />

      {showCmdGrid && (
        <Grid
          position={[0, -0.52, 0]}
          infiniteGrid
          fadeDistance={16}
          fadeStrength={1.45}
          cellSize={0.42}
          cellThickness={0.65}
          cellColor="#115e59"
          sectionSize={2.8}
          sectionThickness={0.75}
          sectionColor="#134e4a"
        />
      )}

      {elevatorVisible && (
        <ElevatorUnit power={elevatorPower} rideT={elevatorRideT} rideRef={elevatorRideRef} />
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

export function HomeInteractiveHero() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
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

  const [view, setView] = useState(/** @type {'intro' | 'command' | 'detail' | 'bookDetail'} */ ('intro'));
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
  /** Zoom kamera ke dalam elevator saat intro “Turn on”. */
  const elevatorZoomTRef = useRef({ t: 0 });
  /** `ride01` 0→1 (hindari nama `t` — bisa bentrok dengan variabel internal GSAP). */
  const elevatorRideRef = useRef({ ride01: 0 });
  const elevatorTweenRef = useRef({ p: 0 });
  const elevatorFlashRef = useRef({ o: 0 });
  const turnOnTimelineRef = useRef(/** @type {import('gsap').core.Timeline | null} */ (null));
  const [elevatorRideT, setElevatorRideT] = useState(0);
  const [elevatorFlashOpacity, setElevatorFlashOpacity] = useState(0);
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

  const [elevatorPower, setElevatorPower] = useState(0);
  const [elevatorVisible, setElevatorVisible] = useState(true);
  const [monitorReveal, setMonitorReveal] = useState(0);
  const [activating, setActivating] = useState(false);
  const monitorTweenRef = useRef({ r: 0 });

  useEffect(() => {
    return () => {
      gsap.killTweensOf(cashZoomExtraRef.current);
      gsap.killTweensOf(cashOverheadTRef.current);
      gsap.killTweensOf(elevatorZoomTRef.current);
      gsap.killTweensOf(elevatorRideRef.current);
      gsap.killTweensOf(elevatorTweenRef.current);
      gsap.killTweensOf(elevatorFlashRef.current);
      cashPurchaseTimelineRef.current?.kill();
      turnOnTimelineRef.current?.kill();
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

  const handleTurnOn = () => {
    if (activating || view !== 'intro') return;
    setActivating(true);
    turnOnTimelineRef.current?.kill();
    gsap.killTweensOf(elevatorTweenRef.current);
    gsap.killTweensOf(elevatorZoomTRef.current);
    gsap.killTweensOf(elevatorRideRef.current);
    gsap.killTweensOf(elevatorFlashRef.current);

    elevatorTweenRef.current.p = elevatorPower;
    elevatorZoomTRef.current.t = 0;
    elevatorRideRef.current.ride01 = 0;
    elevatorFlashRef.current.o = 0;
    setElevatorRideT(0);
    setElevatorFlashOpacity(0);

    const tl = gsap.timeline({
      onComplete: () => {
        elevatorZoomTRef.current.t = 0;
        elevatorRideRef.current.ride01 = 0;
        setElevatorRideT(0);
        elevatorFlashRef.current.o = 0;
        setElevatorFlashOpacity(0);
        setElevatorVisible(false);
        setView('command');
        monitorTweenRef.current.r = 0;
        setMonitorReveal(0);
        gsap.to(monitorTweenRef.current, {
          r: 1,
          duration: 0.95,
          ease: 'power3.out',
          onUpdate: () => setMonitorReveal(monitorTweenRef.current.r),
          onComplete: () => {
            setMonitorReveal(1);
            setActivating(false);
          },
        });
      },
    });
    turnOnTimelineRef.current = tl;

    tl.to(elevatorTweenRef.current, {
      p: 1,
      duration: 1.35,
      ease: 'power2.out',
      onUpdate: () => setElevatorPower(elevatorTweenRef.current.p),
    }, 0);

    tl.to(elevatorZoomTRef.current, {
      t: 1,
      duration: 2.35,
      ease: 'power2.inOut',
    }, 0.18);

    /** Bersamaan dengan zoom masuk: layar berpendar putih penuh. */
    tl.to(
      elevatorFlashRef.current,
      {
        o: 1,
        duration: 2.35,
        ease: 'power2.inOut',
        onUpdate: () => setElevatorFlashOpacity(elevatorFlashRef.current.o),
      },
      0.18,
    );

    /** Sedikit jeda di layar putih penuh sebelum pindah ke command. */
    tl.to({}, { duration: 0.28 });
  };

  /** Teks intro langsung hilang (opacity 0) saat Turn on diklik, tanpa animasi fade. */
  const introCopyOpacity = view === 'intro' ? (activating ? 0 : 1) : 1;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#030508] text-cyan-50">
      <div
        className={`flex min-h-0 w-full flex-1 flex-col ${
          view === 'intro' ? '' : 'md:flex-row'
        }`}
      >
        <div
          className={`relative w-full overflow-hidden md:min-h-0 ${
            view === 'intro'
              ? 'min-h-[100svh] flex-1'
              : `min-h-[min(50vh,560px)] flex-1 ${view === 'detail' || view === 'bookDetail' ? 'md:flex-[1.15]' : ''} md:min-h-0`
          }`}
        >
          {/* Gradient di belakang canvas transparan: pusat sedikit lebih terang → kontras GLB lebih jelas. */}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_82%_58%_at_50%_36%,rgba(13,148,136,0.2),rgba(6,78,59,0.12)_45%,rgba(3,5,8,0.97))]"
            aria-hidden
          />
          <Canvas
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            dpr={[1, 1.5]}
            className="absolute inset-0 z-[1] block h-full w-full touch-none"
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.1;
            }}
          >
            <Suspense fallback={null}>
              <SceneContent
                elevatorVisible={view === 'detail' || view === 'bookDetail' ? false : elevatorVisible}
                elevatorPower={view === 'detail' || view === 'bookDetail' ? 1 : elevatorPower}
                elevatorRideT={elevatorRideT}
                elevatorRideRef={elevatorRideRef}
                elevatorZoomTRef={elevatorZoomTRef}
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
              />
            </Suspense>
          </Canvas>

          {view === 'intro' && elevatorVisible && (
            <div
              className="pointer-events-none absolute inset-0 z-[4]"
              style={{ opacity: 1 - Math.min(1, elevatorPower * 1.15) }}
              aria-hidden
            >
              {/* Vignette hanya di pinggir — hindari bulatan gelap di tengah layar */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_125%_90%_at_50%_38%,rgba(1,4,5,0)_0%,rgba(1,4,5,0)_58%,rgba(1,4,5,0.38)_100%)]" />
            </div>
          )}

          {view === 'intro' && elevatorFlashOpacity > 0.002 && (
            <div
              className="pointer-events-none absolute inset-0 z-[24] bg-white"
              style={{ opacity: elevatorFlashOpacity }}
              aria-hidden
            />
          )}

          {showCashSpotlight && (
            <>
              <div className="absolute inset-0 z-[7] cursor-wait bg-transparent" aria-hidden />
              <div
                ref={cashSpotlightElRef}
                className="pointer-events-none absolute inset-0 z-[8] bg-gradient-to-b from-cyan-100/35 from-0% via-teal-400/12 via-38% to-[#030508]/92 to-100%"
                style={{ opacity: 0 }}
                aria-hidden
              />
            </>
          )}

          <div
            className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-6"
            style={{ opacity: introCopyOpacity }}
          >
            <p className="font-cyber text-[10px] uppercase tracking-[0.45em] text-cyan-500/90">{t('brand.name')}</p>
          </div>

          {view === 'intro' && (
            <>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-[11] flex justify-center px-4 pt-5 sm:px-6 sm:pt-6 lg:pt-8"
                style={{ opacity: introCopyOpacity }}
              >
                <div className="max-w-xl text-center">
                  <p className="font-cyber text-[11px] uppercase tracking-[0.38em] text-cyan-400/85">
                    {t('brand.name')}
                  </p>
                  <h1 className="mt-3 font-cyber text-xl leading-tight text-cyan-50 sm:text-2xl lg:text-3xl">
                    {t('home.introLine1')}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-cyan-100/75 sm:text-base">
                    {t('brand.tagline')}
                  </p>
                </div>
              </div>

              {/* CTA full absolute — tidak ikut flex layout, area canvas tetap penuh untuk elevator */}
              <div
                className="pointer-events-none absolute left-1/2 z-[15] w-[min(100%-2rem,28rem)] -translate-x-1/2"
                style={{
                  bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
                  opacity: introCopyOpacity,
                }}
              >
                <div
                  className={`flex flex-col items-center gap-3 rounded-2xl border border-cyan-500/20 bg-[#050a12]/55 px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur-md sm:rounded-[28px] sm:px-6 sm:py-4 ${activating ? 'pointer-events-none' : 'pointer-events-auto'}`}
                >
                  <p className="text-center text-sm leading-relaxed text-cyan-100/80">
                    {t('home.introLine2')}
                  </p>
                  <button
                    type="button"
                    onClick={handleTurnOn}
                    disabled={activating}
                    className="group relative w-full overflow-hidden rounded-xl border border-cyan-400/50 bg-gradient-to-b from-cyan-500 to-cyan-700 px-6 py-3.5 font-cyber text-xs font-bold uppercase tracking-[0.28em] text-white shadow-[0_0_32px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:border-cyan-300/80 hover:shadow-[0_0_40px_rgba(34,211,238,0.45)] active:scale-[0.98] disabled:opacity-50 sm:px-8 sm:py-4 sm:text-sm"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition group-hover:translate-x-full group-hover:opacity-100 group-hover:duration-700" />
                    <span className="relative">{activating ? t('home.turnOnLoading') : t('home.turnOn')}</span>
                  </button>
                </div>
              </div>

              <div
                className="pointer-events-none absolute left-4 top-[6.5rem] z-[12] hidden w-[min(22rem,26vw)] lg:block"
                style={{ opacity: introCopyOpacity }}
              >
                <IntroInfoCard title={t('brand.name')} body={t('home.heroSubtitle')} />
              </div>

              <div
                className="pointer-events-none absolute right-4 top-[7rem] z-[12] hidden w-[min(18rem,22vw)] xl:block"
                style={{ opacity: introCopyOpacity }}
              >
                <IntroInfoCard title={t('home.feature1Title')} body={t('home.feature1Body')} />
              </div>

              <div
                className="pointer-events-none absolute bottom-[9rem] left-4 z-[12] hidden w-[min(18rem,22vw)] xl:block"
                style={{ opacity: introCopyOpacity }}
              >
                <IntroInfoCard title={t('home.feature2Title')} body={t('home.feature2Body')} />
              </div>

              <div
                className="pointer-events-none absolute bottom-[9rem] right-4 z-[12] hidden w-[min(18rem,22vw)] xl:block"
                style={{ opacity: introCopyOpacity }}
              >
                <IntroInfoCard title={t('home.feature3Title')} body={t('home.feature3Body')} />
              </div>
            </>
          )}

          {view === 'command' && monitorReveal > 0.2 && (
            <div className="pointer-events-none absolute left-0 right-0 top-8 z-10 flex justify-center px-4 md:top-10">
              <p
                className="max-w-md text-center font-cyber text-xs uppercase tracking-[0.2em] text-cyan-400/95 transition-opacity duration-500"
                style={{ opacity: Math.min(1, (monitorReveal - 0.2) / 0.5) }}
              >
                {t('home.tapMonitorHint')}
              </p>
            </div>
          )}

          {view === 'command' && !elevatorVisible && monitorReveal > 0.15 && (
            <>
              <div className="pointer-events-auto absolute left-[calc(40%-clamp(4.25rem,20vw,7rem))] top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 md:gap-2">
                <button
                  type="button"
                  aria-label={t('home.carouselPrev')}
                  onClick={goCarouselPrev}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/50 bg-[#030508]/90 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] backdrop-blur-sm active:scale-95 md:h-12 md:w-12"
                >
                  <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="pointer-events-none max-w-[6.5rem] text-center font-cyber text-[0.55rem] uppercase leading-tight tracking-[0.18em] text-cyan-400/95 md:max-w-[8rem] md:text-[0.62rem] md:tracking-[0.22em]">
                  {t('home.carouselPrev')}
                </span>
              </div>
              <div className="pointer-events-auto absolute left-[calc(60%+clamp(4.25rem,20vw,7rem))] top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 md:gap-2">
                <button
                  type="button"
                  aria-label={t('home.carouselNext')}
                  onClick={goCarouselNext}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-500/50 bg-[#030508]/90 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] backdrop-blur-sm active:scale-95 md:h-12 md:w-12"
                >
                  <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <span className="pointer-events-none max-w-[6.5rem] text-center font-cyber text-[0.55rem] uppercase leading-tight tracking-[0.18em] text-cyan-400/95 md:max-w-[8rem] md:text-[0.62rem] md:tracking-[0.22em]">
                  {t('home.carouselNext')}
                </span>
              </div>
            </>
          )}
        </div>

        {view === 'detail' && (
          <aside className="flex max-h-[min(88vh,640px)] w-full shrink-0 flex-col justify-center overflow-y-auto border-t border-cyan-900/40 bg-[#050a10]/95 p-6 shadow-[inset_0_1px_0_rgba(34,211,238,0.08)] backdrop-blur-md md:max-h-none md:w-[min(100%,400px)] md:border-l md:border-t-0 md:py-10">
            <p className="font-cyber text-[10px] uppercase tracking-[0.4em] text-cyan-500">{t('brand.name')}</p>
            <h2 className="font-cyber mt-4 text-xl font-bold tracking-tight text-white md:text-2xl">
              {t('home.monitorDetailTitle')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cyan-100/85">{t('home.monitorDetailBody')}</p>
            <p className="mt-4 text-xs leading-relaxed text-cyan-600/90">{t('home.heroSubtitle')}</p>
            <button
              type="button"
              onClick={() => navigate('/monitoring')}
              className="font-cyber mt-8 w-full rounded-xl border border-cyan-400/55 bg-gradient-to-b from-cyan-600/90 to-cyan-800/95 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_24px_rgba(34,211,238,0.2)] transition hover:border-cyan-300/80 hover:brightness-110"
            >
              {t('home.goToMonitoringPage')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCarouselIndex(0);
                setView('command');
              }}
              className="font-cyber mt-3 w-full rounded-xl border border-cyan-700/50 bg-cyan-950/40 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-500 hover:bg-cyan-900/40"
            >
              {t('home.exitView')}
            </button>
          </aside>
        )}

        {view === 'bookDetail' && (
          <aside className="flex max-h-[min(88vh,640px)] w-full shrink-0 flex-col justify-center overflow-y-auto border-t border-amber-900/35 bg-[#050a10]/95 p-6 shadow-[inset_0_1px_0_rgba(251,191,36,0.1)] backdrop-blur-md md:max-h-none md:w-[min(100%,400px)] md:border-l md:border-t-0 md:py-10">
            <p className="font-cyber text-[10px] uppercase tracking-[0.4em] text-amber-500/90">{t('brand.name')}</p>
            <h2 className="font-cyber mt-4 text-xl font-bold tracking-tight text-amber-50 md:text-2xl">
              {t('home.bookDetailTitle')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-amber-100/88">{t('home.bookDetailBody')}</p>
            <button
              type="button"
              onClick={openGuideFrom3dBook}
              className="font-cyber mt-6 w-full rounded-xl border border-amber-500/50 bg-amber-950/35 py-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-400 hover:bg-amber-900/35"
            >
              {t('home.bookDetailOpenGuide')}
            </button>
            <button
              type="button"
              onClick={exitBookDetail}
              className="font-cyber mt-3 w-full rounded-xl border border-cyan-700/50 bg-cyan-950/40 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-500 hover:bg-cyan-900/40"
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
      />
    </div>
  );
}
