// Two sun shadow maps: a static whole-world map (soft canopy shade, god rays) and a
// camera-following near map (crisp contact shadows from ferns, rocks, low branches).
import * as THREE from 'three';
import { G, WORLD } from '../core/engine.js';

export const LAYER_NEAR = 1;
export const LAYER_FAR = 2;

function makeTarget(size) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
  });
  rt.depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
  rt.depthTexture.minFilter = THREE.NearestFilter;
  rt.depthTexture.magFilter = THREE.NearestFilter;
  return rt;
}

export class Shadows {
  constructor() {
    const q = G.quality;
    this.nearSize = q.shadowNear;
    this.farSize = q.shadowFar;
    this.near = makeTarget(this.nearSize);
    this.far = makeTarget(this.farSize);
    this.nearCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.farCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    this.nearCam.layers.set(LAYER_NEAR);
    this.farCam.layers.set(LAYER_FAR);
    this.nearExtent = 46;   // metres across
    this.nearDepth = 240;
    this.farDirty = true;
    this.lastFarDir = new THREE.Vector3();
    this.lastFarTime = -1e9;
    this.worldMaxY = 110;
    this._m = new THREE.Matrix4();
    this._v = new THREE.Vector3();
    G.uniforms.uShadowNear.value = this.near.depthTexture;
    G.uniforms.uShadowFar.value = this.far.depthTexture;
  }

  _basis(dir) {
    // light-space basis (right, up, forward=-dir)
    const up = Math.abs(dir.y) > 0.98 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const z = dir.clone().normalize();
    const x = new THREE.Vector3().crossVectors(up, z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    return { x, y, z };
  }

  _fitFar(dir) {
    const { x, y, z } = this._basis(dir);
    const h = WORLD / 2 + 4;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const cx of [-h, h]) for (const cy of [-4, this.worldMaxY]) for (const cz of [-h, h]) {
      this._v.set(cx, cy, cz);
      const px = this._v.dot(x), py = this._v.dot(y), pz = this._v.dot(z);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz);
    }
    const cam = this.farCam;
    const cxw = (minX + maxX) / 2, cyw = (minY + maxY) / 2;
    cam.position.copy(x.clone().multiplyScalar(cxw)).add(y.clone().multiplyScalar(cyw)).add(z.clone().multiplyScalar(maxZ + 5));
    cam.up.copy(y);
    cam.lookAt(cam.position.clone().sub(z));
    // square frustum keeps texels isotropic
    const half = Math.max(maxX - minX, maxY - minY) / 2;
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    cam.near = 0.5; cam.far = maxZ - minZ + 10;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    G.uniforms.uShadowFarMat.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    G.uniforms.uShadowFarInfo.value.set(1 / (half * 2), cam.far - cam.near, 1 / this.farSize, 1);
  }

  _fitNear(dir, camera) {
    const { x, y, z } = this._basis(dir);
    const ext = this.nearExtent;
    // centre slightly ahead of the viewer
    const fwd = this._v.set(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0;
    if (fwd.lengthSq() > 1e-6) fwd.normalize();
    const c = camera.position.clone().addScaledVector(fwd, ext * 0.30);
    // snap to texel grid in light space
    const texel = ext / this.nearSize;
    let px = c.dot(x), py = c.dot(y);
    const pz = c.dot(z);
    px = Math.round(px / texel) * texel; py = Math.round(py / texel) * texel;
    const cam = this.nearCam;
    cam.position.copy(x.clone().multiplyScalar(px)).add(y.clone().multiplyScalar(py)).add(z.clone().multiplyScalar(pz + this.nearDepth * 0.82));
    cam.up.copy(y);
    cam.lookAt(cam.position.clone().sub(z));
    cam.left = -ext / 2; cam.right = ext / 2; cam.top = ext / 2; cam.bottom = -ext / 2;
    cam.near = 0.5; cam.far = this.nearDepth;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    G.uniforms.uShadowNearMat.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    G.uniforms.uShadowNearInfo.value.set(1 / ext, cam.far - cam.near, 1 / this.nearSize, 1);
  }

  _renderPass(target, cam, list) {
    const r = G.renderer;
    const saved = [];
    for (const c of list) {
      saved.push(c.mesh.material);
      c.mesh.material = c.depthMat;
    }
    r.setRenderTarget(target);
    r.setClearColor(0xffffff, 1);
    r.clear(true, true, false);
    r.render(G.scene, cam);
    for (let i = 0; i < list.length; i++) list[i].mesh.material = saved[i];
  }

  update(camera, time, force = false) {
    const dir = G.uniforms.uSunDir.value;
    const moved = this.lastFarDir.distanceTo(dir) > 0.004;
    const stale = time - this.lastFarTime > 0.2;
    if (force || this.farDirty || (moved && stale)) {
      this._fitFar(dir);
      this._renderPass(this.far, this.farCam, G.farCasters);
      this.lastFarDir.copy(dir);
      this.lastFarTime = time;
      this.farDirty = false;
    }
    this._fitNear(dir, camera);
    this._renderPass(this.near, this.nearCam, G.casters);
  }
}
