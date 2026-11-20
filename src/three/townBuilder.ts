import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TimeOfDay, ZoneId} from '../types/game';
import {createCobblestoneTexture, createGrassTexture, glossyClayMat} from './materials';

export const TOWN_PLAZA_RADIUS = 6.8;
export const HILL_CENTER = {x: 1.5, z: -27.5};
export const HILL_RADIUS = 10.5;
export const HILL_PEAK_Y = 3.4;

export const TOWN_ZONE_ENTRANCES: Record<
  Exclude<ZoneId, 'town'>,
  {tx: number; tz: number; exitRotY: number}
> = {
  home: {tx: -17.3, tz: -9.3, exitRotY: 0.52},
  garden: {tx: 16.9, tz: -11.2, exitRotY: -0.45},
  boutique: {tx: -18.7, tz: 7.9, exitRotY: 1.1},
  arcade: {tx: 19.0, tz: 7.4, exitRotY: -1.14},
  fishing: {tx: -11.4, tz: 18.1, exitRotY: 0.45},
};

export function getTownGroundHeight(
  x: number,
  z: number,
  plazaRadius = TOWN_PLAZA_RADIUS,
): number {
  const dh = Math.hypot(x - HILL_CENTER.x, z - HILL_CENTER.z);
  if (dh < HILL_RADIUS) {
    const t = dh / HILL_RADIUS;
    const u = THREE.MathUtils.clamp((t - 0.24) / 0.76, 0, 1);
    return HILL_PEAK_Y * (0.5 + 0.5 * Math.cos(u * Math.PI));
  }
  if (Math.hypot(x, z) < plazaRadius + 0.25) {
    return 0.14;
  }
  return 0.02;
}

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
  groundMeshes: THREE.Object3D[];
  clickTargets: THREE.Object3D[];
  labelAnchors: TownAnchor[];
  colliders: WorldCollider[];
  plazaRadius: number;
  update: (elapsed: number, timeOfDay: TimeOfDay) => void;
  dispose: () => void;
}

const _dropDummy = new THREE.Object3D();
const _smokeDummy = new THREE.Object3D();
const _instDummy = new THREE.Object3D();
const _instColor = new THREE.Color();

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((g) => {
    const out = g.index ? g.toNonIndexed() : g.clone();
    if (out.attributes.tangent) out.deleteAttribute('tangent');
    return out;
  });
  const merged = mergeGeometries(nonIndexed, false);
  parts.forEach((g) => g.dispose());
  nonIndexed.forEach((g) => g.dispose());
  return merged;
}

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
    bevelThickness: 0.14,
    bevelSize: 0.12,
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

  ctx.fillStyle = '#FFF5E1';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#9C6B3F';
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 480, 224);

  ctx.strokeStyle = '#D9B88F';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 456, 200);

  ctx.fillStyle = '#4A2F1B';
  ctx.font = 'bold 56px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Nhiệm vụ ngày', 256, 102);

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

// Build reusable merged geometries for tall sculpted trees (base height ~4.4m -> scaled 1.2..1.75 => 5.3m..7.7m)
export function createTreeGeometries() {
  const rootFlare = new THREE.CylinderGeometry(0.26, 0.44, 0.45, 8);
  rootFlare.translate(0, 0.22, 0);

  const trunk = new THREE.CylinderGeometry(0.19, 0.28, 2.35, 8);
  trunk.translate(0, 1.35, 0);

  const branchL = new THREE.CylinderGeometry(0.08, 0.13, 0.95, 7);
  branchL.rotateZ(0.55);
  branchL.translate(-0.34, 2.1, 0.08);

  const branchR = new THREE.CylinderGeometry(0.08, 0.12, 0.88, 7);
  branchR.rotateZ(-0.52);
  branchR.translate(0.32, 2.18, -0.06);

  const branchF = new THREE.CylinderGeometry(0.07, 0.1, 0.72, 6);
  branchF.rotateX(0.45);
  branchF.translate(0.04, 2.22, 0.24);

  const trunkGeo = mergeParts([rootFlare, trunk, branchL, branchR, branchF]);

  const cMain = new THREE.SphereGeometry(1.06, 11, 9);
  cMain.translate(0, 2.95, 0);
  const cLeft = new THREE.SphereGeometry(0.76, 10, 8);
  cLeft.translate(-0.68, 2.66, 0.28);
  const cBack = new THREE.SphereGeometry(0.74, 10, 8);
  cBack.translate(-0.12, 2.74, -0.62);
  const lowerCanopyGeo = mergeParts([cMain, cLeft, cBack]);

  const cTop = new THREE.SphereGeometry(0.84, 11, 9);
  cTop.translate(0.06, 3.62, 0.05);
  const cRight = new THREE.SphereGeometry(0.72, 10, 8);
  cRight.translate(0.68, 2.78, -0.2);
  const cFront = new THREE.SphereGeometry(0.64, 9, 8);
  cFront.translate(0.14, 2.72, 0.62);
  const upperCanopyGeo = mergeParts([cTop, cRight, cFront]);

  return {trunkGeo, lowerCanopyGeo, upperCanopyGeo};
}

// Sakura (Hoa Dao) tree geometries with graceful spreading crown
function createSakuraGeometries() {
  const root = new THREE.CylinderGeometry(0.22, 0.36, 0.38, 8);
  root.translate(0, 0.19, 0);
  const trunk = new THREE.CylinderGeometry(0.16, 0.24, 1.9, 8);
  trunk.rotateZ(0.05);
  trunk.translate(0, 1.1, 0);
  const b1 = new THREE.CylinderGeometry(0.07, 0.11, 1.05, 7);
  b1.rotateZ(0.68);
  b1.translate(-0.42, 1.88, 0.08);
  const b2 = new THREE.CylinderGeometry(0.07, 0.11, 1.0, 7);
  b2.rotateZ(-0.62);
  b2.translate(0.4, 1.94, -0.06);
  const trunkGeo = mergeParts([root, trunk, b1, b2]);

  const s1 = new THREE.SphereGeometry(0.95, 11, 9);
  s1.scale(1.25, 0.72, 1.15);
  s1.translate(0, 2.65, 0);
  const s2 = new THREE.SphereGeometry(0.76, 10, 8);
  s2.scale(1.2, 0.68, 1.1);
  s2.translate(-0.78, 2.38, 0.24);
  const s3 = new THREE.SphereGeometry(0.74, 10, 8);
  s3.scale(1.2, 0.68, 1.1);
  s3.translate(0.76, 2.42, -0.18);
  const s4 = new THREE.SphereGeometry(0.68, 9, 8);
  s4.scale(1.15, 0.72, 1.1);
  s4.translate(0.08, 3.05, 0.12);
  const blossomGeo = mergeParts([s1, s2, s3, s4]);

  return {trunkGeo, blossomGeo};
}

function buildPartialFenceSegment(
  length: number,
  postCount: number,
  fenceMat: THREE.Material,
  capMat: THREE.Material,
): THREE.Group {
  const seg = new THREE.Group();
  const railTop = new THREE.Mesh(new RoundedBoxGeometry(length, 0.07, 0.06, 2, 0.015), fenceMat);
  railTop.position.y = 0.56;
  const railBot = new THREE.Mesh(new RoundedBoxGeometry(length, 0.07, 0.06, 2, 0.015), fenceMat);
  railBot.position.y = 0.26;
  seg.add(railTop, railBot);

  for (let i = 0; i < postCount; i++) {
    const t = postCount === 1 ? 0 : i / (postCount - 1) - 0.5;
    const x = t * (length - 0.14);
    const isEnd = i === 0 || i === postCount - 1;
    const h = isEnd ? 0.82 : 0.7;
    const picket = new THREE.Mesh(
      new RoundedBoxGeometry(isEnd ? 0.13 : 0.09, h, isEnd ? 0.13 : 0.05, 2, 0.015),
      fenceMat,
    );
    picket.position.set(x, h / 2, 0);
    seg.add(picket);
    if (isEnd) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.1, 4), capMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(x, h + 0.05, 0);
      seg.add(cap);
    }
  }
  return seg;
}

function buildFramedWindow(
  w: number,
  h: number,
  frameMat: THREE.Material,
  glassMat: THREE.Material,
  shutterMat?: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(w + 0.14, h + 0.14, 0.1, 2, 0.02), frameMat);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), glassMat);
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.135), frameMat);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.135), frameMat);
  g.add(frame, glass, vBar, hBar);

  if (shutterMat) {
    [-1, 1].forEach((side) => {
      const sh = new THREE.Mesh(
        new RoundedBoxGeometry(w * 0.34, h + 0.06, 0.07, 2, 0.02),
        shutterMat,
      );
      sh.position.set(side * (w * 0.5 + w * 0.22 + 0.06), 0, -0.01);
      g.add(sh);
    });
  }
  return g;
}

