import * as THREE from "three";
import { ENV_UNIFORMS } from "./DetailMaterials";
import type { Weather } from "./weather";

const RAIN_DROPS = 2600;
const RAIN_BOX = 36;
const MOTES = 260;
const FIREFLIES = 120;

/**
 * Weather and ambient particles around the camera: rain streaks, sunlit dust motes by day, fireflies at night.
 * All counts are fixed (bounded cost); particles wrap around the camera instead of being spawned.
 */
export class Atmosphere {
  readonly group = new THREE.Group();
  private rain: THREE.LineSegments;
  private rainPos: Float32Array;
  private motes: THREE.Points;
  private motePos: Float32Array;
  private flies: THREE.Points;
  private flyPos: Float32Array;
  private flyPhase: Float32Array;
  private t = 0;

  constructor() {
    this.group.name = "Atmosphere";
    // ---- rain: short line segments falling and wrapping inside a box around the camera
    this.rainPos = new Float32Array(RAIN_DROPS * 6);
    for (let i = 0; i < RAIN_DROPS; i++) this.resetDrop(i, new THREE.Vector3(), true);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xbfd2e0, transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    // ---- dust motes
    this.motePos = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) this.motePos.set([(Math.random() - 0.5) * 24, Math.random() * 6, (Math.random() - 0.5) * 24], i * 3);
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.BufferAttribute(this.motePos, 3));
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xfff1d0, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false }));
    this.motes.frustumCulled = false;
    // ---- fireflies
    this.flyPos = new Float32Array(FIREFLIES * 3);
    this.flyPhase = new Float32Array(FIREFLIES);
    for (let i = 0; i < FIREFLIES; i++) {
      this.flyPos.set([(Math.random() - 0.5) * 50, 0.4 + Math.random() * 2.2, (Math.random() - 0.5) * 50], i * 3);
      this.flyPhase[i] = Math.random() * 10;
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(this.flyPos, 3));
    this.flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd9ff8a, size: 0.12, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.flies.frustumCulled = false;
    this.group.add(this.rain, this.motes, this.flies);
  }

  private resetDrop(i: number, center: THREE.Vector3, anyHeight: boolean): void {
    const x = center.x + (Math.random() - 0.5) * RAIN_BOX;
    const z = center.z + (Math.random() - 0.5) * RAIN_BOX;
    const y = center.y + (anyHeight ? Math.random() * 20 - 4 : 16 + Math.random() * 4);
    this.rainPos.set([x, y, z, x + 0.05, y - 0.55, z + 0.02], i * 6);
  }

  /** `day` 0..1 daylight, `indoors` hides rain streaks under a ceiling. */
  update(dt: number, camera: THREE.Camera, weather: Weather, day: number, indoors: boolean): void {
    this.t += dt;
    ENV_UNIFORMS.tomTime.value = this.t;
    ENV_UNIFORMS.tomWind.value = 0.25 + weather.wind * 0.9;
    // wetness builds while it rains and dries slowly afterwards
    const wetTarget = weather.rain;
    ENV_UNIFORMS.tomWet.value += (wetTarget - ENV_UNIFORMS.tomWet.value) * Math.min(1, dt * (wetTarget > ENV_UNIFORMS.tomWet.value ? 0.4 : 0.05));
    const c = camera.position;

    // rain
    const rainOn = weather.rain > 0.02;
    this.rain.visible = rainOn && !indoors;
    const rm = this.rain.material as THREE.LineBasicMaterial;
    rm.opacity = 0.55 * weather.rain;
    if (this.rain.visible) {
      const fall = 18 * dt;
      const drift = weather.wind * 2.5 * dt;
      for (let i = 0; i < RAIN_DROPS; i++) {
        const o = i * 6;
        this.rainPos[o + 1]! -= fall;
        this.rainPos[o + 4]! -= fall;
        this.rainPos[o]! += drift;
        this.rainPos[o + 3]! += drift;
        const dx = this.rainPos[o]! - c.x;
        const dz = this.rainPos[o + 2]! - c.z;
        if (this.rainPos[o + 4]! < c.y - 6 || Math.abs(dx) > RAIN_BOX / 2 || Math.abs(dz) > RAIN_BOX / 2) this.resetDrop(i, c, false);
      }
      (this.rain.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    }

    // dust motes drift lazily in daylight, following the camera
    const mm = this.motes.material as THREE.PointsMaterial;
    mm.opacity = 0.35 * day * (1 - weather.rain) * (indoors ? 1.4 : 1);
    for (let i = 0; i < MOTES; i++) {
      const o = i * 3;
      this.motePos[o]! += Math.sin(this.t * 0.3 + i) * 0.05 * dt;
      this.motePos[o + 1]! += Math.cos(this.t * 0.2 + i * 1.3) * 0.04 * dt;
      this.motePos[o + 2]! += Math.sin(this.t * 0.25 + i * 0.7) * 0.05 * dt;
    }
    this.motes.position.set(c.x, Math.max(0, c.y - 3), c.z);
    (this.motes.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    // fireflies at night, not in rain
    const fm = this.flies.material as THREE.PointsMaterial;
    fm.opacity = THREE.MathUtils.clamp(1 - day * 2.5, 0, 1) * (1 - weather.rain) * 0.9;
    if (fm.opacity > 0.01) {
      for (let i = 0; i < FIREFLIES; i++) {
        const o = i * 3;
        const ph = this.flyPhase[i]!;
        this.flyPos[o]! += Math.sin(this.t * 0.7 + ph) * 0.3 * dt;
        this.flyPos[o + 1]! = 0.5 + Math.abs(Math.sin(this.t * 0.4 + ph)) * 2;
        this.flyPos[o + 2]! += Math.cos(this.t * 0.6 + ph * 1.7) * 0.3 * dt;
      }
      this.flies.position.set(Math.round(c.x / 10) * 10, 0, Math.round(c.z / 10) * 10);
      (this.flies.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      fm.size = 0.1 + Math.sin(this.t * 6) * 0.03;
    }
  }
}

/** Subtle ground ring under the current interaction target (non-intrusive highlight). */
export class TargetRing {
  readonly mesh: THREE.Mesh;
  private t = 0;
  constructor() {
    const geo = new THREE.RingGeometry(0.55, 0.66, 40);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: 0, depthWrite: false }));
    this.mesh.renderOrder = 3;
    this.mesh.name = "TargetRing";
  }
  update(dt: number, target: THREE.Vector3 | null, groundY: number, enabledColor: boolean, show: boolean): void {
    this.t += dt;
    const m = this.mesh.material as THREE.MeshBasicMaterial;
    const want = target && show ? 0.55 + Math.sin(this.t * 4) * 0.15 : 0;
    m.opacity += (want - m.opacity) * Math.min(1, dt * 10);
    m.color.setHex(enabledColor ? 0xf0c27a : 0xe08a6b);
    if (target) this.mesh.position.set(target.x, groundY + 0.04, target.z);
    this.mesh.visible = m.opacity > 0.02;
  }
}

