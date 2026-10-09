import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CarModelConfig } from '../types/game';

/**
 * Loads a detailed game-ready sports-car model for the starter vehicle.
 * The source asset is dedicated to the public domain (CC0) by its author.
 * If the remote asset is unavailable, the procedural car remains visible.
 */
const REALISTIC_CAR_URL =
  'https://raw.githubusercontent.com/JaronKBragg7337/spectral-gt-rs/main/spectral_gt_rs_game_ready.glb';

export function attachRealisticStarterCar(
  root: THREE.Group,
  config: CarModelConfig,
): () => void {
  if (config.id !== 'apex_911') return () => undefined;

  let cancelled = false;
  let loadedModel: THREE.Group | null = null;
  const loader = new GLTFLoader();

  loader.load(
    REALISTIC_CAR_URL,
    (gltf) => {
      if (cancelled) {
        disposeObject(gltf.scene);
        return;
      }

      const model = gltf.scene;
      model.name = 'RealisticSportsCarModel';
      model.rotation.y = Math.PI / 2; // Asset front is +X; game forward is -Z.
      model.updateMatrixWorld(true);

      const initialBounds = new THREE.Box3().setFromObject(model);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const targetLength = config.dimensions.length;
      const scale = targetLength / Math.max(initialSize.z, initialSize.x, 0.001);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= bounds.min.y;

      model.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.frustumCulled = true;
          // Keep imported PBR materials; ensure them compatible with the scene lighting.
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if ('envMapIntensity' in material) {
              (material as THREE.MeshStandardMaterial).envMapIntensity = 1.15;
            }
          });
        }
      });

      // Hide the old procedural body only after the detailed model loaded successfully.
      root.children.forEach((child) => {
        child.visible = false;
      });
      root.add(model);
      loadedModel = model;
    },
    undefined,
    (error) => {
      console.warn('Não foi possível carregar o modelo 3D detalhado; usando o carro de reserva.', error);
    },
  );

  return () => {
    cancelled = true;
    if (loadedModel) {
      root.remove(loadedModel);
      disposeObject(loadedModel);
      root.children.forEach((child) => {
        child.visible = true;
      });
      loadedModel = null;
    }
  };
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
}
