import * as THREE from 'three';
import { TrackConfig } from '../types/game';

export interface CheckpointGate {
  index: number;
  position: THREE.Vector3;
  forward: THREE.Vector3;
  width: number;
  passed: boolean;
}

export interface TrackScene {
  root: THREE.Group;
  checkpoints: CheckpointGate[];
  spline: THREE.CatmullRomCurve3;
  totalLength: number;
  addSkidMark: (posL: THREE.Vector3, posR: THREE.Vector3, opacity: number) => void;
  spawnSmoke: (pos: THREE.Vector3, velocity: THREE.Vector3, size: number) => void;
  updateParticles: (dt: number) => void;
  dispose: () => void;
}

interface SmokeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  initialSize: number;
}

// Helper to create city skyscraper facade textures with glowing windows
function createBuildingTexture(type: 'cyan_corporate' | 'warm_apartment' | 'cyber_neon'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark facade base
    ctx.fillStyle = type === 'cyber_neon' ? '#252d38' : '#343d48';
    ctx.fillRect(0, 0, 256, 512);

    // Architectural column dividers
    ctx.fillStyle = '#46515e';
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 4, 512);
    }
    // Floor slabs
    for (let y = 0; y < 512; y += 24) {
      ctx.fillRect(0, y, 256, 3);
    }

    // Windows with varied illumination
    const cols = 8;
    const rows = 21;
    const winW = 20;
    const winH = 15;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * 32 + 6;
        const wy = r * 24 + 5;
        const rand = Math.random();

        if (rand > 0.42) {
          // Lit window
          if (type === 'cyan_corporate') {
            const isWhite = rand > 0.78;
            ctx.fillStyle = isWhite ? '#e0f2fe' : '#38bdf8';
          } else if (type === 'warm_apartment') {
            const isGold = rand > 0.75;
            ctx.fillStyle = isGold ? '#fef08a' : '#f59e0b';
          } else {
            // cyber neon
            const isPink = rand > 0.8;
            ctx.fillStyle = isPink ? '#f43f5e' : '#06b6d4';
          }
          ctx.fillRect(wx, wy, winW, winH);
        } else {
          // Unlit/dark interior
          ctx.fillStyle = '#26313c';
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }

    // Ground floor illuminated glass entrance
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 480, 224, 30);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(20, 484, 216, 26);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Helper to create glowing neon billboards
function createBillboardTexture(title: string, subtitle: string, accentColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark background with gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(0.5, '#18181b');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 240);

    // Subtle neon grid in background
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Title
    ctx.font = '900 44px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 18;
    ctx.fillText(title, 256, 110);

    // Subtitle
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = accentColor;
    ctx.shadowBlur = 12;
    ctx.fillText(subtitle, 256, 170);

    // Japanese or decorative tag
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#a1a1aa';
    ctx.shadowBlur = 0;
    ctx.fillText('TOKYO MIDNIGHT RACING // APEX MOTORSPORT', 256, 215);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// Helper to create highway overhead destination signs
function createHighwaySignTexture(destination: string, note: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Green highway sign background
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 160);

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 148);

    // Arrows and text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⬆ ${destination}`, 256, 75);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(note, 256, 125);
  }
  return new THREE.CanvasTexture(canvas);
}

// Helper to create illuminated turn chevron signs (<<< or >>>)
function createChevronTexture(direction: 'left' | 'right'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 256, 128);

    ctx.fillStyle = '#facc15'; // fluorescent caution yellow
    const arrow = direction === 'left' ? '◀ ◀ ◀' : '▶ ▶ ▶';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(arrow, 128, 86);
  }
  return new THREE.CanvasTexture(canvas);
}

