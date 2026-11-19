import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {TimeOfDay, ZoneId} from '../types/game';
import {
  createCobblestoneTexture,
  createGrassTexture,
  glossyClayMat,
  makeShadowed,
} from './materials';

export interface TownAnchor {
  id: string;
  label: string;
  worldPos: THREE.Vector3;
}

export type WorldCollider =
  | {type: 'circle'; id?: string; x: number; z: number; r: number}
  | {type: 'box'; id?: string; x: number; z: number; hw: number; hd: number; rotY?: number};

export interface TownWorld {
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  clickTargets: THREE.Object3D[];
  labelAnchors: TownAnchor[];
  colliders: WorldCollider[];
  plazaRadius: number;
  update: (elapsed: number, timeOfDay: TimeOfDay) => void;
  dispose: () => void;
}

const _dropDummy = new THREE.Object3D();

function createMatPool() {
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  return (color: string, roughness = 0.68, metalness = 0.04) => {
    const key = `${color}_${roughness.toFixed(2)}_${metalness.toFixed(2)}`;
    let m = cache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({color, roughness, metalness});
      cache.set(key, m);
    }
    return m;
  };
}

function createExtrudedRoof(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.14,
    bevelSegments: 2,
  });
  geo.center();
  return new THREE.Mesh(geo, mat);
}

function createDailyQuestSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm parchment wooden face
  ctx.fillStyle = '#FFF5E1';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle decorative inner border
  ctx.strokeStyle = '#9C6B3F';
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 480, 224);

  ctx.strokeStyle = '#D9B88F';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 456, 200);

  // Main clear Vietnamese title: "Nhiệm vụ ngày"
  ctx.fillStyle = '#4A2F1B';
  ctx.font = 'bold 56px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Nhiệm vụ ngày', 256, 102);

  // Decorative divider + cozy checklist motif below text
  ctx.fillStyle = '#C97B49';
  ctx.fillRect(116, 146, 280, 6);

  ctx.fillStyle = '#6BA383';
  [172, 256, 340].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, 186, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Sculpted lush tree: base height ~3.05m (so scale 0.92..1.18 -> 2.8m..3.6m, 1.6x-2.1x taller than ~1.7m avatar)
function createSculptedTree(
  scale: number,
  trunkMat: THREE.Material,
  leafMat: THREE.Material,
  highlightLeafMat: THREE.Material,
): THREE.Group {
  const tree = new THREE.Group();

  const rootFlare = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.38, 0.34, 10),
    trunkMat,
  );
  rootFlare.position.y = 0.17;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1.48, 10),
    trunkMat,
  );
  trunk.position.y = 0.88;

  const branchL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.72, 8),
    trunkMat,
  );
  branchL.position.set(-0.28, 1.32, 0.06);
  branchL.rotation.z = 0.56;

  const branchR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.65, 8),
    trunkMat,
  );
  branchR.position.set(0.26, 1.38, -0.05);
  branchR.rotation.z = -0.52;

  const cMain = new THREE.Mesh(new THREE.SphereGeometry(0.88, 14, 12), leafMat);
  cMain.position.set(0, 2.02, 0);

  const cTop = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), highlightLeafMat);
  cTop.position.set(0.06, 2.48, 0.04);

  const cLeft = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), leafMat);
  cLeft.position.set(-0.56, 1.76, 0.24);

  const cRight = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), highlightLeafMat);
  cRight.position.set(0.55, 1.82, -0.18);

  const cBack = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 10), leafMat);
  cBack.position.set(-0.1, 1.84, -0.52);

  tree.add(rootFlare, trunk, branchL, branchR, cMain, cTop, cLeft, cRight, cBack);
  tree.scale.setScalar(scale);
  makeShadowed(tree, true, true);
  return tree;
}

function createFlowerBush(
  leafMat: THREE.Material,
  blossomMat: THREE.Material,
): THREE.Group {
  const bush = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), leafMat);
  leaf.scale.set(1.25, 0.78, 1.15);
  leaf.position.y = 0.26;
  bush.add(leaf);

  [
    [-0.18, 0.45, 0.14],
    [0.18, 0.43, -0.08],
    [0.02, 0.51, 0.2],
  ].forEach(([fx, fy, fz]) => {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), blossomMat);
    fl.position.set(fx, fy, fz);
    bush.add(fl);
  });
  makeShadowed(bush, false, true);
  return bush;
}

function addInteractionProxy(
  parent: THREE.Object3D,
  size: [number, number, number],
  offsetY: number,
  userData: Record<string, unknown>,
  targets: THREE.Object3D[],
) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({visible: false}),
  );
  proxy.position.y = offsetY;
  proxy.userData = userData;
  parent.add(proxy);
  targets.push(proxy);
}

