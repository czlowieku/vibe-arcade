import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// === BLOOM POST-PROCESSING ===
export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,   // bloom strength
    0.4,   // radius
    0.85   // threshold — only bright/emissive things bloom
  );
  composer.addPass(bloomPass);

  // Subtle scanline + vignette shader
  const scanlineShader = {
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      scanlineIntensity: { value: 0.04 },
      vignetteIntensity: { value: 0.3 },
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
      uniform float time;
      uniform float scanlineIntensity;
      uniform float vignetteIntensity;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        // Scanlines
        float scanline = sin(vUv.y * 800.0) * 0.5 + 0.5;
        color.rgb -= scanlineIntensity * (1.0 - scanline);
        // Vignette
        float dist = distance(vUv, vec2(0.5));
        color.rgb *= 1.0 - vignetteIntensity * dist * dist * 2.0;
        gl_FragColor = color;
      }
    `,
  };
  const scanlinePass = new ShaderPass(scanlineShader);
  composer.addPass(scanlinePass);

  return { composer, bloomPass, scanlinePass };
}

// === DUST PARTICLES ===
export function createDustParticles(scene) {
  const count = 200;
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    velocities.push({
      x: (Math.random() - 0.5) * 0.1,
      y: (Math.random() - 0.5) * 0.05,
      z: (Math.random() - 0.5) * 0.1,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.03,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });

  const dust = new THREE.Points(geometry, material);
  scene.add(dust);

  return {
    update(dt) {
      const pos = dust.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const v = velocities[i];
        pos[i * 3] += v.x * dt;
        pos[i * 3 + 1] += v.y * dt;
        pos[i * 3 + 2] += v.z * dt;

        // Wrap around room bounds
        if (pos[i * 3] > 8) pos[i * 3] = -8;
        if (pos[i * 3] < -8) pos[i * 3] = 8;
        if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = 0;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 6;
        if (pos[i * 3 + 2] > 8) pos[i * 3 + 2] = -8;
        if (pos[i * 3 + 2] < -8) pos[i * 3 + 2] = 8;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    },
  };
}
