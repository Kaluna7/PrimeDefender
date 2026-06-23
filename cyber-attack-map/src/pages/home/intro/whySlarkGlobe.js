import * as THREE from 'three';

const EARTH_TEXTURE =
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

function fibonacciSpherePoint(i, n, radius) {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ pieceCount?: number, isMobile?: boolean }} [options]
 */
export function createWhySlarkGlobe(canvas, options = {}) {
  const pieceCount = options.pieceCount ?? (options.isMobile ? 72 : 140);
  const radius = options.isMobile ? 1.05 : 1.25;

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

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight(0xc62828, 0.45);
  rim.position.set(-5, -2, -4);
  scene.add(key, rim);

  const debrisGroup = new THREE.Group();
  scene.add(debrisGroup);

  const palette = [0xc62828, 0x1f2937, 0x94a3b8, 0xb71c1c, 0x4b5563];
  const pieces = [];

  for (let i = 0; i < pieceCount; i += 1) {
    const size = 0.05 + Math.random() * 0.09;
    const geo =
      Math.random() > 0.5
        ? new THREE.TetrahedronGeometry(size, 0)
        : new THREE.BoxGeometry(size * 1.2, size * 0.8, size * 1.4);
    const mat = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length],
      metalness: 0.35,
      roughness: 0.45,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const globe = fibonacciSpherePoint(i, pieceCount, radius);
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
    debrisGroup.add(mesh);
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
      spinX: (Math.random() - 0.5) * 0.35,
      spinY: (Math.random() - 0.5) * 0.35,
    });
  }

  const earthGeo = new THREE.SphereGeometry(radius * 0.92, 48, 48);
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.15,
    roughness: 0.65,
    transparent: true,
    opacity: 0,
  });
  debrisGroup.add(new THREE.Mesh(earthGeo, earthMat));

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

  const glowGeo = new THREE.SphereGeometry(radius * 1.08, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xc62828,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  debrisGroup.add(new THREE.Mesh(glowGeo, glowMat));

  let raf = 0;
  let targetProgress = 0;
  let displayProgress = 0;
  let entranceReveal = 1;
  let elapsed = 0;
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

    const groupScale = THREE.MathUtils.lerp(1.12, 1, globalAssembly);
    debrisGroup.scale.setScalar(groupScale);

    const reveal = THREE.MathUtils.clamp(entranceReveal, 0, 1);

    pieces.forEach((piece) => {
      const { mesh, scatter, globe, scatterRot, delay } = piece;
      const local = easeInOutCubic(
        THREE.MathUtils.clamp((globalAssembly - delay) / (1 - delay * 0.65), 0, 1),
      );

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

      if (local < 0.28) {
        const driftFade = 1 - local / 0.28;
        mesh.rotation.x =
          scatterRot.x + Math.sin(time * 0.45 + piece.phaseX) * 0.12 * driftFade;
        mesh.rotation.y =
          scatterRot.y + Math.cos(time * 0.38 + piece.phaseY) * 0.1 * driftFade;
        mesh.rotation.z = scatterRot.z + Math.sin(time * 0.32 + piece.phaseZ) * 0.08 * driftFade;
      } else {
        mesh.rotation.x = THREE.MathUtils.lerp(scatterRot.x, 0, local);
        mesh.rotation.y = THREE.MathUtils.lerp(scatterRot.y, globe.y * 0.3, local);
        mesh.rotation.z = THREE.MathUtils.lerp(scatterRot.z, 0, local);
      }

      const pieceScale = THREE.MathUtils.lerp(1.25, 0.55, local);
      mesh.scale.setScalar(pieceScale);

      const mat = /** @type {THREE.MeshStandardMaterial} */ (mesh.material);
      let opacity = THREE.MathUtils.lerp(
        1,
        local > 0.88 ? 0.15 : 0.75,
        Math.max(0, (local - 0.7) / 0.3),
      );
      opacity *= reveal;
      mat.opacity = opacity;
      mat.transparent = opacity < 0.995;
    });

    const earthReveal =
      easeInOutCubic(THREE.MathUtils.clamp((progress - 0.68) / 0.22, 0, 1)) * reveal;
    earthMat.opacity = earthReveal * 0.95;
    glowMat.opacity = earthReveal * 0.12;

    debrisGroup.rotation.y = progress * Math.PI * 1.4;
    debrisGroup.rotation.x = THREE.MathUtils.lerp(0.18, 0.08, globalAssembly);

    renderer.render(scene, camera);
  }

  function tick(now) {
    elapsed = now * 0.001;
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
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();
    },
  };
}
