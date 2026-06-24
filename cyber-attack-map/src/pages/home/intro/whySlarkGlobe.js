import * as THREE from 'three';

const EARTH_TEXTURE =
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

/** Metro hubs for random globe threat arcs */
const CITY_HUBS = [
  { lat: 52.23, lon: 21.01 },
  { lat: 52.37, lon: 4.9 },
  { lat: 60.17, lon: 24.94 },
  { lat: 52.52, lon: 13.41 },
  { lat: 38.72, lon: -9.14 },
  { lat: 51.51, lon: -0.13 },
  { lat: 40.71, lon: -74.01 },
  { lat: 50.11, lon: 8.68 },
  { lat: 37.77, lon: -122.42 },
  { lat: 48.86, lon: 2.35 },
  { lat: 39.9, lon: 116.4 },
  { lat: 35.68, lon: 139.69 },
  { lat: 19.08, lon: 72.88 },
  { lat: 1.35, lon: 103.82 },
  { lat: -23.55, lon: -46.63 },
  { lat: -33.87, lon: 151.21 },
  { lat: 10.82, lon: 106.63 },
  { lat: 25.2, lon: 55.27 },
  { lat: 55.76, lon: 37.62 },
  { lat: -1.29, lon: 36.82 },
  { lat: 30.04, lon: 31.24 },
  { lat: 28.61, lon: 77.21 },
  { lat: 43.65, lon: -79.38 },
  { lat: 34.05, lon: -118.24 },
];

const THREAT_STYLES = [
  { line: 0xff9328, pulse: 0xffc870, dot: 0xffaa55 },
  { line: 0x64bedc, pulse: 0x9ee8ff, dot: 0x7ec8e8 },
  { line: 0xff5c7a, pulse: 0xff9aad, dot: 0xff7088 },
  { line: 0xa78bfa, pulse: 0xc9b8ff, dot: 0xb49aff },
  { line: 0x34d399, pulse: 0x7aefc0, dot: 0x4ade9a },
  { line: 0xfbbf24, pulse: 0xffe08a, dot: 0xfcd34d },
  { line: 0x38bdf8, pulse: 0x8ed4ff, dot: 0x5cc4fa },
  { line: 0xf472b6, pulse: 0xffa8d4, dot: 0xf88cc4 },
];

function angularDistance(a, b) {
  const lat1 = THREE.MathUtils.degToRad(a.lat);
  const lon1 = THREE.MathUtils.degToRad(a.lon);
  const lat2 = THREE.MathUtils.degToRad(b.lat);
  const lon2 = THREE.MathUtils.degToRad(b.lon);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pickRandomGeoPoint() {
  if (Math.random() < 0.65) {
    return CITY_HUBS[Math.floor(Math.random() * CITY_HUBS.length)];
  }
  return {
    lat: Math.random() * 120 - 60,
    lon: Math.random() * 360 - 180,
  };
}

function pickRandomRoute() {
  let attempts = 0;
  while (attempts < 30) {
    attempts += 1;
    const from = pickRandomGeoPoint();
    const to = pickRandomGeoPoint();
    const dist = angularDistance(from, to);
    if (dist < 0.38 || dist > 2.4) continue;
    return { from, to };
  }
  const from = CITY_HUBS[0];
  const to = CITY_HUBS[Math.floor(Math.random() * (CITY_HUBS.length - 1)) + 1];
  return { from, to };
}

function fibonacciSpherePoint(i, n, radius) {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

function latLonToVec3(lat, lon, r) {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lonRad = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.cos(lonRad),
    r * Math.sin(latRad),
    -r * Math.cos(latRad) * Math.sin(lonRad),
  );
}

function createArcCurve(start, end, arcRadius, bulge, liftAxis) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const control = mid
    .clone()
    .add(liftAxis.clone().multiplyScalar(arcRadius * bulge * 0.35))
    .normalize()
    .multiplyScalar(arcRadius * bulge);
  return new THREE.QuadraticBezierCurve3(start, control, end);
}

function applyGradientColors(geo, segments, colorHex) {
  const c = new THREE.Color(colorHex);
  const colors = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const fade = 0.35 + Math.sin(t * Math.PI) * 0.65;
    colors[i * 3] = c.r * fade;
    colors[i * 3 + 1] = c.g * fade;
    colors[i * 3 + 2] = c.b * fade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ pieceCount?: number, isMobile?: boolean }} [options]
 */
