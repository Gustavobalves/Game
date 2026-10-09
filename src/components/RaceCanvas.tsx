import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  CameraView,
  CarCustomization,
  CarModelConfig,
  CarUpgrades,
  GameMode,
  TrackConfig,
  VehicleState,
} from '../types/game';
import { buildCar3D, Car3DInstance } from '../graphics/carBuilder';
import { attachRealisticStarterCar } from '../graphics/realisticCar';
import { buildTrack, TrackScene } from '../graphics/trackBuilder';
import { CarControlInputs, CarPhysics } from '../physics/carPhysics';
import { soundEngine } from '../audio/soundEngine';
import { RaceHUD } from './RaceHUD';
import { PostRaceModal } from './PostRaceModal';

interface RaceCanvasProps {
  carConfig: CarModelConfig;
  customization: CarCustomization;
  upgrades: CarUpgrades;
  trackConfig: TrackConfig;
  gameMode: GameMode;
  steeringSensitivity: number;
  onUpdateSteeringSensitivity: (val: number) => void;
  onExitToGarage: (earnedCash: number) => void;
}

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  carConfig,
  customization,
  upgrades,
  trackConfig,
  gameMode,
  steeringSensitivity,
  onUpdateSteeringSensitivity,
  onExitToGarage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // UI state updated from physics loop
  const [vehicleState, setVehicleState] = useState<VehicleState>({
    speedKmh: 0,
    rpm: 900,
    gear: 1,
    isManualTransmission: false,
    nitroAmount: 100,
    isNitroActive: false,
    isBraking: false,
    isHandbraking: false,
    steerAngle: 0,
    driftState: {
      isDrifting: false,
      angle: 0,
      score: 0,
      multiplier: 1.0,
      cashAccumulated: 0,
      comboTimer: 0,
      quality: 'BOM',
    },
  });

  const [currentLap, setCurrentLap] = useState<number>(1);
  const [currentLapTime, setCurrentLapTime] = useState<number>(0);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [totalCashEarned, setTotalCashEarned] = useState<number>(0);
  const [recentCashReward, setRecentCashReward] = useState<{ amount: number; text: string; id: number } | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>('chase_far');
  const [isRaceFinished, setIsRaceFinished] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.isSoundMuted());

  // Input states
  const keysDownRef = useRef<Record<string, boolean>>({});
  const touchInputsRef = useRef<Record<string, boolean>>({});
  const physicsRef = useRef<CarPhysics | null>(null);
  const carInstanceRef = useRef<Car3DInstance | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraViewRef = useRef<CameraView>(cameraView);
  cameraViewRef.current = cameraView;

  // Free Camera Orbit State
  const orbitYawRef = useRef<number>(0);
  const orbitPitchRef = useRef<number>(0);
  const isOrbitingRef = useRef<boolean>(false);
  const lastPointerXRef = useRef<number>(0);
  const lastPointerYRef = useRef<number>(0);
  const lastOrbitInteractionTimeRef = useRef<number>(0);

  // Laps tracking
  const nextCheckpointIdxRef = useRef<number>(1);
  const lapStartTimeRef = useRef<number>(0);
  const currentLapRef = useRef<number>(1);
  const totalDriftPointsRef = useRef<number>(0);
  const sessionCashEarnedRef = useRef<number>(0);

  const handleCashReward = useCallback((amount: number, reason: string) => {
    sessionCashEarnedRef.current += amount;
    setTotalCashEarned(sessionCashEarnedRef.current);
    setRecentCashReward({ amount, text: reason, id: Date.now() });
    soundEngine.playCashEarnedSound();

    setTimeout(() => {
      setRecentCashReward((curr) => (curr && Date.now() - curr.id >= 2400 ? null : curr));
    }, 2500);
  }, []);

  const handleShiftUp = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.shiftUp();
    }
  }, []);

  const handleShiftDown = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.shiftDown();
    }
  }, []);

  const handleToggleTransmission = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.toggleTransmissionMode();
    }
  }, []);

  const handleTouchInput = useCallback(
    (key: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake' | 'nitro', active: boolean) => {
      touchInputsRef.current[key] = active;
    },
    []
  );

  const handleSwitchCamera = useCallback(() => {
    setCameraView((prev) => {
      if (prev === 'chase_far') return 'chase_close';
      if (prev === 'chase_close') return 'hood';
      return 'chase_far';
    });
  }, []);

  const handleResetCar = useCallback(() => {
    if (!physicsRef.current) return;
    // Reset to start of track
    physicsRef.current.reset(new THREE.Vector3(0, 0, 0), 0);
  }, []);

  const handleToggleSound = useCallback(() => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Three.js Scene & Camera
    const scene = new THREE.Scene();

    // Environment background & fog
    if (trackConfig.environment === 'tokyo_night') {
      scene.background = new THREE.Color(0x6b9ac4);
      scene.fog = new THREE.FogExp2(0x8eacc7, 0.0018);
    } else if (trackConfig.environment === 'sunset_touge') {
      scene.background = new THREE.Color(0x2d1727);
      scene.fog = new THREE.FogExp2(0x2d1727, 0.004);
    } else {
      scene.background = new THREE.Color(0x83b8e3);
      scene.fog = new THREE.FogExp2(0xa9c8df, 0.0018);
    }

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      800
    );
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth <= 900 ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Scene Lighting
    const sunLight = new THREE.DirectionalLight(
      trackConfig.environment === 'sunset_touge' ? 0xfdba74 : 0xe0f2fe,
      trackConfig.environment === 'tokyo_night' ? 1.8 : 2.2
    );
    sunLight.position.set(60, 100, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(
      trackConfig.environment === 'sunset_touge' ? 0x9a3412 : 0x38bdf8,
      trackConfig.environment === 'tokyo_night' ? 1.25 : 1.1
    );
    scene.add(ambientLight);

    // 4. Build Track
    const trackScene: TrackScene = buildTrack(trackConfig);
    scene.add(trackScene.root);

    // 5. Build Car Model
    const carInst: Car3DInstance = buildCar3D(carConfig, customization);
    scene.add(carInst.root);
    const detachRealisticCar = attachRealisticStarterCar(carInst.root, carConfig);
    carInstanceRef.current = carInst;

    // 6. Init Physics
    const physics = new CarPhysics(carConfig, upgrades, steeringSensitivity);
    // Align car at start line facing track tangent
    const startPt = trackScene.spline.getPointAt(0);
    const startTangent = trackScene.spline.getTangentAt(0).normalize();
    const initialHeading = Math.atan2(-startTangent.x, -startTangent.z);
    physics.reset(startPt, initialHeading);
    physicsRef.current = physics;

    physics.onCashEarned = handleCashReward;
    physics.onGearShift = () => soundEngine.triggerShiftPop();
    physics.onCrash = () => {
      // Hard crash penalty
    };

    // Camera chase position vectors for smooth lerping
    const currentCamPos = new THREE.Vector3(0, 3, 6);
    const currentCamTarget = new THREE.Vector3(0, 1, 0);

    // 7. Keyboard input listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
      if (e.code === 'KeyC') {
        handleSwitchCamera();
      }
      if (e.code === 'KeyR') {
        handleResetCar();
      }
      if (e.code === 'KeyQ') {
        physics.shiftDown();
      }
      if (e.code === 'KeyE') {
        physics.shiftUp();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Camera pointer drag interaction
    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('button, input, [role=slider]')) return;
      isOrbitingRef.current = true;
      lastPointerXRef.current = e.clientX;
      lastPointerYRef.current = e.clientY;
      lastOrbitInteractionTimeRef.current = performance.now();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isOrbitingRef.current) return;
      const dx = e.clientX - lastPointerXRef.current;
      const dy = e.clientY - lastPointerYRef.current;
      lastPointerXRef.current = e.clientX;
      lastPointerYRef.current = e.clientY;
      lastOrbitInteractionTimeRef.current = performance.now();

      orbitYawRef.current -= dx * 0.007;
      orbitPitchRef.current = Math.max(-0.6, Math.min(1.2, orbitPitchRef.current + dy * 0.004));
    };

    const handlePointerUp = () => {
      isOrbitingRef.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Game Physics & Render Animation Loop
    let animId: number;
    let lastTime = performance.now();
    lapStartTimeRef.current = performance.now() / 1000;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Read Inputs
      const keys = keysDownRef.current;
      const touch = touchInputsRef.current;

      const throttleInput = keys['KeyW'] || keys['ArrowUp'] || touch['throttle'] ? 1 : 0;
      const brakeInput = keys['KeyS'] || keys['ArrowDown'] || touch['brake'] ? 1 : 0;
      let steerInput = 0;
      if (keys['KeyA'] || keys['ArrowLeft'] || touch['left']) steerInput -= 1;
      if (keys['KeyD'] || keys['ArrowRight'] || touch['right']) steerInput += 1;
      const handbrakeInput = Boolean(keys['Space'] || touch['handbrake']);
      const nitroInput = Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || touch['nitro']);

      const inputs: CarControlInputs = {
        throttle: throttleInput,
        brake: brakeInput,
        steer: steerInput,
        handbrake: handbrakeInput,
        nitro: nitroInput,
      };

      // Step Physics
      const state = physics.update(dt, inputs, trackConfig.driftBonusMultiplier);

      // Track drift points for post-race summary
      if (state.driftState.isDrifting) {
        totalDriftPointsRef.current += Math.round(state.driftState.score * dt * 0.5);
      }

      // Check track boundary collision (road width is 14m, halfRoad = 7.0m)
      // Project car position onto track spline
      const carPos = physics.position;
      let closestT = 0;
      let minDistSq = Infinity;
      const sampleSteps = 80;
      for (let s = 0; s < sampleSteps; s++) {
        const t = s / sampleSteps;
        const pt = trackScene.spline.getPointAt(t);
        const distSq = pt.distanceToSquared(carPos);
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestT = t;
        }
      }

      const trackCenter = trackScene.spline.getPointAt(closestT);
      const tangent = trackScene.spline.getTangentAt(closestT).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const carOffsetFromCenter = new THREE.Vector3().subVectors(carPos, trackCenter);
      const lateralDist = carOffsetFromCenter.dot(binormal);

      const maxAllowedLateral = 8.8; // Edge of guardrail
      if (Math.abs(lateralDist) > maxAllowedLateral) {
        // Collision against guardrail: push inward along binormal
        const barrierNormal = binormal.clone().multiplyScalar(lateralDist > 0 ? -1 : 1);
        physics.handleBarrierCollision(barrierNormal, 0.4);
        physics.position.copy(trackCenter).addScaledVector(binormal, Math.sign(lateralDist) * maxAllowedLateral);
      }

      // -------------------------------------------------------------
      // CHECKPOINT GATES & LAP TIMING
      // -------------------------------------------------------------
      const nextCpIdx = nextCheckpointIdxRef.current;
      const nextCp = trackScene.checkpoints[nextCpIdx];
      if (nextCp && carPos.distanceTo(nextCp.position) < 18) {
        soundEngine.playCheckpointSound();
        nextCheckpointIdxRef.current = (nextCpIdx + 1) % trackScene.checkpoints.length;

        // Did player cross the start/finish line (index 0) after clearing previous checkpoints?
        if (nextCpIdx === 0) {
          const nowSecs = performance.now() / 1000;
          const lapDuration = nowSecs - lapStartTimeRef.current;
          lapStartTimeRef.current = nowSecs;

          // Award cash bonus for lap completion!
          const lapBonusCash = 2500;
          handleCashReward(lapBonusCash, `VOLTA ${currentLapRef.current} COMPLETADA!`);

          setBestLapTime((prev) => (prev === null || lapDuration < prev ? lapDuration : prev));

          if (gameMode === 'circuit_race' && currentLapRef.current >= trackConfig.lapsToComplete) {
            // Race Finished!
            setIsRaceFinished(true);
            soundEngine.stopEngine();
          } else {
            currentLapRef.current += 1;
            setCurrentLap(currentLapRef.current);
          }
        }
      }

      const nowSecs = performance.now() / 1000;
      setCurrentLapTime(nowSecs - lapStartTimeRef.current);

      // -------------------------------------------------------------
      // SYNC 3D CAR INSTANCE WITH PHYSICS
      // -------------------------------------------------------------
      carInst.root.position.copy(physics.position);
      carInst.root.position.y = 0; // Lock to ground plane
      carInst.root.rotation.y = physics.heading;

      carInst.setSteerAngle(physics.steerAngle);
      carInst.setBraking(state.isBraking);
      carInst.setReverse(state.gear === 'R');
      carInst.setNitro(state.isNitroActive);

      // Spin wheels
      const speedMs = physics.velocity.length();
      carInst.spinWheels(speedMs * dt);

      // -------------------------------------------------------------
      // TIRE SKID MARKS & DRIFT SMOKE
      // -------------------------------------------------------------
      const isSkidding = state.driftState.isDrifting || state.isHandbraking || (state.isBraking && speedMs > 10);
      if (isSkidding) {
        const carForward = new THREE.Vector3(-Math.sin(physics.heading), 0, -Math.cos(physics.heading));
        const carRight = new THREE.Vector3(Math.cos(physics.heading), 0, -Math.sin(physics.heading));
        const trackW = carConfig.dimensions.trackWidth / 2;

        const rearTireL = physics.position.clone().addScaledVector(carForward, -carConfig.dimensions.wheelbase / 2).addScaledVector(carRight, -trackW);
        const rearTireR = physics.position.clone().addScaledVector(carForward, -carConfig.dimensions.wheelbase / 2).addScaledVector(carRight, trackW);

        trackScene.addSkidMark(rearTireL, rearTireR, 0.7);

        // Volumetric drift smoke puffs
        if (state.driftState.isDrifting && speedMs > 8) {
          const smokeVel = physics.velocity.clone().multiplyScalar(-0.1);
          trackScene.spawnSmoke(rearTireL, smokeVel, 0.45);
          trackScene.spawnSmoke(rearTireR, smokeVel, 0.45);
        }
      }

      trackScene.updateParticles(dt);

      // -------------------------------------------------------------
      // SOUND ENGINE UPDATE
      // -------------------------------------------------------------
      const skidIntensity = state.driftState.isDrifting ? Math.min(1.0, state.driftState.angle / 40) : (state.isHandbraking ? 0.6 : 0);
      soundEngine.updateCarSound(
        state.rpm,
        inputs.throttle,
        skidIntensity,
        state.isNitroActive,
        state.speedKmh
      );

      // -------------------------------------------------------------
      // DYNAMIC CAMERA CHOREOGRAPHY WITH ORBIT CONTROLS
      // -------------------------------------------------------------
      // Auto-recenter camera behind vehicle if player is driving and hasn't dragged for 1.5 seconds
      const nowMs = performance.now();
      if (!isOrbitingRef.current && (nowMs - lastOrbitInteractionTimeRef.current > 1500) && state.speedKmh > 10) {
        orbitYawRef.current = THREE.MathUtils.lerp(orbitYawRef.current, 0, dt * 2.5);
        orbitPitchRef.current = THREE.MathUtils.lerp(orbitPitchRef.current, 0, dt * 2.5);
      }

      // Effective camera heading incorporates player manual orbit
      const effectiveHeading = physics.heading + orbitYawRef.current;
      const camForward = new THREE.Vector3(-Math.sin(effectiveHeading), 0, -Math.cos(effectiveHeading));
      const camPitchHeight = orbitPitchRef.current * 2.2;
      const camMode = cameraViewRef.current;

      let targetCamPos: THREE.Vector3;
      let targetLookAt: THREE.Vector3;

      if (camMode === 'chase_far') {
        // Third-person smooth follow
        const followDist = 6.2 + (state.speedKmh / 280) * 1.5;
        const followHeight = 2.1;
        targetCamPos = physics.position.clone().addScaledVector(camForward, -followDist);
        targetCamPos.y = Math.max(0.6, followHeight + camPitchHeight);
        targetLookAt = physics.position.clone().add(new THREE.Vector3(0, 1.1 + camPitchHeight * 0.2, 0));

        // Speed-dependent dynamic FOV widening
        camera.fov = 58 + (state.speedKmh / 350) * 18 + (state.isNitroActive ? 8 : 0);
        camera.updateProjectionMatrix();
      } else if (camMode === 'chase_close') {
        const followDist = 4.4;
        const followHeight = 1.45;
        targetCamPos = physics.position.clone().addScaledVector(camForward, -followDist);
        targetCamPos.y = Math.max(0.5, followHeight + camPitchHeight);
        targetLookAt = physics.position.clone().add(new THREE.Vector3(0, 0.9 + camPitchHeight * 0.2, 0));

        camera.fov = 64 + (state.speedKmh / 350) * 14;
        camera.updateProjectionMatrix();
      } else {
        // Hood / Bumper first-person view
        targetCamPos = physics.position.clone().addScaledVector(camForward, carConfig.dimensions.length * 0.25);
        targetCamPos.y = Math.max(0.6, carConfig.dimensions.height * 0.75 + camPitchHeight);
        targetLookAt = physics.position.clone().addScaledVector(camForward, 30);
        targetLookAt.y = targetCamPos.y - 0.1 + camPitchHeight;

        camera.fov = 75 + (state.speedKmh / 350) * 16;
        camera.updateProjectionMatrix();
      }

      // Smooth camera interpolation
      const camLerpFactor = Math.min(1.0, dt * (camMode === 'hood' ? 24 : 8));
      currentCamPos.lerp(targetCamPos, camLerpFactor);
      currentCamTarget.lerp(targetLookAt, camLerpFactor);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentCamTarget);

      // Render Scene
      renderer.render(scene, camera);

      // Push state to UI every frame
      setVehicleState(state);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // 9. Resize Handler
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      soundEngine.stopEngine();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      trackScene.dispose();
      renderer.dispose();
    };
  }, [carConfig.id, trackConfig.id]);

  useEffect(() => {
    physicsRef.current?.setSteeringSensitivity(steeringSensitivity);
  }, [steeringSensitivity]);

  const handleRestartRace = () => {
    setIsRaceFinished(false);
    currentLapRef.current = 1;
    setCurrentLap(1);
    lapStartTimeRef.current = performance.now() / 1000;
    nextCheckpointIdxRef.current = 1;
    handleResetCar();
  };

  return (
    <div className="relative w-full h-dvh bg-zinc-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full race-canvas" />

      {/* 2D High-Tech HUD Layer */}
      <RaceHUD
        vehicleState={vehicleState}
        trackConfig={trackConfig}
        gameMode={gameMode}
        currentLap={currentLap}
        currentLapTime={currentLapTime}
        bestLapTime={bestLapTime}
        totalCashEarnedInRace={totalCashEarned}
        recentCashReward={recentCashReward}
        cameraView={cameraView}
        isMuted={isMuted}
        steeringSensitivity={steeringSensitivity}
        onUpdateSteeringSensitivity={onUpdateSteeringSensitivity}
        onToggleSound={handleToggleSound}
        onSwitchCamera={handleSwitchCamera}
        onResetCar={handleResetCar}
        onExitToGarage={() => {
          soundEngine.stopEngine();
          onExitToGarage(sessionCashEarnedRef.current);
        }}
        onShiftUp={handleShiftUp}
        onShiftDown={handleShiftDown}
        onToggleTransmission={handleToggleTransmission}
        onTouchInput={handleTouchInput}
      />

      {/* Victory Post-Race Dialog */}
      {isRaceFinished && (
        <PostRaceModal
          track={trackConfig}
          bestLapTime={bestLapTime}
          totalLaps={trackConfig.lapsToComplete}
          driftPoints={totalDriftPointsRef.current}
          cashEarned={totalCashEarned}
          onRestart={handleRestartRace}
          onExitToGarage={() => {
            soundEngine.stopEngine();
            onExitToGarage(sessionCashEarnedRef.current);
          }}
        />
      )}
    </div>
  );
};