export function buildTownScene(): TownWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = []; // Kept empty on town map (no text above buildings)
  const colliders: WorldCollider[] = [];
  const windowMeshes: THREE.MeshStandardMaterial[] = [];
  const lampBulbs: THREE.MeshStandardMaterial[] = [];

  const getMat = createMatPool();
  const grassTex = createGrassTexture();
  grassTex.repeat.set(28, 28);
  const cobbleTex = createCobblestoneTexture();
  const signTex = createDailyQuestSignTexture();

  const PLAZA_RADIUS = 6.5;

  // ========== 1. EXPANDED ROLLING TERRAIN & COBBLESTONE PLAZA (NO CONNECTING PATHS) ==========
  const terrainGeo = new THREE.CircleGeometry(85, 48);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.88,
    metalness: 0.0,
  });
  const groundMesh = new THREE.Mesh(terrainGeo, terrainMat);
  groundMesh.receiveShadow = true;
  groundMesh.userData = {kind: 'ground'};
  group.add(groundMesh);

  // Rolling distant meadow mounds framing the expanded perimeter
  const moundMat = getMat('#7CC067', 0.86);
  [
    [-27, -30, 10.5],
    [28, -29, 10.8],
    [-33, 0, 9.6],
    [33, 1, 9.8],
    [-27, 29, 10.2],
    [27, 29, 10.6],
    [0, -34, 12.0],
    [0, 34, 11.4],
  ].forEach(([mx, mz, mr]) => {
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(mr, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      moundMat,
    );
    mound.scale.set(1.42, 0.36, 1.1);
    mound.position.set(mx, -0.08, mz);
    mound.receiveShadow = true;
    group.add(mound);
  });

  // Static sculpted sky clouds (zero per-frame animation overhead)
  const cloudMat = getMat('#FFFFFF', 0.85);
  [
    [-18.5, 14.2, -25, 1.55],
    [19.0, 15.0, -23, 1.4],
    [-20.5, 13.5, 22, 1.45],
    [18.5, 14.2, 24, 1.55],
  ].forEach(([cx, cy, cz, cs]) => {
    const cloud = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), cloudMat);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8), cloudMat);
    p2.position.set(-0.75, -0.15, 0.1);
    const p3 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), cloudMat);
    p3.position.set(0.72, -0.18, -0.1);
    cloud.add(p1, p2, p3);
    cloud.scale.set(cs * 1.25, cs * 0.72, cs * 0.9);
    cloud.position.set(cx, cy, cz);
    group.add(cloud);
  });

  // Central Cobblestone Plaza Disc (Clean plaza only — no spokes/paths radiating out)
  const plazaMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.78,
    metalness: 0.02,
  });
  const plazaRim = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAZA_RADIUS + 0.42, PLAZA_RADIUS + 0.72, 0.14, 44),
    getMat('#D8C3A5', 0.76),
  );
  plazaRim.position.set(0, 0.04, 0);
  plazaRim.receiveShadow = true;
  group.add(plazaRim);

  const plazaDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS + 0.06, 0.16, 44),
    plazaMat,
  );
  plazaDisc.position.set(0, 0.06, 0);
  plazaDisc.receiveShadow = true;
  group.add(plazaDisc);

  // ========== 2. GRAND 2-TIER FOUNTAIN + 2 SYMMETRICAL BENCHES + LAMPS ==========
  const fountain = new THREE.Group();
  fountain.position.set(0, 0.14, 0);

  const stoneBaseMat = getMat('#CBD5DF', 0.56);
  const stoneTrimMat = getMat('#E3EAF1', 0.48);
  const poolWaterMat = glossyClayMat('#55BEE8', 0.12);

  // Outer stepped curb & coping rim
  const lowerStep = new THREE.Mesh(
    new THREE.CylinderGeometry(2.08, 2.24, 0.16, 28),
    stoneBaseMat,
  );
  lowerStep.position.y = 0.08;

  const outerBasin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.88, 1.98, 0.44, 28),
    stoneBaseMat,
  );
  outerBasin.position.y = 0.34;

  const outerLip = new THREE.Mesh(
    new THREE.TorusGeometry(1.86, 0.12, 10, 28),
    stoneTrimMat,
  );
  outerLip.rotation.x = Math.PI / 2;
  outerLip.position.y = 0.56;

  const waterPool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.74, 1.74, 0.08, 24),
    poolWaterMat,
  );
  waterPool.position.y = 0.48;

  // Sculpted 2-tier column & mid-bowl
  const pillar = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.46, 0),
        new THREE.Vector2(0.32, 0.35),
        new THREE.Vector2(0.24, 0.92),
        new THREE.Vector2(0.95, 1.18),
        new THREE.Vector2(1.04, 1.36),
        new THREE.Vector2(0.96, 1.38),
        new THREE.Vector2(0.25, 1.24),
        new THREE.Vector2(0.18, 1.92),
        new THREE.Vector2(0.44, 2.12),
        new THREE.Vector2(0.16, 2.22),
        new THREE.Vector2(0.12, 2.48),
        new THREE.Vector2(0, 2.58),
      ],
      22,
    ),
    stoneTrimMat,
  );
  pillar.position.y = 0.32;

  const midWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.86, 0.86, 0.06, 20),
    poolWaterMat,
  );
  midWater.position.y = 1.62;

  const topFinial = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    glossyClayMat('#F4C95D', 0.25),
  );
  topFinial.position.y = 2.92;

  fountain.add(lowerStep, outerBasin, outerLip, waterPool, pillar, midWater, topFinial);
  makeShadowed(fountain, true, true);
  group.add(fountain);
  colliders.push({type: 'circle', id: 'fountain', x: 0, z: 0, r: 2.26});

  // Single-draw-call InstancedMesh water droplets (still spraying cleanly, zero GC!)
  const DROP_COUNT = 18;
  const dropGeo = new THREE.SphereGeometry(0.068, 7, 7);
  const dropMat = new THREE.MeshStandardMaterial({
    color: '#D5F4FF',
    emissive: '#87D8F8',
    emissiveIntensity: 0.2,
    roughness: 0.15,
    metalness: 0.05,
  });
  const fountainDropsMesh = new THREE.InstancedMesh(dropGeo, dropMat, DROP_COUNT);
  fountainDropsMesh.frustumCulled = false;
  fountain.add(fountainDropsMesh);

  // 2 Neat Symmetrical Plaza Benches (1 Left, 1 Right)
  const benchWoodMat = getMat('#BD8350', 0.7);
  const benchIronMat = getMat('#495057', 0.5, 0.4);
  [
    {
      id: 'bench_left',
      bx: -4.25,
      bz: 0,
      rot: Math.PI / 2,
      tx: -3.35,
      tz: 0,
      seatX: -4.18,
      seatZ: 0,
    },
    {
      id: 'bench_right',
      bx: 4.25,
      bz: 0,
      rot: -Math.PI / 2,
      tx: 3.35,
      tz: 0,
      seatX: 4.18,
      seatZ: 0,
    },
  ].forEach(({id, bx, bz, rot, tx, tz, seatX, seatZ}) => {
    const bench = new THREE.Group();
    bench.position.set(bx, 0.14, bz);
    bench.rotation.y = rot;
    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 0.12, 0.5, 3, 0.04),
      benchWoodMat,
    );
    seat.position.y = 0.32;
    const back = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 0.4, 0.1, 3, 0.03),
      benchWoodMat,
    );
    back.position.set(0, 0.58, -0.2);
    [-0.52, 0.52].forEach((lx) => {
      const leg = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.32, 0.44, 2, 0.02),
        benchIronMat,
      );
      leg.position.set(lx, 0.16, 0);
      bench.add(leg);
    });
    bench.add(seat, back);
    makeShadowed(bench, true, true);
    addInteractionProxy(
      bench,
      [1.54, 1.0, 0.78],
      0.44,
      {
        kind: 'bench',
        tx,
        tz,
        seatX,
        seatZ,
        seatY: 0.52,
        sitRotY: rot,
        colliderId: id,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id, x: bx, z: bz, hw: 0.75, hd: 0.3, rotY: rot});
    group.add(bench);
  });

  // 4 Plaza Lamps
  const lampPostMat = getMat('#3D4752', 0.4, 0.6);
  [
    [-4.85, -4.65],
    [4.85, -4.65],
    [-4.85, 4.65],
    [4.85, 4.65],
  ].forEach(([lx, lz]) => {
    const lamp = new THREE.Group();
    lamp.position.set(lx, 0.1, lz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.05, 10), lampPostMat);
    post.position.y = 1.02;
    const bulbMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.12,
      roughness: 0.25,
    });
    lampBulbs.push(bulbMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), bulbMat);
    head.position.y = 2.12;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.16, 10), lampPostMat);
    cap.position.y = 2.3;
    lamp.add(post, head, cap);
    makeShadowed(lamp, true, false);
    group.add(lamp);
    colliders.push({type: 'circle', x: lx, z: lz, r: 0.3});
  });

  // Flower bushes framing plaza edges subtly
  const bushLeafMat = getMat('#66B56A', 0.76);
  [
    [-6.95, -2.2, '#F28482'],
    [6.95, -2.2, '#F9C74F'],
    [-6.95, 2.2, '#F7A8B8'],
    [6.95, 2.2, '#A8D8EA'],
  ].forEach(([bx, bz, col]) => {
    const bush = createFlowerBush(bushLeafMat, getMat(col as string, 0.62));
    bush.position.set(bx as number, 0, bz as number);
    group.add(bush);
    colliders.push({type: 'circle', x: bx as number, z: bz as number, r: 0.44});
  });

  const makeWinMat = () => {
    const m = new THREE.MeshStandardMaterial({
      color: '#BFE8FA',
      emissive: '#FFD97D',
      emissiveIntensity: 0.08,
      roughness: 0.2,
    });
    windowMeshes.push(m);
    return m;
  };

  // ========== DISTRICT 1: NHÀ CỦA TÔI (North-West Residential Nook, ~4.75m tall) ==========
  {
    const home = new THREE.Group();
    home.position.set(-13.0, 0, -10.4);
    home.rotation.y = 0.45;

    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(4.5, 0.34, 3.7, 3, 0.08),
      getMat('#C8B8A4', 0.8),
    );
    plinth.position.y = 0.17;

    const walls = new THREE.Mesh(
      new RoundedBoxGeometry(4.1, 2.35, 3.25, 4, 0.14),
      getMat('#FFF3DE', 0.72),
    );
    walls.position.y = 1.48;

    // Warm timber corner trim beams
    const timberMat = getMat('#8C5E3A', 0.7);
    [
      [-1.98, 1.56],
      [1.98, 1.56],
      [-1.98, -1.56],
      [1.98, -1.56],
    ].forEach(([px, pz]) => {
      const beam = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.36, 0.18, 2, 0.04), timberMat);
      beam.position.set(px, 1.48, pz);
      home.add(beam);
    });

    const roof = createExtrudedRoof(4.95, 1.85, 3.85, getMat('#DB6C53', 0.58));
    roof.position.y = 3.45;

    const chimney = new THREE.Mesh(
      new RoundedBoxGeometry(0.62, 1.35, 0.62, 3, 0.08),
      getMat('#A85B49', 0.78),
    );
    chimney.position.set(1.25, 3.95, -0.75);
    const chimneyCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 0.16, 0.76, 2, 0.04),
      getMat('#8C4939', 0.78),
    );
    chimneyCap.position.set(1.25, 4.65, -0.75);

    // Front Porch Canopy + Steps
    const porchRoof = new THREE.Mesh(
      new RoundedBoxGeometry(1.75, 0.18, 0.95, 3, 0.05),
      getMat('#C95D45', 0.6),
    );
    porchRoof.position.set(0, 2.15, 1.98);
    porchRoof.rotation.x = 0.22;
    [-0.72, 0.72].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.82, 8), timberMat);
      post.position.set(px, 1.24, 2.28);
      home.add(post);
    });
    const porchStep = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 0.18, 0.72, 2, 0.04),
      getMat('#D9CBB8', 0.8),
    );
    porchStep.position.set(0, 0.09, 2.08);

    // Large Front Door & Windows
    const door = new THREE.Mesh(
      new RoundedBoxGeometry(0.92, 1.45, 0.18, 3, 0.08),
      timberMat,
    );
    door.position.set(0, 1.06, 1.62);

    const winL = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 0.76, 0.14, 2, 0.05),
      makeWinMat(),
    );
    winL.position.set(-1.2, 1.56, 1.62);
    const winR = winL.clone();
    winR.position.x = 1.2;

    const winSide = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.76, 0.84, 2, 0.05),
      makeWinMat(),
    );
    winSide.position.set(-2.05, 1.56, 0);
    const winSideR = winSide.clone();
    winSideR.position.x = 2.05;

    // Flower boxes under front windows
    [-1.2, 1.2].forEach((wx) => {
      const fbox = new THREE.Mesh(
        new RoundedBoxGeometry(0.84, 0.2, 0.26, 2, 0.04),
        getMat('#7A5230', 0.75),
      );
      fbox.position.set(wx, 1.06, 1.74);
      const fl1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), getMat('#F28482', 0.65));
      fl1.position.set(wx - 0.18, 1.22, 1.75);
      const fl2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), getMat('#F9C74F', 0.65));
      fl2.position.set(wx + 0.18, 1.22, 1.75);
      home.add(fbox, fl1, fl2);
    });

    home.add(
      plinth,
      walls,
      roof,
      chimney,
      chimneyCap,
      porchRoof,
      porchStep,
      door,
      winL,
      winR,
      winSide,
      winSideR,
    );
    makeShadowed(home, true, true);
    addInteractionProxy(
      home,
      [4.7, 4.8, 4.2],
      2.3,
      {kind: 'zone', zone: 'home' as ZoneId, tx: -11.4, tz: -7.5},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'home', x: -13.0, z: -10.4, hw: 2.38, hd: 1.98, rotY: 0.45});
    group.add(home);
  }

  // ========== BIỂN "NHIỆM VỤ NGÀY" TRƯỚC CỬA NHÀ ==========
  {
    const signBoardGroup = new THREE.Group();
    signBoardGroup.position.set(-9.85, 0, -8.85);
    signBoardGroup.rotation.y = 0.36;

    const postMat = getMat('#7A5032', 0.76);
    const footingMat = getMat('#AEB8C2', 0.8);
    [-0.58, 0.58].forEach((px) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 10), footingMat);
      foot.position.set(px, 0.08, 0);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.55, 10), postMat);
      post.position.set(px, 0.84, 0);
      signBoardGroup.add(foot, post);
    });

    const frame = new THREE.Mesh(
      new RoundedBoxGeometry(1.52, 0.84, 0.14, 3, 0.04),
      postMat,
    );
    frame.position.set(0, 1.24, 0);

    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.36, 0.68),
      new THREE.MeshStandardMaterial({map: signTex, roughness: 0.65}),
    );
    signFace.position.set(0, 1.24, 0.076);

    const backFace = signFace.clone();
    backFace.rotation.y = Math.PI;
    backFace.position.z = -0.076;

    const roofCap = createExtrudedRoof(1.72, 0.36, 0.36, getMat('#DB6C53', 0.58));
    roofCap.position.set(0, 1.82, 0);

    signBoardGroup.add(frame, signFace, backFace, roofCap);
    makeShadowed(signBoardGroup, true, true);
    addInteractionProxy(
      signBoardGroup,
      [1.7, 2.0, 0.8],
      1.0,
      {kind: 'daily_quests', tx: -9.15, tz: -7.55},
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'daily_quests', x: -9.85, z: -8.85, r: 0.58});
    group.add(signBoardGroup);
  }

  // ========== DISTRICT 2: NHÀ KÍNH TO - KHU VƯỜN (North-East, ~4.25m tall) ==========
  {
    const garden = new THREE.Group();
    garden.position.set(10.8, 0, -12.8);
    garden.rotation.y = -0.28;

    const kneeWallMat = getMat('#E8D7BE', 0.78);
    const frameMat = getMat('#45755D', 0.55, 0.15);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#D2F3FF',
      roughness: 0.14,
      metalness: 0.08,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    const foundation = new THREE.Mesh(
      new RoundedBoxGeometry(5.1, 0.24, 4.3, 3, 0.06),
      getMat('#B5C29D', 0.84),
    );
    foundation.position.y = 0.12;

    // Low brick knee walls around the big greenhouse
    const kneeWall = new THREE.Mesh(
      new RoundedBoxGeometry(4.75, 0.72, 3.9, 3, 0.06),
      kneeWallMat,
    );
    kneeWall.position.y = 0.54;

    // Glass wall enclosure
    const glassWalls = new THREE.Mesh(
      new THREE.BoxGeometry(4.55, 1.78, 3.7),
      glassMat,
    );
    glassWalls.position.y = 1.76;

    // Pitched Glass Conservatory Roof (Extruded triangular prism)
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-2.38, 0);
    roofShape.lineTo(0, 1.38);
    roofShape.lineTo(2.38, 0);
    roofShape.closePath();
    const roofGlassGeo = new THREE.ExtrudeGeometry(roofShape, {
      depth: 3.82,
      bevelEnabled: false,
    });
    roofGlassGeo.center();
    const glassRoof = new THREE.Mesh(roofGlassGeo, glassMat);
    glassRoof.position.y = 3.32;

    // Iron Structural Mullions & Ridge Cresting
    const ridgeBeam = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.18, 3.96, 2, 0.03),
      frameMat,
    );
    ridgeBeam.position.y = 4.02;
    const eaveL = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.14, 3.88, 2, 0.03),
      frameMat,
    );
    eaveL.position.set(-2.32, 2.66, 0);
    const eaveR = eaveL.clone();
    eaveR.position.x = 2.32;

    [-1.8, -0.6, 0.6, 1.8].forEach((mz) => {
      [-2.3, 2.3].forEach((mx) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.85, 0.1), frameMat);
        post.position.set(mx, 1.78, mz);
        garden.add(post);
      });
    });

    // Double Arched Glass Doors at front (+Z)
    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.36, 1.95, 0.18, 2, 0.04),
      frameMat,
    );
    doorFrame.position.set(0, 1.24, 1.92);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.72, 0.2), glassMat);
    doorGlass.position.set(0, 1.22, 1.93);

    // Lush Interior Planters & Sunflowers Visible Through the Glass!
    const interiorBed = new THREE.Mesh(
      new RoundedBoxGeometry(3.4, 0.42, 2.3, 2, 0.04),
      getMat('#7D5333', 0.9),
    );
    interiorBed.position.set(0, 0.98, -0.2);
    const leafMat = getMat('#56BA61', 0.68);
    const sunMat = getMat('#F9C74F', 0.52);
    const berryMat = getMat('#E85D68', 0.55);
    [
      [-1.0, -0.5, sunMat],
      [0, -0.6, berryMat],
      [1.0, -0.45, sunMat],
      [-0.75, 0.35, berryMat],
      [0.75, 0.35, leafMat],
    ].forEach(([px, pz, bm]) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), leafMat);
      bush.position.set(px as number, 1.42, pz as number);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), bm as THREE.Material);
      bloom.position.set(px as number, 1.84, pz as number);
      garden.add(bush, bloom);
    });

    // Cozy outdoor raised vegetable planter beside the greenhouse door
    const outdoorBed = new THREE.Mesh(
      new RoundedBoxGeometry(1.5, 0.34, 0.92, 3, 0.05),
      getMat('#8C5C38', 0.85),
    );
    outdoorBed.position.set(-1.65, 0.32, 2.42);
    [-2.05, -1.65, -1.25].forEach((sx, idx) => {
      const sprout = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        idx === 1 ? sunMat : leafMat,
      );
      sprout.position.set(sx, 0.58, 2.42);
      garden.add(sprout);
    });

    garden.add(
      foundation,
      kneeWall,
      glassWalls,
      glassRoof,
      ridgeBeam,
      eaveL,
      eaveR,
      doorFrame,
      doorGlass,
      interiorBed,
      outdoorBed,
    );
    makeShadowed(garden, true, true);
    // Keep glass slightly non-shadow-casting so interior plants gleam cleanly
    glassWalls.castShadow = false;
    glassRoof.castShadow = false;

    addInteractionProxy(
      garden,
      [5.2, 4.4, 4.6],
      2.1,
      {kind: 'zone', zone: 'garden' as ZoneId, tx: 9.7, tz: -9.4},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'garden', x: 10.8, z: -12.8, hw: 2.55, hd: 2.15, rotY: -0.28});
    group.add(garden);
  }

  // ========== DISTRICT 3: TIỆM THỜI TRANG (West, ~4.55m tall) ==========
  {
    const shop = new THREE.Group();
    shop.position.set(-14.8, 0, 3.4);
    shop.rotation.y = 1.02;

    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(4.45, 0.32, 3.55, 3, 0.08),
      getMat('#EBDAD2', 0.78),
    );
    plinth.position.y = 0.16;

    const body = new THREE.Mesh(
      new RoundedBoxGeometry(4.1, 2.55, 3.15, 4, 0.14),
      getMat('#FCE5EC', 0.65),
    );
    body.position.y = 1.56;

    const mansard = new THREE.Mesh(
      new RoundedBoxGeometry(4.4, 1.05, 3.45, 4, 0.18),
      getMat('#D46C82', 0.56),
    );
    mansard.position.y = 3.22;

    const roofCap = new THREE.Mesh(
      new RoundedBoxGeometry(3.55, 0.45, 2.6, 3, 0.1),
      getMat('#B55268', 0.56),
    );
    roofCap.position.y = 3.88;

    // 7-Stripe Scalloped Storefront Awning
    for (let i = 0; i < 7; i++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.22, 1.02, 2, 0.05),
        getMat(i % 2 === 0 ? '#E86B82' : '#FFFDF9', 0.55),
      );
      stripe.position.set(-1.62 + i * 0.54, 2.18, 1.88);
      stripe.rotation.x = 0.36;
      shop.add(stripe);
    }

    // Large Show Window + Mannequin Silhouette inside
    const showWin = new THREE.Mesh(
      new RoundedBoxGeometry(1.65, 1.25, 0.16, 2, 0.05),
      makeWinMat(),
    );
    showWin.position.set(-0.78, 1.26, 1.56);

    const mannequin = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.85, 12),
      getMat('#F9B4C4', 0.52),
    );
    mannequin.position.set(-0.78, 1.12, 1.38);

    // Tall Double Boutique Door
    const door = new THREE.Mesh(
      new RoundedBoxGeometry(1.06, 1.58, 0.18, 3, 0.06),
      getMat('#9E4B5D', 0.58),
    );
    door.position.set(1.02, 1.08, 1.56);

    // Sculpted 3D Ribbon Bow Crest on Roof (Intuitive Boutique Symbol, NO TEXT)
    const bowMat = glossyClayMat('#FFD166', 0.25);
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), bowMat);
    bowCenter.position.set(0, 3.25, 1.76);
    [-0.36, 0.36].forEach((bx, idx) => {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.58, 12), bowMat);
      wing.rotation.z = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
      wing.position.set(bx, 3.25, 1.76);
      shop.add(wing);
    });

    shop.add(plinth, body, mansard, roofCap, showWin, mannequin, door, bowCenter);
    makeShadowed(shop, true, true);
    addInteractionProxy(
      shop,
      [4.5, 4.4, 4.0],
      2.1,
      {kind: 'zone', zone: 'boutique' as ZoneId, tx: -11.8, tz: 5.1},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'boutique', x: -14.8, z: 3.4, hw: 2.3, hd: 1.9, rotY: 1.02});
    group.add(shop);
  }

  // ========== DISTRICT 4: TIỆM MINIGAME (East-South-East, ~4.7m tall) ==========
  {
    const arcade = new THREE.Group();
    arcade.position.set(14.4, 0, 5.4);
    arcade.rotation.y = -1.12;

    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(4.35, 0.3, 3.55, 3, 0.08),
      getMat('#C8C4DC', 0.72),
    );
    plinth.position.y = 0.15;

    const body = new THREE.Mesh(
      new RoundedBoxGeometry(4.05, 2.65, 3.15, 4, 0.16),
      getMat('#4E4178', 0.55),
    );
    body.position.y = 1.6;

    const cornice = new THREE.Mesh(
      new RoundedBoxGeometry(4.35, 0.42, 3.45, 3, 0.08),
      getMat('#F4B942', 0.38),
    );
    cornice.position.y = 3.04;

    const upperDeck = new THREE.Mesh(
      new RoundedBoxGeometry(3.2, 0.65, 2.4, 3, 0.1),
      getMat('#6A5BA3', 0.52),
    );
    upperDeck.position.y = 3.52;

    // Giant Sculpted 3D Rooftop Arcade Joystick + Gold Star Emblem (NO TEXT)
    const joyBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.15, 0.22, 0.95, 2, 0.05),
      getMat('#2C244A', 0.5),
    );
    joyBase.position.set(0, 3.92, 0);
    const joyStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.72, 10),
      getMat('#DCE4EC', 0.35, 0.5),
    );
    joyStick.position.set(0, 4.32, 0);
    const joyKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 14),
      glossyClayMat('#F05D68', 0.22),
    );
    joyKnob.position.set(0, 4.74, 0);

    const starCrest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      glossyClayMat('#FFD166', 0.2),
    );
    starCrest.position.set(0, 3.08, 1.78);

    // Glowing cyan arcade showcase windows & Coral entrance
    const win = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 1.15, 0.14, 2, 0.05),
      new THREE.MeshStandardMaterial({
        color: '#72C2F0',
        emissive: '#4EA8DE',
        emissiveIntensity: 0.35,
        roughness: 0.2,
      }),
    );
    win.position.set(0.82, 1.32, 1.56);

    const doorCanopy = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 0.22, 0.85, 3, 0.06),
      getMat('#F06B74', 0.48),
    );
    doorCanopy.position.set(-0.92, 2.02, 1.82);

    const door = new THREE.Mesh(
      new RoundedBoxGeometry(1.06, 1.56, 0.18, 3, 0.06),
      getMat('#E85D68', 0.5),
    );
    door.position.set(-0.92, 1.08, 1.56);

    arcade.add(
      plinth,
      body,
      cornice,
      upperDeck,
      joyBase,
      joyStick,
      joyKnob,
      starCrest,
      win,
      doorCanopy,
      door,
    );
    makeShadowed(arcade, true, true);
    addInteractionProxy(
      arcade,
      [4.4, 4.9, 4.0],
      2.2,
      {kind: 'zone', zone: 'arcade' as ZoneId, tx: 11.4, tz: 6.8},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'arcade', x: 14.4, z: 5.4, hw: 2.25, hd: 1.9, rotY: -1.12});
    group.add(arcade);
  }

  // ========== DISTRICT 5: HỒ CÂU CÁ (South-West Scenic Double-Lobed Pond) ==========
  {
    const lake = new THREE.Group();
    lake.position.set(-11.2, 0, 13.8);

    const shoreMat = getMat('#E4CFAF', 0.85);
    const waterMat = glossyClayMat('#4AB4DB', 0.12);

    // Main lobe + side cove
    const shoreMain = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.95, 0.14, 24), shoreMat);
    shoreMain.position.set(-0.5, 0.03, 0.35);
    const shoreCove = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.3, 0.14, 20), shoreMat);
    shoreCove.position.set(1.65, 0.03, -0.55);

    const waterMain = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.48, 0.16, 24), waterMat);
    waterMain.position.set(-0.5, 0.05, 0.35);
    const waterCove = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.16, 20), waterMat);
    waterCove.position.set(1.65, 0.05, -0.55);

    // Timber Pier extending toward the plaza side
    const pier = new THREE.Mesh(
      new RoundedBoxGeometry(1.32, 0.18, 2.55, 3, 0.04),
      getMat('#C59160', 0.72),
    );
    pier.position.set(1.3, 0.24, -1.65);
    pier.rotation.y = 0.55;

    const lanternPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.45, 8),
      getMat('#7A5230', 0.78),
    );
    lanternPost.position.set(1.85, 0.88, -1.25);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.25, 0.48, 12),
      getMat('#A06B3E', 0.76),
    );
    barrel.position.set(0.9, 0.54, -1.85);

    // Lily pads & lotus blooms
    const padMat = getMat('#5DB86A', 0.68);
    const lotusMat = getMat('#F79EB0', 0.52);
    [
      [-1.35, 0.9],
      [-0.65, 1.6],
      [1.85, 0.25],
    ].forEach(([lx, lz]) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 14), padMat);
      pad.position.set(lx, 0.15, lz);
      const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), lotusMat);
      lotus.position.set(lx, 0.24, lz);
      lake.add(pad, lotus);
    });

    // Shore pebbles & reeds
    const rockMat = getMat('#9DA7B2', 0.8);
    [
      [-3.15, 0.45, 0.45],
      [-2.65, 2.1, 0.38],
      [3.4, -0.6, 0.42],
    ].forEach(([rx, rz, rs]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rockMat);
      rock.scale.set(1.2, 0.75, 1.0);
      rock.position.set(rx, 0.22, rz);
      lake.add(rock);
    });

    lake.add(shoreMain, shoreCove, waterMain, waterCove, pier, lanternPost, barrel);
    makeShadowed(lake, true, true);
    addInteractionProxy(
      lake,
      [6.2, 2.0, 5.4],
      0.85,
      {kind: 'zone', zone: 'fishing' as ZoneId, tx: -8.3, tz: 10.6},
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'fishing_a', x: -11.7, z: 14.15, r: 2.85});
    colliders.push({type: 'circle', id: 'fishing_b', x: -9.55, z: 13.25, r: 2.25});
    group.add(lake);
  }

  // ========== DISTRICT 6: TRẠM BƯU ĐIỆN & CÀI ĐẶT (South-East Clock Tower, ~5.0m tall) ==========
  {
    const kiosk = new THREE.Group();
    kiosk.position.set(8.8, 0, 12.6);
    kiosk.rotation.y = -0.52;

    const base = new THREE.Mesh(
      new RoundedBoxGeometry(2.7, 0.3, 2.5, 3, 0.06),
      getMat('#C9B9A6', 0.78),
    );
    base.position.y = 0.15;

    const tower = new THREE.Mesh(
      new RoundedBoxGeometry(1.75, 2.85, 1.75, 4, 0.1),
      getMat('#F5E6CD', 0.7),
    );
    tower.position.y = 1.68;

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.42, 1.55, 4),
      getMat('#5A7B9C', 0.56),
    );
    spire.rotation.y = Math.PI / 4;
    spire.position.y = 3.82;

    const spireFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      glossyClayMat('#FFD166', 0.24),
    );
    spireFinial.position.y = 4.66;

    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.1, 18),
      getMat('#FFFFFF', 0.35),
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 2.45, 0.9);

    const clockRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.49, 0.06, 8, 20),
      getMat('#6E4E34', 0.6),
    );
    clockRim.position.set(0, 2.45, 0.92);

    const door = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 1.26, 0.14, 3, 0.04),
      getMat('#7D5333', 0.68),
    );
    door.position.set(0, 0.92, 0.9);

    const postbox = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.56, 8, 12),
      glossyClayMat('#D94F4F', 0.32),
    );
    postbox.position.set(1.26, 0.74, 0.55);

    kiosk.add(base, tower, spire, spireFinial, clockFace, clockRim, door, postbox);
    makeShadowed(kiosk, true, true);
    addInteractionProxy(
      kiosk,
      [3.2, 4.9, 2.9],
      2.3,
      {kind: 'settings', tx: 7.2, tz: 10.1},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'settings', x: 8.8, z: 12.6, hw: 1.55, hd: 1.38, rotY: -0.52});
    group.add(kiosk);
  }

  // ========== SURROUNDING LUSH TREES (2.75m–3.65m tall -> 1.6x–2.1x taller than character!) ==========
  const trunkMat = getMat('#7D5538', 0.82);
  const leafDark = getMat('#58A360', 0.74);
  const leafMid = getMat('#66B86E', 0.72);
  const leafBright = getMat('#74C67A', 0.7);

  const treeCoords: [number, number, number][] = [
    [-18.2, -13.2, 1.15],
    [-17.5, -5.2, 1.02],
    [-8.0, -15.6, 1.08],
    [1.8, -15.8, 1.12],
    [16.8, -14.8, 1.18],
    [17.6, -5.8, 1.05],
    [-19.2, 8.8, 1.12],
    [-16.8, 15.8, 1.06],
    [18.8, 11.4, 1.16],
    [14.5, 16.8, 1.04],
    [-4.6, 17.5, 0.98],
    [3.8, 17.6, 1.0],
    [-19.6, -0.5, 1.08],
    [19.6, -0.2, 1.06],
    [4.4, -9.2, 0.94],
    [-6.6, 7.6, 0.92],
  ];
  treeCoords.forEach(([tx, tz, ts], i) => {
    const t = createSculptedTree(
      ts,
      trunkMat,
      i % 2 === 0 ? leafDark : leafMid,
      leafBright,
    );
    t.position.set(tx, 0, tz);
    group.add(t);
    colliders.push({type: 'circle', x: tx, z: tz, r: 0.48 * ts});
  });

  // Track last applied timeOfDay so emissive updates only run when changed
  let lastAppliedTod: TimeOfDay | null = null;

  const update = (elapsed: number, timeOfDay: TimeOfDay) => {
    if (timeOfDay !== lastAppliedTod) {
      lastAppliedTod = timeOfDay;
      const isNight = timeOfDay === 'night';
      const isSunset = timeOfDay === 'sunset';
      const winEmissive = isNight ? 1.15 : isSunset ? 0.65 : 0.08;
      const bulbEmissive = isNight ? 1.4 : isSunset ? 0.75 : 0.1;

      windowMeshes.forEach((m) => {
        m.emissiveIntensity = winEmissive;
      });
      lampBulbs.forEach((m) => {
        m.emissiveIntensity = bulbEmissive;
      });
    }

    // Smooth single-draw-call fountain spray (zero object allocations)
    for (let i = 0; i < DROP_COUNT; i++) {
      if (i < 6) {
        const a = (i / 6) * Math.PI * 2;
        const t = (elapsed * 1.45 + i * 0.16) % 1;
        const r = 0.06 + t * 0.68;
        const y = 2.6 + Math.sin(t * Math.PI) * 0.56 - t * 0.98;
        _dropDummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        _dropDummy.scale.setScalar(0.88 - t * 0.25);
      } else {
        const idx = i - 6;
        const a = (idx / 12) * Math.PI * 2 + 0.25;
        const t = (elapsed * 1.35 + (idx % 4) * 0.25) % 1;
        const r = 0.94 + t * 0.58;
        const y = 1.62 + Math.sin(t * Math.PI) * 0.18 - t * 1.14;
        _dropDummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        _dropDummy.scale.setScalar(0.95 - t * 0.3);
      }
      _dropDummy.updateMatrix();
      fountainDropsMesh.setMatrixAt(i, _dropDummy.matrix);
    }
    fountainDropsMesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    grassTex.dispose();
    cobbleTex.dispose();
    signTex.dispose();
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });
  };

  return {
    group,
    groundMesh,
    clickTargets,
    labelAnchors,
    colliders,
    plazaRadius: PLAZA_RADIUS,
    update,
    dispose,
  };
}
