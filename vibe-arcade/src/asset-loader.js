import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();

export function loadModel(url) {
  if (cache.has(url)) return cache.get(url);

  const promise = new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        console.log(`[assets] Loaded: ${url}`);
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        console.error(`[assets] Failed to load ${url}:`, err);
        reject(err);
      }
    );
  });

  cache.set(url, promise);
  return promise;
}

export async function placeModel(scene, url, { position, rotation, scale } = {}) {
  try {
    const original = await loadModel(url);
    const model = original.clone();

    if (position) model.position.set(position[0], position[1], position[2]);
    if (rotation) model.rotation.set(rotation[0], rotation[1], rotation[2]);
    if (scale) {
      if (typeof scale === 'number') model.scale.setScalar(scale);
      else model.scale.set(scale[0], scale[1], scale[2]);
    }

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(model);
    return model;
  } catch (e) {
    console.warn(`[assets] Skipping ${url} — failed to load`);
    return null;
  }
}
