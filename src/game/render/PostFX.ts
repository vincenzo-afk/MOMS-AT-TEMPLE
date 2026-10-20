import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";

/**
 * Display grade after tone mapping: a gentle S-curve, slightly warm highlights and cool shadows, a touch of
 * saturation, and a soft vignette. Deliberately subtle (GTA V daylight, not a stylised filter).
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.22 },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.05 },
    uWarm: { value: 0.025 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette, uSaturation, uContrast, uWarm;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col += vec3(uWarm, uWarm * 0.4, -uWarm) * smoothstep(0.35, 1.0, l);   // warm highlights
      col += vec3(-uWarm * 0.6, 0.0, uWarm * 0.8) * (1.0 - smoothstep(0.0, 0.35, l)); // cool shadows
      vec2 d = vUv - 0.5;
      col *= 1.0 - uVignette * smoothstep(0.35, 0.85, length(d * vec2(1.15, 1.0)));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }
  `,
};

export type PostQuality = "low" | "medium" | "high";

/**
 * Post-processing chain: scene -> (optional GTAO) -> bloom -> tone map + sRGB -> grade/vignette -> SMAA.
 * "low" bypasses the composer entirely (direct render with the renderer's own tone mapping).
 */
export class PostFX {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private ao: GTAOPass;
  private smaa: SMAAPass;
  private grade: ShaderPass;
  private quality: PostQuality = "high";
  private aoEnabled = false;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
  ) {
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new GTAOPass(scene, camera, size.x, size.y);
    this.ao.blendIntensity = 0.55;
    this.ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.0 });
    this.ao.enabled = false;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.16, 0.45, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);
  }

  configure(quality: PostQuality, ambientOcclusion: boolean): void {
    this.quality = quality;
    this.aoEnabled = ambientOcclusion;
    this.ao.enabled = ambientOcclusion && quality !== "low";
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  /** Night lamps bloom more; daylight barely blooms (only the sun-lit brass and flames). */
  setBloom(strength: number): void {
    this.bloom.strength = strength;
  }

  render(dt: number): void {
    if (this.quality === "low") {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.composer.render(dt);
  }

  get passes(): { ao: boolean; bloom: boolean; smaa: boolean; grade: boolean } {
    const on = this.quality !== "low";
    return { ao: on && this.aoEnabled, bloom: on, smaa: on, grade: on };
  }
}
