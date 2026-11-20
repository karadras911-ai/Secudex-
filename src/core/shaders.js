import * as THREE from 'three';

export const CinemaOpticsShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uChroma: { value: 0 },
    uVignette: { value: 0.10 },
    uGrain: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uChroma;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float distSq = dot(dir, dir);
      vec4 base = texture2D(tDiffuse, vUv);
      vec3 col = base.rgb;
      if (uChroma > 0.00001) {
        vec2 shift = dir * (uChroma * distSq * 2.4);
        col.r = texture2D(tDiffuse, vUv - shift).r;
        col.b = texture2D(tDiffuse, vUv + shift).b;
      }

      float vig = 1.0 - smoothstep(0.28, 0.88, distSq) * uVignette;
      col *= vig;

      if (uGrain > 0.00001) {
        float noise = fract(sin(dot(vUv * 1024.0 + fract(uTime) * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (noise - 0.5) * uGrain;
      }
      gl_FragColor = vec4(max(col, 0.0), base.a);
    }
  `,
};

export function createVolumetricBeamMat(colorHex, power, opacity, useMap, speed, polarPlasmaTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uPower: { value: power },
      uOpacity: { value: opacity },
      uUseMap: { value: useMap ? 1.0 : 0.0 },
      uMap: { value: polarPlasmaTex },
      uTime: { value: 0.0 },
      uSpeed: { value: speed },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uOpacity;
      uniform float uUseMap;
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float fresnel = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float edge = pow(fresnel, uPower);
        float endFade = smoothstep(0.0, 0.025, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float streak = uUseMap > 0.5
          ? (0.38 + 0.62 * texture2D(uMap, vec2(vUv.x * 2.0, vUv.y * 6.0 - uTime * uSpeed)).r)
          : 1.0;
        float alpha = edge * endFade * streak * uOpacity;
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
}

export function createTransferPlasmaMat(colorHex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.35);
        float endFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
        float wave1 = pow(0.5 + 0.5 * sin((vUv.x * 3.4 - uTime * 2.6) * 6.28318), 4.0);
        float wave2 = pow(0.5 + 0.5 * sin((vUv.x * 7.0 - uTime * 4.1 + 1.4) * 6.28318), 6.0);
        float coreLine = 0.24 + wave1 * 0.95 + wave2 * 0.65;
        vec3 col = mix(uColor, vec3(0.92, 0.98, 1.0), clamp(wave1 * 0.65 + wave2 * 0.45, 0.0, 1.0));
        float alpha = fresnel * endFade * coreLine * uOpacity;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createGpuCloudMat(cloudOrbTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPullProgress: { value: 0 },
      uTime: { value: 0 },
      uPointSize: { value: 120.0 },
      uOriginMatrix: { value: new THREE.Matrix4() },
      uPortalPos: { value: new THREE.Vector3(-2.15, 0.1, 0.06) },
      uVaultPos: { value: new THREE.Vector3(-4.0, -0.5, 0.0) },
      uMap: { value: cloudOrbTex },
    },
    vertexShader: `
      attribute vec4 aSeed;
      attribute vec3 aColor;
      uniform float uPullProgress;
      uniform float uTime;
      uniform float uPointSize;
      uniform mat4 uOriginMatrix;
      uniform vec3 uPortalPos;
      uniform vec3 uVaultPos;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        float foldP = clamp(uPullProgress / 0.38, 0.0, 1.0);
        float wingEase = smoothstep(0.0, 0.62, foldP);
        float compactEase = smoothstep(0.42, 1.0, foldP);
        float glideP = clamp((uPullProgress - 0.32) / 0.68, 0.0, 1.0);

        float delay = aSeed.z * 0.68;
        float u = clamp((glideP - delay * 0.44) / max(0.001, 1.0 - delay * 0.44), 0.0, 1.0);
        float ue = u * u * (3.0 - 2.0 * u);
        float um = 1.0 - ue;

        vec3 localOrigin = vec3(
          position.x * (1.0 - wingEase * 0.62),
          position.y * (1.0 - compactEase * 0.72),
          position.z + sin(u * 3.14159) * 0.12
        );
        vec3 p0 = (uOriginMatrix * vec4(localOrigin, 1.0)).xyz;
        vec3 p1 = uPortalPos + vec3(
          cos(ue * 4.5 + aSeed.x * 6.2831) * 0.20,
          aSeed.w * 0.28 + sin(uTime * 3.0 + aSeed.y * 12.0) * 0.05,
          sin(ue * 5.2 + aSeed.y * 6.2831) * 0.22
        );
        vec3 pos = um * um * p0 + 2.0 * um * ue * p1 + ue * ue * uVaultPos;

        vAlpha = sin(clamp(uPullProgress, 0.0, 1.0) * 3.14159) * smoothstep(0.0, 0.06, uPullProgress) * (1.0 - smoothstep(0.84, 1.0, ue));
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = clamp((uPointSize * aSeed.y) / max(1.0, -mvPosition.z), 3.2, 18.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        if (tex.a < 0.04 || vAlpha < 0.01) discard;
        gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha * 0.95);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createCubeGlassMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(0xc4b5fd) },
      uRimColor: { value: new THREE.Color(0x38bdf8) },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uRimColor;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float fresnel = pow(1.0 - clamp(ndotv, 0.0, 1.0), 2.2);
        vec3 col = mix(uBaseColor, uRimColor, fresnel * 0.85);
        float alpha = 0.042 + fresnel * 0.14;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createTunnelPulseLinesMat(tunnelLen = 96) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulseSpeed: { value: 1.6 },
      uBoost: { value: 1.0 },
      uTunnelLen: { value: tunnelLen },
      uColorCyan: { value: new THREE.Color(0x38bdf8) },
      uColorHot: { value: new THREE.Color(0x7dd3fc) },
      uColorViolet: { value: new THREE.Color(0xa855f7) },
    },
    vertexShader: `
      attribute float aRingParity;
      varying float vNormZ;
      varying float vParity;
      uniform float uTunnelLen;
      void main() {
        vNormZ = clamp(abs(position.z) / uTunnelLen, 0.0, 1.0);
        vParity = aRingParity;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uPulseSpeed;
      uniform float uBoost;
      uniform vec3 uColorCyan;
      uniform vec3 uColorHot;
      uniform vec3 uColorViolet;
      varying float vNormZ;
      varying float vParity;
      void main() {
        float depthFade = max(0.10, 1.0 - vNormZ * 0.92);
        float wave = pow(0.5 + 0.5 * sin(vNormZ * 15.70796 - uTime * uPulseSpeed * 2.4), 4.0);
        vec3 baseCol = mix(uColorCyan, uColorViolet, vParity);
        vec3 col = mix(baseCol, uColorHot, smoothstep(0.55, 0.92, wave));
        float alpha = min(0.95, depthFade * (0.28 + wave * 0.68 * uBoost));
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