export function buildTownScene(): TownWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const windowMeshes: THREE.MeshStandardMaterial[] = [];
  const lampBulbs: THREE.MeshStandardMaterial[] = [];

  const getMat = createMatPool();
  const grassTex = createGrassTexture();
  grassTex.repeat.set(38, 38);
  const cobbleTex = createCobblestoneTexture();
  const signTex = createDailyQuestSignTexture();

  // ========== 1. EXPANDED TERRAIN + 1 WALKABLE SAKURA HILL IN DISTANCE ==========
  const terrainGeo = new THREE.CircleGeometry(135, 56);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.88,
    metalness: 0.0,
  });
  const groundMesh = new THREE.Mesh(terrainGeo, terrainMat);
  groundMesh.userData = {kind: 'ground'};
  group.add(groundMesh);

  // Single walkable Sakura Hill in the far background (-Z)
  const hillSize = HILL_RADIUS * 2.15;
  const hillGeo = new THREE.PlaneGeometry(hillSize, hillSize, 36, 36);
  hillGeo.rotateX(-Math.PI / 2);
  const hillPosAttr = hillGeo.attributes.position;
  for (let i = 0; i < hillPosAttr.count; i++) {
    const lx = hillPosAttr.getX(i);
    const lz = hillPosAttr.getZ(i);
    const d = Math.hypot(lx, lz);
    let y = -0.04;
    if (d < HILL_RADIUS) {
      const t = d / HILL_RADIUS;
      const u = THREE.MathUtils.clamp((t - 0.24) / 0.76, 0, 1);
      y = HILL_PEAK_Y * (0.5 + 0.5 * Math.cos(u * Math.PI));
    }
    hillPosAttr.setY(i, y);
  }
  hillGeo.computeVertexNormals();
  const hillTex = createGrassTexture();
  hillTex.repeat.set(5, 5);
  const hillMat = new THREE.MeshStandardMaterial({
    map: hillTex,
    color: '#A5DC8E',
    roughness: 0.86,
    metalness: 0.0,
  });
  const hillMesh = new THREE.Mesh(hillGeo, hillMat);
  hillMesh.position.set(HILL_CENTER.x, 0, HILL_CENTER.z);
  hillMesh.userData = {kind: 'ground'};
  group.add(hillMesh);

  // Static sculpted sky clouds
  const cloudMat = getMat('#FFFFFF', 0.85);
  [
    [-26, 17.5, -36, 1.85],
    [25, 18.2, -34, 1.7],
    [-28, 16.0, 28, 1.6],
    [26, 16.8, 30, 1.75],
    [0, 19.5, -42, 2.0],
  ].forEach(([cx, cy, cz, cs]) => {
    const cloud = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), cloudMat);
    const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.68, 9, 7), cloudMat);
    p2.position.set(-0.75, -0.15, 0.1);
    const p3 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 9, 7), cloudMat);
    p3.position.set(0.72, -0.18, -0.1);
    cloud.add(p1, p2, p3);
    cloud.scale.set(cs * 1.25, cs * 0.72, cs * 0.9);
    cloud.position.set(cx, cy, cz);
    group.add(cloud);
  });

  // Central Cobblestone Plaza
  const plazaMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.78,
    metalness: 0.02,
  });
  const plazaRim = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWN_PLAZA_RADIUS + 0.42, TOWN_PLAZA_RADIUS + 0.72, 0.14, 44),
    getMat('#D8C3A5', 0.76),
  );
  plazaRim.position.set(0, 0.04, 0);
  group.add(plazaRim);

  const plazaDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWN_PLAZA_RADIUS, TOWN_PLAZA_RADIUS + 0.06, 0.16, 44),
    plazaMat,
  );
  plazaDisc.position.set(0, 0.06, 0);
  group.add(plazaDisc);

  // ========== 2. GRAND 2-TIER FOUNTAIN + BENCHES + LAMPS ==========
  const fountain = new THREE.Group();
  fountain.position.set(0, 0.14, 0);

  const stoneBaseMat = getMat('#CBD5DF', 0.56);
  const stoneTrimMat = getMat('#E3EAF1', 0.48);
  const poolWaterMat = glossyClayMat('#55BEE8', 0.12);

  const lowerStep = new THREE.Mesh(
    new THREE.CylinderGeometry(2.08, 2.24, 0.16, 26),
    stoneBaseMat,
  );
  lowerStep.position.y = 0.08;

  const outerBasin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.88, 1.98, 0.44, 26),
    stoneBaseMat,
  );
  outerBasin.position.y = 0.34;

  const outerLip = new THREE.Mesh(
    new THREE.TorusGeometry(1.86, 0.12, 9, 26),
    stoneTrimMat,
  );
  outerLip.rotation.x = Math.PI / 2;
  outerLip.position.y = 0.56;

  const waterPool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.74, 1.74, 0.08, 22),
    poolWaterMat,
  );
  waterPool.position.y = 0.48;

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
      20,
    ),
    stoneTrimMat,
  );
  pillar.position.y = 0.32;

  const midWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.86, 0.86, 0.06, 18),
    poolWaterMat,
  );
  midWater.position.y = 1.62;

  const topFinial = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 9, 9),
    glossyClayMat('#F4C95D', 0.25),
  );
  topFinial.position.y = 2.92;

  fountain.add(lowerStep, outerBasin, outerLip, waterPool, pillar, midWater, topFinial);
  group.add(fountain);
  colliders.push({type: 'circle', id: 'fountain', x: 0, z: 0, r: 2.26});

  // Instanced fountain water droplets (1 draw call)
  const DROP_COUNT = 18;
  const dropGeo = new THREE.SphereGeometry(0.068, 6, 6);
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

  // 2 Symmetrical Plaza Benches
  const benchWoodMat = getMat('#BD8350', 0.7);
  const benchIronMat = getMat('#495057', 0.5, 0.4);
  [
    {
      id: 'bench_left',
      bx: -4.45,
      bz: 0,
      rot: Math.PI / 2,
      tx: -3.55,
      tz: 0,
      seatX: -4.38,
      seatZ: 0,
    },
    {
      id: 'bench_right',
      bx: 4.45,
      bz: 0,
      rot: -Math.PI / 2,
      tx: 3.55,
      tz: 0,
      seatX: 4.38,
      seatZ: 0,
    },
  ].forEach(({id, bx, bz, rot, tx, tz, seatX, seatZ}) => {
    const bench = new THREE.Group();
    bench.position.set(bx, 0.14, bz);
    bench.rotation.y = rot;
    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 0.12, 0.5, 2, 0.04),
      benchWoodMat,
    );
    seat.position.y = 0.32;
    const back = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 0.4, 0.1, 2, 0.03),
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
    [-5.1, -4.8],
    [5.1, -4.8],
    [-5.1, 4.8],
    [5.1, 4.8],
  ].forEach(([lx, lz]) => {
    const lamp = new THREE.Group();
    lamp.position.set(lx, 0.1, lz);
    const postBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 8), lampPostMat);
    postBase.position.y = 0.12;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 2.05, 8), lampPostMat);
    post.position.y = 1.12;
    const bulbMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.12,
      roughness: 0.25,
    });
    lampBulbs.push(bulbMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 9), bulbMat);
    head.position.y = 2.22;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.18, 8), lampPostMat);
    cap.position.y = 2.42;
    lamp.add(postBase, post, head, cap);
    group.add(lamp);
    colliders.push({type: 'circle', x: lx, z: lz, r: 0.3});
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

  // ========== DISTRICT 1: NHÀ CỦA TÔI (Cozy Dormer Cottage + Partial Fence + Chimney Smoke) ==========
  const SMOKE_COUNT = 7;
  let chimneySmokeMesh: THREE.InstancedMesh | null = null;
  const smokeOriginWorld = new THREE.Vector3();
  {
    const home = new THREE.Group();
    home.position.set(-19.5, 0, -13.0);
    home.rotation.y = 0.52;

    const stoneMat = getMat('#B8B2A6', 0.82);
    const creamMat = getMat('#FFF4E2', 0.72);
    const timberMat = getMat('#8A5B37', 0.72);
    const roofMat = getMat('#DF6B52', 0.58);
    const roofTrimMat = getMat('#B94F39', 0.62);
    const shutterMat = getMat('#74B39D', 0.65);
    const fenceMat = getMat('#FFFDF7', 0.74);
    const fenceCapMat = getMat('#D99B66', 0.65);

    const plinth = new THREE.Mesh(new RoundedBoxGeometry(4.9, 0.36, 3.9, 2, 0.08), stoneMat);
    plinth.position.y = 0.18;

    const walls = new THREE.Mesh(new RoundedBoxGeometry(4.4, 2.45, 3.4, 3, 0.12), creamMat);
    walls.position.y = 1.56;

    // Exposed timber corner posts & horizontal wainscot trim
    [
      [-2.14, 1.64],
      [2.14, 1.64],
      [-2.14, -1.64],
      [2.14, -1.64],
    ].forEach(([px, pz]) => {
      const beam = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.46, 0.18, 2, 0.04), timberMat);
      beam.position.set(px, 1.56, pz);
      home.add(beam);
    });
    const bandFront = new THREE.Mesh(new RoundedBoxGeometry(4.46, 0.14, 3.48, 2, 0.03), timberMat);
    bandFront.position.y = 0.96;

    // Overhanging pitched roof + ridge trim
    const roof = createExtrudedRoof(5.35, 2.0, 4.15, roofMat);
    roof.position.y = 3.58;
    const ridgeBeam = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.22, 4.35, 2, 0.05), roofTrimMat);
    ridgeBeam.position.y = 4.62;

    // Cute front dormer window on roof slope
    const dormerBody = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.72, 0.9, 2, 0.05), creamMat);
    dormerBody.position.set(-0.78, 3.55, 1.15);
    const dormerRoof = createExtrudedRoof(1.3, 0.55, 1.1, roofTrimMat);
    dormerRoof.position.set(-0.78, 4.05, 1.18);
    const dormerWin = buildFramedWindow(0.54, 0.44, timberMat, makeWinMat());
    dormerWin.position.set(-0.78, 3.56, 1.6);

    // Brick Chimney + Stone Cap
    const chimney = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 1.6, 0.68, 2, 0.06),
      getMat('#A95948', 0.78),
    );
    chimney.position.set(1.38, 4.15, -0.78);
    const chimneyCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.84, 0.18, 0.84, 2, 0.04),
      stoneMat,
    );
    chimneyCap.position.set(1.38, 4.98, -0.78);

    // Compute world coordinates for chimney smoke emitter
    smokeOriginWorld.set(1.38, 5.15, -0.78);
    home.updateMatrixWorld(true);
    smokeOriginWorld.applyMatrix4(home.matrixWorld);

    // Front Porch Canopy + Wooden Deck + Steps
    const porchDeck = new THREE.Mesh(
      new RoundedBoxGeometry(2.05, 0.22, 1.08, 2, 0.04),
      getMat('#C7976A', 0.74),
    );
    porchDeck.position.set(0, 0.25, 2.24);
    const porchStep = new THREE.Mesh(
      new RoundedBoxGeometry(1.75, 0.16, 0.56, 2, 0.04),
      stoneMat,
    );
    porchStep.position.set(0, 0.08, 2.84);
    const porchRoof = createExtrudedRoof(2.25, 0.62, 1.25, roofTrimMat);
    porchRoof.position.set(0, 2.52, 2.22);
    [-0.86, 0.86].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1.98, 8), timberMat);
      post.position.set(px, 1.32, 2.58);
      home.add(post);
    });

    // Porch warm lantern
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.4,
      roughness: 0.25,
    });
    lampBulbs.push(lanternMat);
    const porchLantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), lanternMat);
    porchLantern.position.set(0.66, 2.02, 2.24);

    // Arched Front Door + Brass Handle
    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.12, 1.62, 0.16, 2, 0.06),
      timberMat,
    );
    doorFrame.position.set(0, 1.15, 1.7);
    const door = new THREE.Mesh(
      new RoundedBoxGeometry(0.92, 1.48, 0.18, 2, 0.06),
      getMat('#B57647', 0.65),
    );
    door.position.set(0, 1.12, 1.72);
    const doorknob = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 8),
      glossyClayMat('#FFD166', 0.2),
    );
    doorknob.position.set(0.3, 1.06, 1.84);

    // Framed Front & Side Windows + Shutters + Flower Boxes
    const winL = buildFramedWindow(0.76, 0.78, timberMat, makeWinMat(), shutterMat);
    winL.position.set(-1.32, 1.66, 1.7);
    const winR = buildFramedWindow(0.76, 0.78, timberMat, makeWinMat(), shutterMat);
    winR.position.set(1.32, 1.66, 1.7);
    const winSideL = buildFramedWindow(0.84, 0.78, timberMat, makeWinMat());
    winSideL.rotation.y = -Math.PI / 2;
    winSideL.position.set(-2.22, 1.66, 0);
    const winSideR = buildFramedWindow(0.84, 0.78, timberMat, makeWinMat());
    winSideR.rotation.y = Math.PI / 2;
    winSideR.position.set(2.22, 1.66, 0);

    [-1.32, 1.32].forEach((wx) => {
      const fbox = new THREE.Mesh(
        new RoundedBoxGeometry(0.88, 0.2, 0.28, 2, 0.04),
        timberMat,
      );
      fbox.position.set(wx, 1.12, 1.84);
      const fl1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 7), getMat('#F28482', 0.65));
      fl1.position.set(wx - 0.18, 1.28, 1.85);
      const fl2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 7), getMat('#F9C74F', 0.65));
      fl2.position.set(wx + 0.18, 1.28, 1.85);
      home.add(fbox, fl1, fl2);
    });

    // Partial small wooden picket fence flanking front-left and front-right yard (not enclosing all around!)
    const fenceLeftFront = buildPartialFenceSegment(1.65, 5, fenceMat, fenceCapMat);
    fenceLeftFront.position.set(-2.15, 0, 2.38);
    const fenceLeftSide = buildPartialFenceSegment(1.55, 5, fenceMat, fenceCapMat);
    fenceLeftSide.rotation.y = Math.PI / 2;
    fenceLeftSide.position.set(-2.92, 0, 1.65);

    const fenceRightFront = buildPartialFenceSegment(1.65, 5, fenceMat, fenceCapMat);
    fenceRightFront.position.set(2.15, 0, 2.38);
    const fenceRightSide = buildPartialFenceSegment(1.55, 5, fenceMat, fenceCapMat);
    fenceRightSide.rotation.y = Math.PI / 2;
    fenceRightSide.position.set(2.92, 0, 1.65);

    // Cute mailbox right beside the fence gap
    const mailPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.85, 7), timberMat);
    mailPost.position.set(1.36, 0.42, 2.55);
    const mailBox = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.26, 0.44, 2, 0.08),
      glossyClayMat('#5FA8D3', 0.35),
    );
    mailBox.position.set(1.36, 0.92, 2.55);

    home.add(
      plinth,
      walls,
      bandFront,
      roof,
      ridgeBeam,
      dormerBody,
      dormerRoof,
      dormerWin,
      chimney,
      chimneyCap,
      porchDeck,
      porchStep,
      porchRoof,
      porchLantern,
      doorFrame,
      door,
      doorknob,
      winL,
      winR,
      winSideL,
      winSideR,
      fenceLeftFront,
      fenceLeftSide,
      fenceRightFront,
      fenceRightSide,
      mailPost,
      mailBox,
    );

    addInteractionProxy(
      home,
      [5.4, 5.2, 5.0],
      2.4,
      {
        kind: 'zone',
        zone: 'home' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.home.tx,
        tz: TOWN_ZONE_ENTRANCES.home.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'home', x: -19.5, z: -13.0, hw: 2.85, hd: 2.35, rotY: 0.52});
    group.add(home);

    // Lightweight 1-draw-call InstancedMesh chimney smoke
    const smokeGeo = new THREE.SphereGeometry(0.22, 7, 6);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.9,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    chimneySmokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, SMOKE_COUNT);
    chimneySmokeMesh.frustumCulled = false;
    group.add(chimneySmokeMesh);
  }

  // ========== BIỂN "NHIỆM VỤ NGÀY" TRƯỚC SÂN NHÀ ==========
  {
    const signBoardGroup = new THREE.Group();
    signBoardGroup.position.set(-14.2, 0, -11.4);
    signBoardGroup.rotation.y = 0.35;

    const postMat = getMat('#7A5032', 0.76);
    const footingMat = getMat('#AEB8C2', 0.8);
    [-0.58, 0.58].forEach((px) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 8), footingMat);
      foot.position.set(px, 0.08, 0);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.55, 8), postMat);
      post.position.set(px, 0.84, 0);
      signBoardGroup.add(foot, post);
    });

    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.52, 0.84, 0.14, 2, 0.04), postMat);
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
    addInteractionProxy(
      signBoardGroup,
      [1.7, 2.0, 0.8],
      1.0,
      {kind: 'daily_quests', tx: -13.5, tz: -9.8},
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'daily_quests', x: -14.2, z: -11.4, r: 0.58});
    group.add(signBoardGroup);
  }

  // ========== DISTRICT 2: KHU VƯỜN NÔNG TRẠI (Victorian Botanical Conservatory) ==========
  {
    const garden = new THREE.Group();
    garden.position.set(18.8, 0, -15.0);
    garden.rotation.y = -0.45;

    const stoneBaseMat2 = getMat('#C2B49E', 0.8);
    const brickKneeMat = getMat('#E8D7BE', 0.76);
    const frameMat = getMat('#3D6E55', 0.5, 0.18);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#D4F5FF',
      roughness: 0.12,
      metalness: 0.08,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    const foundation = new THREE.Mesh(
      new RoundedBoxGeometry(5.5, 0.28, 4.7, 2, 0.06),
      stoneBaseMat2,
    );
    foundation.position.y = 0.14;

    const kneeWall = new THREE.Mesh(
      new RoundedBoxGeometry(5.1, 0.78, 4.2, 2, 0.06),
      brickKneeMat,
    );
    kneeWall.position.y = 0.62;

    // Corner brick pilasters
    [
      [-2.5, 2.05],
      [2.5, 2.05],
      [-2.5, -2.05],
      [2.5, -2.05],
    ].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(new RoundedBoxGeometry(0.24, 2.55, 0.24, 2, 0.04), frameMat);
      pil.position.set(px, 1.5, pz);
      garden.add(pil);
    });

    const glassWalls = new THREE.Mesh(new THREE.BoxGeometry(4.85, 1.85, 3.95), glassMat);
    glassWalls.position.y = 1.92;

    // Main conservatory pitched glass roof
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-2.55, 0);
    roofShape.lineTo(0, 1.48);
    roofShape.lineTo(2.55, 0);
    roofShape.closePath();
    const roofGlassGeo = new THREE.ExtrudeGeometry(roofShape, {depth: 4.05, bevelEnabled: false});
    roofGlassGeo.center();
    const glassRoof = new THREE.Mesh(roofGlassGeo, glassMat);
    glassRoof.position.y = 3.55;

    // Iron ridge cresting + decorative leaf finial
    const ridgeBeam = new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 0.2, 4.2, 2, 0.03),
      frameMat,
    );
    ridgeBeam.position.y = 4.3;
    const finialStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.55, 7), frameMat);
    finialStem.position.set(0, 4.6, 0);
    const finialBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      glossyClayMat('#FFD166', 0.24),
    );
    finialBall.position.set(0, 4.9, 0);

    // Iron roof rafters & side mullions
    [-1.95, -0.65, 0.65, 1.95].forEach((mz) => {
      [-2.44, 2.44].forEach((mx) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.92, 0.1), frameMat);
        post.position.set(mx, 1.92, mz);
        garden.add(post);
      });
    });

    // Projecting Front Glass Portico + Double Doors
    const porticoBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 0.28, 0.85, 2, 0.04),
      stoneBaseMat2,
    );
    porticoBase.position.set(0, 0.14, 2.45);
    const porticoRoof = createExtrudedRoof(2.05, 0.72, 0.95, frameMat);
    porticoRoof.position.set(0, 2.75, 2.38);
    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.48, 2.08, 0.18, 2, 0.04),
      frameMat,
    );
    doorFrame.position.set(0, 1.32, 2.12);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.82, 0.2), glassMat);
    doorGlass.position.set(0, 1.3, 2.13);

    // Interior shelves & colorful botanical plants visible through glass
    const interiorBed = new THREE.Mesh(
      new RoundedBoxGeometry(3.7, 0.44, 2.5, 2, 0.04),
      getMat('#7D5333', 0.88),
    );
    interiorBed.position.set(0, 1.05, -0.2);
    const leafMat = getMat('#54B860', 0.68);
    const sunMat = getMat('#F9C74F', 0.52);
    const berryMat = getMat('#E85D68', 0.55);
    [
      [-1.15, -0.55, sunMat],
      [0, -0.65, berryMat],
      [1.15, -0.5, sunMat],
      [-0.85, 0.4, berryMat],
      [0.85, 0.4, sunMat],
    ].forEach(([px, pz, bm]) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 9, 8), leafMat);
      bush.position.set(px as number, 1.52, pz as number);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bm as THREE.Material);
      bloom.position.set(px as number, 1.98, pz as number);
      garden.add(bush, bloom);
    });

    // Outdoor potting bench + raised flower box beside entrance
    const outdoorBed = new THREE.Mesh(
      new RoundedBoxGeometry(1.65, 0.38, 0.95, 2, 0.05),
      getMat('#8C5C38', 0.85),
    );
    outdoorBed.position.set(-1.85, 0.34, 2.65);
    [-2.25, -1.85, -1.45].forEach((sx, idx) => {
      const sprout = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 7),
        idx === 1 ? sunMat : leafMat,
      );
      sprout.position.set(sx, 0.64, 2.65);
      garden.add(sprout);
    });

    garden.add(
      foundation,
      kneeWall,
      glassWalls,
      glassRoof,
      ridgeBeam,
      finialStem,
      finialBall,
      porticoBase,
      porticoRoof,
      doorFrame,
      doorGlass,
      interiorBed,
      outdoorBed,
    );

    addInteractionProxy(
      garden,
      [5.6, 5.0, 5.0],
      2.3,
      {
        kind: 'zone',
        zone: 'garden' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.garden.tx,
        tz: TOWN_ZONE_ENTRANCES.garden.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'garden', x: 18.8, z: -15.0, hw: 2.8, hd: 2.4, rotY: -0.45});
    group.add(garden);
  }

  // ========== DISTRICT 3: TIỆM THỜI TRANG (Parisian Pastel Boutique) ==========
  {
    const shop = new THREE.Group();
    shop.position.set(-22.2, 0, 6.2);
    shop.rotation.y = 1.1;

    const stoneStepMat = getMat('#EDE0D8', 0.78);
    const bodyMat = getMat('#FFEAF0', 0.65);
    const pilasterMat = getMat('#FFF8FA', 0.6);
    const mansardMat = getMat('#CC6079', 0.56);
    const roofTrimMat = getMat('#A8445B', 0.56);
    const goldMat = glossyClayMat('#FFD166', 0.22);

    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(4.85, 0.34, 3.85, 2, 0.08),
      stoneStepMat,
    );
    plinth.position.y = 0.17;

    const body = new THREE.Mesh(new RoundedBoxGeometry(4.4, 2.7, 3.35, 3, 0.12), bodyMat);
    body.position.y = 1.68;

    // Corner decorative pilasters + cornice band
    [
      [-2.14, 1.62],
      [2.14, 1.62],
      [-2.14, -1.62],
      [2.14, -1.62],
    ].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(new RoundedBoxGeometry(0.24, 2.72, 0.24, 2, 0.04), pilasterMat);
      pil.position.set(px, 1.68, pz);
      shop.add(pil);
    });
    const cornice = new THREE.Mesh(
      new RoundedBoxGeometry(4.65, 0.2, 3.6, 2, 0.04),
      pilasterMat,
    );
    cornice.position.y = 3.05;

    const mansard = new THREE.Mesh(
      new RoundedBoxGeometry(4.55, 1.05, 3.5, 3, 0.16),
      mansardMat,
    );
    mansard.position.y = 3.55;
    const roofCap = new THREE.Mesh(
      new RoundedBoxGeometry(3.65, 0.45, 2.65, 2, 0.08),
      roofTrimMat,
    );
    roofCap.position.y = 4.22;

    // 7-Stripe Scalloped Storefront Awning
    for (let i = 0; i < 7; i++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.58, 0.22, 1.12, 2, 0.05),
        getMat(i % 2 === 0 ? '#E86B82' : '#FFFDF9', 0.55),
      );
      stripe.position.set(-1.74 + i * 0.58, 2.32, 2.02);
      stripe.rotation.x = 0.38;
      shop.add(stripe);
    }

    // Large Framed Boutique Display Window + 2 Dress Forms inside
    const showWinFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.92, 1.48, 0.16, 2, 0.05),
      pilasterMat,
    );
    showWinFrame.position.set(-0.82, 1.32, 1.68);
    const showWin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.24, 0.18), makeWinMat());
    showWin.position.set(-0.82, 1.32, 1.7);

    const dress1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.82, 10), getMat('#F9A8BE', 0.5));
    dress1.position.set(-1.14, 1.12, 1.48);
    const dress2 = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.76, 10), getMat('#A7D8F0', 0.5));
    dress2.position.set(-0.5, 1.1, 1.48);

    // Tall Double Boutique Doors + Gold Handles
    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.26, 1.78, 0.18, 2, 0.05),
      pilasterMat,
    );
    doorFrame.position.set(1.08, 1.18, 1.68);
    const door = new THREE.Mesh(
      new RoundedBoxGeometry(1.08, 1.64, 0.2, 2, 0.05),
      getMat('#9E4B5D', 0.58),
    );
    door.position.set(1.08, 1.14, 1.7);

    // Potted Topiary Trees flanking the boutique entrance
    const potMat = getMat('#F5E6D3', 0.72);
    const topiaryMat = getMat('#5EA866', 0.72);
    [0.24, 1.92].forEach((tx) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.34, 9), potMat);
      pot.position.set(tx, 0.5, 2.08);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 8), topiaryMat);
      ball.position.set(tx, 0.92, 2.08);
      shop.add(pot, ball);
    });

    // Sculpted 3D Gold Ribbon Bow Crest on Roof
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), goldMat);
    bowCenter.position.set(0, 3.65, 1.82);
    [-0.4, 0.4].forEach((bx, idx) => {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.64, 10), goldMat);
      wing.rotation.z = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
      wing.position.set(bx, 3.65, 1.82);
      shop.add(wing);
    });

    // Partial dainty picket fence wings beside the boutique porch
    const shopFenceMat = getMat('#FFFDF7', 0.72);
    const shopCapMat = getMat('#E86B82', 0.62);
    const sFenceL = buildPartialFenceSegment(1.5, 4, shopFenceMat, shopCapMat);
    sFenceL.position.set(-2.05, 0, 2.38);
    const sFenceLSide = buildPartialFenceSegment(1.4, 4, shopFenceMat, shopCapMat);
    sFenceLSide.rotation.y = Math.PI / 2;
    sFenceLSide.position.set(-2.74, 0, 1.68);
    const sFenceRSide = buildPartialFenceSegment(1.4, 4, shopFenceMat, shopCapMat);
    sFenceRSide.rotation.y = Math.PI / 2;
    sFenceRSide.position.set(2.74, 0, 1.68);

    shop.add(
      plinth,
      body,
      cornice,
      mansard,
      roofCap,
      showWinFrame,
      showWin,
      dress1,
      dress2,
      doorFrame,
      door,
      bowCenter,
      sFenceL,
      sFenceLSide,
      sFenceRSide,
    );
    addInteractionProxy(
      shop,
      [5.0, 4.7, 4.4],
      2.2,
      {
        kind: 'zone',
        zone: 'boutique' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.boutique.tx,
        tz: TOWN_ZONE_ENTRANCES.boutique.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'boutique', x: -22.2, z: 6.2, hw: 2.65, hd: 2.25, rotY: 1.1});
    group.add(shop);
  }

  // ========== DISTRICT 4: TIỆM MINIGAME (Cozy Gabled Arcade Pavilion + Partial Picket Fence) ==========
  {
    const arcade = new THREE.Group();
    arcade.position.set(22.6, 0, 5.8);
    arcade.rotation.y = -1.14;

    const stonePlinthMat = getMat('#CFC9DF', 0.76);
    const wallCreamMat = getMat('#F5EEFC', 0.68);
    const trimLilacMat = getMat('#66569C', 0.56);
    const roofSlateMat = getMat('#54448A', 0.58);
    const coralMat = getMat('#E86B74', 0.5);
    const goldAccentMat = glossyClayMat('#FFD166', 0.24);
    const fenceMat = getMat('#FFFDF7', 0.74);
    const fenceCapMat = getMat('#66569C', 0.62);

    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(5.1, 0.36, 4.1, 2, 0.08),
      stonePlinthMat,
    );
    plinth.position.y = 0.18;

    const body = new THREE.Mesh(
      new RoundedBoxGeometry(4.5, 2.55, 3.45, 3, 0.12),
      wallCreamMat,
    );
    body.position.y = 1.62;

    // Corner framing pillars + wainscot band
    [
      [-2.18, 1.66],
      [2.18, 1.66],
      [-2.18, -1.66],
      [2.18, -1.66],
    ].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(new RoundedBoxGeometry(0.24, 2.58, 0.24, 2, 0.04), trimLilacMat);
      pil.position.set(px, 1.62, pz);
      arcade.add(pil);
    });
    const wainscot = new THREE.Mesh(
      new RoundedBoxGeometry(4.58, 0.64, 3.54, 2, 0.04),
      trimLilacMat,
    );
    wainscot.position.y = 0.64;

    // Warm pitched gable roof + coral ridge beam (replaces boxy upper deck!)
    const mainRoof = createExtrudedRoof(5.35, 1.85, 4.1, roofSlateMat);
    mainRoof.position.y = 3.74;
    const ridgeBeam = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.2, 4.3, 2, 0.05),
      coralMat,
    );
    ridgeBeam.position.y = 4.72;

    // Projecting Front Marquee Dormer Gable + Porch Steps & Timber Posts
    const marqueeGable = createExtrudedRoof(2.25, 0.76, 1.35, coralMat);
    marqueeGable.position.set(-0.92, 2.66, 2.1);
    const porchStep = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 0.22, 0.92, 2, 0.05),
      stonePlinthMat,
    );
    porchStep.position.set(-0.92, 0.16, 2.15);
    [-1.7, -0.14].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 1.98, 8), trimLilacMat);
      post.position.set(px, 1.34, 2.46);
      arcade.add(post);
    });

    // Warm porch lantern & star emblem on gable
    const arcadeLanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.42,
      roughness: 0.25,
    });
    lampBulbs.push(arcadeLanternMat);
    const porchLantern = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), arcadeLanternMat);
    porchLantern.position.set(-0.36, 2.02, 2.28);

    const starCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), goldAccentMat);
    starCrest.position.set(0, 3.85, 2.06);

    // Sculpted rooftop Arcade Joystick nestled on the main roof crest
    const joyBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.05, 0.2, 0.9, 2, 0.05),
      getMat('#2C244A', 0.5),
    );
    joyBase.position.set(0.65, 4.78, 0);
    const joyStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 0.68, 9),
      getMat('#DCE4EC', 0.32, 0.5),
    );
    joyStick.position.set(0.65, 5.14, 0);
    const joyKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 11, 10),
      glossyClayMat('#F05D68', 0.22),
    );
    joyKnob.position.set(0.65, 5.52, 0);

    // Striped Pastel Awning & Cozy Framed Window + Planter Flower Box
    for (let i = 0; i < 4; i++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.5, 0.16, 0.78, 2, 0.04),
        getMat(i % 2 === 0 ? '#F06B74' : '#FFFDF9', 0.55),
      );
      stripe.position.set(0.38 + i * 0.5, 2.18, 1.98);
      stripe.rotation.x = 0.38;
      arcade.add(stripe);
    }

    const winFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.86, 1.28, 0.16, 2, 0.05),
      trimLilacMat,
    );
    winFrame.position.set(1.05, 1.48, 1.72);
    const win = new THREE.Mesh(
      new RoundedBoxGeometry(1.6, 1.04, 0.18, 2, 0.04),
      new THREE.MeshStandardMaterial({
        color: '#72C2F0',
        emissive: '#4EA8DE',
        emissiveIntensity: 0.36,
        roughness: 0.2,
      }),
    );
    win.position.set(1.05, 1.48, 1.74);

    // Side windows so back/sides aren't blank
    const sideWinL = buildFramedWindow(0.84, 0.78, trimLilacMat, makeWinMat());
    sideWinL.rotation.y = -Math.PI / 2;
    sideWinL.position.set(-2.26, 1.62, 0);
    const sideWinR = buildFramedWindow(0.84, 0.78, trimLilacMat, makeWinMat());
    sideWinR.rotation.y = Math.PI / 2;
    sideWinR.position.set(2.26, 1.62, 0);

    // Window flower box
    const fbox = new THREE.Mesh(new RoundedBoxGeometry(1.66, 0.22, 0.3, 2, 0.04), trimLilacMat);
    fbox.position.set(1.05, 0.76, 1.88);
    const flA = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 7), coralMat);
    flA.position.set(0.75, 0.94, 1.9);
    const flB = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 7), goldAccentMat);
    flB.position.set(1.35, 0.94, 1.9);

    // Double Doors + Outdoor Gachapon Machine
    const door = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.68, 0.18, 2, 0.05), coralMat);
    door.position.set(-0.92, 1.16, 1.72);
    const gachaBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.56, 0.46, 2, 0.04),
      getMat('#FF758F', 0.45),
    );
    gachaBase.position.set(-1.95, 0.62, 2.02);
    const gachaGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      glossyClayMat('#E0F4FF', 0.15),
    );
    gachaGlobe.position.set(-1.95, 1.06, 2.02);

    // Partial decorative wooden picket fences flanking the arcade side/front yard (never enclosing!)
    const aFenceRightFront = buildPartialFenceSegment(1.7, 5, fenceMat, fenceCapMat);
    aFenceRightFront.position.set(1.92, 0, 2.48);
    const aFenceRightSide = buildPartialFenceSegment(1.65, 5, fenceMat, fenceCapMat);
    aFenceRightSide.rotation.y = Math.PI / 2;
    aFenceRightSide.position.set(2.8, 0, 1.68);
    const aFenceLeftSide = buildPartialFenceSegment(1.65, 5, fenceMat, fenceCapMat);
    aFenceLeftSide.rotation.y = Math.PI / 2;
    aFenceLeftSide.position.set(-2.8, 0, 1.68);

    arcade.add(
      plinth,
      body,
      wainscot,
      mainRoof,
      ridgeBeam,
      marqueeGable,
      porchStep,
      porchLantern,
      starCrest,
      joyBase,
      joyStick,
      joyKnob,
      winFrame,
      win,
      sideWinL,
      sideWinR,
      fbox,
      flA,
      flB,
      door,
      gachaBase,
      gachaGlobe,
      aFenceRightFront,
      aFenceRightSide,
      aFenceLeftSide,
    );
    addInteractionProxy(
      arcade,
      [5.2, 5.4, 4.6],
      2.3,
      {
        kind: 'zone',
        zone: 'arcade' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.arcade.tx,
        tz: TOWN_ZONE_ENTRANCES.arcade.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'arcade', x: 22.6, z: 5.8, hw: 2.68, hd: 2.28, rotY: -1.14});
    group.add(arcade);
  }

  // ========== DISTRICT 5: HỒ CÂU CÁ (Scenic Lakeside + Wooden Pier + Bait Stand) ==========
  {
    const lake = new THREE.Group();
    lake.position.set(-14.2, 0, 21.8);

    const shoreMat = getMat('#E5D1B0', 0.84);
    const waterMat = glossyClayMat('#4AB4DB', 0.12);
    const deepWaterMat = glossyClayMat('#3298C4', 0.1);

    const shoreMain = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.14, 22), shoreMat);
    shoreMain.position.set(-0.5, 0.03, 0.35);
    const shoreCove = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.55, 0.14, 18), shoreMat);
    shoreCove.position.set(1.85, 0.03, -0.65);

    const waterMain = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, 0.16, 22), waterMat);
    waterMain.position.set(-0.5, 0.05, 0.35);
    const waterDeep = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.17, 18), deepWaterMat);
    waterDeep.position.set(-0.6, 0.055, 0.45);
    const waterCove = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.16, 18), waterMat);
    waterCove.position.set(1.85, 0.05, -0.65);

    // Timber Pier with pilings & side bollards
    const woodPierMat = getMat('#C59160', 0.72);
    const woodDarkMat = getMat('#7A5230', 0.76);
    const pier = new THREE.Mesh(
      new RoundedBoxGeometry(1.48, 0.18, 2.9, 2, 0.04),
      woodPierMat,
    );
    pier.position.set(1.5, 0.24, -1.95);
    pier.rotation.y = 0.58;

    [
      [0.7, -2.5],
      [2.25, -1.45],
      [0.95, -1.1],
      [2.1, -2.75],
    ].forEach(([px, pz]) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.52, 8), woodDarkMat);
      piling.position.set(px, 0.26, pz);
      lake.add(piling);
    });

    const lanternPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.6, 8),
      woodDarkMat,
    );
    lanternPost.position.set(2.12, 0.94, -1.42);
    const pierLampMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    lampBulbs.push(pierLampMat);
    const pierLamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), pierLampMat);
    pierLamp.position.set(2.12, 1.78, -1.42);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.25, 0.52, 10),
      getMat('#A06B3E', 0.76),
    );
    barrel.position.set(0.96, 0.56, -2.25);

    // Lily pads & lotus blooms
    const padMat = getMat('#5DB86A', 0.68);
    const lotusMat = getMat('#F79EB0', 0.52);
    [
      [-1.6, 1.0],
      [-0.75, 1.85],
      [2.05, 0.35],
    ].forEach(([lx, lz]) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 12), padMat);
      pad.position.set(lx, 0.15, lz);
      const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 7), lotusMat);
      lotus.position.set(lx, 0.24, lz);
      lake.add(pad, lotus);
    });

    // Shore boulders & cattails
    const rockMat = getMat('#9DA7B2', 0.8);
    [
      [-3.55, 0.5, 0.5],
      [-2.85, 2.4, 0.42],
      [3.8, -0.65, 0.46],
    ].forEach(([rx, rz, rs]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rockMat);
      rock.scale.set(1.2, 0.75, 1.0);
      rock.position.set(rx, 0.22, rz);
      lake.add(rock);
    });

    lake.add(
      shoreMain,
      shoreCove,
      waterMain,
      waterDeep,
      waterCove,
      pier,
      lanternPost,
      pierLamp,
      barrel,
    );
    addInteractionProxy(
      lake,
      [7.0, 2.2, 6.2],
      0.95,
      {
        kind: 'zone',
        zone: 'fishing' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.fishing.tx,
        tz: TOWN_ZONE_ENTRANCES.fishing.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'fishing_a', x: -14.7, z: 22.15, r: 3.15});
    colliders.push({type: 'circle', id: 'fishing_b', x: -12.35, z: 21.15, r: 2.55});
    group.add(lake);
  }

  // ========== DISTRICT 6: TRẠM BƯU ĐIỆN & ĐỒNG HỒ (Town Clock Tower & Post Office) ==========
  {
    const kiosk = new THREE.Group();
    kiosk.position.set(14.2, 0, 20.5);
    kiosk.rotation.y = -0.58;

    const stoneBaseMat2 = getMat('#C8B8A4', 0.78);
    const brickLowerMat = getMat('#D88C6F', 0.74);
    const creamUpperMat = getMat('#F6E8D0', 0.68);
    const spireMat = getMat('#527496', 0.54);
    const woodDoorMat = getMat('#7D5333', 0.68);
    const goldMat = glossyClayMat('#FFD166', 0.24);

    const base = new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.34, 2.8, 2, 0.06), stoneBaseMat2);
    base.position.y = 0.17;

    const lowerStory = new THREE.Mesh(
      new RoundedBoxGeometry(2.35, 1.65, 2.2, 2, 0.08),
      brickLowerMat,
    );
    lowerStory.position.y = 1.12;

    const midLedge = new THREE.Mesh(
      new RoundedBoxGeometry(2.58, 0.18, 2.42, 2, 0.04),
      stoneBaseMat2,
    );
    midLedge.position.y = 1.98;

    const tower = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 1.65, 1.9, 2, 0.08),
      creamUpperMat,
    );
    tower.position.y = 2.82;

    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.58, 1.75, 4), spireMat);
    spire.rotation.y = Math.PI / 4;
    spire.position.y = 4.48;

    const spireFinial = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 9), goldMat);
    spireFinial.position.y = 5.42;

    // Clock Face + Rim + Hands
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 0.1, 16),
      getMat('#FFFFFF', 0.35),
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 2.88, 0.96);

    const clockRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.07, 8, 18),
      getMat('#6E4E34', 0.58),
    );
    clockRim.position.set(0, 2.88, 0.98);

    const handHour = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.04), getMat('#2B2D42', 0.5));
    handHour.position.set(0, 2.98, 1.03);
    const handMin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.04), getMat('#2B2D42', 0.5));
    handMin.position.set(0.14, 2.88, 1.03);

    // Post-office arched door + striped canopy + red postbox + parcel crate
    const doorCanopy = createExtrudedRoof(1.38, 0.42, 0.72, spireMat);
    doorCanopy.position.set(0, 1.78, 1.28);
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.86, 1.32, 0.16, 2, 0.04), woodDoorMat);
    door.position.set(0, 0.96, 1.12);

    const postbox = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.56, 7, 10),
      glossyClayMat('#D94F4F', 0.3),
    );
    postbox.position.set(1.36, 0.74, 0.65);

    const parcel = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.4, 0.42, 2, 0.04),
      getMat('#D9A566', 0.78),
    );
    parcel.position.set(-1.32, 0.54, 0.72);

    kiosk.add(
      base,
      lowerStory,
      midLedge,
      tower,
      spire,
      spireFinial,
      clockFace,
      clockRim,
      handHour,
      handMin,
      doorCanopy,
      door,
      postbox,
      parcel,
    );
    addInteractionProxy(
      kiosk,
      [3.6, 5.6, 3.2],
      2.5,
      {kind: 'settings', tx: 12.45, tz: 23.1},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'settings', x: 14.2, z: 20.5, hw: 1.75, hd: 1.55, rotY: -0.58});
    group.add(kiosk);
  }

  // ========== 3. TALL INSTANCED GREEN TREES (FARM-SCALE 6.4m–8.3m, ONLY 3 DRAW CALLS TOTAL!) ==========
  const {trunkGeo, lowerCanopyGeo, upperCanopyGeo} = createTreeGeometries();
  const trunkMat = getMat('#7B5337', 0.82);
  const lowerLeafMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74});
  const upperLeafMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.7});

  const greenTrees: [number, number, number][] = [
    // Inner town airy park shade trees (clear of plaza, buildings & entrances)
    [-9.8, -14.8, 1.54],
    [9.4, -15.2, 1.58],
    [-12.6, -1.6, 1.48],
    [12.8, -2.0, 1.5],
    [-13.8, 13.0, 1.54],
    [12.4, 12.2, 1.52],
    [-4.2, 15.8, 1.46],
    [4.8, 15.6, 1.48],
    // Outer residential & garden grove
    [-26.8, -19.2, 1.72],
    [-28.2, -9.8, 1.78],
    [-23.5, -22.2, 1.66],
    [-16.8, -23.4, 1.6],
    [-10.8, -25.2, 1.68],
    [14.8, -24.8, 1.72],
    [24.8, -22.4, 1.82],
    [27.8, -14.0, 1.7],
    [28.6, -4.5, 1.84],
    // West & East forest border
    [-30.0, -1.5, 1.76],
    [-30.8, 8.2, 1.86],
    [-29.2, 16.5, 1.72],
    [-25.4, 24.0, 1.78],
    [-20.8, 27.6, 1.68],
    [-7.2, 27.8, 1.64],
    [2.8, 28.2, 1.72],
    [19.8, 26.4, 1.78],
    [26.8, 18.8, 1.74],
    [29.6, 10.0, 1.86],
    [30.2, 1.2, 1.68],
    // Far scenic backdrop flanking the sakura hill
    [-18.8, -30.5, 1.8],
    [-12.4, -32.2, 1.88],
    [15.6, -31.8, 1.86],
    [22.4, -29.2, 1.76],
    [-32.0, -24.2, 1.84],
    [32.0, -23.0, 1.82],
    [-33.0, 22.0, 1.86],
    [32.6, 23.6, 1.88],
    // Mid-meadow cozy shade trees
    [-27.6, 1.4, 1.56],
    [28.0, -9.0, 1.6],
    [-5.6, -15.2, 1.52],
    [7.2, -19.2, 1.55],
    [23.2, 14.8, 1.62],
    [-22.6, 17.2, 1.58],
  ];

  const treeTrunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, greenTrees.length);
  const treeLowerIM = new THREE.InstancedMesh(lowerCanopyGeo, lowerLeafMat, greenTrees.length);
  const treeUpperIM = new THREE.InstancedMesh(upperCanopyGeo, upperLeafMat, greenTrees.length);

  const lowerPalette = ['#549F5C', '#5EA964', '#4F9857', '#62AE68'];
  const upperPalette = ['#70C477', '#7DCE83', '#69BC70', '#84D489'];

  greenTrees.forEach(([tx, tz, ts], i) => {
    _instDummy.position.set(tx, getTownGroundHeight(tx, tz) - 0.04, tz);
    _instDummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
    _instDummy.scale.setScalar(ts);
    _instDummy.updateMatrix();
    treeTrunkIM.setMatrixAt(i, _instDummy.matrix);
    treeLowerIM.setMatrixAt(i, _instDummy.matrix);
    treeUpperIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(lowerPalette[i % lowerPalette.length]);
    treeLowerIM.setColorAt(i, _instColor);
    _instColor.set(upperPalette[i % upperPalette.length]);
    treeUpperIM.setColorAt(i, _instColor);

    if (Math.abs(tx) < 35 && Math.abs(tz) < 35) {
      colliders.push({type: 'circle', x: tx, z: tz, r: 0.42 * ts});
    }
  });
  treeTrunkIM.instanceMatrix.needsUpdate = true;
  treeLowerIM.instanceMatrix.needsUpdate = true;
  treeUpperIM.instanceMatrix.needsUpdate = true;
  if (treeLowerIM.instanceColor) treeLowerIM.instanceColor.needsUpdate = true;
  if (treeUpperIM.instanceColor) treeUpperIM.instanceColor.needsUpdate = true;
  treeTrunkIM.computeBoundingSphere();
  treeLowerIM.computeBoundingSphere();
  treeUpperIM.computeBoundingSphere();
  group.add(treeTrunkIM, treeLowerIM, treeUpperIM);

  // ========== 4. SAKURA (HOA ĐÀO) TREES & PETALS ON THE WALKABLE HILL ==========
  const {trunkGeo: sakuraTrunkGeo, blossomGeo: sakuraBlossomGeo} = createSakuraGeometries();
  const sakuraTrunkMat = getMat('#5C3E32', 0.82);
  const sakuraBlossomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.65});

  // Ring of 8 sakura trees crowning the summit & upper slopes of the hill, leaving center clear
  const sakuraTrees: [number, number, number][] = [
    [HILL_CENTER.x - 3.6, HILL_CENTER.z - 2.6, 1.38],
    [HILL_CENTER.x + 3.8, HILL_CENTER.z - 2.4, 1.42],
    [HILL_CENTER.x - 0.4, HILL_CENTER.z - 4.4, 1.54],
    [HILL_CENTER.x - 5.2, HILL_CENTER.z + 1.4, 1.32],
    [HILL_CENTER.x + 5.2, HILL_CENTER.z + 1.6, 1.35],
    [HILL_CENTER.x - 3.2, HILL_CENTER.z + 4.8, 1.24],
    [HILL_CENTER.x + 3.4, HILL_CENTER.z + 4.9, 1.26],
    [HILL_CENTER.x + 1.8, HILL_CENTER.z - 5.6, 1.48],
  ];

  const sakuraTrunkIM = new THREE.InstancedMesh(sakuraTrunkGeo, sakuraTrunkMat, sakuraTrees.length);
  const sakuraBlossomIM = new THREE.InstancedMesh(sakuraBlossomGeo, sakuraBlossomMat, sakuraTrees.length);
  const sakuraTints = ['#FFADC6', '#FFB8CE', '#F89AB8', '#FFC6D9'];

  sakuraTrees.forEach(([sx, sz, ss], i) => {
    const sy = getTownGroundHeight(sx, sz) - 0.08;
    _instDummy.position.set(sx, sy, sz);
    _instDummy.rotation.set(0, i * 1.1, 0);
    _instDummy.scale.setScalar(ss);
    _instDummy.updateMatrix();
    sakuraTrunkIM.setMatrixAt(i, _instDummy.matrix);
    sakuraBlossomIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(sakuraTints[i % sakuraTints.length]);
    sakuraBlossomIM.setColorAt(i, _instColor);

    colliders.push({type: 'circle', x: sx, z: sz, r: 0.36 * ss});
  });
  sakuraTrunkIM.instanceMatrix.needsUpdate = true;
  sakuraBlossomIM.instanceMatrix.needsUpdate = true;
  if (sakuraBlossomIM.instanceColor) sakuraBlossomIM.instanceColor.needsUpdate = true;
  sakuraTrunkIM.computeBoundingSphere();
  sakuraBlossomIM.computeBoundingSphere();
  group.add(sakuraTrunkIM, sakuraBlossomIM);

  // Static fallen sakura petals scattered across the hill summit & upper slope (1 draw call)
  const petalCount = 70;
  const petalGeo = new THREE.CircleGeometry(0.11, 5);
  petalGeo.rotateX(-Math.PI / 2);
  const petalMat = new THREE.MeshStandardMaterial({
    color: '#FFB7CE',
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const petalIM = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  for (let i = 0; i < petalCount; i++) {
    const angle = i * 2.39996;
    const rad = 0.6 + ((i * 0.43) % 7.2);
    const px = HILL_CENTER.x + Math.cos(angle) * rad;
    const pz = HILL_CENTER.z + Math.sin(angle) * rad;
    const py = getTownGroundHeight(px, pz) + 0.03;
    _instDummy.position.set(px, py, pz);
    _instDummy.rotation.set(0, angle, 0);
    _instDummy.scale.set(1.2, 1, 0.75);
    _instDummy.updateMatrix();
    petalIM.setMatrixAt(i, _instDummy.matrix);
  }
  petalIM.instanceMatrix.needsUpdate = true;
  petalIM.computeBoundingSphere();
  group.add(petalIM);

  // ========== 5. SHORT DOORSTEP STEPPING STONES & WOODEN MATS RIGHT IN FRONT OF EACH BUILDING ==========
  const stonePoints: [number, number, number][] = [];
  const addDoorstepStones = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    steps: number,
  ) => {
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const sx = THREE.MathUtils.lerp(x0, x1, t) + (s % 2 === 0 ? 0.14 : -0.14);
      const sz = THREE.MathUtils.lerp(z0, z1, t);
      stonePoints.push([sx, sz, 0.85 + ((s * 37) % 8) * 0.03]);
    }
  };

  // Only short doorstep stone entries directly in front of each building (no long plaza spokes)
  addDoorstepStones(TOWN_ZONE_ENTRANCES.home.tx + 0.4, TOWN_ZONE_ENTRANCES.home.tz + 0.3, TOWN_ZONE_ENTRANCES.home.tx + 1.5, TOWN_ZONE_ENTRANCES.home.tz + 1.8, 3);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.garden.tx - 0.3, TOWN_ZONE_ENTRANCES.garden.tz + 0.3, TOWN_ZONE_ENTRANCES.garden.tx - 1.3, TOWN_ZONE_ENTRANCES.garden.tz + 1.8, 3);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.boutique.tx + 0.5, TOWN_ZONE_ENTRANCES.boutique.tz + 0.1, TOWN_ZONE_ENTRANCES.boutique.tx + 2.1, TOWN_ZONE_ENTRANCES.boutique.tz - 0.4, 3);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.arcade.tx - 0.5, TOWN_ZONE_ENTRANCES.arcade.tz + 0.1, TOWN_ZONE_ENTRANCES.arcade.tx - 2.1, TOWN_ZONE_ENTRANCES.arcade.tz - 0.4, 3);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.fishing.tx + 0.3, TOWN_ZONE_ENTRANCES.fishing.tz - 0.5, TOWN_ZONE_ENTRANCES.fishing.tx + 1.3, TOWN_ZONE_ENTRANCES.fishing.tz - 2.1, 3);
  addDoorstepStones(12.2, 23.2, 11.2, 25.0, 3);
  // Subtle trail right on the Sakura Hill front slope entrance
  addDoorstepStones(HILL_CENTER.x - 0.3, HILL_CENTER.z + 9.2, HILL_CENTER.x, HILL_CENTER.z + 3.6, 5);

  const stepStoneGeo = new THREE.CylinderGeometry(0.46, 0.52, 0.06, 9);
  const stepStoneMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.82});
  const stepStoneIM = new THREE.InstancedMesh(stepStoneGeo, stepStoneMat, stonePoints.length);
  const stoneTints = ['#E2D3BC', '#D8C7AE', '#EADBC5', '#CFC4B4'];
  stonePoints.forEach(([sx, sz, scale], i) => {
    const sy = getTownGroundHeight(sx, sz) + 0.02;
    _instDummy.position.set(sx, sy, sz);
    _instDummy.rotation.set(0, (i * 0.9) % Math.PI, 0);
    _instDummy.scale.set(scale * 1.15, 1, scale * 0.88);
    _instDummy.updateMatrix();
    stepStoneIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(stoneTints[i % stoneTints.length]);
    stepStoneIM.setColorAt(i, _instColor);
  });
  stepStoneIM.instanceMatrix.needsUpdate = true;
  if (stepStoneIM.instanceColor) stepStoneIM.instanceColor.needsUpdate = true;
  stepStoneIM.computeBoundingSphere();
  group.add(stepStoneIM);

  // Small wooden plank welcome mats directly in front of doors
  const plankGeo = new RoundedBoxGeometry(1.55, 0.05, 0.32, 2, 0.015);
  const plankMat = getMat('#BA8554', 0.76);
  const plankCoords: [number, number, number][] = [
    [TOWN_ZONE_ENTRANCES.home.tx, TOWN_ZONE_ENTRANCES.home.tz, 0.52],
    [TOWN_ZONE_ENTRANCES.home.tx + 0.4, TOWN_ZONE_ENTRANCES.home.tz + 0.65, 0.52],
    [TOWN_ZONE_ENTRANCES.boutique.tx, TOWN_ZONE_ENTRANCES.boutique.tz, 1.1],
    [TOWN_ZONE_ENTRANCES.boutique.tx + 0.7, TOWN_ZONE_ENTRANCES.boutique.tz + 0.3, 1.1],
    [TOWN_ZONE_ENTRANCES.arcade.tx, TOWN_ZONE_ENTRANCES.arcade.tz, -1.14],
    [TOWN_ZONE_ENTRANCES.arcade.tx - 0.7, TOWN_ZONE_ENTRANCES.arcade.tz + 0.3, -1.14],
    [TOWN_ZONE_ENTRANCES.fishing.tx, TOWN_ZONE_ENTRANCES.fishing.tz, 0.55],
    [TOWN_ZONE_ENTRANCES.fishing.tx + 0.5, TOWN_ZONE_ENTRANCES.fishing.tz - 0.6, 0.55],
  ];
  const plankIM = new THREE.InstancedMesh(plankGeo, plankMat, plankCoords.length);
  plankCoords.forEach(([px, pz, prot], i) => {
    _instDummy.position.set(px, getTownGroundHeight(px, pz) + 0.02, pz);
    _instDummy.rotation.set(0, prot, 0);
    _instDummy.scale.setScalar(1);
    _instDummy.updateMatrix();
    plankIM.setMatrixAt(i, _instDummy.matrix);
  });
  plankIM.instanceMatrix.needsUpdate = true;
  plankIM.computeBoundingSphere();
  group.add(plankIM);

  // ========== 6. STATIC INSTANCED GROUND FLORA (BUSHES, WILDFLOWERS, GRASS TUFTS, ROCKS) ==========
  const bushCoords: [number, number, string][] = [
    [-7.6, -2.6, '#F28482'],
    [7.6, -2.6, '#F9C74F'],
    [-7.6, 2.6, '#F7A8B8'],
    [7.6, 2.6, '#A8D8EA'],
    [-22.5, -15.8, '#F9C74F'],
    [-16.2, -16.2, '#F28482'],
    [14.8, -18.2, '#F7A8B8'],
    [22.4, -17.4, '#F9C74F'],
    [-25.0, 2.8, '#A8D8EA'],
    [-19.6, 9.8, '#F7A8B8'],
    [25.6, 2.4, '#F28482'],
    [20.4, 9.6, '#F9C74F'],
    [-18.0, 20.5, '#A8D8EA'],
    [-9.4, 22.8, '#F7A8B8'],
    [10.8, 19.2, '#F9C74F'],
    [17.0, 18.0, '#F28482'],
    [-6.6, -18.8, '#F7A8B8'],
    [8.2, -20.5, '#A8D8EA'],
    [-17.8, 0.2, '#F9C74F'],
    [17.8, -1.2, '#F28482'],
    [-2.0, 12.2, '#F7A8B8'],
    [2.6, 12.4, '#F9C74F'],
  ];
  const bushBodyGeo = new THREE.SphereGeometry(0.42, 9, 7);
  bushBodyGeo.scale(1.25, 0.78, 1.15);
  bushBodyGeo.translate(0, 0.28, 0);
  const bushBodyMat = getMat('#5FB465', 0.76);
  const bushBodyIM = new THREE.InstancedMesh(bushBodyGeo, bushBodyMat, bushCoords.length);

  const bDot1 = new THREE.SphereGeometry(0.1, 6, 6);
  bDot1.translate(-0.18, 0.46, 0.14);
  const bDot2 = new THREE.SphereGeometry(0.1, 6, 6);
  bDot2.translate(0.18, 0.44, -0.08);
  const bDot3 = new THREE.SphereGeometry(0.1, 6, 6);
  bDot3.translate(0.02, 0.52, 0.2);
  const bushBlossomGeo = mergeParts([bDot1, bDot2, bDot3]);
  const bushBlossomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.6});
  const bushBlossomIM = new THREE.InstancedMesh(bushBlossomGeo, bushBlossomMat, bushCoords.length);

  bushCoords.forEach(([bx, bz, col], i) => {
    const by = getTownGroundHeight(bx, bz) - 0.02;
    _instDummy.position.set(bx, by, bz);
    _instDummy.rotation.set(0, i * 0.8, 0);
    _instDummy.scale.setScalar(0.95 + (i % 3) * 0.12);
    _instDummy.updateMatrix();
    bushBodyIM.setMatrixAt(i, _instDummy.matrix);
    bushBlossomIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(col);
    bushBlossomIM.setColorAt(i, _instColor);
    colliders.push({type: 'circle', x: bx, z: bz, r: 0.44});
  });
  bushBodyIM.instanceMatrix.needsUpdate = true;
  bushBlossomIM.instanceMatrix.needsUpdate = true;
  if (bushBlossomIM.instanceColor) bushBlossomIM.instanceColor.needsUpdate = true;
  bushBodyIM.computeBoundingSphere();
  bushBlossomIM.computeBoundingSphere();
  group.add(bushBodyIM, bushBlossomIM);

  // Static wildflower clusters scattered across wide meadows & hill (2 draw calls)
  const FLOWER_COUNT = 145;
  const fStem1 = new THREE.CylinderGeometry(0.02, 0.025, 0.18, 5);
  fStem1.translate(0, 0.09, 0);
  const fLeaf = new THREE.ConeGeometry(0.14, 0.08, 5);
  fLeaf.translate(0, 0.04, 0);
  const flowerBaseGeo = mergeParts([fStem1, fLeaf]);
  const flowerBaseMat = getMat('#5CB662', 0.78);
  const flowerBaseIM = new THREE.InstancedMesh(flowerBaseGeo, flowerBaseMat, FLOWER_COUNT);

  const fPet1 = new THREE.SphereGeometry(0.085, 6, 5);
  fPet1.scale(1.1, 0.6, 1.1);
  fPet1.translate(0, 0.2, 0);
  const fPet2 = new THREE.SphereGeometry(0.065, 6, 5);
  fPet2.scale(1.1, 0.6, 1.1);
  fPet2.translate(0.12, 0.14, 0.08);
  const flowerTopGeo = mergeParts([fPet1, fPet2]);
  const flowerTopMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.6});
  const flowerTopIM = new THREE.InstancedMesh(flowerTopGeo, flowerTopMat, FLOWER_COUNT);

  const wildflowerPalette = ['#FFE066', '#FF9EAA', '#A8E0FF', '#D5B8FF', '#FFFFFF'];
  let placedFlowers = 0;
  for (let i = 0; i < 260 && placedFlowers < FLOWER_COUNT; i++) {
    const angle = i * 2.39996;
    const rad = 7.6 + ((i * 0.81) % 25.0);
    const fx = Math.cos(angle) * rad;
    const fz = Math.sin(angle) * rad;
    if (Math.hypot(fx + 14.2, fz - 21.8) < 4.8) continue;
    if (Math.hypot(fx + 19.5, fz + 13.0) < 3.8) continue;
    if (Math.hypot(fx - 18.8, fz + 15.0) < 4.0) continue;
    if (Math.hypot(fx + 22.2, fz - 6.2) < 3.8) continue;
    if (Math.hypot(fx - 22.6, fz - 5.8) < 3.8) continue;
    if (Math.hypot(fx - 14.2, fz - 20.5) < 3.2) continue;

    const fy = getTownGroundHeight(fx, fz) - 0.01;
    _instDummy.position.set(fx, fy, fz);
    _instDummy.rotation.set(0, angle, 0);
    _instDummy.scale.setScalar(0.85 + (placedFlowers % 4) * 0.14);
    _instDummy.updateMatrix();
    flowerBaseIM.setMatrixAt(placedFlowers, _instDummy.matrix);
    flowerTopIM.setMatrixAt(placedFlowers, _instDummy.matrix);
    _instColor.set(wildflowerPalette[placedFlowers % wildflowerPalette.length]);
    flowerTopIM.setColorAt(placedFlowers, _instColor);
    placedFlowers++;
  }
  flowerBaseIM.count = placedFlowers;
  flowerTopIM.count = placedFlowers;
  flowerBaseIM.instanceMatrix.needsUpdate = true;
  flowerTopIM.instanceMatrix.needsUpdate = true;
  if (flowerTopIM.instanceColor) flowerTopIM.instanceColor.needsUpdate = true;
  flowerBaseIM.computeBoundingSphere();
  flowerTopIM.computeBoundingSphere();
  group.add(flowerBaseIM, flowerTopIM);

  // Static grass tufts (1 draw call)
  const TUFT_COUNT = 140;
  const t1 = new THREE.ConeGeometry(0.08, 0.24, 4);
  t1.rotateZ(0.22);
  t1.translate(-0.06, 0.11, 0);
  const t2 = new THREE.ConeGeometry(0.07, 0.28, 4);
  t2.rotateZ(-0.18);
  t2.translate(0.06, 0.13, 0.04);
  const t3 = new THREE.ConeGeometry(0.07, 0.2, 4);
  t3.rotateX(0.2);
  t3.translate(0, 0.09, -0.06);
  const tuftGeo = mergeParts([t1, t2, t3]);
  const tuftMat = getMat('#66B868', 0.8);
  const tuftIM = new THREE.InstancedMesh(tuftGeo, tuftMat, TUFT_COUNT);
  let placedTufts = 0;
  for (let i = 0; i < 240 && placedTufts < TUFT_COUNT; i++) {
    const angle = i * 2.39996 + 0.9;
    const rad = 7.8 + ((i * 0.91) % 25.5);
    const gx = Math.cos(angle) * rad;
    const gz = Math.sin(angle) * rad;
    if (Math.hypot(gx + 14.2, gz - 21.8) < 4.8) continue;
    const gy = getTownGroundHeight(gx, gz) - 0.01;
    _instDummy.position.set(gx, gy, gz);
    _instDummy.rotation.set(0, angle, 0);
    _instDummy.scale.setScalar(0.8 + (placedTufts % 3) * 0.2);
    _instDummy.updateMatrix();
    tuftIM.setMatrixAt(placedTufts, _instDummy.matrix);
    placedTufts++;
  }
  tuftIM.count = placedTufts;
  tuftIM.instanceMatrix.needsUpdate = true;
  tuftIM.computeBoundingSphere();
  group.add(tuftIM);

  // Static accent pebbles / mossy rocks near edges & hill base (1 draw call)
  const rockCoords: [number, number, number][] = [
    [-7.8, -16.2, 0.42],
    [10.2, -18.5, 0.48],
    [-19.5, -1.5, 0.45],
    [22.0, -2.5, 0.46],
    [-5.5, 16.5, 0.38],
    [6.5, 15.2, 0.4],
    [HILL_CENTER.x - 7.5, HILL_CENTER.z + 5.2, 0.56],
    [HILL_CENTER.x + 7.8, HILL_CENTER.z + 4.8, 0.52],
    [HILL_CENTER.x - 5.2, HILL_CENTER.z - 6.8, 0.6],
    [HILL_CENTER.x + 5.6, HILL_CENTER.z - 6.4, 0.58],
    [-24.0, 9.8, 0.5],
    [24.2, 10.2, 0.48],
  ];
  const pebbleGeo = new THREE.DodecahedronGeometry(0.65, 0);
  pebbleGeo.scale(1.25, 0.72, 1.0);
  const pebbleMat = getMat('#9AA5B0', 0.84);
  const pebbleIM = new THREE.InstancedMesh(pebbleGeo, pebbleMat, rockCoords.length);
  rockCoords.forEach(([rx, rz, rs], i) => {
    _instDummy.position.set(rx, getTownGroundHeight(rx, rz) + rs * 0.2, rz);
    _instDummy.rotation.set(0, i * 1.2, 0);
    _instDummy.scale.setScalar(rs);
    _instDummy.updateMatrix();
    pebbleIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'circle', x: rx, z: rz, r: rs * 0.72});
  });
  pebbleIM.instanceMatrix.needsUpdate = true;
  pebbleIM.computeBoundingSphere();
  group.add(pebbleIM);

  // Track last applied timeOfDay so emissive updates only run when changed
  let lastAppliedTod: TimeOfDay | null = null;

  const update = (elapsed: number, timeOfDay: TimeOfDay) => {
    if (timeOfDay !== lastAppliedTod) {
      lastAppliedTod = timeOfDay;
      const isNight = timeOfDay === 'night';
      const isSunset = timeOfDay === 'sunset';
      const winEmissive = isNight ? 1.15 : isSunset ? 0.65 : 0.08;
      const bulbEmissive = isNight ? 1.4 : isSunset ? 0.75 : 0.14;

      windowMeshes.forEach((m) => {
        m.emissiveIntensity = winEmissive;
      });
      lampBulbs.forEach((m) => {
        m.emissiveIntensity = bulbEmissive;
      });
    }

    // 1. Fountain spray (1 draw call, zero allocations)
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

    // 2. Gentle chimney smoke (1 draw call, zero allocations)
    if (chimneySmokeMesh) {
      for (let i = 0; i < SMOKE_COUNT; i++) {
        const t = (elapsed * 0.28 + i / SMOKE_COUNT) % 1;
        const sx = smokeOriginWorld.x + Math.sin(t * Math.PI * 2 + i) * 0.22 + t * 0.35;
        const sy = smokeOriginWorld.y + t * 2.4;
        const sz = smokeOriginWorld.z + Math.cos(t * Math.PI * 1.6 + i) * 0.15 - t * 0.2;
        const s = Math.sin(t * Math.PI) * (0.65 + t * 0.85);
        _smokeDummy.position.set(sx, sy, sz);
        _smokeDummy.scale.setScalar(Math.max(0.001, s));
        _smokeDummy.updateMatrix();
        chimneySmokeMesh.setMatrixAt(i, _smokeDummy.matrix);
      }
      chimneySmokeMesh.instanceMatrix.needsUpdate = true;
    }
  };

  const dispose = () => {
    grassTex.dispose();
    hillTex.dispose();
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
    groundMeshes: [groundMesh, hillMesh],
    clickTargets,
    labelAnchors,
    colliders,
    plazaRadius: TOWN_PLAZA_RADIUS,
    update,
    dispose,
  };
}
