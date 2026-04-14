import * as THREE from 'three';

/** Sama dengan monitor di `HomeInteractiveHero` — skala grup world-space. */
export const MONITOR_BASE_SCALE = 1.15;
/** Pengali ukuran mesh buku vs pembanding monitor (lebih besar dari konsol). */
export const BOOK_MESH_SCALE_BOOST = 1.26;
/** Pengali ukuran mesh cash vs pembanding monitor. */
export const CASH_MESH_SCALE_BOOST = 1.2;

/** Buku “tutup” (tebal samping menghadap). */
export const BOOK_CLOSED_EULER = /** @type {const} */ ([0, 1.35, 0]);
/** Buku “terbuka” / menghadap kamera (setelah klik buku 3D). */
export const BOOK_OPEN_EULER = /** @type {const} */ ([0, -0.1, 0]);

/** @param {THREE.Object3D} obj */
export function maxBoundingDim(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const s = box.getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z, 1e-6);
}

/**
 * `Object3D.clone()` menyalin mesh dengan **referensi material yang sama** ke cache GLTF (useGLTF).
 * Tanpa ini, `prepareBookMaterials` / `collectEmissiveMaterials` memutasi material aset → efek menumpuk
 * setiap ganti carousel (warna meredup, metalness berubah, dll.).
 * @param {THREE.Object3D} root
 */
export function cloneMeshMaterialsDeep(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) {
      o.material = o.material.map((mat) =>
        mat && typeof mat.clone === 'function' ? mat.clone() : mat,
      );
    } else if (o.material && typeof o.material.clone === 'function') {
      o.material = o.material.clone();
    }
  });
}

/** @param {THREE.Object3D} root */
export function prepareBookMaterials(root) {
  root.updateMatrixWorld(true);
  const cyan = new THREE.Color('#22d3ee');
  const tint = new THREE.Color('#a5f3fc');
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;
      if ('side' in m) m.side = THREE.DoubleSide;
      if (m.emissive && typeof m.emissive.set === 'function') {
        m.emissive.copy(cyan);
      }
      if ('emissiveIntensity' in m) {
        m.emissiveIntensity = 0.68;
      }
      if ('color' in m && m.color && typeof m.color.lerp === 'function') {
        m.color.lerp(tint, 0.28);
      }
      if ('metalness' in m && typeof m.metalness === 'number') {
        m.metalness = THREE.MathUtils.clamp(m.metalness + 0.12, 0, 1);
      }
      if ('roughness' in m && typeof m.roughness === 'number') {
        m.roughness = THREE.MathUtils.clamp(m.roughness - 0.12, 0.08, 1);
      }
    });
  });
}

/**
 * Clone buku diskalakan agar max bounding dimension = monitor (sebelum grup MONITOR_BASE_SCALE).
 * @param {THREE.Object3D} bookScene
 * @param {THREE.Object3D} monitorScene
 */
export function cloneBookToMonitorSize(bookScene, monitorScene) {
  const c = bookScene.clone();
  cloneMeshMaterialsDeep(c);
  prepareBookMaterials(c);
  c.updateMatrixWorld(true);
  const m = monitorScene.clone();
  m.updateMatrixWorld(true);
  const mDim = maxBoundingDim(m);
  const bDim = maxBoundingDim(c);
  c.scale.multiplyScalar((mDim / bDim) * BOOK_MESH_SCALE_BOOST);
  c.updateMatrixWorld(true);
  return c;
}

/**
 * Cash: tanpa ubah warna/material dari file — hanya supaya mesh tidak di-frustum-cull
 * saat diskalakan (sama ide dengan mesh lain di scene).
 * @param {THREE.Object3D} root
 */
export function prepareCashMaterials(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
  });
}

/**
 * Clone cash diskalakan ke proporsi monitor (sama pola dengan buku).
 * @param {THREE.Object3D} cashScene
 * @param {THREE.Object3D} monitorScene
 */
export function cloneCashToMonitorSize(cashScene, monitorScene) {
  const c = cashScene.clone();
  cloneMeshMaterialsDeep(c);
  prepareCashMaterials(c);
  c.updateMatrixWorld(true);
  const m = monitorScene.clone();
  m.updateMatrixWorld(true);
  const mDim = maxBoundingDim(m);
  const bDim = maxBoundingDim(c);
  c.scale.multiplyScalar((mDim / bDim) * CASH_MESH_SCALE_BOOST);
  c.updateMatrixWorld(true);
  return c;
}
