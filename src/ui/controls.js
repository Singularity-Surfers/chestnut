// First-person walking / free-fly camera. Mouse look (pointer lock), WASD, touch.
import * as THREE from 'three';
import { clamp } from '../core/rng.js';

export class Controls {
  constructor(camera, dom, world) {
    this.camera = camera; this.dom = dom; this.world = world;
    this.yaw = 0; this.pitch = 0;
    this.pos = new THREE.Vector3(0, 2, 0);
    this.vel = new THREE.Vector3();
    this.fly = false;
    this.eye = 1.68;
    this.keys = new Set();
    this.enabled = true;
    this.bob = 0;
    this.touchMove = new THREE.Vector2();
    this.onToggle = null;
    this.colliders = null; // fn(x,z) -> [pushX, pushZ]
    this._bind();
  }

  _bind() {
    const d = this.dom;
    d.addEventListener('click', () => { if (this.enabled && !this._touch) d.requestPointerLock?.(); });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== d) return;
      this.yaw -= e.movementX * 0.0021;
      this.pitch = clamp(this.pitch - e.movementY * 0.0021, -1.5, 1.5);
    });
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      this.keys.add(e.code);
      if (e.code === 'KeyF') { this.fly = !this.fly; this.onToggle?.(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    // touch: left half = move stick, right half = look
    const touches = new Map();
    d.addEventListener('touchstart', (e) => {
      this._touch = true;
      for (const t of e.changedTouches) touches.set(t.identifier, { x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, left: t.clientX < window.innerWidth * 0.4 });
      e.preventDefault();
    }, { passive: false });
    d.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const s = touches.get(t.identifier);
        if (!s) continue;
        if (s.left) {
          this.touchMove.set(clamp((t.clientX - s.x0) / 60, -1, 1), clamp((t.clientY - s.y0) / 60, -1, 1));
        } else {
          this.yaw -= (t.clientX - s.x) * 0.005;
          this.pitch = clamp(this.pitch - (t.clientY - s.y) * 0.005, -1.5, 1.5);
        }
        s.x = t.clientX; s.y = t.clientY;
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        const s = touches.get(t.identifier);
        if (s?.left) this.touchMove.set(0, 0);
        touches.delete(t.identifier);
      }
    };
    d.addEventListener('touchend', end);
    d.addEventListener('touchcancel', end);
  }

  set(x, y, z, yaw, pitch) {
    this.pos.set(x, y, z); this.yaw = yaw; this.pitch = pitch; this.vel.set(0, 0, 0);
    this.apply();
  }

  apply() {
    const c = this.camera;
    c.position.copy(this.pos);
    c.rotation.set(0, 0, 0);
    c.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    c.updateMatrixWorld(true);
  }

  update(dt) {
    const k = this.keys;
    const run = k.has('ShiftLeft') || k.has('ShiftRight');
    let fx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.touchMove.x;
    let fz = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) + this.touchMove.y;
    const fy = (k.has('KeyE') || k.has('Space') ? 1 : 0) - (k.has('KeyQ') || k.has('KeyC') ? 1 : 0);
    const sp = this.fly ? (run ? 34 : 9) : (run ? 5.2 : 1.9);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const want = new THREE.Vector3(fx * cy + fz * sy, 0, -fx * sy + fz * cy);
    if (this.fly) {
      const cp = Math.cos(this.pitch), spi = Math.sin(this.pitch);
      want.set(fx * cy + fz * sy * cp, -fz * spi + fy, -fx * sy + fz * cy * cp);
    }
    if (want.lengthSq() > 1) want.normalize();
    want.multiplyScalar(sp);
    const a = 1 - Math.exp(-dt * (this.fly ? 5 : 9));
    this.vel.lerp(want, a);
    this.pos.addScaledVector(this.vel, dt);
    const lim = this.world.limit;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    this.pos.z = clamp(this.pos.z, -lim, lim);
    const ground = this.world.heightAt(this.pos.x, this.pos.z);
    if (this.fly) {
      this.pos.y = Math.max(this.pos.y, ground + 0.35);
    } else {
      if (this.colliders) {
        const p = this.colliders(this.pos.x, this.pos.z);
        this.pos.x += p[0]; this.pos.z += p[1];
      }
      const speed = Math.hypot(this.vel.x, this.vel.z);
      this.bob += dt * speed * 3.4;
      const bobY = Math.sin(this.bob) * 0.022 * Math.min(1, speed / 1.5);
      const target = this.world.heightAt(this.pos.x, this.pos.z) + this.eye + bobY;
      this.pos.y += (target - this.pos.y) * (1 - Math.exp(-dt * 14));
    }
    this.apply();
  }
}
