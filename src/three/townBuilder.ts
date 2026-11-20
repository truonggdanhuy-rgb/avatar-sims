import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TimeOfDay, ZoneId} from '../types/game';
import {createCobblestoneTexture, createGrassTexture, glossyClayMat} from './materials';

export const TOWN_PLAZA_RADIUS = 7.0;
export const HILL_CENTER = {x: 0, z: -42.5};
export const HILL_RADIUS = 12.2;
export const HILL_PEAK_Y = 3.8;

export const TOWN_ZONE_ENTRANCES: Record<
  Exclude<ZoneId, 'town'>,
  {tx: number; tz: number; exitRotY: number}
> = {
  home: {tx: -28.35, tz: -13.95, exitRotY: 0.38},
  garden: {tx: 29.35, tz: -13.9, exitRotY: -0.38},
  boutique: {tx: -29.55, tz: 16.45, exitRotY: 0.95},
  arcade: {tx: 29.4, tz: 15.55, exitRotY: -0.95},
  fishing: {tx: -17.2, tz: 26.3, exitRotY: 0.45},
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
  grassTex.repeat.set(64, 64);
  const cobbleTex = createCobblestoneTexture();
  const roadCobbleTex = createCobblestoneTexture();
  roadCobbleTex.wrapS = THREE.RepeatWrapping;
  roadCobbleTex.wrapT = THREE.RepeatWrapping;
  const signTex = createDailyQuestSignTexture();

  // ========== 1. EXPANDED TERRAIN + 1 WALKABLE SAKURA HILL IN DISTANCE ==========
  const terrainGeo = new THREE.CircleGeometry(225, 64);
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
  hillTex.repeat.set(6, 6);
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

  // Static sculpted sky clouds spread wide
  const cloudMat = getMat('#FFFFFF', 0.85);
  [
    [-44, 19.5, -54, 2.1],
    [42, 20.2, -52, 1.9],
    [-48, 17.5, 42, 1.85],
    [44, 18.2, 44, 1.95],
    [0, 21.5, -62, 2.3],
    [-54, 18.5, -4, 1.8],
    [54, 18.8, -6, 1.8],
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
    home.position.set(-30, 0, -18);
    home.rotation.y = 0.38;

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

    // Charming Sculpted Mailbox right in front of the house yard
    const mailFooting = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.14, 10),
      stoneMat,
    );
    mailFooting.position.set(1.55, 0.07, 3.08);
    const mailPost = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.96, 8), timberMat);
    mailPost.position.set(1.55, 0.54, 3.08);
    const mailArm = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.08, 0.42, 2, 0.02), timberMat);
    mailArm.position.set(1.55, 0.98, 3.08);
    const mailBodyMat = glossyClayMat('#DF5C4E', 0.32);
    const mailBoxBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.22, 0.54, 2, 0.04),
      mailBodyMat,
    );
    mailBoxBase.position.set(1.55, 1.12, 3.08);
    const mailBoxRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.54, 12),
      mailBodyMat,
    );
    mailBoxRoof.rotation.x = Math.PI / 2;
    mailBoxRoof.position.set(1.55, 1.23, 3.08);
    const mailDoorRim = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.26, 0.05, 2, 0.02),
      getMat('#FFF5E1', 0.58),
    );
    mailDoorRim.position.set(1.55, 1.17, 3.35);
    const mailSlot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.04, 0.06),
      getMat('#4A3222', 0.6),
    );
    mailSlot.position.set(1.55, 1.2, 3.36);
    const mailLetter = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.09, 0.03),
      getMat('#FFFFFF', 0.5),
    );
    mailLetter.rotation.x = -0.35;
    mailLetter.position.set(1.55, 1.22, 3.38);
    const mailFlag = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, 0.22, 0.08, 2, 0.01),
      glossyClayMat('#FFD166', 0.24),
    );
    mailFlag.position.set(1.76, 1.24, 3.12);

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
      mailFooting,
      mailPost,
      mailArm,
      mailBoxBase,
      mailBoxRoof,
      mailDoorRim,
      mailSlot,
      mailLetter,
      mailFlag,
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
    colliders.push({type: 'box', id: 'home', x: -30, z: -18, hw: 2.85, hd: 2.35, rotY: 0.38});
    const mailWorld = new THREE.Vector3(1.55, 0, 3.08).applyMatrix4(home.matrixWorld);
    colliders.push({type: 'circle', id: 'home_mailbox', x: mailWorld.x, z: mailWorld.z, r: 0.34});
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
    signBoardGroup.position.set(-24.0, 0, -15.8);
    signBoardGroup.rotation.y = 0.34;

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
      {kind: 'daily_quests', tx: -23.3, tz: -14.1},
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'daily_quests', x: -24.0, z: -15.8, r: 0.58});
    group.add(signBoardGroup);
  }

  // ========== DISTRICT 2: KHU VƯỜN NÔNG TRẠI (Beautified Conservatory + Rooster + Windmill) ==========
  let windmillSailHub: THREE.Group | null = null;
  {
    const garden = new THREE.Group();
    garden.position.set(31, 0, -18);
    garden.rotation.y = -0.38;

    const stoneBaseMat2 = getMat('#BFB19A', 0.82);
    const brickKneeMat = getMat('#EFE0C9', 0.76);
    const sillMat = getMat('#D8C3A4', 0.72);
    const frameMat = getMat('#2F5D46', 0.45, 0.22);
    const goldAccentMat = glossyClayMat('#F6C84C', 0.24);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#D8F6FF',
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });

    // Multi-step stone foundation & doorway-split perimeter knee walls
    const foundation = new THREE.Mesh(
      new RoundedBoxGeometry(5.85, 0.32, 4.95, 2, 0.06),
      stoneBaseMat2,
    );
    foundation.position.y = 0.16;

    // Back, Left & Right knee walls + Front-Left / Front-Right wings (leaving center door x: -0.86..+0.86 clear!)
    const backKneeWall = new THREE.Mesh(
      new RoundedBoxGeometry(5.32, 0.84, 0.24, 2, 0.05),
      brickKneeMat,
    );
    backKneeWall.position.set(0, 0.68, -2.07);
    const leftKneeWall = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.84, 4.38, 2, 0.05),
      brickKneeMat,
    );
    leftKneeWall.position.set(-2.54, 0.68, 0);
    const rightKneeWall = leftKneeWall.clone();
    rightKneeWall.position.x = 2.54;
    const frontKneeL = new THREE.Mesh(
      new RoundedBoxGeometry(1.8, 0.84, 0.24, 2, 0.05),
      brickKneeMat,
    );
    frontKneeL.position.set(-1.76, 0.68, 2.07);
    const frontKneeR = frontKneeL.clone();
    frontKneeR.position.x = 1.76;

    const backSill = new THREE.Mesh(
      new RoundedBoxGeometry(5.48, 0.12, 0.34, 2, 0.03),
      sillMat,
    );
    backSill.position.set(0, 1.12, -2.1);
    const leftSill = new THREE.Mesh(
      new RoundedBoxGeometry(0.34, 0.12, 4.54, 2, 0.03),
      sillMat,
    );
    leftSill.position.set(-2.57, 1.12, 0);
    const rightSill = leftSill.clone();
    rightSill.position.x = 2.57;
    const frontSillL = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 0.12, 0.34, 2, 0.03),
      sillMat,
    );
    frontSillL.position.set(-1.79, 1.12, 2.1);
    const frontSillR = frontSillL.clone();
    frontSillR.position.x = 1.79;

    // Corner pilasters & intermediate window mullions + perimeter transoms (nothing crosses front doorway!)
    [
      [-2.58, 2.1],
      [2.58, 2.1],
      [-2.58, -2.1],
      [2.58, -2.1],
    ].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(new RoundedBoxGeometry(0.24, 2.15, 0.24, 2, 0.04), frameMat);
      pil.position.set(px, 2.08, pz);
      garden.add(pil);
    });

    // Side glazing bars & vertical mullions
    [-1.4, -0.48, 0.48, 1.4].forEach((mz) => {
      [-2.54, 2.54].forEach((mx) => {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.92, 0.08), frameMat);
        mullion.position.set(mx, 2.04, mz);
        garden.add(mullion);
      });
    });
    // Front/back vertical mullions (excluding center x = 0 at front)
    [-1.65, -0.86, 0.86, 1.65].forEach((mx) => {
      const fMullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.92, 0.08), frameMat);
      fMullion.position.set(mx, 2.04, 2.08);
      garden.add(fMullion);
    });
    [-1.65, -0.82, 0, 0.82, 1.65].forEach((mx) => {
      const bMullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.92, 0.08), frameMat);
      bMullion.position.set(mx, 2.04, -2.08);
      garden.add(bMullion);
    });

    // Perimeter glazing transoms at y = 2.24 (back, sides, and split front wings — front doorway open up to y = 2.42!)
    const transomBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.07, 0.08), frameMat);
    transomBack.position.set(0, 2.24, -2.08);
    const transomSideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 4.24), frameMat);
    transomSideL.position.set(-2.54, 2.24, 0);
    const transomSideR = transomSideL.clone();
    transomSideR.position.x = 2.54;
    const transomFrontL = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.07, 0.08), frameMat);
    transomFrontL.position.set(-1.75, 2.24, 2.08);
    const transomFrontR = transomFrontL.clone();
    transomFrontR.position.x = 1.75;

    // Separate perimeter glass wall panes (back, sides, front-left & front-right wings)
    const glassBack = new THREE.Mesh(new THREE.BoxGeometry(5.05, 1.84, 0.04), glassMat);
    glassBack.position.set(0, 2.06, -2.06);
    const glassSideL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.84, 4.12), glassMat);
    glassSideL.position.set(-2.52, 2.06, 0);
    const glassSideR = glassSideL.clone();
    glassSideR.position.x = 2.52;
    const glassFrontL = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.84, 0.04), glassMat);
    glassFrontL.position.set(-1.72, 2.06, 2.06);
    const glassFrontR = glassFrontL.clone();
    glassFrontR.position.x = 1.72;

    // Main conservatory pitched glass roof + exterior structural iron rafters
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-2.65, 0);
    roofShape.lineTo(0, 1.46);
    roofShape.lineTo(2.65, 0);
    roofShape.closePath();
    const roofGlassGeo = new THREE.ExtrudeGeometry(roofShape, {depth: 4.24, bevelEnabled: false});
    roofGlassGeo.center();
    const glassRoof = new THREE.Mesh(roofGlassGeo, glassMat);
    glassRoof.position.y = 3.68;

    const eaveBeam = new THREE.Mesh(new RoundedBoxGeometry(5.48, 0.14, 4.48, 2, 0.03), frameMat);
    eaveBeam.position.y = 3.0;

    [-1.95, -0.95, 0, 0.95, 1.95].forEach((rz) => {
      for (const side of [-1, 1]) {
        const rafter = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.08, 0.08), frameMat);
        rafter.position.set(side * 1.32, 3.7, rz);
        rafter.rotation.z = side * -0.5;
        garden.add(rafter);
      }
    });

    const ridgeBeam = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.18, 4.4, 2, 0.03), frameMat);
    ridgeBeam.position.y = 4.42;

    // Raised Glass Roof Cupola Lantern
    const cupolaFrame = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.56, 1.42, 2, 0.03), frameMat);
    cupolaFrame.position.y = 4.62;
    const cupolaGlass = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.44, 1.28), glassMat);
    cupolaGlass.position.y = 4.62;
    const cupolaRoof = createExtrudedRoof(1.48, 0.46, 1.56, frameMat);
    cupolaRoof.position.y = 5.08;

    // === CHÚ GÀ TRỐNG ĐẬU TRÊN NÓC NHÀ KÍNH ===
    const rooster = new THREE.Group();
    rooster.position.set(0, 5.26, 0);
    rooster.rotation.y = 0.35;

    const perchBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.16, 8), goldAccentMat);
    perchBase.position.y = 0.08;
    const perchPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.32, 7), frameMat);
    perchPole.position.y = 0.26;
    const rBodyMat = getMat('#FFF6E6', 0.52);
    const rWingMat = getMat('#D67B3E', 0.58);
    const rCombMat = glossyClayMat('#DF3B42', 0.28);
    const rTailGreen = glossyClayMat('#2A7C59', 0.32);
    const rTailGold = glossyClayMat('#F4BA42', 0.28);

    const rBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 9), rBodyMat);
    rBody.scale.set(0.86, 0.92, 1.28);
    rBody.position.set(0, 0.58, 0);
    const rChest = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 8), rBodyMat);
    rChest.position.set(0, 0.68, 0.18);
    const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 8), rBodyMat);
    rHead.position.set(0, 0.88, 0.24);
    const rComb = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.15, 0.2, 2, 0.025), rCombMat);
    rComb.position.set(0, 1.03, 0.23);
    const rWattle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), rCombMat);
    rWattle.scale.set(0.75, 1.35, 0.75);
    rWattle.position.set(0, 0.77, 0.33);
    const rBeak = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.14, 6), goldAccentMat);
    rBeak.rotation.x = Math.PI / 2;
    rBeak.position.set(0, 0.86, 0.41);

    const rWingL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 7), rWingMat);
    rWingL.scale.set(0.42, 0.82, 1.25);
    rWingL.position.set(-0.21, 0.58, -0.02);
    const rWingR = rWingL.clone();
    rWingR.position.x = 0.21;

    // Arching sculpted tail plumes
    for (const [ty, tz, rx, mat] of [
      [0.78, -0.28, -0.85, rTailGreen],
      [0.86, -0.24, -0.58, rTailGold],
      [0.72, -0.32, -1.1, rCombMat],
    ] as const) {
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.36, 6), mat);
      plume.rotation.x = rx;
      plume.position.set(0, ty, tz);
      rooster.add(plume);
    }
    rooster.add(perchBase, perchPole, rBody, rChest, rHead, rComb, rWattle, rBeak, rWingL, rWingR);

    // Projecting Front Entrance Portico + Clean Recessed French Double Doors (unobstructed!)
    const porticoBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.15, 0.3, 0.95, 2, 0.04),
      stoneBaseMat2,
    );
    porticoBase.position.set(0, 0.15, 2.52);
    const porticoRoof = createExtrudedRoof(2.26, 0.78, 1.05, frameMat);
    porticoRoof.position.set(0, 2.95, 2.46);
    const porticoColL = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.28, 0.14, 2, 0.03), frameMat);
    porticoColL.position.set(-0.92, 1.44, 2.86);
    const porticoColR = porticoColL.clone();
    porticoColR.position.x = 0.92;

    const doorJambL = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.26, 0.18, 2, 0.03), frameMat);
    doorJambL.position.set(-0.79, 1.43, 2.15);
    const doorJambR = doorJambL.clone();
    doorJambR.position.x = 0.79;
    const doorHeader = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.18, 0.2, 2, 0.03), frameMat);
    doorHeader.position.set(0, 2.49, 2.15);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.08, 0.06), glassMat);
    doorGlass.position.set(0, 1.36, 2.15);
    const doorMullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.08, 0.12), frameMat);
    doorMullion.position.set(0, 1.36, 2.16);
    const handleL = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.22, 0.06, 2, 0.015), goldAccentMat);
    handleL.position.set(-0.11, 1.24, 2.23);
    const handleR = handleL.clone();
    handleR.position.x = 0.11;

    // Warm interior pendant lantern + tiered botanical shelves inside conservatory
    const ghBulbMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C8',
      emissive: '#FFCC66',
      emissiveIntensity: 0.15,
      roughness: 0.25,
    });
    lampBulbs.push(ghBulbMat);
    const ghLantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), ghBulbMat);
    ghLantern.position.set(0, 3.15, 0);

    const interiorBed = new THREE.Mesh(
      new RoundedBoxGeometry(4.0, 0.44, 2.7, 2, 0.04),
      getMat('#7D5333', 0.88),
    );
    interiorBed.position.set(0, 1.05, -0.18);
    const leafMat = getMat('#54B860', 0.68);
    const sunMat = getMat('#F9C74F', 0.52);
    const berryMat = getMat('#E85D68', 0.55);
    [
      [-1.25, -0.65, sunMat],
      [0, -0.75, berryMat],
      [1.25, -0.6, sunMat],
      [-0.95, 0.45, berryMat],
      [0.95, 0.45, sunMat],
    ].forEach(([px, pz, bm]) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.46, 9, 8), leafMat);
      bush.position.set(px as number, 1.54, pz as number);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 8), bm as THREE.Material);
      bloom.position.set(px as number, 2.0, pz as number);
      garden.add(bush, bloom);
    });

    // Flanking terracotta pots & wooden flower boxes outside entrance
    const outdoorBedL = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 0.38, 0.85, 2, 0.05),
      getMat('#8C5C38', 0.85),
    );
    outdoorBedL.position.set(-1.9, 0.34, 2.68);
    const outdoorBedR = outdoorBedL.clone();
    outdoorBedR.position.x = 1.9;
    [-2.25, -1.9, -1.55, 1.55, 1.9, 2.25].forEach((sx, idx) => {
      const sprout = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 7),
        idx % 2 === 1 ? sunMat : idx % 3 === 0 ? berryMat : leafMat,
      );
      sprout.position.set(sx, 0.65, 2.68);
      garden.add(sprout);
    });

    garden.add(
      foundation,
      backKneeWall,
      leftKneeWall,
      rightKneeWall,
      frontKneeL,
      frontKneeR,
      backSill,
      leftSill,
      rightSill,
      frontSillL,
      frontSillR,
      transomBack,
      transomSideL,
      transomSideR,
      transomFrontL,
      transomFrontR,
      glassBack,
      glassSideL,
      glassSideR,
      glassFrontL,
      glassFrontR,
      glassRoof,
      eaveBeam,
      ridgeBeam,
      cupolaFrame,
      cupolaGlass,
      cupolaRoof,
      rooster,
      porticoBase,
      porticoRoof,
      porticoColL,
      porticoColR,
      doorJambL,
      doorJambR,
      doorHeader,
      doorGlass,
      doorMullion,
      handleL,
      handleR,
      ghLantern,
      interiorBed,
      outdoorBedL,
      outdoorBedR,
    );

    addInteractionProxy(
      garden,
      [5.8, 5.4, 5.2],
      2.5,
      {
        kind: 'zone',
        zone: 'garden' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.garden.tx,
        tz: TOWN_ZONE_ENTRANCES.garden.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'garden', x: 31, z: -18, hw: 2.9, hd: 2.5, rotY: -0.38});
    group.add(garden);

    // === CỐI XAY GIÓ BÊN CẠNH NHÀ KÍNH (X = 37.5, Z = -19.2) ===
    const windmill = new THREE.Group();
    windmill.position.set(37.5, 0, -19.2);
    windmill.rotation.y = -0.42;

    const wmPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.52, 1.66, 0.42, 14),
      stoneBaseMat2,
    );
    wmPlinth.position.y = 0.21;
    const wmTower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.04, 1.46, 3.85, 14),
      getMat('#FFF3DD', 0.72),
    );
    wmTower.position.y = 2.25;
    const wmBand1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.36, 1.4, 0.14, 14),
      getMat('#8F5C38', 0.75),
    );
    wmBand1.position.y = 1.45;
    const wmBand2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.14, 1.18, 0.14, 14),
      getMat('#8F5C38', 0.75),
    );
    wmBand2.position.y = 3.25;
    const wmDoor = new THREE.Mesh(
      new RoundedBoxGeometry(0.74, 1.15, 0.2, 2, 0.04),
      getMat('#7D5031', 0.75),
    );
    wmDoor.position.set(0, 0.92, 1.32);

    const wmWinMat = new THREE.MeshStandardMaterial({
      color: '#FFF1BD',
      emissive: '#FFCC66',
      emissiveIntensity: 0.1,
      roughness: 0.3,
    });
    windowMeshes.push(wmWinMat);
    const wmWin = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.56, 0.18, 2, 0.04), wmWinMat);
    wmWin.position.set(0, 2.45, 1.16);

    const wmRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.42, 1.38, 14),
      getMat('#C8664D', 0.62),
    );
    wmRoof.position.y = 4.78;
    const wmFinial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), goldAccentMat);
    wmFinial.position.y = 5.5;

    // Rotating 4-blade Wooden & Cream Canvas Sail Hub
    const sailHub = new THREE.Group();
    sailHub.position.set(0, 3.72, 1.18);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.36, 10), getMat('#6E4427', 0.7));
    hubCap.rotation.x = Math.PI / 2;
    sailHub.add(hubCap);

    const sparMat = getMat('#8A5A36', 0.74);
    const sailMat = getMat('#FFFDF5', 0.62);
    for (let b = 0; b < 4; b++) {
      const arm = new THREE.Group();
      arm.rotation.z = (b * Math.PI) / 2 + 0.35;
      const spar = new THREE.Mesh(new RoundedBoxGeometry(0.11, 2.35, 0.08, 2, 0.02), sparMat);
      spar.position.y = 1.18;
      const canvasBlade = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 1.72, 0.03, 2, 0.02),
        sailMat,
      );
      canvasBlade.position.set(0.29, 1.4, 0.02);
      canvasBlade.rotation.y = 0.16;
      const crossRung = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.05, 0.05), sparMat);
      crossRung.position.set(0.29, 0.85, 0.03);
      const crossRung2 = crossRung.clone();
      crossRung2.position.y = 1.75;
      arm.add(spar, canvasBlade, crossRung, crossRung2);
      sailHub.add(arm);
    }
    windmillSailHub = sailHub;

    windmill.add(wmPlinth, wmTower, wmBand1, wmBand2, wmDoor, wmWin, wmRoof, wmFinial, sailHub);
    addInteractionProxy(
      windmill,
      [3.0, 5.4, 3.0],
      2.6,
      {
        kind: 'zone',
        zone: 'garden' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.garden.tx,
        tz: TOWN_ZONE_ENTRANCES.garden.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'garden_windmill', x: 37.5, z: -19.2, r: 1.58});
    group.add(windmill);
  }

  // ========== DISTRICT 3: TIỆM THỜI TRANG (Parisian Pastel Boutique) ==========
  {
    const shop = new THREE.Group();
    shop.position.set(-33, 0, 14);
    shop.rotation.y = 0.95;

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
    colliders.push({type: 'box', id: 'boutique', x: -33, z: 14, hw: 2.65, hd: 2.25, rotY: 0.95});
    group.add(shop);
  }

  // ========== DISTRICT 4: TIỆM MINIGAME (Large Flat-Roofed Game House + Upright 3D GAME Sign on Roof) ==========
  {
    const arcade = new THREE.Group();
    arcade.position.set(33, 0, 13);
    arcade.rotation.y = -0.95;

    const stonePlinthMat = getMat('#CFC8E2', 0.76);
    const stepMat = getMat('#DFDAEC', 0.74);
    const wallCreamMat = getMat('#F7F1FE', 0.66);
    const trimIndigoMat = getMat('#4B3D78', 0.56);
    const trimLilacMat = getMat('#6E5DA8', 0.58);
    const roofDeckMat = getMat('#3A2F63', 0.64);
    const roofBorderMat = getMat('#EFE7FA', 0.62);
    const coralMat = getMat('#F06875', 0.46);
    const tealNeonMat = new THREE.MeshStandardMaterial({
      color: '#6CE5DA',
      emissive: '#35CBBF',
      emissiveIntensity: 0.34,
      roughness: 0.28,
    });
    const goldAccentMat = glossyClayMat('#FFD166', 0.24);
    const glassShowcaseMat = new THREE.MeshStandardMaterial({
      color: '#A5DDFC',
      emissive: '#4AA8DC',
      emissiveIntensity: 0.3,
      roughness: 0.16,
      transparent: true,
      opacity: 0.78,
    });
    windowMeshes.push(tealNeonMat);

    // 1. Wide Stepped Terrazzo Podium + Wide Front Entrance Stairs
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(6.5, 0.36, 4.9, 2, 0.08),
      stonePlinthMat,
    );
    plinth.position.y = 0.18;

    const stairStep1 = new THREE.Mesh(
      new RoundedBoxGeometry(2.55, 0.16, 0.72, 2, 0.04),
      stepMat,
    );
    stairStep1.position.set(0, 0.08, 2.52);
    const stairStep2 = new THREE.Mesh(
      new RoundedBoxGeometry(2.25, 0.16, 0.42, 2, 0.04),
      stepMat,
    );
    stairStep2.position.set(0, 0.24, 2.34);

    // Pastel stair railings + illuminated globe bollards
    [-1.24, 1.24].forEach((rx) => {
      const railPostFront = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.56, 8),
        trimIndigoMat,
      );
      railPostFront.position.set(rx, 0.44, 2.74);
      const bollardGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 8, 8),
        goldAccentMat,
      );
      bollardGlow.position.set(rx, 0.76, 2.74);
      const railBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.06, 0.06, 0.55, 2, 0.02),
        coralMat,
      );
      railBar.position.set(rx, 0.66, 2.48);
      railBar.rotation.x = 0.36;
      arcade.add(railPostFront, bollardGlow, railBar);
    });

    // 2. Large Architectural Game Building Body + Wainscot + Mid-Tier & Crown Friezes
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(5.95, 3.45, 4.18, 3, 0.12),
      wallCreamMat,
    );
    body.position.y = 2.08;

    const wainscot = new THREE.Mesh(
      new RoundedBoxGeometry(6.05, 0.76, 4.28, 2, 0.05),
      trimIndigoMat,
    );
    wainscot.position.y = 0.74;

    // Illuminated turquoise mid-belt accent strip wrapping the facade
    const neonBelt = new THREE.Mesh(
      new RoundedBoxGeometry(6.14, 0.12, 4.36, 2, 0.03),
      tealNeonMat,
    );
    neonBelt.position.y = 1.16;

    // 4 Sculpted Corner Framing Columns + Center Entry Columns
    [
      [-2.9, 2.02],
      [2.9, 2.02],
      [-2.9, -2.02],
      [2.9, -2.02],
      [-1.08, 2.04],
      [1.08, 2.04],
    ].forEach(([px, pz]) => {
      const col = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 3.48, 0.32, 2, 0.05),
        trimIndigoMat,
      );
      col.position.set(px, 2.08, pz);
      const capBand = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.14, 0.38, 2, 0.03),
        coralMat,
      );
      capBand.position.set(px, 3.66, pz);
      arcade.add(col, capBand);
    });

    // Upper horizontal frieze cornice below the flat roof
    const upperFrieze = new THREE.Mesh(
      new RoundedBoxGeometry(6.12, 0.34, 4.34, 2, 0.04),
      trimLilacMat,
    );
    upperFrieze.position.y = 3.62;

    // 3. Center Double Glass Entry + Illuminated Canopy Marquee + Star Crest
    const doorRecess = new THREE.Mesh(
      new RoundedBoxGeometry(1.78, 2.04, 0.24, 2, 0.04),
      getMat('#271F44', 0.6),
    );
    doorRecess.position.set(0, 1.38, 2.02);

    const doorFrameOuter = new THREE.Mesh(
      new RoundedBoxGeometry(1.94, 2.16, 0.18, 2, 0.05),
      coralMat,
    );
    doorFrameOuter.position.set(0, 1.44, 2.08);

    [-0.4, 0.4].forEach((dx) => {
      const leaf = new THREE.Mesh(
        new RoundedBoxGeometry(0.74, 1.88, 0.1, 2, 0.03),
        glassShowcaseMat,
      );
      leaf.position.set(dx, 1.36, 2.13);
      const handle = new THREE.Mesh(
        new RoundedBoxGeometry(0.06, 0.42, 0.08, 2, 0.02),
        goldAccentMat,
      );
      handle.position.set(dx > 0 ? dx - 0.24 : dx + 0.24, 1.32, 2.19);
      arcade.add(leaf, handle);
    });

    // Jutting Flat Illuminated Entrance Canopy + Pixel Console Crest
    const entryCanopy = new THREE.Mesh(
      new RoundedBoxGeometry(2.38, 0.24, 0.92, 2, 0.06),
      trimIndigoMat,
    );
    entryCanopy.position.set(0, 2.66, 2.38);
    const canopyTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.44, 0.09, 0.96, 2, 0.02),
      tealNeonMat,
    );
    canopyTrim.position.set(0, 2.75, 2.39);
    const crestPlate = new THREE.Mesh(
      new RoundedBoxGeometry(1.18, 0.42, 0.16, 2, 0.05),
      coralMat,
    );
    crestPlate.position.set(0, 3.06, 2.2);
    const crestCoin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12),
      goldAccentMat,
    );
    crestCoin.rotation.x = Math.PI / 2;
    crestCoin.position.set(0, 3.06, 2.28);

    const arcadeLanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.48,
      roughness: 0.25,
    });
    lampBulbs.push(arcadeLanternMat);
    [-0.96, 0.96].forEach((lx) => {
      const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), arcadeLanternMat);
      sconce.position.set(lx, 2.24, 2.22);
      arcade.add(sconce);
    });

    // 4. Left & Right Panoramic Glass Showcase Bays (with miniature arcade cabinets visible inside!)
    [-1.96, 1.96].forEach((bx, bayIdx) => {
      const bayFrame = new THREE.Mesh(
        new RoundedBoxGeometry(1.56, 1.66, 0.22, 2, 0.05),
        trimLilacMat,
      );
      bayFrame.position.set(bx, 2.08, 2.06);
      const bayInterior = new THREE.Mesh(
        new RoundedBoxGeometry(1.36, 1.44, 0.2, 2, 0.03),
        getMat('#2B224B', 0.65),
      );
      bayInterior.position.set(bx, 2.08, 2.0);
      const bayGlass = new THREE.Mesh(
        new RoundedBoxGeometry(1.36, 1.44, 0.08, 2, 0.02),
        glassShowcaseMat,
      );
      bayGlass.position.set(bx, 2.08, 2.15);

      // Cute Striped Mini Canopy over each side window
      for (let s = 0; s < 4; s++) {
        const stripe = new THREE.Mesh(
          new RoundedBoxGeometry(0.38, 0.11, 0.56, 2, 0.03),
          getMat(s % 2 === 0 ? '#F06875' : '#FFFDF9', 0.55),
        );
        stripe.position.set(bx - 0.57 + s * 0.38, 3.02, 2.26);
        stripe.rotation.x = 0.3;
        arcade.add(stripe);
      }

      // Tiny miniature arcade & claw machines displayed inside the glass bay
      [-0.32, 0.32].forEach((mx, mIdx) => {
        const cabCol = bayIdx === 0
          ? mIdx === 0 ? '#FF6B78' : '#4ECDC4'
          : mIdx === 0 ? '#FFD166' : '#9B8CFF';
        const cab = new THREE.Mesh(
          new RoundedBoxGeometry(0.42, 0.92, 0.2, 2, 0.04),
          getMat(cabCol, 0.45),
        );
        cab.position.set(bx + mx, 1.84, 2.06);
        const crt = new THREE.Mesh(
          new RoundedBoxGeometry(0.28, 0.24, 0.05, 2, 0.02),
          makeWinMat(),
        );
        crt.position.set(bx + mx, 2.02, 2.14);
        arcade.add(cab, crt);
      });

      // Decorative pastel flower/star planter box beneath each bay
      const fbox = new THREE.Mesh(
        new RoundedBoxGeometry(1.48, 0.24, 0.34, 2, 0.04),
        trimIndigoMat,
      );
      fbox.position.set(bx, 0.72, 2.24);
      [-0.45, 0, 0.45].forEach((fx, fi) => {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 7, 7),
          fi === 1 ? goldAccentMat : coralMat,
        );
        orb.position.set(bx + fx, 0.9, 2.26);
        arcade.add(orb);
      });

      arcade.add(bayFrame, bayInterior, bayGlass, fbox);
    });

    // Side & Back Architectural Windows so all angles look finished
    [-1, 1].forEach((side) => {
      [-0.9, 0.9].forEach((wz) => {
        const sw = buildFramedWindow(0.95, 0.95, trimLilacMat, makeWinMat());
        sw.rotation.y = (side * Math.PI) / 2;
        sw.position.set(side * 2.98, 2.15, wz);
        arcade.add(sw);
      });
    });
    [-1.4, 1.4].forEach((bx) => {
      const bw = buildFramedWindow(1.05, 0.92, trimLilacMat, makeWinMat());
      bw.rotation.y = Math.PI;
      bw.position.set(bx, 2.15, -2.09);
      arcade.add(bw);
    });

    // 5. FLAT ROOF DECK (MÁI PHẲNG) + Parapet Walls + Recessed Rooftop Terrace
    const roofSlab = new THREE.Mesh(
      new RoundedBoxGeometry(6.34, 0.28, 4.54, 2, 0.06),
      roofBorderMat,
    );
    roofSlab.position.y = 3.92;

    const roofTerraceFloor = new THREE.Mesh(
      new RoundedBoxGeometry(5.86, 0.08, 4.08, 2, 0.02),
      roofDeckMat,
    );
    roofTerraceFloor.position.y = 4.06;

    // Parapet border walls framing the flat rooftop
    const parapetFront = new THREE.Mesh(
      new RoundedBoxGeometry(6.32, 0.26, 0.24, 2, 0.04),
      roofBorderMat,
    );
    parapetFront.position.set(0, 4.14, 2.14);
    const parapetBack = parapetFront.clone();
    parapetBack.position.z = -2.14;
    const parapetLeft = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.26, 4.52, 2, 0.04),
      roofBorderMat,
    );
    parapetLeft.position.set(-3.04, 4.14, 0);
    const parapetRight = parapetLeft.clone();
    parapetRight.position.x = 3.04;

    // Rooftop detail props on rear flat roof deck (skylight & exhaust unit)
    const skyLight = new THREE.Mesh(
      new RoundedBoxGeometry(2.0, 0.2, 1.15, 2, 0.05),
      glassShowcaseMat,
    );
    skyLight.position.set(-0.6, 4.16, -0.75);
    const roofUnit = new THREE.Mesh(
      new RoundedBoxGeometry(0.95, 0.42, 0.72, 2, 0.05),
      stonePlinthMat,
    );
    roofUnit.position.set(1.85, 4.26, -0.95);

    // 6. LARGE UPRIGHT 3D SCULPTED "G A M E" SIGN STANDING ON THE FLAT ROOF
    const buildGameLetterGeo = (char: 'G' | 'A' | 'M' | 'E') => {
      const s = new THREE.Shape();
      if (char === 'G') {
        s.moveTo(-0.42, 0.56);
        s.lineTo(0.42, 0.56);
        s.lineTo(0.42, 0.34);
        s.lineTo(-0.18, 0.34);
        s.lineTo(-0.18, -0.34);
        s.lineTo(0.18, -0.34);
        s.lineTo(0.18, -0.08);
        s.lineTo(-0.04, -0.08);
        s.lineTo(-0.04, 0.14);
        s.lineTo(0.42, 0.14);
        s.lineTo(0.42, -0.56);
        s.lineTo(-0.42, -0.56);
        s.closePath();
      } else if (char === 'A') {
        s.moveTo(-0.44, -0.56);
        s.lineTo(-0.14, 0.56);
        s.lineTo(0.14, 0.56);
        s.lineTo(0.44, -0.56);
        s.lineTo(0.2, -0.56);
        s.lineTo(0.13, -0.26);
        s.lineTo(-0.13, -0.26);
        s.lineTo(-0.2, -0.56);
        s.closePath();
        const hole = new THREE.Path();
        hole.moveTo(-0.08, -0.06);
        hole.lineTo(0.08, -0.06);
        hole.lineTo(0, 0.32);
        hole.closePath();
        s.holes.push(hole);
      } else if (char === 'M') {
        s.moveTo(-0.46, -0.56);
        s.lineTo(-0.46, 0.56);
        s.lineTo(-0.2, 0.56);
        s.lineTo(0, 0.12);
        s.lineTo(0.2, 0.56);
        s.lineTo(0.46, 0.56);
        s.lineTo(0.46, -0.56);
        s.lineTo(0.24, -0.56);
        s.lineTo(0.24, 0.14);
        s.lineTo(0.08, -0.22);
        s.lineTo(-0.08, -0.22);
        s.lineTo(-0.24, 0.14);
        s.lineTo(-0.24, -0.56);
        s.closePath();
      } else {
        // 'E'
        s.moveTo(-0.38, -0.56);
        s.lineTo(-0.38, 0.56);
        s.lineTo(0.38, 0.56);
        s.lineTo(0.38, 0.34);
        s.lineTo(-0.14, 0.34);
        s.lineTo(-0.14, 0.11);
        s.lineTo(0.28, 0.11);
        s.lineTo(0.28, -0.11);
        s.lineTo(-0.14, -0.11);
        s.lineTo(-0.14, -0.34);
        s.lineTo(0.38, -0.34);
        s.lineTo(0.38, -0.56);
        s.closePath();
      }
      const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.24,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2,
      });
      geo.center();
      return geo;
    };

    const signPlinthBeam = new THREE.Mesh(
      new RoundedBoxGeometry(4.95, 0.2, 0.44, 2, 0.04),
      trimIndigoMat,
    );
    signPlinthBeam.position.set(0, 4.18, 1.38);
    arcade.add(signPlinthBeam);

    // Steel support struts holding the upright GAME roof sign
    [-1.95, -0.65, 0.65, 1.95].forEach((sx) => {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.72, 6),
        trimIndigoMat,
      );
      strut.position.set(sx, 4.46, 1.06);
      strut.rotation.x = 0.68;
      arcade.add(strut);
    });

    const gameLetters: {ch: 'G' | 'A' | 'M' | 'E'; x: number; col: string; em: string}[] = [
      {ch: 'G', x: -1.74, col: '#FF6B78', em: '#E03E52'},
      {ch: 'A', x: -0.58, col: '#FFD166', em: '#E5A229'},
      {ch: 'M', x: 0.62, col: '#55DEC8', em: '#26B59F'},
      {ch: 'E', x: 1.78, col: '#8E9BFF', em: '#5B6BE6'},
    ];
    gameLetters.forEach(({ch, x, col, em}) => {
      const letterMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: em,
        emissiveIntensity: 0.24,
        roughness: 0.34,
      });
      windowMeshes.push(letterMat);
      const letterMesh = new THREE.Mesh(buildGameLetterGeo(ch), letterMat);
      letterMesh.position.set(x, 4.86, 1.38);
      arcade.add(letterMesh);
    });

    // 7. Outdoor Gacha Machine + Pixel Token Standee
    const gachaBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.62, 0.5, 2, 0.05),
      getMat('#FF758F', 0.45),
    );
    gachaBase.position.set(-1.95, 0.66, 2.52);
    const gachaGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 10, 8),
      glossyClayMat('#E0F4FF', 0.15),
    );
    gachaGlobe.position.set(-1.95, 1.14, 2.52);

    const tokenPost = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.68, 0.34, 2, 0.05),
      getMat('#54C7B8', 0.48),
    );
    tokenPost.position.set(1.95, 0.68, 2.52);
    const tokenStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      goldAccentMat,
    );
    tokenStar.position.set(1.95, 1.18, 2.52);

    arcade.add(
      plinth,
      stairStep1,
      stairStep2,
      body,
      wainscot,
      neonBelt,
      upperFrieze,
      doorRecess,
      doorFrameOuter,
      entryCanopy,
      canopyTrim,
      crestPlate,
      crestCoin,
      roofSlab,
      roofTerraceFloor,
      parapetFront,
      parapetBack,
      parapetLeft,
      parapetRight,
      skyLight,
      roofUnit,
      gachaBase,
      gachaGlobe,
      tokenPost,
      tokenStar,
    );
    addInteractionProxy(
      arcade,
      [6.8, 5.8, 5.4],
      2.65,
      {
        kind: 'zone',
        zone: 'arcade' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.arcade.tx,
        tz: TOWN_ZONE_ENTRANCES.arcade.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'arcade', x: 33, z: 13, hw: 3.35, hd: 2.55, rotY: -0.95});
    group.add(arcade);
  }

  // ========== DISTRICT 5: HỒ CÂU CÁ (Scenic Lakeside + Wooden Pier + Bait Stand) ==========
  {
    const lake = new THREE.Group();
    lake.position.set(-20, 0, 30);

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
    colliders.push({type: 'circle', id: 'fishing_a', x: -20.5, z: 30.35, r: 3.15});
    colliders.push({type: 'circle', id: 'fishing_b', x: -18.15, z: 29.35, r: 2.55});
    group.add(lake);
  }

  // ========== DISTRICT 6: TRẠM BƯU ĐIỆN & ĐỒNG HỒ (Town Clock Tower & Post Office) ==========
  {
    const kiosk = new THREE.Group();
    kiosk.position.set(20, 0, 29);
    kiosk.rotation.y = -0.45;

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
      {kind: 'settings', tx: 18.65, tz: 31.79},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'settings', x: 20, z: 29, hw: 1.75, hd: 1.55, rotY: -0.45});
    group.add(kiosk);
  }

  // ========== BOULEVARD COBBLESTONE ROADS & INSTANCED STREETLIGHTS ==========
  {
    const roadGeos: THREE.BufferGeometry[] = [];
    const curbGeos: THREE.BufferGeometry[] = [];

    const addRoadRect = (cx: number, cz: number, w: number, l: number, rotY = 0, addCurbL = true, addCurbR = true) => {
      const roadSeg = new THREE.PlaneGeometry(w, l, 1, 1);
      roadSeg.rotateX(-Math.PI / 2);
      roadSeg.rotateY(rotY);
      roadSeg.translate(cx, 0.042, cz);

      const pos = roadSeg.attributes.position;
      const uv = roadSeg.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, pos.getX(i) * 0.24, pos.getZ(i) * 0.24);
      }
      roadGeos.push(roadSeg);

      if (addCurbL) {
        const cL = new THREE.BoxGeometry(0.18, 0.06, l);
        cL.translate(-w / 2 - 0.08, 0.048, 0);
        cL.rotateY(rotY);
        cL.translate(cx, 0, cz);
        curbGeos.push(cL);
      }
      if (addCurbR) {
        const cR = new THREE.BoxGeometry(0.18, 0.06, l);
        cR.translate(w / 2 + 0.08, 0.048, 0);
        cR.rotateY(rotY);
        cR.translate(cx, 0, cz);
        curbGeos.push(cR);
      }
    };

    const addRoadSpan = (x0: number, z0: number, x1: number, z1: number, w: number) => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const rotY = Math.atan2(dx, dz);
      addRoadRect(cx, cz, w, len, rotY, true, true);
    };

    // East-West Avenue outward from central plaza
    addRoadSpan(-6.8, 0, -26.5, 0, 3.6);
    addRoadSpan(6.8, 0, 27.2, 0, 3.6);
    addRoadRect(-28.3, 0, 3.6, 3.6, 0, false, false);
    addRoadRect(29.0, 0, 3.6, 3.6, 0, false, false);

    // West spurs (North to House, South to Boutique)
    addRoadSpan(-28.3, -1.8, -28.3, -13.6, 3.0);
    addRoadSpan(-28.3, 1.8, -29.5, 16.2, 3.0);

    // East spurs (North to Farm, South to Arcade)
    addRoadSpan(29.0, -1.8, 29.3, -13.6, 3.0);
    addRoadSpan(29.0, 1.8, 29.4, 15.2, 3.0);

    // North Avenue to Sakura Hill + side branch to Tea Patio
    addRoadSpan(0, -6.8, 0, -29.8, 3.4);
    addRoadSpan(-1.7, -22.5, -8.3, -22.5, 2.2);

    // South Promenade & forks (Fishing Lake & Post Office)
    addRoadSpan(0, 6.8, 0, 22.8, 3.4);
    addRoadRect(0, 24.5, 3.4, 3.4, 0, false, false);
    addRoadSpan(-1.7, 24.5, -17.0, 26.2, 2.8);
    addRoadSpan(1.7, 24.5, 18.4, 31.4, 2.8);

    const roadMerged = mergeParts(roadGeos);
    const roadMesh = new THREE.Mesh(
      roadMerged,
      new THREE.MeshStandardMaterial({
        map: roadCobbleTex,
        color: '#F4EAE0',
        roughness: 0.82,
        metalness: 0.02,
      }),
    );
    roadMesh.userData = {kind: 'ground'};
    group.add(roadMesh);

    const curbMerged = mergeParts(curbGeos);
    const curbMesh = new THREE.Mesh(curbMerged, getMat('#D6C4AB', 0.78));
    group.add(curbMesh);

    // Instanced Avenue Streetlights flanking roads cleanly (3 draw calls total)
    const roadLampCoords: [number, number][] = [
      [-11.5, -2.25],
      [11.5, -2.25],
      [-21.0, 2.25],
      [21.0, 2.25],
      [-30.4, -7.2],
      [-26.2, 8.2],
      [31.2, -7.2],
      [26.8, 8.2],
      [-2.2, -13.0],
      [2.2, -19.5],
      [-2.2, -28.0],
      [-2.2, 13.5],
      [2.2, 18.8],
      [-9.2, 23.1],
      [9.8, 26.2],
      [-25.4, -14.8],
    ];

    const sBase = new THREE.CylinderGeometry(0.11, 0.16, 0.28, 8);
    sBase.translate(0, 0.14, 0);
    const sPole = new THREE.CylinderGeometry(0.06, 0.085, 2.25, 8);
    sPole.translate(0, 1.4, 0);
    const sCollar = new THREE.CylinderGeometry(0.14, 0.09, 0.1, 8);
    sCollar.translate(0, 2.52, 0);
    const sCap = new THREE.ConeGeometry(0.28, 0.18, 8);
    sCap.translate(0, 2.94, 0);
    const roadLampPostGeo = mergeParts([sBase, sPole, sCollar, sCap]);
    const roadLampBulbGeo = new THREE.SphereGeometry(0.2, 9, 8);
    roadLampBulbGeo.translate(0, 2.72, 0);

    const roadLampBulbMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.14,
      roughness: 0.25,
    });
    lampBulbs.push(roadLampBulbMat);

    const roadLampPostIM = new THREE.InstancedMesh(roadLampPostGeo, lampPostMat, roadLampCoords.length);
    const roadLampBulbIM = new THREE.InstancedMesh(roadLampBulbGeo, roadLampBulbMat, roadLampCoords.length);
    roadLampCoords.forEach(([lx, lz], i) => {
      _instDummy.position.set(lx, 0.02, lz);
      _instDummy.rotation.set(0, 0, 0);
      _instDummy.scale.setScalar(1);
      _instDummy.updateMatrix();
      roadLampPostIM.setMatrixAt(i, _instDummy.matrix);
      roadLampBulbIM.setMatrixAt(i, _instDummy.matrix);
      colliders.push({type: 'circle', x: lx, z: lz, r: 0.28});
    });
    roadLampPostIM.instanceMatrix.needsUpdate = true;
    roadLampBulbIM.instanceMatrix.needsUpdate = true;
    roadLampPostIM.computeBoundingSphere();
    roadLampBulbIM.computeBoundingSphere();
    group.add(roadLampPostIM, roadLampBulbIM);
  }

  // ========== DISTRICT 7: GÓC TRÀ BÁNH, ANH ĐÀO RỤNG HOA & DÂY ĐÈN ĐÊM ==========
  const patioCenter = {x: -12.5, z: -22.5};
  let patioNightLight: THREE.PointLight | null = null;
  let stringBulbMat: THREE.MeshStandardMaterial | null = null;
  const FALL_PETAL_COUNT = 26;
  let fallingPetalIM: THREE.InstancedMesh | null = null;
  const fallingPetalSeeds: {x: number; z: number; h0: number; speed: number; phase: number; r: number}[] = [];

  {
    const patio = new THREE.Group();
    patio.position.set(patioCenter.x, 0, patioCenter.z);

    // Cream sandstone garden patio terrace
    const padBorder = new THREE.Mesh(
      new THREE.CylinderGeometry(4.35, 4.55, 0.07, 32),
      getMat('#D6C3A8', 0.8),
    );
    padBorder.position.y = 0.035;
    const padFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(4.05, 4.1, 0.08, 32),
      getMat('#EFE3CF', 0.78),
    );
    padFloor.position.y = 0.04;
    padFloor.userData = {kind: 'ground'};
    patio.add(padBorder, padFloor);

    // Round wooden garden table in center
    const woodTblMat = getMat('#A36C41', 0.68);
    const woodLegMat = getMat('#734828', 0.74);
    const tblFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.1, 14), woodLegMat);
    tblFoot.position.y = 0.12;
    const tblPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.62, 10), woodLegMat);
    tblPillar.position.y = 0.44;
    const tblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.9, 0.09, 24), woodTblMat);
    tblTop.position.y = 0.78;
    const tblMatCloth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.02, 18),
      getMat('#FFF8ED', 0.85),
    );
    tblMatCloth.position.y = 0.832;
    patio.add(tblFoot, tblPillar, tblTop, tblMatCloth);
    colliders.push({type: 'circle', id: 'tea_table', x: patioCenter.x, z: patioCenter.z, r: 0.98});

    // Tea set & Two-Tier Pastry Stand on the table
    const teaCeramicMat = glossyClayMat('#CFECE2', 0.2);
    const teacupMat = glossyClayMat('#FFFDF7', 0.22);
    const teapotBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), teaCeramicMat);
    teapotBody.scale.set(1, 0.85, 1);
    teapotBody.position.set(-0.22, 0.96, 0.08);
    const teapotLid = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), teaCeramicMat);
    teapotLid.position.set(-0.22, 1.11, 0.08);
    const teapotSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.16, 6), teaCeramicMat);
    teapotSpout.rotation.z = 0.72;
    teapotSpout.position.set(-0.36, 0.99, 0.08);
    const teapotHandle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12), teaCeramicMat);
    teapotHandle.position.set(-0.07, 0.97, 0.08);
    patio.add(teapotBody, teapotLid, teapotSpout, teapotHandle);

    // 4 Teacups & Saucers for 4 seats
    const seatAngles = [0.45, 0.45 + Math.PI / 2, 0.45 + Math.PI, 0.45 + (Math.PI * 3) / 2];
    seatAngles.forEach((ang) => {
      const cx = Math.sin(ang) * 0.62;
      const cz = Math.cos(ang) * 0.62;
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.075, 0.02, 10), teacupMat);
      saucer.position.set(cx, 0.84, cz);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.042, 0.075, 10), teacupMat);
      cup.position.set(cx, 0.885, cz);
      const teaLiquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.012, 8),
        getMat('#B9743D', 0.35),
      );
      teaLiquid.position.set(cx, 0.915, cz);
      patio.add(saucer, cup, teaLiquid);
    });

    // Tiered Pastry & Cake Stand in table center-right
    const standGoldMat = glossyClayMat('#EAC267', 0.25);
    const standTier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.025, 14), teacupMat);
    standTier1.position.set(0.18, 0.89, -0.08);
    const standTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.022, 14), teacupMat);
    standTier2.position.set(0.18, 1.07, -0.08);
    const standStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.3, 8), standGoldMat);
    standStem.position.set(0.18, 0.99, -0.08);
    const pastryColors = ['#F79CB3', '#FFE07D', '#C98A56', '#B5E2C8'];
    [
      [0.29, 0.93, -0.04, 0],
      [0.1, 0.93, -0.2, 1],
      [0.12, 0.93, 0.04, 2],
      [0.24, 1.11, -0.11, 3],
      [0.12, 1.11, -0.05, 0],
    ].forEach(([px, py, pz, ci]) => {
      const cake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.06, 0.058, 8),
        getMat(pastryColors[ci], 0.55),
      );
      cake.position.set(px, py, pz);
      patio.add(cake);
    });
    patio.add(standTier1, standTier2, standStem);

    // 4 Interactive Cushioned Chairs around table
    const chairFrameMat = getMat('#8C5A34', 0.72);
    const cushionMat = getMat('#FAD4D8', 0.65);
    const seatRadius = 1.56;
    seatAngles.forEach((ang, idx) => {
      const lx = Math.sin(ang) * seatRadius;
      const lz = Math.cos(ang) * seatRadius;
      const sitRotY = ang + Math.PI;
      const chair = new THREE.Group();
      chair.position.set(lx, 0.08, lz);
      chair.rotation.y = sitRotY;

      const cSeat = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.09, 0.58, 2, 0.03), chairFrameMat);
      cSeat.position.y = 0.38;
      const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.08, 0.5, 2, 0.035), cushionMat);
      cushion.position.y = 0.45;
      const cBack = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.48, 0.08, 2, 0.03), chairFrameMat);
      cBack.position.set(0, 0.66, -0.25);
      [-0.24, 0.24].forEach((legX) => {
        [-0.22, 0.22].forEach((legZ) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.38, 6), chairFrameMat);
          leg.position.set(legX, 0.19, legZ);
          chair.add(leg);
        });
      });
      chair.add(cSeat, cushion, cBack);

      const wx = patioCenter.x + lx;
      const wz = patioCenter.z + lz;
      const approachAng = ang + 0.22;
      const tx = patioCenter.x + Math.sin(approachAng) * 2.25;
      const tz = patioCenter.z + Math.cos(approachAng) * 2.25;
      const cid = `tea_chair_${idx}`;
      addInteractionProxy(
        chair,
        [0.75, 0.98, 0.75],
        0.48,
        {
          kind: 'bench',
          tx,
          tz,
          seatX: wx,
          seatZ: wz,
          seatY: 0.5,
          sitRotY,
          colliderId: cid,
        },
        clickTargets,
      );
      colliders.push({type: 'circle', id: cid, x: wx, z: wz, r: 0.36});
      patio.add(chair);
    });

    // Tall Sculpted Cherry Blossom Tree beside the tea patio (6.5m+ tall!)
    const {trunkGeo: patSakTrunkGeo, blossomGeo: patSakBlossomGeo} = createSakuraGeometries();
    const patSakura = new THREE.Group();
    patSakura.position.set(-3.6, 0.02, -2.7);
    patSakura.rotation.y = 0.52;
    patSakura.scale.setScalar(1.92);
    const patSakTrunk = new THREE.Mesh(patSakTrunkGeo, getMat('#5C3E32', 0.82));
    const patSakBlossom = new THREE.Mesh(patSakBlossomGeo, getMat('#FFB7CD', 0.64));
    patSakura.add(patSakTrunk, patSakBlossom);
    patio.add(patSakura);
    colliders.push({
      type: 'circle',
      id: 'patio_sakura_tree',
      x: patioCenter.x - 3.6,
      z: patioCenter.z - 2.7,
      r: 0.65,
    });

    // Static fallen pink cherry petals scattered on stone patio & surrounding grass
    const patPetalGeo = new THREE.CircleGeometry(0.11, 5);
    patPetalGeo.rotateX(-Math.PI / 2);
    const patPetalMat = getMat('#FFAECC', 0.68);
    const patFallenIM = new THREE.InstancedMesh(patPetalGeo, patPetalMat, 32);
    for (let i = 0; i < 32; i++) {
      const a = i * 2.39996;
      const r = 0.9 + ((i * 0.37) % 3.8);
      const px = -1.2 + Math.cos(a) * r;
      const pz = -0.8 + Math.sin(a) * r;
      const onPad = Math.hypot(px, pz) < 4.05;
      _instDummy.position.set(px, onPad ? 0.092 : 0.035, pz);
      _instDummy.rotation.set(0, a, 0);
      _instDummy.scale.set(1.2, 1, 0.72);
      _instDummy.updateMatrix();
      patFallenIM.setMatrixAt(i, _instDummy.matrix);
    }
    patFallenIM.instanceMatrix.needsUpdate = true;
    patFallenIM.computeBoundingSphere();
    patio.add(patFallenIM);

    // Animated Drifting Sakura Petals floating lazily down from canopy (1 draw call)
    const fallPetalGeo = new THREE.PlaneGeometry(0.16, 0.11);
    const fallPetalMat = new THREE.MeshStandardMaterial({
      color: '#FFC0D6',
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    fallingPetalIM = new THREE.InstancedMesh(fallPetalGeo, fallPetalMat, FALL_PETAL_COUNT);
    fallingPetalIM.frustumCulled = false;
    for (let i = 0; i < FALL_PETAL_COUNT; i++) {
      const a = i * 2.39996;
      const r = 0.5 + (i % 7) * 0.48;
      fallingPetalSeeds.push({
        x: patioCenter.x - 1.6 + Math.cos(a) * r,
        z: patioCenter.z - 1.1 + Math.sin(a) * r,
        h0: 4.4 + (i % 5) * 0.32,
        speed: 0.14 + (i % 4) * 0.025,
        phase: i * 0.43,
        r: 0.35 + (i % 3) * 0.18,
      });
    }
    group.add(fallingPetalIM);

    // ===== 2 TALL WOODEN POLES + 1 SINGLE GENTLY-SAGGING WARM STRING LIGHT =====
    const poleMat = getMat('#6C462A', 0.78);
    const wireMat = getMat('#232026', 0.6);
    const collarMat = getMat('#B7ADA1', 0.8);
    const poleA = new THREE.Vector3(-4.2, 4.18, 2.35);
    const poleB = new THREE.Vector3(4.1, 4.18, -2.25);

    [poleA, poleB].forEach((pEnd, idx) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.22, 10), collarMat);
      foot.position.set(pEnd.x, 0.11, pEnd.z);
      const woodenPost = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, 4.32, 10), poleMat);
      woodenPost.position.set(pEnd.x, 2.18, pEnd.z);
      const topFinial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), poleMat);
      topFinial.position.set(pEnd.x, 4.35, pEnd.z);
      patio.add(foot, woodenPost, topFinial);
      colliders.push({
        type: 'circle',
        id: `string_pole_${idx}`,
        x: patioCenter.x + pEnd.x,
        z: patioCenter.z + pEnd.z,
        r: 0.24,
      });
    });

    // 1 single gracefully taut wire (subtle 0.34m gentle sag, matching user's photo!)
    const SAG_DROP = 0.34;
    const wirePoints: THREE.Vector3[] = [];
    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const pt = new THREE.Vector3().lerpVectors(poleA, poleB, t);
      pt.y -= SAG_DROP * 4 * t * (1 - t);
      wirePoints.push(pt);
    }
    const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
    const wireGeo = new THREE.TubeGeometry(wireCurve, 28, 0.022, 5, false);
    patio.add(new THREE.Mesh(wireGeo, wireMat));

    // 11 Warm Edison Bulbs hanging along that 1 single strand
    stringBulbMat = new THREE.MeshStandardMaterial({
      color: '#FFF3CC',
      emissive: '#FFAE42',
      emissiveIntensity: 0.16,
      roughness: 0.2,
    });
    const dropCordGeos: THREE.BufferGeometry[] = [];
    const bulbSpheres: THREE.BufferGeometry[] = [];
    const BULB_COUNT = 11;
    for (let b = 0; b < BULB_COUNT; b++) {
      const t = 0.08 + (b / (BULB_COUNT - 1)) * 0.84;
      const pt = wireCurve.getPoint(t);
      const cord = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 5);
      cord.translate(pt.x, pt.y - 0.09, pt.z);
      const socket = new THREE.CylinderGeometry(0.036, 0.042, 0.07, 7);
      socket.translate(pt.x, pt.y - 0.19, pt.z);
      dropCordGeos.push(cord, socket);

      const bulb = new THREE.SphereGeometry(0.088, 9, 8);
      bulb.translate(pt.x, pt.y - 0.28, pt.z);
      bulbSpheres.push(bulb);
    }
    patio.add(new THREE.Mesh(mergeParts(dropCordGeos), wireMat));
    patio.add(new THREE.Mesh(mergeParts(bulbSpheres), stringBulbMat));

    // Warm golden PointLight illuminating the tea patio & cherry blossoms at Sunset / Night
    patioNightLight = new THREE.PointLight('#FFB65C', 0, 18, 1.35);
    patioNightLight.position.set(0, 3.2, 0);
    patio.add(patioNightLight);

    group.add(patio);
  }

  // ========== 3. TALL INSTANCED GREEN TREES (AIRY & SPARSE ACROSS WIDE MAP — 3 DRAW CALLS TOTAL!) ==========
  const {trunkGeo, lowerCanopyGeo, upperCanopyGeo} = createTreeGeometries();
  const trunkMat = getMat('#7B5337', 0.82);
  const lowerLeafMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74});
  const upperLeafMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.7});

  const greenTrees: [number, number, number][] = [
    // Spacious town avenues & lawn parks (clear of all roads, plaza, tea patio & buildings)
    [-14.5, -9.8, 1.54],
    [13.8, -10.5, 1.58],
    [-16.2, 7.6, 1.48],
    [15.4, 7.4, 1.52],
    [-7.8, 13.6, 1.46],
    [8.2, 13.4, 1.48],
    [-22.5, -8.5, 1.6],
    [21.6, -9.4, 1.62],
    [10.2, -25.4, 1.64],
    [-22.4, -25.8, 1.68],
    // North & Hillside scenic frame
    [-17.2, -37.2, 1.82],
    [17.5, -36.8, 1.84],
    [-27.8, -32.4, 1.78],
    [27.6, -31.8, 1.82],
    [-39.0, -28.0, 1.88],
    [39.5, -28.6, 1.86],
    // Outer residential & farm countryside perimeter
    [-38.8, -19.2, 1.76],
    [-40.5, -7.8, 1.84],
    [41.5, -9.2, 1.78],
    [43.8, -21.0, 1.84],
    [-41.2, 5.2, 1.78],
    [42.4, 4.8, 1.82],
    [-41.5, 18.6, 1.86],
    [42.0, 18.2, 1.86],
    // South meadows & lakeside border
    [-33.6, 26.8, 1.74],
    [-29.2, 35.8, 1.82],
    [-11.8, 36.2, 1.72],
    [-4.8, 35.5, 1.66],
    [9.4, 36.0, 1.74],
    [29.8, 34.4, 1.8],
    [35.2, 26.8, 1.76],
    // Far scenic meadow depth (sparse horizon canopy)
    [-48.0, -34.0, 1.9],
    [48.5, -33.5, 1.9],
    [-49.5, 30.0, 1.88],
    [49.0, 29.5, 1.92],
    [-21.0, -47.0, 1.85],
    [21.5, -46.8, 1.86],
    [0.0, 42.5, 1.84],
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

    if (Math.abs(tx) < 52 && Math.abs(tz) < 52) {
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
    [HILL_CENTER.x - 4.0, HILL_CENTER.z - 2.8, 1.42],
    [HILL_CENTER.x + 4.2, HILL_CENTER.z - 2.6, 1.46],
    [HILL_CENTER.x - 0.5, HILL_CENTER.z - 4.8, 1.58],
    [HILL_CENTER.x - 5.8, HILL_CENTER.z + 1.6, 1.36],
    [HILL_CENTER.x + 5.8, HILL_CENTER.z + 1.8, 1.38],
    [HILL_CENTER.x - 3.6, HILL_CENTER.z + 5.4, 1.28],
    [HILL_CENTER.x + 3.8, HILL_CENTER.z + 5.4, 1.3],
    [HILL_CENTER.x + 2.0, HILL_CENTER.z - 6.0, 1.52],
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
    const rad = 0.6 + ((i * 0.48) % 8.4);
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

  // Doorstep stones + Sakura hill trail
  addDoorstepStones(TOWN_ZONE_ENTRANCES.home.tx + 0.2, TOWN_ZONE_ENTRANCES.home.tz + 0.2, TOWN_ZONE_ENTRANCES.home.tx + 0.9, TOWN_ZONE_ENTRANCES.home.tz + 1.4, 2);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.garden.tx - 0.2, TOWN_ZONE_ENTRANCES.garden.tz + 0.2, TOWN_ZONE_ENTRANCES.garden.tx - 0.9, TOWN_ZONE_ENTRANCES.garden.tz + 1.4, 2);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.boutique.tx + 0.3, TOWN_ZONE_ENTRANCES.boutique.tz + 0.1, TOWN_ZONE_ENTRANCES.boutique.tx + 1.6, TOWN_ZONE_ENTRANCES.boutique.tz - 0.3, 2);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.arcade.tx - 0.3, TOWN_ZONE_ENTRANCES.arcade.tz + 0.1, TOWN_ZONE_ENTRANCES.arcade.tx - 1.6, TOWN_ZONE_ENTRANCES.arcade.tz - 0.3, 2);
  addDoorstepStones(TOWN_ZONE_ENTRANCES.fishing.tx + 0.2, TOWN_ZONE_ENTRANCES.fishing.tz - 0.4, TOWN_ZONE_ENTRANCES.fishing.tx + 1.0, TOWN_ZONE_ENTRANCES.fishing.tz - 1.5, 2);
  addDoorstepStones(HILL_CENTER.x - 0.2, HILL_CENTER.z + 11.4, HILL_CENTER.x, HILL_CENTER.z + 3.8, 6);

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
    [TOWN_ZONE_ENTRANCES.home.tx, TOWN_ZONE_ENTRANCES.home.tz, 0.38],
    [TOWN_ZONE_ENTRANCES.boutique.tx, TOWN_ZONE_ENTRANCES.boutique.tz, 0.95],
    [TOWN_ZONE_ENTRANCES.arcade.tx, TOWN_ZONE_ENTRANCES.arcade.tz, -0.95],
    [TOWN_ZONE_ENTRANCES.fishing.tx, TOWN_ZONE_ENTRANCES.fishing.tz, 0.45],
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
    [-7.8, -3.2, '#F28482'],
    [7.8, -3.2, '#F9C74F'],
    [-7.8, 3.2, '#F7A8B8'],
    [7.8, 3.2, '#A8D8EA'],
    [-33.5, -20.8, '#F9C74F'],
    [-25.5, -21.2, '#F28482'],
    [26.2, -20.8, '#F7A8B8'],
    [35.8, -22.8, '#F9C74F'],
    [-36.2, 9.8, '#A8D8EA'],
    [-29.2, 19.6, '#F7A8B8'],
    [36.5, 9.2, '#F28482'],
    [29.8, 19.2, '#F9C74F'],
    [-24.2, 28.4, '#A8D8EA'],
    [-14.5, 32.2, '#F7A8B8'],
    [15.6, 28.0, '#F9C74F'],
    [23.2, 27.6, '#F28482'],
    [-8.4, -27.2, '#F7A8B8'],
    [-16.8, -18.2, '#A8D8EA'],
    [-22.5, 4.2, '#F9C74F'],
    [22.5, 4.2, '#F28482'],
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
  const FLOWER_COUNT = 180;
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

  const isOnRoadOrPlaza = (px: number, pz: number) => {
    if (Math.hypot(px, pz) < TOWN_PLAZA_RADIUS + 1.2) return true;
    if (Math.abs(pz) < 2.5 && px > -31 && px < 32) return true;
    if (Math.abs(px) < 2.4 && pz > -32 && pz < 26) return true;
    if (Math.abs(px + 28.3) < 2.2 && pz > -16 && pz < 18) return true;
    if (Math.abs(px - 29.0) < 2.2 && pz > -16 && pz < 17) return true;
    if (Math.hypot(px - patioCenter.x, pz - patioCenter.z) < 4.9) return true;
    if (Math.hypot(px + 20, pz - 30) < 5.0) return true;
    if (Math.hypot(px + 30, pz + 18) < 4.4) return true;
    if (Math.hypot(px - 31, pz + 18) < 4.4) return true;
    if (Math.hypot(px + 33, pz - 14) < 4.2) return true;
    if (Math.hypot(px - 33, pz - 13) < 4.6) return true;
    if (Math.hypot(px - 20, pz - 29) < 3.4) return true;
    return false;
  };

  const wildflowerPalette = ['#FFE066', '#FF9EAA', '#A8E0FF', '#D5B8FF', '#FFFFFF'];
  let placedFlowers = 0;
  for (let i = 0; i < 360 && placedFlowers < FLOWER_COUNT; i++) {
    const angle = i * 2.39996;
    const rad = 8.4 + ((i * 1.13) % 41.0);
    const fx = Math.cos(angle) * rad;
    const fz = Math.sin(angle) * rad;
    if (isOnRoadOrPlaza(fx, fz)) continue;

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
  const TUFT_COUNT = 160;
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
  for (let i = 0; i < 340 && placedTufts < TUFT_COUNT; i++) {
    const angle = i * 2.39996 + 0.9;
    const rad = 8.4 + ((i * 1.19) % 42.0);
    const gx = Math.cos(angle) * rad;
    const gz = Math.sin(angle) * rad;
    if (isOnRoadOrPlaza(gx, gz)) continue;
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
    [-9.5, -15.5, 0.44],
    [10.8, -17.5, 0.48],
    [-23.5, -3.5, 0.45],
    [24.5, -3.8, 0.46],
    [-8.5, 19.5, 0.4],
    [8.5, 18.8, 0.42],
    [HILL_CENTER.x - 8.5, HILL_CENTER.z + 6.2, 0.58],
    [HILL_CENTER.x + 8.8, HILL_CENTER.z + 5.8, 0.54],
    [HILL_CENTER.x - 6.2, HILL_CENTER.z - 7.8, 0.62],
    [HILL_CENTER.x + 6.6, HILL_CENTER.z - 7.4, 0.6],
    [-35.0, 20.8, 0.52],
    [35.2, 20.2, 0.5],
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
      const bulbEmissive = isNight ? 1.45 : isSunset ? 0.78 : 0.14;

      windowMeshes.forEach((m) => {
        m.emissiveIntensity = winEmissive;
      });
      lampBulbs.forEach((m) => {
        m.emissiveIntensity = bulbEmissive;
      });
      if (stringBulbMat) {
        stringBulbMat.emissiveIntensity = isNight ? 2.6 : isSunset ? 1.35 : 0.16;
      }
      if (patioNightLight) {
        patioNightLight.intensity = isNight ? 4.2 : isSunset ? 2.1 : 0;
      }
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

    // 3. Spin Windmill Sails beside the Conservatory Greenhouse
    if (windmillSailHub) {
      windmillSailHub.rotation.z = -elapsed * 0.55;
    }

    // 4. Drifting Sakura Petals over Tea Patio (1 draw call, zero allocations)
    if (fallingPetalIM) {
      for (let i = 0; i < FALL_PETAL_COUNT; i++) {
        const s = fallingPetalSeeds[i];
        const t = (elapsed * s.speed + s.phase) % 1;
        const py = THREE.MathUtils.lerp(s.h0, 0.12, t);
        const swayX = Math.sin(elapsed * 1.1 + s.phase * 4) * s.r;
        const swayZ = Math.cos(elapsed * 0.9 + s.phase * 3) * s.r * 0.8;
        _instDummy.position.set(s.x + swayX, py, s.z + swayZ);
        _instDummy.rotation.set(
          Math.sin(elapsed * 2 + s.phase) * 0.7,
          elapsed * 0.9 + s.phase,
          Math.cos(elapsed * 1.7 + s.phase) * 0.6,
        );
        const fade = t > 0.88 ? Math.max(0.01, (1 - t) / 0.12) : 1;
        _instDummy.scale.setScalar(fade);
        _instDummy.updateMatrix();
        fallingPetalIM.setMatrixAt(i, _instDummy.matrix);
      }
      fallingPetalIM.instanceMatrix.needsUpdate = true;
    }
  };

  const dispose = () => {
    grassTex.dispose();
    hillTex.dispose();
    cobbleTex.dispose();
    roadCobbleTex.dispose();
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
