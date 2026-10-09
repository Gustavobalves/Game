import * as THREE from 'three';
import { CarCustomization, CarModelConfig } from '../types/game';

export interface Car3DInstance {
  root: THREE.Group;
  bodyMeshList: THREE.Mesh[];
  rimMeshList: THREE.Mesh[];
  caliperMeshList: THREE.Mesh[];
  windowMeshList: THREE.Mesh[];
  underglowLight: THREE.PointLight | null;
  underglowMesh: THREE.Mesh | null;
  headlightL: THREE.SpotLight;
  headlightR: THREE.SpotLight;
  headlightLensL: THREE.Mesh;
  headlightLensR: THREE.Mesh;
  taillightMeshList: THREE.Mesh[];
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  exhaustPipes: THREE.Mesh[];
  nitroFlames: THREE.Group;
  config: CarModelConfig;
  updateCustomization: (customization: CarCustomization) => void;
  setBraking: (isBraking: boolean) => void;
  setReverse: (isReverse: boolean) => void;
  setNitro: (isNitro: boolean) => void;
  setSteerAngle: (angleRad: number) => void;
  spinWheels: (distanceDelta: number) => void;
}

/**
 * Creates high-fidelity, smooth, non-blocky 3D sports car geometries.
 */
export function buildCar3D(
  config: CarModelConfig,
  customization: CarCustomization
): Car3DInstance {
  const root = new THREE.Group();
  root.name = `car_${config.id}`;

  const bodyMeshList: THREE.Mesh[] = [];
  const rimMeshList: THREE.Mesh[] = [];
  const caliperMeshList: THREE.Mesh[] = [];
  const windowMeshList: THREE.Mesh[] = [];
  const taillightMeshList: THREE.Mesh[] = [];
  const exhaustPipes: THREE.Mesh[] = [];

  // Calculate material properties based on finish
  const getBodyMaterialProps = (finish: string) => {
    switch (finish) {
      case 'metallic':
        return { roughness: 0.18, metalness: 0.85, clearcoat: 0.9, clearcoatRoughness: 0.1 };
      case 'matte':
        return { roughness: 0.65, metalness: 0.2, clearcoat: 0.05, clearcoatRoughness: 0.3 };
      case 'carbon':
        return { roughness: 0.25, metalness: 0.6, clearcoat: 0.7, clearcoatRoughness: 0.15 };
      case 'gloss':
      default:
        return { roughness: 0.12, metalness: 0.45, clearcoat: 0.95, clearcoatRoughness: 0.05 };
    }
  };

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customization.bodyColor),
    ...getBodyMaterialProps(customization.finish),
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.4,
    metalness: 0.5,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    roughness: 0.1,
    metalness: 0.95,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.rimColor),
    roughness: 0.25,
    metalness: 0.85,
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.caliperColor),
    roughness: 0.3,
    metalness: 0.6,
  });

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1f,
    roughness: 0.85,
    metalness: 0.05,
  });

  const brakeRotorMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.3,
    metalness: 0.9,
  });

  const getWindowOpacity = (tint: string) => {
    if (tint === 'dark') return 0.85;
    if (tint === 'smoke') return 0.6;
    return 0.35;
  };

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x09090b,
    transparent: true,
    opacity: getWindowOpacity(customization.windowTint),
    roughness: 0.05,
    metalness: 0.9,
    clearcoat: 1.0,
  });

  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.2,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.1,
  });

  const { length, width, height, wheelbase, trackWidth, wheelRadius } = config.dimensions;
  const halfLength = length / 2;
  const halfWidth = width / 2;

  // -------------------------------------------------------------
  // 1. CAR BODY CURVATURE & AERODYNAMIC SURFACES
  // -------------------------------------------------------------
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  // Lower chassis belly pan & diffuser
  const bellyGeom = new THREE.BoxGeometry(width * 0.92, 0.12, length * 0.95);
  const bellyMesh = new THREE.Mesh(bellyGeom, carbonMat);
  bellyMesh.position.y = wheelRadius * 0.8;
  bellyMesh.castShadow = true;
  bellyMesh.receiveShadow = true;
  chassisGroup.add(bellyMesh);

  // Front Splitter / Carbon Apron
  const splitterShape = new THREE.Shape();
  splitterShape.moveTo(-halfWidth * 0.95, -halfLength);
  splitterShape.quadraticCurveTo(0, -halfLength - 0.22, halfWidth * 0.95, -halfLength);
  splitterShape.lineTo(halfWidth * 0.9, -halfLength + 0.35);
  splitterShape.lineTo(-halfWidth * 0.9, -halfLength + 0.35);
  splitterShape.closePath();

  const splitterGeom = new THREE.ExtrudeGeometry(splitterShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  splitterGeom.rotateX(Math.PI / 2);
  const splitterMesh = new THREE.Mesh(splitterGeom, carbonMat);
  splitterMesh.position.y = wheelRadius * 0.5;
  splitterMesh.castShadow = true;
  chassisGroup.add(splitterMesh);

  // Side Skirts
  const leftSkirtGeom = new THREE.BoxGeometry(0.08, 0.08, wheelbase * 1.15);
  const leftSkirt = new THREE.Mesh(leftSkirtGeom, carbonMat);
  leftSkirt.position.set(-halfWidth * 0.94, wheelRadius * 0.55, 0);
  const rightSkirt = leftSkirt.clone();
  rightSkirt.position.x = halfWidth * 0.94;
  chassisGroup.add(leftSkirt, rightSkirt);

  // Main aerodynamic curved body shape using extruded side-silhouette
  const bodyShape = new THREE.Shape();

  if (config.bodyStyle === '911_gt') {
    // Teardrop Porsche silhouette: curved nose, sloping roofline down to rear deck
    bodyShape.moveTo(-halfLength * 0.98, wheelRadius * 0.7);
    bodyShape.quadraticCurveTo(-halfLength * 0.92, height * 0.55, -halfLength * 0.55, height * 0.65); // Front hood
    bodyShape.quadraticCurveTo(-halfLength * 0.25, height * 0.72, -halfLength * 0.05, height * 1.05); // Windshield
    bodyShape.quadraticCurveTo(halfLength * 0.15, height * 1.08, halfLength * 0.35, height * 0.95); // Curved roof
    bodyShape.quadraticCurveTo(halfLength * 0.75, height * 0.65, halfLength * 0.96, height * 0.55); // Fastback teardrop rear
    bodyShape.lineTo(halfLength * 0.98, wheelRadius * 0.7); // Rear bumper
    bodyShape.lineTo(-halfLength * 0.98, wheelRadius * 0.7); // Bottom seal
  } else if (config.bodyStyle === 'wedge_v10') {
    // Sharp razor wedge Lamborghini silhouette
    bodyShape.moveTo(-halfLength * 1.0, wheelRadius * 0.6);
    bodyShape.lineTo(-halfLength * 0.6, height * 0.58); // Sharp nose
    bodyShape.lineTo(-halfLength * 0.1, height * 0.96); // Continuous wedge windshield
    bodyShape.lineTo(halfLength * 0.25, height * 0.94); // Low flat roof
    bodyShape.lineTo(halfLength * 0.8, height * 0.68); // Aggressive engine louvers
    bodyShape.lineTo(halfLength * 0.98, height * 0.58); // High cut rear
    bodyShape.lineTo(halfLength * 0.96, wheelRadius * 0.6);
    bodyShape.lineTo(-halfLength * 1.0, wheelRadius * 0.6);
  } else if (config.bodyStyle === 'muscle_gtr') {
    // Muscular GT-R silhouette
    bodyShape.moveTo(-halfLength * 0.98, wheelRadius * 0.7);
    bodyShape.quadraticCurveTo(-halfLength * 0.8, height * 0.66, -halfLength * 0.45, height * 0.7); // Long flat power hood
    bodyShape.lineTo(-halfLength * 0.1, height * 1.04); // Steep windshield
    bodyShape.lineTo(halfLength * 0.4, height * 1.02); // Flat carbon roof
    bodyShape.lineTo(halfLength * 0.75, height * 0.72); // Rear window
    bodyShape.lineTo(halfLength * 0.98, height * 0.7); // Muscular trunk
    bodyShape.lineTo(halfLength * 0.98, wheelRadius * 0.7);
    bodyShape.lineTo(-halfLength * 0.98, wheelRadius * 0.7);
  } else if (config.bodyStyle === 'flowing_supra') {
    // Sculpted Supra curves
    bodyShape.moveTo(-halfLength * 0.98, wheelRadius * 0.65);
    bodyShape.quadraticCurveTo(-halfLength * 0.65, height * 0.56, -halfLength * 0.38, height * 0.66); // Long hood
    bodyShape.quadraticCurveTo(-halfLength * 0.15, height * 0.96, halfLength * 0.05, height * 1.02); // Cockpit
    bodyShape.quadraticCurveTo(halfLength * 0.35, height * 1.02, halfLength * 0.55, height * 0.85); // Bubble roof
    bodyShape.quadraticCurveTo(halfLength * 0.8, height * 0.68, halfLength * 0.94, height * 0.68); // Ducktail kick
    bodyShape.lineTo(halfLength * 0.96, wheelRadius * 0.65);
    bodyShape.lineTo(-halfLength * 0.98, wheelRadius * 0.65);
  } else {
    // Hyperion W16 (Bugatti Chiron style)
    bodyShape.moveTo(-halfLength * 0.98, wheelRadius * 0.65);
    bodyShape.quadraticCurveTo(-halfLength * 0.75, height * 0.6, -halfLength * 0.45, height * 0.68);
    bodyShape.quadraticCurveTo(-halfLength * 0.15, height * 0.98, halfLength * 0.1, height * 1.02);
    bodyShape.quadraticCurveTo(halfLength * 0.45, height * 1.0, halfLength * 0.78, height * 0.72);
    bodyShape.lineTo(halfLength * 0.98, height * 0.64);
    bodyShape.lineTo(halfLength * 0.98, wheelRadius * 0.65);
    bodyShape.lineTo(-halfLength * 0.98, wheelRadius * 0.65);
  }

  const mainBodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width * 0.84,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  mainBodyGeom.center();
  mainBodyGeom.rotateY(Math.PI / 2);
  mainBodyGeom.computeVertexNormals();

  const mainBodyMesh = new THREE.Mesh(mainBodyGeom, bodyMat);
  mainBodyMesh.position.y = (height * 0.85 + wheelRadius * 0.7) / 2;
  mainBodyMesh.castShadow = true;
  mainBodyMesh.receiveShadow = true;
  chassisGroup.add(mainBodyMesh);
  bodyMeshList.push(mainBodyMesh);

  // Curved Wheel Arches / Wide Fenders (Front & Rear)
  const fenderRadius = wheelRadius * 1.25;
  const fenderWidth = 0.14;
  const fenderGeom = new THREE.CylinderGeometry(fenderRadius, fenderRadius, fenderWidth, 24, 1, true, 0, Math.PI);
  fenderGeom.rotateZ(Math.PI / 2);

  const createFender = (x: number, z: number) => {
    const fender = new THREE.Mesh(fenderGeom, bodyMat);
    fender.position.set(x, wheelRadius * 1.02, z);
    fender.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    fender.castShadow = true;
    bodyMeshList.push(fender);
    return fender;
  };

  const frontZ = -wheelbase / 2;
  const rearZ = wheelbase / 2;
  const fenderX = halfWidth * 0.94;

  chassisGroup.add(
    createFender(fenderX, frontZ),
    createFender(-fenderX, frontZ),
    createFender(fenderX * 1.03, rearZ),
    createFender(-fenderX * 1.03, rearZ)
  );

  // Cabin Glass & Pillars (Sleek cockpit window surfaces)
  const cabinGlassShape = new THREE.Shape();
  cabinGlassShape.moveTo(-halfLength * 0.22, height * 0.68);
  cabinGlassShape.lineTo(-halfLength * 0.04, height * 1.02);
  cabinGlassShape.lineTo(halfLength * 0.35, height * 1.0);
  cabinGlassShape.lineTo(halfLength * 0.68, height * 0.7);
  cabinGlassShape.closePath();

  const cabinGlassGeom = new THREE.ExtrudeGeometry(cabinGlassShape, {
    depth: width * 0.76,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  });
  cabinGlassGeom.center();
  cabinGlassGeom.rotateY(Math.PI / 2);
  cabinGlassGeom.computeVertexNormals();

  const cabinGlassMesh = new THREE.Mesh(cabinGlassGeom, glassMat);
  cabinGlassMesh.position.set(0, height * 0.86, halfLength * 0.08);
  cabinGlassMesh.castShadow = true;
  chassisGroup.add(cabinGlassMesh);
  windowMeshList.push(cabinGlassMesh);

  // Interior: Carbon Sports Seats & Dashboard
  const seatGeom = new THREE.BoxGeometry(0.36, 0.45, 0.36);
  const leftSeat = new THREE.Mesh(seatGeom, carbonMat);
  leftSeat.position.set(-0.3, height * 0.72, 0.08);
  const rightSeat = new THREE.Mesh(seatGeom, carbonMat);
  rightSeat.position.set(0.3, height * 0.72, 0.08);

  const dashGeom = new THREE.BoxGeometry(width * 0.68, 0.16, 0.3);
  const dashMesh = new THREE.Mesh(dashGeom, carbonMat);
  dashMesh.position.set(0, height * 0.76, -halfLength * 0.12);

  // Steering wheel
  const wheelTorusGeom = new THREE.TorusGeometry(0.11, 0.02, 12, 24);
  const wheelTorusMesh = new THREE.Mesh(wheelTorusGeom, carbonMat);
  wheelTorusMesh.position.set(-0.3, height * 0.78, -halfLength * 0.05);
  wheelTorusMesh.rotation.x = Math.PI / 4;
  chassisGroup.add(leftSeat, rightSeat, dashMesh, wheelTorusMesh);

  // Aerodynamic Side Mirrors
  const mirrorGeom = new THREE.BoxGeometry(0.18, 0.08, 0.12);
  const leftMirror = new THREE.Mesh(mirrorGeom, bodyMat);
  leftMirror.position.set(-halfWidth * 0.98, height * 0.78, -halfLength * 0.15);
  leftMirror.castShadow = true;
  const rightMirror = leftMirror.clone();
  rightMirror.position.x = halfWidth * 0.98;
  chassisGroup.add(leftMirror, rightMirror);
  bodyMeshList.push(leftMirror, rightMirror);

  // Front Radiator Grille / Intakes (Mesh aesthetic)
  const grilleGeom = new THREE.BoxGeometry(width * 0.65, height * 0.22, 0.1);
  const grilleMesh = new THREE.Mesh(grilleGeom, carbonMat);
  grilleMesh.position.set(0, wheelRadius * 0.85, -halfLength * 0.98);
  chassisGroup.add(grilleMesh);

  // Rear Diffuser with aerodynamic strakes
  const diffuserGeom = new THREE.BoxGeometry(width * 0.82, 0.15, 0.28);
  const diffuserMesh = new THREE.Mesh(diffuserGeom, carbonMat);
  diffuserMesh.position.set(0, wheelRadius * 0.68, halfLength * 0.96);
  diffuserMesh.rotation.x = -Math.PI / 18;
  chassisGroup.add(diffuserMesh);

  // Diffuser vertical fins
  for (let i = -2; i <= 2; i++) {
    const finGeom = new THREE.BoxGeometry(0.02, 0.16, 0.28);
    const finMesh = new THREE.Mesh(finGeom, carbonMat);
    finMesh.position.set(i * 0.16, wheelRadius * 0.68, halfLength * 0.96);
    finMesh.rotation.x = -Math.PI / 18;
    chassisGroup.add(finMesh);
  }

  // -------------------------------------------------------------
  // 2. SPOILERS & AERO WINGS PER CAR MODEL
  // -------------------------------------------------------------
  if (config.bodyStyle === '911_gt') {
    // Porsche Swan Neck Carbon Racing Wing
    const strutGeom = new THREE.BoxGeometry(0.03, 0.32, 0.12);
    const strutLeft = new THREE.Mesh(strutGeom, carbonMat);
    strutLeft.position.set(-0.35, height * 0.98, halfLength * 0.85);
    strutLeft.rotation.x = -Math.PI / 14;
    const strutRight = strutLeft.clone();
    strutRight.position.x = 0.35;

    // Wing blade with curved airfoil
    const wingGeom = new THREE.BoxGeometry(width * 0.88, 0.04, 0.28);
    const wingMesh = new THREE.Mesh(wingGeom, carbonMat);
    wingMesh.position.set(0, height * 1.12, halfLength * 0.88);
    wingMesh.rotation.x = Math.PI / 24;

    // Endplates
    const endplateGeom = new THREE.BoxGeometry(0.02, 0.18, 0.34);
    const endplateL = new THREE.Mesh(endplateGeom, bodyMat);
    endplateL.position.set(-width * 0.44, height * 1.12, halfLength * 0.88);
    const endplateR = endplateL.clone();
    endplateR.position.x = width * 0.44;

    chassisGroup.add(strutLeft, strutRight, wingMesh, endplateL, endplateR);
    bodyMeshList.push(endplateL, endplateR);
  } else if (config.bodyStyle === 'muscle_gtr') {
    // High-mount GT carbon wing
    const strutGeom = new THREE.BoxGeometry(0.03, 0.26, 0.08);
    const strutLeft = new THREE.Mesh(strutGeom, carbonMat);
    strutLeft.position.set(-0.42, height * 0.88, halfLength * 0.88);
    const strutRight = strutLeft.clone();
    strutRight.position.x = 0.42;

    const wingGeom = new THREE.BoxGeometry(width * 0.86, 0.04, 0.24);
    const wingMesh = new THREE.Mesh(wingGeom, carbonMat);
    wingMesh.position.set(0, height * 1.0, halfLength * 0.9);
    chassisGroup.add(strutLeft, strutRight, wingMesh);
  } else if (config.bodyStyle === 'flowing_supra') {
    // Integrated aggressive ducktail spoiler lip
    const ducktailGeom = new THREE.BoxGeometry(width * 0.76, 0.08, 0.16);
    const ducktail = new THREE.Mesh(ducktailGeom, carbonMat);
    ducktail.position.set(0, height * 0.74, halfLength * 0.94);
    ducktail.rotation.x = -Math.PI / 8;
    chassisGroup.add(ducktail);
  } else if (config.bodyStyle === 'wedge_v10') {
    // Performante forged carbon active wing
    const wingGeom = new THREE.BoxGeometry(width * 0.92, 0.04, 0.25);
    const wingMesh = new THREE.Mesh(wingGeom, carbonMat);
    wingMesh.position.set(0, height * 0.92, halfLength * 0.86);
    wingMesh.rotation.x = Math.PI / 30;

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.06), carbonMat);
    postL.position.set(-0.45, height * 0.82, halfLength * 0.86);
    const postR = postL.clone();
    postR.position.x = 0.45;
    chassisGroup.add(wingMesh, postL, postR);
  } else {
    // Hyperion retractable active spoiler
    const wingGeom = new THREE.BoxGeometry(width * 0.82, 0.05, 0.22);
    const wingMesh = new THREE.Mesh(wingGeom, carbonMat);
    wingMesh.position.set(0, height * 0.82, halfLength * 0.92);
    chassisGroup.add(wingMesh);
  }

  // -------------------------------------------------------------
  // 3. HEADLIGHTS & TAILLIGHTS
  // -------------------------------------------------------------
  // Headlight Lenses (Glass + Emissive DRL rings)
  const headlightGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16);
  headlightGeom.rotateX(Math.PI / 2);

  const headlightLensL = new THREE.Mesh(headlightGeom, headlightLensMat);
  headlightLensL.position.set(-halfWidth * 0.65, height * 0.6, -halfLength * 0.94);
  headlightLensL.rotation.y = -0.15;

  const headlightLensR = new THREE.Mesh(headlightGeom, headlightLensMat);
  headlightLensR.position.set(halfWidth * 0.65, height * 0.6, -halfLength * 0.94);
  headlightLensR.rotation.y = 0.15;

  chassisGroup.add(headlightLensL, headlightLensR);

  // Spotlights for realistic night road lighting
  const headlightL = new THREE.SpotLight(0xffffff, 4.0, 45, Math.PI / 6, 0.4, 1.2);
  headlightL.position.set(-halfWidth * 0.65, height * 0.6, -halfLength * 0.94);
  const targetL = new THREE.Object3D();
  targetL.position.set(-halfWidth * 0.65, 0, -halfLength - 20);
  root.add(targetL);
  headlightL.target = targetL;
  root.add(headlightL);

  const headlightR = new THREE.SpotLight(0xffffff, 4.0, 45, Math.PI / 6, 0.4, 1.2);
  headlightR.position.set(halfWidth * 0.65, height * 0.6, -halfLength * 0.94);
  const targetR = new THREE.Object3D();
  targetR.position.set(halfWidth * 0.65, 0, -halfLength - 20);
  root.add(targetR);
  headlightR.target = targetR;
  root.add(headlightR);

  // Taillights
  if (config.bodyStyle === 'muscle_gtr') {
    // Quad round taillights
    const roundTailGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16);
    roundTailGeom.rotateX(Math.PI / 2);

    [-0.55, -0.38, 0.38, 0.55].forEach((xPos) => {
      const tailMesh = new THREE.Mesh(roundTailGeom, taillightMat.clone());
      tailMesh.position.set(xPos, height * 0.66, halfLength * 0.98);
      chassisGroup.add(tailMesh);
      taillightMeshList.push(tailMesh);
    });
  } else if (config.bodyStyle === 'hyperion_v16' || config.bodyStyle === '911_gt') {
    // Continuous sleek horizontal LED lightbar
    const barGeom = new THREE.BoxGeometry(width * 0.72, 0.04, 0.04);
    const barMesh = new THREE.Mesh(barGeom, taillightMat.clone());
    barMesh.position.set(0, height * 0.68, halfLength * 0.97);
    chassisGroup.add(barMesh);
    taillightMeshList.push(barMesh);
  } else {
    // Dynamic slit rear lamps
    const tailGeom = new THREE.BoxGeometry(0.24, 0.06, 0.04);
    const leftTail = new THREE.Mesh(tailGeom, taillightMat.clone());
    leftTail.position.set(-halfWidth * 0.68, height * 0.64, halfLength * 0.97);
    leftTail.rotation.z = -0.1;

    const rightTail = new THREE.Mesh(tailGeom, taillightMat.clone());
    rightTail.position.set(halfWidth * 0.68, height * 0.64, halfLength * 0.97);
    rightTail.rotation.z = 0.1;

    chassisGroup.add(leftTail, rightTail);
    taillightMeshList.push(leftTail, rightTail);
  }

  // -------------------------------------------------------------
  // 4. EXHAUSTS & NITRO BACKFIRE FLAMES
  // -------------------------------------------------------------
  const exhaustGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16);
  exhaustGeom.rotateX(Math.PI / 2);

  const exhaustPositions =
    config.bodyStyle === 'wedge_v10'
      ? [-0.14, 0.14] // Center high
      : [-halfWidth * 0.58, halfWidth * 0.58];

  exhaustPositions.forEach((xPos) => {
    const tip = new THREE.Mesh(exhaustGeom, chromeMat);
    tip.position.set(xPos, wheelRadius * 0.66, halfLength * 0.98);
    chassisGroup.add(tip);
    exhaustPipes.push(tip);
  });

  // Nitro Flames Group (hidden by default)
  const nitroFlames = new THREE.Group();
  exhaustPositions.forEach((xPos) => {
    // Inner cyan flame cone
    const innerConeGeom = new THREE.ConeGeometry(0.045, 0.35, 12);
    innerConeGeom.rotateX(-Math.PI / 2);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });
    const innerFlame = new THREE.Mesh(innerConeGeom, innerFlameMat);
    innerFlame.position.set(xPos, wheelRadius * 0.66, halfLength * 1.15);

    // Outer fiery blue/orange halo
    const outerConeGeom = new THREE.ConeGeometry(0.08, 0.5, 12);
    outerConeGeom.rotateX(-Math.PI / 2);
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.5,
    });
    const outerFlame = new THREE.Mesh(outerConeGeom, outerFlameMat);
    outerFlame.position.set(xPos, wheelRadius * 0.66, halfLength * 1.22);

    nitroFlames.add(innerFlame, outerFlame);
  });
  nitroFlames.visible = false;
  chassisGroup.add(nitroFlames);

  // -------------------------------------------------------------
  // 5. WHEELS, RIMS, BRAKES & HUBS
  // -------------------------------------------------------------
  const createWheelAssembly = (isFront: boolean, isLeft: boolean): THREE.Group => {
    const wheelHub = new THREE.Group();
    const spinGroup = new THREE.Group();
    wheelHub.add(spinGroup);

    const tireWidth = isFront ? 0.24 : 0.28;
    const rimRadius = wheelRadius * 0.72;

    // Smooth rounded tire rubber
    const tireGeom = new THREE.CylinderGeometry(
      wheelRadius,
      wheelRadius,
      tireWidth,
      28,
      1,
      false
    );
    tireGeom.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeom, tireRubberMat);
    tireMesh.castShadow = true;
    spinGroup.add(tireMesh);

    // Rim Outer Barrel
    const rimGeom = new THREE.CylinderGeometry(
      rimRadius,
      rimRadius,
      tireWidth * 0.92,
      24,
      1,
      true
    );
    rimGeom.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    spinGroup.add(rimMesh);
    rimMeshList.push(rimMesh);

    // Wheel Spokes (Sporty 5-twin-spoke design)
    const spokeCount = 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * 2 * Math.PI) / spokeCount;
      const spokeGeom = new THREE.BoxGeometry(0.03, rimRadius * 1.6, tireWidth * 0.2);
      const spoke = new THREE.Mesh(spokeGeom, rimMat);
      spoke.rotation.x = angle;
      spoke.position.x = isLeft ? -tireWidth * 0.35 : tireWidth * 0.35;
      spinGroup.add(spoke);
      rimMeshList.push(spoke);
    }

    // Center Hub Cap
    const capGeom = new THREE.CylinderGeometry(rimRadius * 0.25, rimRadius * 0.25, tireWidth * 0.4, 16);
    capGeom.rotateZ(Math.PI / 2);
    const capMesh = new THREE.Mesh(capGeom, chromeMat);
    spinGroup.add(capMesh);

    // Ventilated Brake Rotor Disc
    const rotorGeom = new THREE.CylinderGeometry(rimRadius * 0.82, rimRadius * 0.82, 0.02, 24);
    rotorGeom.rotateZ(Math.PI / 2);
    const rotorMesh = new THREE.Mesh(rotorGeom, brakeRotorMat);
    spinGroup.add(rotorMesh);

    // Sports Brake Caliper (Stationary with hub, not spinning with wheel!)
    const caliperGeom = new THREE.BoxGeometry(0.06, rimRadius * 0.45, 0.12);
    const caliperMesh = new THREE.Mesh(caliperGeom, caliperMat);
    caliperMesh.position.set(
      isLeft ? -tireWidth * 0.15 : tireWidth * 0.15,
      rimRadius * 0.52,
      0
    );
    caliperMesh.rotation.z = isLeft ? -0.2 : 0.2;
    wheelHub.add(caliperMesh);
    caliperMeshList.push(caliperMesh);

    return wheelHub;
  };

  const frontLeftWheel = createWheelAssembly(true, true);
  frontLeftWheel.position.set(-trackWidth / 2, wheelRadius, -wheelbase / 2);

  const frontRightWheel = createWheelAssembly(true, false);
  frontRightWheel.position.set(trackWidth / 2, wheelRadius, -wheelbase / 2);

  const rearLeftWheel = createWheelAssembly(false, true);
  rearLeftWheel.position.set(-trackWidth / 2, wheelRadius, wheelbase / 2);

  const rearRightWheel = createWheelAssembly(false, false);
  rearRightWheel.position.set(trackWidth / 2, wheelRadius, wheelbase / 2);

  root.add(frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel);

  // -------------------------------------------------------------
  // 6. UNDERGLOW NEON LIGHTING
  // -------------------------------------------------------------
  let underglowLight: THREE.PointLight | null = null;
  let underglowMesh: THREE.Mesh | null = null;

  if (customization.underglowColor) {
    const underglowColorObj = new THREE.Color(customization.underglowColor);
    underglowLight = new THREE.PointLight(underglowColorObj, 2.5, 4.0, 1.8);
    underglowLight.position.set(0, 0.08, 0);
    root.add(underglowLight);

    const glowPlaneGeom = new THREE.PlaneGeometry(width * 0.8, length * 0.7);
    glowPlaneGeom.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: underglowColorObj,
      transparent: true,
      opacity: 0.65,
    });
    underglowMesh = new THREE.Mesh(glowPlaneGeom, glowMat);
    underglowMesh.position.y = 0.04;
    root.add(underglowMesh);
  }

  // -------------------------------------------------------------
  // CONTROLLER METHODS
  // -------------------------------------------------------------
  const updateCustomization = (newCust: CarCustomization) => {
    const colorObj = new THREE.Color(newCust.bodyColor);
    const props = getBodyMaterialProps(newCust.finish);

    bodyMeshList.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat && mat.color) {
        mat.color.copy(colorObj);
        Object.assign(mat, props);
        mat.needsUpdate = true;
      }
    });

    const rimColorObj = new THREE.Color(newCust.rimColor);
    rimMeshList.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.copy(rimColorObj);
        mat.needsUpdate = true;
      }
    });

    const caliperColorObj = new THREE.Color(newCust.caliperColor);
    caliperMeshList.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.copy(caliperColorObj);
        mat.needsUpdate = true;
      }
    });

    const windowOp = getWindowOpacity(newCust.windowTint);
    windowMeshList.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        mat.opacity = windowOp;
        mat.needsUpdate = true;
      }
    });

    // Update Underglow
    if (newCust.underglowColor) {
      const uColor = new THREE.Color(newCust.underglowColor);
      if (!underglowLight) {
        underglowLight = new THREE.PointLight(uColor, 2.5, 4.0, 1.8);
        underglowLight.position.set(0, 0.08, 0);
        root.add(underglowLight);

        const glowPlaneGeom = new THREE.PlaneGeometry(width * 0.8, length * 0.7);
        glowPlaneGeom.rotateX(-Math.PI / 2);
        const glowMat = new THREE.MeshBasicMaterial({
          color: uColor,
          transparent: true,
          opacity: 0.65,
        });
        underglowMesh = new THREE.Mesh(glowPlaneGeom, glowMat);
        underglowMesh.position.y = 0.04;
        root.add(underglowMesh);
      } else {
        underglowLight.color.copy(uColor);
        underglowLight.visible = true;
        if (underglowMesh) {
          (underglowMesh.material as THREE.MeshBasicMaterial).color.copy(uColor);
          underglowMesh.visible = true;
        }
      }
    } else {
      if (underglowLight) underglowLight.visible = false;
      if (underglowMesh) underglowMesh.visible = false;
    }
  };

  const setBraking = (isBraking: boolean) => {
    const intensity = isBraking ? 2.5 : 0.6;
    taillightMeshList.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = intensity;
      }
    });
  };

  const setReverse = (isReverse: boolean) => {
    // Reverse light intensity
    reverseLightMat.emissiveIntensity = isReverse ? 1.5 : 0;
  };

  const setNitro = (isNitro: boolean) => {
    nitroFlames.visible = isNitro;
  };

  const setSteerAngle = (angleRad: number) => {
    frontLeftWheel.rotation.y = angleRad;
    frontRightWheel.rotation.y = angleRad;
  };

  const spinWheels = (distanceDelta: number) => {
    // rotation in radians = distance / radius
    const rotationDelta = distanceDelta / wheelRadius;
    [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel].forEach((hub) => {
      const spinGroup = hub.children[0];
      if (spinGroup) {
        spinGroup.rotation.x += rotationDelta;
      }
    });
  };

  return {
    root,
    bodyMeshList,
    rimMeshList,
    caliperMeshList,
    windowMeshList,
    underglowLight,
    underglowMesh,
    headlightL,
    headlightR,
    headlightLensL,
    headlightLensR,
    taillightMeshList,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    exhaustPipes,
    nitroFlames,
    config,
    updateCustomization,
    setBraking,
    setReverse,
    setNitro,
    setSteerAngle,
    spinWheels,
  };
}