export function buildTrack(trackConfig: TrackConfig): TrackScene {
  const root = new THREE.Group();
  root.name = `track_${trackConfig.id}`;

  const checkpoints: CheckpointGate[] = [];

  // -------------------------------------------------------------
  // 1. TRACK CONTROL POINTS
  // -------------------------------------------------------------
  let controlPoints: THREE.Vector3[] = [];

  if (trackConfig.environment === 'tokyo_night') {
    // High-speed expressway through city streets and skyscrapers
    controlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -220),
      new THREE.Vector3(60, 0, -420),
      new THREE.Vector3(180, 0, -560),
      new THREE.Vector3(340, 0, -600),
      new THREE.Vector3(500, 0, -520),
      new THREE.Vector3(580, 0, -360),
      new THREE.Vector3(520, 0, -180),
      new THREE.Vector3(380, 0, -80),
      new THREE.Vector3(220, 0, -60),
      new THREE.Vector3(120, 0, 100),
      new THREE.Vector3(20, 0, 160),
      new THREE.Vector3(-140, 0, 140),
      new THREE.Vector3(-220, 0, 40),
      new THREE.Vector3(-180, 0, -80),
      new THREE.Vector3(-80, 0, -60),
    ];
  } else if (trackConfig.environment === 'sunset_touge') {
    // Winding mountain touge with multiple hairpin corners
    controlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -160),
      new THREE.Vector3(-80, 2, -260),
      new THREE.Vector3(-190, 4, -280),
      new THREE.Vector3(-240, 6, -200),
      new THREE.Vector3(-180, 8, -120),
      new THREE.Vector3(-60, 10, -80),
      new THREE.Vector3(60, 12, -40),
      new THREE.Vector3(180, 14, -80),
      new THREE.Vector3(260, 16, -180),
      new THREE.Vector3(240, 18, -300),
      new THREE.Vector3(120, 16, -400),
      new THREE.Vector3(-20, 12, -460),
      new THREE.Vector3(-160, 8, -480),
      new THREE.Vector3(-280, 4, -420),
      new THREE.Vector3(-320, 2, -280),
      new THREE.Vector3(-240, 0, -80),
      new THREE.Vector3(-120, 0, 60),
    ];
  } else {
    // Apex Grand Prix Arena
    controlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -280),
      new THREE.Vector3(90, 0, -440),
      new THREE.Vector3(220, 0, -480),
      new THREE.Vector3(320, 0, -400),
      new THREE.Vector3(280, 0, -280),
      new THREE.Vector3(160, 0, -220),
      new THREE.Vector3(220, 0, -120),
      new THREE.Vector3(320, 0, -80),
      new THREE.Vector3(420, 0, 40),
      new THREE.Vector3(360, 0, 180),
      new THREE.Vector3(180, 0, 220),
      new THREE.Vector3(0, 0, 160),
      new THREE.Vector3(-120, 0, 80),
    ];
  }

  const spline = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');
  const totalLength = spline.getLength();
  const roadWidth = 14.0;
  const halfRoad = roadWidth / 2;

  // -------------------------------------------------------------
  // 2. SKY DOME WITH CITY TWILIGHT / NIGHT HORIZON & STARS
  // -------------------------------------------------------------
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const sctx = skyCanvas.getContext('2d');
  if (sctx) {
    // Rich vertical gradient: Dark navy zenith -> Indigo mid-sky -> Glowing twilight / city horizon
    const grad = sctx.createLinearGradient(0, 0, 0, 512);
    if (trackConfig.environment === 'sunset_touge') {
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.35, '#581c87');
      grad.addColorStop(0.65, '#c2410c');
      grad.addColorStop(1, '#fbbf24');
    } else {
      // City night / Tokyo neon expressway
      // Bright blue-hour sky: keep the city visible instead of rendering a nearly black world.
      grad.addColorStop(0, '#2d5279');
      grad.addColorStop(0.35, '#5788b5');
      grad.addColorStop(0.68, '#9bbbd5');
      grad.addColorStop(0.88, '#e3bfa0');
      grad.addColorStop(1, '#f1d6b5');
    }
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 512, 512);

    // Stars on upper portion
    sctx.fillStyle = '#ffffff';
    for (let st = 0; st < 350; st++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 300;
      const r = Math.random() * 1.5;
      sctx.globalAlpha = 0.3 + Math.random() * 0.7;
      sctx.fillRect(sx, sy, r, r);
    }
    sctx.globalAlpha = 1.0;
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeom = new THREE.SphereGeometry(750, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const skyMesh = new THREE.Mesh(skyGeom, skyMat);
  skyMesh.position.set(150, 50, -200);
  root.add(skyMesh);

  // -------------------------------------------------------------
  // 3. MASSIVE URBAN GROUND TERRAIN
  // -------------------------------------------------------------
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 1024;
  groundCanvas.height = 1024;
  const gctx = groundCanvas.getContext('2d');
  if (gctx) {
    if (trackConfig.environment === 'sunset_touge') {
      // Mountain canyon soil
      gctx.fillStyle = '#292524';
      gctx.fillRect(0, 0, 1024, 1024);
      gctx.fillStyle = '#1c1917';
      for (let i = 0; i < 4000; i++) {
        gctx.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 3);
      }
    } else {
      // High-detail urban city asphalt terrain
      gctx.fillStyle = '#555e69';
      gctx.fillRect(0, 0, 1024, 1024);

      // City blocks grid pattern
      gctx.strokeStyle = '#78818a';
      gctx.lineWidth = 12;
      for (let x = 0; x <= 1024; x += 128) {
        gctx.beginPath();
        gctx.moveTo(x, 0);
        gctx.lineTo(x, 1024);
        gctx.stroke();
      }
      for (let y = 0; y <= 1024; y += 128) {
        gctx.beginPath();
        gctx.moveTo(0, y);
        gctx.lineTo(1024, y);
        gctx.stroke();
      }

      // Concrete pavement pavers inside blocks
      gctx.fillStyle = '#69737d';
      for (let bx = 16; bx < 1024; bx += 128) {
        for (let by = 16; by < 1024; by += 128) {
          gctx.fillRect(bx, by, 96, 96);
        }
      }

      // Urban crosswalks and lane stripes on city grid
      gctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      for (let x = 64; x < 1024; x += 128) {
        for (let y = 0; y < 1024; y += 16) {
          gctx.fillRect(x - 2, y, 4, 8);
        }
      }
    }
  }

  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(24, 24);

  const groundGeom = new THREE.PlaneGeometry(2400, 2400);
  groundGeom.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.85,
    metalness: 0.15,
  });
  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.y = -0.06;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // -------------------------------------------------------------
  // 4. BUILD ROAD & SIDEWALK RIBBON GEOMETRY
  // -------------------------------------------------------------
  const numSteps = 550;
  const trackPositions: number[] = [];
  const trackNormals: number[] = [];
  const trackUvs: number[] = [];
  const trackIndices: number[] = [];

  // Kerb Rumble Strips
  const kerbLPositions: number[] = [];
  const kerbRPositions: number[] = [];
  const kerbIndices: number[] = [];

  // Concrete Sidewalks
  const walkLPositions: number[] = [];
  const walkRPositions: number[] = [];
  const walkIndices: number[] = [];

  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const pt = spline.getPointAt(t);
    const tangent = spline.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

    points.push(pt);
    tangents.push(tangent);
    binormals.push(binormal);
    normals.push(normal);

    // Road edges
    const leftEdge = pt.clone().addScaledVector(binormal, -halfRoad);
    const rightEdge = pt.clone().addScaledVector(binormal, halfRoad);

    trackPositions.push(leftEdge.x, leftEdge.y, leftEdge.z);
    trackPositions.push(rightEdge.x, rightEdge.y, rightEdge.z);

    trackNormals.push(normal.x, normal.y, normal.z);
    trackNormals.push(normal.x, normal.y, normal.z);

    const uvV = (t * totalLength) / 6.0;
    trackUvs.push(0, uvV);
    trackUvs.push(1, uvV);

    // Rumble kerbs
    const kerbWidth = 1.2;
    const kerbOuterL = leftEdge.clone().addScaledVector(binormal, -kerbWidth);
    kerbOuterL.y += 0.06;
    kerbLPositions.push(kerbOuterL.x, kerbOuterL.y, kerbOuterL.z);
    kerbLPositions.push(leftEdge.x, leftEdge.y, leftEdge.z);

    const kerbOuterR = rightEdge.clone().addScaledVector(binormal, kerbWidth);
    kerbOuterR.y += 0.06;
    kerbRPositions.push(rightEdge.x, rightEdge.y, rightEdge.z);
    kerbRPositions.push(kerbOuterR.x, kerbOuterR.y, kerbOuterR.z);

    // Concrete Sidewalks flanking kerbs
    const walkWidth = 3.2;
    const walkOuterL = kerbOuterL.clone().addScaledVector(binormal, -walkWidth);
    walkOuterL.y += 0.08;
    walkLPositions.push(walkOuterL.x, walkOuterL.y, walkOuterL.z);
    walkLPositions.push(kerbOuterL.x, kerbOuterL.y, kerbOuterL.z);

    const walkOuterR = kerbOuterR.clone().addScaledVector(binormal, walkWidth);
    walkOuterR.y += 0.08;
    walkRPositions.push(kerbOuterR.x, kerbOuterR.y, kerbOuterR.z);
    walkRPositions.push(walkOuterR.x, walkOuterR.y, walkOuterR.z);

    if (i < numSteps) {
      const baseIdx = i * 2;
      trackIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      trackIndices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);

      kerbIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      kerbIndices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);

      walkIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      walkIndices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    }
  }

  // Road Asphalt Material with markings
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d');
  if (rctx) {
    rctx.fillStyle = '#424b55';
    rctx.fillRect(0, 0, 512, 512);

    // Grain
    for (let g = 0; g < 4000; g++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const val = 24 + Math.floor(Math.random() * 26);
      rctx.fillStyle = `rgb(${val}, ${val}, ${val + 5})`;
      rctx.fillRect(rx, ry, 2, 2);
    }

    // Outer white lines
    rctx.fillStyle = '#f8fafc';
    rctx.fillRect(20, 0, 8, 512);
    rctx.fillRect(484, 0, 8, 512);

    // Dashed center divider
    rctx.fillStyle = '#fbbf24';
    for (let y = 0; y < 512; y += 64) {
      rctx.fillRect(252, y, 8, 38);
    }
  }

  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, totalLength / 18);

  const roadGeom = new THREE.BufferGeometry();
  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(trackPositions, 3));
  roadGeom.setAttribute('normal', new THREE.Float32BufferAttribute(trackNormals, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  roadGeom.setIndex(trackIndices);
  roadGeom.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.65,
    metalness: 0.15,
  });

  const roadMesh = new THREE.Mesh(roadGeom, roadMat);
  roadMesh.receiveShadow = true;
  root.add(roadMesh);

  // Kerb texture (Red and White)
  const kerbCanvas = document.createElement('canvas');
  kerbCanvas.width = 64;
  kerbCanvas.height = 128;
  const kctx = kerbCanvas.getContext('2d');
  if (kctx) {
    kctx.fillStyle = '#dc2626';
    kctx.fillRect(0, 0, 64, 64);
    kctx.fillStyle = '#ffffff';
    kctx.fillRect(0, 64, 64, 64);
  }
  const kerbTex = new THREE.CanvasTexture(kerbCanvas);
  kerbTex.wrapS = THREE.RepeatWrapping;
  kerbTex.wrapT = THREE.RepeatWrapping;
  kerbTex.repeat.set(1, totalLength / 6);

  const kerbMat = new THREE.MeshStandardMaterial({
    map: kerbTex,
    roughness: 0.5,
    metalness: 0.2,
  });

  const kerbLGeom = new THREE.BufferGeometry();
  kerbLGeom.setAttribute('position', new THREE.Float32BufferAttribute(kerbLPositions, 3));
  kerbLGeom.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  kerbLGeom.setIndex(kerbIndices);
  kerbLGeom.computeVertexNormals();
  root.add(new THREE.Mesh(kerbLGeom, kerbMat));

  const kerbRGeom = new THREE.BufferGeometry();
  kerbRGeom.setAttribute('position', new THREE.Float32BufferAttribute(kerbRPositions, 3));
  kerbRGeom.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  kerbRGeom.setIndex(kerbIndices);
  kerbRGeom.computeVertexNormals();
  root.add(new THREE.Mesh(kerbRGeom, kerbMat));

  // Sidewalks Material (Light urban granite pavers)
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.7,
    metalness: 0.1,
  });

  const walkLGeom = new THREE.BufferGeometry();
  walkLGeom.setAttribute('position', new THREE.Float32BufferAttribute(walkLPositions, 3));
  walkLGeom.setIndex(walkIndices);
  walkLGeom.computeVertexNormals();
  root.add(new THREE.Mesh(walkLGeom, sidewalkMat));

  const walkRGeom = new THREE.BufferGeometry();
  walkRGeom.setAttribute('position', new THREE.Float32BufferAttribute(walkRPositions, 3));
  walkRGeom.setIndex(walkIndices);
  walkRGeom.computeVertexNormals();
  root.add(new THREE.Mesh(walkRGeom, sidewalkMat));

  // -------------------------------------------------------------
  // 5. GUARDRAILS & MODERN METALLIC BARRIERS
  // -------------------------------------------------------------
  const railGeom = new THREE.BoxGeometry(0.18, 0.85, 4.0);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.85,
  });

  const barrierStep = 18;
  for (let i = 0; i < numSteps; i += barrierStep) {
    const pt = points[i];
    const binormal = binormals[i];
    const tangent = tangents[i];
    const yaw = Math.atan2(tangent.x, tangent.z);

    const bLeft = new THREE.Mesh(railGeom, railMat);
    bLeft.position.copy(pt).addScaledVector(binormal, -halfRoad - 4.4);
    bLeft.position.y += 0.55;
    bLeft.rotation.y = yaw;
    root.add(bLeft);

    const bRight = new THREE.Mesh(railGeom, railMat);
    bRight.position.copy(pt).addScaledVector(binormal, halfRoad + 4.4);
    bRight.position.y += 0.55;
    bRight.rotation.y = yaw;
    root.add(bRight);
  }

  // -------------------------------------------------------------
  // 6. START / FINISH GANTRY ARCH & DIGITAL BANNER
  // -------------------------------------------------------------
  const startPt = points[0];
  const startBinormal = binormals[0];
  const startTangent = tangents[0];
  const startYaw = Math.atan2(startTangent.x, startTangent.z);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startPt);
  gantryGroup.rotation.y = startYaw;

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 });
  const pillarGeom = new THREE.BoxGeometry(1.0, 7.5, 1.0);
  const leftPillar = new THREE.Mesh(pillarGeom, pillarMat);
  leftPillar.position.set(-halfRoad - 4.5, 3.75, 0);

  const rightPillar = new THREE.Mesh(pillarGeom, pillarMat);
  rightPillar.position.set(halfRoad + 4.5, 3.75, 0);

  const beamGeom = new THREE.BoxGeometry(roadWidth + 10.5, 1.8, 1.4);
  const beamMesh = new THREE.Mesh(beamGeom, pillarMat);
  beamMesh.position.set(0, 7.0, 0);

  // Digital start/finish banner
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 512;
  bannerCanvas.height = 128;
  const bctx = bannerCanvas.getContext('2d');
  if (bctx) {
    bctx.fillStyle = '#09090b';
    bctx.fillRect(0, 0, 512, 128);

    // Checkered edges
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        if ((row + col) % 2 === 0) {
          bctx.fillStyle = '#ffffff';
          bctx.fillRect(col * 16, row * 32, 16, 32);
          bctx.fillRect(416 + col * 16, row * 32, 16, 32);
        }
      }
    }

    bctx.fillStyle = '#38bdf8';
    bctx.font = '900 40px sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('★ APEX CITY CIRCUIT ★', 256, 55);

    bctx.fillStyle = '#facc15';
    bctx.font = 'bold 26px sans-serif';
    bctx.fillText('START / FINISH LINE', 256, 95);
  }
  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth * 1.1, 1.8), bannerMat);
  bannerMesh.position.set(0, 7.0, 0.72);

  gantryGroup.add(leftPillar, rightPillar, beamMesh, bannerMesh);
  root.add(gantryGroup);

  // Checkered start/finish line on road
  const lineGeom = new THREE.PlaneGeometry(roadWidth, 2.0);
  lineGeom.rotateX(-Math.PI / 2);
  const startLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const startLineMesh = new THREE.Mesh(lineGeom, startLineMat);
  startLineMesh.position.copy(startPt);
  startLineMesh.position.y += 0.03;
  startLineMesh.rotation.y = startYaw;
  root.add(startLineMesh);

  // -------------------------------------------------------------
  // 7. CHECKPOINT GATES
  // -------------------------------------------------------------
  const cpCount = trackConfig.checkpointCount;
  for (let c = 0; c < cpCount; c++) {
    const fraction = c / cpCount;
    const cpPos = spline.getPointAt(fraction);
    const cpTangent = spline.getTangentAt(fraction).normalize();

    checkpoints.push({
      index: c,
      position: cpPos,
      forward: cpTangent,
      width: roadWidth + 6,
      passed: false,
    });
  }

  // -------------------------------------------------------------
  // 8. RICH 3D CITY ENVIRONMENT (SKYSCRAPERS, NEON BILLBOARDS & LIGHTS)
  // -------------------------------------------------------------
  if (trackConfig.environment === 'tokyo_night' || trackConfig.environment === 'grand_prix') {
    // Generate reusable skyscraper facade materials
    const texCorporate = createBuildingTexture('cyan_corporate');
    const texApartment = createBuildingTexture('warm_apartment');
    const texNeon = createBuildingTexture('cyber_neon');

    const matCorporate = new THREE.MeshStandardMaterial({
      map: texCorporate,
      roughness: 0.3,
      metalness: 0.7,
    });
    const matApartment = new THREE.MeshStandardMaterial({
      map: texApartment,
      roughness: 0.4,
      metalness: 0.5,
    });
    const matNeon = new THREE.MeshStandardMaterial({
      map: texNeon,
      roughness: 0.25,
      metalness: 0.75,
    });

    const buildingMaterials = [matCorporate, matApartment, matNeon];

    // Red rooftop aviation hazard beacons
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beaconGeom = new THREE.SphereGeometry(0.8, 8, 8);

    // 1. NEARBY & MID-RANGE CITY SKYSCRAPERS (110+ buildings)
    const buildingCount = 120;
    for (let b = 0; b < buildingCount; b++) {
      const bWidth = 28 + (b % 7) * 6;
      const bHeight = 45 + ((b * 13) % 110) + ((b % 5) === 0 ? 55 : 0); // Varied heights up to 180m!
      const bDepth = 26 + (b % 5) * 8;

      const geom = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const chosenMat = buildingMaterials[b % buildingMaterials.length];
      const building = new THREE.Mesh(geom, chosenMat);

      // Distribute in concentric rings around track
      const angle = (b / buildingCount) * Math.PI * 2 + (b % 3) * 0.1;
      const distanceTier = b % 4;
      let dist = 38; // Close to track
      if (distanceTier === 1) dist = 75;
      else if (distanceTier === 2) dist = 140;
      else if (distanceTier === 3) dist = 220;

      // Track center offset
      const cx = 160;
      const cz = -200;
      const posX = Math.cos(angle) * dist * 1.5 + cx + ((b % 9) - 4) * 18;
      const posZ = Math.sin(angle) * dist * 1.3 + cz + ((b % 7) - 3) * 18;

      building.position.set(posX, bHeight / 2 - 0.5, posZ);
      building.rotation.y = (b * 0.45) % (Math.PI * 2);
      root.add(building);

      // Rooftop spire & red aviation beacon on tall towers
      if (bHeight > 90) {
        const spireGeom = new THREE.CylinderGeometry(0.15, 0.6, 14, 8);
        const spireMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
        const spire = new THREE.Mesh(spireGeom, spireMat);
        spire.position.set(posX, bHeight + 7, posZ);
        root.add(spire);

        const beacon = new THREE.Mesh(beaconGeom, beaconMat);
        beacon.position.set(posX, bHeight + 14.5, posZ);
        root.add(beacon);
      }
    }

    // 2. GIANT NEON HIGHWAY BILLBOARDS (Placed beside major bends and straightaways)
    const billboardAds = [
      { title: 'APEX RACING', sub: 'DRIFT CHAMPIONSHIP', color: '#06b6d4' },
      { title: 'TOKYO OVERDRIVE', sub: 'MIDNIGHT TOUGE', color: '#ec4899' },
      { title: 'NITRO BOOST', sub: '100% PURE ADRENALINE', color: '#38bdf8' },
      { title: 'SHIBUYA STREETS', sub: 'NEO METROPOLIS', color: '#f59e0b' },
      { title: 'TURBO HYPERSPORT', sub: 'UNLEASH THE POWER', color: '#22c55e' },
      { title: 'CYBER DRIFT', sub: 'NO LIMITS V8', color: '#a855f7' },
    ];

    const billboardStep = Math.floor(numSteps / (billboardAds.length + 1));
    for (let bb = 0; bb < billboardAds.length; bb++) {
      const ptIdx = (bb * billboardStep + 30) % numSteps;
      const pt = points[ptIdx];
      const binormal = binormals[ptIdx];
      const tangent = tangents[ptIdx];
      const yaw = Math.atan2(tangent.x, tangent.z);

      const adData = billboardAds[bb];
      const bbTex = createBillboardTexture(adData.title, adData.sub, adData.color);
      const bbMat = new THREE.MeshBasicMaterial({ map: bbTex });

      // Truss frame
      const frameGroup = new THREE.Group();
      frameGroup.position.copy(pt).addScaledVector(binormal, halfRoad + 14);
      frameGroup.position.y += 8.5;
      frameGroup.rotation.y = yaw - Math.PI / 2;

      // Board
      const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), bbMat);
      // Double sided backing
      const backMesh = new THREE.Mesh(
        new THREE.BoxGeometry(16.2, 8.2, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 })
      );
      backMesh.position.z = -0.21;

      // Steel support poles
      const postGeom = new THREE.CylinderGeometry(0.35, 0.35, 12, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
      const postL = new THREE.Mesh(postGeom, postMat);
      postL.position.set(-5.5, -4, 0);
      const postR = new THREE.Mesh(postGeom, postMat);
      postR.position.set(5.5, -4, 0);

      frameGroup.add(boardMesh, backMesh, postL, postR);
      root.add(frameGroup);
    }

    // 3. OVERHEAD HIGHWAY DESTINATION GANTRIES (Green/Blue freeway signs)
    const gantrySigns = [
      { dest: 'DOWNTOWN / SHIBUYA', note: 'FAIXA EXPRESSA DA CIDADE' },
      { dest: 'TUNNEL / BAY BRIDGE', note: 'CURVA FECHADA A 200M' },
      { dest: 'TOKYO TOWER LOOP', note: 'RADAR VELOCIDADE: 320 KM/H' },
    ];

    gantrySigns.forEach((sign, sIdx) => {
      const idx = Math.floor((sIdx + 1) * (numSteps / (gantrySigns.length + 1)));
      const pt = points[idx];
      const binormal = binormals[idx];
      const tangent = tangents[idx];
      const yaw = Math.atan2(tangent.x, tangent.z);

      const gantryObj = new THREE.Group();
      gantryObj.position.copy(pt);
      gantryObj.rotation.y = yaw;

      const pGeom = new THREE.BoxGeometry(0.7, 8.0, 0.7);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const pL = new THREE.Mesh(pGeom, pMat);
      pL.position.set(-halfRoad - 4.2, 4.0, 0);
      const pR = new THREE.Mesh(pGeom, pMat);
      pR.position.set(halfRoad + 4.2, 4.0, 0);

      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 9.5, 1.2, 0.8), pMat);
      crossBeam.position.set(0, 7.5, 0);

      const signTex = createHighwaySignTexture(sign.dest, sign.note);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(10.5, 3.2),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      signMesh.position.set(0, 7.5, 0.42);

      gantryObj.add(pL, pR, crossBeam, signMesh);
      root.add(gantryObj);
    });

    // 4. CURVED HIGHWAY STREET LIGHTS (Spaced every 16 steps along the road)
    const poleGeom = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const lampCapGeom = new THREE.SphereGeometry(0.35, 12, 8);
    const lampCapMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // glowing warm amber

    for (let i = 0; i < numSteps; i += 16) {
      const pt = points[i];
      const binormal = binormals[i];

      // Left streetlight
      const poleL = new THREE.Mesh(poleGeom, poleMat);
      poleL.position.copy(pt).addScaledVector(binormal, -halfRoad - 3.8);
      poleL.position.y += 3.75;
      const lampL = new THREE.Mesh(lampCapGeom, lampCapMat);
      lampL.position.copy(poleL.position);
      lampL.position.y += 3.8;
      lampL.position.addScaledVector(binormal, 1.2); // arch over road

      root.add(poleL, lampL);

      // Add actual lighting every other pole for good performance & realistic road illumination
      if (i % 32 === 0) {
        const streetLight = new THREE.PointLight(0xfef08a, 0.85, 24, 2);
        streetLight.position.copy(lampL.position);
        root.add(streetLight);
      }
    }

    // 5. CAUTION CHEVRON DIRECTIONAL SIGNS ON SHARP TURNS (<<< and >>>)
    const chevronLTex = createChevronTexture('left');
    const chevronRTex = createChevronTexture('right');
    const chevMatL = new THREE.MeshBasicMaterial({ map: chevronLTex });
    const chevMatR = new THREE.MeshBasicMaterial({ map: chevronRTex });

    // Detect high curvature segments to place turn indicator chevrons
    for (let i = 15; i < numSteps - 15; i += 30) {
      const tPrev = tangents[i - 5];
      const tNext = tangents[i + 5];
      const turnAngle = tPrev.angleTo(tNext);

      if (turnAngle > 0.18) {
        const pt = points[i];
        const binormal = binormals[i];
        const tangent = tangents[i];
        const yaw = Math.atan2(tangent.x, tangent.z);

        // Cross product determines if turning left or right
        const cross = tPrev.clone().cross(tNext);
        const isTurnLeft = cross.y > 0;

        const chevMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 1.8),
          isTurnLeft ? chevMatL : chevMatR
        );
        // Place on outside barrier
        const offsetSide = isTurnLeft ? 1 : -1;
        chevMesh.position.copy(pt).addScaledVector(binormal, offsetSide * (halfRoad + 3.8));
        chevMesh.position.y += 1.6;
        chevMesh.rotation.y = yaw;
        root.add(chevMesh);
      }
    }

    // 6. URBAN SIDEWALK TREES IN CONCRETE PLANTERS
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2e22 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    for (let i = 8; i < numSteps; i += 28) {
      const pt = points[i];
      const binormal = binormals[i];

      const treeGroup = new THREE.Group();
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), planterMat);
      planter.position.y = 0.25;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.2, 8), trunkMat);
      trunk.position.y = 2.0;

      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), foliageMat);
      foliage.position.y = 4.2;

      treeGroup.add(planter, trunk, foliage);
      treeGroup.position.copy(pt).addScaledVector(binormal, halfRoad + 3.4);
      root.add(treeGroup);
    }
  } else if (trackConfig.environment === 'sunset_touge') {
    // Mountain Touge Rocks and Pine Trees
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });
    for (let r = 0; r < 50; r++) {
      const rockRadius = 16 + Math.random() * 32;
      const rockGeom = new THREE.DodecahedronGeometry(rockRadius, 1);
      const rock = new THREE.Mesh(rockGeom, rockMat);
      const angle = (r / 50) * Math.PI * 2;
      const dist = 100 + Math.random() * 180;
      rock.position.set(
        Math.cos(angle) * dist - 80,
        rockRadius * 0.4,
        Math.sin(angle) * dist - 200
      );
      root.add(rock);
    }

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d });
    for (let t = 0; t < 120; t++) {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 8), trunkMat);
      trunk.position.y = 2;
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(3.8, 9, 8), foliageMat);
      foliage.position.y = 7.5;
      treeGroup.add(trunk, foliage);

      const angle = (t / 120) * Math.PI * 2;
      const dist = 35 + Math.random() * 200;
      treeGroup.position.set(
        Math.cos(angle) * dist - 50,
        0,
        Math.sin(angle) * dist - 200
      );
      root.add(treeGroup);
    }
  }

  // -------------------------------------------------------------
  // 9. DYNAMIC TIRE SKID MARKS SYSTEM
  // -------------------------------------------------------------
  const maxSkidSegments = 600;
  const skidPositions = new Float32Array(maxSkidSegments * 6);
  let skidIndex = 0;

  const skidGeom = new THREE.BufferGeometry();
  skidGeom.setAttribute('position', new THREE.BufferAttribute(skidPositions, 3));
  const skidMat = new THREE.MeshBasicMaterial({
    color: 0x09090b,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  const skidMesh = new THREE.LineSegments(skidGeom, skidMat);
  skidMesh.position.y = 0.03;
  root.add(skidMesh);

  let lastPosL: THREE.Vector3 | null = null;
  let lastPosR: THREE.Vector3 | null = null;

  const addSkidMark = (posL: THREE.Vector3, posR: THREE.Vector3, _opacity: number) => {
    if (!lastPosL || !lastPosR) {
      lastPosL = posL.clone();
      lastPosR = posR.clone();
      return;
    }

    const posAttr = skidGeom.getAttribute('position') as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    const idxL = (skidIndex % maxSkidSegments) * 6;
    array[idxL + 0] = lastPosL.x;
    array[idxL + 1] = 0.03;
    array[idxL + 2] = lastPosL.z;
    array[idxL + 3] = posL.x;
    array[idxL + 4] = 0.03;
    array[idxL + 5] = posL.z;

    const idxR = ((skidIndex + 1) % maxSkidSegments) * 6;
    array[idxR + 0] = lastPosR.x;
    array[idxR + 1] = 0.03;
    array[idxR + 2] = lastPosR.z;
    array[idxR + 3] = posR.x;
    array[idxR + 4] = 0.03;
    array[idxR + 5] = posR.z;

    skidIndex += 2;
    posAttr.needsUpdate = true;

    lastPosL.copy(posL);
    lastPosR.copy(posR);
  };

  // -------------------------------------------------------------
  // 10. TIRE DRIFT SMOKE PARTICLE SYSTEM
  // -------------------------------------------------------------
  const smokeParticles: SmokeParticle[] = [];
  const maxSmoke = 120;
  const smokeGeom = new THREE.DodecahedronGeometry(0.35, 1);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xd4d4d8,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });

  for (let s = 0; s < maxSmoke; s++) {
    const mesh = new THREE.Mesh(smokeGeom, smokeMat.clone());
    mesh.visible = false;
    root.add(mesh);
    smokeParticles.push({
      mesh,
      velocity: new THREE.Vector3(),
      age: 0,
      maxAge: 0.8,
      initialSize: 0.35,
    });
  }

  let nextSmokeIdx = 0;

  const spawnSmoke = (pos: THREE.Vector3, velocity: THREE.Vector3, size: number) => {
    const particle = smokeParticles[nextSmokeIdx];
    nextSmokeIdx = (nextSmokeIdx + 1) % maxSmoke;

    particle.mesh.position.copy(pos);
    particle.mesh.visible = true;
    particle.mesh.scale.set(size, size, size);
    particle.initialSize = size;
    particle.velocity.set(
      velocity.x * 0.3 + (Math.random() - 0.5) * 1.5,
      0.8 + Math.random() * 1.2,
      velocity.z * 0.3 + (Math.random() - 0.5) * 1.5
    );
    particle.age = 0;
    particle.maxAge = 0.7 + Math.random() * 0.5;

    const mat = particle.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.5;
  };

  const updateParticles = (dt: number) => {
    smokeParticles.forEach((p) => {
      if (!p.mesh.visible) return;

      p.age += dt;
      if (p.age >= p.maxAge) {
        p.mesh.visible = false;
        return;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);
      const progress = p.age / p.maxAge;
      const currentScale = p.initialSize * (1 + progress * 3.5);
      p.mesh.scale.set(currentScale, currentScale, currentScale);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.45 * (1 - progress));
    });
  };

  const dispose = () => {
    roadGeom.dispose();
    roadMat.dispose();
    roadTex.dispose();
    kerbLGeom.dispose();
    kerbRGeom.dispose();
    kerbMat.dispose();
    kerbTex.dispose();
    walkLGeom.dispose();
    walkRGeom.dispose();
    sidewalkMat.dispose();
    groundGeom.dispose();
    groundMat.dispose();
    groundTex.dispose();
    skyGeom.dispose();
    skyMat.dispose();
    skyTex.dispose();
    skidGeom.dispose();
    skidMat.dispose();
    smokeGeom.dispose();
  };

  return {
    root,
    checkpoints,
    spline,
    totalLength,
    addSkidMark,
    spawnSmoke,
    updateParticles,
    dispose,
  };
}
