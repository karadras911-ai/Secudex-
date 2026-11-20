import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CAMERA_LIMITS } from '../config/constants.js';
import { CinemaOpticsShader } from './shaders.js';
import { computeCinemaOptics } from '../stages/timelineMath.js';

export function detectSoftwareGl() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function buildStudioSoftboxEnv(renderer) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x04060e);

  const disposables = [];
  const addPanel = (w, h, colorHex, intensity, pos, rot) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    envScene.add(mesh);
    disposables.push(geo, mat);
  };

  const boxGeo = new THREE.BoxGeometry(36, 26, 36);
  const boxMat = new THREE.MeshBasicMaterial({ color: 0x070a15, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(boxGeo, boxMat));
  disposables.push(boxGeo, boxMat);

  addPanel(18, 2.8, 0xe2e8f0, 4.2, [0, 12.2, 2.5], [Math.PI / 2, 0, 0]);
  addPanel(2.4, 16, 0x38bdf8, 4.8, [-14.5, 2.0, -3.5], [0, Math.PI / 2, 0]);
  addPanel(2.6, 15, 0xa855f7, 3.6, [14.5, 1.5, 1.0], [0, -Math.PI / 2, 0]);
  addPanel(12, 1.3, 0xf8fafc, 2.8, [0, 7.5, 14.5], [0, Math.PI, 0]);
  addPanel(20, 20, 0x1e1b4b, 0.9, [0, -11.5, 0], [-Math.PI / 2, 0, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.032);
  pmrem.dispose();
  disposables.forEach(d => d.dispose());
  return rt.texture;
}

export function initSceneRenderer(container, deviceProfile, isSoftwareGl) {
  const isMobile = Boolean(deviceProfile?.isMobileLayout);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030109);
  scene.fog = new THREE.FogExp2(0x030109, 0.0105);

  const camera = new THREE.PerspectiveCamera(isMobile ? 56 : 48, window.innerWidth / window.innerHeight, 0.1, 380);
  camera.position.set(0, -0.1, isMobile ? 22.8 : 17.6);

  const maxDpr = deviceProfile?.maxDpr ?? (isMobile ? 1.25 : 1.5);
  const getTargetDpr = () => (isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr));
  let activeDpr = getTargetDpr();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setPixelRatio(activeDpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  scene.environment = buildStudioSoftboxEnv(renderer);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = CAMERA_LIMITS.minDistance;
  controls.maxDistance = CAMERA_LIMITS.maxDistance;
  controls.minAzimuthAngle = CAMERA_LIMITS.minAzimuthAngle;
  controls.maxAzimuthAngle = CAMERA_LIMITS.maxAzimuthAngle;
  controls.minPolarAngle = CAMERA_LIMITS.minPolarAngle;
  controls.maxPolarAngle = CAMERA_LIMITS.maxPolarAngle;
  controls.target.set(0, 2.65, -0.3);
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  const hemiLight = new THREE.HemisphereLight(0x8b5cf6, 0x0f172a, 0.85);
  const keyLight = new THREE.DirectionalLight(0xf3e8ff, 1.95);
  keyLight.position.set(6, 12, 10);
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.75);
  rimLight.position.set(-9, 5, -7);
  const bottomLight = new THREE.PointLight(0x7c3aed, 3.6, 22);
  bottomLight.position.set(0, -4.2, 4.5);
  const flagshipLight = new THREE.PointLight(0x38bdf8, 5.5, 28);
  flagshipLight.position.set(0, 10.6, -1.4);
  const scanLight = new THREE.PointLight(0x38bdf8, 0, 8.5, 1.8);
  scene.add(hemiLight, keyLight, rimLight, bottomLight, flagshipLight, scanLight);

  let composer = null;
  let bloomPass = null;
  let cinemaOpticsPass = null;
  const opticsState = { focus: 16.5, aperture: 0, bloomStrength: 0.14, chromaAmount: 0, anamorphicAmount: 0 };
  const sceneStats = { calls: 0, triangles: 0, dpr: activeDpr, tierLabel: deviceProfile?.label || 'Стандарт' };
  const bloomScale = deviceProfile?.bloomResolutionScale ?? 0.5;

  if (!isSoftwareGl) {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const tierSamples = deviceProfile?.msaaSamples ?? 4;
    const maxSamples = renderer.capabilities.isWebGL2 ? Math.min(tierSamples, renderer.capabilities.maxSamples || tierSamples) : 0;

    const rt = new THREE.WebGLRenderTarget(Math.floor(w * activeDpr), Math.floor(h * activeDpr), {
      type: THREE.HalfFloatType,
      samples: maxSamples,
    });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(activeDpr);
    composer.setSize(w, h);

    const renderPass = new RenderPass(scene, camera);
    const origRenderPassRender = renderPass.render.bind(renderPass);
    renderPass.render = (ren, writeBuffer, readBuffer, deltaTime, maskActive) => {
      const prevAuto = ren.info.autoReset;
      ren.info.autoReset = false;
      ren.info.reset();
      origRenderPassRender(ren, writeBuffer, readBuffer, deltaTime, maskActive);
      sceneStats.calls = ren.info.render.calls;
      sceneStats.triangles = ren.info.render.triangles;
      ren.info.autoReset = prevAuto;
    };
    composer.addPass(renderPass);

    const bloomW = Math.max(1, Math.floor(w * activeDpr * bloomScale));
    const bloomH = Math.max(1, Math.floor(h * activeDpr * bloomScale));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(bloomW, bloomH), 0.12, 0.12, 1.45);
    composer.addPass(bloomPass);
    bloomPass.setSize(bloomW, bloomH);

    cinemaOpticsPass = new ShaderPass(CinemaOpticsShader);
    cinemaOpticsPass.uniforms.uGrain.value = deviceProfile?.cinemaGrain ?? 0;
    composer.addPass(cinemaOpticsPass);
    composer.addPass(new OutputPass());
  }

  function updatePostProcessing(stage, warpActive, elapsedSec) {
    if (!composer) return;
    const camDist = camera.position.distanceTo(controls.target);
    computeCinemaOptics(stage, camDist, warpActive, opticsState, deviceProfile);
    if (bloomPass) {
      bloomPass.strength = opticsState.bloomStrength;
    }
    if (cinemaOpticsPass) {
      cinemaOpticsPass.uniforms.uTime.value = elapsedSec;
      cinemaOpticsPass.uniforms.uChroma.value = opticsState.chromaAmount;
      cinemaOpticsPass.uniforms.uGrain.value = deviceProfile?.cinemaGrain ?? 0;
      cinemaOpticsPass.uniforms.uAnamorphic.value = opticsState.anamorphicAmount;
    }
  }

  function onResize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    activeDpr = getTargetDpr();
    sceneStats.dpr = activeDpr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(activeDpr);
    renderer.setSize(w, h);
    if (composer) {
      composer.setPixelRatio(activeDpr);
      composer.setSize(w, h);
      if (bloomPass) {
        const bloomW = Math.max(1, Math.floor(w * activeDpr * bloomScale));
        const bloomH = Math.max(1, Math.floor(h * activeDpr * bloomScale));
        bloomPass.setSize(bloomW, bloomH);
      }
    }
  }
  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    controls,
    composer,
    sceneStats,
    lights: { hemiLight, keyLight, rimLight, bottomLight, flagshipLight, scanLight },
    updatePostProcessing,
  };
}