export function createWhySlarkGlobe(canvas, options = {}) {
  const pieceCount = options.pieceCount ?? (options.isMobile ? 88 : 160);
  const radius = options.isMobile ? 1.05 : 1.25;
  const earthRadius = radius;
  const arcRadius = earthRadius * 1.018;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.15, 4.6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(4, 6, 5);
  const fill = new THREE.DirectionalLight(0xb8d4f0, 0.55);
  fill.position.set(-4, 2, 6);
  const rim = new THREE.DirectionalLight(0x64bedc, 0.32);
  rim.position.set(-5, -2, -4);
  scene.add(key, fill, rim);

  const debrisGroup = new THREE.Group();
  scene.add(debrisGroup);

  const particleGroup = new THREE.Group();
  const globeGroup = new THREE.Group();
  debrisGroup.add(particleGroup, globeGroup);

  const palette = [0xc62828, 0x1f2937, 0x94a3b8, 0xb71c1c, 0x4b5563];
  const pieces = [];
  const shellRadius = earthRadius * 1.028;

  for (let i = 0; i < pieceCount; i += 1) {
    const size = 0.06 + Math.random() * 0.1;
    const geo =
      Math.random() > 0.5
        ? new THREE.TetrahedronGeometry(size, 0)
        : new THREE.BoxGeometry(size * 1.2, size * 0.8, size * 1.4);
    const mat = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length],
      metalness: 0.35,
      roughness: 0.45,
      flatShading: true,
      transparent: true,
      opacity: 1,
      depthWrite: true,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const globe = fibonacciSpherePoint(i, pieceCount, shellRadius);
    const scatter = new THREE.Vector3(
      (Math.random() - 0.5) * (options.isMobile ? 5.5 : 7.5),
      (Math.random() - 0.5) * (options.isMobile ? 4 : 5.5),
      (Math.random() - 0.5) * (options.isMobile ? 5 : 7),
    );
    const scatterRot = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );

    mesh.position.copy(scatter);
    mesh.rotation.copy(scatterRot);
    particleGroup.add(mesh);
    pieces.push({
      mesh,
      scatter,
      globe,
      scatterRot,
      delay: (i / pieceCount) * 0.38,
      driftAmp: 0.035 + Math.random() * 0.07,
      driftSpd: 0.35 + Math.random() * 0.75,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
    });
  }

  const earthGeo = new THREE.SphereGeometry(earthRadius, 56, 56);
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.05,
    roughness: 0.42,
    transparent: true,
    opacity: 0,
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  globeGroup.add(earthMesh);

  new THREE.TextureLoader().load(
    EARTH_TEXTURE,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
    },
    undefined,
    () => {},
  );

  const threatGroup = new THREE.Group();
  globeGroup.add(threatGroup);

  const arcSegments = options.isMobile ? 40 : 56;
  const arcSlotCount = options.isMobile ? 10 : 16;
  const threatArcs = [];
  const liftScratch = new THREE.Vector3();

  function buildArcCurveForRoute(route) {
    const start = latLonToVec3(route.from.lat, route.from.lon, arcRadius);
    const end = latLonToVec3(route.to.lat, route.to.lon, arcRadius);
    liftScratch.crossVectors(start, end).normalize();
    if (liftScratch.lengthSq() < 0.01) {
      liftScratch.set(0, 1, 0);
    }
    const bulge = 1.04 + Math.random() * 0.16;
    return {
      curve: createArcCurve(start, end, arcRadius, bulge, liftScratch),
      start,
      end,
    };
  }

  function assignRandomRoute(slot) {
    const style = THREAT_STYLES[Math.floor(Math.random() * THREAT_STYLES.length)];
    const { curve, start, end } = buildArcCurveForRoute(pickRandomRoute());
    const points = curve.getPoints(arcSegments);
    slot.line.geometry.setFromPoints(points);
    slot.line.geometry.attributes.position.needsUpdate = true;
    applyGradientColors(slot.line.geometry, arcSegments, style.line);
    slot.curve = curve;
    slot.style = style;
    slot.speed = 0.16 + Math.random() * 0.22;
    slot.baseOpacity = 0.45 + Math.random() * 0.4;
    slot.life = 0;
    slot.duration = 2.2 + Math.random() * 3.8;
    slot.delay = Math.random() * 2.4;
    slot.pulseT = Math.random();
    slot.dotFrom.position.copy(start);
    slot.dotTo.position.copy(end);
    slot.dotFromMat.color.setHex(style.dot);
    slot.dotToMat.color.setHex(style.dot);
    slot.pulseMat.color.setHex(style.pulse);
    slot.trailMat.color.setHex(style.pulse);
    slot.markerPhase = Math.random() * Math.PI * 2;
    slot.markerSpeed = 3 + Math.random() * 3;
  }

  for (let i = 0; i < arcSlotCount; i += 1) {
    const style = THREAT_STYLES[i % THREAT_STYLES.length];
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    threatGroup.add(line);

    const pulseSize = options.isMobile ? 0.016 : 0.022;
    const pulseGeo = new THREE.SphereGeometry(pulseSize, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: style.pulse,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    threatGroup.add(pulse);

    const trailMat = pulseMat.clone();
    const trail = new THREE.Mesh(pulseGeo.clone(), trailMat);
    trail.scale.setScalar(0.65);
    threatGroup.add(trail);

    const dotGeo = new THREE.SphereGeometry(options.isMobile ? 0.012 : 0.016, 8, 8);
    const dotFromMat = new THREE.MeshBasicMaterial({
      color: style.dot,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dotToMat = dotFromMat.clone();
    const dotFrom = new THREE.Mesh(dotGeo, dotFromMat);
    const dotTo = new THREE.Mesh(dotGeo.clone(), dotToMat);
    threatGroup.add(dotFrom, dotTo);

    const slot = {
      line,
      lineMat,
      curve: null,
      pulse,
      pulseMat,
      trail,
      trailMat,
      dotFrom,
      dotTo,
      dotFromMat,
      dotToMat,
      style,
      speed: 0.2,
      baseOpacity: 0.6,
      life: 0,
      duration: 3,
      delay: i * 0.35,
      pulseT: Math.random(),
      markerPhase: Math.random() * Math.PI * 2,
      markerSpeed: 4,
    };
    assignRandomRoute(slot);
    threatArcs.push(slot);
  }

  let raf = 0;
  let targetProgress = 0;
  let displayProgress = 0;
  let entranceReveal = 1;
  let elapsed = 0;
  let lastFrameTime = 0;
  const scratch = new THREE.Vector3();

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function applyFrame(progress, time) {
    const assemblyStart = 0.14;
    const assemblyEnd = 0.82;
    const globalAssembly = easeInOutCubic(
      THREE.MathUtils.clamp((progress - assemblyStart) / (assemblyEnd - assemblyStart), 0, 1),
    );

    debrisGroup.scale.setScalar(1);

    const reveal = THREE.MathUtils.clamp(entranceReveal, 0, 1);

    const shellDoneProgress = assemblyStart + (assemblyEnd - assemblyStart) * 0.88;
    const particleFade = easeInOutCubic(
      THREE.MathUtils.clamp((progress - shellDoneProgress) / 0.1, 0, 1),
    );
    const earthReveal =
      easeInOutCubic(THREE.MathUtils.clamp((progress - (shellDoneProgress + 0.08)) / 0.1, 0, 1)) *
      reveal;

    particleGroup.visible = particleFade < 0.995;

    pieces.forEach((piece) => {
      const { mesh, scatter, globe, scatterRot, delay } = piece;
      const local = easeInOutCubic(
        THREE.MathUtils.clamp((globalAssembly - delay) / (1 - delay * 0.65), 0, 1),
      );

      const assembled = local >= 0.92;

      if (assembled) {
        mesh.position.copy(globe);
      } else {
        scratch.lerpVectors(scatter, globe, local);

        if (local < 0.28) {
          const driftFade = 1 - local / 0.28;
          scratch.x +=
            Math.sin(time * piece.driftSpd + piece.phaseX) * piece.driftAmp * driftFade;
          scratch.y +=
            Math.cos(time * piece.driftSpd * 0.85 + piece.phaseY) * piece.driftAmp * 0.75 * driftFade;
          scratch.z +=
            Math.sin(time * piece.driftSpd * 1.15 + piece.phaseZ) * piece.driftAmp * 0.85 * driftFade;
        }

        mesh.position.copy(scratch);
      }

      if (!assembled && local < 0.28) {
        const driftFade = 1 - local / 0.28;
        mesh.rotation.x =
          scatterRot.x + Math.sin(time * 0.45 + piece.phaseX) * 0.12 * driftFade;
        mesh.rotation.y =
          scatterRot.y + Math.cos(time * 0.38 + piece.phaseY) * 0.1 * driftFade;
        mesh.rotation.z = scatterRot.z + Math.sin(time * 0.32 + piece.phaseZ) * 0.08 * driftFade;
      } else if (!assembled) {
        mesh.rotation.x = THREE.MathUtils.lerp(scatterRot.x, 0, local);
        mesh.rotation.y = THREE.MathUtils.lerp(scatterRot.y, globe.y * 0.3, local);
        mesh.rotation.z = THREE.MathUtils.lerp(scatterRot.z, 0, local);
      }

      const shellBlend = THREE.MathUtils.clamp((local - 0.55) / 0.45, 0, 1);
      const pieceScale = THREE.MathUtils.lerp(1.15, 1.05, shellBlend);
      mesh.scale.setScalar(pieceScale);

      const mat = /** @type {THREE.MeshStandardMaterial} */ (mesh.material);
      const shellOpacity = THREE.MathUtils.lerp(1, 0.95, Math.max(0, (local - 0.75) / 0.25));
      const fadeWeight = smoothstep(0.5, 0.95, local);
      const opacity = shellOpacity * THREE.MathUtils.lerp(1, 1 - particleFade, fadeWeight) * reveal;
      mat.opacity = opacity;
      mat.depthWrite = opacity > 0.35;
      mat.visible = opacity > 0.02;
    });

    earthMat.opacity = earthReveal * 0.96;

    const arcReveal = easeInOutCubic(THREE.MathUtils.clamp((earthReveal - 0.12) / 0.88, 0, 1));
    const delta = lastFrameTime > 0 ? Math.min(0.05, time - lastFrameTime) : 0.016;

    threatArcs.forEach((slot) => {
      if (arcReveal < 0.02) {
        slot.lineMat.opacity = 0;
        slot.pulseMat.opacity = 0;
        slot.trailMat.opacity = 0;
        slot.dotFromMat.opacity = 0;
        slot.dotToMat.opacity = 0;
        return;
      }

      if (slot.delay > 0) {
        slot.delay -= delta;
        return;
      }

      slot.life += delta;
      if (slot.life >= slot.duration) {
        assignRandomRoute(slot);
        return;
      }

      const fadeIn = THREE.MathUtils.clamp(slot.life / 0.45, 0, 1);
      const fadeOut = THREE.MathUtils.clamp((slot.duration - slot.life) / 0.55, 0, 1);
      const slotFade = fadeIn * fadeOut;

      slot.pulseT = (slot.pulseT + delta * slot.speed) % 1;
      const trailT = (slot.pulseT - 0.12 + 1) % 1;
      slot.pulse.position.copy(slot.curve.getPoint(slot.pulseT));
      slot.trail.position.copy(slot.curve.getPoint(trailT));

      const vis = slotFade * arcReveal;
      slot.lineMat.opacity = slot.baseOpacity * vis;
      const pulseGlow = 0.65 + Math.sin(time * 8 + slot.markerPhase) * 0.3;
      slot.pulseMat.opacity = vis * pulseGlow;
      slot.trailMat.opacity = vis * pulseGlow * 0.42;
      slot.pulse.scale.setScalar(0.85 + Math.sin(time * 10 + slot.markerPhase) * 0.22);

      const dotPulse = 0.45 + Math.sin(time * slot.markerSpeed + slot.markerPhase) * 0.45;
      slot.dotFromMat.opacity = vis * dotPulse * 0.85;
      slot.dotToMat.opacity = vis * dotPulse * 0.85;
      const dotScale = 0.75 + Math.sin(time * (slot.markerSpeed + 1) + slot.markerPhase) * 0.28;
      slot.dotFrom.scale.setScalar(dotScale);
      slot.dotTo.scale.setScalar(dotScale * 1.1);
    });

    debrisGroup.rotation.y = progress * Math.PI * 1.4;
    debrisGroup.rotation.x = THREE.MathUtils.lerp(0.18, 0.08, globalAssembly);

    renderer.render(scene, camera);
  }

  function tick(now) {
    const time = now * 0.001;
    lastFrameTime = elapsed;
    elapsed = time;
    displayProgress += (targetProgress - displayProgress) * 0.16;
    if (Math.abs(targetProgress - displayProgress) < 0.0004) {
      displayProgress = targetProgress;
    }
    applyFrame(displayProgress, elapsed);
    raf = requestAnimationFrame(tick);
  }

  function setProgress(progress) {
    targetProgress = THREE.MathUtils.clamp(progress, 0, 1);
  }

  function setEntrance(value) {
    entranceReveal = THREE.MathUtils.clamp(value, 0, 1);
  }

  resize();
  raf = requestAnimationFrame(tick);

  return {
    setProgress,
    setEntrance,
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      pieces.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        /** @type {THREE.Material} */ (mesh.material).dispose();
      });
      earthGeo.dispose();
      earthMat.dispose();
      threatArcs.forEach((slot) => {
        slot.line.geometry.dispose();
        slot.lineMat.dispose();
        slot.pulse.geometry.dispose();
        slot.pulseMat.dispose();
        slot.trail.geometry.dispose();
        slot.trailMat.dispose();
        slot.dotFrom.geometry.dispose();
        slot.dotFromMat.dispose();
        slot.dotTo.geometry.dispose();
        slot.dotToMat.dispose();
      });
      renderer.dispose();
    },
  };
}
