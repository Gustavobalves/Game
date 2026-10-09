import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CarCustomization, CarModelConfig } from '../types/game';
import { buildCar3D, Car3DInstance } from '../graphics/carBuilder';
import { attachRealisticStarterCar } from '../graphics/realisticCar';

interface ShowroomCanvasProps {
  carConfig: CarModelConfig;
  customization: CarCustomization;
}

export const ShowroomCanvas: React.FC<ShowroomCanvasProps> = ({
  carConfig,
  customization,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const carInstanceRef = useRef<Car3DInstance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(4.8, 1.8, 4.8);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Showroom Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    const fillLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(fillLight);

    // Overhead showroom light bars
    const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-2, 0, 2].forEach((x) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 7), lightBarMat);
      bar.position.set(x, 4.2, 0);
      scene.add(bar);
    });

    // 4. Showroom Reflective Floor
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const fctx = floorCanvas.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#101015';
      fctx.fillRect(0, 0, 256, 256);
      fctx.strokeStyle = '#22222a';
      fctx.lineWidth = 2;
      fctx.strokeRect(0, 0, 256, 256);
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(12, 12);

    const floorGeom = new THREE.PlaneGeometry(50, 50);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.15,
      metalness: 0.85,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Turntable circular platform
    const platformGeom = new THREE.CylinderGeometry(3.2, 3.4, 0.12, 48);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x18181f,
      roughness: 0.25,
      metalness: 0.7,
    });
    const platform = new THREE.Mesh(platformGeom, platformMat);
    platform.position.y = 0.06;
    platform.receiveShadow = true;
    scene.add(platform);

    // Neon edge ring around turntable
    const ringGeom = new THREE.RingGeometry(3.22, 3.28, 48);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 0.13;
    scene.add(ring);

    // 5. Build Car Model
    const carInst = buildCar3D(carConfig, customization);
    const detachRealisticCar = attachRealisticStarterCar(carInst.root, carConfig);
    scene.add(carInst.root);
    carInstanceRef.current = carInst;

    // 6. Interactive Turntable Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let orbitAngle = Math.PI / 4;
    let orbitPitch = 0.28;
    let orbitDistance = 6.2;
    let autoRotate = true;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      autoRotate = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      orbitAngle -= dx * 0.007;
      orbitPitch = Math.max(0.08, Math.min(1.1, orbitPitch + dy * 0.005));
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitDistance = Math.max(3.8, Math.min(9.5, orbitDistance + e.deltaY * 0.005));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    dom.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // 7. Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (autoRotate) {
        orbitAngle += dt * 0.25;
      }

      // Update camera position on sphere around car
      const targetY = 0.7;
      camera.position.x = Math.sin(orbitAngle) * Math.cos(orbitPitch) * orbitDistance;
      camera.position.y = targetY + Math.sin(orbitPitch) * orbitDistance;
      camera.position.z = Math.cos(orbitAngle) * Math.cos(orbitPitch) * orbitDistance;
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      detachRealisticCar();
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      dom.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);

      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, [carConfig.id]);

  // Update customization properties live when colors/finishes change
  useEffect(() => {
    if (carInstanceRef.current) {
      carInstanceRef.current.updateCustomization(customization);
    }
  }, [customization]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
    >
      <div className="absolute bottom-4 left-4 pointer-events-none text-xs text-zinc-400 bg-zinc-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800">
        🖱️ Arraste para girar 360° · Scroll para aproximar
      </div>
    </div>
  );
};