/** DOM speech bubbles for NPC barks, positioned over heads each frame. */
export class Bubbles {
  private root: HTMLDivElement;
  private items: Array<{ el: HTMLDivElement; target: () => THREE.Vector3; until: number }> = [];
  private clock = 0;
  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "bubbles";
    this.root.setAttribute("aria-live", "polite");
    parent.appendChild(this.root);
  }
  show(text: string, speaker: string, target: () => THREE.Vector3): void {
    // one bubble per speaker
    const existing = this.items.find((i) => i.el.dataset.speaker === speaker);
    if (existing) {
      existing.el.textContent = text;
      existing.until = this.clock + 3.5;
      return;
    }
    const el = document.createElement("div");
    el.className = "bubble";
    el.dataset.speaker = speaker;
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push({ el, target, until: this.clock + 3.5 });
  }
  update(dt: number, camera: THREE.PerspectiveCamera, width: number, height: number): void {
    this.clock += dt;
    const v = new THREE.Vector3();
    this.items = this.items.filter((i) => {
      if (this.clock > i.until) {
        i.el.remove();
        return false;
      }
      v.copy(i.target()).add(new THREE.Vector3(0, 1.95, 0));
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      const visible = v.z < 1 && dist < 30 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      i.el.style.display = visible ? "block" : "none";
      if (visible) {
        i.el.style.transform = `translate(${((v.x + 1) / 2) * width}px, ${((1 - v.y) / 2) * height}px) translate(-50%, -100%)`;
        i.el.style.opacity = String(Math.min(1, (i.until - this.clock) * 2));
      }
      return true;
    });
  }
  clear(): void {
    for (const i of this.items) i.el.remove();
    this.items = [];
  }
  get count(): number {
    return this.items.length;
  }
}
