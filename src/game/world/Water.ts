import * as THREE from "three";

/** Lightweight animated water: scrolling ripples + fresnel tint. Shared by every WATER_ mesh. */
export function createWaterMaterial(flowDir = new THREE.Vector2(1, 0)): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: flowDir },
      uDeep: { value: new THREE.Color(0x2d5b63) },
      uShallow: { value: new THREE.Color(0x6fa3a0) },
      uSky: { value: new THREE.Color(0xcfe3ea) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uFlow;
      uniform vec3 uDeep, uShallow, uSky;
      varying vec3 vWorld;
      varying vec3 vNormal;
      float wave(vec2 p) { return sin(p.x) * cos(p.y * 1.3) + sin(p.y * 0.7 + p.x * 0.4); }
      void main() {
        vec2 p = vWorld.xz * 3.0 - uFlow * uTime * 1.6;
        float r = wave(p) * 0.5 + wave(p * 2.3 + 1.7) * 0.25;
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(dot(V, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 3.0);
        vec3 c = mix(uDeep, uShallow, 0.5 + r * 0.25);
        c = mix(c, uSky, fres * 0.6);
        c += smoothstep(0.55, 0.75, r) * 0.12;
        gl_FragColor = vec4(c, 0.82);
        #include <colorspace_fragment>
      }`,
  });
}
