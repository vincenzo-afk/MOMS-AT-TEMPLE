import * as THREE from "three";
import { ENV_UNIFORMS } from "./DetailMaterials";
import type { Weather } from "./weather";

const RAIN_DROPS = 2600;
const RAIN_BOX = 36;
const MOTES = 260;
const FIREFLIES = 120;
const PUFFS = 96;
const LEAVES = 70;
const LEAF_BOX = 30;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

/**
 * Weather and ambient particles around the camera: rain streaks, sunlit dust motes by day, fireflies at night,
 * and dry leaves (neem and palm leaflets) drifting down and tumbling with the wind.
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
  // dust puffs on hard landings: a small pool of particles with velocities and ages
  private puffs: THREE.Points;
  private puffPos: Float32Array;
  private puffVel: Float32Array;
  private puffAge: Float32Array;
  private puffNext = 0;
  // drifting leaves: instanced quads with position, velocity, spin and a short rest on the ground
  private leaves: THREE.InstancedMesh;
  private leafPos = new Float32Array(LEAVES * 3);
  private leafSpin = new Float32Array(LEAVES * 3);
  private leafRest = new Float32Array(LEAVES);
  /** leaves that touched the ground so far (diagnostics and tests) */
  leafLandings = 0;

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
    // ---- landing dust
    this.puffPos = new Float32Array(PUFFS * 3).fill(-999);
    this.puffVel = new Float32Array(PUFFS * 3);
    this.puffAge = new Float32Array(PUFFS).fill(99);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.puffPos, 3));
    this.puffs = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xc9b38f, size: 0.16, transparent: true, opacity: 0.55, depthWrite: false }));
    this.puffs.frustumCulled = false;
    // ---- leaves: a slightly cupped diamond, double-sided; colours from fresh green to dry brown
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.07, 0.025, 0.006, 0, 0, 0, 0.07, -0.025, 0.006, 0], 3));
    lg.setIndex([0, 1, 2, 0, 2, 3]);
    lg.computeVertexNormals();
    this.leaves = new THREE.InstancedMesh(lg, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), LEAVES);
    this.leaves.name = "Leaves";
    this.leaves.frustumCulled = false;
    const tint = [0x7f8f3a, 0xa08c3c, 0x8a5f2a, 0xb59a52, 0x6d7d32];
    const col = new THREE.Color();
    for (let i = 0; i < LEAVES; i++) {
      this.leaves.setColorAt(i, col.setHex(tint[i % tint.length]!));
      this.leafPos.set([(Math.random() - 0.5) * LEAF_BOX, Math.random() * 9, (Math.random() - 0.5) * LEAF_BOX], i * 3);
      this.leafSpin.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], i * 3);
    }
    this.group.add(this.rain, this.motes, this.flies, this.puffs, this.leaves);
  }

  /** A ring of dust at a landing point; strength 0..1 scales the count and spread. */
  puff(at: THREE.Vector3, strength: number): void {
    const n = Math.round(10 + 26 * strength);
    for (let k = 0; k < n; k++) {
      const i = this.puffNext;
      this.puffNext = (this.puffNext + 1) % PUFFS;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 1.4) * (0.5 + strength);
      this.puffPos.set([at.x + Math.cos(a) * 0.15, at.y + 0.05, at.z + Math.sin(a) * 0.15], i * 3);
      this.puffVel.set([Math.cos(a) * sp, 0.3 + Math.random() * 0.6 * strength, Math.sin(a) * sp], i * 3);
      this.puffAge[i] = 0;
    }
  }

  private updatePuffs(dt: number): void {
    let live = false;
    for (let i = 0; i < PUFFS; i++) {
      if (this.puffAge[i]! > 1.2) continue;
      live = true;
      this.puffAge[i]! += dt;
      const drag = Math.exp(-3 * dt);
      for (let k = 0; k < 3; k++) {
        this.puffVel[i * 3 + k]! *= drag;
        this.puffPos[i * 3 + k]! += this.puffVel[i * 3 + k]! * dt;
      }
      if (this.puffAge[i]! > 1.2) this.puffPos[i * 3 + 1] = -999;
    }
    this.puffs.visible = live;
    if (live) (this.puffs.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Leaves fall slowly (about 0.6 m/s), flutter side to side, drift downwind and tumble; on landing they lie
   * still for a moment, then a new leaf starts high up somewhere around the camera. Positions are relative
   * to the camera's ground point, so the pool always surrounds the player. Fewer fall in rain or under a roof.
   */
  private updateLeaves(dt: number, c: THREE.Vector3, weather: Weather, indoors: boolean, groundY: number): void {
    const active = indoors ? 0 : 1 - weather.rain * 0.7;
    this.leaves.visible = active > 0.05;
    if (!this.leaves.visible) return;
    const wind = 0.3 + weather.wind * 1.6;
    const ground = groundY;
    for (let i = 0; i < LEAVES; i++) {
      const o = i * 3;
      if (this.leafRest[i]! > 0) {
        this.leafRest[i]! -= dt;
        if (this.leafRest[i]! <= 0) this.leafPos.set([(Math.random() - 0.5) * LEAF_BOX, 7 + Math.random() * 4, (Math.random() - 0.5) * LEAF_BOX], o);
      } else {
        const ph = i * 1.7 + this.t;
        this.leafPos[o]! += (wind + Math.sin(ph * 1.3) * 0.5) * dt;
        this.leafPos[o + 1]! -= (0.45 + Math.abs(Math.sin(ph * 2.1)) * 0.35) * dt;
        this.leafPos[o + 2]! += Math.cos(ph * 0.9) * 0.4 * dt;
        this.leafSpin[o]! += dt * (2 + (i % 3));
        this.leafSpin[o + 1]! += dt * 0.7;
        this.leafSpin[o + 2]! += dt * (1.5 + (i % 2));
        if (this.leafPos[o + 1]! <= 0.02) {
          this.leafPos[o + 1] = 0.02;
          this.leafRest[i] = 2 + Math.random() * 4;
          this.leafLandings++;
        }
        // wrap horizontally inside the box around the camera
        if (this.leafPos[o]! > LEAF_BOX / 2) this.leafPos[o]! -= LEAF_BOX;
        else if (this.leafPos[o]! < -LEAF_BOX / 2) this.leafPos[o]! += LEAF_BOX;
        if (this.leafPos[o + 2]! > LEAF_BOX / 2) this.leafPos[o + 2]! -= LEAF_BOX;
        else if (this.leafPos[o + 2]! < -LEAF_BOX / 2) this.leafPos[o + 2]! += LEAF_BOX;
      }
      const lying = this.leafRest[i]! > 0;
      _e.set(lying ? 0.06 : this.leafSpin[o]!, this.leafSpin[o + 1]!, lying ? 0 : this.leafSpin[o + 2]!); // the quad lies in XZ: flat on the ground
      _q.setFromEuler(_e);
      _p.set(c.x + this.leafPos[o]!, ground + this.leafPos[o + 1]!, c.z + this.leafPos[o + 2]!);
      _s.setScalar(i < LEAVES * active ? 1.6 : 0);
      this.leaves.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    this.leaves.instanceMatrix.needsUpdate = true;
  }

  private resetDrop(i: number, center: THREE.Vector3, anyHeight: boolean): void {
    const x = center.x + (Math.random() - 0.5) * RAIN_BOX;
    const z = center.z + (Math.random() - 0.5) * RAIN_BOX;
    const y = center.y + (anyHeight ? Math.random() * 20 - 4 : 16 + Math.random() * 4);
    this.rainPos.set([x, y, z, x + 0.05, y - 0.55, z + 0.02], i * 6);
  }

  /** `day` 0..1 daylight, `indoors` hides rain streaks under a ceiling. */
  update(dt: number, camera: THREE.Camera, weather: Weather, day: number, indoors: boolean, groundY = 0): void {
    this.t += dt;
    ENV_UNIFORMS.tomTime.value = this.t;
    this.updatePuffs(dt);
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

    this.updateLeaves(dt, c, weather, indoors, groundY);

    // fireflies at night, not in rain
    const fm = this.flies.material as THREE.PointsMaterial;
    fm.opacity = THREE.MathUtils.clamp(1 - day * 2.5, 0, 1) * (1 - weather.rain) * 0.9;
    if (fm.opacity > 0.01) {
      for (let i = 0; i < FIREFLIES; i++) {
        const o = i * 3;
        const ph = this.flyPhase[i]!;
        this.flyPos[o]! += Math.sin(this.t * 0.7 + ph) * 0.3 * dt;
        this.flyPos[o + 1] = 0.5 + Math.abs(Math.sin(this.t * 0.4 + ph)) * 2;
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
