import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TimeOfDay, ZoneId} from '../types/game';
import {KOI_AVATAR, SHIP_AVATAR} from '../data/avatarCatalog';
import {AvatarRig, buildAvatarRig, updateAvatarRigAnimation} from './avatar3d';
import {
  createFishingSpotVisuals,
  FishingSpotVisuals,
  FishingVisualFrame,
} from './fishingVisuals3d';
import {
  InsectAnchor,
  InsectCatchEvaluation,
  TownInsectManager,
} from './insects3d';
import {
  createAtlasPlaneGeometry,
  createGrassTexture,
  createStoneWalkwayTexture,
  createWaterfallTexture,
  getSharedSignAtlasMaterial,
  getWarmGlowTexture,
  glossyClayMat,
  mergeStaticGroupByMaterial,
} from './materials';

export const TOWN_PLAZA_RADIUS = 7.2;
export const HILL_CENTER = {x: 0, z: -64};
export const HILL_RADIUS = 40.0;
export const HILL_PEAK_Y = 13.2;

export const TOWN_ZONE_ENTRANCES: Record<
  Exclude<ZoneId, 'town'>,
  {tx: number; tz: number; exitRotY: number}
> = {
  home: {tx: -32.0, tz: -15.3, exitRotY: 0},
  garden: {tx: 32.0, tz: -16.4, exitRotY: 0},
  boutique: {tx: -32.0, tz: 23.2, exitRotY: 0},
  arcade: {tx: 32.0, tz: 23.1, exitRotY: 0},
  fishing: {tx: -19.6, tz: 38.6, exitRotY: 0},
  petshop: {tx: 11.8, tz: 43.85, exitRotY: 0},
};

export const LAKE_CENTER = {x: -23.0, z: 46.8};
export const TOWN_LAKE_WATER_Y = -0.26;
export const RIVER_WATER_Y = TOWN_LAKE_WATER_Y;

export const WEST_RIVER_NAV_MIN_Z = -60;
export const WEST_RIVER_NAV_MAX_Z = 56;
export const WEST_RIVER_VISUAL_HALF_LEN = 250;
export const WEST_BRIDGE_Z = 8.5;
export const WEST_BRIDGE_HALF_SPAN = 9.6;
export const SHIP_STALL_POS = {x: -68.2, z: -12.6};
export const SHIP_STALL_INTERACT = {tx: -68.2, tz: -8.6};
export const RIVER_DOCK_POS = {x: -74.6, z: -1.8};
export const RIVER_BOARD_INTERACT = {tx: -73.4, tz: -1.45};
export const RIVER_BOAT_SPAWN = {x: -79.8, z: -1.8, rotY: Math.PI};

export function getWestRiverCenterX(z: number): number {
  return -86.5 + Math.sin(z * 0.032) * 3.4 + Math.cos(z * 0.014) * 1.4;
}

export function getWestRiverHalfWidth(z: number): number {
  return 7.6 + 2.8 * Math.exp(-((z + 8) * (z + 8)) / 190);
}

export function getWestRiverNavBounds(z: number): {minX: number; maxX: number} {
  const cx = getWestRiverCenterX(z);
  const hw = getWestRiverHalfWidth(z);
  let minX = cx - hw + 2.1;
  let maxX = cx + hw - 2.1;
  if (z >= -16 && z <= -2) {
    minX = Math.max(minX, cx - hw + 3.2);
  }
  if (z >= -4.1 && z <= 0.2) {
    maxX = Math.min(maxX, -78.4);
  }
  return {minX, maxX};
}

export function getWestRiverBridgeHeight(x: number, z: number): number | null {
  if (Math.abs(z - WEST_BRIDGE_Z) > 1.48) return null;
  const midX = getWestRiverCenterX(WEST_BRIDGE_Z);
  const dx = x - midX;
  if (Math.abs(dx) > WEST_BRIDGE_HALF_SPAN) return null;
  const u = dx / WEST_BRIDGE_HALF_SPAN;
  return 0.03 + 2.34 * Math.pow(Math.max(0, Math.cos(u * Math.PI * 0.5)), 1.35);
}

const WEST_TRAIL_WAYPOINTS: [number, number, number][] = [
  [-100.5, 19.5, 0.02],
  [-106.5, 15.0, 2.2],
  [-113.5, 9.5, 5.4],
  [-117.5, 3.0, 8.6],
  [-118.5, -4.5, 11.2],
];

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function closestPointOnWestTrail(x: number, z: number): {dist: number; elev: number} {
  let bestDist = Infinity;
  let bestElev = 0.02;
  for (let i = 0; i < WEST_TRAIL_WAYPOINTS.length - 1; i++) {
    const [ax, az, ay] = WEST_TRAIL_WAYPOINTS[i];
    const [bx, bz, by] = WEST_TRAIL_WAYPOINTS[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const lenSq = vx * vx + vz * vz;
    const t = lenSq > 0 ? THREE.MathUtils.clamp(((x - ax) * vx + (z - az) * vz) / lenSq, 0, 1) : 0;
    const px = ax + vx * t;
    const pz = az + vz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestDist) {
      bestDist = d;
      bestElev = THREE.MathUtils.lerp(ay, by, t);
    }
  }
  return {dist: bestDist, elev: bestElev};
}

export function getWestMountainHeight(x: number, z: number): number {
  // Fast bounding skip
  if (x > -95.2 || x < -146.0 || z < -39.0 || z > 25.0) return 0;

  // 1. Walkable gentle trail ramp + scenic summit overlook
  const {dist: trailDist, elev: trailElev} = closestPointOnWestTrail(x, z);
  const trailWidth = 4.6;
  const trailSkirt = 13.5;
  const trailW = 1 - smoothStep(trailWidth, trailSkirt, trailDist);
  const trailHeight = trailElev * trailW;

  // Flat summit overlook around (-118.5, -4.5)
  const dSummit = Math.hypot(x - -118.5, z - -4.5);
  const summitW = 1 - smoothStep(4.8, 16.0, dSummit);
  const summitHeight = 11.2 * summitW;

  // 2. Massive rocky waterfall cliff massif overlooking river plunge pool at (-105, -11)
  const dxC = (x - -107.0) / 13.5;
  const dzC = (z - -11.5) / 16.0;
  const dCliff = Math.hypot(dxC, dzC);
  const cliffHeight = dCliff < 1.15 ? 18.2 * Math.pow(Math.max(0, 1 - dCliff / 1.15), 1.35) : 0;

  // Secondary shoulder ridge at (-126, -15)
  const dxS = (x - -126.5) / 15.0;
  const dzS = (z - -13.5) / 18.5;
  const dShoulder = Math.hypot(dxS, dzS);
  const shoulderHeight = dShoulder < 1.0 ? 14.5 * Math.pow(Math.max(0, 1 - dShoulder), 1.45) : 0;

  // Keep east bank outside cliff edge cleanly grounded
  const riverRightStop = smoothStep(-96.2, -98.8, x);
  const raw = Math.max(trailHeight, summitHeight, cliffHeight, shoulderHeight);
  return raw * riverRightStop;
}

export const MALL_CENTER = {x: -54.2, z: -2.5};
export const MALL_ELEVATOR_CAB_POS = {x: -47.85, z: -2.5};
export const MALL_ELEVATOR_BOARD_POS = {x: -46.15, z: -2.5};
export const MALL_DECK_Y = 25.0;
export const MALL_DECK_CENTER = {x: -45.4, z: -2.5};
export const MALL_DECK_WALK_RADIUS = 4.45;

export function clampPointToMallDeck(x: number, z: number): {x: number; z: number} {
  let nx = x;
  let nz = z;
  const dx = nx - MALL_DECK_CENTER.x;
  const dz = nz - MALL_DECK_CENTER.z;
  const d = Math.hypot(dx, dz);
  if (d > MALL_DECK_WALK_RADIUS && d > 0.0001) {
    nx = MALL_DECK_CENTER.x + (dx / d) * MALL_DECK_WALK_RADIUS;
    nz = MALL_DECK_CENTER.z + (dz / d) * MALL_DECK_WALK_RADIUS;
  }
  // Keep player cleanly outside the vertical glass shaft cutout on the West side of the deck
  if (nx < -46.85 && Math.abs(nz - MALL_ELEVATOR_CAB_POS.z) < 1.25) {
    nx = -46.85;
  }
  // Keep player cleanly around the Skydeck umbrella café table (-43.9, -0.25) and telescope (-41.56, -3.94)
  const deckObstacles: [number, number, number][] = [
    [-43.9, -0.25, 0.78],
    [-41.56, -3.94, 0.48],
    [-41.9, 2.6, 0.72],
  ];
  for (let i = 0; i < deckObstacles.length; i++) {
    const [ox, oz, minR] = deckObstacles[i];
    const odx = nx - ox;
    const odz = nz - oz;
    const od = Math.hypot(odx, odz);
    if (od < minR) {
      if (od > 0.0001) {
        nx = ox + (odx / od) * minR;
        nz = oz + (odz / od) * minR;
      } else {
        nx = ox;
        nz = oz + minR;
      }
    }
  }
  return {x: nx, z: nz};
}

export function getLakeShoreRadius(theta: number): number {
  return (
    9.2 +
    0.85 * Math.cos(theta * 2 - 0.5) +
    0.55 * Math.sin(theta * 3 + 0.4) +
    0.3 * Math.cos(theta * 4 + 1.1)
  );
}

export function getTownGroundHeight(
  x: number,
  z: number,
  plazaRadius = TOWN_PLAZA_RADIUS,
): number {
  // Walkable wooden fishing bridge over the sunken lake (x: -23.45..-21.55, z: 36.65..44.55)
  if (x >= -23.45 && x <= -21.55 && z >= 36.65 && z <= 44.55) {
    if (z < 37.35) {
      const u = THREE.MathUtils.clamp((z - 36.65) / 0.7, 0, 1);
      return THREE.MathUtils.lerp(0.02, 0.24, u);
    }
    return 0.24;
  }
  // Walkable Arched Bridge over West River (z ≈ 8.5)
  const bridgeH = getWestRiverBridgeHeight(x, z);
  if (bridgeH !== null) {
    return bridgeH;
  }
  // Walkable East Riverbank Boat Dock planks
  if (x >= -77.6 && x <= -73.8 && z >= -3.1 && z <= -0.5) {
    return 0.22;
  }
  // Walkable West Waterfall Mountain & gentle climbing slope
  if (x <= -95.2 && x >= -146.0 && z >= -39.0 && z <= 25.0) {
    const mh = getWestMountainHeight(x, z);
    if (mh > 0.02) return 0.02 + mh;
  }
  // Raised May Mall Travertine Forecourt Terrace (prevents ground grass Z-fighting)
  if (x >= -61.45 && x <= -44.05 && z >= -10.55 && z <= 5.55) {
    return 0.21;
  }
  if (x >= -61.85 && x <= -43.65 && z >= -10.95 && z <= 5.95) {
    return 0.12;
  }
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

const PLAZA_BED_ARC_MID_R = 8.02;
const PLAZA_BED_ARC_SPAN = THREE.MathUtils.degToRad(46);

export function isPointOnPlazaFlowerBed(x: number, z: number): boolean {
  const ax = Math.abs(x);
  if (ax < 3.6 || ax > 9.3 || Math.abs(z) > 6.6) return false;
  const ang = Math.atan2(z, ax);
  const clampedAng = Math.max(-PLAZA_BED_ARC_SPAN, Math.min(PLAZA_BED_ARC_SPAN, ang));
  const cx = Math.cos(clampedAng) * PLAZA_BED_ARC_MID_R;
  const cz = Math.sin(clampedAng) * PLAZA_BED_ARC_MID_R;
  return Math.hypot(ax - cx, z - cz) <= 0.50;
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
  setFishingState?: (state: 'idle' | 'waiting' | 'bite') => void;
  updateFishingVisuals?: (frame: FishingVisualFrame, elapsed: number) => void;
  setOutdoorSwingSeated?: (seated: boolean) => void;
  getOutdoorSwingSeatPose?: () => {x: number; y: number; z: number; pitch: number} | null;
  setMallElevatorY?: (y: number) => void;
  setRiverBoatPose?: (
    active: boolean,
    x?: number,
    z?: number,
    rotY?: number,
    moving?: boolean,
    elapsed?: number,
  ) => void;
  updateInsects?: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerSpeed: number,
    isCreeping: boolean,
    elapsed: number,
    dt: number,
    frustum?: THREE.Frustum,
    camX?: number,
    camZ?: number,
  ) => {escapedByRun: number; startledByRun: number};
  tryCatchInsect?: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRotY: number,
  ) => InsectCatchEvaluation;
  update: (
    elapsed: number,
    timeOfDay: TimeOfDay,
    frustum?: THREE.Frustum,
    cameraPos?: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

const _dropDummy = new THREE.Object3D();
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
  return proxy;
}

// Helper: build a crisp, genuine 5-petal 3D stylized blossom + golden pistil center (static merged geometry)
function append5PetalFlower(
  petalParts: THREE.BufferGeometry[],
  centerParts: THREE.BufferGeometry[],
  cx: number,
  cy: number,
  cz: number,
  scale = 1.0,
  tiltX = 0,
  tiltZ = 0,
  rotPhase = 0,
) {
  const dummy = new THREE.Object3D();
  dummy.position.set(cx, cy, cz);
  dummy.rotation.set(tiltX, rotPhase, tiltZ);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();

  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    const petal = new THREE.SphereGeometry(0.056, 4, 3);
    petal.scale(0.84, 0.34, 1.48);
    petal.rotateX(-0.22); // Cupped slightly upward so every petal silhouette reads clearly
    petal.translate(0, 0.012, 0.068);
    petal.rotateY(a);
    petal.applyMatrix4(dummy.matrix);
    petalParts.push(petal);
  }

  const pistil = new THREE.SphereGeometry(0.044, 4, 3);
  pistil.scale(1.0, 0.62, 1.0);
  pistil.translate(0, 0.02, 0);
  pistil.applyMatrix4(dummy.matrix);
  centerParts.push(pistil);
}

// Detailed Broadleaf Oak trees: flared roots, curved branches, sub-twigs & 12 sculpted foliage clusters
export function createTreeGeometries() {
  const rootFlare = new THREE.CylinderGeometry(0.28, 0.56, 0.52, 9);
  rootFlare.translate(0, 0.25, 0);

  const rootA = new THREE.CylinderGeometry(0.09, 0.17, 0.52, 6);
  rootA.rotateZ(1.08);
  rootA.translate(-0.34, 0.14, 0.12);
  const rootB = new THREE.CylinderGeometry(0.09, 0.17, 0.5, 6);
  rootB.rotateZ(-1.05);
  rootB.translate(0.32, 0.14, -0.14);

  const trunk = new THREE.CylinderGeometry(0.22, 0.33, 2.25, 9);
  trunk.translate(0, 1.36, 0);

  const b1 = new THREE.CylinderGeometry(0.095, 0.16, 1.42, 7);
  b1.rotateZ(0.72);
  b1.translate(-0.56, 2.38, 0.18);
  const twig1 = new THREE.CylinderGeometry(0.05, 0.08, 0.85, 6);
  twig1.rotateZ(1.05);
  twig1.rotateY(0.45);
  twig1.translate(-1.05, 2.75, 0.38);

  const b2 = new THREE.CylinderGeometry(0.095, 0.16, 1.38, 7);
  b2.rotateZ(-0.7);
  b2.translate(0.54, 2.42, -0.14);
  const twig2 = new THREE.CylinderGeometry(0.05, 0.08, 0.84, 6);
  twig2.rotateZ(-1.04);
  twig2.rotateY(-0.35);
  twig2.translate(1.02, 2.76, -0.32);

  const b3 = new THREE.CylinderGeometry(0.085, 0.14, 1.26, 7);
  b3.rotateX(-0.68);
  b3.translate(0.1, 2.36, -0.52);

  const b4 = new THREE.CylinderGeometry(0.085, 0.14, 1.24, 7);
  b4.rotateX(0.66);
  b4.translate(-0.12, 2.4, 0.5);

  const trunkGeo = mergeParts([rootFlare, rootA, rootB, trunk, b1, twig1, b2, twig2, b3, b4]);

  // Multi-lobe layered canopy (lower lush silhouette + outer rim tufts)
  const lowerSpecs: [number, number, number, number, number, number, number][] = [
    [0, 3.3, 0, 1.26, 1.18, 0.72, 1.15],
    [-1.18, 2.94, 0.34, 0.96, 1.15, 0.7, 1.08],
    [1.16, 2.98, -0.28, 0.94, 1.14, 0.68, 1.08],
    [0.16, 2.98, -1.08, 0.92, 1.12, 0.68, 1.12],
    [-0.2, 3.04, 1.04, 0.88, 1.12, 0.68, 1.08],
    [-0.95, 3.22, -0.78, 0.74, 1.08, 0.72, 1.06],
  ];
  const lowerParts = lowerSpecs.map(([x, y, z, r, sx, sy, sz]) => {
    const g = new THREE.SphereGeometry(r, 7, 5);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    return g;
  });
  const lowerCanopyGeo = mergeParts(lowerParts);

  // Sun-kissed upper sculpted crown & crisp outer foliage puffs
  const upperSpecs: [number, number, number, number, number, number, number][] = [
    [0.04, 3.98, 0.04, 1.02, 1.18, 0.72, 1.14],
    [-0.68, 3.66, 0.58, 0.76, 1.12, 0.7, 1.08],
    [0.78, 3.58, 0.44, 0.74, 1.12, 0.7, 1.08],
    [-0.48, 3.74, -0.62, 0.72, 1.1, 0.72, 1.06],
    [0.54, 3.82, -0.44, 0.68, 1.1, 0.7, 1.08],
    [0.02, 4.44, 0.02, 0.58, 1.14, 0.68, 1.12],
  ];
  const upperParts = upperSpecs.map(([x, y, z, r, sx, sy, sz]) => {
    const g = new THREE.SphereGeometry(r, 7, 5);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    return g;
  });
  const upperCanopyGeo = mergeParts(upperParts);

  return {trunkGeo, lowerCanopyGeo, upperCanopyGeo};
}

// Graceful multi-branched woodland trees with clearly visible forked limbs and airy sculpted leaf puffs
function createBranchedWoodlandGeometries() {
  const root = new THREE.CylinderGeometry(0.19, 0.38, 0.44, 8);
  root.translate(0, 0.22, 0);

  const lowerTrunk = new THREE.CylinderGeometry(0.145, 0.22, 1.56, 8);
  lowerTrunk.translate(0, 1.05, 0);

  const limbLeft = new THREE.CylinderGeometry(0.08, 0.13, 1.68, 7);
  limbLeft.rotateZ(0.48);
  limbLeft.translate(-0.43, 2.32, 0.08);

  const limbRight = new THREE.CylinderGeometry(0.075, 0.125, 1.58, 7);
  limbRight.rotateZ(-0.52);
  limbRight.translate(0.43, 2.26, -0.08);

  const limbBack = new THREE.CylinderGeometry(0.068, 0.11, 1.38, 6);
  limbBack.rotateX(-0.48);
  limbBack.translate(0.04, 2.48, -0.36);

  const twigLeft = new THREE.CylinderGeometry(0.046, 0.074, 0.96, 6);
  twigLeft.rotateZ(0.84);
  twigLeft.rotateY(0.42);
  twigLeft.translate(-0.9, 2.75, 0.28);

  const twigRight = new THREE.CylinderGeometry(0.046, 0.074, 0.92, 6);
  twigRight.rotateZ(-0.86);
  twigRight.rotateY(-0.32);
  twigRight.translate(0.88, 2.68, -0.22);

  const twigFront = new THREE.CylinderGeometry(0.042, 0.068, 0.85, 6);
  twigFront.rotateX(0.75);
  twigFront.translate(0.14, 2.66, 0.46);

  const trunkGeo = mergeParts([
    root,
    lowerTrunk,
    limbLeft,
    limbRight,
    limbBack,
    twigLeft,
    twigRight,
    twigFront,
  ]);

  const lowerSpecs: [number, number, number, number, number, number, number][] = [
    [-1.12, 3.04, 0.34, 0.72, 1.18, 0.72, 1.1],
    [-0.78, 2.86, 0.62, 0.52, 1.12, 0.74, 1.08],
    [1.08, 2.96, -0.26, 0.7, 1.16, 0.7, 1.1],
    [0.08, 3.22, -0.7, 0.68, 1.14, 0.72, 1.08],
    [0.32, 2.94, 0.72, 0.56, 1.12, 0.72, 1.08],
  ];
  const lowerCanopyGeo = mergeParts(
    lowerSpecs.map(([x, y, z, r, sx, sy, sz]) => {
      const g = new THREE.SphereGeometry(r, 7, 5);
      g.scale(sx, sy, sz);
      g.translate(x, y, z);
      return g;
    }),
  );

  const upperSpecs: [number, number, number, number, number, number, number][] = [
    [-0.08, 3.68, 0.16, 0.78, 1.2, 0.7, 1.14],
    [-0.64, 3.44, 0.14, 0.58, 1.14, 0.72, 1.08],
    [0.54, 3.42, 0.34, 0.6, 1.14, 0.72, 1.08],
    [0.06, 4.02, -0.1, 0.48, 1.12, 0.7, 1.1],
  ];
  const upperCanopyGeo = mergeParts(
    upperSpecs.map(([x, y, z, r, sx, sy, sz]) => {
      const g = new THREE.SphereGeometry(r, 7, 5);
      g.scale(sx, sy, sz);
      g.translate(x, y, z);
      return g;
    }),
  );

  return {trunkGeo, lowerCanopyGeo, upperCanopyGeo};
}

// Cute, friendly & simple layered Evergreen Pine tree (clean rounded conical tiers, never scary!)
function createPineConiferGeometries() {
  const root = new THREE.CylinderGeometry(0.18, 0.32, 0.36, 7);
  root.translate(0, 0.18, 0);

  const trunk = new THREE.CylinderGeometry(0.12, 0.21, 1.45, 7);
  trunk.translate(0, 0.88, 0);

  const trunkGeo = mergeParts([root, trunk]);

  // Lower 2 clean rounded conical skirts (8-sided cozy stylized pine)
  const tier1 = new THREE.ConeGeometry(1.42, 1.38, 8);
  tier1.translate(0, 1.82, 0);
  const tier1Rim = new THREE.TorusGeometry(1.16, 0.22, 5, 9);
  tier1Rim.rotateX(Math.PI / 2);
  tier1Rim.scale(1, 1, 0.65);
  tier1Rim.translate(0, 1.2, 0);

  const tier2 = new THREE.ConeGeometry(1.16, 1.28, 8);
  tier2.rotateY(0.31);
  tier2.translate(0, 2.58, 0);

  const lowerFoliageGeo = mergeParts([tier1, tier1Rim, tier2]);

  // Upper 2 sun-kissed conical tiers + soft rounded tip
  const tier3 = new THREE.ConeGeometry(0.9, 1.16, 8);
  tier3.rotateY(0.15);
  tier3.translate(0, 3.28, 0);

  const tier4 = new THREE.ConeGeometry(0.6, 0.98, 8);
  tier4.rotateY(0.45);
  tier4.translate(0, 3.94, 0);

  const crownTip = new THREE.SphereGeometry(0.18, 6, 5);
  crownTip.scale(0.95, 1.25, 0.95);
  crownTip.translate(0, 4.38, 0);

  const upperFoliageGeo = mergeParts([tier3, tier4, crownTip]);

  return {trunkGeo, lowerFoliageGeo, upperFoliageGeo};
}

// Detailed Sakura (Hoa Đào) tree: gnarled spreading boughs + layered pink canopy + accent flower buds
function createSakuraGeometries() {
  const root = new THREE.CylinderGeometry(0.24, 0.44, 0.44, 9);
  root.translate(0, 0.22, 0);

  const lowerTrunk = new THREE.CylinderGeometry(0.19, 0.27, 1.25, 9);
  lowerTrunk.rotateZ(0.08);
  lowerTrunk.translate(-0.04, 0.85, 0);

  const upperTrunk = new THREE.CylinderGeometry(0.14, 0.2, 1.05, 8);
  upperTrunk.rotateZ(-0.11);
  upperTrunk.translate(0.04, 1.72, 0.02);

  const b1 = new THREE.CylinderGeometry(0.075, 0.125, 1.38, 7);
  b1.rotateZ(0.76);
  b1.translate(-0.56, 2.08, 0.14);
  const sub1 = new THREE.CylinderGeometry(0.042, 0.07, 0.84, 6);
  sub1.rotateZ(1.12);
  sub1.rotateY(0.35);
  sub1.translate(-1.12, 2.42, 0.34);

  const b2 = new THREE.CylinderGeometry(0.075, 0.125, 1.32, 7);
  b2.rotateZ(-0.7);
  b2.translate(0.54, 2.12, -0.1);
  const sub2 = new THREE.CylinderGeometry(0.042, 0.07, 0.82, 6);
  sub2.rotateZ(-1.08);
  sub2.rotateY(-0.3);
  sub2.translate(1.06, 2.44, -0.26);

  const b3 = new THREE.CylinderGeometry(0.062, 0.102, 1.12, 6);
  b3.rotateX(-0.64);
  b3.translate(0.04, 2.14, -0.48);

  const b4 = new THREE.CylinderGeometry(0.058, 0.094, 1.05, 6);
  b4.rotateX(0.6);
  b4.translate(-0.06, 2.12, 0.44);

  const trunkGeo = mergeParts([root, lowerTrunk, upperTrunk, b1, sub1, b2, sub2, b3, b4]);

  const cloudSpecs: [number, number, number, number, number, number, number][] = [
    [0, 2.94, 0, 1.05, 1.28, 0.66, 1.18],
    [-1.08, 2.58, 0.34, 0.84, 1.24, 0.64, 1.14],
    [1.06, 2.62, -0.26, 0.82, 1.24, 0.64, 1.12],
    [0.08, 3.38, 0.12, 0.8, 1.22, 0.66, 1.14],
    [0.05, 2.68, -0.88, 0.74, 1.2, 0.64, 1.12],
    [-0.12, 2.66, 0.82, 0.7, 1.18, 0.64, 1.1],
    [-0.64, 3.06, -0.58, 0.64, 1.16, 0.66, 1.08],
    [0.68, 3.12, 0.46, 0.62, 1.16, 0.66, 1.08],
  ];
  const blossomGeo = mergeParts(
    cloudSpecs.map(([x, y, z, r, sx, sy, sz]) => {
      const g = new THREE.SphereGeometry(r, 7, 5);
      g.scale(sx, sy, sz);
      g.translate(x, y, z);
      return g;
    }),
  );

  // Rich outer & lower pink cherry-blossom flower clusters (2nd instanced color layer for detail)
  const accentParts: THREE.BufferGeometry[] = [];
  const accentCenters: THREE.BufferGeometry[] = [];
  const accentSpots: [number, number, number, number, number][] = [
    [-1.42, 2.52, 0.56, 1.45, 0.2],
    [-0.95, 2.95, 0.84, 1.35, -0.2],
    [1.36, 2.54, -0.45, 1.4, -0.15],
    [0.92, 3.02, 0.76, 1.35, 0.25],
    [0.2, 3.68, 0.46, 1.4, 0.15],
    [-0.36, 3.58, -0.32, 1.35, -0.15],
    [-0.45, 2.48, 0.96, 1.3, 0.3],
    [0.48, 2.52, -0.95, 1.3, -0.25],
    [-1.24, 2.86, -0.36, 1.3, 0.1],
    [1.18, 2.9, 0.26, 1.3, -0.1],
  ];
  accentSpots.forEach(([ax, ay, az, asc, tilt], idx) => {
    append5PetalFlower(accentParts, accentCenters, ax, ay, az, asc, tilt, tilt * 0.6, idx * 0.7);
  });
  const accentBloomGeo = mergeParts(accentParts);
  const accentCenterGeo = mergeParts(accentCenters);

  return {trunkGeo, blossomGeo, accentBloomGeo, accentCenterGeo};
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
  // ShapeGeometry UVs are in world meters (110/600m ≈ 0.185 repeats/m)
  const grassTex = createGrassTexture(0.185, 0.185);
  const hillTex = createGrassTexture(18, 18);
  const plazaStoneTex = createStoneWalkwayTexture(4, 4);
  const signAtlasMat = getSharedSignAtlasMaterial();
  const warmGlowTex = getWarmGlowTexture();
  let koiRig: AvatarRig | null = null;
  let shipRig: AvatarRig | null = null;
  let westCampFlameA: THREE.Mesh | null = null;
  let westCampFlameB: THREE.Mesh | null = null;
  let westCampGlowMat: THREE.MeshBasicMaterial | null = null;
  let westCampLanternMat: THREE.MeshStandardMaterial | null = null;
  let westCampLanternPoolMat: THREE.MeshBasicMaterial | null = null;
  let lastCampLanternLit: boolean | null = null;

  const isInWestRiverOrCliffZone = (x: number, z: number, pad = 2.6): boolean => {
    if (x > -58) return false;
    if (Math.abs(x - getWestRiverCenterX(z)) < getWestRiverHalfWidth(z) + pad) return true;
    if (x >= -77.8 && x <= -61.5 && z >= -17.0 && z <= 12.2) return true;
    if (x >= -101.8 && x <= -91.0 && z >= 5.2 && z <= 21.5) return true;
    if (x >= -146.5 && x <= -94.0 && z >= -39.5 && z <= 25.5) return true;
    if (x >= -129.0 - pad && x <= -98.0 + pad && z >= 25.0 - pad && z <= 49.0 + pad) return true;
    return false;
  };

  // ========== 1. EXPANDED TERRAIN (WITH PUNCHED LAKE BASIN) + GENTLE SCENIC HILL ==========
  const terrainShape = new THREE.Shape();
  terrainShape.absarc(0, 0, 300, 0, Math.PI * 2, false);
  const LAKE_HOLE_SEGMENTS = 44;
  const lakeHolePath = new THREE.Path();
  for (let i = 0; i <= LAKE_HOLE_SEGMENTS; i++) {
    // CW winding in shape 2D space; after rotateX(-PI/2), shape (x, y) maps to world (x, -y)
    const theta = -(i / LAKE_HOLE_SEGMENTS) * Math.PI * 2;
    const r = getLakeShoreRadius(theta);
    const sx = LAKE_CENTER.x + Math.cos(theta) * r;
    const sy = -(LAKE_CENTER.z + Math.sin(theta) * r);
    if (i === 0) lakeHolePath.moveTo(sx, sy);
    else lakeHolePath.lineTo(sx, sy);
  }
  terrainShape.holes.push(lakeHolePath);

  // Punch curved West River channel spanning nearly the entire ground disc for endless horizon illusion
  const RIVER_HOLE_Z_STEPS = 44;
  const riverHolePath = new THREE.Path();
  for (let i = 0; i <= RIVER_HOLE_Z_STEPS; i++) {
    const z = THREE.MathUtils.lerp(
      WEST_RIVER_VISUAL_HALF_LEN,
      -WEST_RIVER_VISUAL_HALF_LEN,
      i / RIVER_HOLE_Z_STEPS,
    );
    const rx = getWestRiverCenterX(z) + getWestRiverHalfWidth(z);
    if (i === 0) riverHolePath.moveTo(rx, -z);
    else riverHolePath.lineTo(rx, -z);
  }
  for (let i = 0; i <= RIVER_HOLE_Z_STEPS; i++) {
    const z = THREE.MathUtils.lerp(
      -WEST_RIVER_VISUAL_HALF_LEN,
      WEST_RIVER_VISUAL_HALF_LEN,
      i / RIVER_HOLE_Z_STEPS,
    );
    const lx = getWestRiverCenterX(z) - getWestRiverHalfWidth(z);
    riverHolePath.lineTo(lx, -z);
  }
  riverHolePath.closePath();
  terrainShape.holes.push(riverHolePath);

  const terrainGeo = new THREE.ShapeGeometry(terrainShape, 32);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.88,
    metalness: 0.0,
  });
  const groundMesh = new THREE.Mesh(terrainGeo, terrainMat);
  groundMesh.userData = {kind: 'ground', noShadowBlock: true};
  group.add(groundMesh);

  // Gentle walkable Scenic Overlook Hill in the North (-Z)
  const hillSize = HILL_RADIUS * 2.12;
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
  const hillMat = new THREE.MeshStandardMaterial({
    map: hillTex,
    color: '#A5DC8E',
    roughness: 0.86,
    metalness: 0.0,
  });
  const hillMesh = new THREE.Mesh(hillGeo, hillMat);
  hillMesh.position.set(HILL_CENTER.x, 0, HILL_CENTER.z);
  hillMesh.userData = {kind: 'ground', noShadowBlock: true};
  group.add(hillMesh);

  // Static Clay Hot Air Balloon Station ("Trạm Khinh Khí Cầu") on Top of the Raised North Hill
  {
    const stationZ = HILL_CENTER.z - 0.8;
    const balloonStation = new THREE.Group();
    balloonStation.position.set(HILL_CENTER.x, HILL_PEAK_Y, stationZ);

    const bStoneMat = getMat('#CBD4DE', 0.82);
    const bTimberMat = getMat('#8A5B36', 0.76);
    const bDeckMat = getMat('#D6A46E', 0.72);
    const bBoothCreamMat = getMat('#FFF5E4', 0.68);
    const bBoothAwningMat = getMat('#E86C5D', 0.56);
    const bRopeMat = getMat('#DFC79C', 0.84);
    const bWickerMat = getMat('#B87D44', 0.82);
    const bSteelMat = getMat('#4E5A66', 0.45, 0.45);
    const bAccentGold = getMat('#F2C249', 0.34, 0.35);

    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.95, 0.24, 8), bStoneMat);
    foundation.position.y = 0.08;
    const woodDeck = new THREE.Mesh(new THREE.CylinderGeometry(4.38, 4.5, 0.16, 8), bDeckMat);
    woodDeck.position.y = 0.24;
    balloonStation.add(foundation, woodDeck);

    // 2 Wide South Entry Steps
    const stepLower = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.12, 0.65, 2, 0.03), bStoneMat);
    stepLower.position.set(0, 0.05, 4.65);
    const stepUpper = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.12, 0.52, 2, 0.03), bDeckMat);
    stepUpper.position.set(0, 0.15, 4.25);
    balloonStation.add(stepLower, stepUpper);

    // Perimeter Timber Posts + Rope Railing (leaving South entrance open)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.sin(a) * 4.18;
      const pz = Math.cos(a) * 4.18;
      if (pz > 2.6 && Math.abs(px) < 1.8) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 1.05, 8), bTimberMat);
      post.position.set(px, 0.82, pz);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), bAccentGold);
      cap.position.set(px, 1.38, pz);
      balloonStation.add(post, cap);

      const nextIdx = (i + 1) % 8;
      const na = (nextIdx / 8) * Math.PI * 2;
      const nx = Math.sin(na) * 4.18;
      const nz = Math.cos(na) * 4.18;
      if ((pz > 2.6 && Math.abs(px) < 1.8) || (nz > 2.6 && Math.abs(nx) < 1.8)) continue;
      const midX = (px + nx) * 0.5;
      const midZ = (pz + nz) * 0.5;
      const segLen = Math.hypot(nx - px, nz - pz);
      const ropeRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, segLen, 6), bRopeMat);
      ropeRail.rotation.z = Math.PI / 2;
      ropeRail.rotation.y = Math.atan2(-(nz - pz), nx - px);
      ropeRail.position.set(midX, 1.05, midZ);
      balloonStation.add(ropeRail);
    }

    // Small Pastel Ticket Booth (-2.45, -1.65)
    const boothGroup = new THREE.Group();
    boothGroup.position.set(-2.45, 0.32, -1.65);
    boothGroup.rotation.y = 0.42;
    const boothBody = new THREE.Mesh(new RoundedBoxGeometry(1.72, 1.9, 1.38, 2, 0.08), bBoothCreamMat);
    boothBody.position.y = 0.95;
    const boothCounter = new THREE.Mesh(new RoundedBoxGeometry(1.86, 0.12, 0.45, 2, 0.03), bTimberMat);
    boothCounter.position.set(0, 0.98, 0.72);
    const boothWin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.1), getMat('#89CFF0', 0.4));
    boothWin.position.set(0, 1.38, 0.66);
    const boothRoof = createExtrudedRoof(2.08, 0.78, 1.75, bBoothAwningMat);
    boothRoof.position.set(0, 2.24, 0.06);
    boothGroup.add(boothBody, boothCounter, boothWin, boothRoof);
    balloonStation.add(boothGroup);
    colliders.push({
      type: 'circle',
      id: 'balloon_ticket_booth',
      x: HILL_CENTER.x - 2.45,
      z: stationZ - 1.65,
      r: 1.05,
    });

    // Large Static Clay Hot Air Balloon Moored on Timber Launch Cradle (0.95, -1.1)
    const bx = 0.95;
    const bz = -1.1;
    const basketGroup = new THREE.Group();
    basketGroup.position.set(bx, 0.32, bz);

    const cradlePad = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.52, 0.14, 16), bStoneMat);
    cradlePad.position.y = 0.07;
    const basketBody = new THREE.Mesh(new RoundedBoxGeometry(1.52, 1.08, 1.52, 2, 0.1), bWickerMat);
    basketBody.position.y = 0.68;
    const basketRim = new THREE.Mesh(new RoundedBoxGeometry(1.64, 0.16, 1.64, 2, 0.05), bTimberMat);
    basketRim.position.y = 1.24;
    basketGroup.add(cradlePad, basketBody, basketRim);

    [
      [-0.64, -0.64],
      [0.64, -0.64],
      [-0.64, 0.64],
      [0.64, 0.64],
    ].forEach(([sx, sz]) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 1.45, 7), bSteelMat);
      strut.position.set(sx, 1.94, sz);
      const mooring = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.28, 5), bRopeMat);
      mooring.position.set(sx * 1.42, 0.62, sz * 1.42);
      mooring.rotation.z = sx > 0 ? 0.32 : -0.32;
      basketGroup.add(strut, mooring);
    });

    const burnerFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.22, 10), bSteelMat);
    burnerFrame.position.y = 2.68;
    basketGroup.add(burnerFrame);

    // Sculpted Large Static Pastel Envelope (y = 2.6..9.6m relative to deck, maxR = 3.05m)
    const envPoints = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.82, 0.16),
      new THREE.Vector2(1.75, 1.05),
      new THREE.Vector2(2.68, 2.35),
      new THREE.Vector2(3.05, 3.72),
      new THREE.Vector2(2.94, 4.92),
      new THREE.Vector2(2.15, 5.95),
      new THREE.Vector2(1.05, 6.58),
      new THREE.Vector2(0.01, 6.82),
    ];
    const envColors = ['#FF758F', '#FFF6E3', '#66C7E8', '#FFD166', '#9BE080', '#FFF6E3', '#F79D65', '#7B9CE8'];
    const GORE_COUNT = 8;
    const goreAngle = (Math.PI * 2) / GORE_COUNT;
    for (let g = 0; g < GORE_COUNT; g++) {
      const goreGeo = new THREE.LatheGeometry(envPoints, 3, g * goreAngle, goreAngle + 0.02);
      const goreMesh = new THREE.Mesh(goreGeo, getMat(envColors[g % envColors.length], 0.58));
      goreMesh.position.y = 2.68;
      basketGroup.add(goreMesh);
    }

    const eqBand = new THREE.Mesh(new THREE.TorusGeometry(3.04, 0.11, 8, 28), bAccentGold);
    eqBand.rotation.x = Math.PI / 2;
    eqBand.position.y = 6.4;
    const crownCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), bBoothAwningMat);
    crownCap.scale.set(1.2, 0.65, 1.2);
    crownCap.position.y = 9.52;
    basketGroup.add(eqBand, crownCap);

    // Station Pennant Banner Mast on East Side (3.3, 0.32, 0.6)
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.25, 8), bSteelMat);
    flagPole.position.set(3.25, 1.92, 0.85);
    const flagFinial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bAccentGold);
    flagFinial.position.set(3.25, 3.58, 0.85);
    const flagCloth = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.45, 0.04, 1, 0.01), bBoothAwningMat);
    flagCloth.position.set(2.75, 3.25, 0.85);
    balloonStation.add(basketGroup, flagPole, flagFinial, flagCloth);

    colliders.push({
      type: 'circle',
      id: 'balloon_station_basket',
      x: HILL_CENTER.x + bx,
      z: stationZ + bz,
      r: 1.45,
    });
    labelAnchors.push({
      id: 'balloon_station',
      label: 'Trạm Khinh Khí Cầu',
      worldPos: new THREE.Vector3(HILL_CENTER.x + 0.35, HILL_PEAK_Y + 5.6, stationZ - 0.6),
    });

    mergeStaticGroupByMaterial(balloonStation);
    group.add(balloonStation);
  }

  // Static sculpted sky clouds spread high above the gentle mountain & broad town
  const cloudMat = getMat('#FFFFFF', 0.85);
  [
    [-58, 25.5, -76, 2.3],
    [56, 26.2, -74, 2.1],
    [-62, 22.5, 52, 2.0],
    [58, 23.2, 54, 2.1],
    [0, 27.5, -92, 2.5],
    [-66, 23.0, -6, 2.0],
    [66, 23.5, -8, 2.0],
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
    cloud.traverse((c) => {
      c.userData.noShadowBlock = true;
    });
    group.add(cloud);
  });

  // Glowing Moon & Crisp Starfield for Moonlit Nights
  const moonGroup = new THREE.Group();
  moonGroup.position.set(34, 48, -96);
  moonGroup.visible = false;
  const moonCore = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 16, 12),
    new THREE.MeshBasicMaterial({color: '#F2F7FF', fog: false}),
  );
  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: warmGlowTex,
      color: '#BFD8FF',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  moonHalo.scale.set(16, 16, 1);
  moonHalo.renderOrder = 10;
  moonGroup.add(moonCore, moonHalo);
  group.add(moonGroup);

  const STAR_COUNT = 150;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const a = i * 2.39996;
    const rad = 28 + ((i * 3.17) % 88);
    starPositions[i * 3] = Math.cos(a) * rad;
    starPositions[i * 3 + 1] = 32 + ((i * 1.73) % 28);
    starPositions[i * 3 + 2] = -14 + Math.sin(a) * rad;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: '#DCEBFF',
      size: 0.52,
      transparent: true,
      opacity: 0.85,
      fog: false,
    }),
  );
  starPoints.visible = false;
  group.add(starPoints);

  // Central Calm Pale Natural Stone Plaza
  const plazaMat = new THREE.MeshStandardMaterial({
    map: plazaStoneTex,
    color: '#F4F0E7',
    roughness: 0.84,
    metalness: 0.01,
  });
  const plazaRim = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWN_PLAZA_RADIUS + 0.42, TOWN_PLAZA_RADIUS + 0.72, 0.14, 44),
    getMat('#D8CFBF', 0.8),
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

  // 4 Sculpted Bronze Fountain Spouts + 2 Cute Perched Rim Songbirds
  const bronzeMat = getMat('#B88B4A', 0.38, 0.45);
  const birdBodyMat = getMat('#8A9BA8', 0.62);
  const birdChestMat = getMat('#F5E6D3', 0.68);
  for (let sp = 0; sp < 4; sp++) {
    const a = (sp / 4) * Math.PI * 2 + Math.PI / 4;
    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 7), bronzeMat);
    spout.position.set(Math.cos(a) * 1.84, 0.66, Math.sin(a) * 1.84);
    spout.rotation.z = -Math.PI * 0.25 * Math.cos(a);
    spout.rotation.x = Math.PI * 0.25 * Math.sin(a);
    fountain.add(spout);
  }
  [0.18, -2.55].forEach((ba) => {
    const bird = new THREE.Group();
    bird.position.set(Math.cos(ba) * 1.86, 0.69, Math.sin(ba) * 1.86);
    bird.rotation.y = -ba + Math.PI * 0.5;
    const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 7), birdBodyMat);
    bBody.scale.set(0.85, 0.9, 1.3);
    const bChest = new THREE.Mesh(new THREE.SphereGeometry(0.062, 7, 6), birdChestMat);
    bChest.position.set(0, -0.015, 0.045);
    const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.056, 8, 7), birdBodyMat);
    bHead.position.set(0, 0.078, 0.068);
    const bBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 5), getMat('#F2B138', 0.4));
    bBeak.rotation.x = Math.PI / 2;
    bBeak.position.set(0, 0.072, 0.13);
    bird.add(bBody, bChest, bHead, bBeak);
    fountain.add(bird);
  });

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
    mergeStaticGroupByMaterial(bench);
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
    mergeStaticGroupByMaterial(lamp);
    group.add(lamp);
    colliders.push({type: 'circle', x: lx, z: lz, r: 0.3});
  });

  // ========== 2B. SOCIAL PLAZA LANDMARKS (Flush Mosaic Inlays, Floral Arches, Town Bulletin & Bistro Quadrants) ==========
  {
    const plazaDecor = new THREE.Group();
    const mosaicTerracottaMat = getMat('#D9876C', 0.78);
    const mosaicTealMat = getMat('#6EAAB0', 0.78);
    const mosaicCreamMat = getMat('#EFE5D2', 0.8);
    const archIronMat = getMat('#333E4A', 0.45, 0.55);
    const archGoldMat = getMat('#E8BC5E', 0.32, 0.5);
    const urnStoneMat = getMat('#E6DDD0', 0.74);
    const foliageLushMat = getMat('#4EA85B', 0.74);
    const noticeWoodMat = getMat('#9C653A', 0.74);
    const cafeClothCoralMat = getMat('#E87D72', 0.62);
    const cafeClothCreamMat = getMat('#FFFBF0', 0.65);

    // 1. Flush Decorative Compass Ring & Border Mosaic Inlays (y = 0.146, zero walk impediment / zero Z-fighting)
    const compassRingInner = new THREE.Mesh(
      new THREE.RingGeometry(2.38, 2.54, 40),
      mosaicTerracottaMat,
    );
    compassRingInner.rotation.x = -Math.PI / 2;
    compassRingInner.position.y = 0.146;
    const compassRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(6.55, 6.82, 48),
      mosaicTealMat,
    );
    compassRingOuter.rotation.x = -Math.PI / 2;
    compassRingOuter.position.y = 0.146;
    plazaDecor.add(compassRingInner, compassRingOuter);

    for (let d = 0; d < 8; d++) {
      const a = (d / 8) * Math.PI * 2;
      const diamond = new THREE.Mesh(
        new THREE.CircleGeometry(0.28, 4),
        d % 2 === 0 ? mosaicTerracottaMat : mosaicTealMat,
      );
      diamond.rotation.x = -Math.PI / 2;
      diamond.rotation.z = -a;
      diamond.position.set(Math.cos(a) * 2.86, 0.147, Math.sin(a) * 2.86);

      const outerTile = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 6),
        d % 2 === 0 ? mosaicCreamMat : mosaicTerracottaMat,
      );
      outerTile.rotation.x = -Math.PI / 2;
      outerTile.position.set(Math.cos(a) * 6.32, 0.147, Math.sin(a) * 6.32);
      plazaDecor.add(diamond, outerTile);
    }

    // 2. Single South Floral Entrance Archway with Climbing Vines, Flowers & Centered Hanging String Bulb (North hill-side arch removed!)
    {
      const az = 7.02;
      const archGrp = new THREE.Group();
      archGrp.position.set(0, 0.1, az);
      const archBloomCols = ['#FF85A1', '#FFD166', '#9BE080', '#FF9F68', '#C69EFF'];
      const vineGreenMat = getMat('#3D8B4C', 0.78);

      [-2.45, 2.45].forEach((px, pIdx) => {
        const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.62, 0.56, 2, 0.05), urnStoneMat);
        plinth.position.set(px, 0.31, 0);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 2.9, 10), archIronMat);
        col.position.set(px, 2.02, 0);
        const urnBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.15, 0.3, 10), urnStoneMat);
        urnBowl.position.set(px, 0.76, 0);
        const urnBush = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), foliageLushMat);
        urnBush.position.set(px, 1.05, 0);
        archGrp.add(plinth, col, urnBowl, urnBush);

        // Helical climbing vine + lush foliage tufts & flowers wrapping each pillar
        const vinePts: THREE.Vector3[] = [];
        for (let s = 0; s <= 12; s++) {
          const u = s / 12;
          const vy = 0.85 + u * 2.52;
          const ang = u * Math.PI * 3.4 + pIdx * Math.PI;
          vinePts.push(new THREE.Vector3(px + Math.cos(ang) * 0.125, vy, Math.sin(ang) * 0.125));
        }
        const vineCurve = new THREE.CatmullRomCurve3(vinePts);
        archGrp.add(new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 20, 0.034, 5, false), vineGreenMat));

        for (let f = 0; f < 6; f++) {
          const fu = 0.15 + (f / 5) * 0.82;
          const pt = vineCurve.getPoint(fu);
          const leafClump = new THREE.Mesh(new THREE.SphereGeometry(0.145, 7, 6), foliageLushMat);
          leafClump.position.set(pt.x * 1.02 - px * 0.02, pt.y, pt.z * 1.25);
          const pillarBloom = new THREE.Mesh(
            new THREE.SphereGeometry(0.088, 6, 6),
            getMat(archBloomCols[(f + pIdx * 2) % archBloomCols.length], 0.56),
          );
          pillarBloom.position.set(
            pt.x + (pt.x >= px ? 0.08 : -0.08),
            pt.y + 0.03,
            pt.z + (pt.z >= 0 ? 0.09 : -0.09),
          );
          archGrp.add(leafClump, pillarBloom);
        }

        colliders.push({type: 'circle', id: `plaza_arch_south_${px}`, x: px, z: az, r: 0.34});
      });

      const archSpan = new THREE.Mesh(
        new THREE.TorusGeometry(2.45, 0.085, 8, 28, Math.PI),
        archIronMat,
      );
      archSpan.position.set(0, 3.35, 0);
      const innerScroll = new THREE.Mesh(
        new THREE.TorusGeometry(2.26, 0.045, 6, 24, Math.PI),
        archGoldMat,
      );
      innerScroll.position.set(0, 3.35, 0);
      archGrp.add(archSpan, innerScroll);

      // Rich blossom & trailing vine garland along upper arch crest
      for (let b = 0; b <= 10; b++) {
        const phi = 0.14 + (b / 10) * (Math.PI - 0.28);
        const bx = Math.cos(phi) * 2.44;
        const by = 3.35 + Math.sin(phi) * 2.44;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 6), foliageLushMat);
        leaf.position.set(bx, by, 0);
        const sideLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), vineGreenMat);
        sideLeaf.position.set(bx * 0.98, by - 0.08, b % 2 === 0 ? 0.12 : -0.12);
        const blossom = new THREE.Mesh(
          new THREE.SphereGeometry(0.098, 6, 6),
          getMat(archBloomCols[b % archBloomCols.length], 0.56),
        );
        blossom.position.set(bx, by + 0.05, 0.14);
        const blossomBack = blossom.clone();
        blossomBack.position.z = -0.14;
        archGrp.add(leaf, sideLeaf, blossom, blossomBack);
      }

      // Centered Hanging Pendant String Cord + Small Warm Glowing Bulb Under Arch Crest
      const archWire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6),
        archIronMat,
      );
      archWire.position.set(0, 5.46, 0);
      const archSocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.09, 8),
        archGoldMat,
      );
      archSocket.position.set(0, 5.24, 0);
      const archLampMat = new THREE.MeshStandardMaterial({
        color: '#FFF5CC',
        emissive: '#FFC95C',
        emissiveIntensity: 0.28,
        roughness: 0.2,
      });
      lampBulbs.push(archLampMat);
      const archLampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), archLampMat);
      archLampBulb.position.set(0, 5.12, 0);
      archGrp.add(archWire, archSocket, archLampBulb);

      const crestFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), archGoldMat);
      crestFinial.position.set(0, 5.98, 0);
      archGrp.add(crestFinial);
      plazaDecor.add(archGrp);
    }

    // 3. Symmetrical NW & NE Plaza Café Tables + Identical Striped Umbrellas + Interactive Stools (x = ±3.35, z = -3.35)
    [
      {
        id: 'nw_cafe',
        cx: -3.35,
        cz: -3.35,
        stoolOff: {ox: 0.72, oz: 0.35},
      },
      {
        id: 'ne_cafe',
        cx: 3.35,
        cz: -3.35,
        stoolOff: {ox: -0.72, oz: 0.35},
      },
    ].forEach(({id, cx, cz, stoolOff}) => {
      const tbl = new THREE.Group();
      tbl.position.set(cx, 0.14, cz);
      const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 12), archIronMat);
      tBase.position.y = 0.03;
      const tStem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.68, 8), archIronMat);
      tStem.position.y = 0.38;
      const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.5, 0.06, 16), mosaicCreamMat);
      tTop.position.y = 0.72;
      const tRim = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.024, 6, 18), archGoldMat);
      tRim.rotation.x = Math.PI / 2;
      tRim.position.y = 0.72;
      tbl.add(tBase, tStem, tTop, tRim);

      const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 2.25, 8), noticeWoodMat);
      uPole.position.y = 1.84;
      const uDome = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.38, 8), cafeClothCoralMat);
      uDome.position.y = 2.88;
      const uStripe = new THREE.Mesh(
        new THREE.ConeGeometry(1.19, 0.382, 2, 1, false, 0, Math.PI / 4),
        cafeClothCreamMat,
      );
      uStripe.position.y = 2.885;
      const uStripe2 = uStripe.clone();
      uStripe2.rotation.y = Math.PI;
      tbl.add(uPole, uDome, uStripe, uStripe2);

      // Symmetrical coffee mugs on table
      [-0.18, 0.2].forEach((mx, mi) => {
        const mug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.048, 0.04, 0.1, 8),
          getMat(mi === 0 ? '#6FBAD6' : '#F28B82', 0.4),
        );
        mug.position.set(mx, 0.8, mi === 0 ? 0.14 : -0.14);
        tbl.add(mug);
      });
      plazaDecor.add(tbl);
      colliders.push({type: 'circle', id: `plaza_${id}_tbl`, x: cx, z: cz, r: 0.56});

      const sx = cx + stoolOff.ox;
      const sz = cz + stoolOff.oz;
      const sRotY = Math.atan2(cx - sx, cz - sz);
      const stool = new THREE.Group();
      stool.position.set(sx, 0.14, sz);
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.36, 8), archIronMat);
      sLeg.position.y = 0.18;
      const sBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 10), archIronMat);
      sBase.position.y = 0.02;
      const sCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.09, 12), noticeWoodMat);
      sCushion.position.y = 0.38;
      stool.add(sLeg, sBase, sCushion);
      addInteractionProxy(
        stool,
        [0.62, 0.65, 0.62],
        0.32,
        {
          kind: 'bench',
          tx: sx + Math.sin(sRotY) * -0.52,
          tz: sz + Math.cos(sRotY) * -0.52,
          seatX: sx,
          seatZ: sz,
          seatY: 0.56,
          sitRotY: sRotY,
        },
        clickTargets,
      );
      plazaDecor.add(stool);
      colliders.push({type: 'circle', id: `plaza_${id}_stool`, x: sx, z: sz, r: 0.28});
    });

    // 4. Four Symmetrical Festive Balloon Flower Pedestals ("Bồn Cây Bong Bóng") Framing the South & Side Plaza
    const urnSpots: [number, number][] = [
      [-3.35, 3.35],
      [3.35, 3.35],
      [-5.25, -1.85],
      [5.25, -1.85],
    ];
    const balloonPalettes = [
      ['#FF7597', '#67C6E3', '#FFD166'],
      ['#67C6E3', '#FFD166', '#B388F5'],
      ['#FF9F68', '#9BE080', '#FF7597'],
      ['#B388F5', '#FF7597', '#67C6E3'],
    ];
    urnSpots.forEach(([gx, gz], idx) => {
      const ped = new THREE.Group();
      ped.position.set(gx, 0.14, gz);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.48, 12), urnStoneMat);
      base.position.y = 0.24;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 6, 14), archGoldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.48;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), foliageLushMat);
      mound.position.y = 0.62;

      // Blossoms tucked on the lush shrub mound
      const moundBlossomCols = ['#FF85A1', '#FFD166', '#8EE0FF', '#FFFFFF'];
      [
        [0.24, 0.72, 0.18],
        [-0.24, 0.68, 0.2],
        [0.18, 0.74, -0.22],
        [-0.2, 0.71, -0.18],
      ].forEach(([fx, fy, fz], fi) => {
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.068, 6, 5),
          getMat(moundBlossomCols[(fi + idx) % moundBlossomCols.length], 0.52),
        );
        fl.position.set(fx, fy, fz);
        ped.add(fl);
      });

      // Trio of floating sculpted colorful festival balloons anchored to pedestal
      const bCols = balloonPalettes[idx % balloonPalettes.length];
      [
        [-0.18, 1.55, 0.06],
        [0.16, 1.72, -0.08],
        [0.02, 1.92, 0.12],
      ].forEach(([blx, bly, blz], bi) => {
        const stringH = bly - 0.62;
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, stringH, 4), mosaicCreamMat);
        wire.position.set(blx * 0.5, 0.62 + stringH * 0.5, blz * 0.5);
        const bal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), getMat(bCols[bi], 0.35));
        bal.scale.set(0.95, 1.15, 0.95);
        bal.position.set(blx, bly, blz);
        ped.add(wire, bal);
      });
      ped.add(base, rim, mound);
      plazaDecor.add(ped);
      colliders.push({type: 'circle', id: `plaza_balloon_urn_${idx}`, x: gx, z: gz, r: 0.58});
    });

    mergeStaticGroupByMaterial(plazaDecor);
    group.add(plazaDecor);
  }

  // Pooled warm ground light pools at Plaza & main porches (1 instanced draw call at night — zero PointLight shader lag)
  const districtNightPoolGeo = new THREE.PlaneGeometry(4.8, 4.8);
  districtNightPoolGeo.rotateX(-Math.PI / 2);
  const districtNightPoolMat = new THREE.MeshBasicMaterial({
    map: warmGlowTex,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const districtPoolSpecs: [number, number, number, number][] = [
    [0, 0.16, 0, 2.3],
    [-32, 0.05, -18.2, 1.9],
    [-19.6, 0.05, 38.0, 1.7],
    [11.8, 0.05, 42.0, 1.8],
    [-32, 0.05, 22.0, 1.8],
    [32, 0.05, 22.0, 1.8],
    [-5.1, 0.16, -4.8, 1.05],
    [5.1, 0.16, -4.8, 1.05],
    [-5.1, 0.16, 4.8, 1.05],
    [5.1, 0.16, 4.8, 1.05],
    [-21.18, TOWN_LAKE_WATER_Y + 0.02, 44.3, 1.45],
    [22.5, 0.05, -39.5, 2.35],
    [-73.0, 0.05, -3.55, 1.35],
    [-72.6, 0.05, 5.2, 1.35],
    [SHIP_STALL_POS.x, 0.05, SHIP_STALL_POS.z + 2.8, 2.1],
    [-118.0, 11.24, -4.0, 1.4],
  ];
  const districtNightPoolIM = new THREE.InstancedMesh(
    districtNightPoolGeo,
    districtNightPoolMat,
    districtPoolSpecs.length,
  );
  districtNightPoolIM.userData = {noShadowBlock: true};
  districtNightPoolIM.renderOrder = 2;
  districtNightPoolIM.visible = false;
  districtPoolSpecs.forEach(([px, py, pz, ps], i) => {
    _instDummy.position.set(px, py, pz);
    _instDummy.rotation.set(0, 0, 0);
    _instDummy.scale.setScalar(ps);
    _instDummy.updateMatrix();
    districtNightPoolIM.setMatrixAt(i, _instDummy.matrix);
  });
  districtNightPoolIM.instanceMatrix.needsUpdate = true;
  districtNightPoolIM.computeBoundingSphere();
  group.add(districtNightPoolIM);

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

  // ========== DISTRICT 1: NHÀ CỦA TÔI (Cozy Dormer Cottage + Partial Fence) ==========
  {
    const home = new THREE.Group();
    home.position.set(-32, 0, -22.5);
    home.rotation.y = 0;
    home.scale.setScalar(1.98);

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

    // Front Porch Canopy + Wooden Deck + Steps
    const porchDeck = new THREE.Mesh(
      new RoundedBoxGeometry(2.05, 0.22, 1.08, 2, 0.04),
      getMat('#C7976A', 0.74),
    );
    porchDeck.position.set(0, 0.25, 2.24);
    const porchStep = new THREE.Mesh(
      new RoundedBoxGeometry(1.82, 0.16, 0.5, 2, 0.04),
      stoneMat,
    );
    porchStep.position.set(0, 0.13, 2.72);
    const porchLowerStep = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, 0.12, 0.46, 2, 0.04),
      stoneMat,
    );
    porchLowerStep.position.set(0, 0.05, 3.04);
    const porchRoof = createExtrudedRoof(2.25, 0.62, 1.25, roofTrimMat);
    porchRoof.position.set(0, 2.52, 2.22);
    [-0.86, 0.86].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1.98, 8), timberMat);
      post.position.set(px, 1.32, 2.58);
      home.add(post);
    });

    // Porch warm twin lanterns + front topiary planters
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.4,
      roughness: 0.25,
    });
    lampBulbs.push(lanternMat);
    const porchLantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), lanternMat);
    porchLantern.position.set(0.66, 2.02, 2.24);
    const porchLanternL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), lanternMat);
    porchLanternL.position.set(-0.66, 2.02, 2.24);
    home.add(porchLowerStep, porchLanternL);

    [-1.18, 1.18].forEach((sx) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.24, 9), roofMat);
      pot.position.set(sx, 0.12, 2.92);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), shutterMat);
      bush.position.set(sx, 0.34, 2.92);
      home.add(pot, bush);
    });

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
      [6.2, 5.8, 5.6],
      2.7,
      {
        kind: 'zone',
        zone: 'home' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.home.tx,
        tz: TOWN_ZONE_ENTRANCES.home.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'home', x: -32, z: -22.5, hw: 5.55, hd: 4.55, rotY: 0});
    const mailWorld = new THREE.Vector3(1.55, 0, 3.08).applyMatrix4(home.matrixWorld);
    colliders.push({type: 'circle', id: 'home_mailbox', x: mailWorld.x, z: mailWorld.z, r: 0.58});
    mergeStaticGroupByMaterial(home);
    group.add(home);
  }

  // ========== BIỂN "NHIỆM VỤ NGÀY" TRƯỚC SÂN NHÀ ==========
  {
    const signBoardGroup = new THREE.Group();
    signBoardGroup.position.set(-22.6, 0, -17.8);
    signBoardGroup.rotation.y = 0;
    signBoardGroup.scale.setScalar(1.28);

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

    const dailyQuestGeo = createAtlasPlaneGeometry(1.36, 0.68, 'daily_quests');
    const signFace = new THREE.Mesh(dailyQuestGeo, signAtlasMat);
    signFace.position.set(0, 1.24, 0.076);

    const backFace = new THREE.Mesh(dailyQuestGeo.clone(), signAtlasMat);
    backFace.rotation.y = Math.PI;
    backFace.position.set(0, 1.24, -0.076);

    const roofCap = createExtrudedRoof(1.72, 0.36, 0.36, getMat('#DB6C53', 0.58));
    roofCap.position.set(0, 1.82, 0);

    signBoardGroup.add(frame, signFace, backFace, roofCap);
    addInteractionProxy(
      signBoardGroup,
      [1.7, 2.0, 0.8],
      1.0,
      {kind: 'daily_quests', tx: -22.6, tz: -15.9},
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'daily_quests', x: -22.6, z: -17.8, r: 0.74});
    mergeStaticGroupByMaterial(signBoardGroup);
    group.add(signBoardGroup);
  }

  // ========== DISTRICT 2: KHU VƯỜN NÔNG TRẠI (Beautified Conservatory + Rooster + Windmill) ==========
  let windmillSailHub: THREE.Group | null = null;
  {
    const garden = new THREE.Group();
    garden.position.set(32, 0, -22.5);
    garden.rotation.y = 0;
    garden.scale.setScalar(1.58);

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
    colliders.push({type: 'box', id: 'garden', x: 32, z: -22.5, hw: 4.6, hd: 4.0, rotY: 0});
    mergeStaticGroupByMaterial(garden);
    group.add(garden);

    // === CỐI XAY GIÓ BÊN CẠNH NHÀ KÍNH ===
    const windmill = new THREE.Group();
    windmill.position.set(42.8, 0, -23.2);
    windmill.rotation.y = 0;
    windmill.scale.setScalar(1.58);

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

    // Projecting Wooden Nacelle Housing so spinning sails stay completely clear of roof & tower
    const wmNacelle = new THREE.Mesh(
      new RoundedBoxGeometry(0.58, 0.52, 0.88, 2, 0.08),
      getMat('#8A5A36', 0.74),
    );
    wmNacelle.position.set(0, 3.76, 1.28);
    const wmNacelleCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.66, 0.14, 0.96, 2, 0.04),
      getMat('#C8664D', 0.62),
    );
    wmNacelleCap.position.set(0, 4.04, 1.28);

    // Rotating 4-blade Wooden & Cream Canvas Sail Hub positioned cleanly in front of nacelle
    const sailHub = new THREE.Group();
    sailHub.position.set(0, 3.76, 1.82);
    const hubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.25, 0.36, 12),
      getMat('#6E4427', 0.7),
    );
    hubCap.rotation.x = Math.PI / 2;
    hubCap.position.z = -0.02;
    sailHub.add(hubCap);

    const sparMat = getMat('#8A5A36', 0.74);
    const sailMat = getMat('#FFFDF5', 0.62);
    for (let b = 0; b < 4; b++) {
      const arm = new THREE.Group();
      arm.rotation.z = (b * Math.PI) / 2 + 0.35;
      const spar = new THREE.Mesh(new RoundedBoxGeometry(0.11, 2.24, 0.08, 2, 0.02), sparMat);
      spar.position.set(0, 1.14, 0.06);
      const canvasBlade = new THREE.Mesh(
        new RoundedBoxGeometry(0.52, 1.66, 0.03, 2, 0.02),
        sailMat,
      );
      canvasBlade.position.set(0.28, 1.36, 0.08);
      canvasBlade.rotation.y = 0.14;
      const crossRung = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.05), sparMat);
      crossRung.position.set(0.28, 0.84, 0.09);
      const crossRung2 = crossRung.clone();
      crossRung2.position.y = 1.72;
      arm.add(spar, canvasBlade, crossRung, crossRung2);
      sailHub.add(arm);
    }
    windmillSailHub = sailHub;

    windmill.add(
      wmPlinth,
      wmTower,
      wmBand1,
      wmBand2,
      wmDoor,
      wmWin,
      wmRoof,
      wmFinial,
      wmNacelle,
      wmNacelleCap,
      sailHub,
    );
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
    colliders.push({type: 'circle', id: 'garden_windmill', x: 42.8, z: -23.2, r: 2.5});
    mergeStaticGroupByMaterial(windmill, new Set([sailHub]));
    group.add(windmill);
  }

  // ========== DISTRICT 3: TIỆM THỜI TRANG (Multi-Story Parisian Atelier Boutique) ==========
  {
    const shop = new THREE.Group();
    shop.position.set(-32, 0, 18.0);
    shop.rotation.y = 0;
    shop.scale.setScalar(1.68);

    const stoneStepMat = getMat('#EDE0D8', 0.78);
    const bodyMat = getMat('#FFEAF0', 0.65);
    const upperBodyMat = getMat('#FFF3F6', 0.62);
    const pilasterMat = getMat('#FFF9FA', 0.58);
    const mansardMat = getMat('#C85872', 0.54);
    const roofTrimMat = getMat('#9F3D54', 0.56);
    const ironRailMat = getMat('#4E4047', 0.45, 0.35);
    const goldMat = glossyClayMat('#FFD166', 0.22);

    // 1. Two-Tier Stone Porch Plinth
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(4.95, 0.34, 3.92, 2, 0.08),
      stoneStepMat,
    );
    plinth.position.y = 0.17;
    const stepFront = new THREE.Mesh(
      new RoundedBoxGeometry(2.15, 0.16, 0.46, 2, 0.04),
      stoneStepMat,
    );
    stepFront.position.set(1.08, 0.08, 2.08);

    // 2. Ground Storefront Story (y = 0.34..2.98)
    const body = new THREE.Mesh(new RoundedBoxGeometry(4.44, 2.66, 3.38, 3, 0.1), bodyMat);
    body.position.y = 1.67;

    // Ground Corner Decorative Pilasters + Waist Belt Cornice
    [
      [-2.16, 1.64],
      [2.16, 1.64],
      [-2.16, -1.64],
      [2.16, -1.64],
    ].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(new RoundedBoxGeometry(0.24, 2.7, 0.24, 2, 0.04), pilasterMat);
      pil.position.set(px, 1.67, pz);
      shop.add(pil);
    });
    const cornice = new THREE.Mesh(
      new RoundedBoxGeometry(4.78, 0.22, 3.68, 2, 0.04),
      pilasterMat,
    );
    cornice.position.y = 3.02;

    // 7-Stripe Scalloped Storefront Awning
    for (let i = 0; i < 7; i++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.58, 0.22, 1.12, 2, 0.05),
        getMat(i % 2 === 0 ? '#E86B82' : '#FFFDF9', 0.55),
      );
      stripe.position.set(-1.74 + i * 0.58, 2.38, 2.04);
      stripe.rotation.x = 0.38;
      shop.add(stripe);
    }

    // Large Framed Boutique Display Window + 2 Dress Forms inside
    const showWinFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.96, 1.52, 0.22, 2, 0.05),
      pilasterMat,
    );
    showWinFrame.position.set(-0.82, 1.32, 1.7);
    const showWin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.26, 0.24), makeWinMat());
    showWin.position.set(-0.82, 1.32, 1.72);
    const dress1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.82, 10), getMat('#F9A8BE', 0.5));
    dress1.position.set(-1.14, 1.12, 1.5);
    const dress2 = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.76, 10), getMat('#A7D8F0', 0.5));
    dress2.position.set(-0.5, 1.1, 1.5);

    // Tall Arched Double Boutique Doors + Gold Handles
    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.3, 1.84, 0.2, 2, 0.05),
      pilasterMat,
    );
    doorFrame.position.set(1.08, 1.2, 1.7);
    const door = new THREE.Mesh(
      new RoundedBoxGeometry(1.1, 1.68, 0.22, 2, 0.05),
      getMat('#9E4B5D', 0.58),
    );
    door.position.set(1.08, 1.15, 1.72);
    const doorArchShape = new THREE.Shape();
    doorArchShape.absarc(0, 0, 0.65, 0, Math.PI, false);
    doorArchShape.lineTo(-0.65, 0);
    const doorArchGeo = new THREE.ExtrudeGeometry(doorArchShape, {
      depth: 0.2,
      bevelEnabled: false,
      curveSegments: 16,
    });
    doorArchGeo.translate(0, 0, -0.1);
    const doorArch = new THREE.Mesh(doorArchGeo, pilasterMat);
    doorArch.position.set(1.08, 2.08, 1.7);
    [0.98, 1.18].forEach((hx) => {
      const handle = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.24, 0.06, 2, 0.02), goldMat);
      handle.position.set(hx, 1.12, 1.85);
      shop.add(handle);
    });

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

    // 3. Second-Story Atelier Tier (Stepped-back Parisian upper floor y = 3.12..5.04)
    const upperBody = new THREE.Mesh(
      new RoundedBoxGeometry(4.06, 1.92, 3.06, 3, 0.09),
      upperBodyMat,
    );
    upperBody.position.y = 4.08;
    [
      [-1.98, 1.48],
      [1.98, 1.48],
      [-1.98, -1.48],
      [1.98, -1.48],
    ].forEach(([px, pz]) => {
      const uPil = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.94, 0.2, 2, 0.03), pilasterMat);
      uPil.position.set(px, 4.08, pz);
      shop.add(uPil);
    });

    // Upper Story Arched French Windows + Shutters + Side Window Flower Boxes
    [-1.24, 0, 1.24].forEach((wx, idx) => {
      const uw = buildFramedWindow(
        idx === 1 ? 0.96 : 0.76,
        idx === 1 ? 1.26 : 1.08,
        pilasterMat,
        makeWinMat(),
        idx === 1 ? undefined : mansardMat,
      );
      uw.position.set(wx, idx === 1 ? 4.04 : 4.08, 1.54);
      shop.add(uw);

      if (idx !== 1) {
        const winPlanter = new THREE.Mesh(
          new RoundedBoxGeometry(0.86, 0.16, 0.24, 2, 0.03),
          stoneStepMat,
        );
        winPlanter.position.set(wx, 3.44, 1.66);
        shop.add(winPlanter);
        [-0.24, 0, 0.24].forEach((fx, fi) => {
          const leafBed = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 7, 6),
            topiaryMat,
          );
          leafBed.position.set(wx + fx, 3.55, 1.68);
          const wBloom = new THREE.Mesh(
            new THREE.SphereGeometry(0.085, 7, 6),
            getMat(fi === 1 ? '#FFE066' : '#FF7B9C', 0.6),
          );
          wBloom.position.set(wx + fx, 3.63, 1.7);
          shop.add(leafBed, wBloom);
        });
      }
    });

    // Projecting Center Juliette Balcony with Outer Mounted Flower Trough (visible OVER the railing!)
    const balcSlab = new THREE.Mesh(
      new RoundedBoxGeometry(1.64, 0.12, 0.52, 2, 0.04),
      pilasterMat,
    );
    balcSlab.position.set(0, 3.24, 1.72);
    const balcTopRail = new THREE.Mesh(
      new RoundedBoxGeometry(1.6, 0.06, 0.06, 2, 0.02),
      ironRailMat,
    );
    balcTopRail.position.set(0, 3.68, 1.94);
    [-0.76, -0.45, -0.15, 0.15, 0.45, 0.76].forEach((bx) => {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 6), ironRailMat);
      bar.position.set(bx, 3.47, 1.94);
      shop.add(bar);
    });
    const balcPlanter = new THREE.Mesh(
      new RoundedBoxGeometry(1.16, 0.18, 0.24, 2, 0.03),
      stoneStepMat,
    );
    balcPlanter.position.set(0, 3.6, 2.06);
    [-0.38, -0.13, 0.13, 0.38].forEach((fx, fi) => {
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), topiaryMat);
      foliage.position.set(fx, 3.72, 2.08);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 7, 7),
        getMat(fi % 2 === 0 ? '#FF7B9C' : '#FFD166', 0.62),
      );
      bloom.position.set(fx, 3.8, 2.1);
      shop.add(foliage, bloom);
    });
    shop.add(balcSlab, balcTopRail, balcPlanter);

    // Side windows on Ground + 2nd Story so all angles look rich
    [-1, 1].forEach((side) => {
      const gw = buildFramedWindow(0.86, 1.0, pilasterMat, makeWinMat(), mansardMat);
      gw.rotation.y = (side * Math.PI) / 2;
      gw.position.set(side * 2.23, 1.65, 0);
      const uwSide = buildFramedWindow(0.74, 0.94, pilasterMat, makeWinMat(), mansardMat);
      uwSide.rotation.y = (side * Math.PI) / 2;
      uwSide.position.set(side * 2.04, 4.08, 0);
      shop.add(gw, uwSide);
    });

    // Upper Crown Cornice (y = 5.08)
    const upperCornice = new THREE.Mesh(
      new RoundedBoxGeometry(4.46, 0.22, 3.42, 3, 0.08),
      pilasterMat,
    );
    upperCornice.position.y = 5.08;

    // 4. Smooth Beveled Château / Castle Boutique Crown + Twin Cylindrical Corner Turrets
    const castleRoofTier1 = new THREE.Mesh(
      new RoundedBoxGeometry(4.28, 0.56, 3.24, 5, 0.24),
      mansardMat,
    );
    castleRoofTier1.position.y = 5.42;

    const castleRoofTier2 = new THREE.Mesh(
      new RoundedBoxGeometry(3.64, 0.56, 2.66, 5, 0.25),
      mansardMat,
    );
    castleRoofTier2.position.y = 5.84;

    const castleRoofCap = new THREE.Mesh(
      new RoundedBoxGeometry(2.76, 0.34, 1.92, 4, 0.15),
      roofTrimMat,
    );
    castleRoofCap.position.y = 6.2;

    const castleCrestTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.34, 0.12, 1.54, 3, 0.05),
      goldMat,
    );
    castleCrestTrim.position.y = 6.38;

    // Twin Smooth Cylindrical Corner Castle Turrets framing the facade
    [-1.84, 1.84].forEach((tx) => {
      const turretDrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.41, 0.44, 0.98, 24),
        pilasterMat,
      );
      turretDrum.position.set(tx, 5.62, 1.32);

      const turretCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.44, 0.05, 10, 24),
        pilasterMat,
      );
      turretCollar.rotation.x = Math.PI / 2;
      turretCollar.position.set(tx, 6.1, 1.32);

      const turretWin = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.34, 0.1, 2, 0.04),
        makeWinMat(),
      );
      turretWin.position.set(tx, 5.62, 1.72);

      const turretSpire = new THREE.Mesh(
        new THREE.ConeGeometry(0.53, 0.96, 24),
        mansardMat,
      );
      turretSpire.position.set(tx, 6.58, 1.32);

      const turretFinial = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), goldMat);
      turretFinial.position.set(tx, 7.1, 1.32);

      shop.add(turretDrum, turretCollar, turretWin, turretSpire, turretFinial);
    });

    // Clean Central Château Arched Dormer + Boutique Crest Medallion
    const castleGable = new THREE.Mesh(
      new RoundedBoxGeometry(1.18, 0.88, 0.62, 4, 0.14),
      pilasterMat,
    );
    castleGable.position.set(0, 5.56, 1.44);
    const gableArchShape = new THREE.Shape();
    gableArchShape.absarc(0, 0, 0.56, 0, Math.PI, false);
    gableArchShape.lineTo(-0.56, 0);
    const gableArchGeo = new THREE.ExtrudeGeometry(gableArchShape, {
      depth: 0.64,
      bevelEnabled: false,
      curveSegments: 18,
    });
    gableArchGeo.translate(0, 0, -0.32);
    const castleGableArch = new THREE.Mesh(gableArchGeo, roofTrimMat);
    castleGableArch.position.set(0, 5.92, 1.44);
    const castleGableWin = new THREE.Mesh(
      new RoundedBoxGeometry(0.66, 0.58, 0.08, 3, 0.06),
      makeWinMat(),
    );
    castleGableWin.position.set(0, 5.54, 1.74);
    const castleMedallion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.07, 18),
      goldMat,
    );
    castleMedallion.rotation.x = Math.PI / 2;
    castleMedallion.position.set(0, 6.06, 1.78);

    // Central Rounded Château Lantern Dome
    const cupolaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.56, 0.42, 24),
      pilasterMat,
    );
    cupolaBase.position.set(0, 6.56, -0.05);
    const cupolaDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      mansardMat,
    );
    cupolaDome.position.set(0, 6.72, -0.05);
    const cupolaSpire = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 16), goldMat);
    cupolaSpire.position.set(0, 7.34, -0.05);
    const cupolaFinial = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), goldMat);
    cupolaFinial.position.set(0, 7.5, -0.05);

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
      stepFront,
      body,
      cornice,
      upperBody,
      upperCornice,
      castleRoofTier1,
      castleRoofTier2,
      castleRoofCap,
      castleCrestTrim,
      castleGable,
      castleGableArch,
      castleGableWin,
      castleMedallion,
      showWinFrame,
      showWin,
      dress1,
      dress2,
      doorFrame,
      door,
      doorArch,
      cupolaBase,
      cupolaDome,
      cupolaSpire,
      cupolaFinial,
      sFenceL,
      sFenceLSide,
      sFenceRSide,
    );
    addInteractionProxy(
      shop,
      [5.0, 6.8, 4.4],
      3.4,
      {
        kind: 'zone',
        zone: 'boutique' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.boutique.tx,
        tz: TOWN_ZONE_ENTRANCES.boutique.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'boutique', x: -32, z: 18.0, hw: 4.55, hd: 3.85, rotY: 0});
    mergeStaticGroupByMaterial(shop);
    group.add(shop);
  }

  // ========== DISTRICT 4: TIỆM MINIGAME (Multi-Tier Retro-Modern Arcade Palace + Crown GAME Marquee) ==========
  {
    const arcade = new THREE.Group();
    arcade.position.set(32, 0, 17.5);
    arcade.rotation.y = 0;
    arcade.scale.setScalar(1.52);

    const stonePlinthMat = getMat('#CFC8E2', 0.76);
    const stepMat = getMat('#DFDAEC', 0.74);
    const wallCreamMat = getMat('#F7F1FE', 0.66);
    const upperWallMat = getMat('#EDE4FA', 0.62);
    const trimIndigoMat = getMat('#4B3D78', 0.56);
    const trimLilacMat = getMat('#6E5DA8', 0.58);
    const roofDeckMat = getMat('#3A2F63', 0.64);
    const roofBorderMat = getMat('#EFE7FA', 0.62);
    const coralMat = getMat('#F06875', 0.46);
    const tealNeonMat = new THREE.MeshStandardMaterial({
      color: '#5AD4C8',
      emissive: '#2FB3A7',
      emissiveIntensity: 0.24,
      roughness: 0.3,
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
    tealNeonMat.userData.isArcadeNeon = true;
    lampBulbs.push(tealNeonMat);

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

    // 2. Ground Hall Body + Wainscot + Sculpted Projecting Corner Pylon Turrets
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(5.92, 3.42, 4.16, 3, 0.12),
      wallCreamMat,
    );
    body.position.y = 2.06;

    const wainscot = new THREE.Mesh(
      new RoundedBoxGeometry(6.04, 0.74, 4.26, 2, 0.05),
      trimIndigoMat,
    );
    wainscot.position.y = 0.72;

    const neonBelt = new THREE.Group();
    [-3.0, 3.0].forEach((sx) => {
      const sideTrim = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.1, 3.94, 2, 0.025),
        tealNeonMat,
      );
      sideTrim.position.set(sx, 1.15, -0.05);
      neonBelt.add(sideTrim);
    });
    const backTrim = new THREE.Mesh(
      new RoundedBoxGeometry(6.06, 0.1, 0.08, 2, 0.025),
      tealNeonMat,
    );
    backTrim.position.set(0, 1.15, -2.1);
    neonBelt.add(backTrim);

    // 4 Tall Projecting Corner Pylon Turrets with Vertical Neon Light Fins (rising past 2nd floor!)
    [
      [-2.94, 2.02],
      [2.94, 2.02],
      [-2.94, -2.02],
      [2.94, -2.02],
    ].forEach(([px, pz]) => {
      const turret = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 5.75, 0.56, 2, 0.08),
        trimIndigoMat,
      );
      turret.position.set(px, 3.22, pz);
      const turretCap = new THREE.Mesh(
        new RoundedBoxGeometry(0.68, 0.26, 0.68, 2, 0.06),
        coralMat,
      );
      turretCap.position.set(px, 6.18, pz);
      const turretOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), tealNeonMat);
      turretOrb.position.set(px, 6.52, pz);
      const fin = new THREE.Mesh(
        new RoundedBoxGeometry(0.1, 4.4, 0.12, 2, 0.03),
        tealNeonMat,
      );
      fin.position.set(px + (px > 0 ? 0.28 : -0.28), 3.35, pz + (pz > 0 ? 0.24 : -0.24));
      arcade.add(turret, turretCap, turretOrb, fin);
    });

    // Center Entry Columns
    [-1.08, 1.08].forEach((px) => {
      const col = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 3.45, 0.32, 2, 0.05),
        trimIndigoMat,
      );
      col.position.set(px, 2.06, 2.04);
      const capBand = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.14, 0.38, 2, 0.03),
        coralMat,
      );
      capBand.position.set(px, 3.64, 2.04);
      arcade.add(col, capBand);
    });

    // Upper Mezzanine Frieze Cornice + Glowing Trim Belt
    const upperFrieze = new THREE.Mesh(
      new RoundedBoxGeometry(6.24, 0.32, 4.42, 2, 0.05),
      trimLilacMat,
    );
    upperFrieze.position.y = 3.74;
    const upperNeonTrim = new THREE.Mesh(
      new RoundedBoxGeometry(6.3, 0.08, 4.48, 2, 0.02),
      tealNeonMat,
    );
    upperNeonTrim.position.y = 3.88;

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

    // 4. Left & Right Panoramic Glass Showcase Bays
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

      for (let s = 0; s < 4; s++) {
        const stripe = new THREE.Mesh(
          new RoundedBoxGeometry(0.38, 0.11, 0.56, 2, 0.03),
          getMat(s % 2 === 0 ? '#F06875' : '#FFFDF9', 0.55),
        );
        stripe.position.set(bx - 0.57 + s * 0.38, 3.02, 2.26);
        stripe.rotation.x = 0.3;
        arcade.add(stripe);
      }

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

    // Side & Back Windows on Ground Floor
    [-1, 1].forEach((side) => {
      [-0.85, 0.85].forEach((wz) => {
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

    // 5. Stepped Second-Story Arcade Mezzanine Hall (y = 3.92..5.65)
    const upperHall = new THREE.Mesh(
      new RoundedBoxGeometry(4.92, 1.72, 3.34, 3, 0.1),
      upperWallMat,
    );
    upperHall.position.y = 4.76;

    // 3 Tall Arched Neon Clerestory Windows on Front Facade + Side Clerestory Bays
    [-1.45, 0, 1.45].forEach((ux, idx) => {
      const winW = idx === 1 ? 1.15 : 0.92;
      const uwFrame = new THREE.Mesh(
        new RoundedBoxGeometry(winW + 0.2, 1.16, 0.16, 2, 0.04),
        trimIndigoMat,
      );
      uwFrame.position.set(ux, 4.78, 1.68);
      const uwGlass = new THREE.Mesh(
        new RoundedBoxGeometry(winW, 0.96, 0.1, 2, 0.02),
        idx === 1 ? glassShowcaseMat : makeWinMat(),
      );
      uwGlass.position.set(ux, 4.78, 1.73);
      const uwCap = new THREE.Mesh(
        new THREE.CylinderGeometry(winW * 0.5, winW * 0.5, 0.16, 14, 1, false, 0, Math.PI),
        coralMat,
      );
      uwCap.rotation.x = Math.PI / 2;
      uwCap.rotation.z = Math.PI / 2;
      uwCap.position.set(ux, 5.26, 1.68);
      arcade.add(uwFrame, uwGlass, uwCap);
    });
    [-1, 1].forEach((side) => {
      const sideUpperWin = buildFramedWindow(1.65, 0.85, trimLilacMat, makeWinMat());
      sideUpperWin.rotation.y = (side * Math.PI) / 2;
      sideUpperWin.position.set(side * 2.48, 4.78, 0);
      arcade.add(sideUpperWin);
    });

    // 6. Sculpted Crown Penthouse Terrace + Arched Neon Backboard (y = 5.62..7.55 -> ~11.5m world!)
    const roofSlab = new THREE.Mesh(
      new RoundedBoxGeometry(5.36, 0.28, 3.74, 2, 0.06),
      roofBorderMat,
    );
    roofSlab.position.y = 5.64;

    const roofTerraceFloor = new THREE.Mesh(
      new RoundedBoxGeometry(4.88, 0.08, 3.28, 2, 0.02),
      roofDeckMat,
    );
    roofTerraceFloor.position.y = 5.78;

    const parapetFront = new THREE.Mesh(
      new RoundedBoxGeometry(5.34, 0.24, 0.22, 2, 0.04),
      roofBorderMat,
    );
    parapetFront.position.set(0, 5.86, 1.74);
    const parapetBack = parapetFront.clone();
    parapetBack.position.z = -1.74;
    const parapetLeft = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.24, 3.72, 2, 0.04),
      roofBorderMat,
    );
    parapetLeft.position.set(-2.56, 5.86, 0);
    const parapetRight = parapetLeft.clone();
    parapetRight.position.x = 2.56;

    const crownPenthouse = new THREE.Mesh(
      new RoundedBoxGeometry(3.2, 0.56, 1.6, 2, 0.08),
      trimIndigoMat,
    );
    crownPenthouse.position.set(0, 6.06, -0.58);
    const skyLight = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 0.24, 0.96, 2, 0.06),
      glassShowcaseMat,
    );
    skyLight.position.set(0, 6.38, -0.58);

    // 7. LARGE UPRIGHT 3D SCULPTED "G A M E" CROWN MARQUEE ON TOP TIER
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
      new RoundedBoxGeometry(4.85, 0.22, 0.48, 2, 0.04),
      trimIndigoMat,
    );
    signPlinthBeam.position.set(0, 5.9, 1.15);
    const signBackArch = new THREE.Mesh(
      new RoundedBoxGeometry(4.62, 1.48, 0.22, 3, 0.08),
      trimIndigoMat,
    );
    signBackArch.position.set(0, 6.68, 1.0);
    const signArchNeon = new THREE.Mesh(
      new RoundedBoxGeometry(4.78, 1.62, 0.09, 3, 0.04),
      tealNeonMat,
    );
    // Offset cleanly inside signBackArch Z-thickness [0.89..1.11] so no coplanar faces cause rear Z-fighting
    signArchNeon.position.set(0, 6.68, 0.97);
    arcade.add(signPlinthBeam, signBackArch, signArchNeon);

    [-1.95, -0.65, 0.65, 1.95].forEach((sx) => {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.78, 6),
        trimIndigoMat,
      );
      strut.position.set(sx, 6.18, 0.72);
      strut.rotation.x = 0.62;
      arcade.add(strut);
    });

    const gameLetters: {ch: 'G' | 'A' | 'M' | 'E'; x: number; col: string; em: string}[] = [
      {ch: 'G', x: -1.72, col: '#FF6B78', em: '#E03E52'},
      {ch: 'A', x: -0.57, col: '#FFD166', em: '#E5A229'},
      {ch: 'M', x: 0.61, col: '#55DEC8', em: '#26B59F'},
      {ch: 'E', x: 1.76, col: '#8E9BFF', em: '#5B6BE6'},
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
      letterMesh.position.set(x, 6.66, 1.18);
      arcade.add(letterMesh);
    });

    // 8. Outdoor Gacha Machine + Pixel Token Standee
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
      upperNeonTrim,
      upperHall,
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
      crownPenthouse,
      skyLight,
      gachaBase,
      gachaGlobe,
      tokenPost,
      tokenStar,
    );
    addInteractionProxy(
      arcade,
      [6.8, 7.2, 5.4],
      3.5,
      {
        kind: 'zone',
        zone: 'arcade' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.arcade.tx,
        tz: TOWN_ZONE_ENTRANCES.arcade.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'arcade', x: 32, z: 17.5, hw: 5.1, hd: 3.95, rotY: 0});
    mergeStaticGroupByMaterial(arcade);
    group.add(arcade);
  }

  // ========== DISTRICT 5: HỒ CÂU CÁ TƯƠNG TÁC (Large Sunken Lotus Lake, Walkable Bridge, Aquatic Flora & Fireflies) ==========
  const pierWalkableMeshes: THREE.Object3D[] = [];
  let lakeWaterMat: THREE.MeshStandardMaterial | null = null;
  let lakeFishingVisuals: FishingSpotVisuals | null = null;
  let reedClumpIM: THREE.InstancedMesh | null = null;
  const reedClumpBaseTfs: {pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3}[] = [];
  const FIREFLY_COUNT = 38;
  let fireflyCoreIM: THREE.InstancedMesh | null = null;
  let fireflyHaloIM: THREE.InstancedMesh | null = null;
  const fireflySeeds: {
    x: number;
    y: number;
    z: number;
    rx: number;
    rz: number;
    speed: number;
    phase: number;
    blinkSpeed: number;
  }[] = [];

  {
    const lake = new THREE.Group();
    const LAKE_WATER_Y = TOWN_LAKE_WATER_Y;
    const PIER_X = -22.5;

    // 1. Sculpted Sunken Embankment & Lakebed matching exact Terrain Hole Outline
    const BANK_SEGS = 64;
    const bankVerts: number[] = [];
    const bankCols: number[] = [];
    const bankIndices: number[] = [];

    const ringSpecs: [number, number, string][] = [
      [1.025, 0.015, '#68AE55'], // Outer grassy lip slightly tucked under ground rim
      [0.95, -0.19, '#C7AF89'], // Sandy-clay bank above waterline
      [0.85, -0.58, '#5E8E7E'], // Shallow submerged shelf
      [0.45, -0.9, '#31626C'], // Deeper turquoise bed
    ];
    const tmpC = new THREE.Color();

    for (let rIdx = 0; rIdx < ringSpecs.length; rIdx++) {
      const [scale, ry, hex] = ringSpecs[rIdx];
      tmpC.set(hex);
      for (let s = 0; s <= BANK_SEGS; s++) {
        const theta = (s / BANK_SEGS) * Math.PI * 2;
        const rad = getLakeShoreRadius(theta) * scale;
        bankVerts.push(
          LAKE_CENTER.x + Math.cos(theta) * rad,
          ry,
          LAKE_CENTER.z + Math.sin(theta) * rad,
        );
        bankCols.push(tmpC.r, tmpC.g, tmpC.b);
      }
    }
    const stride = BANK_SEGS + 1;
    for (let rIdx = 0; rIdx < ringSpecs.length - 1; rIdx++) {
      for (let s = 0; s < BANK_SEGS; s++) {
        const a = rIdx * stride + s;
        const b = a + 1;
        const c = (rIdx + 1) * stride + s;
        const d = c + 1;
        bankIndices.push(a, c, b);
        bankIndices.push(b, c, d);
      }
    }
    // Center lakebed cap vertex
    const centerVertIdx = bankVerts.length / 3;
    bankVerts.push(LAKE_CENTER.x, -0.94, LAKE_CENTER.z);
    tmpC.set('#27525C');
    bankCols.push(tmpC.r, tmpC.g, tmpC.b);
    const innerRingStart = (ringSpecs.length - 1) * stride;
    for (let s = 0; s < BANK_SEGS; s++) {
      bankIndices.push(innerRingStart + s, centerVertIdx, innerRingStart + s + 1);
    }

    const basinGeo = new THREE.BufferGeometry();
    basinGeo.setAttribute('position', new THREE.Float32BufferAttribute(bankVerts, 3));
    basinGeo.setAttribute('color', new THREE.Float32BufferAttribute(bankCols, 3));
    basinGeo.setIndex(bankIndices);
    basinGeo.computeVertexNormals();
    const basinMesh = new THREE.Mesh(
      basinGeo,
      new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.88}),
    );
    basinMesh.renderOrder = 0;
    basinMesh.userData = {isWaterSurface: true};
    lake.add(basinMesh);

    // 2. Recessed Translucent Calm Water Surface (sits at y = -0.26, visibly below y = 0 ground)
    const waterShape = new THREE.Shape();
    for (let s = 0; s <= BANK_SEGS; s++) {
      const theta = (s / BANK_SEGS) * Math.PI * 2;
      const rad = getLakeShoreRadius(theta) * 0.955;
      const wx = LAKE_CENTER.x + Math.cos(theta) * rad;
      const wy = -(LAKE_CENTER.z + Math.sin(theta) * rad);
      if (s === 0) waterShape.moveTo(wx, wy);
      else waterShape.lineTo(wx, wy);
    }
    const waterGeo = new THREE.ShapeGeometry(waterShape, 32);
    waterGeo.rotateX(-Math.PI / 2);
    lakeWaterMat = new THREE.MeshStandardMaterial({
      color: '#3496B5',
      roughness: 0.68,
      metalness: 0.0,
      envMapIntensity: 0.1,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const waterMesh = new THREE.Mesh(waterGeo, lakeWaterMat);
    waterMesh.position.y = LAKE_WATER_Y;
    waterMesh.renderOrder = 3;
    waterMesh.userData = {
      kind: 'town_lake_fish',
      isWaterMesh: true,
    };
    lake.add(waterMesh);
    clickTargets.push(waterMesh);

    // Subtle deep-water inner shimmer lens
    const deepShape = new THREE.Shape();
    for (let s = 0; s <= 40; s++) {
      const theta = (s / 40) * Math.PI * 2;
      const rad = getLakeShoreRadius(theta) * 0.56;
      const wx = LAKE_CENTER.x + Math.cos(theta) * rad;
      const wy = -(LAKE_CENTER.z + Math.sin(theta) * rad);
      if (s === 0) deepShape.moveTo(wx, wy);
      else deepShape.lineTo(wx, wy);
    }
    const deepGeo = new THREE.ShapeGeometry(deepShape, 24);
    deepGeo.rotateX(-Math.PI / 2);
    const deepMesh = new THREE.Mesh(
      deepGeo,
      new THREE.MeshStandardMaterial({
        color: '#1E6C8C',
        roughness: 0.44,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    );
    deepMesh.position.y = LAKE_WATER_Y - 0.18;
    deepMesh.renderOrder = 1;
    deepMesh.userData = {isWaterSurface: true};
    lake.add(deepMesh);

    // 3. Walkable Timber Bridge / Fishing Pier extending out over the recessed water
    const woodPierMat = getMat('#C89462', 0.7);
    const woodPlankAltMat = getMat('#B88352', 0.72);
    const woodDarkMat = getMat('#754C2C', 0.78);
    const pierRopeMat = getMat('#DFC79E', 0.84);

    // Main walkable deck surface (registered in groundMeshes so tapping bridge walks right onto it!)
    const pierDeck = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 0.18, 7.2, 2, 0.04),
      woodPierMat,
    );
    pierDeck.position.set(PIER_X, 0.16, 40.95);
    pierDeck.userData = {kind: 'ground'};
    pierWalkableMeshes.push(pierDeck);
    lake.add(pierDeck);

    // Sloped entry ramp connecting north grass shoreline (z=36.65) to pier deck (z=37.35)
    const pierRamp = new THREE.Mesh(
      new RoundedBoxGeometry(1.92, 0.16, 0.86, 2, 0.03),
      woodPlankAltMat,
    );
    pierRamp.position.set(PIER_X, 0.08, 37.02);
    pierRamp.rotation.x = 0.28;
    pierRamp.userData = {kind: 'ground'};
    pierWalkableMeshes.push(pierRamp);
    lake.add(pierRamp);

    // Cross-plank wood slats along the bridge surface
    for (let pz = 37.55; pz <= 44.35; pz += 0.46) {
      const plank = new THREE.Mesh(
        new RoundedBoxGeometry(1.86, 0.035, 0.36, 1, 0.01),
        Math.round(pz * 2) % 2 === 0 ? woodPierMat : woodPlankAltMat,
      );
      plank.position.set(PIER_X, 0.252, pz);
      lake.add(plank);
    }

    // Two heavy structural beams under bridge
    [-0.72, 0.72].forEach((ox) => {
      const stringer = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 0.22, 7.1, 2, 0.02),
        woodDarkMat,
      );
      stringer.position.set(PIER_X + ox, 0.04, 40.95);
      lake.add(stringer);
    });

    // Timber pilings anchored into the sunken lakebed + low rustic side rope posts
    const pilingZs = [37.5, 39.7, 41.9, 44.3];
    pilingZs.forEach((pz, pIdx) => {
      [-0.9, 0.9].forEach((ox) => {
        const piling = new THREE.Mesh(
          new THREE.CylinderGeometry(0.095, 0.11, 1.75, 8),
          woodDarkMat,
        );
        piling.position.set(PIER_X + ox, -0.02, pz);
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.115, 0.115, 0.08, 8),
          woodPierMat,
        );
        cap.position.set(PIER_X + ox, 0.87, pz);
        lake.add(piling, cap);
      });
      if (pIdx < pilingZs.length - 1) {
        const nextZ = pilingZs[pIdx + 1];
        const midZ = (pz + nextZ) / 2;
        [-0.9, 0.9].forEach((ox) => {
          const topRail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, nextZ - pz, 6),
            pierRopeMat,
          );
          topRail.rotation.x = Math.PI / 2;
          topRail.position.set(PIER_X + ox, 0.68, midZ);
          lake.add(topRail);
        });
      }
    });

    // Warm Hanging Pier Lantern + Fishing Crate + Leaning Bamboo Rod at Bridge Tip
    const lanternPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.095, 2.15, 8),
      woodDarkMat,
    );
    lanternPost.position.set(PIER_X + 0.9, 1.25, 44.3);
    const lanternArm = new THREE.Mesh(
      new RoundedBoxGeometry(0.55, 0.07, 0.07, 2, 0.02),
      woodDarkMat,
    );
    lanternArm.position.set(PIER_X + 1.12, 2.24, 44.3);
    const lanternCord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6),
      getMat('#2B2623', 0.6),
    );
    lanternCord.position.set(PIER_X + 1.32, 2.1, 44.3);
    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.12, 8), woodDarkMat);
    lanternCap.position.set(PIER_X + 1.32, 1.98, 44.3);
    const pierLampMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    lampBulbs.push(pierLampMat);
    const pierLamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 9), pierLampMat);
    pierLamp.position.set(PIER_X + 1.32, 1.84, 44.3);
    lake.add(lanternPost, lanternArm, lanternCord, lanternCap, pierLamp);

    // Interactive Fishing Spot Box at Pier Tip & Center Lake
    addInteractionProxy(
      lake,
      [2.2, 1.8, 1.8],
      0.9,
      {kind: 'town_lake_fish', tx: PIER_X, tz: 43.35},
      clickTargets,
    ).position.set(PIER_X, 0.9, 44.0);

    // Play Together-style Lake Fishing Visuals (Round brown bobber, underwater fish shadows & splash ripples)
    lakeFishingVisuals = createFishingSpotVisuals({
      waterY: LAKE_WATER_Y,
      defaultPos: [PIER_X, LAKE_WATER_Y, 46.6],
      toolId: 'wooden_rod',
    });
    lake.add(lakeFishingVisuals.group);

    // 4. Sculpted Notched Lily Pads (Lá Sen) + Multi-Petal Lotus Flowers (Hoa Sen)
    const padShape = new THREE.Shape();
    padShape.moveTo(0, 0);
    padShape.absarc(0, 0, 0.5, 0.2, Math.PI * 2 - 0.2, false);
    padShape.lineTo(0, 0);
    const lilyPadGeo = new THREE.ShapeGeometry(padShape, 18);
    lilyPadGeo.rotateX(-Math.PI / 2);
    const lilyPadMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.56,
      side: THREE.DoubleSide,
    });

    const lilyPadSpots: [number, number, number, number][] = [
      // West lotus cove
      [LAKE_CENTER.x - 4.8, LAKE_CENTER.z - 2.2, 1.15, 0.3],
      [LAKE_CENTER.x - 5.9, LAKE_CENTER.z - 1.1, 0.92, 1.8],
      [LAKE_CENTER.x - 4.2, LAKE_CENTER.z - 0.8, 1.05, 3.1],
      [LAKE_CENTER.x - 5.6, LAKE_CENTER.z + 0.6, 0.88, 4.4],
      [LAKE_CENTER.x - 4.6, LAKE_CENTER.z + 2.4, 1.18, 2.2],
      [LAKE_CENTER.x - 3.3, LAKE_CENTER.z + 3.6, 0.95, 5.1],
      // South lotus garden
      [LAKE_CENTER.x - 1.4, LAKE_CENTER.z + 5.6, 1.2, 0.8],
      [LAKE_CENTER.x - 0.2, LAKE_CENTER.z + 6.3, 0.98, 2.6],
      [LAKE_CENTER.x + 1.2, LAKE_CENTER.z + 5.8, 1.12, 4.0],
      [LAKE_CENTER.x + 0.4, LAKE_CENTER.z + 4.5, 0.86, 1.4],
      [LAKE_CENTER.x - 2.8, LAKE_CENTER.z + 5.3, 1.04, 3.7],
      // East & Northeast lotus cove
      [LAKE_CENTER.x + 4.5, LAKE_CENTER.z - 2.4, 1.16, 1.1],
      [LAKE_CENTER.x + 5.7, LAKE_CENTER.z - 1.4, 0.94, 2.9],
      [LAKE_CENTER.x + 4.9, LAKE_CENTER.z + 0.4, 1.1, 4.6],
      [LAKE_CENTER.x + 6.1, LAKE_CENTER.z + 1.6, 0.9, 0.5],
      [LAKE_CENTER.x + 4.2, LAKE_CENTER.z + 2.8, 1.18, 3.3],
      [LAKE_CENTER.x + 5.5, LAKE_CENTER.z + 3.5, 0.96, 5.5],
      [LAKE_CENTER.x + 3.2, LAKE_CENTER.z + 4.2, 0.88, 2.1],
      // Northwest cove near bridge flank
      [LAKE_CENTER.x - 4.4, LAKE_CENTER.z - 4.8, 1.06, 1.9],
      [LAKE_CENTER.x - 5.5, LAKE_CENTER.z - 4.1, 0.86, 4.8],
      [LAKE_CENTER.x - 3.2, LAKE_CENTER.z - 5.5, 0.92, 0.7],
      [LAKE_CENTER.x + 4.0, LAKE_CENTER.z - 4.9, 1.08, 3.8],
      [LAKE_CENTER.x + 5.1, LAKE_CENTER.z - 4.0, 0.88, 5.7],
      [LAKE_CENTER.x + 2.9, LAKE_CENTER.z - 5.8, 0.95, 2.4],
    ];

    const lilyPadIM = new THREE.InstancedMesh(lilyPadGeo, lilyPadMat, lilyPadSpots.length);
    const padGreens = ['#4EA858', '#62BD6B', '#43964D', '#6DC474'];
    lilyPadSpots.forEach(([lx, lz, ls, rot], i) => {
      _instDummy.position.set(lx, LAKE_WATER_Y + 0.016, lz);
      _instDummy.rotation.set(0, rot, 0);
      _instDummy.scale.setScalar(ls);
      _instDummy.updateMatrix();
      lilyPadIM.setMatrixAt(i, _instDummy.matrix);
      _instColor.set(padGreens[i % padGreens.length]);
      lilyPadIM.setColorAt(i, _instColor);
    });
    lilyPadIM.instanceMatrix.needsUpdate = true;
    if (lilyPadIM.instanceColor) lilyPadIM.instanceColor.needsUpdate = true;
    lilyPadIM.computeBoundingSphere();
    lilyPadIM.renderOrder = 4;
    lake.add(lilyPadIM);

    // Sculpted Open Lotus Flowers (Hoa Sen) & Stems (merged geometry -> InstancedMesh)
    const lotusOuterPetals: THREE.BufferGeometry[] = [];
    for (let p = 0; p < 7; p++) {
      const ang = (p / 7) * Math.PI * 2;
      const pet = new THREE.SphereGeometry(0.11, 7, 6);
      pet.scale(0.68, 1.45, 0.34);
      pet.rotateX(0.86);
      pet.rotateY(ang);
      pet.translate(Math.sin(ang) * 0.14, 0.08, Math.cos(ang) * 0.14);
      lotusOuterPetals.push(pet);
    }
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2 + 0.3;
      const inner = new THREE.SphereGeometry(0.085, 6, 5);
      inner.scale(0.62, 1.35, 0.3);
      inner.rotateX(0.45);
      inner.rotateY(ang);
      inner.translate(Math.sin(ang) * 0.075, 0.13, Math.cos(ang) * 0.075);
      lotusOuterPetals.push(inner);
    }
    const lotusPetalGeo = mergeParts(lotusOuterPetals);
    const lotusPetalMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.45});
    const lotusCenterGeo = new THREE.CylinderGeometry(0.065, 0.04, 0.09, 8);
    lotusCenterGeo.translate(0, 0.14, 0);
    const lotusCenterMat = glossyClayMat('#FAD048', 0.35);

    const lotusBloomSpots: [number, number, number, string][] = [
      [LAKE_CENTER.x - 4.7, LAKE_CENTER.z - 2.15, 1.15, '#FF9AB8'],
      [LAKE_CENTER.x - 4.3, LAKE_CENTER.z - 0.7, 0.95, '#FFB8CE'],
      [LAKE_CENTER.x - 4.55, LAKE_CENTER.z + 2.45, 1.2, '#FFEAF1'],
      [LAKE_CENTER.x - 1.35, LAKE_CENTER.z + 5.65, 1.12, '#FF9AB8'],
      [LAKE_CENTER.x + 1.25, LAKE_CENTER.z + 5.75, 1.05, '#FFB5CD'],
      [LAKE_CENTER.x + 4.55, LAKE_CENTER.z - 2.35, 1.18, '#FF9AB8'],
      [LAKE_CENTER.x + 4.95, LAKE_CENTER.z + 0.45, 1.04, '#FFEAF1'],
      [LAKE_CENTER.x + 4.25, LAKE_CENTER.z + 2.85, 1.16, '#FFA7C2'],
      [LAKE_CENTER.x - 4.35, LAKE_CENTER.z - 4.75, 1.0, '#FFB8CE'],
      [LAKE_CENTER.x + 4.05, LAKE_CENTER.z - 4.85, 1.08, '#FF9AB8'],
    ];
    const lotusPetalIM = new THREE.InstancedMesh(
      lotusPetalGeo,
      lotusPetalMat,
      lotusBloomSpots.length,
    );
    const lotusCenterIM = new THREE.InstancedMesh(
      lotusCenterGeo,
      lotusCenterMat,
      lotusBloomSpots.length,
    );
    lotusBloomSpots.forEach(([fx, fz, fs, col], i) => {
      _instDummy.position.set(fx, LAKE_WATER_Y + 0.01, fz);
      _instDummy.rotation.set(0, i * 0.9, 0);
      _instDummy.scale.setScalar(fs);
      _instDummy.updateMatrix();
      lotusPetalIM.setMatrixAt(i, _instDummy.matrix);
      lotusCenterIM.setMatrixAt(i, _instDummy.matrix);
      _instColor.set(col);
      lotusPetalIM.setColorAt(i, _instColor);
    });
    lotusPetalIM.instanceMatrix.needsUpdate = true;
    lotusCenterIM.instanceMatrix.needsUpdate = true;
    if (lotusPetalIM.instanceColor) lotusPetalIM.instanceColor.needsUpdate = true;
    lotusPetalIM.computeBoundingSphere();
    lotusCenterIM.computeBoundingSphere();
    lotusPetalIM.renderOrder = 4;
    lotusCenterIM.renderOrder = 4;
    lake.add(lotusPetalIM, lotusCenterIM);

    // Tall Lotus Buds on Stalks
    const budStemGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.56, 6);
    budStemGeo.translate(0, 0.25, 0);
    const budHeadGeo = new THREE.SphereGeometry(0.095, 8, 7);
    budHeadGeo.scale(0.75, 1.48, 0.75);
    budHeadGeo.translate(0, 0.55, 0);
    const budSpots: [number, number][] = [
      [LAKE_CENTER.x - 5.4, LAKE_CENTER.z - 1.5],
      [LAKE_CENTER.x - 3.6, LAKE_CENTER.z + 3.1],
      [LAKE_CENTER.x - 0.1, LAKE_CENTER.z + 6.1],
      [LAKE_CENTER.x + 5.4, LAKE_CENTER.z - 1.6],
      [LAKE_CENTER.x + 5.2, LAKE_CENTER.z + 3.3],
      [LAKE_CENTER.x + 3.3, LAKE_CENTER.z - 5.3],
    ];
    const budStemIM = new THREE.InstancedMesh(
      budStemGeo,
      getMat('#4E9A54', 0.72),
      budSpots.length,
    );
    const budHeadIM = new THREE.InstancedMesh(
      budHeadGeo,
      getMat('#FF9EC0', 0.5),
      budSpots.length,
    );
    budSpots.forEach(([bx, bz], i) => {
      _instDummy.position.set(bx, LAKE_WATER_Y - 0.04, bz);
      _instDummy.rotation.set(0.08 * (i % 2 === 0 ? 1 : -1), i, 0.06);
      _instDummy.scale.setScalar(0.95 + (i % 3) * 0.12);
      _instDummy.updateMatrix();
      budStemIM.setMatrixAt(i, _instDummy.matrix);
      budHeadIM.setMatrixAt(i, _instDummy.matrix);
    });
    budStemIM.instanceMatrix.needsUpdate = true;
    budHeadIM.instanceMatrix.needsUpdate = true;
    budStemIM.computeBoundingSphere();
    budHeadIM.computeBoundingSphere();
    budStemIM.renderOrder = 4;
    budHeadIM.renderOrder = 4;
    lake.add(budStemIM, budHeadIM);

    // 5. Lush Aquatic Grass / Reeds & Cattails (Cỏ Thủy Sinh) in shallow water perimeter
    const bladeParts: THREE.BufferGeometry[] = [];
    for (let b = 0; b < 7; b++) {
      const ang = (b / 7) * Math.PI * 2;
      const h = 0.65 + (b % 3) * 0.22;
      const blade = new THREE.ConeGeometry(0.052, h, 4);
      blade.translate(0, h / 2, 0);
      blade.rotateZ(0.24 + (b % 2) * 0.12);
      blade.rotateY(ang);
      blade.translate(Math.cos(ang) * 0.08, 0, Math.sin(ang) * 0.08);
      bladeParts.push(blade);
    }
    const reedClumpGeo = mergeParts(bladeParts);
    const reedClumpMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.72});

    const reedThetaList = [
      0.15, 0.32, 0.5, 0.72, 0.92, 1.18, 1.38, 1.62, 1.85, 2.08, 2.35, 2.58, 2.82, 3.05,
      3.32, 3.55, 3.82, 4.08, 4.32, 5.15, 5.38, 5.62, 5.88, 6.08,
    ];
    reedClumpIM = new THREE.InstancedMesh(reedClumpGeo, reedClumpMat, reedThetaList.length);
    const reedColors = ['#489F57', '#5AB364', '#3E8C4F', '#67BF6F'];
    reedThetaList.forEach((theta, i) => {
      const r = getLakeShoreRadius(theta) * (0.83 + (i % 3) * 0.035);
      const rx = LAKE_CENTER.x + Math.cos(theta) * r;
      const rz = LAKE_CENTER.z + Math.sin(theta) * r;
      _instDummy.position.set(rx, LAKE_WATER_Y - 0.2, rz);
      _instDummy.rotation.set(0, theta + i, 0);
      _instDummy.scale.setScalar(1.0 + (i % 4) * 0.18);
      _instDummy.updateMatrix();
      reedClumpIM!.setMatrixAt(i, _instDummy.matrix);
      reedClumpBaseTfs.push({
        pos: _instDummy.position.clone(),
        quat: _instDummy.quaternion.clone(),
        scale: _instDummy.scale.clone(),
      });
      _instColor.set(reedColors[i % reedColors.length]);
      reedClumpIM!.setColorAt(i, _instColor);
    });
    reedClumpIM.instanceMatrix.needsUpdate = true;
    if (reedClumpIM.instanceColor) reedClumpIM.instanceColor.needsUpdate = true;
    reedClumpIM.computeBoundingSphere();
    lake.add(reedClumpIM);

    // Sculpted Cattails (Cỏ Nến) interspersed along lush aquatic reed banks
    const cattailThetas = [0.22, 0.78, 1.48, 2.25, 2.95, 3.68, 5.45, 5.95];
    const ctStalkGeo = new THREE.CylinderGeometry(0.018, 0.024, 1.15, 6);
    ctStalkGeo.translate(0, 0.57, 0);
    const ctHeadGeo = new THREE.CapsuleGeometry(0.045, 0.22, 4, 7);
    ctHeadGeo.translate(0, 1.02, 0);
    const ctStalkIM = new THREE.InstancedMesh(
      ctStalkGeo,
      getMat('#488B4E', 0.76),
      cattailThetas.length * 2,
    );
    const ctHeadIM = new THREE.InstancedMesh(
      ctHeadGeo,
      getMat('#6D4327', 0.85),
      cattailThetas.length * 2,
    );
    let ctIdx = 0;
    cattailThetas.forEach((theta, k) => {
      const r = getLakeShoreRadius(theta) * 0.87;
      for (let sub = 0; sub < 2; sub++) {
        const cx = LAKE_CENTER.x + Math.cos(theta) * r + (sub === 0 ? -0.14 : 0.16);
        const cz = LAKE_CENTER.z + Math.sin(theta) * r + (sub === 0 ? 0.1 : -0.12);
        _instDummy.position.set(cx, LAKE_WATER_Y - 0.18, cz);
        _instDummy.rotation.set(sub === 0 ? 0.06 : -0.05, k + sub, sub === 0 ? -0.05 : 0.07);
        _instDummy.scale.setScalar(0.9 + (sub + k) % 3 * 0.14);
        _instDummy.updateMatrix();
        ctStalkIM.setMatrixAt(ctIdx, _instDummy.matrix);
        ctHeadIM.setMatrixAt(ctIdx, _instDummy.matrix);
        ctIdx++;
      }
    });
    ctStalkIM.instanceMatrix.needsUpdate = true;
    ctHeadIM.instanceMatrix.needsUpdate = true;
    ctStalkIM.computeBoundingSphere();
    ctHeadIM.computeBoundingSphere();
    lake.add(ctStalkIM, ctHeadIM);

    // 6. Natural Riverside Boulders tucked around the earthen bank rim
    const shoreRockGeo = new THREE.DodecahedronGeometry(0.62, 0);
    shoreRockGeo.scale(1.25, 0.72, 1.05);
    const shoreRockMat = getMat('#99A3AD', 0.82);
    const rockThetas = [0.05, 0.62, 1.1, 1.75, 2.45, 3.15, 3.85, 4.45, 5.2, 5.85];
    const shoreRockIM = new THREE.InstancedMesh(shoreRockGeo, shoreRockMat, rockThetas.length);
    rockThetas.forEach((theta, i) => {
      const r = getLakeShoreRadius(theta) * 0.99;
      const rx = LAKE_CENTER.x + Math.cos(theta) * r;
      const rz = LAKE_CENTER.z + Math.sin(theta) * r;
      const rs = 0.72 + (i % 3) * 0.24;
      _instDummy.position.set(rx, 0.06, rz);
      _instDummy.rotation.set(0, theta + i, 0);
      _instDummy.scale.setScalar(rs);
      _instDummy.updateMatrix();
      shoreRockIM.setMatrixAt(i, _instDummy.matrix);
    });
    shoreRockIM.instanceMatrix.needsUpdate = true;
    shoreRockIM.computeBoundingSphere();
    lake.add(shoreRockIM);

    // 7. Nighttime Fireflies (Đom Đóm) hovering above the water, lotus blooms & reeds
    const ffCoreGeo = new THREE.SphereGeometry(0.052, 6, 5);
    const ffCoreMat = new THREE.MeshBasicMaterial({color: '#F4FF85'});
    fireflyCoreIM = new THREE.InstancedMesh(ffCoreGeo, ffCoreMat, FIREFLY_COUNT);
    fireflyCoreIM.frustumCulled = false;
    fireflyCoreIM.renderOrder = 7;
    fireflyCoreIM.visible = false;

    const ffHaloGeo = new THREE.SphereGeometry(0.145, 6, 5);
    const ffHaloMat = new THREE.MeshBasicMaterial({
      color: '#D8FF4E',
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    fireflyHaloIM = new THREE.InstancedMesh(ffHaloGeo, ffHaloMat, FIREFLY_COUNT);
    fireflyHaloIM.frustumCulled = false;
    fireflyHaloIM.renderOrder = 8;
    fireflyHaloIM.visible = false;

    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const a = i * 2.39996;
      const dist = 1.6 + ((i * 0.67) % 7.2);
      fireflySeeds.push({
        x: LAKE_CENTER.x + Math.cos(a) * dist,
        y: LAKE_WATER_Y + 0.28 + ((i * 0.19) % 1.35),
        z: LAKE_CENTER.z + Math.sin(a) * dist,
        rx: 0.45 + (i % 4) * 0.22,
        rz: 0.42 + (i % 3) * 0.24,
        speed: 0.55 + (i % 5) * 0.14,
        phase: i * 0.87,
        blinkSpeed: 1.9 + (i % 4) * 0.55,
      });
    }
    lake.add(fireflyCoreIM, fireflyHaloIM);

    // 8. Colliders: keep player out of the water basin while keeping the bridge corridor walkable!
    const COL_RING = 28;
    for (let i = 0; i < COL_RING; i++) {
      const theta = (i / COL_RING) * Math.PI * 2;
      const r = getLakeShoreRadius(theta) - 0.65;
      const cx = LAKE_CENTER.x + Math.cos(theta) * r;
      const cz = LAKE_CENTER.z + Math.sin(theta) * r;
      // Leave the north bridge entrance corridor clear so player walks seamlessly onto the pier
      if (Math.abs(cx - PIER_X) < 1.35 && cz < 45.1) continue;
      colliders.push({type: 'circle', id: `lake_rim_${i}`, x: cx, z: cz, r: 1.05});
    }
    // Inner lake water blocker well past the pier tip
    colliders.push({type: 'circle', id: 'lake_center_a', x: LAKE_CENTER.x - 1.8, z: 48.2, r: 3.4});
    colliders.push({type: 'circle', id: 'lake_center_b', x: LAKE_CENTER.x + 2.2, z: 48.0, r: 3.4});
    // Left, right & far-tip guard rails on the wooden pier so player stays on the planks
    colliders.push({type: 'box', id: 'pier_rail_l', x: PIER_X - 1.18, z: 40.95, hw: 0.22, hd: 3.6});
    colliders.push({type: 'box', id: 'pier_rail_r', x: PIER_X + 1.18, z: 40.95, hw: 0.22, hd: 3.6});
    colliders.push({type: 'box', id: 'pier_tip_stop', x: PIER_X, z: 44.82, hw: 1.15, hd: 0.3});

    group.add(lake);
  }

  // ========== DISTRICT 5B: SẠP CÂU CÁ CỦA ANH KOI (Gần Hồ Câu) ==========
  {
    const STALL_X = -16.8;
    const STALL_Z = 37.2;
    const STALL_ROT_Y = Math.PI;
    const stall = new THREE.Group();
    stall.position.set(STALL_X, 0.02, STALL_Z);
    stall.rotation.y = STALL_ROT_Y;

    const timberDark = getMat('#7B4E2B', 0.74);
    const timberWarm = getMat('#B8804C', 0.68);
    const counterTopMat = getMat('#E8C59B', 0.56);
    const awningAqua = getMat('#4AA7B8', 0.58);
    const awningCream = getMat('#FFF6E3', 0.62);

    // Timber platform floor deck
    const deck = new THREE.Mesh(
      new RoundedBoxGeometry(3.4, 0.14, 2.35, 2, 0.04),
      getMat('#C89968', 0.76),
    );
    deck.position.y = 0.07;
    stall.add(deck);

    // 4 Corner Canopy Posts
    [
      [-1.48, -0.95],
      [1.48, -0.95],
      [-1.48, 0.95],
      [1.48, 0.95],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.08, 2.45, 8),
        timberDark,
      );
      post.position.set(px, 1.32, pz);
      stall.add(post);
    });

    // Crossbeams
    const beamF = new THREE.Mesh(new RoundedBoxGeometry(3.15, 0.1, 0.1, 2, 0.02), timberDark);
    beamF.position.set(0, 2.45, 0.95);
    const beamB = beamF.clone();
    beamB.position.z = -0.95;
    stall.add(beamF, beamB);

    // Sloped Striped Roof Canopy (Mái che)
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 2.58, 0.02);
    canopyGroup.rotation.x = 0.16;
    const roofTimberFrame = new THREE.Mesh(
      new RoundedBoxGeometry(3.55, 0.08, 2.52, 2, 0.03),
      timberWarm,
    );
    roofTimberFrame.position.y = -0.04;
    canopyGroup.add(roofTimberFrame);
    const stripeCount = 7;
    const stripeW = 3.44 / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(stripeW - 0.015, 0.11, 2.48, 2, 0.03),
        i % 2 === 0 ? awningAqua : awningCream,
      );
      stripe.position.set(-3.44 / 2 + stripeW * (i + 0.5), 0.03, 0);
      canopyGroup.add(stripe);
      // Scalloped front valance drop
      const scallop = new THREE.Mesh(
        new THREE.CylinderGeometry(stripeW * 0.48, stripeW * 0.48, 0.06, 10),
        i % 2 === 0 ? awningAqua : awningCream,
      );
      scallop.rotation.x = Math.PI / 2;
      scallop.position.set(-3.44 / 2 + stripeW * (i + 0.5), -0.04, 1.24);
      canopyGroup.add(scallop);
    }
    stall.add(canopyGroup);

    // Front Wooden Counter
    const counterBody = new THREE.Mesh(
      new RoundedBoxGeometry(2.55, 0.84, 0.72, 2, 0.05),
      timberWarm,
    );
    counterBody.position.set(0.15, 0.54, 0.42);
    const counterTop = new THREE.Mesh(
      new RoundedBoxGeometry(2.72, 0.1, 0.86, 2, 0.03),
      counterTopMat,
    );
    counterTop.position.set(0.15, 0.99, 0.42);
    stall.add(counterBody, counterTop);

    // Signboard on front roof gable showing fish & fish basket illustration
    const signBoard = new THREE.Mesh(
      new RoundedBoxGeometry(1.56, 0.78, 0.09, 2, 0.03),
      timberDark,
    );
    signBoard.position.set(0, 2.74, 1.28);
    const signFace = new THREE.Mesh(
      createAtlasPlaneGeometry(1.42, 0.68, 'koi_stall'),
      signAtlasMat,
    );
    signFace.position.set(0, 2.74, 1.33);
    stall.add(signBoard, signFace);

    // Small pouches / bags for sale (Các túi nhỏ) displayed on the counter
    const bagColors = ['#E07A5F', '#81B29A', '#F2CC8F', '#6FA8DC'];
    bagColors.forEach((col, bi) => {
      const bx = -0.82 + bi * 0.34;
      const pouch = new THREE.Group();
      pouch.position.set(bx, 1.12, 0.46 + (bi % 2 === 0 ? 0.06 : -0.05));
      pouch.rotation.y = (bi - 1.5) * 0.25;
      const sack = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        getMat(col, 0.76),
      );
      sack.scale.set(1, 1.2, 0.9);
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.045, 0.07, 8),
        getMat(col, 0.76),
      );
      collar.position.y = 0.11;
      const tieCord = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.012, 6, 10),
        getMat('#784A24', 0.7),
      );
      tieCord.rotation.x = Math.PI / 2;
      tieCord.position.y = 0.09;
      pouch.add(sack, collar, tieCord);
      stall.add(pouch);
    });

    // Small Succulent Pot (Chậu sen đá nhỏ) on the right side of counter
    const sucPotGroup = new THREE.Group();
    sucPotGroup.position.set(1.12, 1.04, 0.46);
    const clayPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.09, 0.16, 12),
      getMat('#D97D54', 0.72),
    );
    clayPot.position.y = 0.08;
    const potRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.018, 6, 14),
      getMat('#C86B43', 0.7),
    );
    potRim.rotation.x = Math.PI / 2;
    potRim.position.y = 0.16;
    const soilDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10),
      getMat('#5B4030', 0.9),
    );
    soilDisk.position.y = 0.155;
    sucPotGroup.add(clayPot, potRim, soilDisk);

    const succulentMat = glossyClayMat('#78C299', 0.42);
    const succulentTipMat = glossyClayMat('#9BE0B6', 0.38);
    // Outer ring of succulent rosette petals
    for (let p = 0; p < 7; p++) {
      const ang = (p / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 6), succulentMat);
      leaf.scale.set(0.78, 0.48, 1.38);
      leaf.position.set(Math.sin(ang) * 0.068, 0.18, Math.cos(ang) * 0.068);
      leaf.rotation.y = ang;
      leaf.rotation.x = -0.35;
      sucPotGroup.add(leaf);
    }
    // Inner succulent rosette petals
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2 + 0.35;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), succulentTipMat);
      leaf.scale.set(0.75, 0.55, 1.28);
      leaf.position.set(Math.sin(ang) * 0.032, 0.21, Math.cos(ang) * 0.032);
      leaf.rotation.y = ang;
      leaf.rotation.x = -0.62;
      sucPotGroup.add(leaf);
    }
    stall.add(sucPotGroup);

    // Fishing Rod Rack (Kệ đựng cần câu) on the left side of the stall
    const rackGroup = new THREE.Group();
    rackGroup.position.set(-1.38, 0.14, 0.08);
    const rackBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.08, 1.05, 2, 0.02),
      timberDark,
    );
    rackBase.position.y = 0.04;
    const rackBackL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.25, 7), timberDark);
    rackBackL.position.set(-0.14, 0.65, -0.44);
    const rackBackR = rackBackL.clone();
    rackBackR.position.z = 0.44;
    const rackBar = new THREE.Mesh(
      new RoundedBoxGeometry(0.12, 0.06, 1.02, 2, 0.02),
      timberWarm,
    );
    rackBar.position.set(-0.08, 1.15, 0);
    rackGroup.add(rackBase, rackBackL, rackBackR, rackBar);

    // 3 Wooden Fishing Rods leaning on the rack
    ['#BA8246', '#9E6837', '#D09B5A'].forEach((rodCol, ri) => {
      const rz = -0.32 + ri * 0.32;
      const rodStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.026, 1.95, 7),
        getMat(rodCol, 0.58),
      );
      rodStick.position.set(0.04, 0.98, rz);
      rodStick.rotation.z = 0.14;
      const reelWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10),
        glossyClayMat('#D6A24C', 0.25),
      );
      reelWheel.rotation.x = Math.PI / 2;
      reelWheel.position.set(0.1, 0.44, rz);
      rackGroup.add(rodStick, reelWheel);
    });
    stall.add(rackGroup);

    // Decorative woven fish basket sitting beside counter
    const sideBasket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.36, 12),
      getMat('#C88D4B', 0.8),
    );
    sideBasket.position.set(1.22, 0.32, 0.96);
    const sideBasketRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.028, 6, 14),
      getMat('#8F5A29', 0.76),
    );
    sideBasketRim.rotation.x = Math.PI / 2;
    sideBasketRim.position.set(1.22, 0.5, 0.96);
    stall.add(sideBasket, sideBasketRim);

    // Handsome NPC Koi standing behind the counter facing customers (+Z local)
    koiRig = buildAvatarRig(KOI_AVATAR);
    koiRig.root.position.set(0.12, 0.14, -0.45);
    koiRig.root.rotation.y = 0;
    updateAvatarRigAnimation(koiRig, 'idle', 0, false);
    stall.add(koiRig.root);

    // Click proxy for stall & Koi -> opens Koi's Fishing Shop Modal
    addInteractionProxy(
      stall,
      [3.65, 3.0, 2.55],
      1.45,
      {kind: 'koi_shop', tx: -16.8, tz: 35.15},
      clickTargets,
    );

    colliders.push({
      type: 'box',
      id: 'koi_stall',
      x: STALL_X,
      z: STALL_Z,
      hw: 1.85,
      hd: 1.25,
      rotY: STALL_ROT_Y,
    });

    mergeStaticGroupByMaterial(stall, koiRig ? new Set([koiRig.root]) : undefined);
    group.add(stall);
  }

  // ========== DISTRICT 6: TRẠM BƯU ĐIỆN & ĐỒNG HỒ (Taller Belfry Clock Tower & Post Office, 2 Tiers) ==========
  {
    const kiosk = new THREE.Group();
    kiosk.position.set(24, 0, 39.5);
    kiosk.rotation.y = 0;
    kiosk.scale.setScalar(1.88);

    const stoneBaseMat2 = getMat('#C8B8A4', 0.78);
    const brickLowerMat = getMat('#D88C6F', 0.74);
    const creamUpperMat = getMat('#F6E8D0', 0.68);
    const spireMat = getMat('#527496', 0.54);
    const woodDoorMat = getMat('#7D5333', 0.68);
    const goldMat = glossyClayMat('#FFD166', 0.24);

    const base = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.36, 2.9, 2, 0.06), stoneBaseMat2);
    base.position.y = 0.18;

    const lowerStory = new THREE.Mesh(
      new RoundedBoxGeometry(2.42, 1.72, 2.26, 2, 0.08),
      brickLowerMat,
    );
    lowerStory.position.y = 1.18;

    // 4 Corner stone pilasters for grand post-office silhouette
    [
      [-1.16, 1.08],
      [1.16, 1.08],
      [-1.16, -1.08],
      [1.16, -1.08],
    ].forEach(([px, pz]) => {
      const pilaster = new THREE.Mesh(new RoundedBoxGeometry(0.22, 1.74, 0.22, 2, 0.03), stoneBaseMat2);
      pilaster.position.set(px, 1.18, pz);
      kiosk.add(pilaster);
    });

    const midLedge = new THREE.Mesh(
      new RoundedBoxGeometry(2.68, 0.2, 2.5, 2, 0.04),
      stoneBaseMat2,
    );
    midLedge.position.y = 2.08;

    const tower = new THREE.Mesh(
      new RoundedBoxGeometry(1.94, 2.15, 1.94, 2, 0.08),
      creamUpperMat,
    );
    tower.position.y = 3.07;

    const belfryTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.14, 0.16, 2.14, 2, 0.04),
      stoneBaseMat2,
    );
    belfryTrim.position.y = 4.14;
    kiosk.add(belfryTrim);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.64, 2.25, 4), spireMat);
    spire.rotation.y = Math.PI / 4;
    spire.position.y = 5.18;

    const spireFinial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), goldMat);
    spireFinial.position.y = 6.38;

    // Grand Clock Face + Rim + 12 Brass Tick Marks + Hands
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.1, 18),
      getMat('#FFFFFF', 0.35),
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 3.12, 0.98);

    const clockRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.08, 8, 20),
      getMat('#6E4E34', 0.58),
    );
    clockRim.position.set(0, 3.12, 1.0);

    for (let h = 0; h < 12; h++) {
      const ang = (h / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), goldMat);
      tick.position.set(Math.sin(ang) * 0.48, 3.12 + Math.cos(ang) * 0.48, 1.04);
      kiosk.add(tick);
    }

    const handHour = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.3, 0.04), getMat('#2B2D42', 0.5));
    handHour.position.set(0, 3.24, 1.05);
    const handMin = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.04), getMat('#2B2D42', 0.5));
    handMin.position.set(0.15, 3.12, 1.05);

    // Post-office arched door + striped canopy + warm twin wall lanterns + royal red postbox + parcel crate
    const doorCanopy = createExtrudedRoof(1.48, 0.44, 0.78, spireMat);
    doorCanopy.position.set(0, 1.84, 1.32);
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.92, 1.38, 0.16, 2, 0.04), woodDoorMat);
    door.position.set(0, 1.0, 1.15);

    const postLanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.4,
      roughness: 0.25,
    });
    lampBulbs.push(postLanternMat);
    [-0.72, 0.72].forEach((lx) => {
      const lOrb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), postLanternMat);
      lOrb.position.set(lx, 1.48, 1.24);
      kiosk.add(lOrb);
    });

    const postbox = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 0.62, 7, 10),
      glossyClayMat('#D94F4F', 0.3),
    );
    postbox.scale.setScalar(1.12);
    postbox.position.set(1.4, 0.78, 0.68);

    const parcel = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.42, 0.44, 2, 0.04),
      getMat('#D9A566', 0.78),
    );
    parcel.position.set(-1.36, 0.56, 0.75);

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
      [4.4, 6.8, 3.8],
      2.8,
      {kind: 'settings', tx: 24, tz: 44.1},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'settings', x: 24, z: 39.5, hw: 3.25, hd: 2.88, rotY: 0});
    mergeStaticGroupByMaterial(kiosk);
    group.add(kiosk);
  }

  // ========== DISTRICT 6B: CỬA HÀNG THÚ CƯNG ("Pets" Hanging Side Sign + Large Puppy on Roof) ==========
  {
    const PET_X = 11.8;
    const PET_Z = 38.6;
    const petShop = new THREE.Group();
    petShop.position.set(PET_X, 0, PET_Z);
    petShop.scale.setScalar(1.72);

    const pPlinthMat = getMat('#E5D6C3', 0.78);
    const pWallMat = getMat('#FFF5E4', 0.7);
    const pTrimMat = getMat('#8C5A37', 0.72);
    const pRoofMat = getMat('#E57F5E', 0.56);
    const pRoofEdgeMat = getMat('#C35D3F', 0.58);
    const pTealMat = getMat('#5BB7B0', 0.54);
    const pCreamMat = getMat('#FFFBF2', 0.58);
    const pIronMat = getMat('#363940', 0.45, 0.45);
    const pGoldMat = glossyClayMat('#F4C95D', 0.24);

    // Base plinth & step (slightly wider so corner posts and wainscot sit squarely)
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(3.98, 0.32, 3.28, 2, 0.06),
      pPlinthMat,
    );
    plinth.position.y = 0.14;
    const frontStep = new THREE.Mesh(
      new RoundedBoxGeometry(1.45, 0.16, 0.52, 2, 0.04),
      pPlinthMat,
    );
    frontStep.position.set(0.74, 0.08, 1.78);

    // Main store body + wainscot + trim ledge + proud corner posts (zero coplanar Z-fighting)
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(3.52, 2.28, 2.78, 3, 0.09),
      pWallMat,
    );
    body.position.y = 1.43;

    const wainscot = new THREE.Mesh(
      new RoundedBoxGeometry(3.62, 0.56, 2.88, 2, 0.04),
      pTealMat,
    );
    wainscot.position.y = 0.56;

    const wainscotCap = new THREE.Mesh(
      new RoundedBoxGeometry(3.68, 0.08, 2.94, 2, 0.025),
      pCreamMat,
    );
    wainscotCap.position.y = 0.85;

    [
      [-1.73, 1.36],
      [1.73, 1.36],
      [-1.73, -1.36],
      [1.73, -1.36],
    ].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 2.3, 0.24, 2, 0.04),
        pTrimMat,
      );
      post.position.set(cx, 1.42, cz);
      petShop.add(post);
    });

    // Pitched cozy roof + dormer platform pedestal for the big puppy sculpture
    const roof = createExtrudedRoof(4.32, 1.56, 3.4, pRoofMat);
    roof.position.y = 3.25;
    const ridgeBeam = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.18, 3.54, 2, 0.04),
      pRoofEdgeMat,
    );
    ridgeBeam.position.y = 4.08;

    const puppyDeck = new THREE.Mesh(
      new RoundedBoxGeometry(1.88, 0.26, 1.78, 2, 0.05),
      pCreamMat,
    );
    puppyDeck.position.set(0, 3.92, 0.15);

    // ===== CHÚ CÚN CON TO TRÊN MÁI NHÀ (Large Sculpted Puppy on the Roof) =====
    const pupGroup = new THREE.Group();
    pupGroup.position.set(0, 4.06, 0.15);
    pupGroup.scale.setScalar(1.12);
    const pupFurMat = glossyClayMat('#F4C37A', 0.42);
    const pupBellyMat = glossyClayMat('#FFF6E3', 0.48);
    const pupEarMat = glossyClayMat('#A66135', 0.48);
    const pupNoseMat = glossyClayMat('#2D2522', 0.16);
    const pupCollarMat = glossyClayMat('#E45C65', 0.34);

    // Plump puppy tummy & chest lying contentedly on the roof terrace
    const pupBody = new THREE.Mesh(new THREE.SphereGeometry(0.56, 14, 12), pupFurMat);
    pupBody.scale.set(0.95, 0.78, 1.24);
    pupBody.position.set(0, 0.44, -0.05);

    const pupChest = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), pupBellyMat);
    pupChest.scale.set(0.92, 0.9, 0.85);
    pupChest.position.set(0, 0.56, 0.46);

    // Front chubby paws stretched forward + rear haunches
    [-0.28, 0.28].forEach((px) => {
      const fPaw = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 8), pupBellyMat);
      fPaw.scale.set(0.86, 0.65, 1.35);
      fPaw.position.set(px, 0.15, 0.72);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.42, 9), pupFurMat);
      leg.position.set(px, 0.32, 0.48);
      const hip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 8), pupFurMat);
      hip.scale.set(0.9, 0.8, 1.15);
      hip.position.set(px * 1.25, 0.24, -0.46);
      pupGroup.add(fPaw, leg, hip);
    });

    // Red collar + cute golden bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.068, 8, 18), pupCollarMat);
    collar.rotation.x = Math.PI / 2 - 0.18;
    collar.position.set(0, 0.82, 0.36);
    const collarBell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), pGoldMat);
    collarBell.position.set(0, 0.73, 0.72);

    // Big adorable round puppy head
    const pupHead = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 12), pupFurMat);
    pupHead.scale.set(1.06, 0.96, 1.0);
    pupHead.position.set(0, 1.18, 0.48);

    // Soft cream muzzle + shiny dark nose + happy cheeks
    const pupMuzzle = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 9), pupBellyMat);
    pupMuzzle.scale.set(1.18, 0.82, 0.92);
    pupMuzzle.position.set(0, 1.04, 0.96);

    const pupNose = new THREE.Mesh(new THREE.SphereGeometry(0.095, 9, 8), pupNoseMat);
    pupNose.scale.set(1.22, 0.85, 0.9);
    pupNose.position.set(0, 1.13, 1.19);

    const pupTongue = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), pupCollarMat);
    pupTongue.scale.set(0.9, 1.25, 0.6);
    pupTongue.position.set(0, 0.91, 1.12);

    // Floppy ears + expressive glossy dark eyes + rosy blush
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), pupEarMat);
      ear.scale.set(0.58, 1.5, 0.85);
      ear.position.set(side * 0.56, 1.16, 0.42);
      ear.rotation.z = side * -0.34;
      ear.rotation.x = 0.16;

      const eyePatch = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 7), pupEarMat);
      eyePatch.scale.set(1.1, 1.0, 0.4);
      if (side < 0) {
        eyePatch.position.set(side * 0.24, 1.25, 0.96);
        pupGroup.add(eyePatch);
      }

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 8), pupNoseMat);
      eye.position.set(side * 0.23, 1.25, 1.01);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), pCreamMat);
      glint.position.set(side * 0.21, 1.28, 1.07);

      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 7, 6),
        glossyClayMat('#FF9EAA', 0.45),
      );
      cheek.scale.set(1.1, 0.75, 0.45);
      cheek.position.set(side * 0.36, 1.08, 0.92);

      pupGroup.add(ear, eye, glint, cheek);
    });

    // Curved puppy tail at the back
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 8), pupEarMat);
    tail.position.set(0, 0.72, -0.74);
    tail.rotation.x = -0.68;
    tail.rotation.z = 0.25;

    pupGroup.add(pupBody, pupChest, collar, collarBell, pupHead, pupMuzzle, pupNose, pupTongue, tail);
    petShop.add(puppyDeck, pupGroup);

    // ===== BIỂN HIỆU TREO BÊN HÔNG CỬA HÀNG ("Pets") =====
    const sideSignGroup = new THREE.Group();
    sideSignGroup.position.set(-1.85, 2.02, 0.18);

    const wallPlate = new THREE.Mesh(
      new RoundedBoxGeometry(0.12, 0.42, 0.24, 2, 0.03),
      pIronMat,
    );
    const bracketBar = new THREE.Mesh(
      new RoundedBoxGeometry(1.18, 0.08, 0.08, 2, 0.02),
      pIronMat,
    );
    bracketBar.position.set(-0.58, 0.12, 0);
    const bracketBrace = new THREE.Mesh(
      new RoundedBoxGeometry(0.66, 0.055, 0.055, 2, 0.015),
      pIronMat,
    );
    bracketBrace.position.set(-0.26, -0.05, 0);
    bracketBrace.rotation.z = 0.62;

    [-0.95, -0.32].forEach((cx) => {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6),
        pIronMat,
      );
      chain.position.set(cx, 0.0, 0);
      sideSignGroup.add(chain);
    });

    const signFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.06, 0.56, 0.1, 2, 0.03),
      pTrimMat,
    );
    signFrame.position.set(-0.64, -0.34, 0);

    const petSignGeo = createAtlasPlaneGeometry(0.96, 0.48, 'pet_shop');
    const signFaceF = new THREE.Mesh(petSignGeo, signAtlasMat);
    signFaceF.position.set(-0.64, -0.34, 0.055);
    const signFaceB = new THREE.Mesh(petSignGeo.clone(), signAtlasMat);
    signFaceB.rotation.y = Math.PI;
    signFaceB.position.set(-0.64, -0.34, -0.055);

    const signLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.3,
        roughness: 0.25,
      }),
    );
    lampBulbs.push(signLantern.material as THREE.MeshStandardMaterial);
    signLantern.position.set(-1.12, 0.02, 0);

    sideSignGroup.add(wallPlate, bracketBar, bracketBrace, signFrame, signFaceF, signFaceB, signLantern);
    petShop.add(sideSignGroup);

    // Striped front awning (6 stripes)
    for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.18, 0.94, 2, 0.04),
        getMat(i % 2 === 0 ? '#5BB7B0' : '#FFFDF7', 0.55),
      );
      stripe.position.set(-1.4 + i * 0.56, 2.02, 1.72);
      stripe.rotation.x = 0.36;
      petShop.add(stripe);
    }

    // Display Window (Left) + Pet cushions & balls inside
    const dispFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.56, 1.18, 0.14, 2, 0.04),
      pCreamMat,
    );
    dispFrame.position.set(-0.74, 1.16, 1.42);
    const dispGlass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.98, 0.16), makeWinMat());
    dispGlass.position.set(-0.74, 1.16, 1.44);

    const miniBed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.14, 12),
      getMat('#F08A92', 0.7),
    );
    miniBed.position.set(-0.98, 0.78, 1.24);
    const toyBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pGoldMat);
    toyBall.position.set(-0.46, 0.8, 1.26);

    // Front Entry Door (Right) + Brass Handle
    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.06, 1.56, 0.16, 2, 0.04),
      pCreamMat,
    );
    doorFrame.position.set(0.74, 1.04, 1.42);
    const doorLeaf = new THREE.Mesh(
      new RoundedBoxGeometry(0.88, 1.42, 0.18, 2, 0.04),
      pTrimMat,
    );
    doorLeaf.position.set(0.74, 1.0, 1.44);
    const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), pGoldMat);
    doorKnob.position.set(0.46, 0.98, 1.55);

    // Side & Back framed windows
    const sideWinR = buildFramedWindow(0.86, 0.76, pTrimMat, makeWinMat());
    sideWinR.rotation.y = Math.PI / 2;
    sideWinR.position.set(1.78, 1.42, 0);
    const backWin = buildFramedWindow(1.12, 0.76, pTrimMat, makeWinMat());
    backWin.rotation.y = Math.PI;
    backWin.position.set(0, 1.42, -1.4);

    petShop.add(
      plinth,
      frontStep,
      body,
      wainscot,
      wainscotCap,
      roof,
      ridgeBeam,
      dispFrame,
      dispGlass,
      miniBed,
      toyBall,
      doorFrame,
      doorLeaf,
      doorKnob,
      sideWinR,
      backWin,
    );

    // Golden paw medallion on front gable + warm doorway lantern + twin terracotta planters
    const pawPad = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 8), pGoldMat);
    pawPad.scale.set(1.1, 0.9, 0.4);
    pawPad.position.set(0, 2.52, 1.44);
    petShop.add(pawPad);
    [-0.17, 0, 0.17].forEach((tx, ti) => {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.068, 7, 7), pGoldMat);
      toe.scale.set(1, 1, 0.45);
      toe.position.set(tx, 2.71 + (ti === 1 ? 0.04 : 0), 1.44);
      petShop.add(toe);
    });
    const doorLanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.4,
      roughness: 0.25,
    });
    lampBulbs.push(doorLanternMat);
    const doorLantern = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), doorLanternMat);
    doorLantern.position.set(0.74, 2.02, 1.56);
    petShop.add(doorLantern);

    [0.05, 1.44].forEach((px) => {
      const fPot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.2, 8), pRoofMat);
      fPot.position.set(px, 0.12, 1.85);
      const fLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 7), getMat('#66B872', 0.65));
      fLeaf.position.set(px, 0.29, 1.85);
      petShop.add(fPot, fLeaf);
    });

    addInteractionProxy(
      petShop,
      [5.4, 6.2, 4.5],
      2.6,
      {
        kind: 'zone',
        zone: 'petshop' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.petshop.tx,
        tz: TOWN_ZONE_ENTRANCES.petshop.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'petshop', x: PET_X, z: PET_Z, hw: 3.48, hd: 2.95, rotY: 0});
    mergeStaticGroupByMaterial(petShop);
    group.add(petShop);
  }

  // ========== DISTRICT 6: MAY MALL SKYSCRAPER (BITEXCO-INSPIRED TOWER + CANTILEVERED SKYDECK + EXTERIOR GLASS ELEVATOR) ==========
  let mallElevatorCabin: THREE.Group | null = null;
  const setMallElevatorY = (y: number) => {
    if (mallElevatorCabin) {
      mallElevatorCabin.position.y = y;
    }
  };
  {
    const mallStatic = new THREE.Group();
    const stonePlazaMat = getMat('#ECE7DD', 0.8);
    const podiumCreamMat = getMat('#FBF6EC', 0.62);
    const champagneMat = getMat('#D8C3A5', 0.48);
    const warmWoodMat = getMat('#B88456', 0.68);
    const silverSteelMat = getMat('#CFD8E2', 0.34);
    const darkSteelMat = getMat('#3D4D5E', 0.42);
    const goldAccentMat = getMat('#E5B85B', 0.34);
    const deckRimGlowMat = new THREE.MeshStandardMaterial({
      color: '#B5EAFF',
      emissive: '#58C4F6',
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    lampBulbs.push(deckRimGlowMat);

    const towerGlassMat = new THREE.MeshStandardMaterial({
      color: '#5DB5E0',
      emissive: '#2979B0',
      emissiveIntensity: 0.08,
      roughness: 0.14,
      metalness: 0.32,
    });
    windowMeshes.push(towerGlassMat);

    const skyGlassMat = new THREE.MeshStandardMaterial({
      color: '#BEEBFF',
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
    });

    // 1. Two-Step Travertine Forecourt Terrace (raised cleanly above green terrain to eliminate Z-fighting)
    const forecourtStep = new THREE.Mesh(
      new RoundedBoxGeometry(18.2, 0.14, 17.0, 2, 0.03),
      champagneMat,
    );
    forecourtStep.position.set(-52.75, 0.05, -2.5);
    const forecourtPad = new THREE.Mesh(
      new RoundedBoxGeometry(17.4, 0.14, 16.0, 2, 0.03),
      stonePlazaMat,
    );
    forecourtPad.position.set(-52.75, 0.14, -2.5);
    mallStatic.add(forecourtStep, forecourtPad);

    // 2. Two-Story Grand Mall Podium Base (x: -60.4..-49.0, z: -10.0..+5.0, top y = 7.40m)
    const podiumBase = new THREE.Mesh(
      new RoundedBoxGeometry(11.4, 7.2, 15.0, 3, 0.18),
      podiumCreamMat,
    );
    podiumBase.position.set(-54.7, 3.8, -2.5);
    const podiumPlinth = new THREE.Mesh(
      new RoundedBoxGeometry(11.8, 0.56, 15.4, 2, 0.06),
      champagneMat,
    );
    podiumPlinth.position.set(-54.7, 0.48, -2.5);
    const podiumRoofBand = new THREE.Mesh(
      new RoundedBoxGeometry(12.0, 0.44, 15.6, 2, 0.07),
      silverSteelMat,
    );
    podiumRoofBand.position.set(-54.7, 7.44, -2.5);
    mallStatic.add(podiumBase, podiumPlinth, podiumRoofBand);

    // Architectural Curtain-Wall Glass Storefront Bays on East Front, North, South & Back West Faces!
    const buildMallBayPanel = (w: number, h: number) => {
      const bay = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), towerGlassMat);
      const topMullion = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.14, 0.16), silverSteelMat);
      topMullion.position.y = h * 0.5;
      const botMullion = topMullion.clone();
      botMullion.position.y = -h * 0.5;
      [-w * 0.5, 0, w * 0.5].forEach((mx) => {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.11, h + 0.14, 0.16), champagneMat);
        mullion.position.x = mx;
        bay.add(mullion);
      });
      bay.add(glass, topMullion, botMullion);
      return bay;
    };

    // East Front upper/lower windows + decorative wood fins
    [1.6].forEach((wz) => {
      const storeBay = buildMallBayPanel(3.8, 2.55);
      storeBay.rotation.y = Math.PI / 2;
      storeBay.position.set(-48.94, 2.15, wz);
      const upperBay = buildMallBayPanel(3.8, 2.0);
      upperBay.rotation.y = Math.PI / 2;
      upperBay.position.set(-48.94, 5.25, wz);
      mallStatic.add(storeBay, upperBay);
    });
    const upperEntranceBay = buildMallBayPanel(3.8, 2.0);
    upperEntranceBay.rotation.y = Math.PI / 2;
    upperEntranceBay.position.set(-48.94, 5.25, -6.5);
    mallStatic.add(upperEntranceBay);

    // North (z = -10.02) & South (z = +5.02) curtain glass storefront bays + upper horizontal band
    [-1, 1].forEach((zSide) => {
      const zFace = zSide < 0 ? -10.02 : 5.02;
      [-57.5, -51.9].forEach((bx) => {
        const lowerSideBay = buildMallBayPanel(3.9, 2.5);
        lowerSideBay.position.set(bx, 2.18, zFace);
        const upperSideBay = buildMallBayPanel(3.9, 1.95);
        upperSideBay.position.set(bx, 5.25, zFace);
        mallStatic.add(lowerSideBay, upperSideBay);
      });
      const sideBand = new THREE.Mesh(
        new RoundedBoxGeometry(11.6, 0.24, 0.22, 1, 0.03),
        champagneMat,
      );
      sideBand.position.set(-54.7, 3.82, zFace);
      mallStatic.add(sideBand);
    });

    // West Back Wall (x = -60.42): Multi-bay glass panels, Service Exit Double Doors + Bollards + Awning
    {
      [-6.8, 1.8].forEach((bz) => {
        const backLower = buildMallBayPanel(4.1, 2.45);
        backLower.rotation.y = Math.PI / 2;
        backLower.position.set(-60.42, 2.18, bz);
        const backUpper = buildMallBayPanel(4.1, 1.95);
        backUpper.rotation.y = Math.PI / 2;
        backUpper.position.set(-60.42, 5.25, bz);
        mallStatic.add(backLower, backUpper);
      });
      const backUpperMid = buildMallBayPanel(3.2, 1.95);
      backUpperMid.rotation.y = Math.PI / 2;
      backUpperMid.position.set(-60.42, 5.25, -2.5);
      const backBand = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.24, 15.2, 1, 0.03),
        champagneMat,
      );
      backBand.position.set(-60.42, 3.82, -2.5);
      // Rear Service Door & Safety Bollards (depth-stepped layers so zero Z-fighting)
      const svcBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.38, 1.94), darkSteelMat);
      svcBack.position.set(-60.44, 1.44, -2.5);
      const svcJambL = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.55, 0.16, 2, 0.03), darkSteelMat);
      svcJambL.position.set(-60.49, 1.48, -3.52);
      const svcJambR = svcJambL.clone();
      svcJambR.position.z = -1.48;
      const svcLintel = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.2, 2.24, 2, 0.03), darkSteelMat);
      svcLintel.position.set(-60.49, 2.66, -2.5);
      [-2.98, -2.02].forEach((lz) => {
        const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.32, 0.92), silverSteelMat);
        doorLeaf.position.set(-60.53, 1.44, lz);
        const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.11, 10), skyGlassMat);
        porthole.rotation.z = Math.PI / 2;
        porthole.position.set(-60.55, 1.88, lz);
        mallStatic.add(doorLeaf, porthole);
      });
      const svcMullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.34, 0.06), darkSteelMat);
      svcMullion.position.set(-60.56, 1.44, -2.5);
      [-2.62, -2.38].forEach((hz) => {
        const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.045), goldAccentMat);
        hdl.position.set(-60.59, 1.32, hz);
        mallStatic.add(hdl);
      });
      const svcCanopy = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.16, 2.6, 2, 0.03), silverSteelMat);
      svcCanopy.position.set(-60.95, 2.95, -2.5);
      [-3.95, -1.05].forEach((bolZ) => {
        const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.85, 8), getMat('#F2B138', 0.4));
        bol.position.set(-61.05, 0.62, bolZ);
        mallStatic.add(bol);
      });
      // Rooftop HVAC Chiller Boxes on podium roof (x = -58.5, y = 7.7)
      [-6.5, 1.5].forEach((hz) => {
        const hvac = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.92, 2.4, 2, 0.05), silverSteelMat);
        hvac.position.set(-58.2, 8.1, hz);
        const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 12), darkSteelMat);
        vent.position.set(-58.2, 8.62, hz);
        mallStatic.add(hvac, vent);
      });
      mallStatic.add(backUpperMid, backBand, svcBack, svcJambL, svcJambR, svcLintel, svcMullion, svcCanopy);
    }

    // Fire Extinguisher Station ("Bình Cứu Hỏa") on South-East Mall Wall & South Wall
    const fireCabinetRedMat = getMat('#D63434', 0.36);
    const fireNozzleMat = getMat('#242A30', 0.45, 0.5);
    [
      {fx: -48.72, fz: 4.55, rotY: Math.PI / 2},
      {fx: -54.7, fz: 5.18, rotY: 0},
    ].forEach(({fx, fz, rotY}) => {
      const feGroup = new THREE.Group();
      feGroup.position.set(fx, 0.21, fz);
      feGroup.rotation.y = rotY;
      const stand = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.08, 0.34, 1, 0.02), fireCabinetRedMat);
      stand.position.y = 0.04;
      [-0.14, 0.14].forEach((cx) => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.64, 12), fireCabinetRedMat);
        tank.position.set(cx, 0.4, 0.02);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), fireCabinetRedMat);
        cap.position.set(cx, 0.72, 0.02);
        const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 8), goldAccentMat);
        valve.position.set(cx, 0.84, 0.02);
        const hose = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI * 0.8), fireNozzleMat);
        hose.position.set(cx + 0.04, 0.72, 0.08);
        feGroup.add(tank, cap, valve, hose);
      });
      const hoseCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.58, 0.2, 2, 0.03), fireCabinetRedMat);
      hoseCabinet.position.set(0, 1.38, -0.02);
      const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.22), skyGlassMat);
      cabGlass.position.set(0, 1.38, -0.01);
      feGroup.add(stand, hoseCabinet, cabGlass);
      mallStatic.add(feGroup);
    });

    for (let s = 0; s < 5; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.4, 0.18), warmWoodMat);
      slat.position.set(-48.92, 3.95, -9.2 + s * 0.42);
      const slatR = slat.clone();
      slatR.position.z = 2.6 + s * 0.42;
      mallStatic.add(slat, slatR);
    }

    // Polished Main East Mall Entrance Door & Glowing Lobby Portal (at z = -6.5, clean non-overlapping layers)
    const lobbyGlowMat = new THREE.MeshStandardMaterial({
      color: '#F5DFB8',
      emissive: '#F2B863',
      emissiveIntensity: 0.26,
      roughness: 0.85,
      metalness: 0,
    });
    lampBulbs.push(lobbyGlowMat);
    const doorTintGlassMat = new THREE.MeshStandardMaterial({
      color: '#7BB6D4',
      roughness: 0.55,
      metalness: 0.0,
      transparent: true,
      opacity: 0.36,
    });

    const canopy = new THREE.Mesh(
      new RoundedBoxGeometry(2.55, 0.28, 4.4, 2, 0.05),
      silverSteelMat,
    );
    canopy.position.set(-47.82, 3.65, -6.5);
    const canopyGoldTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.6, 0.08, 4.44, 2, 0.02),
      goldAccentMat,
    );
    canopyGoldTrim.position.set(-47.82, 3.53, -6.5);

    // Outer Champagne Portal Jambs + Lintel (open center so nothing overlaps door glass!)
    const portalJambL = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 3.04, 0.32, 2, 0.04),
      champagneMat,
    );
    portalJambL.position.set(-48.88, 1.72, -7.96);
    const portalJambR = portalJambL.clone();
    portalJambR.position.z = -5.04;
    const portalLintel = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.34, 3.24, 2, 0.04),
      champagneMat,
    );
    portalLintel.position.set(-48.88, 3.16, -6.5);

    // Inner Dark-Steel Door Frame Jambs + Header + Threshold Sill
    const doorJambL = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 2.74, 0.16, 2, 0.03),
      darkSteelMat,
    );
    doorJambL.position.set(-48.86, 1.58, -7.72);
    const doorJambR = doorJambL.clone();
    doorJambR.position.z = -5.28;
    const doorHeader = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.22, 2.66, 2, 0.03),
      darkSteelMat,
    );
    doorHeader.position.set(-48.86, 2.9, -6.5);
    const doorSill = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.08, 2.86, 2, 0.02),
      champagneMat,
    );
    doorSill.position.set(-48.82, 0.24, -6.5);

    // Matte Warm Interior Lobby Backdrop cleanly in front of podium wall (x = -49.00)
    const doorWarmLobby = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 2.54, 2.34),
      lobbyGlowMat,
    );
    doorWarmLobby.position.set(-48.94, 1.54, -6.5);

    // Two Distinct Semi-Transparent Tinted Glass Door Leaves cleanly forward of backdrop
    [-7.08, -5.92].forEach((leafZ) => {
      const glassLeaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.5, 1.1),
        doorTintGlassMat,
      );
      glassLeaf.position.set(-48.8, 1.53, leafZ);
      mallStatic.add(glassLeaf);
    });
    const doorMullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.56, 0.08), silverSteelMat);
    doorMullion.position.set(-48.79, 1.54, -6.5);
    [-6.3, -6.7].forEach((hz) => {
      const dHandle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.055), goldAccentMat);
      dHandle.position.set(-48.72, 1.42, hz);
      mallStatic.add(dHandle);
    });
    // Flanking Mall Entrance Topiary Planters
    [-8.35, -4.65].forEach((pz) => {
      const planter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.22, 0.44, 10),
        champagneMat,
      );
      planter.position.set(-48.3, 0.43, pz);
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 10, 8),
        getMat('#5DA865', 0.72),
      );
      foliage.position.set(-48.3, 0.88, pz);
      mallStatic.add(planter, foliage);
    });
    // Sleek Mall Red-Gold Entry Welcome Runner Mat + Front Bollard Lights
    const entryMat = new THREE.Mesh(
      new RoundedBoxGeometry(2.5, 0.025, 2.75, 1, 0.01),
      getMat('#B9464E', 0.85),
    );
    entryMat.position.set(-47.4, 0.215, -6.5);
    const entryMatTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.6, 0.02, 2.86, 1, 0.01),
      goldAccentMat,
    );
    entryMatTrim.position.set(-47.4, 0.212, -6.5);
    [-9.45, -4.15].forEach((bz) => {
      const bolPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.85, 8), darkSteelMat);
      bolPost.position.set(-44.65, 0.63, bz);
      const bolGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.18, 8), lobbyGlowMat);
      bolGlow.position.set(-44.65, 0.94, bz);
      mallStatic.add(bolPost, bolGlow);
    });
    mallStatic.add(
      entryMatTrim,
      entryMat,
      canopy,
      canopyGoldTrim,
      portalJambL,
      portalJambR,
      portalLintel,
      doorJambL,
      doorJambR,
      doorHeader,
      doorSill,
      doorWarmLobby,
      doorMullion,
    );

    // Crisp Signboard "MAY MALL" over East Entrance Canopy (facing +X)
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#18344E';
      sctx.fillRect(0, 0, 512, 128);
      sctx.strokeStyle = '#FFD166';
      sctx.lineWidth = 8;
      sctx.strokeRect(8, 8, 496, 112);
      sctx.fillStyle = '#FFF9E8';
      sctx.font = '900 62px "Segoe UI", system-ui, sans-serif';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillText('MAY MALL', 256, 66);
    }
    const mallSignTex = new THREE.CanvasTexture(signCanvas);
    mallSignTex.colorSpace = THREE.SRGBColorSpace;
    const mallSignBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.88),
      new THREE.MeshBasicMaterial({map: mallSignTex}),
    );
    mallSignBoard.position.set(-46.52, 4.26, -6.5);
    mallSignBoard.rotation.y = Math.PI / 2;
    group.add(mallSignBoard);

    const entranceHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 3.1, 3.0),
      new THREE.MeshBasicMaterial({visible: false}),
    );
    entranceHit.position.set(-48.45, 1.75, -6.5);
    entranceHit.userData = {
      kind: 'mall_entrance',
      tx: -46.3,
      tz: -6.5,
    };
    group.add(entranceHit);
    clickTargets.push(entranceHit);

    // 3. Bitexco-Inspired Tapered Glass Skyscraper Tower (Starts cleanly ABOVE podium at y = 7.45, spine recessed at x = -49.08 so NO podium Z-fighting!)
    const TOWER_BASE_Y = 7.45;
    const TOWER_H = 33.4;
    const RINGS = 24;
    const SEGS = 40;
    const FLAT_LOCAL_X = 5.12; // World x = -54.2 + 5.12 = -49.08 (recessed cleanly behind podium wall x = -49.0)
    const positions: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r <= RINGS; r++) {
      const v = r / RINGS;
      const rx = THREE.MathUtils.lerp(5.2, 2.45, Math.pow(v, 0.88));
      const rz = THREE.MathUtils.lerp(6.05, 2.95, Math.pow(v, 0.88));
      const shiftX = v * 0.42;
      for (let s = 0; s <= SEGS; s++) {
        const theta = (s / SEGS) * Math.PI * 2;
        let lx = Math.cos(theta) * rx + shiftX;
        const lz = Math.sin(theta) * rz;
        if (lx > FLAT_LOCAL_X) {
          lx = FLAT_LOCAL_X;
        }
        const maxTopY = TOWER_H + (FLAT_LOCAL_X - lx) * 0.48;
        const ly = TOWER_BASE_Y + v * (maxTopY - TOWER_BASE_Y);
        positions.push(MALL_CENTER.x + lx, ly, MALL_CENTER.z + lz);
      }
    }
    const stride = SEGS + 1;
    for (let r = 0; r < RINGS; r++) {
      for (let s = 0; s < SEGS; s++) {
        const a = r * stride + s;
        const b = a + stride;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c, c, b, d);
      }
    }
    const towerHullGeo = new THREE.BufferGeometry();
    towerHullGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    towerHullGeo.setIndex(indices);
    towerHullGeo.computeVertexNormals();
    const towerHull = new THREE.Mesh(towerHullGeo, towerGlassMat);
    mallStatic.add(towerHull);

    // Architectural Vertical Spine & Curtain Mullion Fins on Tower
    [-3.15, -1.65, 1.65, 3.15].forEach((mz) => {
      const eastFin = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 24.4, 0.14),
        silverSteelMat,
      );
      eastFin.position.set(MALL_CENTER.x + FLAT_LOCAL_X + 0.04, 19.8, MALL_CENTER.z + mz);
      mallStatic.add(eastFin);
    });

    // Slanted Glass Crown Cap + Sleek Architectural Spire Fin (reaching y = 38.5m)
    const crownCapGeo = new THREE.CylinderGeometry(2.65, 2.75, 0.34, 28);
    const crownCap = new THREE.Mesh(crownCapGeo, silverSteelMat);
    crownCap.position.set(MALL_CENTER.x + 1.2, 34.45, MALL_CENTER.z);
    crownCap.rotation.z = -0.38;
    const crownSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.22, 3.8, 10),
      silverSteelMat,
    );
    crownSpire.position.set(MALL_CENTER.x - 0.85, 36.6, MALL_CENTER.z);
    const spireBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({
        color: '#FFE799',
        emissive: '#FFAA33',
        emissiveIntensity: 1.35,
        roughness: 0.2,
      }),
    );
    spireBeacon.position.set(MALL_CENTER.x - 0.85, 38.55, MALL_CENTER.z);
    mallStatic.add(crownCap, crownSpire, spireBeacon);

    // Sleek Hollow White Structural Collar Rings Around Tapered Tower (zero inward clipping or sinking!)
    const whiteRingMat = getMat('#F6FAFE', 0.34, 0.25);
    for (let lvl = 1; lvl <= 9; lvl++) {
      const y = 7.65 + lvl * 2.55;
      if (y > 31.8) break;
      if (y >= MALL_DECK_Y - 1.15 && y <= MALL_DECK_Y + 0.85) continue;
      const bandShape = new THREE.Shape();
      const innerHole = new THREE.Path();
      const B_SEGS = 40;
      for (let s = 0; s <= B_SEGS; s++) {
        const theta = (s / B_SEGS) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        // Estimate exact tower surface radius at (y, cosT) accounting for sloped tower crown height!
        const vRough = THREE.MathUtils.clamp((y - TOWER_BASE_Y) / (TOWER_H - TOWER_BASE_Y), 0, 1);
        const rxRough = THREE.MathUtils.lerp(5.2, 2.45, Math.pow(vRough, 0.88));
        const lxApprox = Math.min(FLAT_LOCAL_X, cosT * rxRough + vRough * 0.42);
        const maxTopY = TOWER_H + (FLAT_LOCAL_X - lxApprox) * 0.48;
        const v = THREE.MathUtils.clamp((y - TOWER_BASE_Y) / (maxTopY - TOWER_BASE_Y), 0, 1);
        const rx = THREE.MathUtils.lerp(5.2, 2.45, Math.pow(v, 0.88));
        const rz = THREE.MathUtils.lerp(6.05, 2.95, Math.pow(v, 0.88));
        const shiftX = v * 0.42;

        const outRx = rx + 0.095;
        const outRz = rz + 0.095;
        const inRx = Math.max(0.4, rx - 0.14);
        const inRz = Math.max(0.4, rz - 0.14);

        const obx = Math.min(FLAT_LOCAL_X + 0.095, cosT * outRx + shiftX);
        const obz = sinT * outRz;
        if (s === 0) bandShape.moveTo(obx, -obz);
        else bandShape.lineTo(obx, -obz);

        const thetaRev = (1 - s / B_SEGS) * Math.PI * 2;
        const ibx = Math.min(FLAT_LOCAL_X - 0.14, Math.cos(thetaRev) * inRx + shiftX);
        const ibz = Math.sin(thetaRev) * inRz;
        if (s === 0) innerHole.moveTo(ibx, -ibz);
        else innerHole.lineTo(ibx, -ibz);
      }
      bandShape.holes.push(innerHole);
      const bandGeo = new THREE.ExtrudeGeometry(bandShape, {
        depth: 0.16,
        bevelEnabled: false,
      });
      bandGeo.rotateX(-Math.PI / 2);
      const bandMesh = new THREE.Mesh(bandGeo, whiteRingMat);
      bandMesh.position.set(MALL_CENTER.x, y, MALL_CENTER.z);
      mallStatic.add(bandMesh);
    }

    // 4. Cantilevered Circular Bitexco Skydeck Observation Platform at y = 25.0 (Clipped cleanly at x >= -49.05 so NO overlap with tower!)
    const DECK_R = 5.35;
    const createClippedDeckGeo = (radius: number, height: number, minLocalX: number) => {
      const shape = new THREE.Shape();
      const segs = 48;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const sx = Math.max(minLocalX, Math.cos(a) * radius);
        const sy = Math.sin(a) * radius;
        if (i === 0) shape.moveTo(sx, sy);
        else shape.lineTo(sx, sy);
      }
      const geo = new THREE.ExtrudeGeometry(shape, {depth: height, bevelEnabled: false});
      geo.rotateX(-Math.PI / 2);
      return geo;
    };

    const deckUnderFrame = new THREE.Mesh(
      createClippedDeckGeo(DECK_R + 0.06, 0.56, -3.65),
      silverSteelMat,
    );
    deckUnderFrame.position.set(MALL_DECK_CENTER.x, MALL_DECK_Y - 0.70, MALL_DECK_CENTER.z);

    // 4 Sweeping Diagonal Structural Support Struts under Cantilevered Skydeck
    [-3.1, -1.0, 1.0, 3.1].forEach((zOff) => {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 0.34, 0.34),
        silverSteelMat,
      );
      strut.position.set(-46.85, MALL_DECK_Y - 2.02, MALL_DECK_CENTER.z + zOff * 0.75);
      strut.rotation.z = 0.56;
      mallStatic.add(strut);
    });

    // Rim LED Trim Segments around outer East/North/South edge of Skydeck (clipped cleanly clear of tower)
    const RIM_SEGS = 28;
    for (let i = 0; i < RIM_SEGS; i++) {
      const a0 = (i / RIM_SEGS) * Math.PI * 2;
      const a1 = ((i + 1) / RIM_SEGS) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;
      const rx = MALL_DECK_CENTER.x + Math.cos(aMid) * (DECK_R + 0.04);
      if (rx < -48.92) continue;
      const rz = MALL_DECK_CENTER.z + Math.sin(aMid) * (DECK_R + 0.04);
      const segLen = 2 * (DECK_R + 0.04) * Math.sin(Math.PI / RIM_SEGS) + 0.04;
      const rimSeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, segLen), deckRimGlowMat);
      rimSeg.position.set(rx, MALL_DECK_Y - 0.07, rz);
      rimSeg.rotation.y = -aMid;
      mallStatic.add(rimSeg);
    }
    mallStatic.add(deckUnderFrame);

    // Walkable Skydeck Floor Surface (kept unmerged for crisp raycasting in pierWalkableMeshes)
    const deckFloor = new THREE.Mesh(
      createClippedDeckGeo(DECK_R, 0.14, -3.65),
      stonePlazaMat,
    );
    deckFloor.position.set(MALL_DECK_CENTER.x, MALL_DECK_Y - 0.14, MALL_DECK_CENTER.z);
    deckFloor.userData = {kind: 'ground', isMallDeck: true};
    group.add(deckFloor);
    pierWalkableMeshes.push(deckFloor);

    // Skydeck Glass Safety Parapet Balustrade + Brushed Silver Handrail (leaving West elevator door gap open)
    const RAIL_SEGMENTS = 28;
    for (let i = 0; i < RAIL_SEGMENTS; i++) {
      const a0 = (i / RAIL_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / RAIL_SEGMENTS) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;
      const mx = MALL_DECK_CENTER.x + Math.cos(aMid) * (DECK_R - 0.18);
      const mz = MALL_DECK_CENTER.z + Math.sin(aMid) * (DECK_R - 0.18);
      if (mx < -48.8) continue;
      if (mx < -46.8 && Math.abs(mz - MALL_ELEVATOR_CAB_POS.z) < 1.32) continue;

      const segLen = 2 * (DECK_R - 0.18) * Math.sin(Math.PI / RAIL_SEGMENTS) + 0.04;
      const railPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.96, segLen),
        skyGlassMat,
      );
      railPanel.position.set(mx, MALL_DECK_Y + 0.5, mz);
      railPanel.rotation.y = -aMid;

      const railTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.07, segLen + 0.04),
        silverSteelMat,
      );
      railTop.position.set(mx, MALL_DECK_Y + 1.0, mz);
      railTop.rotation.y = -aMid;

      const postX = MALL_DECK_CENTER.x + Math.cos(a0) * (DECK_R - 0.18);
      if (postX >= -48.85) {
        const railPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.045, 1.04, 8),
          silverSteelMat,
        );
        railPost.position.set(
          postX,
          MALL_DECK_Y + 0.52,
          MALL_DECK_CENTER.z + Math.sin(a0) * (DECK_R - 0.18),
        );
        mallStatic.add(railPost);
      }
      group.add(railPanel);
      mallStatic.add(railTop);
    }

    // Rooftop Furnishing 1: ONE Interactive Scenic Brass Telescope facing skyline
    {
      const teleAng = -0.36;
      const teleX = MALL_DECK_CENTER.x + Math.cos(teleAng) * 4.1;
      const teleZ = MALL_DECK_CENTER.z + Math.sin(teleAng) * 4.1;
      const teleWalkX = MALL_DECK_CENTER.x + Math.cos(teleAng) * 3.15;
      const teleWalkZ = MALL_DECK_CENTER.z + Math.sin(teleAng) * 3.15;
      const teleFaceRot = Math.atan2(teleX - teleWalkX, teleZ - teleWalkZ);

      const teleGroup = new THREE.Group();
      teleGroup.position.set(teleX, MALL_DECK_Y, teleZ);
      teleGroup.rotation.y = -teleAng;

      const baseRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.1, 14),
        darkSteelMat,
      );
      baseRing.position.y = 0.05;
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.12, 1.06, 12),
        silverSteelMat,
      );
      stand.position.y = 0.58;
      const mountYoke = new THREE.Mesh(
        new RoundedBoxGeometry(0.16, 0.16, 0.18, 2, 0.03),
        darkSteelMat,
      );
      mountYoke.position.y = 1.14;
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.055, 0.72, 14),
        goldAccentMat,
      );
      barrel.rotation.z = -(Math.PI / 2 - 0.24);
      barrel.position.set(0.04, 1.24, 0);
      const lensRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14),
        darkSteelMat,
      );
      lensRim.rotation.z = -(Math.PI / 2 - 0.24);
      lensRim.position.set(0.39, 1.32, 0);
      const lensGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.04, 12),
        towerGlassMat,
      );
      lensGlass.rotation.z = -(Math.PI / 2 - 0.24);
      lensGlass.position.set(0.42, 1.33, 0);

      teleGroup.add(baseRing, stand, mountYoke, barrel, lensRim, lensGlass);
      mallStatic.add(teleGroup);

      const teleHit = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.55, 0.95),
        new THREE.MeshBasicMaterial({visible: false}),
      );
      teleHit.position.set(teleX, MALL_DECK_Y + 0.78, teleZ);
      teleHit.userData = {
        kind: 'outdoor_telescope',
        tx: teleWalkX,
        tz: teleWalkZ,
        faceRotY: teleFaceRot,
      };
      group.add(teleHit);
      clickTargets.push(teleHit);
    }

    // Rooftop Furnishing 2: ONE Skydeck Café Table + 2 Cushioned Chairs with Food & Sun Umbrella (Dù Che)
    {
      const cafeX = -43.9;
      const cafeZ = -0.25;
      const cafeGroup = new THREE.Group();
      cafeGroup.position.set(cafeX, MALL_DECK_Y, cafeZ);

      // Marble Bistro Table + Pedestal
      const tblBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 0.08, 16),
        darkSteelMat,
      );
      tblBase.position.y = 0.04;
      const tblStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.075, 0.68, 12),
        darkSteelMat,
      );
      tblStem.position.y = 0.4;
      const tblTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.56, 0.07, 24),
        podiumCreamMat,
      );
      tblTop.position.y = 0.74;
      const tblRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.57, 0.025, 8, 28),
        goldAccentMat,
      );
      tblRim.rotation.x = Math.PI / 2;
      tblRim.position.y = 0.74;
      cafeGroup.add(tblBase, tblStem, tblTop, tblRim);

      // Tall Striped Sun Umbrella (Dù che) raised spaciously above standing head height
      const poleMat = champagneMat;
      const umbrellaPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.038, 2.28, 10),
        poleMat,
      );
      umbrellaPole.position.y = 1.9;
      cafeGroup.add(umbrellaPole);

      const UMB_Y = 2.98;
      const canopyAquaMat = getMat('#4BA8C8', 0.52);
      const canopyCreamMat = getMat('#FFFDF7', 0.56);
      const umbBaseCanopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.48, 0.44, 8),
        canopyCreamMat,
      );
      umbBaseCanopy.position.y = UMB_Y;
      cafeGroup.add(umbBaseCanopy);
      for (let w = 0; w < 4; w++) {
        const wedge = new THREE.Mesh(
          new THREE.ConeGeometry(1.495, 0.442, 2, 1, false, 0, Math.PI / 4),
          canopyAquaMat,
        );
        wedge.rotation.y = (w / 4) * Math.PI * 2;
        wedge.position.y = UMB_Y + 0.008;
        cafeGroup.add(wedge);
      }
      const umbTrimRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.48, 0.032, 6, 16),
        goldAccentMat,
      );
      umbTrimRing.rotation.x = Math.PI / 2;
      umbTrimRing.position.y = UMB_Y - 0.22;
      const umbFinial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), goldAccentMat);
      umbFinial.position.y = UMB_Y + 0.25;
      cafeGroup.add(umbTrimRing, umbFinial);

      // Delicious Food & Drinks on the Table (Plate of pastries/croissant + 2 berry drinks)
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.18, 0.03, 16),
        getMat('#FFFDF9', 0.35),
      );
      plate.position.set(0, 0.79, -0.06);
      const croissant = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.032, 8, 12, Math.PI * 1.15),
        getMat('#D98B42', 0.65),
      );
      croissant.rotation.x = Math.PI / 2;
      croissant.rotation.z = 0.4;
      croissant.position.set(-0.04, 0.82, -0.07);
      const tartCrust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.045, 10),
        getMat('#E5AC63', 0.65),
      );
      tartCrust.position.set(0.08, 0.82, -0.03);
      const tartBerry = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 8, 8),
        getMat('#E04E66', 0.45),
      );
      tartBerry.position.set(0.08, 0.85, -0.03);
      cafeGroup.add(plate, croissant, tartCrust, tartBerry);

      [
        [-0.28, 0.16, '#FF7B8E'],
        [0.28, 0.16, '#64C7B5'],
      ].forEach(([gx, gz, drinkCol]) => {
        const coaster = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.015, 12),
          champagneMat,
        );
        coaster.position.set(gx as number, 0.78, gz as number);
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.052, 0.042, 0.13, 10),
          getMat(drinkCol as string, 0.25),
        );
        cup.position.set(gx as number, 0.85, gz as number);
        const straw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6),
          getMat('#FFFFFF', 0.35),
        );
        straw.position.set((gx as number) + 0.015, 0.92, gz as number);
        straw.rotation.z = -0.22;
        cafeGroup.add(coaster, cup, straw);
      });

      mallStatic.add(cafeGroup);

      // 2 Interactive Cushioned Café Chairs flanking the table
      [
        {ox: -0.96, oz: 0.12, standOx: -0.96, standOz: 0.82},
        {ox: 0.96, oz: 0.12, standOx: 0.96, standOz: 0.82},
      ].forEach(({ox, oz, standOx, standOz}) => {
        const chairX = cafeX + ox;
        const chairZ = cafeZ + oz;
        const chairRotY = Math.atan2(-ox, -oz);
        const chairGroup = new THREE.Group();
        chairGroup.position.set(chairX, MALL_DECK_Y, chairZ);
        chairGroup.rotation.y = chairRotY;

        const seatFrame = new THREE.Mesh(
          new RoundedBoxGeometry(0.52, 0.07, 0.5, 2, 0.02),
          warmWoodMat,
        );
        seatFrame.position.y = 0.42;
        const cushion = new THREE.Mesh(
          new RoundedBoxGeometry(0.46, 0.08, 0.44, 2, 0.03),
          getMat('#F9E3C6', 0.72),
        );
        cushion.position.y = 0.48;
        const backRest = new THREE.Mesh(
          new RoundedBoxGeometry(0.5, 0.44, 0.07, 2, 0.025),
          warmWoodMat,
        );
        backRest.position.set(0, 0.68, -0.21);
        backRest.rotation.x = -0.1;
        [
          [-0.2, -0.19],
          [0.2, -0.19],
          [-0.2, 0.19],
          [0.2, 0.19],
        ].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.026, 0.022, 0.42, 7),
            darkSteelMat,
          );
          leg.position.set(lx, 0.21, lz);
          chairGroup.add(leg);
        });
        chairGroup.add(seatFrame, cushion, backRest);
        mallStatic.add(chairGroup);

        const chairHit = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.95, 0.68),
          new THREE.MeshBasicMaterial({visible: false}),
        );
        chairHit.position.set(chairX, MALL_DECK_Y + 0.48, chairZ);
        chairHit.userData = {
          kind: 'bench',
          tx: cafeX + standOx,
          tz: cafeZ + standOz,
          seatX: chairX,
          seatZ: chairZ,
          seatY: MALL_DECK_Y + 0.50,
          sitRotY: chairRotY,
        };
        group.add(chairHit);
        clickTargets.push(chairHit);
      });
    }

    // Rooftop Furnishing 3: Static Clay Parachute Jump Stand ("Điểm Nhảy Dù") on South-East Skydeck
    {
      const px = -41.9;
      const pz = 2.6;
      const pStand = new THREE.Group();
      pStand.position.set(px, MALL_DECK_Y, pz);

      const padRing = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.06, 18), getMat('#66C7E8', 0.52));
      padRing.position.y = 0.03;
      const padCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.075, 16), getMat('#FFF6E3', 0.65));
      padCenter.position.y = 0.04;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.062, 1.52, 8), darkSteelMat);
      pole.position.y = 0.78;
      const poleCap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), goldAccentMat);
      poleCap.position.y = 1.56;

      // Mini Sculpted Coral & Cream Parachute Emblem atop Stand
      const miniChute = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
        getMat('#F26B5B', 0.45),
      );
      miniChute.scale.set(1.08, 0.76, 1.08);
      miniChute.position.set(0, 1.62, 0);
      const miniStripe = new THREE.Mesh(
        new THREE.SphereGeometry(0.386, 8, 6, 0, Math.PI * 0.48, 0, Math.PI * 0.54),
        getMat('#FFF6E3', 0.48),
      );
      miniStripe.scale.set(1.08, 0.76, 1.08);
      miniStripe.position.set(0, 1.62, 0);

      // Folded Parachute Backpack prop beside pole
      const pack = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.44, 0.24, 2, 0.06), getMat('#4E9B8F', 0.62));
      pack.position.set(0.28, 0.24, 0.14);
      pack.rotation.y = -0.35;
      pStand.add(padRing, padCenter, pole, poleCap, miniChute, miniStripe, pack);
      mallStatic.add(pStand);

      const standHit = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 2.1, 1.15),
        new THREE.MeshBasicMaterial({visible: false}),
      );
      standHit.position.set(px, MALL_DECK_Y + 1.0, pz);
      standHit.userData = {
        kind: 'mall_parachute',
        tx: -42.85,
        tz: 2.15,
      };
      group.add(standHit);
      clickTargets.push(standHit);
    }

    // 5. Exposed Exterior Glass Observation Elevator Shaft + Animated Panoramic Cabin (y = 0.04 <-> 25.0)
    const SHAFT_H = 28.4;
    const cabX = MALL_ELEVATOR_CAB_POS.x;
    const cabZ = MALL_ELEVATOR_CAB_POS.z;

    [
      [-0.95, -1.15],
      [0.95, -1.15],
      [-0.95, 1.15],
      [0.95, 1.15],
    ].forEach(([ox, oz]) => {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, SHAFT_H, 0.16),
        silverSteelMat,
      );
      col.position.set(cabX + ox, SHAFT_H * 0.5, cabZ + oz);
      mallStatic.add(col);
    });

    for (let y = 3.2; y < SHAFT_H; y += 3.5) {
      const braceL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), darkSteelMat);
      braceL.position.set(cabX, y, cabZ - 1.15);
      const braceR = braceL.clone();
      braceR.position.z = cabZ + 1.15;
      const spineTie = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 2.38), silverSteelMat);
      spineTie.position.set(cabX - 0.65, y, cabZ);
      mallStatic.add(braceL, braceR, spineTie);
    }

    const shaftCap = new THREE.Mesh(
      new RoundedBoxGeometry(2.35, 0.42, 2.75, 2, 0.06),
      silverSteelMat,
    );
    shaftCap.position.set(cabX, SHAFT_H + 0.2, cabZ);
    mallStatic.add(shaftCap);

    // Compact Call Kiosks at Ground Level and Skydeck Level (tightened hit boxes to stop accidental elevator rides)
    const makeElevatorKiosk = (kx: number, ky: number, kz: number) => {
      const post = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 1.25, 0.36, 2, 0.04),
        darkSteelMat,
      );
      post.position.set(kx, ky + 0.62, kz);
      const btnUp = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        new THREE.MeshStandardMaterial({
          color: '#7CF2AE',
          emissive: '#38DF82',
          emissiveIntensity: 0.9,
        }),
      );
      btnUp.position.set(kx + 0.16, ky + 0.9, kz);
      mallStatic.add(post, btnUp);

      const kioskHit = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.65, 0.95),
        new THREE.MeshBasicMaterial({visible: false}),
      );
      kioskHit.position.set(kx, ky + 0.82, kz);
      kioskHit.userData = {kind: 'mall_elevator'};
      group.add(kioskHit);
      clickTargets.push(kioskHit);
    };
    makeElevatorKiosk(-46.5, 0.21, -1.05);
    makeElevatorKiosk(-47.15, MALL_DECK_Y, -1.05);

    // Animated Panoramic Glass Elevator Cabin
    mallElevatorCabin = new THREE.Group();
    mallElevatorCabin.position.set(cabX, 0.04, cabZ);

    const cabFloor = new THREE.Mesh(
      new RoundedBoxGeometry(1.78, 0.12, 2.08, 2, 0.03),
      darkSteelMat,
    );
    cabFloor.position.y = 0.04;
    const cabCeiling = new THREE.Mesh(
      new RoundedBoxGeometry(1.82, 0.14, 2.12, 2, 0.03),
      silverSteelMat,
    );
    cabCeiling.position.y = 2.38;
    const cabCeilingLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.05, 14),
      new THREE.MeshStandardMaterial({
        color: '#FFF9DF',
        emissive: '#FFE08A',
        emissiveIntensity: 0.95,
      }),
    );
    cabCeilingLamp.position.y = 2.29;

    const cabGlassBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.22, 1.98), skyGlassMat);
    cabGlassBack.position.set(-0.84, 1.21, 0);
    const cabGlassSideL = new THREE.Mesh(new THREE.BoxGeometry(1.68, 2.22, 0.05), skyGlassMat);
    cabGlassSideL.position.set(0, 1.21, -0.99);
    const cabGlassSideR = cabGlassSideL.clone();
    cabGlassSideR.position.z = 0.99;
    const cabGlassFrontArchL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.24, 0.14), silverSteelMat);
    cabGlassFrontArchL.position.set(0.84, 1.21, -0.94);
    const cabGlassFrontArchR = cabGlassFrontArchL.clone();
    cabGlassFrontArchR.position.z = 0.94;

    const cabHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.1, 1.5),
      new THREE.MeshBasicMaterial({visible: false}),
    );
    cabHit.position.y = 1.15;
    cabHit.userData = {kind: 'mall_elevator'};
    clickTargets.push(cabHit);

    mallElevatorCabin.add(
      cabFloor,
      cabCeiling,
      cabCeilingLamp,
      cabGlassBack,
      cabGlassSideL,
      cabGlassSideR,
      cabGlassFrontArchL,
      cabGlassFrontArchR,
      cabHit,
    );
    group.add(mallElevatorCabin);

    // 6. Forecourt Interactive Vending Machine + 2 Static Decorative Bicycles (Zero text!)
    {
      // A. Interactive Vending Machine ("Máy Bán Nước Tự Động") on South-East Forecourt Apron
      const vmX = -48.32;
      const vmZ = 1.48;
      const vmGroup = new THREE.Group();
      vmGroup.position.set(vmX, 0.21, vmZ);
      vmGroup.rotation.y = Math.PI / 2;

      const vmBodyMat = getMat('#2F83B8', 0.42);
      const vmSideMat = getMat('#1F5E87', 0.46);
      const vmTrimMat = silverSteelMat;
      const vmGlassMat = new THREE.MeshStandardMaterial({
        color: '#E5F7FF',
        emissive: '#8CE2FF',
        emissiveIntensity: 0.24,
        roughness: 0.16,
      });

      const vmShell = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.98, 0.78, 2, 0.05), vmBodyMat);
      vmShell.position.y = 0.99;
      const vmRoof = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.12, 0.84, 2, 0.03), vmSideMat);
      vmRoof.position.y = 2.0;
      const vmDisplayWindow = new THREE.Mesh(new RoundedBoxGeometry(0.76, 1.05, 0.06, 1, 0.02), vmGlassMat);
      vmDisplayWindow.position.set(-0.12, 1.24, 0.37);

      // 3 Rows of Colorful Static Drink Cans & Bottles Visible Inside Display Window
      const drinkRowCols = [
        ['#4BB7EB', '#4BB7EB', '#FF94B6', '#FF94B6'],
        ['#69BD76', '#69BD76', '#EC6D38', '#EC6D38'],
        ['#FFD166', '#4BB7EB', '#FF94B6', '#69BD76'],
      ];
      drinkRowCols.forEach((row, rIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.025, 0.09), vmTrimMat);
        shelf.position.set(-0.12, 1.5 - rIdx * 0.32, 0.37);
        vmGroup.add(shelf);
        row.forEach((col, cIdx) => {
          const item = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8),
            getMat(col, 0.32),
          );
          item.position.set(-0.37 + cIdx * 0.165, 1.6 - rIdx * 0.32, 0.39);
          vmGroup.add(item);
        });
      });

      // Coin Keypad + Push Flap Dispenser Bin
      const keypadPanel = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.44, 0.06, 1, 0.02), darkSteelMat);
      keypadPanel.position.set(0.39, 1.22, 0.38);
      const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), goldAccentMat);
      coinSlot.position.set(0.39, 1.32, 0.41);
      const pickupFlap = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.34, 0.08, 1, 0.02), darkSteelMat);
      pickupFlap.position.set(-0.08, 0.44, 0.37);
      vmGroup.add(vmShell, vmRoof, vmDisplayWindow, keypadPanel, coinSlot, pickupFlap);
      mallStatic.add(vmGroup);

      const vmHit = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.05, 1.45),
        new THREE.MeshBasicMaterial({visible: false}),
      );
      vmHit.position.set(vmX, 1.24, vmZ);
      vmHit.userData = {
        kind: 'mall_vending_machine',
        tx: -46.85,
        tz: vmZ,
      };
      group.add(vmHit);
      clickTargets.push(vmHit);
      colliders.push({type: 'box', id: 'mall_vending', x: vmX, z: vmZ, hw: 0.52, hd: 0.72, rotY: 0});

      // B. Steel Bike Rack + 2 Static Pastel & Mint Bicycles outside May Mall Front (NO Text Labels!)
      const rackX = -45.72;
      const rackZCenter = 3.35;
      [-0.85, 0.15, 1.15].forEach((rz) => {
        const uLoop = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.032, 6, 14, Math.PI), silverSteelMat);
        uLoop.position.set(rackX, 0.23, rackZCenter + rz);
        mallStatic.add(uLoop);
      });

      const tireMat = getMat('#2B3038', 0.85);
      const chromeMat = silverSteelMat;
      const leatherMat = getMat('#8F5832', 0.68);
      [
        {bz: rackZCenter - 0.35, frameHex: '#59B6D8', basketHex: '#DFB684'},
        {bz: rackZCenter + 0.65, frameHex: '#F0837B', basketHex: '#DFB684'},
      ].forEach(({bz, frameHex, basketHex}) => {
        const bike = new THREE.Group();
        bike.position.set(rackX + 0.18, 0.21, bz);
        const fMat = getMat(frameHex, 0.42);
        const wMat = getMat(basketHex, 0.7);
        // Front & Rear Tires + Rims
        [-0.5, 0.5].forEach((wx) => {
          const tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.042, 8, 18), tireMat);
          tire.position.set(wx, 0.3, 0);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 6, 14), chromeMat);
          rim.position.set(wx, 0.3, 0);
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), chromeMat);
          hub.rotation.x = Math.PI / 2;
          hub.position.set(wx, 0.3, 0);
          bike.add(tire, rim, hub);
        });
        // Frame Tubes (Down tube, Top tube, Seat post, Fork & Handlebar)
        const chainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.54, 7), fMat);
        chainStay.rotation.z = Math.PI / 2;
        chainStay.position.set(-0.24, 0.32, 0);
        const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 7), fMat);
        seatTube.rotation.z = 0.28;
        seatTube.position.set(-0.14, 0.55, 0);
        const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.58, 7), fMat);
        downTube.rotation.z = -0.82;
        downTube.position.set(0.14, 0.5, 0);
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.56, 7), fMat);
        fork.rotation.z = 0.24;
        fork.position.set(0.42, 0.56, 0);
        const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 7), chromeMat);
        handleBar.rotation.x = Math.PI / 2;
        handleBar.position.set(0.36, 0.84, 0);
        const seat = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.07, 0.14, 1, 0.025), leatherMat);
        seat.position.set(-0.22, 0.82, 0);
        // Cute front woven basket
        const basket = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.2, 0.28, 2, 0.02), wMat);
        basket.position.set(0.56, 0.68, 0);
        bike.add(chainStay, seatTube, downTube, fork, handleBar, seat, basket);
        mallStatic.add(bike);
      });
      colliders.push({type: 'box', id: 'mall_bike_rack', x: rackX + 0.18, z: rackZCenter + 0.15, hw: 0.92, hd: 1.35, rotY: 0});
    }

    // Colliders on Ground Level for Mall Podium & Elevator Shaft
    colliders.push({type: 'box', id: 'mall_podium', x: -54.7, z: -2.5, hw: 5.95, hd: 7.75, rotY: 0});
    colliders.push({type: 'box', id: 'mall_shaft', x: cabX, z: cabZ, hw: 1.05, hd: 1.22, rotY: 0});

    mergeStaticGroupByMaterial(mallStatic);
    group.add(mallStatic);
  }

  // ========== DISTRICT 9: KHU SINH THÁI SÔNG THÁC, CẦU CONG, SẠP THUYỀN NPC SHIP & NÚI THÁC NƯỚC ==========
  let riverWaterMat: THREE.MeshStandardMaterial | null = null;
  let waterfallTex: THREE.CanvasTexture | null = null;
  let waterfallFoamRing: THREE.Mesh | null = null;
  let midLedgeMistRing: THREE.Mesh | null = null;
  let waterfallSplashIM: THREE.InstancedMesh | null = null;
  const waterfallSplashSeeds: {
    x: number;
    y: number;
    z: number;
    r: number;
    phase: number;
    speed: number;
    hop: number;
  }[] = [];
  let mooredRiverBoat: THREE.Group | null = null;
  let activeRiverBoat: THREE.Group | null = null;
  let activeBoatOarL: THREE.Object3D | null = null;
  let activeBoatOarR: THREE.Object3D | null = null;
  const westInsectAnchors: InsectAnchor[] = [];

  {
    const eco = new THREE.Group();

    // 1. Climbable West Waterfall Mountain & Single Gentle Trail Mesh
    {
      const mW = 54;
      const mD = 66;
      const mCenterX = -120.5;
      const mCenterZ = -7.0;
      const mGeo = new THREE.PlaneGeometry(mW, mD, 34, 42);
      mGeo.rotateX(-Math.PI / 2);
      const pos = mGeo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const cGrass = new THREE.Color('#70BA57');
      const cTrail = new THREE.Color('#DCC496');
      const cRock = new THREE.Color('#6E7781');
      const tmp = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const lz = pos.getZ(i);
        const wx = mCenterX + lx;
        const wz = mCenterZ + lz;
        const h = getWestMountainHeight(wx, wz);
        const y = h > 0.025 ? 0.02 + h : -0.08;
        pos.setY(i, y);

        const {dist: trailDist} = closestPointOnWestTrail(wx, wz);
        const hx = getWestMountainHeight(wx + 0.9, wz) - getWestMountainHeight(wx - 0.9, wz);
        const hz = getWestMountainHeight(wx, wz + 0.9) - getWestMountainHeight(wx, wz - 0.9);
        const slope = Math.hypot(hx, hz) / 1.8;

        if (trailDist < 3.1 && h > 0.08) {
          const blend = smoothStep(1.8, 3.1, trailDist);
          tmp.copy(cTrail).lerp(cGrass, blend * 0.65);
        } else if (slope > 0.65 || (wx > -107.2 && wz < 0.8 && h > 1.3)) {
          tmp.copy(cRock);
        } else {
          tmp.copy(cGrass);
        }
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
      }
      mGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      mGeo.computeVertexNormals();
      const mountainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.0,
      });
      const westMountainMesh = new THREE.Mesh(mGeo, mountainMat);
      westMountainMesh.position.set(mCenterX, 0, mCenterZ);
      westMountainMesh.userData = {kind: 'ground'};
      pierWalkableMeshes.push(westMountainMesh);
      group.add(westMountainMesh);

      // Scenic Overlook Stone-Plinth & Carved Cedar Balustrade + Rest Bench + Twin Lanterns (-118.5, 11.2, -4.5)
      const ovX = -118.5;
      const ovZ = -4.5;
      const ovY = getTownGroundHeight(ovX, ovZ);
      const ovStoneMat = getMat('#89929B', 0.86);
      const ovPostMat = getMat('#7B4E2B', 0.76);
      const ovRailMat = getMat('#A36E3F', 0.7);
      const ovCapMat = getMat('#58361B', 0.78);
      const ovBenchMat = getMat('#C48D58', 0.7);
      const ovGroup = new THREE.Group();

      const ovPts: [number, number, number][] = [];
      const OV_COUNT = 7;
      for (let s = 0; s < OV_COUNT; s++) {
        const ang = THREE.MathUtils.lerp(-Math.PI * 0.44, Math.PI * 0.38, s / (OV_COUNT - 1));
        const px = ovX + Math.cos(ang) * 4.65;
        const pz = ovZ + Math.sin(ang) * 4.65;
        const py = getTownGroundHeight(px, pz);
        ovPts.push([px, py, pz]);

        const postGrp = new THREE.Group();
        postGrp.position.set(px, py, pz);
        postGrp.rotation.y = -ang;

        const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.28, 0.36, 2, 0.04), ovStoneMat);
        plinth.position.y = 0.08;
        const timber = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.92, 0.18, 2, 0.03), ovPostMat);
        timber.position.y = 0.64;
        const neck = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.06, 0.22, 1, 0.015), ovCapMat);
        neck.position.y = 1.08;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 4), ovCapMat);
        cap.rotation.y = Math.PI / 4;
        cap.position.y = 1.17;
        postGrp.add(plinth, timber, neck, cap);
        ovGroup.add(postGrp);
        colliders.push({type: 'circle', x: px, z: pz, r: 0.48});
      }

      for (let s = 0; s < OV_COUNT - 1; s++) {
        const [px, py, pz] = ovPts[s];
        const [nx, ny, nz] = ovPts[s + 1];
        const dx = nx - px;
        const dy = ny - py;
        const dz = nz - pz;
        const horiz = Math.hypot(dx, dz);
        const segLen = Math.hypot(horiz, dy);
        const yaw = Math.atan2(dx, dz);
        const pitch = -Math.atan2(dy, Math.max(0.01, horiz));

        const spanGrp = new THREE.Group();
        spanGrp.position.set((px + nx) * 0.5, (py + ny) * 0.5, (pz + nz) * 0.5);
        spanGrp.rotation.order = 'YXZ';
        spanGrp.rotation.y = yaw;
        spanGrp.rotation.x = pitch;

        const topRail = new THREE.Mesh(
          new RoundedBoxGeometry(0.145, 0.105, segLen + 0.06, 2, 0.025),
          ovRailMat,
        );
        topRail.position.y = 0.96;
        const midRail = new THREE.Mesh(
          new RoundedBoxGeometry(0.11, 0.085, segLen + 0.04, 2, 0.02),
          ovPostMat,
        );
        midRail.position.y = 0.52;
        spanGrp.add(topRail, midRail);

        // Two turned wooden balusters per span
        [-0.28, 0.28].forEach((frac) => {
          const bal = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.42, 0.085, 1, 0.015), ovRailMat);
          bal.position.set(0, 0.74, frac * horiz);
          spanGrp.add(bal);
        });
        ovGroup.add(spanGrp);
      }

      // Summit overlook timber bench with stone footings
      const bench = new THREE.Group();
      bench.position.set(ovX - 1.5, ovY, ovZ + 0.5);
      bench.rotation.y = Math.PI * 0.48;
      const bSeat = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.11, 0.54, 2, 0.03), ovBenchMat);
      bSeat.position.y = 0.44;
      const bBack = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.46, 0.09, 2, 0.02), ovBenchMat);
      bBack.position.set(0, 0.74, -0.23);
      [-0.64, 0.64].forEach((lx) => {
        const leg = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.44, 0.48, 2, 0.02), ovPostMat);
        leg.position.set(lx, 0.22, 0);
        bench.add(leg);
      });
      bench.add(bSeat, bBack);
      ovGroup.add(bench);
      colliders.push({type: 'circle', x: ovX - 1.5, z: ovZ + 0.5, r: 0.82});

      // Warm hanging wooden lantern post on summit overlook
      const ovPlinth = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.26, 0.38, 2, 0.04), ovStoneMat);
      ovPlinth.position.set(ovX + 1.4, ovY + 0.1, ovZ - 2.6);
      const ovPost = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.35, 0.16, 2, 0.03), ovPostMat);
      ovPost.position.set(ovX + 1.4, ovY + 1.25, ovZ - 2.6);
      const ovArm = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.08, 0.08, 2, 0.02), ovPostMat);
      ovArm.position.set(ovX + 1.68, ovY + 2.34, ovZ - 2.6);
      const ovCap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.13, 6), ovCapMat);
      ovCap.position.set(ovX + 1.94, ovY + 2.1, ovZ - 2.6);
      const ovBulbMat = new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.35,
        roughness: 0.25,
      });
      lampBulbs.push(ovBulbMat);
      const ovBulb = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 9), ovBulbMat);
      ovBulb.position.set(ovX + 1.94, ovY + 1.96, ovZ - 2.6);
      ovGroup.add(ovPlinth, ovPost, ovArm, ovCap, ovBulb);
      colliders.push({type: 'circle', x: ovX + 1.4, z: ovZ - 2.6, r: 0.34});
      mergeStaticGroupByMaterial(ovGroup);
      eco.add(ovGroup);

      // Safety colliders along the sheer cliff rim so players don't drop straight down the waterfall cliff
      const cliffGuardPts: [number, number, number][] = [
        [-101.5, -2.5, 2.2],
        [-101.0, -7.0, 2.6],
        [-101.2, -12.0, 2.6],
        [-103.5, -17.0, 2.8],
        [-108.5, -21.0, 2.8],
        [-114.5, -18.5, 2.6],
        [-119.5, -13.5, 2.5],
        [-125.5, -14.0, 3.0],
        [-131.5, -9.5, 2.8],
      ];
      cliffGuardPts.forEach(([cx, cz, cr], idx) => {
        colliders.push({type: 'circle', id: `west_cliff_guard_${idx}`, x: cx, z: cz, r: cr});
      });
    }

    // 2. Sculpted Craggy Waterfall Cliff Gorge + Mountain Canyon Stream + Two-Tier Natural Cascade
    {
      const cliffGroup = new THREE.Group();
      const graniteMat = getMat('#717983', 0.9);
      const slateMat = getMat('#59626D', 0.92);
      const wetRockMat = getMat('#404952', 0.56);
      const cliffMossMat = getMat('#4E9250', 0.86);
      const cliffShrubMat = getMat('#3D7D44', 0.84);

      const createSculptedCragGeo = (
        seed: number,
        sx: number,
        sy: number,
        sz: number,
        detail = 1,
      ) => {
        const base = new THREE.IcosahedronGeometry(1.0, detail);
        const nonIdx = base.index ? base.toNonIndexed() : base.clone();
        base.dispose();
        const p = nonIdx.attributes.position;
        for (let i = 0; i < p.count; i++) {
          let vx = p.getX(i);
          let vy = p.getY(i);
          let vz = p.getZ(i);
          // Horizontal strata steps + angular faceted crag noise
          const strata = Math.sin(vy * 5.2 + seed) * 0.08;
          const crag =
            Math.sin(vx * 3.4 + vz * 2.1 + seed) * 0.14 +
            Math.cos(vz * 3.8 - vx * 1.9 + seed * 1.7) * 0.12;
          // Flatter stepped tops & wider stable bases
          if (vy > 0.38) vy = 0.38 + (vy - 0.38) * 0.52;
          const baseFlare = vy < -0.2 ? 1.14 : 1.0;
          const radScale = (1 + strata + crag) * baseFlare;
          p.setXYZ(i, vx * radScale * sx, vy * sy, vz * radScale * sz);
        }
        nonIdx.computeVertexNormals();
        return nonIdx;
      };

      // Sculpted crag spires & cliff strata framing a central canyon gorge around z = -9.0
      const cragSpecs: [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        'granite' | 'slate' | 'wet',
        boolean,
      ][] = [
        // Towering North Canyon Buttress (flanking z = -15.5..-11.6)
        [-106.8, 7.2, -14.8, 4.6, 8.6, 4.2, 0.35, 'granite', true],
        [-103.0, 5.2, -13.2, 3.5, 6.2, 3.2, 1.2, 'slate', true],
        [-100.2, 2.8, -12.6, 2.7, 3.6, 2.6, 2.1, 'wet', false],
        [-109.5, 11.4, -14.2, 5.2, 6.6, 4.8, 0.85, 'granite', true],
        // Towering South Canyon Buttress (flanking z = -6.4..-2.5)
        [-106.2, 6.8, -3.4, 4.4, 8.0, 4.0, -0.45, 'slate', true],
        [-102.6, 4.8, -4.8, 3.4, 5.8, 3.0, 1.9, 'granite', true],
        [-99.8, 2.6, -5.4, 2.6, 3.4, 2.5, -1.2, 'wet', false],
        [-108.8, 11.0, -4.2, 5.0, 6.4, 4.6, 2.6, 'slate', true],
        // Back Gorge Cliff Wall & Upper Headwater Peak (behind the canyon spring at x = -111..-105)
        [-111.5, 13.6, -9.0, 5.4, 7.4, 6.2, 0.4, 'granite', true],
        [-107.5, 9.6, -9.0, 4.2, 5.2, 4.4, 1.5, 'slate', false],
        // Wet Dark Stone Gorge Lip & Backing Wall Behind Upper & Lower Cascades
        [-102.0, 9.4, -9.0, 2.6, 5.2, 2.7, 0.15, 'wet', false],
        [-99.2, 3.2, -9.0, 2.5, 3.6, 2.9, -0.25, 'wet', false],
        // Mid-Cliff Wet Rock Splash Shelf & Flanking Ledge Boulders
        [-98.6, 5.6, -11.1, 2.1, 1.9, 1.8, 0.7, 'wet', true],
        [-98.5, 5.5, -6.9, 2.0, 1.8, 1.8, -0.8, 'wet', true],
        // Plunge Pool Ring Wet Boulders at River Shoreline
        [-96.8, 0.9, -12.6, 2.3, 1.8, 2.1, 0.5, 'wet', true],
        [-96.4, 0.8, -5.5, 2.2, 1.7, 2.0, 1.8, 'wet', true],
        [-98.4, 1.2, -15.5, 2.5, 2.1, 2.4, 2.3, 'granite', true],
        [-98.0, 1.1, -2.4, 2.3, 1.9, 2.2, -1.6, 'slate', true],
      ];

      cragSpecs.forEach(([bx, by, bz, sx, sy, sz, seed, tone, addMoss], idx) => {
        const mat =
          tone === 'wet' ? wetRockMat : tone === 'slate' ? slateMat : graniteMat;
        const crag = new THREE.Mesh(createSculptedCragGeo(seed, sx, sy, sz, 1), mat);
        crag.position.set(bx, by, bz);
        crag.rotation.y = (idx * 0.73) % (Math.PI * 2);
        cliffGroup.add(crag);

        if (addMoss) {
          const mossCap = new THREE.Mesh(
            createSculptedCragGeo(seed + 4.2, sx * 0.74, sy * 0.16, sz * 0.72, 1),
            cliffMossMat,
          );
          mossCap.position.set(bx - 0.1, by + sy * 0.44, bz);
          mossCap.rotation.y = idx * 0.9;
          cliffGroup.add(mossCap);

          if (idx % 2 === 0) {
            const tuft = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), cliffShrubMat);
            tuft.scale.set(1.25, 0.75, 1.15);
            tuft.position.set(bx + sx * 0.25, by + sy * 0.52, bz + (idx % 4 === 0 ? 0.4 : -0.4));
            cliffGroup.add(tuft);
          }
        }
      });

      // Carved Dark Stone Sill Lip at Gorge Mouth (-101.6, 12.95, -9.0) + Mid-Cliff Shelf Stone
      const gorgeLip = new THREE.Mesh(
        createSculptedCragGeo(9.1, 1.3, 0.72, 2.3, 1),
        wetRockMat,
      );
      gorgeLip.position.set(-101.8, 12.6, -9.0);
      const midShelf = new THREE.Mesh(
        createSculptedCragGeo(11.4, 1.55, 0.85, 2.7, 1),
        wetRockMat,
      );
      midShelf.position.set(-98.6, 6.05, -9.0);
      cliffGroup.add(gorgeLip, midShelf);

      // Stone Gorge Streambed Underlay tucked inside the Mountain Cleft (x: -108.5 -> -101.6)
      const streamBed = new THREE.Mesh(
        new RoundedBoxGeometry(6.8, 0.65, 3.2, 2, 0.12),
        wetRockMat,
      );
      streamBed.position.set(-105.0, 12.88, -9.0);
      streamBed.rotation.z = -0.06;
      cliffGroup.add(streamBed);

      mergeStaticGroupByMaterial(cliffGroup);
      eco.add(cliffGroup);

      // Stationary Smooth Mountain Canyon Stream tucked inside the rock cleft (-108.2 -> -101.4)
      const streamMat = new THREE.MeshStandardMaterial({
        color: '#3890AA',
        roughness: 0.82,
        metalness: 0.0,
        envMapIntensity: 0.05,
      });
      const streamGeo = new THREE.PlaneGeometry(7.0, 2.85, 8, 2);
      streamGeo.rotateX(-Math.PI / 2);
      const sPos = streamGeo.attributes.position;
      for (let i = 0; i < sPos.count; i++) {
        const sx = sPos.getX(i);
        const u = (sx + 3.5) / 7.0;
        sPos.setY(i, THREE.MathUtils.lerp(13.45, 13.02, u));
      }
      streamGeo.computeVertexNormals();
      const canyonStreamMesh = new THREE.Mesh(streamGeo, streamMat);
      canyonStreamMesh.position.set(-104.8, 0, -9.0);
      canyonStreamMesh.renderOrder = 2;
      canyonStreamMesh.userData = {isWaterSurface: true};
      eco.add(canyonStreamMesh);

      // Stationary Two-Tier Natural Waterfall Cascade (no UV scroll; only splash bubbles animate below!)
      waterfallTex = createWaterfallTexture();
      const wfMat = new THREE.MeshStandardMaterial({
        color: '#D5F2FA',
        map: waterfallTex,
        roughness: 0.78,
        metalness: 0.0,
        envMapIntensity: 0.04,
        emissive: '#3D8FA6',
        emissiveIntensity: 0.02,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const buildCascadeTier = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        w0: number,
        w1: number,
        rows: number,
      ) => {
        const verts: number[] = [];
        const uvs: number[] = [];
        const idx: number[] = [];
        for (let r = 0; r <= rows; r++) {
          const t = r / rows;
          const x = THREE.MathUtils.lerp(x0, x1, Math.pow(t, 0.78));
          const y = THREE.MathUtils.lerp(y0, y1, t * t * 0.72 + t * 0.28);
          const w = THREE.MathUtils.lerp(w0, w1, t);
          verts.push(x, y, -9.0 - w * 0.5);
          verts.push(x, y, -9.0 + w * 0.5);
          uvs.push(0, t * 1.4);
          uvs.push(1, t * 1.4);
        }
        for (let r = 0; r < rows; r++) {
          const a = r * 2;
          const b = a + 1;
          const c = a + 2;
          const d = a + 3;
          idx.push(a, c, b, b, c, d);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, wfMat);
        mesh.renderOrder = 4;
        mesh.userData = {isWaterSurface: true};
        return mesh;
      };

      // Tier 1: Gorge lip -> Mid-Cliff Splash Ledge; Tier 2: Mid-Cliff Ledge -> River Plunge Pool
      const wfUpper = buildCascadeTier(-101.4, 13.06, -98.35, 6.45, 2.85, 3.65, 8);
      const wfLower = buildCascadeTier(-98.3, 6.52, -94.8, RIVER_WATER_Y - 0.14, 3.7, 4.75, 9);
      eco.add(wfUpper, wfLower);

      // Animated Bubbling Whitewater Splash (1 single InstancedMesh — pauses automatically when far away!)
      for (let f = 0; f < 6; f++) {
        waterfallSplashSeeds.push({
          x: -98.3 + Math.sin(f * 1.6) * 0.28,
          y: 6.46,
          z: -10.55 + f * 0.62,
          r: 0.72 + (f % 3) * 0.18,
          phase: f * 1.05,
          speed: 3.1 + (f % 3) * 0.55,
          hop: 0.12,
        });
      }
      for (let f = 0; f < 14; f++) {
        const row = f % 2;
        waterfallSplashSeeds.push({
          x: -95.0 + row * 0.65 + Math.sin(f * 1.7) * 0.36,
          y: RIVER_WATER_Y + 0.03,
          z: -11.35 + (f / 13) * 4.7,
          r: 0.78 + (f % 4) * 0.22,
          phase: f * 0.78,
          speed: 2.9 + (f % 4) * 0.5,
          hop: 0.18,
        });
      }
      const splashGeo = new THREE.IcosahedronGeometry(0.46, 0);
      splashGeo.scale(1.15, 0.52, 1.05);
      const splashMat = getMat('#EEF9FC', 0.72);
      waterfallSplashIM = new THREE.InstancedMesh(splashGeo, splashMat, waterfallSplashSeeds.length);
      waterfallSplashSeeds.forEach((s, idx) => {
        _instDummy.position.set(s.x, s.y, s.z);
        _instDummy.rotation.set(0, idx * 0.8, 0);
        _instDummy.scale.setScalar(s.r);
        _instDummy.updateMatrix();
        waterfallSplashIM!.setMatrixAt(idx, _instDummy.matrix);
      });
      waterfallSplashIM.instanceMatrix.needsUpdate = true;
      waterfallSplashIM.computeBoundingSphere();
      waterfallSplashIM.userData = {isWaterSurface: true};
      eco.add(waterfallSplashIM);

      const midMistGeo = new THREE.RingGeometry(1.1, 2.05, 16);
      midMistGeo.rotateX(-Math.PI / 2);
      midLedgeMistRing = new THREE.Mesh(
        midMistGeo,
        new THREE.MeshBasicMaterial({
          color: '#E8F9FD',
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
      );
      midLedgeMistRing.position.set(-98.3, 6.42, -9.0);
      midLedgeMistRing.renderOrder = 4;
      midLedgeMistRing.userData = {isWaterSurface: true};

      const foamRingGeo = new THREE.RingGeometry(2.15, 3.25, 20);
      foamRingGeo.rotateX(-Math.PI / 2);
      waterfallFoamRing = new THREE.Mesh(
        foamRingGeo,
        new THREE.MeshBasicMaterial({
          color: '#E8F9FD',
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        }),
      );
      waterfallFoamRing.position.set(-94.7, RIVER_WATER_Y + 0.028, -9.0);
      waterfallFoamRing.renderOrder = 4;
      waterfallFoamRing.userData = {isWaterSurface: true};
      eco.add(midLedgeMistRing, waterfallFoamRing);
    }

    // 3. Long Curved River Shore Collar & Smooth Non-Glaring Opaque Water Ribbon (Zero Texture/Alpha Overdraw)
    {
      const R_SEGS = 44;
      const bankVerts: number[] = [];
      const bankCols: number[] = [];
      const bankIdx: number[] = [];
      const tmpC = new THREE.Color();

      const BANK_PROFILE: [number, number, string][] = [
        [1.03, 0.015, '#68AE55'],
        [0.95, -0.18, '#AD9F86'],
        [0.86, -0.32, '#4D786F'],
      ];
      const bCount = BANK_PROFILE.length;
      [-1, 1].forEach((side) => {
        const baseVertOffset = bankVerts.length / 3;
        for (let i = 0; i <= R_SEGS; i++) {
          const z = THREE.MathUtils.lerp(
            -WEST_RIVER_VISUAL_HALF_LEN,
            WEST_RIVER_VISUAL_HALF_LEN,
            i / R_SEGS,
          );
          const cx = getWestRiverCenterX(z);
          const hw = getWestRiverHalfWidth(z);
          for (let p = 0; p < bCount; p++) {
            const [scale, ry, hex] = BANK_PROFILE[p];
            tmpC.set(hex);
            bankVerts.push(cx + side * scale * hw, ry, z);
            bankCols.push(tmpC.r, tmpC.g, tmpC.b);
          }
        }
        for (let i = 0; i < R_SEGS; i++) {
          const rowA = baseVertOffset + i * bCount;
          const rowB = baseVertOffset + (i + 1) * bCount;
          for (let p = 0; p < bCount - 1; p++) {
            const a = rowA + p;
            const b = rowA + p + 1;
            const c = rowB + p;
            const d = rowB + p + 1;
            if (side > 0) {
              bankIdx.push(a, c, b, b, c, d);
            } else {
              bankIdx.push(a, b, c, b, d, c);
            }
          }
        }
      });
      const bedGeo = new THREE.BufferGeometry();
      bedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bankVerts, 3));
      bedGeo.setAttribute('color', new THREE.Float32BufferAttribute(bankCols, 3));
      bedGeo.setIndex(bankIdx);
      bedGeo.computeVertexNormals();
      const riverBedMesh = new THREE.Mesh(
        bedGeo,
        new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.9}),
      );
      riverBedMesh.renderOrder = 0;
      riverBedMesh.userData = {isWaterSurface: true};
      eco.add(riverBedMesh);

      // Single-Pass Smooth Matte Opaque Water Ribbon (calm, soft gradient, zero glare & zero animation cost)
      const W_BANDS: [number, string][] = [
        [-0.95, '#48A2B8'],
        [-0.45, '#31849F'],
        [0.45, '#31849F'],
        [0.95, '#48A2B8'],
      ];
      const wColsCount = W_BANDS.length;
      const wVerts: number[] = [];
      const wColors: number[] = [];
      const wIdx: number[] = [];
      for (let i = 0; i <= R_SEGS; i++) {
        const t = i / R_SEGS;
        const z = THREE.MathUtils.lerp(-WEST_RIVER_VISUAL_HALF_LEN, WEST_RIVER_VISUAL_HALF_LEN, t);
        const cx = getWestRiverCenterX(z);
        const hw = getWestRiverHalfWidth(z);
        for (let k = 0; k < wColsCount; k++) {
          const [scale, hex] = W_BANDS[k];
          tmpC.set(hex);
          wVerts.push(cx + hw * scale, RIVER_WATER_Y, z);
          wColors.push(tmpC.r, tmpC.g, tmpC.b);
        }
        if (i < R_SEGS) {
          const rA = i * wColsCount;
          const rB = (i + 1) * wColsCount;
          for (let k = 0; k < wColsCount - 1; k++) {
            const a = rA + k;
            const b = rA + k + 1;
            const c = rB + k;
            const d = rB + k + 1;
            wIdx.push(a, c, b, b, c, d);
          }
        }
      }
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wVerts, 3));
      wGeo.setAttribute('color', new THREE.Float32BufferAttribute(wColors, 3));
      wGeo.setIndex(wIdx);
      wGeo.computeVertexNormals();

      riverWaterMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.0,
        envMapIntensity: 0.04,
      });
      const riverWaterMesh = new THREE.Mesh(wGeo, riverWaterMat);
      riverWaterMesh.renderOrder = 1;
      riverWaterMesh.userData = {kind: 'river_water', isWaterMesh: true};
      eco.add(riverWaterMesh);
      clickTargets.push(riverWaterMesh);

      // Scenic Boulder Riffle Shoals & Wooden Rope Buoys framing navigable river limits (merged!)
      const shoalGroup = new THREE.Group();
      const shoalRockMat = getMat('#7E8893', 0.86);
      const buoyWoodMat = getMat('#9E6A3B', 0.76);
      const buoyFloatMat = getMat('#E87D5A', 0.65);
      const ropeMat = getMat('#DEC59A', 0.84);
      [WEST_RIVER_NAV_MIN_Z - 1.6, WEST_RIVER_NAV_MAX_Z + 1.6].forEach((limZ) => {
        const cx = getWestRiverCenterX(limZ);
        const hw = getWestRiverHalfWidth(limZ);
        for (let s = -3; s <= 3; s++) {
          const sx = cx + s * (hw * 0.25);
          if (Math.abs(s) >= 2) {
            const sr = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), shoalRockMat);
            sr.scale.set(1.2, 0.58, 1.0);
            sr.position.set(sx, RIVER_WATER_Y + 0.08, limZ + (s % 2) * 0.4);
            shoalGroup.add(sr);
          } else {
            const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 8), buoyWoodMat);
            buoy.position.set(sx, RIVER_WATER_Y + 0.14, limZ);
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), buoyFloatMat);
            cap.position.set(sx, RIVER_WATER_Y + 0.42, limZ);
            shoalGroup.add(buoy, cap);
          }
        }
        const ropeSpan = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, hw * 1.15, 6),
          ropeMat,
        );
        ropeSpan.rotation.z = Math.PI / 2;
        ropeSpan.position.set(cx, RIVER_WATER_Y + 0.34, limZ);
        shoalGroup.add(ropeSpan);
      });
      mergeStaticGroupByMaterial(shoalGroup);
      eco.add(shoalGroup);

      // Bank colliders keeping walkers on shore (leaving Bridge z=6.8..10.2 & Dock z=-3.3..-0.3 open!)
      for (let z = -66; z <= 64; z += 2.5) {
        const cx = getWestRiverCenterX(z);
        const hw = getWestRiverHalfWidth(z);
        const inBridgeBand = z >= 6.7 && z <= 10.3;
        const inDockBand = z >= -3.4 && z <= -0.2;
        if (!inBridgeBand && !inDockBand) {
          colliders.push({type: 'circle', x: cx + hw - 0.3, z, r: 1.35});
        }
        if (!inBridgeBand) {
          colliders.push({type: 'circle', x: cx - hw + 0.3, z, r: 1.35});
        }
      }
    }

    // 4. Curved Fairy-Tale Arched Bridge over the River (z = 8.5)
    {
      const bridgeGroup = new THREE.Group();
      const midX = getWestRiverCenterX(WEST_BRIDGE_Z);
      const bridgeWoodMat = getMat('#BC854E', 0.72);
      const bridgeAltMat = getMat('#A77240', 0.74);
      const bridgeDarkMat = getMat('#704827', 0.78);
      const bridgeStoneMat = getMat('#B7AFA3', 0.84);
      const BRIDGE_SEGS = 24;
      const span = WEST_BRIDGE_HALF_SPAN * 2;
      const deckW = 2.55;

      // Stone abutment pedestals at both shores
      [-1, 1].forEach((side) => {
        const endX = midX + side * (WEST_BRIDGE_HALF_SPAN - 0.35);
        const abut = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.7, deckW + 0.35, 2, 0.05), bridgeStoneMat);
        abut.position.set(endX, 0.14, WEST_BRIDGE_Z);
        bridgeGroup.add(abut);
      });

      // Stepped curved planks + twin curved arch rails & posts
      for (let i = 0; i <= BRIDGE_SEGS; i++) {
        const t = i / BRIDGE_SEGS;
        const x = midX - WEST_BRIDGE_HALF_SPAN + t * span;
        const y = getWestRiverBridgeHeight(x, WEST_BRIDGE_Z) ?? 0.04;
        const nextX = midX - WEST_BRIDGE_HALF_SPAN + Math.min(1, t + 1 / BRIDGE_SEGS) * span;
        const nextY = getWestRiverBridgeHeight(nextX, WEST_BRIDGE_Z) ?? 0.04;
        const pitchZ = Math.atan2(nextY - y, Math.max(0.01, nextX - x));

        if (i < BRIDGE_SEGS) {
          const plank = new THREE.Mesh(
            new RoundedBoxGeometry(span / BRIDGE_SEGS - 0.04, 0.11, deckW, 1, 0.02),
            i % 2 === 0 ? bridgeWoodMat : bridgeAltMat,
          );
          plank.position.set((x + nextX) * 0.5, (y + nextY) * 0.5 - 0.05, WEST_BRIDGE_Z);
          plank.rotation.z = pitchZ;
          bridgeGroup.add(plank);

          // Twin structural arch stringers beneath deck
          [-0.95, 0.95].forEach((oz) => {
            const beam = new THREE.Mesh(
              new RoundedBoxGeometry(span / BRIDGE_SEGS + 0.08, 0.24, 0.16, 1, 0.02),
              bridgeDarkMat,
            );
            beam.position.set((x + nextX) * 0.5, (y + nextY) * 0.5 - 0.18, WEST_BRIDGE_Z + oz);
            beam.rotation.z = pitchZ;
            bridgeGroup.add(beam);
          });
        }

        if (i % 3 === 0) {
          const isCenterPost = i === BRIDGE_SEGS / 2;
          [-1.18, 1.18].forEach((oz) => {
            const post = new THREE.Mesh(
              new THREE.CylinderGeometry(0.07, 0.085, isCenterPost ? 1.15 : 0.88, 8),
              bridgeDarkMat,
            );
            post.position.set(x, y + (isCenterPost ? 0.55 : 0.42), WEST_BRIDGE_Z + oz);
            bridgeGroup.add(post);

            if (isCenterPost) {
              const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 7), bridgeDarkMat);
              lanternCap.position.set(x, y + 1.18, WEST_BRIDGE_Z + oz);
              const bLampMat = new THREE.MeshStandardMaterial({
                color: '#FFF4C2',
                emissive: '#FFCC66',
                emissiveIntensity: 0.35,
                roughness: 0.25,
              });
              lampBulbs.push(bLampMat);
              const bLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), bLampMat);
              bLamp.position.set(x, y + 1.07, WEST_BRIDGE_Z + oz);
              bridgeGroup.add(lanternCap, bLamp);
            }
          });
        }
        if (i < BRIDGE_SEGS) {
          const segLen = Math.hypot(nextX - x, nextY - y);
          [-1.18, 1.18].forEach((oz) => {
            const rail = new THREE.Mesh(
              new RoundedBoxGeometry(segLen + 0.04, 0.07, 0.08, 1, 0.015),
              bridgeWoodMat,
            );
            rail.position.set((x + nextX) * 0.5, (y + nextY) * 0.5 + 0.78, WEST_BRIDGE_Z + oz);
            rail.rotation.z = pitchZ;
            bridgeGroup.add(rail);
          });
        }
      }

      // Smooth invisible curved walkable bridge raycast surface (widened for effortless tapping & 2-lane pathing)
      const bWalkGeo = new THREE.PlaneGeometry(span, deckW + 0.36, 20, 2);
      bWalkGeo.rotateX(-Math.PI / 2);
      const bAttr = bWalkGeo.attributes.position;
      for (let i = 0; i < bAttr.count; i++) {
        const wx = midX + bAttr.getX(i);
        const h = getWestRiverBridgeHeight(wx, WEST_BRIDGE_Z) ?? 0.04;
        bAttr.setY(i, h);
      }
      bWalkGeo.computeVertexNormals();
      const bWalkMesh = new THREE.Mesh(bWalkGeo, new THREE.MeshBasicMaterial({visible: false}));
      bWalkMesh.position.set(midX, 0, WEST_BRIDGE_Z);
      bWalkMesh.userData = {kind: 'ground'};
      pierWalkableMeshes.push(bWalkMesh);
      bridgeGroup.add(bWalkMesh);

      // Bridge side railing colliders (shifted slightly outward so two clear nav grid lanes traverse bridge)
      colliders.push({
        type: 'box',
        id: 'west_bridge_rail_n',
        x: midX,
        z: WEST_BRIDGE_Z - 1.52,
        hw: WEST_BRIDGE_HALF_SPAN - 0.5,
        hd: 0.18,
      });
      colliders.push({
        type: 'box',
        id: 'west_bridge_rail_s',
        x: midX,
        z: WEST_BRIDGE_Z + 1.52,
        hw: WEST_BRIDGE_HALF_SPAN - 0.5,
        hd: 0.18,
      });

      mergeStaticGroupByMaterial(bridgeGroup, new Set([bWalkMesh]));
      eco.add(bridgeGroup);
    }

    // 5. East Bank Boat Dock, 2 Hanging Wooden Lanterns, Boat Signboard & Crafted Clinker Wooden Rowboats
    const buildWoodenRowboat = (withOarPivots = false) => {
      const boat = new THREE.Group();
      const oakHull = getMat('#A46233', 0.68);
      const oakInner = getMat('#C88E56', 0.72);
      const oakTrim = getMat('#DDA86F', 0.62);
      const oakDark = getMat('#5D351A', 0.78);
      const brassMat = getMat('#D8A94B', 0.34, 0.72);
      const ropeHempMat = getMat('#DCC194', 0.86);
      const cushionRed = getMat('#C65943', 0.74);
      const sailBlue = getMat('#3D8EB8', 0.58);

      // Curved lofted boat shell (hollow U-profile from curved transom stern z=-1.18 to pointed prow z=+1.52)
      const STATIONS = 11;
      const PROW_Z = 1.52;
      const STERN_Z = -1.18;
      const hullHalfW = (t: number) => {
        if (t > 0.58) {
          const u = (1 - t) / 0.42;
          return 0.64 * Math.pow(Math.max(0.02, u), 0.62);
        }
        if (t < 0.22) {
          return THREE.MathUtils.lerp(0.46, 0.62, t / 0.22);
        }
        return 0.62 + 0.03 * Math.sin(((t - 0.22) / 0.36) * Math.PI);
      };
      const sheerLift = (t: number) => Math.pow(Math.max(0, (t - 0.55) / 0.45), 1.7) * 0.2 + (t < 0.2 ? 0.04 : 0);

      // Build curved outer hull & inner cockpit lining with 7 cross-section ring points per station
      const makeHullShellGeo = (wallOffset: number, yOffset: number) => {
        const verts: number[] = [];
        const indices: number[] = [];
        const RING = 7;
        for (let i = 0; i <= STATIONS; i++) {
          const t = i / STATIONS;
          const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
          const hw = Math.max(0.03, hullHalfW(t) + wallOffset);
          const sheerY = 0.38 + sheerLift(t) + yOffset;
          const chineY = 0.11 + sheerLift(t) * 0.35 + yOffset;
          const keelY = 0.02 + sheerLift(t) * 0.28 + yOffset;
          const pts: [number, number][] = [
            [-hw, sheerY],
            [-hw * 0.84, chineY],
            [-hw * 0.42, keelY + 0.02],
            [0, keelY],
            [hw * 0.42, keelY + 0.02],
            [hw * 0.84, chineY],
            [hw, sheerY],
          ];
          for (const [px, py] of pts) {
            verts.push(px, py, z);
          }
        }
        for (let i = 0; i < STATIONS; i++) {
          const rA = i * RING;
          const rB = (i + 1) * RING;
          for (let j = 0; j < RING - 1; j++) {
            const a = rA + j;
            const b = rA + j + 1;
            const c = rB + j;
            const d = rB + j + 1;
            indices.push(a, c, b, b, c, d);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
      };

      const oakHullDouble = new THREE.MeshStandardMaterial({
        color: '#A46233',
        roughness: 0.68,
        side: THREE.DoubleSide,
      });
      const oakInnerDouble = new THREE.MeshStandardMaterial({
        color: '#C88E56',
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      const outerShell = new THREE.Mesh(makeHullShellGeo(0, 0), oakHullDouble);
      const innerShell = new THREE.Mesh(makeHullShellGeo(-0.055, 0.045), oakInnerDouble);
      boat.add(outerShell, innerShell);

      // Curved stern transom board + dark oak keel spine + bow stempost
      const transom = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.36, 0.1, 2, 0.03), oakDark);
      transom.position.set(0, 0.22, STERN_Z + 0.03);
      transom.rotation.x = -0.14;
      const keelSpine = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08, 2.38, 2, 0.02), oakDark);
      keelSpine.position.set(0, 0.01, 0.06);
      const stemPost = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.48, 0.18, 2, 0.03), oakDark);
      stemPost.rotation.x = 0.56;
      stemPost.position.set(0, 0.34, PROW_Z - 0.08);
      boat.add(transom, keelSpine, stemPost);

      // Left & Right Curved Gunwale Rub Rails
      [-1, 1].forEach((side) => {
        for (let i = 0; i < STATIONS; i++) {
          const t0 = i / STATIONS;
          const t1 = (i + 1) / STATIONS;
          const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
          const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
          const x0 = side * hullHalfW(t0);
          const x1 = side * hullHalfW(t1);
          const y0 = 0.4 + sheerLift(t0);
          const y1 = 0.4 + sheerLift(t1);
          const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
          const rail = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.075, segLen + 0.04, 1, 0.02), oakTrim);
          rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
          rail.lookAt(x1, y1, z1);
          boat.add(rail);
        }
      });

      // Slatted Floorboards (5 lengthwise planks) + 4 Curved Interior Timber Ribs
      for (let s = -2; s <= 2; s++) {
        const plank = new THREE.Mesh(
          new RoundedBoxGeometry(0.11, 0.035, 1.82 - Math.abs(s) * 0.14, 1, 0.01),
          s % 2 === 0 ? oakTrim : oakInner,
        );
        plank.position.set(s * 0.145, 0.1, -0.05);
        boat.add(plank);
      }
      [-0.78, -0.22, 0.32, 0.82].forEach((rz) => {
        const rib = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.04, 0.06, 1, 0.015), oakDark);
        rib.position.set(0, 0.085, rz);
        boat.add(rib);
      });

      // Triangular Carved Foredeck (Boong Mũi) + Mooring Rope Coil & Brass Cleat
      const foreDeck = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.68, 4), oakTrim);
      foreDeck.rotation.x = Math.PI / 2;
      foreDeck.rotation.y = Math.PI / 4;
      foreDeck.scale.set(0.95, 1, 0.14);
      foreDeck.position.set(0, 0.38, 1.18);
      const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 12), ropeHempMat);
      ropeCoil.rotation.x = Math.PI / 2;
      ropeCoil.position.set(-0.1, 0.43, 1.06);
      const cleat = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.035, 0.04, 1, 0.01), brassMat);
      cleat.position.set(0.12, 0.43, 1.14);
      boat.add(foreDeck, ropeCoil, cleat);

      // Aft Captain Bench with Cozy Quilted Cushion + Mid Rowing Thwart
      const aftBench = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.075, 0.4, 2, 0.02), oakTrim);
      aftBench.position.set(0, 0.28, -0.58);
      const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.06, 0.32, 2, 0.025), cushionRed);
      cushion.position.set(0, 0.33, -0.58);
      const midThwart = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.07, 0.3, 2, 0.02), oakTrim);
      midThwart.position.set(0, 0.27, 0.26);
      boat.add(aftBench, cushion, midThwart);

      // Crooked Bow Lantern Post + Warm Glowing Harbor Lantern + Pennant Flag
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.72, 7), oakDark);
      mast.position.set(0, 0.72, 1.32);
      const bowArm = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, 0.24, 1, 0.01), oakDark);
      bowArm.position.set(0, 1.02, 1.42);
      const bowCap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 6), oakDark);
      bowCap.position.set(0, 0.94, 1.5);
      const bowBulbMat = new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.45,
        roughness: 0.25,
      });
      lampBulbs.push(bowBulbMat);
      const bowBulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), bowBulbMat);
      bowBulb.position.set(0, 0.85, 1.5);
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 3), sailBlue);
      flag.rotation.z = -Math.PI / 2;
      flag.position.set(0.14, 0.96, 1.32);
      boat.add(mast, bowArm, bowCap, bowBulb, flag);

      // Brass Oarlocks + Sculpted Tapered Wooden Oars
      let oarLPivot: THREE.Group | null = null;
      let oarRPivot: THREE.Group | null = null;
      [-1, 1].forEach((side) => {
        const oarlock = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.09, 6), brassMat);
        oarlock.position.set(side * 0.62, 0.44, 0.14);
        boat.add(oarlock);

        const pivot = new THREE.Group();
        pivot.position.set(side * 0.62, 0.47, 0.14);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.24, 6), oakDark);
        grip.rotation.z = side * 1.16;
        grip.position.set(-side * 0.14, 0.06, 0);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.28, 7), oakTrim);
        shaft.rotation.z = side * 1.16;
        shaft.position.set(side * 0.44, -0.17, 0);
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 7), oakDark);
        collar.rotation.z = side * 1.16;
        collar.position.set(side * 0.02, -0.01, 0);
        const blade = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.028, 0.48, 2, 0.01), oakHull);
        blade.rotation.z = side * 1.16;
        blade.position.set(side * 0.98, -0.41, 0);
        pivot.add(grip, collar, shaft, blade);
        boat.add(pivot);
        if (side < 0) oarLPivot = pivot;
        else oarRPivot = pivot;
      });

      const skipSet = new Set<THREE.Object3D>();
      if (withOarPivots) {
        if (oarLPivot) skipSet.add(oarLPivot);
        if (oarRPivot) skipSet.add(oarRPivot);
      }
      mergeStaticGroupByMaterial(boat, skipSet);
      return {boat, oarLPivot, oarRPivot};
    };

    {
      const dockGroup = new THREE.Group();
      const dockWoodMat = getMat('#C48F59', 0.72);
      const dockAltMat = getMat('#B17D4B', 0.74);
      const dockDarkMat = getMat('#734A28', 0.78);

      // Walkable pier deck extending onto East shoreline (x: -77.6..-73.8, z: -3.1..-0.5)
      const dockDeck = new THREE.Mesh(
        new RoundedBoxGeometry(3.85, 0.18, 2.6, 2, 0.04),
        dockWoodMat,
      );
      dockDeck.position.set(-75.7, 0.14, -1.8);
      dockDeck.userData = {kind: 'ground'};
      pierWalkableMeshes.push(dockDeck);
      dockGroup.add(dockDeck);

      for (let px = -77.45; px <= -73.95; px += 0.42) {
        const plank = new THREE.Mesh(
          new RoundedBoxGeometry(0.32, 0.035, 2.55, 1, 0.01),
          Math.round(px * 3) % 2 === 0 ? dockWoodMat : dockAltMat,
        );
        plank.position.set(px, 0.235, -1.8);
        dockGroup.add(plank);
      }
      [
        [-77.4, -2.95],
        [-77.4, -0.65],
        [-75.7, -2.95],
        [-75.7, -0.65],
        [-74.0, -2.95],
        [-74.0, -0.65],
      ].forEach(([px, pz]) => {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 1.55, 8), dockDarkMat);
        piling.position.set(px, -0.1, pz);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 8), dockWoodMat);
        cap.position.set(px, 0.68, pz);
        dockGroup.add(piling, cap);
      });
      colliders.push({type: 'box', id: 'river_dock_stop', x: -77.9, z: -1.8, hw: 0.28, hd: 1.4});

      // 2 Hanging Wooden Post Lanterns along the riverbank (cắm 2 đèn gỗ treo)
      const addHangingWoodenLantern = (lx: number, lz: number, rotY: number) => {
        const lp = new THREE.Group();
        lp.position.set(lx, 0.02, lz);
        lp.rotation.y = rotY;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.105, 2.75, 8), dockDarkMat);
        post.position.y = 1.36;
        const arm = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.08, 0.08, 2, 0.02), dockDarkMat);
        arm.position.set(0.32, 2.66, 0);
        const brace = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.06, 0.06, 1, 0.015), dockDarkMat);
        brace.rotation.z = 0.72;
        brace.position.set(0.2, 2.42, 0);
        const cord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.26, 6),
          getMat('#2C241E', 0.6),
        );
        cord.position.set(0.62, 2.5, 0);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.13, 8), dockDarkMat);
        cap.position.set(0.62, 2.34, 0);
        const bulbMat = new THREE.MeshStandardMaterial({
          color: '#FFF4C2',
          emissive: '#FFCC66',
          emissiveIntensity: 0.35,
          roughness: 0.25,
        });
        lampBulbs.push(bulbMat);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.155, 9, 9), bulbMat);
        bulb.position.set(0.62, 2.19, 0);
        lp.add(post, arm, brace, cord, cap, bulb);
        dockGroup.add(lp);
        colliders.push({type: 'circle', x: lx, z: lz, r: 0.34});
      };
      addHangingWoodenLantern(-73.0, -3.55, -0.35);
      addHangingWoodenLantern(-72.6, 5.2, 0.45);

      // Interactive Boat Boarding Signboard (Biển hiệu hình chiếc thuyền — bấm để xuống thuyền)
      const boardGroup = new THREE.Group();
      boardGroup.position.set(-74.6, 0.02, -0.15);
      boardGroup.rotation.y = Math.PI * 0.45;
      const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1.55, 8), dockDarkMat);
      bPost.position.y = 0.78;
      const bFrame = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.76, 0.1, 2, 0.03), dockDarkMat);
      bFrame.position.y = 1.48;
      const bFaceFront = new THREE.Mesh(
        createAtlasPlaneGeometry(1.36, 0.64, 'river_boat_sign'),
        signAtlasMat,
      );
      bFaceFront.position.set(0, 1.48, 0.056);
      const bFaceBack = new THREE.Mesh(
        createAtlasPlaneGeometry(1.36, 0.64, 'river_boat_sign'),
        signAtlasMat,
      );
      bFaceBack.rotation.y = Math.PI;
      bFaceBack.position.set(0, 1.48, -0.056);
      boardGroup.add(bPost, bFrame, bFaceFront, bFaceBack);
      addInteractionProxy(
        boardGroup,
        [1.65, 2.0, 0.9],
        1.0,
        {
          kind: 'river_boat_board',
          tx: RIVER_BOARD_INTERACT.tx,
          tz: RIVER_BOARD_INTERACT.tz,
        },
        clickTargets,
      );
      colliders.push({type: 'circle', id: 'river_boat_board', x: -74.6, z: -0.15, r: 0.48});
      dockGroup.add(boardGroup);

      mergeStaticGroupByMaterial(dockGroup, new Set([dockDeck]));
      eco.add(dockGroup);

      // Moored Wooden Boat floating right beside the dock
      const mooredBuilt = buildWoodenRowboat(false);
      mooredRiverBoat = mooredBuilt.boat;
      mooredRiverBoat.position.set(-78.8, RIVER_WATER_Y + 0.05, -2.25);
      mooredRiverBoat.rotation.y = 0.22;
      addInteractionProxy(
        mooredRiverBoat,
        [1.8, 1.5, 3.0],
        0.55,
        {
          kind: 'river_boat_board',
          tx: RIVER_BOARD_INTERACT.tx,
          tz: RIVER_BOARD_INTERACT.tz,
        },
        clickTargets,
      );
      eco.add(mooredRiverBoat);

      // Active Steerable Boat (shown when player embarks onto the river)
      const activeBuilt = buildWoodenRowboat(true);
      activeRiverBoat = activeBuilt.boat;
      activeBoatOarL = activeBuilt.oarLPivot;
      activeBoatOarR = activeBuilt.oarRPivot;
      activeRiverBoat.visible = false;
      eco.add(activeRiverBoat);
    }

    // 6. NPC Ship's Spacious Nautical Boathouse Shop with Large Roof Boat Logo (Tiệm Thuyền của Ship)
    {
      const stall = new THREE.Group();
      stall.position.set(SHIP_STALL_POS.x, 0.02, SHIP_STALL_POS.z);
      stall.rotation.y = 0; // Faces +Z toward river promenade & boat dock!

      const timberDark = getMat('#663D20', 0.78);
      const timberWarm = getMat('#B87F49', 0.68);
      const counterTopMat = getMat('#EFE0C4', 0.56);
      const awningSeaBlue = getMat('#3479A1', 0.58);
      const awningCream = getMat('#FBF4E6', 0.64);
      const wallCreamMat = getMat('#F4ECE0', 0.72);
      const wainscotNavyMat = getMat('#366887', 0.74);
      const roofSlateMat = getMat('#3F6C8C', 0.76);
      const brassTrimMat = getMat('#DCA94A', 0.35, 0.72);
      const buoyWhiteMat = getMat('#FAF8F2', 0.55);
      const buoyRedMat = getMat('#D95843', 0.55);

      // Raised Timber Wharf Deck (6.6m x 4.6m) + Corner Pilings & Wide Front Steps
      const deck = new THREE.Mesh(
        new RoundedBoxGeometry(6.6, 0.24, 4.6, 2, 0.05),
        getMat('#BE8D5B', 0.76),
      );
      deck.position.y = 0.12;
      stall.add(deck);

      for (let px = -3.05; px <= 3.05; px += 0.51) {
        const plank = new THREE.Mesh(
          new RoundedBoxGeometry(0.42, 0.03, 4.48, 1, 0.01),
          Math.round(px * 3) % 2 === 0 ? timberWarm : getMat('#AE7844', 0.74),
        );
        plank.position.set(px, 0.25, 0);
        stall.add(plank);
      }

      const frontStep = new THREE.Mesh(
        new RoundedBoxGeometry(3.4, 0.14, 0.72, 2, 0.03),
        getMat('#B48252', 0.76),
      );
      frontStep.position.set(0, 0.06, 2.58);
      stall.add(frontStep);

      // Corner & Mid Wharf Pilings / Bollards
      [
        [-3.05, -2.05],
        [0, -2.05],
        [3.05, -2.05],
        [-3.05, 2.05],
        [3.05, 2.05],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.22, 3.15, 0.22, 2, 0.03), timberDark);
        post.position.set(px, 1.72, pz);
        stall.add(post);
      });
      [-2.95, 2.95].forEach((bx) => {
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.62, 8), timberDark);
        bollard.position.set(bx, 0.45, 2.18);
        const bCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), timberWarm);
        bCap.position.set(bx, 0.76, 2.18);
        stall.add(bollard, bCap);
      });

      // Back Wall & Half-Side Nautical Walls with Glowing Porthole Windows
      const backLower = new THREE.Mesh(
        new RoundedBoxGeometry(6.15, 1.15, 0.18, 2, 0.03),
        wainscotNavyMat,
      );
      backLower.position.set(0, 0.82, -2.05);
      const backUpper = new THREE.Mesh(
        new RoundedBoxGeometry(6.15, 1.85, 0.16, 2, 0.03),
        wallCreamMat,
      );
      backUpper.position.set(0, 2.32, -2.05);
      stall.add(backLower, backUpper);

      [-2.98, 2.98].forEach((sx) => {
        const sideLower = new THREE.Mesh(
          new RoundedBoxGeometry(0.16, 1.12, 3.9, 2, 0.03),
          wainscotNavyMat,
        );
        sideLower.position.set(sx, 0.8, -0.1);
        const sideUpperBack = new THREE.Mesh(
          new RoundedBoxGeometry(0.15, 1.82, 1.85, 2, 0.03),
          wallCreamMat,
        );
        sideUpperBack.position.set(sx, 2.26, -1.12);
        stall.add(sideLower, sideUpperBack);
      });

      // Two Brass Porthole Windows on Back Wall
      [-1.75, 1.75].forEach((wx) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 8, 16), brassTrimMat);
        ring.position.set(wx, 2.24, -1.94);
        const portGlassMat = new THREE.MeshStandardMaterial({
          color: '#BCE6FA',
          emissive: '#FFE499',
          emissiveIntensity: 0.25,
          roughness: 0.2,
        });
        windowMeshes.push(portGlassMat);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 14), portGlassMat);
        glass.rotation.x = Math.PI / 2;
        glass.position.set(wx, 2.24, -1.96);
        stall.add(ring, glass);
      });

      // Upper Timber Perimeter Beams
      const beamF = new THREE.Mesh(new RoundedBoxGeometry(6.42, 0.16, 0.16, 2, 0.03), timberDark);
      beamF.position.set(0, 3.24, 2.05);
      const beamB = beamF.clone();
      beamB.position.z = -2.05;
      stall.add(beamF, beamB);

      // Coastal Pitched Roof Over Main Boathouse Body
      const gableRoof = createExtrudedRoof(6.95, 1.55, 3.95, roofSlateMat);
      gableRoof.position.set(0, 4.02, -0.2);
      const roofRidge = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.14, 4.3, 2, 0.03), timberDark);
      roofRidge.position.set(0, 4.84, -0.2);
      stall.add(gableRoof, roofRidge);

      // Wide Sloped Blue-Cream Striped Front Awning Over Counter & Porch
      const canopyGroup = new THREE.Group();
      canopyGroup.position.set(0, 3.22, 1.85);
      canopyGroup.rotation.x = 0.22;
      const canopyFrame = new THREE.Mesh(
        new RoundedBoxGeometry(6.75, 0.09, 2.2, 2, 0.03),
        timberWarm,
      );
      canopyFrame.position.y = -0.04;
      canopyGroup.add(canopyFrame);
      const stripeCount = 11;
      const stripeW = 6.6 / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        const stripe = new THREE.Mesh(
          new RoundedBoxGeometry(stripeW - 0.015, 0.12, 2.16, 2, 0.03),
          i % 2 === 0 ? awningSeaBlue : awningCream,
        );
        stripe.position.set(-6.6 / 2 + stripeW * (i + 0.5), 0.03, 0);
        const scallop = new THREE.Mesh(
          new THREE.CylinderGeometry(stripeW * 0.48, stripeW * 0.48, 0.07, 10),
          i % 2 === 0 ? awningSeaBlue : awningCream,
        );
        scallop.rotation.x = Math.PI / 2;
        scallop.position.set(-6.6 / 2 + stripeW * (i + 0.5), -0.04, 1.08);
        canopyGroup.add(stripe, scallop);
      }
      stall.add(canopyGroup);

      // Prominent Oversized Double-Sided "TIỆM CỦA SHIP" Signboard + Large 3D Sailboat Crest
      const topSignBoard = new THREE.Mesh(
        new RoundedBoxGeometry(2.88, 1.28, 0.14, 2, 0.04),
        timberDark,
      );
      topSignBoard.position.set(0, 4.18, 2.08);
      const topSignFront = new THREE.Mesh(
        createAtlasPlaneGeometry(2.68, 1.12, 'ship_stall'),
        signAtlasMat,
      );
      topSignFront.position.set(0, 4.18, 2.155);
      const topSignBack = new THREE.Mesh(
        createAtlasPlaneGeometry(2.68, 1.12, 'ship_stall'),
        signAtlasMat,
      );
      topSignBack.rotation.y = Math.PI;
      topSignBack.position.set(0, 4.18, 2.005);
      stall.add(topSignBoard, topSignFront, topSignBack);

      // Large 3D Boat Crest Above the Signboard
      const crestHull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.48, 0.24, 6),
        getMat('#B56F36', 0.65),
      );
      crestHull.scale.set(1.9, 1, 0.72);
      crestHull.position.set(0, 4.96, 2.08);
      const crestMast = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.85, 6), timberDark);
      crestMast.position.set(0, 5.42, 2.08);
      const crestSail = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.68, 3), awningSeaBlue);
      crestSail.rotation.y = Math.PI * 0.5;
      crestSail.position.set(0.08, 5.5, 2.08);
      stall.add(crestHull, crestMast, crestSail);

      // 3 Warm Hanging Harbor Lanterns Along Front Awning
      [-2.55, 0, 2.55].forEach((lx) => {
        const lampCap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.11, 7), timberDark);
        lampCap.position.set(lx, 2.86, 2.38);
        const shipLampMat = new THREE.MeshStandardMaterial({
          color: '#FFF4C2',
          emissive: '#FFCC66',
          emissiveIntensity: 0.35,
          roughness: 0.25,
        });
        lampBulbs.push(shipLampMat);
        const shipLantern = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 9), shipLampMat);
        shipLantern.position.set(lx, 2.72, 2.38);
        stall.add(lampCap, shipLantern);
      });

      // Wide 4.25m Front Wooden Counter + Nautical Props
      const counterBody = new THREE.Mesh(
        new RoundedBoxGeometry(4.25, 0.9, 0.84, 2, 0.05),
        timberWarm,
      );
      counterBody.position.set(0.1, 0.68, 0.82);
      const counterTop = new THREE.Mesh(
        new RoundedBoxGeometry(4.48, 0.11, 0.98, 2, 0.03),
        counterTopMat,
      );
      counterTop.position.set(0.1, 1.16, 0.82);
      stall.add(counterBody, counterTop);

      // Display Wooden Boat Model + Brass Compass + Coiled Rope on Counter
      const miniBoat = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.16, 0.36, 2, 0.05), timberDark);
      miniBoat.position.set(-1.15, 1.29, 0.84);
      miniBoat.rotation.y = 0.28;
      const miniSail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 3), awningSeaBlue);
      miniSail.position.set(-1.15, 1.6, 0.84);
      const compassBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.08, 10), brassTrimMat);
      compassBase.position.set(0.15, 1.25, 0.86);
      const ropeCoil = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.055, 7, 14),
        getMat('#E0C79C', 0.82),
      );
      ropeCoil.rotation.x = Math.PI / 2;
      ropeCoil.position.set(1.45, 1.27, 0.84);
      stall.add(miniBoat, miniSail, compassBase, ropeCoil);

      // Mounted Red-and-White Lifebuoy Ring on Left Pillar + Barrel & Leaning Oars
      const buoyRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.085, 8, 16), buoyWhiteMat);
      buoyRing.position.set(-3.05, 1.95, 2.2);
      stall.add(buoyRing);
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((ba) => {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.2), buoyRedMat);
        band.position.set(-3.05 + Math.cos(ba) * 0.32, 1.95 + Math.sin(ba) * 0.32, 2.2);
        band.rotation.z = ba;
        stall.add(band);
      });

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.78, 10), timberWarm);
      barrel.position.set(2.48, 0.62, 1.38);
      const crate = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.58, 0.72, 2, 0.04), timberWarm);
      crate.position.set(-2.42, 0.52, 1.44);
      stall.add(barrel, crate);

      [-0.5, -0.1, 0.3].forEach((oz, oi) => {
        const oar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.03, 2.05, 6),
          getMat(oi % 2 === 0 ? '#D49A5C' : '#B87C44', 0.65),
        );
        oar.position.set(-2.78, 1.22, oz);
        oar.rotation.z = -0.16;
        stall.add(oar);
      });

      // Display Wooden Boat Hull on Trestles Inside Right Bay (showcasing Ship's boat craftsmanship!)
      const displayBoat = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.26, 2.15, 2, 0.08), getMat('#A46233', 0.68));
      displayBoat.position.set(2.22, 0.68, -0.35);
      displayBoat.rotation.y = -0.22;
      [-0.75, 0.1].forEach((tz) => {
        const trestle = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.34, 0.12, 1, 0.02), timberDark);
        trestle.position.set(2.22, 0.4, tz);
        stall.add(trestle);
      });
      stall.add(displayBoat);

      // NPC Ship behind the wide counter facing +Z toward approaching players
      shipRig = buildAvatarRig(SHIP_AVATAR);
      shipRig.root.position.set(0.05, 0.26, -0.28);
      shipRig.root.rotation.y = 0;
      updateAvatarRigAnimation(shipRig, 'idle', 0, false);
      stall.add(shipRig.root);

      addInteractionProxy(
        stall,
        [6.8, 4.6, 5.0],
        2.0,
        {
          kind: 'ship_shop',
          tx: SHIP_STALL_INTERACT.tx,
          tz: SHIP_STALL_INTERACT.tz,
        },
        clickTargets,
      );
      colliders.push({
        type: 'box',
        id: 'ship_stall',
        x: SHIP_STALL_POS.x,
        z: SHIP_STALL_POS.z,
        hw: 3.45,
        hd: 2.48,
        rotY: 0,
      });

      mergeStaticGroupByMaterial(stall, new Set([shipRig.root]));
      eco.add(stall);
    }

    // 7. Static Fairy-Tale Instanced Eco-Decor (Mossy Rocks, River Grasses, Purple Water Hyacinths & Meadow Flora)
    {
      // A. Mossy Riverside Boulders (Tảng đá & đá bám rêu tĩnh ven sông + chân thác)
      const rockParts = [
        new THREE.DodecahedronGeometry(0.85, 0).scale(1.26, 0.78, 1.08).translate(0, 0.34, 0),
        new THREE.DodecahedronGeometry(0.5, 0).scale(1.12, 0.74, 0.96).translate(-0.72, 0.18, 0.3),
      ];
      const ecoRockGeo = mergeParts(rockParts);
      const ecoRockMat = getMat('#8994A0', 0.86);
      const ecoMossGeo = new THREE.SphereGeometry(0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
      ecoMossGeo.scale(1.18, 0.32, 1.04);
      ecoMossGeo.translate(0.02, 0.82, 0);
      const ecoMossMat = getMat('#54A358', 0.84);

      const riverRockSpots: [number, number, number, boolean][] = [];
      for (let i = 0; i < 42; i++) {
        const z = THREE.MathUtils.lerp(-58, 54, i / 41);
        const side = i % 2 === 0 ? 1 : -1;
        // Skip dock opening on east shore & bridge abutment
        if (Math.abs(z - WEST_BRIDGE_Z) < 2.8) continue;
        if (side > 0 && z > -4.2 && z < 0.8) continue;
        const cx = getWestRiverCenterX(z);
        const hw = getWestRiverHalfWidth(z);
        const rx = cx + side * (hw + 0.55 + (i % 3) * 0.45);
        const sc = 0.68 + (i % 4) * 0.24;
        const hasMoss = i % 3 !== 1;
        riverRockSpots.push([rx, z, sc, hasMoss]);
      }
      // Extra scenic rocks by waterfall lagoon & trailhead
      riverRockSpots.push(
        [-97.0, -15.4, 1.35, true],
        [-96.8, -2.5, 1.28, true],
        [-98.6, 18.2, 1.12, true],
        [-103.5, 20.8, 1.05, true],
      );

      const ecoRockIM = new THREE.InstancedMesh(ecoRockGeo, ecoRockMat, riverRockSpots.length);
      const mossSpots = riverRockSpots.filter(([, , , m]) => m);
      const ecoMossIM = new THREE.InstancedMesh(ecoMossGeo, ecoMossMat, mossSpots.length);

      let mIdx = 0;
      riverRockSpots.forEach(([rx, rz, rs, hasMoss], i) => {
        const gy = getTownGroundHeight(rx, rz) - 0.05;
        _instDummy.position.set(rx, gy, rz);
        _instDummy.rotation.set(0, (i * 1.47) % (Math.PI * 2), 0);
        _instDummy.scale.setScalar(rs);
        _instDummy.updateMatrix();
        ecoRockIM.setMatrixAt(i, _instDummy.matrix);
        if (hasMoss) {
          ecoMossIM.setMatrixAt(mIdx++, _instDummy.matrix);
        }
        colliders.push({type: 'circle', x: rx, z: rz, r: rs * 0.88});
        if (i % 4 === 0) {
          westInsectAnchors.push({
            x: rx,
            y: gy + rs * 0.72,
            z: rz,
            habitat: 'rock',
            zone: rx <= -63.5 ? 'riverside' : 'outer',
          });
        }
      });
      ecoRockIM.instanceMatrix.needsUpdate = true;
      ecoMossIM.instanceMatrix.needsUpdate = true;
      ecoRockIM.computeBoundingSphere();
      ecoMossIM.computeBoundingSphere();
      ecoRockIM.userData = {noShadowBlock: true};
      ecoMossIM.userData = {noShadowBlock: true};
      eco.add(ecoRockIM, ecoMossIM);

      // B. Static Instanced River Grasses & Reeds (Cỏ sông tĩnh — zero animation cost!)
      const rBladeParts: THREE.BufferGeometry[] = [];
      for (let b = 0; b < 7; b++) {
        const ang = (b / 7) * Math.PI * 2;
        const h = 0.62 + (b % 3) * 0.24;
        const blade = new THREE.ConeGeometry(0.056, h, 4);
        blade.translate(0, h / 2, 0);
        blade.rotateZ(0.24 + (b % 2) * 0.1);
        blade.rotateY(ang);
        blade.translate(Math.cos(ang) * 0.08, 0, Math.sin(ang) * 0.08);
        rBladeParts.push(blade);
      }
      const riverGrassGeo = mergeParts(rBladeParts);
      const riverGrassMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74});
      const grassCoords: [number, number, number][] = [];
      for (let i = 0; i < 86; i++) {
        const z = THREE.MathUtils.lerp(-58, 55, i / 85);
        const side = i % 2 === 0 ? 1 : -1;
        if (Math.abs(z - WEST_BRIDGE_Z) < 2.4) continue;
        if (side > 0 && z > -3.8 && z < 0.2) continue;
        if (side < 0 && z > -12.8 && z < -5.2) continue;
        const cx = getWestRiverCenterX(z);
        const hw = getWestRiverHalfWidth(z);
        const gx = cx + side * (hw * 0.86 + (i % 3) * 0.22);
        grassCoords.push([gx, z, 0.9 + (i % 4) * 0.16]);
      }
      const riverGrassIM = new THREE.InstancedMesh(riverGrassGeo, riverGrassMat, grassCoords.length);
      const rgPalette = ['#479E56', '#59B464', '#3D8C4D', '#67C070'];
      grassCoords.forEach(([gx, gz, gs], i) => {
        _instDummy.position.set(gx, RIVER_WATER_Y - 0.18, gz);
        _instDummy.rotation.set(0, i * 1.13, 0);
        _instDummy.scale.setScalar(gs);
        _instDummy.updateMatrix();
        riverGrassIM.setMatrixAt(i, _instDummy.matrix);
        _instColor.set(rgPalette[i % rgPalette.length]);
        riverGrassIM.setColorAt(i, _instColor);
        if (i % 5 === 0) {
          westInsectAnchors.push({
            x: gx,
            y: 0.25,
            z: gz,
            habitat: 'water_edge',
            zone: 'riverside',
          });
        }
      });
      riverGrassIM.instanceMatrix.needsUpdate = true;
      if (riverGrassIM.instanceColor) riverGrassIM.instanceColor.needsUpdate = true;
      riverGrassIM.computeBoundingSphere();
      riverGrassIM.userData = {noShadowBlock: true};
      eco.add(riverGrassIM);

      // C. Purple-Blooming Water Hyacinth Clusters (Lục bình hoa tím tĩnh ven sông)
      const hyLeafParts: THREE.BufferGeometry[] = [];
      for (let l = 0; l < 6; l++) {
        const a = (l / 6) * Math.PI * 2 + 0.2;
        const bulb = new THREE.SphereGeometry(0.095, 4, 3);
        bulb.scale(0.85, 0.65, 1.35);
        bulb.translate(Math.cos(a) * 0.12, 0.03, Math.sin(a) * 0.12);
        const pad = new THREE.SphereGeometry(0.13, 4, 3);
        pad.scale(1.15, 0.22, 1.3);
        pad.rotateX(-0.35);
        pad.rotateY(a);
        pad.translate(Math.cos(a) * 0.22, 0.09, Math.sin(a) * 0.22);
        hyLeafParts.push(bulb, pad);
      }
      const hyLeafGeo = mergeParts(hyLeafParts);
      const hyLeafMat = glossyClayMat('#55AE5C', 0.48);

      // Upright lavender-purple 6-floret hyacinth spike!
      const hySpikeParts: THREE.BufferGeometry[] = [];
      const hyGoldParts: THREE.BufferGeometry[] = [];
      for (let f = 0; f < 6; f++) {
        const fa = (f / 6) * Math.PI * 2;
        const fy = 0.2 + (f % 3) * 0.065;
        const fl = new THREE.SphereGeometry(0.068, 4, 3);
        fl.scale(0.95, 1.2, 0.68);
        fl.translate(Math.cos(fa) * 0.058, fy, Math.sin(fa) * 0.058);
        hySpikeParts.push(fl);
      }
      const hyTop = new THREE.SphereGeometry(0.065, 4, 3);
      hyTop.translate(0, 0.39, 0);
      hySpikeParts.push(hyTop);
      const hyGoldDot = new THREE.SphereGeometry(0.026, 4, 3);
      hyGoldDot.translate(0.055, 0.29, 0);
      hyGoldParts.push(hyGoldDot);

      const hyBloomGeo = mergeParts(hySpikeParts);
      const hyGoldGeo = mergeParts(hyGoldParts);
      const hyBloomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.44});
      const hyGoldMat = getMat('#FFD54F', 0.4);

      const hyacinthSpots: [number, number, number][] = [];
      for (let i = 0; i < 46; i++) {
        const z = THREE.MathUtils.lerp(-54, 52, i / 45);
        const side = i % 2 === 0 ? 1 : -1;
        if (Math.abs(z - WEST_BRIDGE_Z) < 2.2) continue;
        if (side > 0 && z > -4.6 && z < 0.8) continue;
        if (side < 0 && z > -13.0 && z < -4.8) continue;
        const cx = getWestRiverCenterX(z);
        const hw = getWestRiverHalfWidth(z);
        const hx = cx + side * (hw * 0.68 + ((i * 0.17) % 1.1));
        hyacinthSpots.push([hx, z, 0.86 + (i % 4) * 0.14]);
      }
      const hyLeafIM = new THREE.InstancedMesh(hyLeafGeo, hyLeafMat, hyacinthSpots.length);
      const hyBloomIM = new THREE.InstancedMesh(hyBloomGeo, hyBloomMat, hyacinthSpots.length);
      const hyGoldIM = new THREE.InstancedMesh(hyGoldGeo, hyGoldMat, hyacinthSpots.length);
      const hyPurpleTints = ['#9D74E8', '#B388F5', '#8C61DB', '#C298FF'];
      hyacinthSpots.forEach(([hx, hz, hs], i) => {
        _instDummy.position.set(hx, RIVER_WATER_Y + 0.012, hz);
        _instDummy.rotation.set(0, i * 1.4, 0);
        _instDummy.scale.setScalar(hs);
        _instDummy.updateMatrix();
        hyLeafIM.setMatrixAt(i, _instDummy.matrix);
        hyBloomIM.setMatrixAt(i, _instDummy.matrix);
        hyGoldIM.setMatrixAt(i, _instDummy.matrix);
        _instColor.set(hyPurpleTints[i % hyPurpleTints.length]);
        hyBloomIM.setColorAt(i, _instColor);
      });
      hyLeafIM.instanceMatrix.needsUpdate = true;
      hyBloomIM.instanceMatrix.needsUpdate = true;
      hyGoldIM.instanceMatrix.needsUpdate = true;
      if (hyBloomIM.instanceColor) hyBloomIM.instanceColor.needsUpdate = true;
      hyLeafIM.computeBoundingSphere();
      hyBloomIM.computeBoundingSphere();
      hyGoldIM.computeBoundingSphere();
      hyLeafIM.renderOrder = 4;
      hyBloomIM.renderOrder = 4;
      hyGoldIM.renderOrder = 4;
      hyLeafIM.userData = {noShadowBlock: true};
      hyBloomIM.userData = {noShadowBlock: true};
      hyGoldIM.userData = {noShadowBlock: true};
      eco.add(hyLeafIM, hyBloomIM, hyGoldIM);

      // D. Mountain Overlook & Riverbank Fairy-Tale Wildflowers (Static InstancedMesh)
      const wPetalParts: THREE.BufferGeometry[] = [];
      const wCenterParts: THREE.BufferGeometry[] = [];
      append5PetalFlower(wPetalParts, wCenterParts, 0, 0.18, 0, 1.35, 0.12, 0, 0.1);
      append5PetalFlower(wPetalParts, wCenterParts, 0.12, 0.14, 0.08, 1.05, 0.2, -0.2, 0.9);
      const wfTopGeo = mergeParts(wPetalParts);
      const wfCenterGeo = mergeParts(wCenterParts);
      const wfSpots: [number, number, string][] = [];
      const wfColors = ['#FF9BB5', '#B998FF', '#8EE0FF', '#FFF8E8', '#FFBC80'];
      for (let i = 0; i < 120; i++) {
        const ang = i * 2.39996;
        let wx = -82 + Math.cos(ang) * (12 + (i % 34));
        let wz = -6 + Math.sin(ang) * (14 + (i % 38));
        if (i % 3 === 0) {
          wx = -118 + Math.cos(ang) * (5 + (i % 15));
          wz = 6 + Math.sin(ang) * (4 + (i % 14));
        }
        if (Math.abs(wx - getWestRiverCenterX(wz)) < getWestRiverHalfWidth(wz) + 1.4) continue;
        if (wx >= -72 && wx <= -62 && wz >= -15 && wz <= 6) continue;
        wfSpots.push([wx, wz, wfColors[i % wfColors.length]]);
      }
      const wfTopIM = new THREE.InstancedMesh(
        wfTopGeo,
        new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.5}),
        wfSpots.length,
      );
      const wfCenterIM = new THREE.InstancedMesh(
        wfCenterGeo,
        getMat('#FFD24C', 0.42),
        wfSpots.length,
      );
      wfSpots.forEach(([fx, fz, col], i) => {
        const fy = getTownGroundHeight(fx, fz) - 0.01;
        _instDummy.position.set(fx, fy, fz);
        _instDummy.rotation.set(0, i * 0.9, 0);
        _instDummy.scale.setScalar(0.95 + (i % 3) * 0.18);
        _instDummy.updateMatrix();
        wfTopIM.setMatrixAt(i, _instDummy.matrix);
        wfCenterIM.setMatrixAt(i, _instDummy.matrix);
        _instColor.set(col);
        wfTopIM.setColorAt(i, _instColor);
        if (i % 6 === 0) {
          westInsectAnchors.push({
            x: fx,
            y: fy + 0.28,
            z: fz,
            habitat: 'flower',
            zone: fx <= -63.5 ? 'riverside' : 'outer',
          });
        }
      });
      wfTopIM.instanceMatrix.needsUpdate = true;
      wfCenterIM.instanceMatrix.needsUpdate = true;
      if (wfTopIM.instanceColor) wfTopIM.instanceColor.needsUpdate = true;
      wfTopIM.computeBoundingSphere();
      wfCenterIM.computeBoundingSphere();
      wfTopIM.userData = {noShadowBlock: true};
      wfCenterIM.userData = {noShadowBlock: true};
      eco.add(wfTopIM, wfCenterIM);

      // E. Woodland Trees Framing West Meadow, Trailhead & Mountain Summit Overlook
      const {trunkGeo: wtGeo, lowerCanopyGeo: wlGeo, upperCanopyGeo: wuGeo} = createTreeGeometries();
      const westTreeSpots: [number, number, number][] = [
        [-64.5, 4.5, 1.18],
        [-65.0, -19.5, 1.24],
        [-71.5, -24.5, 1.22],
        [-70.5, 19.5, 1.2],
        [-72.0, 32.5, 1.24],
        [-95.8, 16.5, 1.18],
        [-97.5, 25.5, 1.26],
        [-99.5, -27.5, 1.28],
        [-111.5, 20.5, 1.22],
        [-123.5, 14.0, 1.24],
        [-125.0, 2.5, 1.2],
        [-123.5, -7.2, 1.18],
        [-134.5, 5.0, 1.32],
        [-135.5, -15.5, 1.3],
      ];
      const wtIM = new THREE.InstancedMesh(wtGeo, getMat('#734C32', 0.84), westTreeSpots.length);
      const wlIM = new THREE.InstancedMesh(
        wlGeo,
        new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74}),
        westTreeSpots.length,
      );
      const wuIM = new THREE.InstancedMesh(
        wuGeo,
        new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.7}),
        westTreeSpots.length,
      );
      const wLowPal = ['#4E9756', '#56A25E', '#488E50'];
      const wUpPal = ['#6BBC73', '#75C67D', '#64B46C'];
      westTreeSpots.forEach(([tx, tz, ts], i) => {
        const gy = getTownGroundHeight(tx, tz) - 0.05;
        _instDummy.position.set(tx, gy, tz);
        _instDummy.rotation.set(0, i * 1.4, 0);
        _instDummy.scale.setScalar(ts);
        _instDummy.updateMatrix();
        wtIM.setMatrixAt(i, _instDummy.matrix);
        wlIM.setMatrixAt(i, _instDummy.matrix);
        wuIM.setMatrixAt(i, _instDummy.matrix);
        _instColor.set(wLowPal[i % wLowPal.length]);
        wlIM.setColorAt(i, _instColor);
        _instColor.set(wUpPal[i % wUpPal.length]);
        wuIM.setColorAt(i, _instColor);
        colliders.push({type: 'circle', x: tx, z: tz, r: 0.46 * ts});
        const barkAng = (i * 1.9 + 0.7) % (Math.PI * 2);
        const barkR = 0.29 * ts;
        westInsectAnchors.push({
          x: tx + Math.sin(barkAng) * barkR,
          y: gy + 0.96 * ts,
          z: tz + Math.cos(barkAng) * barkR,
          habitat: 'tree',
          clingAngle: barkAng,
          zone: tx <= -63.5 ? 'riverside' : 'outer',
        });
      });
      wtIM.instanceMatrix.needsUpdate = true;
      wlIM.instanceMatrix.needsUpdate = true;
      wuIM.instanceMatrix.needsUpdate = true;
      if (wlIM.instanceColor) wlIM.instanceColor.needsUpdate = true;
      if (wuIM.instanceColor) wuIM.instanceColor.needsUpdate = true;
      wtIM.computeBoundingSphere();
      wlIM.computeBoundingSphere();
      wuIM.computeBoundingSphere();
      wtIM.userData = {isTreeShadowCaster: true};
      wlIM.userData = {isTreeShadowCaster: true};
      wuIM.userData = {isTreeShadowCaster: true};
      eco.add(wtIM, wlIM, wuIM);
    }

    // 8. Khu Cắm Trại Bờ Tây (Large Walk-In Tent + 2 Log Benches + Fish-Roasting Firepit + BBQ Grill + Night Neon String Lights)
    {
      const campSite = new THREE.Group();
      const campSoilMat = new THREE.MeshStandardMaterial({
        color: '#C6AF84',
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const campPadCenter = new THREE.Mesh(new THREE.CircleGeometry(10.5, 28), campSoilMat);
      campPadCenter.rotation.x = -Math.PI / 2;
      campPadCenter.position.set(-113.5, 0.015, 36.2);
      const campPadTent = new THREE.Mesh(new THREE.CircleGeometry(5.6, 22), campSoilMat);
      campPadTent.rotation.x = -Math.PI / 2;
      campPadTent.position.set(-119.5, 0.016, 31.8);
      campSite.add(campPadCenter, campPadTent);

      // A. Walk-In Golden Dome Camping Tent (seamless curved arch doorway, solid thick groundsheet, attached rolled curtains)
      const TENT_X = -119.5;
      const TENT_Z = 31.8;
      const TENT_ROT_Y = 0.78;
      const tentGroup = new THREE.Group();
      tentGroup.position.set(TENT_X, 0.02, TENT_Z);
      tentGroup.rotation.y = TENT_ROT_Y;

      const tentGoldMat = new THREE.MeshStandardMaterial({
        color: '#F4B829',
        roughness: 0.62,
        side: THREE.DoubleSide,
      });
      const tentInnerGoldMat = new THREE.MeshStandardMaterial({
        color: '#DDA11E',
        roughness: 0.74,
        side: THREE.BackSide,
      });
      const tentTrimMat = getMat('#2E3746', 0.62);
      const tentFloorMat = getMat('#364152', 0.84);
      const tentMatMat = getMat('#D65F54', 0.75);
      const tentPillowMat = getMat('#FFF6E5', 0.7);
      const tentPoleMat = getMat('#262B34', 0.55);

      const TENT_R = 2.85;
      const TENT_H = 3.38;
      const DOOR_MAX_PHI = Math.asin(2.34 / TENT_H); // Crown of entrance arch at ~2.34m height
      const DOOR_BASE_HALF_THETA = 0.54; // Wide welcoming front arch without ragged doorway triangles
      const U_SEGS = 28;
      const V_SEGS = 16;
      const domeVerts: number[] = [];
      const domeUvs: number[] = [];
      const domeIdx: number[] = [];
      const leftDoorPts: THREE.Vector3[] = [];
      const rightDoorPts: THREE.Vector3[] = [];

      for (let v = 0; v <= V_SEGS; v++) {
        const phi = (v / V_SEGS) * (Math.PI * 0.5);
        const rawY = TENT_H * Math.sin(phi);
        const y = v === 0 ? -0.025 : rawY;
        const ringR = TENT_R * Math.cos(phi);
        let doorHalf = 0;
        if (phi < DOOR_MAX_PHI) {
          const hNorm = Math.max(0, rawY) / (TENT_H * Math.sin(DOOR_MAX_PHI));
          doorHalf = DOOR_BASE_HALF_THETA * Math.sqrt(Math.max(0, 1 - hNorm * hNorm));
        }

        const thetaStart = doorHalf;
        const thetaEnd = Math.PI * 2 - doorHalf;

        if (phi <= DOOR_MAX_PHI) {
          leftDoorPts.push(new THREE.Vector3(Math.sin(thetaStart) * ringR, Math.max(0, y), Math.cos(thetaStart) * ringR));
          rightDoorPts.push(new THREE.Vector3(Math.sin(thetaEnd) * ringR, Math.max(0, y), Math.cos(thetaEnd) * ringR));
        }

        for (let u = 0; u <= U_SEGS; u++) {
          const frac = u / U_SEGS;
          const theta = thetaStart + (thetaEnd - thetaStart) * frac;
          const vx = Math.sin(theta) * ringR;
          const vz = Math.cos(theta) * ringR;
          domeVerts.push(vx, y, vz);
          domeUvs.push(frac, v / V_SEGS);
        }
      }
      // Crown bridge point for the archway curve
      const crownPhi = DOOR_MAX_PHI;
      const crownPt = new THREE.Vector3(
        0,
        TENT_H * Math.sin(crownPhi),
        TENT_R * Math.cos(crownPhi),
      );
      const archCurvePts = [...leftDoorPts, crownPt, ...rightDoorPts.reverse()];

      const rowStride = U_SEGS + 1;
      for (let v = 0; v < V_SEGS; v++) {
        for (let u = 0; u < U_SEGS; u++) {
          const a = v * rowStride + u;
          const b = a + 1;
          const c = a + rowStride;
          const d = c + 1;
          domeIdx.push(a, b, c, b, d, c);
        }
      }
      const domeGeo = new THREE.BufferGeometry();
      domeGeo.setAttribute('position', new THREE.Float32BufferAttribute(domeVerts, 3));
      domeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(domeUvs, 2));
      domeGeo.setIndex(domeIdx);
      domeGeo.computeVertexNormals();
      const domeCanopy = new THREE.Mesh(domeGeo, tentGoldMat);
      tentGroup.add(domeCanopy);

      // Smooth continuous charcoal trim tube hugging the arched tent doorway edge cleanly
      const doorArchCurve = new THREE.CatmullRomCurve3(archCurvePts);
      const doorArchMesh = new THREE.Mesh(
        new THREE.TubeGeometry(doorArchCurve, 28, 0.052, 8, false),
        tentTrimMat,
      );
      tentGroup.add(doorArchMesh);

      // Solid raised waterproof groundsheet cylinder (completely prevents sandy terrain Z-fighting inside tent!)
      const tentFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(TENT_R - 0.06, TENT_R - 0.06, 0.08, 28),
        tentFloorMat,
      );
      tentFloor.position.y = 0.04;
      const tentFloorRim = new THREE.Mesh(
        new THREE.TorusGeometry(TENT_R - 0.08, 0.045, 6, 28),
        tentTrimMat,
      );
      tentFloorRim.rotation.x = Math.PI / 2;
      tentFloorRim.position.y = 0.068;

      const sleepingPad = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.09, 2.05, 2, 0.03), tentMatMat);
      sleepingPad.position.set(-0.68, 0.125, -0.52);
      const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.14, 0.38, 2, 0.05), tentPillowMat);
      pillow.position.set(-0.68, 0.205, -1.28);
      const rolledBag = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 1.05, 9),
        getMat('#548C9C', 0.72),
      );
      rolledBag.rotation.z = Math.PI / 2;
      rolledBag.position.set(0.75, 0.27, -1.25);
      tentGroup.add(tentFloor, tentFloorRim, sleepingPad, pillow, rolledBag);

      // Exterior Ribbed Arch Poles positioned strictly over solid dome canvas (avoiding doorway gap)
      [Math.PI * 0.36, Math.PI * 0.72, Math.PI * 1.28, Math.PI * 1.64].forEach((a) => {
        const ribCurvePts: THREE.Vector3[] = [];
        for (let s = 0; s <= 12; s++) {
          const p = (s / 12) * Math.PI * 0.5;
          ribCurvePts.push(
            new THREE.Vector3(
              Math.sin(a) * (TENT_R + 0.035) * Math.cos(p),
              (TENT_H + 0.035) * Math.sin(p),
              Math.cos(a) * (TENT_R + 0.035) * Math.cos(p),
            ),
          );
        }
        const rib = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribCurvePts), 14, 0.042, 6, false),
          tentPoleMat,
        );
        tentGroup.add(rib);
      });

      // Softly draped side tie-back flaps tucked directly onto left & right arch pillars (never floating)
      [-1, 1].forEach((side) => {
        const tieAng = side * DOOR_BASE_HALF_THETA;
        const fx = Math.sin(tieAng) * (TENT_R - 0.08);
        const fz = Math.cos(tieAng) * (TENT_R - 0.08);
        const flap = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.085, 1.25, 4, 8),
          tentInnerGoldMat,
        );
        flap.material = tentTrimMat;
        flap.position.set(fx * 0.98, 0.85, fz * 0.99);
        flap.rotation.z = side * 0.24;
        flap.rotation.x = -0.18;
        tentGroup.add(flap);
      });

      const tentHook = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 6), tentPoleMat);
      tentHook.position.set(0, TENT_H - 0.16, 0);
      const tentLampMat = new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.45,
        roughness: 0.25,
      });
      lampBulbs.push(tentLampMat);
      const tentLamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 9), tentLampMat);
      tentLamp.position.set(0, TENT_H - 0.34, 0);
      tentGroup.add(tentHook, tentLamp);

      // Perimeter wall-only colliders (open front arc so player walks freely inside the tent!)
      [Math.PI * 0.48, Math.PI * 0.74, Math.PI, -Math.PI * 0.74, -Math.PI * 0.48].forEach((ang, idx) => {
        const lx = Math.sin(ang) * 2.68;
        const lz = Math.cos(ang) * 2.68;
        const cosT = Math.cos(TENT_ROT_Y);
        const sinT = Math.sin(TENT_ROT_Y);
        const wx = TENT_X + lx * cosT + lz * sinT;
        const wz = TENT_Z - lx * sinT + lz * cosT;
        colliders.push({type: 'circle', id: `camp_tent_wall_${idx}`, x: wx, z: wz, r: 0.62});
      });
      mergeStaticGroupByMaterial(tentGroup);
      campSite.add(tentGroup);

      // B. Warm Fish-Roasting Campfire Pit at (-112.5, 0, 36.2)
      const FIRE_X = -112.5;
      const FIRE_Z = 36.2;
      const fireGroup = new THREE.Group();
      fireGroup.position.set(FIRE_X, 0.02, FIRE_Z);
      const fStoneMat = getMat('#89929D', 0.86);
      const fLogMat = getMat('#6E4325', 0.82);
      const fStickMat = getMat('#7E5130', 0.78);
      const fFishSkinMat = getMat('#C86A28', 0.48);
      const fFishBellyMat = getMat('#F8DFA8', 0.56);
      const fFishSearMat = getMat('#4A2512', 0.72);
      const fFishFinMat = getMat('#B85522', 0.52);
      const fFishEyeMat = getMat('#1C1714', 0.16);

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), fStoneMat);
        stone.scale.set(1.25, 0.7, 1.0);
        stone.position.set(Math.cos(a) * 0.88, 0.1, Math.sin(a) * 0.88);
        stone.rotation.y = a;
        fireGroup.add(stone);
      }
      const emberCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.74, 0.07, 12),
        new THREE.MeshStandardMaterial({
          color: '#4E2C1B',
          emissive: '#DD4B1E',
          emissiveIntensity: 0.72,
          roughness: 0.8,
        }),
      );
      emberCore.position.y = 0.04;
      fireGroup.add(emberCore);

      [0.25, -0.45, 1.15, 2.0].forEach((rot) => {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 1.15, 7), fLogMat);
        log.rotation.z = Math.PI / 2 - 0.18;
        log.rotation.y = rot;
        log.position.y = 0.14;
        fireGroup.add(log);
      });

      // 3 Realistic Forked Skewers Roasting Golden Crispy Whole Fish Over the Coals
      const roastFishProfile = [
        new THREE.Vector2(0.001, -0.22),
        new THREE.Vector2(0.056, -0.13),
        new THREE.Vector2(0.095, -0.02),
        new THREE.Vector2(0.102, 0.07),
        new THREE.Vector2(0.078, 0.16),
        new THREE.Vector2(0.001, 0.21),
      ];
      const roastFishBodyGeo = new THREE.LatheGeometry(roastFishProfile, 12);
      roastFishBodyGeo.rotateX(Math.PI / 2);

      [0.4, 2.35, -1.65].forEach((fa) => {
        const skewer = new THREE.Group();
        skewer.position.set(Math.cos(fa) * 1.14, 0.02, Math.sin(fa) * 1.14);
        skewer.rotation.y = Math.atan2(-Math.cos(fa), -Math.sin(fa));

        // Grounded Y-fork wooden prop holding the skewer
        const propPost = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.42, 6), fStickMat);
        propPost.position.set(0, 0.21, 0.1);
        const propForkL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.16, 5), fStickMat);
        propForkL.position.set(-0.04, 0.44, 0.12);
        propForkL.rotation.z = 0.45;
        const propForkR = propForkL.clone();
        propForkR.position.x = 0.04;
        propForkR.rotation.z = -0.45;

        // Angled roasting stick extending diagonally above the glowing coals
        const stickAnchor = new THREE.Group();
        stickAnchor.position.set(0, 0.42, 0.12);
        stickAnchor.rotation.x = -0.46;

        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.022, 1.12, 6), fStickMat);
        stick.rotation.x = Math.PI / 2;
        stick.position.set(0, 0, 0.34);

        const fishGroup = new THREE.Group();
        fishGroup.position.set(0, 0.015, 0.66);

        const fishBody = new THREE.Mesh(roastFishBodyGeo, fFishSkinMat);
        fishBody.scale.set(0.54, 1.0, 1.0);
        const fishBelly = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), fFishBellyMat);
        fishBelly.scale.set(0.56, 0.56, 1.78);
        fishBelly.position.set(0, -0.048, 0.02);

        // Charcoal sear grill marks across the fish flanks
        [-0.06, 0.01, 0.08].forEach((sz) => {
          const sear = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 5, 12), fFishSearMat);
          sear.scale.set(0.76, 1.12, 0.7);
          sear.position.z = sz;
          fishGroup.add(sear);
        });

        // Flared forked tail fin, dorsal fin, side pectoral fins & glossy eye
        const tailUp = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 3), fFishFinMat);
        tailUp.scale.set(0.28, 1, 1);
        tailUp.rotation.x = -Math.PI * 0.35;
        tailUp.position.set(0, 0.04, -0.25);
        const tailDown = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 3), fFishFinMat);
        tailDown.scale.set(0.28, 1, 1);
        tailDown.rotation.x = -Math.PI * 0.65;
        tailDown.position.set(0, -0.04, -0.25);

        const dorsalFin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 3), fFishFinMat);
        dorsalFin.scale.set(0.25, 0.9, 1.4);
        dorsalFin.rotation.x = -0.35;
        dorsalFin.position.set(0, 0.11, -0.02);

        [-1, 1].forEach((side) => {
          const pecFin = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 3), fFishFinMat);
          pecFin.scale.set(0.25, 1, 0.8);
          pecFin.rotation.z = side * 0.9;
          pecFin.rotation.x = 0.6;
          pecFin.position.set(side * 0.055, -0.02, 0.07);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 7, 6), fFishEyeMat);
          eye.position.set(side * 0.036, 0.032, 0.145);
          fishGroup.add(pecFin, eye);
        });

        fishGroup.add(fishBody, fishBelly, tailUp, tailDown, dorsalFin);
        stickAnchor.add(stick, fishGroup);
        skewer.add(propPost, propForkL, propForkR, stickAnchor);
        fireGroup.add(skewer);
      });

      westCampFlameA = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.85, 7),
        new THREE.MeshBasicMaterial({color: '#FF7B29', transparent: true, opacity: 0.92, depthWrite: false}),
      );
      westCampFlameA.position.y = 0.48;
      westCampFlameA.renderOrder = 6;
      westCampFlameB = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.62, 6),
        new THREE.MeshBasicMaterial({color: '#FFE066', transparent: true, opacity: 0.95, depthWrite: false}),
      );
      westCampFlameB.position.set(0.05, 0.42, -0.04);
      westCampFlameB.renderOrder = 6;
      westCampGlowMat = new THREE.MeshBasicMaterial({
        map: warmGlowTex,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const westGlowPool = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), westCampGlowMat);
      westGlowPool.rotation.x = -Math.PI / 2;
      westGlowPool.position.y = 0.036;
      westGlowPool.renderOrder = 2;
      fireGroup.add(westCampFlameA, westCampFlameB, westGlowPool);

      colliders.push({type: 'circle', id: 'west_camp_fire', x: FIRE_X, z: FIRE_Z, r: 1.18});
      mergeStaticGroupByMaterial(fireGroup, new Set([westCampFlameA, westCampFlameB, westGlowPool]));
      campSite.add(fireGroup);

      // C. Two Sit-able Carved Bark Log Benches (2 seats per log!) + 2 Folding Camping Chairs = 6 Total Seats around the Fire!
      const logBarkMat = getMat('#7C4E2C', 0.8);
      const logRingMat = getMat('#DFBA88', 0.72);
      [
        {id: 'west_camp_log_1', lx: -114.6, lz: 39.8},
        {id: 'west_camp_log_2', lx: -109.8, lz: 39.2},
      ].forEach(({id, lx, lz}) => {
        const rotY = Math.atan2(FIRE_X - lx, FIRE_Z - lz);
        const logGroup = new THREE.Group();
        logGroup.position.set(lx, 0.02, lz);
        logGroup.rotation.y = rotY;

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.55, 11), logBarkMat);
        trunk.rotation.z = Math.PI / 2;
        trunk.position.y = 0.24;
        [-1.28, 1.28].forEach((ex) => {
          const endCap = new THREE.Mesh(new THREE.CircleGeometry(0.21, 10), logRingMat);
          endCap.rotation.y = ex < 0 ? -Math.PI / 2 : Math.PI / 2;
          endCap.position.set(ex, 0.24, 0);
          logGroup.add(endCap);
        });
        [-0.78, 0.78].forEach((cx) => {
          const chock = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.42, 2, 0.03), fStoneMat);
          chock.position.set(cx, 0.06, 0);
          logGroup.add(chock);
        });
        logGroup.add(trunk);

        // Two distinct sit slots (±0.62m along log's local X axis) so 2 people can sit on each log
        const cosL = Math.cos(rotY);
        const sinL = Math.sin(rotY);
        const seatSlots = [-0.62, 0.62].map((localOffsetX) => {
          const sx = lx + localOffsetX * cosL;
          const sz = lz - localOffsetX * sinL;
          return {
            seatX: sx,
            seatZ: sz,
            seatY: 0.5,
            sitRotY: rotY,
            tx: sx - sinL * 0.92,
            tz: sz - cosL * 0.92,
          };
        });
        addInteractionProxy(
          logGroup,
          [2.75, 0.85, 0.92],
          0.35,
          {
            kind: 'bench',
            tx: seatSlots[0].tx,
            tz: seatSlots[0].tz,
            seatX: seatSlots[0].seatX,
            seatZ: seatSlots[0].seatZ,
            seatY: 0.5,
            sitRotY: rotY,
            seatSlots,
          },
          clickTargets,
        );
        colliders.push({type: 'box', id, x: lx, z: lz, hw: 1.28, hd: 0.34, rotY});
        mergeStaticGroupByMaterial(logGroup);
        campSite.add(logGroup);
      });

      // 2 Additional Folding Canvas & Wood Camping Chairs around Campfire (total 2*2 + 2 = 6 seats)
      const campChairWoodMat = getMat('#9C6B3F', 0.72);
      [
        {id: 'west_camp_chair_1', cx: -110.9, cz: 33.1, fabricHex: '#4E8F7C'},
        {id: 'west_camp_chair_2', cx: -114.2, cz: 33.4, fabricHex: '#D97B48'},
      ].forEach(({id, cx, cz, fabricHex}) => {
        const rotY = Math.atan2(FIRE_X - cx, FIRE_Z - cz);
        const fabricMat = getMat(fabricHex, 0.74);
        const chair = new THREE.Group();
        chair.position.set(cx, 0.02, cz);
        chair.rotation.y = rotY;

        // Crossed wooden X-legs
        [-0.25, 0.25].forEach((lx) => {
          const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.54, 6), campChairWoodMat);
          legA.position.set(lx, 0.21, 0);
          legA.rotation.x = 0.62;
          const legB = legA.clone();
          legB.rotation.x = -0.62;
          const arm = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.045, 0.52, 1, 0.015), campChairWoodMat);
          arm.position.set(lx, 0.62, -0.02);
          chair.add(legA, legB, arm);
        });
        const seatCanvas = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.065, 0.48, 2, 0.02), fabricMat);
        seatCanvas.position.set(0, 0.38, 0.02);
        const backCanvas = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.52, 0.065, 2, 0.02), fabricMat);
        backCanvas.position.set(0, 0.64, -0.22);
        backCanvas.rotation.x = -0.16;
        chair.add(seatCanvas, backCanvas);

        const standX = cx - Math.sin(rotY) * 0.78;
        const standZ = cz - Math.cos(rotY) * 0.78;
        addInteractionProxy(
          chair,
          [0.72, 0.95, 0.72],
          0.45,
          {
            kind: 'bench',
            tx: standX,
            tz: standZ,
            seatX: cx,
            seatZ: cz,
            seatY: 0.48,
            sitRotY: rotY,
          },
          clickTargets,
        );
        colliders.push({type: 'circle', id, x: cx, z: cz, r: 0.44});
        mergeStaticGroupByMaterial(chair);
        campSite.add(chair);
      });

      // D. Interactive Outdoor BBQ Grill ("Lò Nướng BBQ") at (-107.6, 0, 34.4)
      const BBQ_X = -107.6;
      const BBQ_Z = 34.4;
      const bbqGroup = new THREE.Group();
      bbqGroup.position.set(BBQ_X, 0.02, BBQ_Z);
      bbqGroup.rotation.y = -0.68;

      const bbqIronMat = getMat('#2F3540', 0.45, 0.55);
      const bbqSteelMat = getMat('#B7C0CC', 0.35, 0.68);
      const bbqShelfMat = getMat('#BA8551', 0.72);
      const bbqCoalMat = new THREE.MeshStandardMaterial({
        color: '#3A1F14',
        emissive: '#E54E1E',
        emissiveIntensity: 0.85,
        roughness: 0.8,
      });

      const bbqBasin = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.34, 0.84, 2, 0.05), bbqIronMat);
      bbqBasin.position.y = 0.86;
      const coalBed = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.08, 0.68, 1, 0.02), bbqCoalMat);
      coalBed.position.y = 0.98;
      const grateFrame = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.04, 0.74, 1, 0.01), bbqSteelMat);
      grateFrame.position.y = 1.05;
      [-0.58, 0.58].forEach((lx) => {
        [-0.32, 0.32].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.74, 7), bbqIronMat);
          leg.position.set(lx, 0.37, lz);
          bbqGroup.add(leg);
        });
      });
      const sideShelf = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.06, 0.72, 2, 0.02), bbqShelfMat);
      sideShelf.position.set(-0.98, 0.84, 0);
      // Prop skewers + corn + sausage sizzling on the grate
      const gSkewer = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.11, 0.14, 2, 0.04), getMat('#B54935', 0.55));
      gSkewer.position.set(-0.28, 1.12, 0.08);
      const gCorn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.28, 8), getMat('#F5C836', 0.45));
      gCorn.rotation.z = Math.PI / 2;
      gCorn.position.set(0.28, 1.12, -0.08);
      const gSausage = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), getMat('#C84D3C', 0.48));
      gSausage.rotation.z = Math.PI / 2;
      gSausage.position.set(0.18, 1.11, 0.18);
      bbqGroup.add(bbqBasin, coalBed, grateFrame, sideShelf, gSkewer, gCorn, gSausage);

      addInteractionProxy(
        bbqGroup,
        [2.2, 1.65, 1.3],
        0.75,
        {
          kind: 'campsite_bbq',
          tx: -108.9,
          tz: 35.8,
        },
        clickTargets,
      );
      colliders.push({type: 'box', id: 'west_camp_bbq', x: BBQ_X, z: BBQ_Z, hw: 0.92, hd: 0.62, rotY: -0.68});
      mergeStaticGroupByMaterial(bbqGroup);
      campSite.add(bbqGroup);

      labelAnchors.push({
        id: 'campsite_bbq_tag',
        label: 'Lò Nướng BBQ',
        worldPos: new THREE.Vector3(BBQ_X, 1.95, BBQ_Z),
      });

      // E. Overhead String Garland with Non-Glowing Colorful 5-Point Stars + 1 Gentle Campsite Lantern Near Tent
      const POLE_COORDS: [number, number][] = [
        [-123.5, 29.2],
        [-123.5, 42.2],
        [-111.5, 43.2],
        [-105.0, 38.2],
        [-106.5, 29.2],
      ];
      const poleWoodMat = getMat('#6D472B', 0.8);
      const cableMat = getMat('#282C34', 0.72);
      const pennantColors = ['#FF6B7B', '#FFD166', '#4DD0E1', '#FF9F68', '#C38FFF'];
      const starPalette = ['#FF6B9C', '#4DD0E1', '#FFD166', '#8AE66E', '#C38FFF', '#FF9F68'];

      POLE_COORDS.forEach(([px, pz], idx) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 6.2, 8), poleWoodMat);
        pole.position.set(px, 3.1, pz);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 7, 6), poleWoodMat);
        cap.position.set(px, 6.22, pz);
        campSite.add(pole, cap);
        colliders.push({type: 'circle', id: `camp_pole_${idx}`, x: px, z: pz, r: 0.34});
      });

      // Build shared extruded 5-pointed matte 3D star geometry (zero glow / zero glare!)
      const starShape = new THREE.Shape();
      for (let p = 0; p < 10; p++) {
        const rad = p % 2 === 0 ? 0.155 : 0.068;
        const a = (p / 10) * Math.PI * 2 - Math.PI / 2;
        const sx = Math.cos(a) * rad;
        const sy = Math.sin(a) * rad;
        if (p === 0) starShape.moveTo(sx, sy);
        else starShape.lineTo(sx, sy);
      }
      starShape.closePath();
      const starGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.055,
        bevelEnabled: false,
      });
      starGeo.translate(0, 0, -0.0275);

      const stringPairs: [number, number][] = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 0],
        [1, 4],
      ];

      stringPairs.forEach(([ia, ib], sIdx) => {
        const [ax, az] = POLE_COORDS[ia];
        const [bx, bz] = POLE_COORDS[ib];
        const segs = 10;
        let prevPt = new THREE.Vector3(ax, 5.95, az);
        const lineYaw = Math.atan2(bz - az, bx - ax);
        for (let k = 1; k <= segs; k++) {
          const t = k / segs;
          const curPt = new THREE.Vector3(
            THREE.MathUtils.lerp(ax, bx, t),
            5.95 - Math.sin(t * Math.PI) * 0.55,
            THREE.MathUtils.lerp(az, bz, t),
          );
          const d = prevPt.distanceTo(curPt);
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, d, 5), cableMat);
          wire.position.copy(prevPt).lerp(curPt, 0.5);
          wire.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            curPt.clone().sub(prevPt).normalize(),
          );
          campSite.add(wire);

          if (k < segs) {
            const flag = new THREE.Mesh(
              new THREE.ConeGeometry(0.15, 0.3, 3),
              getMat(pennantColors[(sIdx + k) % pennantColors.length], 0.62),
            );
            flag.rotation.x = Math.PI;
            flag.rotation.y = lineYaw;
            flag.position.set(curPt.x, curPt.y - 0.17, curPt.z);
            campSite.add(flag);

            if (k % 2 === 1) {
              // Non-glowing colorful star charm hanging neatly on string cable
              const starMat = getMat(starPalette[(sIdx + k) % starPalette.length], 0.54);
              const star = new THREE.Mesh(starGeo, starMat);
              star.position.set(curPt.x, curPt.y - 0.12, curPt.z);
              star.rotation.y = lineYaw;
              star.rotation.z = Math.sin(k + sIdx) * 0.12;
              campSite.add(star);
            }
          }
          prevPt = curPt;
        }
      });

      // Gentle Warm Campsite Lantern Pole Beside the Golden Tent (sole soft warm light at night)
      const LANTERN_X = -116.1;
      const LANTERN_Z = 32.3;
      const lanternStand = new THREE.Group();
      lanternStand.position.set(LANTERN_X, 0.02, LANTERN_Z);
      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.14, 8), poleWoodMat);
      lBase.position.y = 0.07;
      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.072, 2.55, 8), poleWoodMat);
      lPost.position.y = 1.3;
      const lArm = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.06, 0.06, 1, 0.015), poleWoodMat);
      lArm.position.set(0.18, 2.48, 0);
      const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.14, 8), cableMat);
      lCap.position.set(0.36, 2.34, 0);
      westCampLanternMat = new THREE.MeshStandardMaterial({
        color: '#FFF4CE',
        emissive: '#FFCC73',
        emissiveIntensity: 0.12,
        roughness: 0.3,
      });
      const lGlobe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.24, 10), westCampLanternMat);
      lGlobe.position.set(0.36, 2.18, 0);
      const lBot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.05, 8), cableMat);
      lBot.position.set(0.36, 2.04, 0);
      westCampLanternPoolMat = new THREE.MeshBasicMaterial({
        map: warmGlowTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const lPool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), westCampLanternPoolMat);
      lPool.rotation.x = -Math.PI / 2;
      lPool.position.set(0.36, 0.035, 0);
      lPool.renderOrder = 2;
      lanternStand.add(lBase, lPost, lArm, lCap, lGlobe, lBot, lPool);
      colliders.push({type: 'circle', id: 'west_camp_lantern', x: LANTERN_X, z: LANTERN_Z, r: 0.28});

      mergeStaticGroupByMaterial(campSite, new Set([lGlobe, lPool]));
      campSite.add(lanternStand);
      eco.add(campSite);
    }

    group.add(eco);
  }

  // ========== SPARSE FARM-STYLE PALE STEPPING STONES (STOPPING SHORT BEFORE BUILDINGS) ==========
  {
    const stoneTrailSpots: [number, number, number, number][] = [];

    const addSteppingTrail = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      spacing = 1.38,
      stagger = 0.34,
    ) => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) return;
      const ux = dx / len;
      const uz = dz / len;
      const px = -uz;
      const pz = ux;
      const count = Math.max(1, Math.floor(len / spacing) + 1);
      for (let i = 0; i < count; i++) {
        const d = i * spacing;
        const t = Math.min(1, d / len);
        const side = (i % 2 === 0 ? -1 : 1) * stagger;
        const sx = THREE.MathUtils.lerp(x0, x1, t) + px * side;
        const sz = THREE.MathUtils.lerp(z0, z1, t) + pz * side;
        const scale = 0.88 + (i % 3) * 0.13;
        const rot = ((Math.round(sx * 7 + sz * 11) + i) * 0.65) % (Math.PI * 2);
        stoneTrailSpots.push([sx, sz, scale, rot]);
      }
    };

    // East-West Main Trail (z = 0) + Scenic Mall Spur stopping cleanly at May Mall Forecourt Steps
    addSteppingTrail(-35.5, 0, -8.8, 0);
    addSteppingTrail(-43.2, -2.5, -36.0, -0.3);
    addSteppingTrail(8.8, 0, 35.5, 0);

    // West Eco-Zone Trails (connecting May Mall promenade -> Ship's Stall -> Boat Dock -> Bridge -> Mountain Trailhead)
    addSteppingTrail(-62.4, -2.5, -67.8, -8.4);
    addSteppingTrail(-62.4, -1.8, -73.0, -1.8);
    addSteppingTrail(-62.4, 3.2, -74.0, 8.5);
    addSteppingTrail(-94.4, 8.5, -100.2, 18.8);

    // Center North-South Spine (stops well short of Hill in North, flows south into meadow)
    addSteppingTrail(0, -8.8, 0, -19.2);
    addSteppingTrail(0, 8.8, 0, 51.0);

    // North Street (z = -12.5) + short approach spurs that STOP before reaching Home / Patio / Garden
    addSteppingTrail(-32.0, -12.5, -1.6, -12.5);
    addSteppingTrail(1.6, -12.5, 32.0, -12.5);
    addSteppingTrail(-32.0, -13.9, -32.0, -14.2);
    addSteppingTrail(-12.5, -13.9, -12.5, -14.2);
    addSteppingTrail(32.0, -13.9, 32.0, -14.2);

    // West & East N-S Connector Trails (x = ±23.5, cleanly clear of all buildings)
    addSteppingTrail(-23.5, -11.0, -23.5, -1.6);
    addSteppingTrail(-23.5, 1.6, -23.5, 25.2);
    addSteppingTrail(23.5, -11.0, 23.5, -1.6);
    addSteppingTrail(23.5, 1.6, 23.5, 25.2);

    // South Street (z = 26.8) + short approach spurs that STOP cleanly before Boutique & Arcade
    addSteppingTrail(-32.0, 26.8, -1.6, 26.8);
    addSteppingTrail(1.6, 26.8, 32.0, 26.8);
    addSteppingTrail(-32.0, 25.3, -32.0, 25.0);
    addSteppingTrail(32.0, 25.3, 32.0, 25.0);

    // Far-South Spurs stopping cleanly ~1.8m BEFORE the Fishing Bridge, Pet Shop & Post Office
    addSteppingTrail(-22.5, 34.8, -1.6, 34.8);
    addSteppingTrail(1.6, 46.2, 24.0, 46.2);
    addSteppingTrail(11.8, 46.2, 11.8, 44.2);
    addSteppingTrail(24.0, 44.8, 24.0, 44.5);

    const stoneGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.055, 9);
    const stoneMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.84});
    const stoneTrailIM = new THREE.InstancedMesh(stoneGeo, stoneMat, stoneTrailSpots.length);
    const paleStonePalette = ['#E4D6C0', '#D6C5AC', '#EBE0CD', '#CBBBA2'];

    stoneTrailSpots.forEach(([sx, sz, s, rot], i) => {
      _instDummy.position.set(sx, getTownGroundHeight(sx, sz) + 0.008, sz);
      _instDummy.rotation.set(0, rot, 0);
      _instDummy.scale.set(s * (1 + (i % 2) * 0.16), 1, s * 0.86);
      _instDummy.updateMatrix();
      stoneTrailIM.setMatrixAt(i, _instDummy.matrix);
      _instColor.set(paleStonePalette[i % paleStonePalette.length]);
      stoneTrailIM.setColorAt(i, _instColor);
    });
    stoneTrailIM.instanceMatrix.needsUpdate = true;
    if (stoneTrailIM.instanceColor) stoneTrailIM.instanceColor.needsUpdate = true;
    stoneTrailIM.computeBoundingSphere();
    stoneTrailIM.userData = {kind: 'ground'};
    group.add(stoneTrailIM);
  }

  // ========== DISTRICT 7: GÓC TRÀ BÁNH, ANH ĐÀO RỤNG HOA & DÂY ĐÈN ĐÊM ==========
  const patioCenter = {x: -12.5, z: -21.5};
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

    // Grand Sculpted Cherry Blossom Tree beside the tea patio (8m+ tall with fuller blooms!)
    const {
      trunkGeo: patSakTrunkGeo,
      blossomGeo: patSakBlossomGeo,
      accentBloomGeo: patSakAccentGeo,
      accentCenterGeo: patSakCenterGeo,
    } = createSakuraGeometries();
    const patSakura = new THREE.Group();
    patSakura.position.set(-3.6, 0.02, -2.7);
    patSakura.rotation.y = 0.52;
    patSakura.scale.setScalar(2.38);
    const patSakTrunk = new THREE.Mesh(patSakTrunkGeo, getMat('#5C3E32', 0.82));
    const patSakBlossom = new THREE.Mesh(patSakBlossomGeo, getMat('#FFB7CD', 0.64));
    const patSakAccent = new THREE.Mesh(patSakAccentGeo, getMat('#F579A5', 0.52));
    const patSakCenter = new THREE.Mesh(patSakCenterGeo, getMat('#FFE48F', 0.46));
    patSakura.add(patSakTrunk, patSakBlossom, patSakAccent, patSakCenter);
    patio.add(patSakura);
    colliders.push({
      type: 'circle',
      id: 'patio_sakura_tree',
      x: patioCenter.x - 3.6,
      z: patioCenter.z - 2.7,
      r: 0.78,
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
        h0: 5.1 + (i % 5) * 0.36,
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

    mergeStaticGroupByMaterial(patio);
    group.add(patio);
  }

  // ========== 3. DIVERSE SCULPTED TREES ACROSS VAST OPEN MAP (OAKS + BRANCHED + LUSH PINES + SMALL UNDER-CANOPY LANTERNS) ==========
  // A. Broadleaf Shade Oaks (Wide canopies + visible boughs, never hiding enlarged buildings)
  const {trunkGeo, lowerCanopyGeo, upperCanopyGeo} = createTreeGeometries();
  const trunkMat = getMat('#734C32', 0.84);
  const lowerLeafMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74});
  const upperLeafMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.7});

  // [x, z, scale, hasLantern, lanternAngleRad]
  const oakTreesRaw: [number, number, number, boolean?, number?][] = [
    [-13.5, -5.8, 1.44, true, 0.78],
    [13.8, -5.8, 1.24, true, 2.36],
    [-13.8, 6.2, 1.22, true, -0.78],
    [13.8, 6.2, 1.48, true, -2.36],
    [-10.2, 17.5, 1.18, true, 0.2],
    [10.5, 17.5, 1.46, true, Math.PI - 0.2],
    [9.6, -24.4, 1.16, true, -0.55],
    [-44.5, -18.5, 1.56, true, 0.5],
    [51.5, -18.5, 1.32, true, 2.6],
    [-44.5, 16.5, 1.26, true, -0.45],
    [45.0, 16.5, 1.54, true, -2.5],
    [-37.5, 36.0, 1.48, true, 0.7],
    [36.5, 35.5, 1.26, true, 2.45],
    [-8.8, 56.5, 1.58, true, -1.2],
    [12.8, 53.5, 1.28, true, -2.0],
    [-69.0, 4.0, 1.62, true, 0.1],
    [56.5, -4.8, 1.34, true, Math.PI - 0.1],
    [-55.0, 29.5, 1.32, true, -0.3],
    [55.5, 29.0, 1.64, true, -Math.PI + 0.3],
    [-40.5, 59.5, 1.58, true, 0.9],
    [40.5, 55.5, 1.32, true, 2.2],
    [25.5, 48.0, 1.52, true, 2.7],
    [-62.0, -34.0, 1.66, true, 0.5],
    [62.5, -34.5, 1.34, true, 2.6],
    [-60.5, 42.0, 1.56, true, -0.5],
    [60.5, 41.5, 1.32, true, -2.5],
    [-22.0, 62.5, 1.7, true, 1.1],
    [22.5, 61.5, 1.54, true, 2.0],
  ];
  const oakTrees = oakTreesRaw.filter(([tx, tz]) => !isInWestRiverOrCliffZone(tx, tz));

  const oakLowerPalette = ['#4E9756', '#56A25E', '#488E50', '#5CA863'];
  const oakUpperPalette = ['#6BBC73', '#75C67D', '#64B46C', '#7ECD85'];

  const treeLanternSpots: {x: number; y: number; z: number; rotY: number; scale: number}[] = [];
  const treeNestMatrices: THREE.Matrix4[] = [];
  const treeBerryRecords: {mat: THREE.Matrix4; color: string}[] = [];
  const berryColors = ['#E94E65', '#F26B82', '#F7A83B'];

  type OakRec = {mat: THREE.Matrix4; lowCol: string; upCol: string};
  const oakQuads: OakRec[][] = [[], [], [], []];

  oakTrees.forEach(([tx, tz, ts, hasLantern, lanternAng], i) => {
    const gy = getTownGroundHeight(tx, tz) - 0.04;
    const rotY = (i * 1.41) % (Math.PI * 2);
    _instDummy.position.set(tx, gy, tz);
    _instDummy.rotation.set(0, rotY, 0);
    _instDummy.scale.setScalar(ts);
    _instDummy.updateMatrix();
    const q = (tx >= 0 ? 1 : 0) + (tz >= 0 ? 2 : 0);
    oakQuads[q].push({
      mat: _instDummy.matrix.clone(),
      lowCol: oakLowerPalette[i % oakLowerPalette.length],
      upCol: oakUpperPalette[i % oakUpperPalette.length],
    });

    colliders.push({type: 'circle', x: tx, z: tz, r: 0.48 * ts});

    if (hasLantern) {
      treeLanternSpots.push({
        x: tx,
        y: gy + 1.88 * ts,
        z: tz,
        rotY: lanternAng ?? 0,
        scale: ts,
      });
    }

    // Add woven bird nests tucked onto oak boughs (even trees)
    if (i % 2 === 0 && treeNestMatrices.length < 10) {
      _instDummy.position.set(tx, gy, tz);
      _instDummy.rotation.set(0, rotY, 0);
      _instDummy.scale.setScalar(ts);
      _instDummy.updateMatrix();
      treeNestMatrices.push(_instDummy.matrix.clone());
    }

    // Add vibrant berry clusters on select oak trees (odd trees)
    if (i % 2 === 1) {
      _instDummy.position.set(tx, gy, tz);
      _instDummy.rotation.set(0, rotY, 0);
      _instDummy.scale.setScalar(ts);
      _instDummy.updateMatrix();
      treeBerryRecords.push({
        mat: _instDummy.matrix.clone(),
        color: berryColors[i % berryColors.length],
      });
    }
  });

  oakQuads.forEach((recs) => {
    if (recs.length === 0) return;
    const qTrunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, recs.length);
    const qLowerIM = new THREE.InstancedMesh(lowerCanopyGeo, lowerLeafMat, recs.length);
    const qUpperIM = new THREE.InstancedMesh(upperCanopyGeo, upperLeafMat, recs.length);
    recs.forEach((r, qi) => {
      qTrunkIM.setMatrixAt(qi, r.mat);
      qLowerIM.setMatrixAt(qi, r.mat);
      qUpperIM.setMatrixAt(qi, r.mat);
      _instColor.set(r.lowCol);
      qLowerIM.setColorAt(qi, _instColor);
      _instColor.set(r.upCol);
      qUpperIM.setColorAt(qi, _instColor);
    });
    qTrunkIM.instanceMatrix.needsUpdate = true;
    qLowerIM.instanceMatrix.needsUpdate = true;
    qUpperIM.instanceMatrix.needsUpdate = true;
    if (qLowerIM.instanceColor) qLowerIM.instanceColor.needsUpdate = true;
    if (qUpperIM.instanceColor) qUpperIM.instanceColor.needsUpdate = true;
    qTrunkIM.computeBoundingSphere();
    qLowerIM.computeBoundingSphere();
    qUpperIM.computeBoundingSphere();
    qTrunkIM.userData = {isTreeShadowCaster: true};
    qLowerIM.userData = {isTreeShadowCaster: true};
    qUpperIM.userData = {isTreeShadowCaster: true};
    group.add(qTrunkIM, qLowerIM, qUpperIM);
  });

  // Bird Nests on Trees (Tổ chim nhỏ xinh trên tán cành cây sồi)
  if (treeNestMatrices.length > 0) {
    const nestRimGeo = new THREE.TorusGeometry(0.18, 0.065, 7, 14);
    nestRimGeo.rotateX(Math.PI / 2);
    nestRimGeo.translate(0.46, 2.02, 0.16);
    const nestCupGeo = new THREE.CylinderGeometry(0.18, 0.1, 0.1, 10);
    nestCupGeo.translate(0.46, 1.98, 0.16);
    const twigNestGeo = mergeParts([nestRimGeo, nestCupGeo]);
    const twigNestMat = getMat('#8C5C36', 0.88);
    const twigNestIM = new THREE.InstancedMesh(twigNestGeo, twigNestMat, treeNestMatrices.length);

    const egg1 = new THREE.SphereGeometry(0.05, 7, 6);
    egg1.scale(0.85, 1.25, 0.85);
    egg1.translate(0.41, 2.04, 0.14);
    const egg2 = new THREE.SphereGeometry(0.048, 7, 6);
    egg2.scale(0.85, 1.25, 0.85);
    egg2.translate(0.51, 2.035, 0.18);
    const eggsGeo = mergeParts([egg1, egg2]);
    const eggsMat = glossyClayMat('#BFE8F7', 0.35);
    const eggsIM = new THREE.InstancedMesh(eggsGeo, eggsMat, treeNestMatrices.length);

    treeNestMatrices.forEach((m, idx) => {
      twigNestIM.setMatrixAt(idx, m);
      eggsIM.setMatrixAt(idx, m);
    });
    twigNestIM.instanceMatrix.needsUpdate = true;
    eggsIM.instanceMatrix.needsUpdate = true;
    twigNestIM.computeBoundingSphere();
    eggsIM.computeBoundingSphere();
    twigNestIM.userData = {noShadowBlock: true};
    eggsIM.userData = {noShadowBlock: true};
    group.add(twigNestIM, eggsIM);
  }

  // B. Multi-Branched Woodland Trees (visible forked boughs & airy leaf tufts)
  const {
    trunkGeo: branchTrunkGeo,
    lowerCanopyGeo: branchLowerGeo,
    upperCanopyGeo: branchUpperGeo,
  } = createBranchedWoodlandGeometries();
  const branchTrunkMat = getMat('#8B6B4F', 0.8);
  const branchLeafLowMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.72});
  const branchLeafUpMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.68});

  const branchedTreesRaw: [number, number, number, boolean?, number?][] = [
    [-8.2, -9.2, 1.16, true, -0.4],
    [8.4, -9.2, 1.38, true, -Math.PI + 0.4],
    [-8.2, 31.5, 1.42, true, 0.3],
    [8.4, 31.5, 1.18, true, Math.PI - 0.3],
    [19.4, -18.8, 1.36, true, 2.55],
    [-18.8, 6.8, 1.2, true, -0.35],
    [18.8, 6.8, 1.42, true, -2.8],
    [-43.5, -13.5, 1.26, true, 0.25],
    [43.0, -5.5, 1.46, true, Math.PI - 0.25],
    [-42.0, 29.5, 1.5, true, -0.4],
    [42.0, 29.5, 1.26, true, -2.7],
    [-27.5, -34.0, 1.3, true, -0.6],
    [27.5, -33.5, 1.52, true, -2.5],
    [-66.0, 13.5, 1.56, true, 0.15],
    [60.5, 11.5, 1.32, true, Math.PI - 0.15],
    [-48.5, -36.0, 1.54, true, -0.65],
    [49.0, -36.5, 1.34, true, -2.45],
    [-33.5, 18.0, 1.24, true, 0.3],
    [34.0, 18.0, 1.44, true, 2.8],
    [-52.0, 56.0, 1.52, true, 0.5],
    [52.5, 55.5, 1.28, true, 2.6],
    [-18.5, -48.5, 1.46, true, -0.7],
    [18.5, -48.5, 1.26, true, -2.4],
  ];
  const branchedTrees = branchedTreesRaw.filter(([tx, tz]) => !isInWestRiverOrCliffZone(tx, tz));

  const branchTrunkIM = new THREE.InstancedMesh(branchTrunkGeo, branchTrunkMat, branchedTrees.length);
  const branchLowIM = new THREE.InstancedMesh(branchLowerGeo, branchLeafLowMat, branchedTrees.length);
  const branchUpIM = new THREE.InstancedMesh(branchUpperGeo, branchLeafUpMat, branchedTrees.length);

  const birchLowPalette = ['#68AE64', '#72B66A', '#5FA45E', '#7AC071'];
  const birchUpPalette = ['#86CC7D', '#93D688', '#7CC474', '#9DDD92'];

  branchedTrees.forEach(([tx, tz, ts, hasLantern, lanternAng], i) => {
    const gy = getTownGroundHeight(tx, tz) - 0.04;
    const rotY = (i * 1.95) % (Math.PI * 2);
    _instDummy.position.set(tx, gy, tz);
    _instDummy.rotation.set(0, rotY, 0);
    _instDummy.scale.setScalar(ts);
    _instDummy.updateMatrix();
    branchTrunkIM.setMatrixAt(i, _instDummy.matrix);
    branchLowIM.setMatrixAt(i, _instDummy.matrix);
    branchUpIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(birchLowPalette[i % birchLowPalette.length]);
    branchLowIM.setColorAt(i, _instColor);
    _instColor.set(birchUpPalette[i % birchUpPalette.length]);
    branchUpIM.setColorAt(i, _instColor);

    colliders.push({type: 'circle', x: tx, z: tz, r: 0.36 * ts});

    if (hasLantern) {
      treeLanternSpots.push({
        x: tx,
        y: gy + 1.54 * ts,
        z: tz,
        rotY: lanternAng ?? 0,
        scale: ts * 0.92,
      });
    }

    // Add bright berries on every 3rd woodland tree as well
    if (i % 3 === 1) {
      _instDummy.position.set(tx, gy + 0.1, tz);
      _instDummy.rotation.set(0, rotY, 0);
      _instDummy.scale.setScalar(ts * 0.94);
      _instDummy.updateMatrix();
      treeBerryRecords.push({
        mat: _instDummy.matrix.clone(),
        color: berryColors[(i + 1) % berryColors.length],
      });
    }
  });
  branchTrunkIM.instanceMatrix.needsUpdate = true;
  branchLowIM.instanceMatrix.needsUpdate = true;
  branchUpIM.instanceMatrix.needsUpdate = true;
  if (branchLowIM.instanceColor) branchLowIM.instanceColor.needsUpdate = true;
  if (branchUpIM.instanceColor) branchUpIM.instanceColor.needsUpdate = true;
  branchTrunkIM.computeBoundingSphere();
  branchLowIM.computeBoundingSphere();
  branchUpIM.computeBoundingSphere();
  branchTrunkIM.userData = {isTreeShadowCaster: true};
  branchLowIM.userData = {isTreeShadowCaster: true};
  branchUpIM.userData = {isTreeShadowCaster: true};
  group.add(branchTrunkIM, branchLowIM, branchUpIM);

  // Berry Clusters on Tree Canopies (Quả mọng đỏ / vàng trên một số cây)
  if (treeBerryRecords.length > 0) {
    const berryParts: THREE.BufferGeometry[] = [];
    const berryClusterAnchors: [number, number, number][] = [
      [0.86, 2.38, 0.42],
      [-0.78, 2.52, 0.56],
      [0.24, 2.84, -0.84],
      [-0.58, 2.28, -0.72],
      [0.64, 3.05, 0.18],
    ];
    berryClusterAnchors.forEach(([bx, by, bz]) => {
      const b1 = new THREE.SphereGeometry(0.082, 7, 6);
      b1.translate(bx, by, bz);
      const b2 = new THREE.SphereGeometry(0.072, 6, 5);
      b2.translate(bx + 0.085, by - 0.04, bz + 0.04);
      const b3 = new THREE.SphereGeometry(0.068, 6, 5);
      b3.translate(bx - 0.05, by - 0.06, bz + 0.075);
      berryParts.push(b1, b2, b3);
    });
    const berryGeo = mergeParts(berryParts);
    const berryMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.42});
    const treeBerryIM = new THREE.InstancedMesh(berryGeo, berryMat, treeBerryRecords.length);
    treeBerryRecords.forEach((rec, idx) => {
      treeBerryIM.setMatrixAt(idx, rec.mat);
      _instColor.set(rec.color);
      treeBerryIM.setColorAt(idx, _instColor);
    });
    treeBerryIM.instanceMatrix.needsUpdate = true;
    if (treeBerryIM.instanceColor) treeBerryIM.instanceColor.needsUpdate = true;
    treeBerryIM.computeBoundingSphere();
    treeBerryIM.userData = {noShadowBlock: true};
    group.add(treeBerryIM);
  }

  // Under-Canopy Hanging Tree Lanterns (hooked onto trees across central + outer perimeter + soft warm ground pools)
  let treeLampHaloIM: THREE.InstancedMesh | null = null;
  let treeLampPoolIM: THREE.InstancedMesh | null = null;
  if (treeLanternSpots.length > 0) {
    const armGeo = new THREE.BoxGeometry(0.46, 0.045, 0.045);
    armGeo.translate(0.24, 0, 0);
    const braceGeo = new THREE.BoxGeometry(0.24, 0.036, 0.036);
    braceGeo.rotateZ(0.65);
    braceGeo.translate(0.14, -0.09, 0);
    const cordGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6);
    cordGeo.translate(0.44, -0.08, 0);
    const capGeo = new THREE.ConeGeometry(0.125, 0.085, 8);
    capGeo.translate(0.44, -0.17, 0);

    const treeLampBracketGeo = mergeParts([armGeo, braceGeo, cordGeo, capGeo]);
    const treeLampBulbGeo = new THREE.SphereGeometry(0.105, 8, 6);
    treeLampBulbGeo.translate(0.44, -0.27, 0);
    const treeLampHaloGeo = new THREE.SphereGeometry(0.4, 7, 5);
    treeLampHaloGeo.translate(0.44, -0.27, 0);

    const treeLampPoolGeo = new THREE.PlaneGeometry(3.2, 3.2);
    treeLampPoolGeo.rotateX(-Math.PI / 2);
    treeLampPoolGeo.translate(0.44, 0, 0);

    const treeLampBracketMat = getMat('#5C3E28', 0.72, 0.18);
    const treeLampBulbMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C8',
      emissive: '#FFBE55',
      emissiveIntensity: 0.14,
      roughness: 0.2,
    });
    const treeLampHaloMat = new THREE.MeshBasicMaterial({
      color: '#FFC866',
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const treeLampPoolMat = new THREE.MeshBasicMaterial({
      map: warmGlowTex,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    lampBulbs.push(treeLampBulbMat);

    const treeLampBracketIM = new THREE.InstancedMesh(
      treeLampBracketGeo,
      treeLampBracketMat,
      treeLanternSpots.length,
    );
    const treeLampBulbIM = new THREE.InstancedMesh(
      treeLampBulbGeo,
      treeLampBulbMat,
      treeLanternSpots.length,
    );
    treeLampHaloIM = new THREE.InstancedMesh(
      treeLampHaloGeo,
      treeLampHaloMat,
      treeLanternSpots.length,
    );
    treeLampPoolIM = new THREE.InstancedMesh(
      treeLampPoolGeo,
      treeLampPoolMat,
      treeLanternSpots.length,
    );
    treeLampHaloIM.renderOrder = 8;
    treeLampPoolIM.renderOrder = 2;
    treeLampHaloIM.visible = false;
    treeLampPoolIM.visible = false;

    treeLanternSpots.forEach((spot, i) => {
      _instDummy.position.set(spot.x, spot.y, spot.z);
      _instDummy.rotation.set(0, spot.rotY, 0);
      _instDummy.scale.setScalar(spot.scale);
      _instDummy.updateMatrix();
      treeLampBracketIM.setMatrixAt(i, _instDummy.matrix);
      treeLampBulbIM.setMatrixAt(i, _instDummy.matrix);
      treeLampHaloIM!.setMatrixAt(i, _instDummy.matrix);

      const poolGy = getTownGroundHeight(spot.x, spot.z) + 0.036;
      _instDummy.position.set(spot.x, poolGy, spot.z);
      _instDummy.rotation.set(0, spot.rotY, 0);
      _instDummy.scale.setScalar(spot.scale);
      _instDummy.updateMatrix();
      treeLampPoolIM!.setMatrixAt(i, _instDummy.matrix);
    });
    treeLampBracketIM.instanceMatrix.needsUpdate = true;
    treeLampBulbIM.instanceMatrix.needsUpdate = true;
    treeLampHaloIM.instanceMatrix.needsUpdate = true;
    treeLampPoolIM.instanceMatrix.needsUpdate = true;
    treeLampBracketIM.computeBoundingSphere();
    treeLampBulbIM.computeBoundingSphere();
    treeLampHaloIM.computeBoundingSphere();
    treeLampPoolIM.computeBoundingSphere();
    treeLampBracketIM.userData = {noShadowBlock: true};
    treeLampBulbIM.userData = {noShadowBlock: true};
    treeLampHaloIM.userData = {noShadowBlock: true};
    treeLampPoolIM.userData = {noShadowBlock: true};
    group.add(treeLampBracketIM, treeLampBulbIM, treeLampHaloIM, treeLampPoolIM);
  }

  // C. Lush Evergreen Pine & Conifer Trees (spanning outer meadows, mountain foothills & distant forest edge — zero perimeter fence!)
  const {
    trunkGeo: pineTrunkGeo,
    lowerFoliageGeo: pineLowerGeo,
    upperFoliageGeo: pineUpperGeo,
  } = createPineConiferGeometries();
  const pineTrunkMat = getMat('#5E3E29', 0.86);
  const pineLowerMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.8});
  const pineUpperMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74});

  const pineCoordsRaw: [number, number, number][] = [
    // Explorable Outer Meadows (showing players the world extends far!)
    [-8.5, 44.5, 1.32],
    [6.2, 44.5, 1.34],
    [-31.5, 60.5, 1.42],
    [28.5, 55.0, 1.4],
    [-5.2, 64.5, 1.48],
    [5.8, 65.0, 1.46],
    [-48.5, 44.0, 1.44],
    [49.0, 43.5, 1.46],
    [-60.0, 48.0, 1.5],
    [60.5, 47.5, 1.52],
    [-65.0, 18.0, 1.46],
    [65.5, 18.5, 1.48],
    [-65.0, -24.0, 1.5],
    [65.5, -23.5, 1.48],
    [-52.5, -52.0, 1.52],
    [53.0, -51.5, 1.54],
    [-38.0, -52.0, 1.44],
    [38.5, -51.5, 1.46],
    [-42.0, -76.0, 1.5],
    [42.5, -75.5, 1.52],
    [-62.0, -70.0, 1.54],
    [62.5, -69.5, 1.52],
    // Gentle Hill Foothills & Rear Slopes
    [-34.0, -44.5, 1.36],
    [34.5, -44.0, 1.38],
    [-36.5, -66.0, 1.42],
    [37.0, -65.5, 1.44],
    [-22.5, -88.0, 1.48],
    [23.0, -87.5, 1.5],
    // Outer Natural Forest Edge (well beyond walkable area so boundary feels natural)
    [-70.0, 64.0, 1.52],
    [-50.0, 68.5, 1.48],
    [-26.0, 70.0, 1.46],
    [26.5, 69.5, 1.48],
    [50.5, 68.0, 1.5],
    [70.0, 63.5, 1.52],
    [-72.0, -5.0, 1.48],
    [72.0, -4.5, 1.5],
    [-71.5, -50.0, 1.54],
    [72.0, -49.5, 1.54],
    [-70.0, -84.0, 1.56],
    [70.5, -83.5, 1.56],
  ];
  const pineCoords = pineCoordsRaw.filter(([px, pz]) => !isInWestRiverOrCliffZone(px, pz, 3.0));

  // Outer Scenic Evergreen Ring far outside walkable zone
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    let rx = Math.cos(a) * 92 + Math.sin(a * 3) * 6;
    if (Math.cos(a) < -0.35) rx -= 48;
    const rz = -10 + Math.sin(a) * 98 + Math.cos(a * 2) * 6;
    const s = 1.42 + (i % 5) * 0.1;
    if (!isInWestRiverOrCliffZone(rx, rz, 3.0)) {
      pineCoords.push([rx, rz, s]);
    }
  }

  const pineTrunkIM = new THREE.InstancedMesh(pineTrunkGeo, pineTrunkMat, pineCoords.length);
  const pineLowerIM = new THREE.InstancedMesh(pineLowerGeo, pineLowerMat, pineCoords.length);
  const pineUpperIM = new THREE.InstancedMesh(pineUpperGeo, pineUpperMat, pineCoords.length);
  const pineLowPalette = ['#47995B', '#51A666', '#3F8E53', '#59AF6E'];
  const pineUpPalette = ['#5EB672', '#68C27C', '#54AA68', '#73CC85'];

  pineCoords.forEach(([px, pz, ps], i) => {
    _instDummy.position.set(px, getTownGroundHeight(px, pz) - 0.05, pz);
    _instDummy.rotation.set(0, (i * 0.79) % (Math.PI * 2), 0);
    _instDummy.scale.setScalar(ps);
    _instDummy.updateMatrix();
    pineTrunkIM.setMatrixAt(i, _instDummy.matrix);
    pineLowerIM.setMatrixAt(i, _instDummy.matrix);
    pineUpperIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(pineLowPalette[i % pineLowPalette.length]);
    pineLowerIM.setColorAt(i, _instColor);
    _instColor.set(pineUpPalette[i % pineUpPalette.length]);
    pineUpperIM.setColorAt(i, _instColor);

    if (px >= -146 && px <= 82 && pz >= -98 && pz <= 78) {
      colliders.push({type: 'circle', x: px, z: pz, r: 0.44 * ps});
    }
  });
  pineTrunkIM.instanceMatrix.needsUpdate = true;
  pineLowerIM.instanceMatrix.needsUpdate = true;
  pineUpperIM.instanceMatrix.needsUpdate = true;
  if (pineLowerIM.instanceColor) pineLowerIM.instanceColor.needsUpdate = true;
  if (pineUpperIM.instanceColor) pineUpperIM.instanceColor.needsUpdate = true;
  pineTrunkIM.computeBoundingSphere();
  pineLowerIM.computeBoundingSphere();
  pineUpperIM.computeBoundingSphere();
  pineTrunkIM.userData = {isTreeShadowCaster: true};
  pineLowerIM.userData = {isTreeShadowCaster: true};
  pineUpperIM.userData = {isTreeShadowCaster: true};
  group.add(pineTrunkIM, pineLowerIM, pineUpperIM);

  // ========== 4. SAKURA (HOA ĐÀO) TREES & PETALS ON THE GENTLE SCENIC HILL ==========
  const {
    trunkGeo: sakuraTrunkGeo,
    blossomGeo: sakuraBlossomGeo,
    accentBloomGeo: sakuraAccentGeo,
    accentCenterGeo: sakuraCenterGeo,
  } = createSakuraGeometries();
  const sakuraTrunkMat = getMat('#5C3E32', 0.82);
  const sakuraBlossomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.65});
  const sakuraAccentMat = getMat('#F579A5', 0.52);
  const sakuraCenterMat = getMat('#FFE48F', 0.46);

  const sakuraTrees: [number, number, number][] = [
    [HILL_CENTER.x - 10.5, HILL_CENTER.z - 3.6, 1.32],
    [HILL_CENTER.x + 10.8, HILL_CENTER.z - 3.4, 1.35],
    [HILL_CENTER.x - 6.4, HILL_CENTER.z - 10.5, 1.4],
    [HILL_CENTER.x + 6.6, HILL_CENTER.z - 10.2, 1.38],
    [HILL_CENTER.x - 12.2, HILL_CENTER.z + 6.5, 1.28],
    [HILL_CENTER.x + 12.2, HILL_CENTER.z + 6.5, 1.3],
    [HILL_CENTER.x - 9.2, HILL_CENTER.z + 14.5, 1.24],
    [HILL_CENTER.x + 9.2, HILL_CENTER.z + 14.5, 1.26],
    [HILL_CENTER.x, HILL_CENTER.z - 13.0, 1.44],
    [HILL_CENTER.x - 17.5, HILL_CENTER.z + 0.8, 1.28],
    [HILL_CENTER.x + 17.8, HILL_CENTER.z + 1.0, 1.3],
    [HILL_CENTER.x - 14.5, HILL_CENTER.z - 13.5, 1.34],
  ];

  const sakuraTrunkIM = new THREE.InstancedMesh(sakuraTrunkGeo, sakuraTrunkMat, sakuraTrees.length);
  const sakuraBlossomIM = new THREE.InstancedMesh(sakuraBlossomGeo, sakuraBlossomMat, sakuraTrees.length);
  const sakuraAccentIM = new THREE.InstancedMesh(sakuraAccentGeo, sakuraAccentMat, sakuraTrees.length);
  const sakuraCenterIM = new THREE.InstancedMesh(sakuraCenterGeo, sakuraCenterMat, sakuraTrees.length);
  const sakuraTints = ['#FFADC6', '#FFB8CE', '#F89AB8', '#FFC6D9'];

  sakuraTrees.forEach(([sx, sz, ss], i) => {
    const sy = getTownGroundHeight(sx, sz) - 0.1;
    _instDummy.position.set(sx, sy, sz);
    _instDummy.rotation.set(0, i * 1.1, 0);
    _instDummy.scale.setScalar(ss);
    _instDummy.updateMatrix();
    sakuraTrunkIM.setMatrixAt(i, _instDummy.matrix);
    sakuraBlossomIM.setMatrixAt(i, _instDummy.matrix);
    sakuraAccentIM.setMatrixAt(i, _instDummy.matrix);
    sakuraCenterIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(sakuraTints[i % sakuraTints.length]);
    sakuraBlossomIM.setColorAt(i, _instColor);

    colliders.push({type: 'circle', x: sx, z: sz, r: 0.4 * ss});
  });
  sakuraTrunkIM.instanceMatrix.needsUpdate = true;
  sakuraBlossomIM.instanceMatrix.needsUpdate = true;
  sakuraAccentIM.instanceMatrix.needsUpdate = true;
  sakuraCenterIM.instanceMatrix.needsUpdate = true;
  if (sakuraBlossomIM.instanceColor) sakuraBlossomIM.instanceColor.needsUpdate = true;
  sakuraTrunkIM.computeBoundingSphere();
  sakuraBlossomIM.computeBoundingSphere();
  sakuraAccentIM.computeBoundingSphere();
  sakuraCenterIM.computeBoundingSphere();
  sakuraTrunkIM.userData = {isTreeShadowCaster: true};
  sakuraBlossomIM.userData = {isTreeShadowCaster: true};
  sakuraAccentIM.userData = {noShadowBlock: true};
  sakuraCenterIM.userData = {noShadowBlock: true};
  group.add(sakuraTrunkIM, sakuraBlossomIM, sakuraAccentIM, sakuraCenterIM);

  // Static fallen sakura petals scattered across the gentle hill summit & slopes (1 draw call)
  const petalCount = 120;
  const petalGeo = new THREE.CircleGeometry(0.12, 5);
  petalGeo.rotateX(-Math.PI / 2);
  const petalMat = new THREE.MeshStandardMaterial({
    color: '#FFB7CE',
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const petalIM = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  for (let i = 0; i < petalCount; i++) {
    const angle = i * 2.39996;
    const rad = 1.0 + ((i * 0.74) % 21.0);
    const px = HILL_CENTER.x + Math.cos(angle) * rad;
    const pz = HILL_CENTER.z + Math.sin(angle) * rad;
    const py = getTownGroundHeight(px, pz) + 0.04;
    _instDummy.position.set(px, py, pz);
    _instDummy.rotation.set(0, angle, 0);
    _instDummy.scale.set(1.25, 1, 0.78);
    _instDummy.updateMatrix();
    petalIM.setMatrixAt(i, _instDummy.matrix);
  }
  petalIM.instanceMatrix.needsUpdate = true;
  petalIM.computeBoundingSphere();
  petalIM.userData = {noShadowBlock: true};
  group.add(petalIM);

  // ========== 5. SMALL ORNAMENTAL AQUATIC POND, INTERACTIVE OUTDOOR ZONE, FLOWER BEDS & RICH FLORA ==========
  // 5A. Enlarged Scenic Ornamental Pond + Static Clay Waterwheel ("Con Quay Nước") + Jetty & Lakeside Props at (14.4, 14.0)
  {
    const MINI_POND_X = 14.4;
    const MINI_POND_Z = 14.0;
    const miniPond = new THREE.Group();
    miniPond.position.set(MINI_POND_X, 0.02, MINI_POND_Z);

    const evalMiniPondR = (th: number) =>
      3.85 + 0.42 * Math.cos(th * 2 + 0.4) + 0.25 * Math.sin(th * 3 - 0.5);

    const pondShape = new THREE.Shape();
    const MP_SEGS = 40;
    for (let i = 0; i <= MP_SEGS; i++) {
      const th = (i / MP_SEGS) * Math.PI * 2;
      const r = evalMiniPondR(th);
      const px = Math.cos(th) * r;
      const py = -Math.sin(th) * r;
      if (i === 0) pondShape.moveTo(px, py);
      else pondShape.lineTo(px, py);
    }

    const pondBedGeo = new THREE.ShapeGeometry(pondShape, 24);
    pondBedGeo.rotateX(-Math.PI / 2);
    const pondBedMesh = new THREE.Mesh(pondBedGeo, getMat('#28574A', 0.92));
    pondBedMesh.position.y = 0.015;
    pondBedMesh.renderOrder = 0;

    const pondWaterGeo = new THREE.ShapeGeometry(pondShape, 24);
    pondWaterGeo.rotateX(-Math.PI / 2);
    const miniPondWaterMat = new THREE.MeshStandardMaterial({
      color: '#45B8D4',
      roughness: 0.1,
      metalness: 0.06,
      envMapIntensity: 0.9,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
    });
    const pondWaterMesh = new THREE.Mesh(pondWaterGeo, miniPondWaterMat);
    pondWaterMesh.position.y = 0.075;
    pondWaterMesh.renderOrder = 3;
    pondWaterMesh.userData = {isWaterMesh: true};
    miniPond.add(pondBedMesh, pondWaterMesh);

    const mossMat = getMat('#3D7F44', 0.88);
    const algaeMat = getMat('#2F6B3A', 0.9);
    for (let m = 0; m < 16; m++) {
      const th = (m / 16) * Math.PI * 2 + 0.25;
      const rad = evalMiniPondR(th) * (0.42 + (m % 3) * 0.16);
      const mossPatch = new THREE.Mesh(
        new THREE.SphereGeometry(0.32 + (m % 3) * 0.1, 7, 5),
        m % 2 === 0 ? mossMat : algaeMat,
      );
      mossPatch.scale.set(1.4, 0.18, 1.15);
      mossPatch.position.set(Math.cos(th) * rad, 0.025, Math.sin(th) * rad);
      miniPond.add(mossPatch);
    }

    const stoneRimMat = getMat('#8E99A2', 0.84);
    for (let s = 0; s < 26; s++) {
      const th = (s / 26) * Math.PI * 2;
      const rad = evalMiniPondR(th) * 0.98;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36 + (s % 3) * 0.09, 0), stoneRimMat);
      rock.scale.set(1.28, 0.56, 1.05);
      rock.position.set(Math.cos(th) * rad, 0.12, Math.sin(th) * rad);
      rock.rotation.y = th + s * 0.5;
      miniPond.add(rock);
      if (s % 3 === 0) {
        const capMoss = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), mossMat);
        capMoss.scale.set(1.1, 0.35, 0.95);
        capMoss.position.set(Math.cos(th) * rad, 0.24, Math.sin(th) * rad);
        miniPond.add(capMoss);
      }
    }

    const reedLeafMat = getMat('#4E9A54', 0.72);
    const cattailHeadMat = getMat('#784A29', 0.82);
    [0.35, 1.05, 1.85, 2.55, 3.25, 3.95, 4.65, 5.35, 5.95].forEach((th, idx) => {
      const rad = evalMiniPondR(th) * 0.86;
      const clump = new THREE.Group();
      clump.position.set(Math.cos(th) * rad, 0.04, Math.sin(th) * rad);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.72 + b * 0.12, 4), reedLeafMat);
        blade.position.set((b - 1.5) * 0.07, 0.36, ((b % 2) - 0.5) * 0.06);
        blade.rotation.set((b % 2 === 0 ? 0.14 : -0.12), b * 0.9, (b - 1.5) * 0.11);
        clump.add(blade);
      }
      if (idx % 2 === 0) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.96, 5), reedLeafMat);
        stalk.position.y = 0.48;
        const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.18, 5, 7), cattailHeadMat);
        head.position.y = 0.88;
        clump.add(stalk, head);
      }
      miniPond.add(clump);
    });

    // Floating Lily Pads & Pastel Lotus Blooms
    const padMat = getMat('#5FB860', 0.66);
    const lotusMat = glossyClayMat('#FFB7C9', 0.32);
    [
      [-1.15, -0.65, 0.38, true],
      [0.95, -1.05, 0.32, false],
      [-0.55, 1.25, 0.35, true],
      [1.25, 0.85, 0.3, false],
      [-1.45, 0.65, 0.28, false],
      [0.25, -1.55, 0.33, true],
      [1.75, -0.25, 0.29, false],
    ].forEach(([lx, lz, lr, hasFlower], i) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(lr as number, lr as number, 0.025, 12, 1, false, 0, Math.PI * 1.82),
        padMat,
      );
      pad.position.set(lx as number, 0.085, lz as number);
      pad.rotation.y = i * 1.4;
      pad.renderOrder = 4;
      miniPond.add(pad);
      if (hasFlower) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), lotusMat);
        lotus.scale.set(1.15, 0.72, 1.15);
        lotus.position.set(lx as number, 0.13, lz as number);
        lotus.renderOrder = 4;
        miniPond.add(lotus);
      }
    });

    // Static Clay Waterwheel ("Con Quay Nước") + Bamboo Water Chute on NW Bank (-2.75, -2.55) — Zero Animation!
    {
      const wheelTimberDark = getMat('#6D4529', 0.82);
      const wheelTimberWarm = getMat('#A86F3F', 0.74);
      const wheelPaddleMat = getMat('#C68C56', 0.68);
      const wheelBambooMat = getMat('#78A852', 0.72);
      const wheelPourMat = glossyClayMat('#78D6EC', 0.22);
      const wheelFoamMat = getMat('#F2FBFF', 0.45);

      const ww = new THREE.Group();
      ww.position.set(-2.75, 0.02, -2.55);
      ww.rotation.y = Math.PI * 0.28;

      [-0.44, 0.44].forEach((sz) => {
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.35, 7), wheelTimberDark);
        legL.position.set(-0.24, 0.56, sz);
        legL.rotation.z = -0.34;
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.35, 7), wheelTimberDark);
        legR.position.set(0.24, 0.56, sz);
        legR.rotation.z = 0.34;
        ww.add(legL, legR);
      });
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.08, 10), wheelTimberDark);
      axle.rotation.x = Math.PI / 2;
      axle.position.y = 0.96;
      ww.add(axle);

      [-0.24, 0.24].forEach((rz) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.055, 7, 20), wheelTimberWarm);
        rim.position.set(0, 0.96, rz);
        ww.add(rim);
      });
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2;
        if (p % 2 === 0) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.68, 0.06), wheelTimberDark);
          spoke.position.set(0, 0.96, 0);
          spoke.rotation.z = a;
          ww.add(spoke);
        }
        const paddle = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.56, 1, 0.015), wheelPaddleMat);
        paddle.position.set(Math.cos(a) * 0.86, 0.96 + Math.sin(a) * 0.86, 0);
        paddle.rotation.z = a;
        ww.add(paddle);
      }

      // Bamboo Chute & Static Pouring Water Ribbon + White Splash Foam
      const chutePost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.85, 7), wheelTimberDark);
      chutePost.position.set(-1.38, 0.92, 0);
      const chutePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 1.48, 8), wheelBambooMat);
      chutePipe.rotation.z = Math.PI / 2 - 0.18;
      chutePipe.position.set(-0.88, 1.78, 0);
      const waterArc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.98, 7), wheelPourMat);
      waterArc.rotation.z = 0.28;
      waterArc.position.set(-0.08, 1.28, 0);
      ww.add(chutePost, chutePipe, waterArc);

      [
        [0.12, 0.08, 0.15, 0.12],
        [0.34, 0.07, -0.18, 0.1],
        [0.42, 0.09, 0.08, 0.14],
      ].forEach(([fx, fy, fz, fr]) => {
        const foam = new THREE.Mesh(new THREE.SphereGeometry(fr, 6, 5), wheelFoamMat);
        foam.scale.set(1.2, 0.48, 1.2);
        foam.position.set(fx, fy, fz);
        ww.add(foam);
      });
      miniPond.add(ww);
    }

    // Tiny Wooden Lakeside Jetty + Water Buckets + Fish Creel Basket + Stone Lantern
    {
      const dockPlankMat = getMat('#B8824D', 0.72);
      const dockPostMat = getMat('#6E492D', 0.84);
      const jetty = new THREE.Group();
      jetty.position.set(-2.25, 0.02, 3.05);
      jetty.rotation.y = 0.62;
      for (let k = 0; k < 3; k++) {
        const plank = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.08, 0.42, 1, 0.02), dockPlankMat);
        plank.position.set(0, 0.18, -0.44 + k * 0.46);
        jetty.add(plank);
      }
      [
        [-0.46, -0.44],
        [0.46, -0.44],
        [-0.46, 0.44],
        [0.46, 0.44],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.48, 7), dockPostMat);
        post.position.set(px, 0.2, pz);
        jetty.add(post);
      });

      const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.24, 9), dockPlankMat);
      b1.position.set(0.32, 0.34, -0.12);
      const b1Water = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 8), miniPondWaterMat);
      b1Water.position.set(0.32, 0.43, -0.12);
      const creel = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.22, 0.26, 2, 0.06), getMat('#C49558', 0.78));
      creel.position.set(-0.28, 0.32, 0.22);
      jetty.add(b1, b1Water, creel);
      miniPond.add(jetty);

      // Carved Lakeside Stone Lantern on NE Bank (2.95, 0.04, -2.45)
      const lantern = new THREE.Group();
      lantern.position.set(2.95, 0.02, -2.45);
      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.2, 6), stoneRimMat);
      lBase.position.y = 0.1;
      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.56, 6), stoneRimMat);
      lPost.position.y = 0.48;
      const lanternBulbMat = new THREE.MeshStandardMaterial({
        color: '#FFF4C8',
        emissive: '#FFBE55',
        emissiveIntensity: 0.22,
        roughness: 0.25,
      });
      lampBulbs.push(lanternBulbMat);
      const lCore = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 6), lanternBulbMat);
      lCore.position.y = 0.88;
      const lRoof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.22, 6), stoneRimMat);
      lRoof.position.y = 1.1;
      lantern.add(lBase, lPost, lCore, lRoof);
      miniPond.add(lantern);
    }

    colliders.push({type: 'circle', id: 'mini_pond', x: MINI_POND_X, z: MINI_POND_Z, r: 4.25});
    miniPond.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.userData.noShadowBlock = true;
      }
    });
    group.add(miniPond);
  }

  // 5B. Interactive Outdoor Activity Area directly on the Natural Lawn (Khu ngoài trời: Xích đu gỗ, Lửa trại & Kính thiên văn — giữ nguyên nền cỏ tự nhiên!)
  let outdoorSwingPivot: THREE.Group | null = null;
  let swingSeated = false;
  let swingPhase = 0;
  let swingAmp = 0.065;
  let campfireFlameA: THREE.Mesh | null = null;
  let campfireFlameB: THREE.Mesh | null = null;
  let campfireGlowMat: THREE.MeshBasicMaterial | null = null;
  {
    const woodPostMat = getMat('#8C5A34', 0.76);
    const woodSeatMat = getMat('#C8925A', 0.64);
    const ropeMat = getMat('#DEC395', 0.84);

    // (1) Interactive Wooden Swing (Xích đu gỗ) at (12.4, -21.6)
    const swingGroup = new THREE.Group();
    swingGroup.position.set(12.4, 0.02, -21.6);

    [-1.18, 1.18].forEach((sx) => {
      const legF = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 2.55, 8), woodPostMat);
      legF.position.set(sx, 1.22, 0.36);
      legF.rotation.x = -0.28;
      const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 2.55, 8), woodPostMat);
      legB.position.set(sx, 1.22, -0.36);
      legB.rotation.x = 0.28;
      swingGroup.add(legF, legB);
    });
    const topCrossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 2.76, 10), woodPostMat);
    topCrossbar.rotation.z = Math.PI / 2;
    topCrossbar.position.y = 2.38;
    swingGroup.add(topCrossbar);

    outdoorSwingPivot = new THREE.Group();
    outdoorSwingPivot.position.set(0, 2.36, 0);
    [-0.56, 0.56].forEach((rx) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.78, 6), ropeMat);
      rope.position.set(rx, -0.89, 0);
      outdoorSwingPivot!.add(rope);
    });
    const swingPlank = new THREE.Mesh(new RoundedBoxGeometry(1.28, 0.09, 0.48, 2, 0.03), woodSeatMat);
    swingPlank.position.y = -1.78;
    outdoorSwingPivot.add(swingPlank);
    mergeStaticGroupByMaterial(outdoorSwingPivot);
    swingGroup.add(outdoorSwingPivot);

    addInteractionProxy(
      swingGroup,
      [2.6, 2.5, 1.4],
      1.25,
      {
        kind: 'outdoor_swing',
        tx: 12.4,
        tz: -19.8,
        seatX: 12.4,
        seatZ: -21.6,
        seatY: 0.62,
        sitRotY: 0,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'outdoor_swing', x: 12.4, z: -21.6, hw: 1.35, hd: 0.72});
    mergeStaticGroupByMaterial(swingGroup, new Set([outdoorSwingPivot]));
    group.add(swingGroup);

    // (2) Interactive Campfire Ring & Rustic Log Bench (Lửa trại ngoài trời) at (16.6, -22.2)
    const campGroup = new THREE.Group();
    campGroup.position.set(16.6, 0.02, -22.2);

    const campStoneMat = getMat('#8C949E', 0.86);
    for (let r = 0; r < 10; r++) {
      const a = (r / 10) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), campStoneMat);
      st.scale.set(1.2, 0.72, 1.0);
      st.position.set(Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62);
      st.rotation.y = a;
      campGroup.add(st);
    }
    const emberDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.5, 0.05, 12),
      new THREE.MeshStandardMaterial({
        color: '#4E2C1B',
        emissive: '#D6491E',
        emissiveIntensity: 0.65,
        roughness: 0.8,
      }),
    );
    emberDisc.position.y = 0.03;
    campGroup.add(emberDisc);

    [0.35, -0.35, 1.25].forEach((rot) => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.88, 7), woodPostMat);
      log.rotation.z = Math.PI / 2 - 0.16;
      log.rotation.y = rot;
      log.position.y = 0.11;
      campGroup.add(log);
    });

    campfireFlameA = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.58, 7),
      new THREE.MeshBasicMaterial({color: '#FF7B29', transparent: true, opacity: 0.92, depthWrite: false}),
    );
    campfireFlameA.position.y = 0.36;
    campfireFlameA.renderOrder = 6;
    campfireFlameB = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.44, 6),
      new THREE.MeshBasicMaterial({color: '#FFE066', transparent: true, opacity: 0.95, depthWrite: false}),
    );
    campfireFlameB.position.set(0.04, 0.32, -0.03);
    campfireFlameB.renderOrder = 6;
    campfireGlowMat = new THREE.MeshBasicMaterial({
      map: warmGlowTex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const campGlowPool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), campfireGlowMat);
    campGlowPool.rotation.x = -Math.PI / 2;
    campGlowPool.position.y = 0.035;
    campGlowPool.renderOrder = 2;
    campGroup.add(campfireFlameA, campfireFlameB, campGlowPool);

    // Rustic log stool right in front of the campfire (+Z local)
    const logBench = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.32, 9), woodSeatMat);
    logBench.rotation.z = Math.PI / 2;
    logBench.position.set(0, 0.21, 1.55);
    [-0.45, 0.45].forEach((lx) => {
      const chock = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.14, 0.32, 2, 0.03), woodPostMat);
      chock.position.set(lx, 0.07, 1.55);
      campGroup.add(chock);
    });
    campGroup.add(logBench);

    addInteractionProxy(
      campGroup,
      [1.7, 1.3, 2.6],
      0.6,
      {
        kind: 'outdoor_campfire',
        tx: 16.6,
        tz: -19.65,
        seatX: 16.6,
        seatZ: -20.65,
        seatY: 0.42,
        sitRotY: Math.PI,
      },
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'outdoor_campfire', x: 16.6, z: -22.2, r: 0.85});
    colliders.push({type: 'box', id: 'outdoor_log_bench', x: 16.6, z: -20.65, hw: 0.72, hd: 0.3});
    mergeStaticGroupByMaterial(campGroup, new Set([campfireFlameA, campfireFlameB, campGlowPool]));
    group.add(campGroup);

    // (3) Interactive Stargazing Telescope (Kính thiên văn ngắm cảnh/trăng sao) at (14.6, -18.2)
    const teleGroup = new THREE.Group();
    teleGroup.position.set(14.6, 0.02, -18.2);
    const tripodWoodMat = getMat('#8C5E3A', 0.7);
    const brassMat = glossyClayMat('#E3B248', 0.26);
    const scopeBodyMat = glossyClayMat('#F8F4EC', 0.28);

    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((a) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 1.15, 6), tripodWoodMat);
      leg.position.set(Math.cos(a) * 0.24, 0.54, Math.sin(a) * 0.24);
      leg.rotation.set(-Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32);
      teleGroup.add(leg);
    });
    const mountHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), brassMat);
    mountHead.position.y = 1.08;
    const scopePivot = new THREE.Group();
    scopePivot.position.set(0, 1.14, 0);
    scopePivot.rotation.set(-0.46, -0.35, 0);
    const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.84, 10), scopeBodyMat);
    mainTube.rotation.x = Math.PI / 2;
    const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.094, 0.14, 10), brassMat);
    brassCollar.rotation.x = Math.PI / 2;
    brassCollar.position.z = -0.38;
    const lensGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10),
      new THREE.MeshStandardMaterial({color: '#9EE2FF', emissive: '#58B6E8', emissiveIntensity: 0.35}),
    );
    lensGlass.rotation.x = Math.PI / 2;
    lensGlass.position.z = -0.45;
    scopePivot.add(mainTube, brassCollar, lensGlass);
    teleGroup.add(mountHead, scopePivot);

    addInteractionProxy(
      teleGroup,
      [1.1, 1.5, 1.1],
      0.75,
      {kind: 'outdoor_telescope', tx: 14.6, tz: -17.1},
      clickTargets,
    );
    colliders.push({type: 'circle', id: 'outdoor_telescope', x: 14.6, z: -18.2, r: 0.55});
    mergeStaticGroupByMaterial(teleGroup);
    group.add(teleGroup);
  }

  // ========== 5C. STATIC INSTANCED GROUND FLORA (BỒN HOA CONG QUẢNG TRƯỜNG, BỤI HOA, CỎ LỚN BÉ & HOA DẠI) ==========
  // A. Two Smooth Curved Neck-High Plaza Flower Beds (Bồn hoa bo cong hai bên quảng trường theo 2 cây đèn mỗi bên, cao ngang cổ nhân vật)
  {
    const ARC_MID_R = 8.02;
    const ARC_SPAN = THREE.MathUtils.degToRad(46); // -46°..+46° each side -> leaves wide 11.1m N & S entrances open!

    const buildCurvedPlanterShape = (
      innerR: number,
      outerR: number,
      startAngle: number,
      endAngle: number,
    ) => {
      const midR = (innerR + outerR) * 0.5;
      const capR = (outerR - innerR) * 0.5;
      const shape = new THREE.Shape();
      // Start on outer arc at startAngle -> trace outer arc to endAngle
      shape.absarc(0, 0, outerR, startAngle, endAngle, false);
      // Smooth semicircle rounded end-cap at endAngle
      const endCx = Math.cos(endAngle) * midR;
      const endCy = Math.sin(endAngle) * midR;
      shape.absarc(endCx, endCy, capR, endAngle, endAngle + Math.PI, false);
      // Trace inner arc back from endAngle to startAngle
      shape.absarc(0, 0, innerR, endAngle, startAngle, true);
      // Smooth semicircle rounded end-cap at startAngle
      const startCx = Math.cos(startAngle) * midR;
      const startCy = Math.sin(startAngle) * midR;
      shape.absarc(startCx, startCy, capR, startAngle + Math.PI, startAngle + Math.PI * 2, false);
      shape.closePath();
      return shape;
    };

    const makeExtrudedArcGeo = (
      innerR: number,
      outerR: number,
      height: number,
      bevel = 0.03,
      anglePad = 0,
    ) => {
      const shape = buildCurvedPlanterShape(
        innerR,
        outerR,
        -ARC_SPAN - anglePad,
        ARC_SPAN + anglePad,
      );
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.02, height - bevel * 2),
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 1,
        curveSegments: 18,
      });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, bevel, 0);
      return geo;
    };

    // Neck-high profile (~0.98m rim = character neck height HEAD_PIVOT_Y = 0.968)
    const plinthGeo = makeExtrudedArcGeo(7.52, 8.52, 0.18, 0.025, 0.008);
    const wallGeo = makeExtrudedArcGeo(7.58, 8.46, 0.72, 0.02, 0);
    const capRimGeo = makeExtrudedArcGeo(7.53, 8.51, 0.12, 0.028, 0.006);
    const soilGeo = makeExtrudedArcGeo(7.68, 8.36, 0.08, 0.01, -0.012);

    const plinthMat = getMat('#D6CCBC', 0.8);
    const wallMat = getMat('#F4E8D6', 0.72);
    const capRimMat = getMat('#E5D5BE', 0.68);
    const soilMat = getMat('#5D412C', 0.92);

    // Build Right (+X) and Left (-X, rotated Math.PI) curved beds sharing exact geometries
    [0, Math.PI].forEach((sideRotY, sideIdx) => {
      const sideBed = new THREE.Group();
      sideBed.rotation.y = sideRotY;

      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.y = 0.16;
      const capRimMesh = new THREE.Mesh(capRimGeo, capRimMat);
      capRimMesh.position.y = 0.86;
      const soilMesh = new THREE.Mesh(soilGeo, soilMat);
      soilMesh.position.y = 0.91;

      sideBed.add(plinthMesh, wallMesh, capRimMesh, soilMesh);
      group.add(sideBed);

      // Smooth overlapping circle colliders tracing the curved planter arc
      const colSteps = 9;
      for (let c = 0; c <= colSteps; c++) {
        const a = THREE.MathUtils.lerp(-ARC_SPAN, ARC_SPAN, c / colSteps) + sideRotY;
        colliders.push({
          type: 'circle',
          id: `plaza_curved_bed_${sideIdx}_${c}`,
          x: Math.cos(a) * ARC_MID_R,
          z: Math.sin(a) * ARC_MID_R,
          r: 0.56,
        });
      }
    });

    // Static repeatable InstancedMesh foliage cushions & crisp 5-petal flowers along both curved beds
    const tuftPerSide = 24;
    const totalBedTufts = tuftPerSide * 2;
    const bedFoliageParts: THREE.BufferGeometry[] = [];
    const bfMound = new THREE.SphereGeometry(0.32, 8, 6);
    bfMound.scale(1.16, 0.56, 1.16);
    bfMound.translate(0, 0.06, 0);
    bedFoliageParts.push(bfMound);
    for (let lf = 0; lf < 4; lf++) {
      const a = (lf / 4) * Math.PI * 2 + 0.3;
      const leaf = new THREE.SphereGeometry(0.14, 6, 5);
      leaf.scale(0.85, 0.28, 1.65);
      leaf.rotateX(-0.32);
      leaf.translate(0, 0.12, 0.22);
      leaf.rotateY(a);
      bedFoliageParts.push(leaf);
    }
    const bedFoliageGeo = mergeParts(bedFoliageParts);
    const bedFoliageIM = new THREE.InstancedMesh(bedFoliageGeo, getMat('#54AC5C', 0.76), totalBedTufts);

    const bedPetalParts: THREE.BufferGeometry[] = [];
    const bedCenterParts: THREE.BufferGeometry[] = [];
    append5PetalFlower(bedPetalParts, bedCenterParts, -0.13, 0.24, 0.08, 1.35, 0.2, 0.16, 0.2);
    append5PetalFlower(bedPetalParts, bedCenterParts, 0.14, 0.23, -0.07, 1.25, -0.18, -0.18, 0.8);
    append5PetalFlower(bedPetalParts, bedCenterParts, 0.01, 0.29, -0.02, 1.18, 0.08, -0.06, 1.4);
    const bedBloomGeo = mergeParts(bedPetalParts);
    const bedCenterGeo = mergeParts(bedCenterParts);
    const bedBloomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.48});
    const bedCenterMat = getMat('#FFD24C', 0.42);
    const bedBloomIM = new THREE.InstancedMesh(bedBloomGeo, bedBloomMat, totalBedTufts);
    const bedCenterIM = new THREE.InstancedMesh(bedCenterGeo, bedCenterMat, totalBedTufts);
    const bedBloomPalette = ['#FF8DA8', '#FFAD70', '#8CD5FF', '#D1A6FF', '#FF7676', '#FFFFFF'];

    let bIdx = 0;
    [0, Math.PI].forEach((sideRotY) => {
      for (let t = 0; t < tuftPerSide; t++) {
        const u = t / (tuftPerSide - 1);
        const ang = THREE.MathUtils.lerp(-ARC_SPAN * 0.96, ARC_SPAN * 0.96, u) + sideRotY;
        const rOff = t % 2 === 0 ? -0.11 : 0.11;
        const r = ARC_MID_R + rOff;
        _instDummy.position.set(Math.cos(ang) * r, 0.96, Math.sin(ang) * r);
        _instDummy.rotation.set(0, -ang + t * 0.7, 0);
        _instDummy.scale.setScalar(0.95 + (t % 3) * 0.12);
        _instDummy.updateMatrix();
        bedFoliageIM.setMatrixAt(bIdx, _instDummy.matrix);
        bedBloomIM.setMatrixAt(bIdx, _instDummy.matrix);
        bedCenterIM.setMatrixAt(bIdx, _instDummy.matrix);
        _instColor.set(bedBloomPalette[bIdx % bedBloomPalette.length]);
        bedBloomIM.setColorAt(bIdx, _instColor);
        bIdx++;
      }
    });
    bedFoliageIM.instanceMatrix.needsUpdate = true;
    bedBloomIM.instanceMatrix.needsUpdate = true;
    bedCenterIM.instanceMatrix.needsUpdate = true;
    if (bedBloomIM.instanceColor) bedBloomIM.instanceColor.needsUpdate = true;
    bedFoliageIM.computeBoundingSphere();
    bedBloomIM.computeBoundingSphere();
    bedCenterIM.computeBoundingSphere();
    bedFoliageIM.userData = {noShadowBlock: true};
    bedBloomIM.userData = {noShadowBlock: true};
    bedCenterIM.userData = {noShadowBlock: true};
    group.add(bedFoliageIM, bedBloomIM, bedCenterIM);
  }

  // B. Small & Medium Flowering Bushes (Bụi hoa nhỏ & vừa phủ khắp khu trung tâm & vùng ngoài)
  const bushCoordsRaw: [number, number, string, number?][] = [
    [-9.2, -7.8, '#F28482', 0.86],
    [9.2, -7.8, '#8ECAE6', 0.88],
    [-9.2, 7.8, '#F7A8B8', 0.84],
    [9.2, 7.8, '#A8D8EA', 0.86],
    [-38.2, -25.2, '#FF9EBB', 0.95],
    [-25.8, -25.8, '#F28482', 0.92],
    [25.6, -25.8, '#F7A8B8', 0.94],
    [38.5, -26.2, '#D0A6FF', 0.96],
    [-38.2, 13.5, '#A8D8EA', 0.9],
    [-25.5, 22.2, '#F7A8B8', 0.92],
    [38.5, 12.8, '#F28482', 0.94],
    [25.5, 21.8, '#9CE0FF', 0.9],
    [-35.0, 40.5, '#A8D8EA', 0.88],
    [-11.8, 50.5, '#F7A8B8', 0.85],
    [19.2, 37.5, '#FF9EBB', 0.9],
    [28.5, 37.2, '#F28482', 0.92],
    [-8.4, -27.2, '#F7A8B8', 0.88],
    [-19.2, -16.2, '#A8D8EA', 0.84],
    [-21.5, 4.2, '#D0A6FF', 0.82],
    [21.5, 4.2, '#F28482', 0.86],
    [-15.5, -9.5, '#F7A8B8', 0.78],
    [15.8, -9.4, '#A8D8EA', 0.76],
    [-15.2, 9.6, '#FFAD88', 0.8],
    [15.6, 9.8, '#F28482', 0.78],
    [-20.5, 32.5, '#F7A8B8', 0.76],
    [16.6, 41.0, '#A8D8EA', 0.82],
    [9.4, 15.8, '#F7A8B8', 0.86],
    [18.2, 16.4, '#A8D8EA', 0.88],
    [-29.5, 7.5, '#FF9EBB', 0.9],
    [29.5, 7.5, '#F28482', 0.9],
    [-5.5, 39.5, '#F7A8B8', 0.88],
    [6.5, 40.2, '#A8D8EA', 0.86],
    [-46.0, 10.5, '#D0A6FF', 0.94],
    [46.5, 5.0, '#F7A8B8', 0.94],
    // Outer meadow & edge shrubs
    [-48.0, 34.0, '#FF9EBB', 0.96],
    [48.5, 33.5, '#8ECAE6', 0.96],
    [-55.0, -14.5, '#F7A8B8', 0.98],
    [55.5, -14.0, '#FFAD88', 0.98],
    [-54.5, 16.0, '#D0A6FF', 0.96],
    [55.0, 15.5, '#F28482', 0.96],
    [-33.0, 53.0, '#FF9EBB', 0.94],
    [33.5, 52.5, '#A8D8EA', 0.94],
    [-18.0, 56.5, '#F28482', 0.92],
    [18.5, 56.0, '#D0A6FF', 0.92],
    [-44.5, -42.5, '#FFAD88', 0.96],
    [44.5, -42.0, '#F7A8B8', 0.96],
    [-68.0, -10.5, '#8ECAE6', 0.98],
    [60.5, 2.5, '#FF9EBB', 0.98],
    // East riverbank & distant outer bushes
    [-73.5, -24.0, '#FF9EBB', 0.96],
    [-74.0, -34.0, '#A8D8EA', 0.94],
    [-73.5, 16.5, '#F7A8B8', 0.98],
    [-72.0, 26.5, '#D0A6FF', 0.96],
    [-70.5, 36.0, '#8ECAE6', 0.94],
    [-65.0, -44.0, '#F28482', 0.96],
    [64.5, 35.0, '#FFAD88', 0.96],
    [64.0, -28.0, '#9CE0FF', 0.96],
    [-16.0, -56.0, '#FF9EBB', 0.92],
    [16.5, -55.5, '#A8D8EA', 0.94],
  ];
  const bushCoords = bushCoordsRaw.filter(([bx, bz]) => !isInWestRiverOrCliffZone(bx, bz));
  const bushBodyParts: THREE.BufferGeometry[] = [];
  const bbMain = new THREE.SphereGeometry(0.42, 9, 7);
  bbMain.scale(1.25, 0.76, 1.15);
  bbMain.translate(0, 0.27, 0);
  const bbSub = new THREE.SphereGeometry(0.28, 7, 6);
  bbSub.scale(1.15, 0.74, 1.1);
  bbSub.translate(0.28, 0.2, 0.16);
  bushBodyParts.push(bbMain, bbSub);
  const bushBodyGeo = mergeParts(bushBodyParts);
  const bushBodyMat = getMat('#5FB465', 0.76);
  const bushBodyIM = new THREE.InstancedMesh(bushBodyGeo, bushBodyMat, bushCoords.length);

  const bushPetalParts: THREE.BufferGeometry[] = [];
  const bushCenterParts: THREE.BufferGeometry[] = [];
  append5PetalFlower(bushPetalParts, bushCenterParts, -0.2, 0.5, 0.16, 1.32, 0.28, 0.22, 0.1);
  append5PetalFlower(bushPetalParts, bushCenterParts, 0.21, 0.47, -0.09, 1.24, -0.22, -0.26, 0.8);
  append5PetalFlower(bushPetalParts, bushCenterParts, 0.02, 0.58, 0.12, 1.28, 0.14, -0.08, 1.5);
  append5PetalFlower(bushPetalParts, bushCenterParts, -0.08, 0.48, -0.22, 1.15, -0.28, 0.14, 2.2);
  const bushBlossomGeo = mergeParts(bushPetalParts);
  const bushCenterGeo = mergeParts(bushCenterParts);
  const bushBlossomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.48});
  const bushCenterMat = getMat('#FFD24C', 0.42);
  const bushBlossomIM = new THREE.InstancedMesh(bushBlossomGeo, bushBlossomMat, bushCoords.length);
  const bushCenterIM = new THREE.InstancedMesh(bushCenterGeo, bushCenterMat, bushCoords.length);

  bushCoords.forEach(([bx, bz, col, scale], i) => {
    const by = getTownGroundHeight(bx, bz) - 0.02;
    const sc = scale ?? 0.9;
    _instDummy.position.set(bx, by, bz);
    _instDummy.rotation.set(0, i * 0.8, 0);
    _instDummy.scale.setScalar(sc);
    _instDummy.updateMatrix();
    bushBodyIM.setMatrixAt(i, _instDummy.matrix);
    bushBlossomIM.setMatrixAt(i, _instDummy.matrix);
    bushCenterIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(col);
    bushBlossomIM.setColorAt(i, _instColor);
    colliders.push({type: 'circle', x: bx, z: bz, r: 0.44 * sc});
  });
  bushBodyIM.instanceMatrix.needsUpdate = true;
  bushBlossomIM.instanceMatrix.needsUpdate = true;
  bushCenterIM.instanceMatrix.needsUpdate = true;
  if (bushBlossomIM.instanceColor) bushBlossomIM.instanceColor.needsUpdate = true;
  bushBodyIM.computeBoundingSphere();
  bushBlossomIM.computeBoundingSphere();
  bushCenterIM.computeBoundingSphere();
  bushBodyIM.userData = {noShadowBlock: true};
  bushBlossomIM.userData = {noShadowBlock: true};
  bushCenterIM.userData = {noShadowBlock: true};
  group.add(bushBodyIM, bushBlossomIM, bushCenterIM);

  // C. Large Sculpted Multi-Mound Park & Woodland Bushes (Bụi cây lớn phủ rộng ra vùng ngoài)
  const bigBushParts: THREE.BufferGeometry[] = [];
  const mb1 = new THREE.SphereGeometry(0.62, 10, 8);
  mb1.scale(1.18, 0.85, 1.12);
  mb1.translate(0, 0.42, 0);
  const mb2 = new THREE.SphereGeometry(0.48, 9, 7);
  mb2.scale(1.1, 0.82, 1.08);
  mb2.translate(-0.46, 0.32, 0.22);
  const mb3 = new THREE.SphereGeometry(0.44, 9, 7);
  mb3.scale(1.08, 0.84, 1.1);
  mb3.translate(0.45, 0.3, -0.18);
  bigBushParts.push(mb1, mb2, mb3);
  const bigBushGeo = mergeParts(bigBushParts);
  const bigBushMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.78});
  const bigBushCoordsRaw: [number, number, number, string][] = [
    [-16.8, -16.8, 1.15, '#4CA456'],
    [17.2, -16.6, 1.18, '#55AF5E'],
    [-18.0, 20.5, 1.16, '#489C52'],
    [18.2, 20.8, 1.18, '#5BB464'],
    [-40.5, -10.5, 1.32, '#4E9F57'],
    [40.8, -10.2, 1.28, '#59B061'],
    [-40.8, 26.2, 1.3, '#4A9C53'],
    [41.0, 26.0, 1.34, '#56AD5E'],
    [-35.8, 49.5, 1.25, '#4B9F55'],
    [-12.5, 42.5, 1.14, '#54AA5D'],
    [15.0, 48.2, 1.26, '#4E9F57'],
    [32.5, 45.8, 1.3, '#57AE60'],
    [-22.5, -38.5, 1.35, '#4A9D54'],
    [22.8, -38.0, 1.34, '#54AC5D'],
    [-51.0, 12.5, 1.38, '#4D9E56'],
    [51.5, 4.0, 1.36, '#58AF61'],
    [-52.0, -25.0, 1.4, '#489852'],
    [52.5, -24.5, 1.38, '#53A95B'],
    [-29.0, 56.5, 1.32, '#4CA256'],
    [29.5, 52.0, 1.34, '#55AB5E'],
    [-8.5, -32.5, 1.22, '#4E9F57'],
    [8.8, -32.5, 1.24, '#56AE5E'],
    // Outer ring lush bushes
    [-68.5, -14.5, 1.36, '#4B9E54'],
    [58.5, -8.0, 1.36, '#56AF5E'],
    [-56.5, 22.0, 1.38, '#489A51'],
    [57.0, 21.5, 1.38, '#53A95B'],
    [-45.0, 52.0, 1.34, '#4E9F57'],
    [45.5, 51.5, 1.34, '#58AF61'],
    [-14.5, 60.5, 1.32, '#4CA256'],
    [15.0, 60.0, 1.32, '#55AB5E'],
    [-56.0, -44.0, 1.4, '#4A9D54'],
    [56.5, -43.5, 1.4, '#54AC5D'],
    // East riverbank & distant outer shrubs
    [-74.5, -29.0, 1.36, '#4CA256'],
    [-71.5, 22.0, 1.38, '#55AB5E'],
    [-69.0, 39.5, 1.34, '#4E9F57'],
    [64.0, -14.0, 1.38, '#58AF61'],
  ];
  const bigBushCoords = bigBushCoordsRaw.filter(([bx, bz]) => !isInWestRiverOrCliffZone(bx, bz));
  const bigBushIM = new THREE.InstancedMesh(bigBushGeo, bigBushMat, bigBushCoords.length);
  bigBushCoords.forEach(([bx, bz, bs, col], i) => {
    const by = getTownGroundHeight(bx, bz) - 0.04;
    _instDummy.position.set(bx, by, bz);
    _instDummy.rotation.set(0, (i * 1.17) % (Math.PI * 2), 0);
    _instDummy.scale.setScalar(bs);
    _instDummy.updateMatrix();
    bigBushIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(col);
    bigBushIM.setColorAt(i, _instColor);
    colliders.push({type: 'circle', x: bx, z: bz, r: 0.78 * bs});
  });
  bigBushIM.instanceMatrix.needsUpdate = true;
  if (bigBushIM.instanceColor) bigBushIM.instanceColor.needsUpdate = true;
  bigBushIM.computeBoundingSphere();
  bigBushIM.userData = {noShadowBlock: true};
  group.add(bigBushIM);

  // Static 5-petal wildflower clusters scattered generously across inner & outer meadows (quadrant frustum-culled!)
  const FLOWER_COUNT = 380;
  const fStem1 = new THREE.CylinderGeometry(0.018, 0.024, 0.24, 4);
  fStem1.translate(0, 0.12, 0);
  const fStem2 = new THREE.CylinderGeometry(0.014, 0.02, 0.18, 4);
  fStem2.rotateZ(-0.28);
  fStem2.translate(0.06, 0.09, 0.04);
  const fLeafA = new THREE.SphereGeometry(0.075, 4, 3);
  fLeafA.scale(0.55, 0.22, 1.45);
  fLeafA.rotateX(-0.35);
  fLeafA.rotateY(0.6);
  fLeafA.translate(-0.05, 0.05, 0.06);
  const fLeafB = new THREE.SphereGeometry(0.072, 4, 3);
  fLeafB.scale(0.55, 0.22, 1.45);
  fLeafB.rotateX(-0.35);
  fLeafB.rotateY(-0.8);
  fLeafB.translate(0.06, 0.05, -0.05);
  const flowerBaseGeo = mergeParts([fStem1, fStem2, fLeafA, fLeafB]);
  const flowerBaseMat = getMat('#5CB662', 0.78);

  const wfPetals: THREE.BufferGeometry[] = [];
  const wfCenters: THREE.BufferGeometry[] = [];
  append5PetalFlower(wfPetals, wfCenters, 0, 0.24, 0, 1.08, 0.14, 0, 0.2);
  append5PetalFlower(wfPetals, wfCenters, 0.09, 0.17, 0.05, 0.86, 0.22, -0.26, 1.1);
  const flowerTopGeo = mergeParts(wfPetals);
  const flowerCenterGeo = mergeParts(wfCenters);
  const flowerTopMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.48});
  const flowerCenterMat = getMat('#FFD24C', 0.42);

  const isOnRoadOrPlaza = (px: number, pz: number) => {
    if (Math.hypot(px, pz) < TOWN_PLAZA_RADIUS + 1.2) return true;
    if (Math.abs(pz) < 1.8 && px > -37 && px < 37) return true;
    if (Math.abs(pz + 12.5) < 1.8 && px > -34 && px < 34) return true;
    if (Math.abs(pz - 26.8) < 1.8 && px > -34 && px < 34) return true;
    if (Math.abs(pz - 35.2) < 1.6 && px > -21 && px < 2) return true;
    if (Math.abs(pz - 46.2) < 1.6 && px > -2 && px < 26) return true;
    if (Math.abs(px) < 1.8 && pz > -21 && pz < 53) return true;
    if (Math.abs(px + 23.5) < 1.6 && pz > -13 && pz < 27) return true;
    if (Math.abs(px - 23.5) < 1.6 && pz > -13 && pz < 27) return true;
    if (Math.hypot(px - patioCenter.x, pz - patioCenter.z) < 5.0) return true;
    if (Math.hypot(px - LAKE_CENTER.x, pz - LAKE_CENTER.z) < 12.2) return true;
    if (Math.hypot(px - 14.4, pz - 14.0) < 5.0) return true;
    if (Math.hypot(px - 14.5, pz + 21.0) < 4.6) return true;
    if (Math.hypot(px + 32, pz + 22.5) < 7.4) return true;
    if (Math.hypot(px - 32, pz + 22.5) < 6.5) return true;
    if (Math.hypot(px - 42.8, pz + 23.2) < 3.6) return true;
    if (Math.hypot(px + 32, pz - 18.0) < 6.2) return true;
    if (Math.hypot(px - 32, pz - 17.5) < 6.6) return true;
    if (Math.hypot(px - 24, pz - 39.5) < 5.2) return true;
    if (Math.hypot(px - 11.8, pz - 38.6) < 5.0) return true;
    if (Math.hypot(px + 16.8, pz - 37.2) < 3.4) return true;
    if (px >= -64.5 && px <= -36.5 && pz >= -13.0 && pz <= 8.5) return true;
    if (isInWestRiverOrCliffZone(px, pz, 1.5)) return true;
    if (Math.hypot(px - SHIP_STALL_POS.x, pz - SHIP_STALL_POS.z) < 5.2) return true;
    if (Math.hypot(px - RIVER_DOCK_POS.x, pz - RIVER_DOCK_POS.z) < 3.2) return true;
    return false;
  };

  const wildflowerPalette = ['#FF9EAA', '#A8E0FF', '#D5B8FF', '#FFFFFF', '#FFB48A'];
  const flowerQuads: {mat: THREE.Matrix4; col: string}[][] = [[], [], [], []];
  let placedFlowers = 0;
  for (let i = 0; i < 1100 && placedFlowers < FLOWER_COUNT; i++) {
    const angle = i * 2.39996;
    const rad = i % 3 === 0 ? 28.0 + ((i * 1.43) % 44.0) : 8.4 + ((i * 1.51) % 64.0);
    const fx = Math.cos(angle) * rad;
    const fz = Math.sin(angle) * rad;
    if (isOnRoadOrPlaza(fx, fz)) continue;

    const fy = getTownGroundHeight(fx, fz) - 0.01;
    _instDummy.position.set(fx, fy, fz);
    _instDummy.rotation.set(0, angle, 0);
    _instDummy.scale.setScalar(0.92 + (placedFlowers % 4) * 0.16);
    _instDummy.updateMatrix();
    const q = (fx >= 0 ? 1 : 0) + (fz >= 0 ? 2 : 0);
    flowerQuads[q].push({
      mat: _instDummy.matrix.clone(),
      col: wildflowerPalette[placedFlowers % wildflowerPalette.length],
    });
    placedFlowers++;
  }
  flowerQuads.forEach((recs) => {
    if (recs.length === 0) return;
    const qBase = new THREE.InstancedMesh(flowerBaseGeo, flowerBaseMat, recs.length);
    const qTop = new THREE.InstancedMesh(flowerTopGeo, flowerTopMat, recs.length);
    const qCenter = new THREE.InstancedMesh(flowerCenterGeo, flowerCenterMat, recs.length);
    recs.forEach((r, qi) => {
      qBase.setMatrixAt(qi, r.mat);
      qTop.setMatrixAt(qi, r.mat);
      qCenter.setMatrixAt(qi, r.mat);
      _instColor.set(r.col);
      qTop.setColorAt(qi, _instColor);
    });
    qBase.instanceMatrix.needsUpdate = true;
    qTop.instanceMatrix.needsUpdate = true;
    qCenter.instanceMatrix.needsUpdate = true;
    if (qTop.instanceColor) qTop.instanceColor.needsUpdate = true;
    qBase.computeBoundingSphere();
    qTop.computeBoundingSphere();
    qCenter.computeBoundingSphere();
    qBase.userData = {noShadowBlock: true};
    qTop.userData = {noShadowBlock: true};
    qCenter.userData = {noShadowBlock: true};
    group.add(qBase, qTop, qCenter);
  });

  // D. Sculpted Layered Meadow Grass Clusters (Cỏ vừa & cỏ cao mượt mà phủ đều ra rìa map - quadrant frustum-culled!)
  const TUFT_COUNT = 480;
  const t1 = new THREE.ConeGeometry(0.085, 0.38, 4);
  t1.rotateZ(0.22);
  t1.translate(-0.07, 0.17, 0);
  const t2 = new THREE.ConeGeometry(0.078, 0.44, 4);
  t2.rotateZ(-0.18);
  t2.translate(0.07, 0.2, 0.04);
  const t3 = new THREE.ConeGeometry(0.074, 0.34, 4);
  t3.rotateX(0.2);
  t3.translate(0, 0.15, -0.07);
  const t4 = new THREE.ConeGeometry(0.068, 0.36, 4);
  t4.rotateX(-0.16);
  t4.translate(-0.03, 0.16, 0.06);
  const tuftGeo = mergeParts([t1, t2, t3, t4]);
  const tuftMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.78});
  const tuftPalette = ['#5EB662', '#68C16B', '#54AA58', '#73C972'];
  const tuftQuads: {mat: THREE.Matrix4; col: string}[][] = [[], [], [], []];
  let placedTufts = 0;
  for (let i = 0; i < 1350 && placedTufts < TUFT_COUNT; i++) {
    const angle = i * 2.39996 + 0.9;
    const rad = i % 2 === 0 ? 26.0 + ((i * 1.49) % 48.0) : 8.4 + ((i * 1.53) % 64.0);
    const gx = Math.cos(angle) * rad;
    const gz = Math.sin(angle) * rad;
    if (isOnRoadOrPlaza(gx, gz)) continue;
    const gy = getTownGroundHeight(gx, gz) - 0.01;
    _instDummy.position.set(gx, gy, gz);
    _instDummy.rotation.set(0, angle, 0);
    _instDummy.scale.setScalar(0.88 + (placedTufts % 4) * 0.18);
    _instDummy.updateMatrix();
    const q = (gx >= 0 ? 1 : 0) + (gz >= 0 ? 2 : 0);
    tuftQuads[q].push({
      mat: _instDummy.matrix.clone(),
      col: tuftPalette[placedTufts % tuftPalette.length],
    });
    placedTufts++;
  }
  tuftQuads.forEach((recs) => {
    if (recs.length === 0) return;
    const qTuft = new THREE.InstancedMesh(tuftGeo, tuftMat, recs.length);
    recs.forEach((r, qi) => {
      qTuft.setMatrixAt(qi, r.mat);
      _instColor.set(r.col);
      qTuft.setColorAt(qi, _instColor);
    });
    qTuft.instanceMatrix.needsUpdate = true;
    if (qTuft.instanceColor) qTuft.instanceColor.needsUpdate = true;
    qTuft.computeBoundingSphere();
    qTuft.userData = {noShadowBlock: true};
    group.add(qTuft);
  });

  // Tall Lush Meadow Grass Clumps (Cỏ cao rậm tự nhiên vùng ngoài - quadrant frustum-culled!)
  const TALL_GRASS_COUNT = 280;
  const tg1 = new THREE.ConeGeometry(0.115, 0.72, 4);
  tg1.rotateZ(0.22);
  tg1.translate(-0.12, 0.34, 0.04);
  const tg2 = new THREE.ConeGeometry(0.105, 0.84, 4);
  tg2.rotateZ(-0.17);
  tg2.translate(0.12, 0.39, -0.05);
  const tg3 = new THREE.ConeGeometry(0.105, 0.68, 4);
  tg3.rotateX(0.22);
  tg3.translate(0.02, 0.32, 0.13);
  const tg4 = new THREE.ConeGeometry(0.095, 0.76, 4);
  tg4.rotateX(-0.19);
  tg4.translate(-0.05, 0.35, -0.12);
  const tg5 = new THREE.ConeGeometry(0.09, 0.9, 4);
  tg5.rotateZ(0.05);
  tg5.rotateX(-0.04);
  tg5.translate(0.01, 0.43, 0.01);
  const tallGrassGeo = mergeParts([tg1, tg2, tg3, tg4, tg5]);
  const tallGrassMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.76});
  const tallGrassPalette = ['#50A255', '#5CB060', '#48964D', '#67BA6A', '#72C474'];
  const tallQuads: {mat: THREE.Matrix4; col: string}[][] = [[], [], [], []];
  let placedTall = 0;
  for (let i = 0; i < 950 && placedTall < TALL_GRASS_COUNT; i++) {
    const angle = i * 2.39996 + 1.85;
    const rad = i % 2 === 0 ? 27.0 + ((i * 1.97) % 45.0) : 9.4 + ((i * 2.13) % 62.0);
    const gx = Math.cos(angle) * rad;
    const gz = Math.sin(angle) * rad;
    if (isOnRoadOrPlaza(gx, gz)) continue;
    const gy = getTownGroundHeight(gx, gz) - 0.02;
    _instDummy.position.set(gx, gy, gz);
    _instDummy.rotation.set(0, angle * 1.3, 0);
    _instDummy.scale.setScalar(0.92 + (placedTall % 5) * 0.12);
    _instDummy.updateMatrix();
    const q = (gx >= 0 ? 1 : 0) + (gz >= 0 ? 2 : 0);
    tallQuads[q].push({
      mat: _instDummy.matrix.clone(),
      col: tallGrassPalette[placedTall % tallGrassPalette.length],
    });
    placedTall++;
  }
  tallQuads.forEach((recs) => {
    if (recs.length === 0) return;
    const qTall = new THREE.InstancedMesh(tallGrassGeo, tallGrassMat, recs.length);
    recs.forEach((r, qi) => {
      qTall.setMatrixAt(qi, r.mat);
      _instColor.set(r.col);
      qTall.setColorAt(qi, _instColor);
    });
    qTall.instanceMatrix.needsUpdate = true;
    if (qTall.instanceColor) qTall.instanceColor.needsUpdate = true;
    qTall.computeBoundingSphere();
    qTall.userData = {noShadowBlock: true};
    group.add(qTall);
  });

  // Small Pebbles & Large Mossy Boulder Clusters (Tảng đá lớn bé khắp đường mòn, đồi & vùng rìa)
  const smallRockCoordsRaw: [number, number, number][] = [
    [-9.5, -16.5, 0.44],
    [10.8, -18.5, 0.48],
    [-21.5, -4.5, 0.45],
    [21.5, -4.5, 0.46],
    [-8.5, 21.5, 0.4],
    [8.5, 21.5, 0.42],
    [-19.5, 11.5, 0.46],
    [19.2, 11.2, 0.48],
    [-14.0, 31.8, 0.52],
    [16.4, 34.8, 0.48],
    [-38.0, 29.8, 0.54],
    [38.2, 29.2, 0.52],
    [-22.0, 56.0, 0.58],
    [22.5, 55.5, 0.56],
    [-46.0, 10.5, 0.54],
    [46.5, 10.0, 0.56],
    // Outer field stones
    [-68.5, 10.0, 0.56],
    [54.0, -3.0, 0.54],
    [-51.0, 39.5, 0.58],
    [51.5, 39.0, 0.56],
    [-32.5, 62.0, 0.6],
    [33.0, 61.5, 0.58],
    [-6.0, 58.0, 0.54],
    [8.0, 59.5, 0.55],
    [-58.5, 24.5, 0.6],
    [59.0, 24.0, 0.58],
    [-55.0, -32.0, 0.58],
    [55.5, -31.5, 0.56],
    [-26.0, -45.0, 0.54],
    [26.5, -44.5, 0.54],
    // East riverbank small stones
    [-73.2, -19.5, 0.56],
    [-73.8, -32.0, 0.54],
    [-72.0, 14.5, 0.56],
    [-69.8, 30.0, 0.58],
    [62.5, 16.5, 0.56],
    [62.0, -18.5, 0.56],
  ];
  const smallRockCoords = smallRockCoordsRaw.filter(([rx, rz]) => !isInWestRiverOrCliffZone(rx, rz));
  const p1 = new THREE.DodecahedronGeometry(0.55, 0);
  p1.scale(1.22, 0.68, 1.0);
  const p2 = new THREE.DodecahedronGeometry(0.35, 0);
  p2.scale(1.1, 0.72, 0.95);
  p2.translate(0.45, -0.08, 0.28);
  const smallRockGeo = mergeParts([p1, p2]);
  const pebbleMat = getMat('#9AA5B0', 0.84);
  const pebbleIM = new THREE.InstancedMesh(smallRockGeo, pebbleMat, smallRockCoords.length);
  smallRockCoords.forEach(([rx, rz, rs], i) => {
    _instDummy.position.set(rx, getTownGroundHeight(rx, rz) + rs * 0.16, rz);
    _instDummy.rotation.set(0, i * 1.2, 0);
    _instDummy.scale.setScalar(rs);
    _instDummy.updateMatrix();
    pebbleIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'circle', x: rx, z: rz, r: rs * 0.65});
  });
  pebbleIM.instanceMatrix.needsUpdate = true;
  pebbleIM.computeBoundingSphere();
  pebbleIM.userData = {noShadowBlock: true};
  group.add(pebbleIM);

  // Hero Large Mossy Boulders (Tảng đá lớn có rêu phủ tự nhiên)
  const bStone1 = new THREE.DodecahedronGeometry(0.95, 0);
  bStone1.scale(1.28, 0.84, 1.1);
  bStone1.translate(0, 0.42, 0);
  const bStone2 = new THREE.DodecahedronGeometry(0.58, 0);
  bStone2.scale(1.15, 0.78, 1.0);
  bStone2.translate(-0.82, 0.24, 0.36);
  const heroBoulderGeo = mergeParts([bStone1, bStone2]);
  const heroBoulderMat = getMat('#8994A0', 0.86);

  const mossCapGeo = new THREE.SphereGeometry(0.68, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
  mossCapGeo.scale(1.18, 0.32, 1.05);
  mossCapGeo.translate(0.05, 0.95, 0);
  const mossCapMat = getMat('#5BA65E', 0.82);

  const largeRockCoordsRaw: [number, number, number][] = [
    [HILL_CENTER.x - 22.5, HILL_CENTER.z + 18.2, 1.15],
    [HILL_CENTER.x + 22.8, HILL_CENTER.z + 17.8, 1.12],
    [HILL_CENTER.x - 18.2, HILL_CENTER.z - 22.8, 1.25],
    [HILL_CENTER.x + 18.6, HILL_CENTER.z - 22.4, 1.22],
    [-46.5, -14.0, 1.05],
    [47.0, -13.5, 1.08],
    [-48.0, 22.5, 1.1],
    [48.5, 22.0, 1.12],
    [-38.5, 47.0, 1.08],
    [34.5, 48.5, 1.12],
    [-12.5, 59.5, 1.18],
    [13.5, 58.0, 1.16],
    [-55.0, 34.0, 1.2],
    [55.5, 33.5, 1.18],
    // Outer zone landmark boulders
    [-68.5, -1.5, 1.16],
    [60.0, 7.0, 1.16],
    [-58.0, -24.5, 1.2],
    [58.5, -24.0, 1.18],
    [-25.5, 62.5, 1.14],
    [26.0, 62.0, 1.16],
    [-46.0, -49.5, 1.22],
    [46.5, -49.0, 1.2],
    // East riverbank & outer landmark boulders
    [-74.5, -22.5, 1.18],
    [-70.5, 29.0, 1.16],
    [64.5, 2.5, 1.18],
  ];
  const largeRockCoords = largeRockCoordsRaw.filter(([rx, rz]) => !isInWestRiverOrCliffZone(rx, rz));
  const heroBoulderIM = new THREE.InstancedMesh(heroBoulderGeo, heroBoulderMat, largeRockCoords.length);
  const heroMossIM = new THREE.InstancedMesh(mossCapGeo, mossCapMat, largeRockCoords.length);
  largeRockCoords.forEach(([rx, rz, rs], i) => {
    _instDummy.position.set(rx, getTownGroundHeight(rx, rz) - 0.04, rz);
    _instDummy.rotation.set(0, (i * 1.7) % (Math.PI * 2), 0);
    _instDummy.scale.setScalar(rs);
    _instDummy.updateMatrix();
    heroBoulderIM.setMatrixAt(i, _instDummy.matrix);
    heroMossIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'circle', x: rx, z: rz, r: rs * 1.15});
  });
  heroBoulderIM.instanceMatrix.needsUpdate = true;
  heroMossIM.instanceMatrix.needsUpdate = true;
  heroBoulderIM.computeBoundingSphere();
  heroMossIM.computeBoundingSphere();
  heroBoulderIM.userData = {noShadowBlock: true};
  heroMossIM.userData = {noShadowBlock: true};
  group.add(heroBoulderIM, heroMossIM);

  // Large Hero Meadow Flower Clusters (Cụm hoa 5 cánh rõ nét phủ rộng ra vùng ngoài thu hút bướm/ong)
  const BIG_FLOWER_MAX = 72;
  const bigFlowerCoords: [number, number][] = [];
  const bfLeafParts: THREE.BufferGeometry[] = [];
  const bfBaseLeaf = new THREE.SphereGeometry(0.46, 8, 6);
  bfBaseLeaf.scale(1.22, 0.36, 1.18);
  bfBaseLeaf.translate(0, 0.11, 0);
  bfLeafParts.push(bfBaseLeaf);
  for (let l = 0; l < 5; l++) {
    const a = (l / 5) * Math.PI * 2 + 0.25;
    const leaf = new THREE.SphereGeometry(0.2, 6, 5);
    leaf.scale(0.82, 0.24, 1.65);
    leaf.rotateX(-0.26);
    leaf.translate(0, 0.14, 0.34);
    leaf.rotateY(a);
    bfLeafParts.push(leaf);
  }
  const bfMoundGeo = mergeParts(bfLeafParts);
  const bfMoundMat = getMat('#4EA85B', 0.76);
  const bfMoundIM = new THREE.InstancedMesh(bfMoundGeo, bfMoundMat, BIG_FLOWER_MAX);

  const bfPetalParts: THREE.BufferGeometry[] = [];
  const bfCenterParts: THREE.BufferGeometry[] = [];
  append5PetalFlower(bfPetalParts, bfCenterParts, 0, 0.37, 0, 2.25, 0.08, 0.04, 0.1);
  append5PetalFlower(bfPetalParts, bfCenterParts, -0.27, 0.29, 0.2, 1.85, 0.24, 0.2, 0.7);
  append5PetalFlower(bfPetalParts, bfCenterParts, 0.26, 0.3, -0.16, 1.9, -0.2, -0.22, 1.3);
  append5PetalFlower(bfPetalParts, bfCenterParts, -0.1, 0.26, -0.27, 1.7, -0.25, 0.12, 2.0);
  append5PetalFlower(bfPetalParts, bfCenterParts, 0.2, 0.25, 0.24, 1.65, 0.22, -0.2, 2.6);
  const bfBloomGeo = mergeParts(bfPetalParts);
  const bfCenterGeo = mergeParts(bfCenterParts);
  const bfBloomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.46});
  const bfCenterMat = getMat('#FFD24C', 0.4);
  const bfBloomIM = new THREE.InstancedMesh(bfBloomGeo, bfBloomMat, BIG_FLOWER_MAX);
  const bfCenterIM = new THREE.InstancedMesh(bfCenterGeo, bfCenterMat, BIG_FLOWER_MAX);
  const bfPalette = ['#FF8FA8', '#98D8FF', '#D5AEFF', '#FFAD85', '#FFFFFF'];

  let placedBigFlowers = 0;
  for (let i = 0; i < 420 && placedBigFlowers < BIG_FLOWER_MAX; i++) {
    const angle = i * 2.39996 + 0.55;
    const rad = i % 2 === 0 ? 29.0 + ((i * 2.17) % 34.0) : 10.6 + ((i * 2.41) % 52.0);
    const fx = Math.cos(angle) * rad;
    const fz = Math.sin(angle) * rad;
    if (isOnRoadOrPlaza(fx, fz)) continue;
    const fy = getTownGroundHeight(fx, fz) - 0.02;
    const sc = 0.94 + (placedBigFlowers % 3) * 0.14;
    _instDummy.position.set(fx, fy, fz);
    _instDummy.rotation.set(0, angle * 1.1, 0);
    _instDummy.scale.setScalar(sc);
    _instDummy.updateMatrix();
    bfMoundIM.setMatrixAt(placedBigFlowers, _instDummy.matrix);
    bfBloomIM.setMatrixAt(placedBigFlowers, _instDummy.matrix);
    bfCenterIM.setMatrixAt(placedBigFlowers, _instDummy.matrix);
    _instColor.set(bfPalette[placedBigFlowers % bfPalette.length]);
    bfBloomIM.setColorAt(placedBigFlowers, _instColor);
    bigFlowerCoords.push([fx, fz]);
    colliders.push({type: 'circle', x: fx, z: fz, r: 0.45 * sc});
    placedBigFlowers++;
  }
  bfMoundIM.count = placedBigFlowers;
  bfBloomIM.count = placedBigFlowers;
  bfCenterIM.count = placedBigFlowers;
  bfMoundIM.instanceMatrix.needsUpdate = true;
  bfBloomIM.instanceMatrix.needsUpdate = true;
  bfCenterIM.instanceMatrix.needsUpdate = true;
  if (bfBloomIM.instanceColor) bfBloomIM.instanceColor.needsUpdate = true;
  bfMoundIM.computeBoundingSphere();
  bfBloomIM.computeBoundingSphere();
  bfCenterIM.computeBoundingSphere();
  bfMoundIM.userData = {noShadowBlock: true};
  bfBloomIM.userData = {noShadowBlock: true};
  bfCenterIM.userData = {noShadowBlock: true};
  group.add(bfMoundIM, bfBloomIM, bfCenterIM);

  // ========== COZY LIFE-SIM REPEATABLE MAP PROPS (STATIC INSTANCED MESHES — ZERO LAG) ==========
  // 1. Forest Toadstool Mushroom Clusters (Nấm rừng xinh gần gốc cây & đá tảng)
  const MUSHROOM_COUNT = 32;
  const mStem1 = new THREE.CylinderGeometry(0.036, 0.048, 0.18, 7);
  mStem1.translate(0, 0.09, 0);
  const mStem2 = new THREE.CylinderGeometry(0.025, 0.035, 0.13, 6);
  mStem2.translate(0.11, 0.065, 0.07);
  const mushStemGeo = mergeParts([mStem1, mStem2]);
  const mushStemIM = new THREE.InstancedMesh(mushStemGeo, getMat('#FFF5E4', 0.65), MUSHROOM_COUNT);

  const mCap1 = new THREE.SphereGeometry(0.11, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
  mCap1.scale(1.1, 0.78, 1.1);
  mCap1.translate(0, 0.17, 0);
  const mCap2 = new THREE.SphereGeometry(0.076, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
  mCap2.scale(1.1, 0.78, 1.1);
  mCap2.translate(0.11, 0.125, 0.07);
  const mushCapGeo = mergeParts([mCap1, mCap2]);
  const mushCapMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.45});
  const mushCapIM = new THREE.InstancedMesh(mushCapGeo, mushCapMat, MUSHROOM_COUNT);
  const mushPalette = ['#E85D58', '#F28B50', '#E59866', '#E86F7A'];
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const src = i < oakTrees.length ? oakTrees[i] : largeRockCoords[i % largeRockCoords.length];
    const ang = (i * 2.1) % (Math.PI * 2);
    const mx = src[0] + Math.cos(ang) * 1.15;
    const mz = src[1] + Math.sin(ang) * 1.15;
    _instDummy.position.set(mx, getTownGroundHeight(mx, mz) - 0.01, mz);
    _instDummy.rotation.set(0, ang, 0);
    _instDummy.scale.setScalar(1.0 + (i % 3) * 0.22);
    _instDummy.updateMatrix();
    mushStemIM.setMatrixAt(i, _instDummy.matrix);
    mushCapIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(mushPalette[i % mushPalette.length]);
    mushCapIM.setColorAt(i, _instColor);
  }
  mushStemIM.instanceMatrix.needsUpdate = true;
  mushCapIM.instanceMatrix.needsUpdate = true;
  if (mushCapIM.instanceColor) mushCapIM.instanceColor.needsUpdate = true;
  mushStemIM.computeBoundingSphere();
  mushCapIM.computeBoundingSphere();
  mushStemIM.userData = {noShadowBlock: true};
  mushCapIM.userData = {noShadowBlock: true};
  group.add(mushStemIM, mushCapIM);

  // 2. Mossy Fallen Logs (Khúc gỗ mục phủ rêu ngoài đồng cỏ & bìa rừng — điểm đậu côn trùng)
  const fallenLogCoordsRaw: [number, number, number][] = [
    [-46.5, 16.5, 0.4],
    [47.0, 16.0, -0.5],
    [-42.0, -28.0, 1.1],
    [43.0, -27.5, -1.0],
    [-39.2, 52.5, 0.25],
    [27.0, 50.5, -0.3],
    [-66.5, 22.0, 1.3],
    [56.0, -1.0, -1.2],
    [-12.2, 55.2, 0.8],
    [16.5, 48.5, -0.75],
    [-49.5, 40.5, 0.6],
    [50.0, 40.0, -0.6],
  ];
  const fallenLogCoords = fallenLogCoordsRaw.filter(([lx, lz]) => !isInWestRiverOrCliffZone(lx, lz));
  const logTrunk = new THREE.CylinderGeometry(0.24, 0.27, 2.05, 8);
  logTrunk.rotateZ(Math.PI / 2);
  logTrunk.translate(0, 0.22, 0);
  const logStub = new THREE.CylinderGeometry(0.08, 0.11, 0.45, 6);
  logStub.rotateZ(0.48);
  logStub.translate(-0.45, 0.42, 0.08);
  const fallenLogWoodGeo = mergeParts([logTrunk, logStub]);
  const fallenLogWoodIM = new THREE.InstancedMesh(
    fallenLogWoodGeo,
    getMat('#734D34', 0.88),
    fallenLogCoords.length,
  );

  const logMoss1 = new THREE.SphereGeometry(0.28, 7, 5);
  logMoss1.scale(1.65, 0.35, 0.85);
  logMoss1.translate(0.18, 0.41, 0);
  const logMoss2 = new THREE.SphereGeometry(0.22, 7, 5);
  logMoss2.scale(1.25, 0.32, 0.82);
  logMoss2.translate(-0.48, 0.38, -0.05);
  const fallenLogMossGeo = mergeParts([logMoss1, logMoss2]);
  const fallenLogMossIM = new THREE.InstancedMesh(
    fallenLogMossGeo,
    getMat('#53A359', 0.84),
    fallenLogCoords.length,
  );
  fallenLogCoords.forEach(([lx, lz, rot], i) => {
    _instDummy.position.set(lx, getTownGroundHeight(lx, lz) - 0.02, lz);
    _instDummy.rotation.set(0, rot, 0);
    _instDummy.scale.setScalar(1.0);
    _instDummy.updateMatrix();
    fallenLogWoodIM.setMatrixAt(i, _instDummy.matrix);
    fallenLogMossIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'box', x: lx, z: lz, hw: 1.05, hd: 0.34, rotY: rot});
  });
  fallenLogWoodIM.instanceMatrix.needsUpdate = true;
  fallenLogMossIM.instanceMatrix.needsUpdate = true;
  fallenLogWoodIM.computeBoundingSphere();
  fallenLogMossIM.computeBoundingSphere();
  fallenLogWoodIM.userData = {noShadowBlock: true};
  fallenLogMossIM.userData = {noShadowBlock: true};
  group.add(fallenLogWoodIM, fallenLogMossIM);

  // 3. Rural Wooden Split-Rail Fences along scenic outer meadow paths (Hàng rào gỗ đồng quê)
  const fenceCoords: [number, number, number][] = [
    [-28.0, 29.5, 0.08],
    [-25.0, 29.5, 0.04],
    [25.0, 29.5, -0.04],
    [28.0, 29.5, -0.08],
    [-39.0, 3.0, Math.PI / 2],
    [-39.0, 6.0, Math.PI / 2],
    [39.0, 3.0, Math.PI / 2],
    [39.0, 6.0, Math.PI / 2],
    [16.8, 51.4, -0.15],
    [19.8, 51.0, -0.15],
    [-27.0, -32.0, 0.35],
    [27.0, -32.0, -0.35],
  ];
  const fp1 = new THREE.CylinderGeometry(0.065, 0.08, 0.88, 6);
  fp1.translate(-1.25, 0.44, 0);
  const fp2 = new THREE.CylinderGeometry(0.065, 0.08, 0.88, 6);
  fp2.translate(1.25, 0.44, 0);
  const frTop = new THREE.BoxGeometry(2.75, 0.085, 0.075);
  frTop.translate(0, 0.68, 0);
  const frBot = new THREE.BoxGeometry(2.75, 0.085, 0.075);
  frBot.translate(0, 0.36, 0);
  const woodenFenceGeo = mergeParts([fp1, fp2, frTop, frBot]);
  const woodenFenceIM = new THREE.InstancedMesh(
    woodenFenceGeo,
    getMat('#9E734B', 0.82),
    fenceCoords.length,
  );
  fenceCoords.forEach(([fx, fz, rot], i) => {
    _instDummy.position.set(fx, getTownGroundHeight(fx, fz) - 0.02, fz);
    _instDummy.rotation.set(0, rot, 0);
    _instDummy.scale.setScalar(1.0);
    _instDummy.updateMatrix();
    woodenFenceIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'box', x: fx, z: fz, hw: 1.4, hd: 0.24, rotY: rot});
  });
  woodenFenceIM.instanceMatrix.needsUpdate = true;
  woodenFenceIM.computeBoundingSphere();
  woodenFenceIM.userData = {noShadowBlock: true};
  group.add(woodenFenceIM);

  // 5. Wooden Trail Direction Signposts at outer path junctions (Biển chỉ đường gỗ ngã ba)
  const signpostCoords: [number, number, number][] = [
    [-21.2, 24.5, 0.45],
    [21.2, 24.5, -0.45],
    [-21.2, -14.8, 0.75],
    [21.2, -14.8, -0.75],
    [-2.5, 44.0, 0.2],
    [2.5, -24.5, -0.2],
  ];
  const spPost = new THREE.CylinderGeometry(0.065, 0.08, 1.35, 7);
  spPost.translate(0, 0.675, 0);
  const spCap = new THREE.SphereGeometry(0.08, 7, 6);
  spCap.translate(0, 1.38, 0);
  const spArm1 = new THREE.BoxGeometry(0.68, 0.18, 0.06);
  spArm1.translate(0.18, 1.15, 0.04);
  const spArm2 = new THREE.BoxGeometry(0.62, 0.16, 0.06);
  spArm2.rotateY(0.55);
  spArm2.translate(-0.14, 0.9, -0.04);
  const signpostGeo = mergeParts([spPost, spCap, spArm1, spArm2]);
  const signpostIM = new THREE.InstancedMesh(
    signpostGeo,
    getMat('#8F623E', 0.8),
    signpostCoords.length,
  );
  signpostCoords.forEach(([sx, sz, rot], i) => {
    _instDummy.position.set(sx, getTownGroundHeight(sx, sz) - 0.02, sz);
    _instDummy.rotation.set(0, rot, 0);
    _instDummy.scale.setScalar(1.0);
    _instDummy.updateMatrix();
    signpostIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'circle', x: sx, z: sz, r: 0.28});
  });
  signpostIM.instanceMatrix.needsUpdate = true;
  signpostIM.computeBoundingSphere();
  signpostIM.userData = {noShadowBlock: true};
  group.add(signpostIM);

  // Town Insect Habitats & Live 3D Bug Manager (Inner plaza + Outer meadows + West Riverside)
  const insectAnchors: InsectAnchor[] = [];
  const resolveAnchorZone = (x: number, z: number): 'inner' | 'outer' | 'riverside' => {
    if (x <= -63.5) return 'riverside';
    if (Math.hypot(x, z) >= 28) return 'outer';
    return 'inner';
  };
  bigFlowerCoords.forEach(([fx, fz]) => {
    insectAnchors.push({x: fx, y: getTownGroundHeight(fx, fz) + 0.34, z: fz, habitat: 'flower', zone: resolveAnchorZone(fx, fz)});
  });
  bushCoords.forEach(([bx, bz]) => {
    insectAnchors.push({x: bx, y: getTownGroundHeight(bx, bz) + 0.44, z: bz, habitat: 'bush', zone: resolveAnchorZone(bx, bz)});
  });
  bigBushCoords.forEach(([bx, bz]) => {
    insectAnchors.push({x: bx, y: getTownGroundHeight(bx, bz) + 0.56, z: bz, habitat: 'bush', zone: resolveAnchorZone(bx, bz)});
  });
  oakTrees.forEach(([tx, tz, ts], i) => {
    const gy = getTownGroundHeight(tx, tz);
    const clingAng = (i * 1.7 + 0.5) % (Math.PI * 2);
    const trunkSurfaceR = 0.28 * ts;
    insectAnchors.push({
      x: tx + Math.sin(clingAng) * trunkSurfaceR,
      y: gy + 1.05 * ts,
      z: tz + Math.cos(clingAng) * trunkSurfaceR,
      habitat: 'tree',
      clingAngle: clingAng,
      zone: resolveAnchorZone(tx, tz),
    });
  });
  branchedTrees.forEach(([tx, tz, ts], i) => {
    const gy = getTownGroundHeight(tx, tz);
    const clingAng = (i * 2.1 + 1.2) % (Math.PI * 2);
    const trunkSurfaceR = 0.19 * ts;
    insectAnchors.push({
      x: tx + Math.sin(clingAng) * trunkSurfaceR,
      y: gy + 0.92 * ts,
      z: tz + Math.cos(clingAng) * trunkSurfaceR,
      habitat: 'tree',
      clingAngle: clingAng,
      zone: resolveAnchorZone(tx, tz),
    });
  });
  pineCoords.forEach(([px, pz, ps], i) => {
    if (px >= -142 && px <= 78 && pz >= -92 && pz <= 72 && i % 2 === 0) {
      const gy = getTownGroundHeight(px, pz);
      const clingAng = (i * 1.45 + 0.35) % (Math.PI * 2);
      const trunkSurfaceR = 0.17 * ps;
      insectAnchors.push({
        x: px + Math.sin(clingAng) * trunkSurfaceR,
        y: gy + 0.88 * ps,
        z: pz + Math.cos(clingAng) * trunkSurfaceR,
        habitat: 'tree',
        clingAngle: clingAng,
        zone: resolveAnchorZone(px, pz),
      });
    }
  });
  fallenLogCoords.forEach(([lx, lz]) => {
    insectAnchors.push({x: lx, y: getTownGroundHeight(lx, lz) + 0.45, z: lz, habitat: 'tree', zone: resolveAnchorZone(lx, lz)});
  });
  smallRockCoords.forEach(([rx, rz]) => {
    insectAnchors.push({x: rx, y: getTownGroundHeight(rx, rz) + 0.35, z: rz, habitat: 'rock', zone: resolveAnchorZone(rx, rz)});
  });
  largeRockCoords.forEach(([rx, rz]) => {
    insectAnchors.push({x: rx, y: getTownGroundHeight(rx, rz) + 0.92, z: rz, habitat: 'rock', zone: resolveAnchorZone(rx, rz)});
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sr = getLakeShoreRadius(a) + 0.85;
    const wx = LAKE_CENTER.x + Math.cos(a) * sr;
    const wz = LAKE_CENTER.z + Math.sin(a) * sr;
    insectAnchors.push({x: wx, y: 0.25, z: wz, habitat: 'water_edge', zone: 'outer'});
  }
  insectAnchors.push(...westInsectAnchors);
  const insectManager = new TownInsectManager(group, insectAnchors);

  // Track last applied timeOfDay so emissive updates only run when changed
  let lastAppliedTod: TimeOfDay | null = null;
  let currentTod: TimeOfDay = 'morning';
  const _swayEuler = new THREE.Euler();
  const _swayRotQ = new THREE.Quaternion();

  // Precomputed bounding spheres for fast zero-allocation frustum culling
  const _fountainSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 3.6);
  const _windmillSphere = new THREE.Sphere(new THREE.Vector3(42.8, 5.8, -23.2), 5.2);
  const _petalsSphere = new THREE.Sphere(new THREE.Vector3(patioCenter.x - 1.6, 2.5, patioCenter.z - 1.1), 5.4);
  const _reedsSphere = new THREE.Sphere(new THREE.Vector3(LAKE_CENTER.x, 0.5, LAKE_CENTER.z), 12.5);
  const _fireflySphere = new THREE.Sphere(new THREE.Vector3(LAKE_CENTER.x, 1.0, LAKE_CENTER.z), 12.0);
  const _campfireSphere = new THREE.Sphere(new THREE.Vector3(16.6, 0.6, -22.2), 2.8);
  const _koiSphere = new THREE.Sphere(new THREE.Vector3(-16.8, 1.2, 37.2), 3.2);
  const _shipSphere = new THREE.Sphere(new THREE.Vector3(SHIP_STALL_POS.x, 1.4, SHIP_STALL_POS.z), 3.4);
  const _waterfallSphere = new THREE.Sphere(new THREE.Vector3(-96.0, 4.2, -9.0), 14.0);
  const _westCampSphere = new THREE.Sphere(new THREE.Vector3(-113.5, 1.5, 36.2), 16.0);

  let useExternalFishingFrame = false;
  let prevTownElapsed = 0;
  let fountainAccum = 0;
  let petalAccum = 0;
  let reedAccum = 0;
  let fireflyAccum = 0;
  let koiAccum = 0;
  let shipAccum = 0;
  let waterfallAccum = 0;

  const setFishingState = (state: 'idle' | 'waiting' | 'bite') => {
    useExternalFishingFrame = false;
    lakeFishingVisuals?.setLegacyState(state);
  };

  const updateFishingVisuals = (frame: FishingVisualFrame, elapsed: number) => {
    useExternalFishingFrame = true;
    lakeFishingVisuals?.applyFrame(frame, elapsed);
  };

  const setOutdoorSwingSeated = (seated: boolean) => {
    swingSeated = seated;
  };

  const getOutdoorSwingSeatPose = () => {
    if (!outdoorSwingPivot) return null;
    const a = outdoorSwingPivot.rotation.x;
    const L = 1.78;
    return {
      x: 12.4,
      y: 0.02 + 2.36 - L * Math.cos(a),
      z: -21.6 - L * Math.sin(a),
      pitch: a,
    };
  };

  const setRiverBoatPose = (
    active: boolean,
    x = RIVER_BOAT_SPAWN.x,
    z = RIVER_BOAT_SPAWN.z,
    rotY = RIVER_BOAT_SPAWN.rotY,
    moving = false,
    elapsed = 0,
  ) => {
    if (mooredRiverBoat) {
      mooredRiverBoat.visible = !active;
    }
    if (activeRiverBoat) {
      activeRiverBoat.visible = active;
      if (active) {
        const bob = Math.sin(elapsed * 2.2) * 0.028;
        activeRiverBoat.position.set(x, RIVER_WATER_Y + 0.05 + bob, z);
        activeRiverBoat.rotation.set(
          moving ? Math.sin(elapsed * 4.4) * 0.02 : Math.sin(elapsed * 1.7) * 0.01,
          rotY,
          Math.cos(elapsed * 2.1) * 0.018,
        );
        if (activeBoatOarL && activeBoatOarR) {
          const stroke = moving ? Math.sin(elapsed * 5.6) * 0.42 : 0;
          const dip = moving ? Math.cos(elapsed * 5.6) * 0.14 : 0;
          activeBoatOarL.rotation.set(dip, stroke, 0);
          activeBoatOarR.rotation.set(dip, -stroke, 0);
        }
      }
    }
  };

  const update = (
    elapsed: number,
    timeOfDay: TimeOfDay,
    frustum?: THREE.Frustum,
    cameraPos?: THREE.Vector3,
  ) => {
    const dt = prevTownElapsed > 0 ? Math.min(0.05, elapsed - prevTownElapsed) : 0.016;
    prevTownElapsed = elapsed;

    if (timeOfDay !== lastAppliedTod) {
      lastAppliedTod = timeOfDay;
      currentTod = timeOfDay;
      const isNight = timeOfDay === 'night';
      const winEmissive = isNight ? 1.45 : 0.08;
      const bulbEmissive = isNight ? 2.25 : 0.14;

      windowMeshes.forEach((m) => {
        m.emissiveIntensity = winEmissive;
      });
      lampBulbs.forEach((m) => {
        m.emissiveIntensity = m.userData?.isArcadeNeon
          ? isNight
            ? 0.65
            : 0.24
          : bulbEmissive;
      });
      if (treeLampHaloIM) {
        treeLampHaloIM.visible = isNight;
      }
      if (treeLampPoolIM) {
        treeLampPoolIM.visible = isNight;
      }
      districtNightPoolIM.visible = isNight;
      moonGroup.visible = isNight;
      starPoints.visible = isNight;
      if (stringBulbMat) {
        stringBulbMat.emissiveIntensity = isNight ? 2.9 : 0.16;
      }
      if (lakeWaterMat) {
        lakeWaterMat.color.set(isNight ? '#17405C' : '#3496B5');
      }
      if (riverWaterMat) {
        riverWaterMat.color.set(isNight ? '#446A84' : '#FFFFFF');
      }
      if (fireflyCoreIM && fireflyHaloIM) {
        fireflyCoreIM.visible = isNight;
        fireflyHaloIM.visible = isNight;
      }
    }

    const isNight = currentTod === 'night';
    const shouldAnimateAtDist = (center: THREE.Vector3, accum: number, setAccum: (v: number) => void, skipDist = 48, throttleDist = 22) => {
      if (!cameraPos) return true;
      const dSq = cameraPos.distanceToSquared(center);
      if (dSq > skipDist * skipDist) return false;
      if (dSq > throttleDist * throttleDist) {
        const next = accum + dt;
        if (next < 0.075) {
          setAccum(next);
          return false;
        }
        setAccum(0);
        return true;
      }
      setAccum(0);
      return true;
    };

    // 1. Fountain spray (frustum + distance throttled, zero allocations)
    if (
      (!frustum || frustum.intersectsSphere(_fountainSphere)) &&
      shouldAnimateAtDist(_fountainSphere.center, fountainAccum, (v) => {
        fountainAccum = v;
      })
    ) {
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
    }

    // 2. Spin Windmill Sails beside the Conservatory Greenhouse
    if (
      windmillSailHub &&
      (!frustum || frustum.intersectsSphere(_windmillSphere)) &&
      (!cameraPos || cameraPos.distanceToSquared(_windmillSphere.center) < 64 * 64)
    ) {
      windmillSailHub.rotation.z = -elapsed * 0.55;
    }

    // 4. Drifting Sakura Petals over Tea Patio (frustum + distance throttled, zero allocations)
    if (
      fallingPetalIM &&
      (!frustum || frustum.intersectsSphere(_petalsSphere)) &&
      shouldAnimateAtDist(_petalsSphere.center, petalAccum, (v) => {
        petalAccum = v;
      })
    ) {
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

    // 5. Gentle Wind Sway on Lake Aquatic Grass / Reeds (frustum + distance throttled)
    if (
      reedClumpIM &&
      reedClumpBaseTfs.length > 0 &&
      (!frustum || frustum.intersectsSphere(_reedsSphere)) &&
      shouldAnimateAtDist(_reedsSphere.center, reedAccum, (v) => {
        reedAccum = v;
      }, 45, 20)
    ) {
      for (let i = 0; i < reedClumpBaseTfs.length; i++) {
        const tf = reedClumpBaseTfs[i];
        _swayEuler.set(
          Math.sin(elapsed * 1.6 + i * 0.7) * 0.06,
          0,
          Math.cos(elapsed * 1.3 + i * 0.5) * 0.06,
        );
        _swayRotQ.setFromEuler(_swayEuler);
        _instDummy.position.copy(tf.pos);
        _instDummy.quaternion.copy(tf.quat).multiply(_swayRotQ);
        _instDummy.scale.copy(tf.scale);
        _instDummy.updateMatrix();
        reedClumpIM.setMatrixAt(i, _instDummy.matrix);
      }
      reedClumpIM.instanceMatrix.needsUpdate = true;
    }

    // 6. Nighttime Fireflies (Đom Đóm) over the Sunken Lotus Lake (frustum + distance throttled)
    if (
      fireflyCoreIM &&
      fireflyHaloIM &&
      isNight &&
      (!frustum || frustum.intersectsSphere(_fireflySphere)) &&
      shouldAnimateAtDist(_fireflySphere.center, fireflyAccum, (v) => {
        fireflyAccum = v;
      }, 50, 24)
    ) {
      for (let i = 0; i < FIREFLY_COUNT; i++) {
        const s = fireflySeeds[i];
        const t = elapsed * s.speed + s.phase;
        const fx = s.x + Math.sin(t) * s.rx;
        const fy = s.y + Math.sin(t * 1.35 + 1.2) * 0.24;
        const fz = s.z + Math.cos(t * 0.85) * s.rz;
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * s.blinkSpeed + s.phase));
        _instDummy.position.set(fx, fy, fz);
        _instDummy.rotation.set(0, 0, 0);
        _instDummy.scale.setScalar(Math.max(0.05, pulse));
        _instDummy.updateMatrix();
        fireflyCoreIM.setMatrixAt(i, _instDummy.matrix);
        _instDummy.scale.setScalar(Math.max(0.05, pulse * 1.15));
        _instDummy.updateMatrix();
        fireflyHaloIM.setMatrixAt(i, _instDummy.matrix);
      }
      fireflyCoreIM.instanceMatrix.needsUpdate = true;
      fireflyHaloIM.instanceMatrix.needsUpdate = true;
    }

    // 7. Outdoor Zone Swing Smooth Pendulum (actively swings when seated!) + Campfire Flicker
    const targetAmp = swingSeated ? 0.5 : 0.065;
    const swingFreq = swingSeated ? 2.45 : 1.35;
    swingAmp = THREE.MathUtils.lerp(swingAmp, targetAmp, 1 - Math.exp(-3.6 * dt));
    swingPhase += dt * swingFreq;
    if (outdoorSwingPivot) {
      outdoorSwingPivot.rotation.x = Math.sin(swingPhase) * swingAmp;
    }
    if (
      campfireFlameA &&
      campfireFlameB &&
      campfireGlowMat &&
      (!frustum || frustum.intersectsSphere(_campfireSphere)) &&
      (!cameraPos || cameraPos.distanceToSquared(_campfireSphere.center) < 46 * 46)
    ) {
      const fPulse = 0.9 + Math.sin(elapsed * 11) * 0.12 + Math.cos(elapsed * 17) * 0.06;
      campfireFlameA.scale.set(1, fPulse, 1);
      campfireFlameB.scale.set(1, 1.05 - (fPulse - 0.9) * 0.8, 1);
      campfireGlowMat.opacity = isNight ? 0.52 + Math.sin(elapsed * 8) * 0.08 : 0.26;
    }

    // 7B. West Meadow Campsite Fire Flicker + Night & Proximity-Gated Neon String Lights
    if (
      westCampFlameA &&
      westCampFlameB &&
      westCampGlowMat &&
      (!frustum || frustum.intersectsSphere(_westCampSphere)) &&
      (!cameraPos || cameraPos.distanceToSquared(_westCampSphere.center) < 46 * 46)
    ) {
      const fPulse = 0.9 + Math.sin(elapsed * 10.2 + 0.6) * 0.14 + Math.cos(elapsed * 16.4) * 0.07;
      westCampFlameA.scale.set(1, fPulse, 1);
      westCampFlameB.scale.set(1, 1.06 - (fPulse - 0.9) * 0.85, 1);
      westCampGlowMat.opacity = isNight ? 0.56 + Math.sin(elapsed * 7.5) * 0.09 : 0.28;
    }
    const showCampLantern =
      isNight &&
      (!cameraPos || cameraPos.distanceToSquared(_westCampSphere.center) < 42 * 42) &&
      (!frustum || frustum.intersectsSphere(_westCampSphere));
    if (showCampLantern !== lastCampLanternLit) {
      lastCampLanternLit = showCampLantern;
      if (westCampLanternMat) {
        westCampLanternMat.emissiveIntensity = showCampLantern ? 0.92 : 0.12;
      }
      if (westCampLanternPoolMat) {
        westCampLanternPoolMat.opacity = showCampLantern ? 0.24 : 0;
      }
    }

    // 8. Fallback legacy lake bobber update if Play Together frame driver is idle
    if (lakeFishingVisuals && !useExternalFishingFrame) {
      lakeFishingVisuals.updateLegacy(elapsed);
    }
    // 9. Koi NPC gentle idle animation (frustum + distance throttled)
    if (
      koiRig &&
      (!frustum || frustum.intersectsSphere(_koiSphere)) &&
      shouldAnimateAtDist(_koiSphere.center, koiAccum, (v) => {
        koiAccum = v;
      }, 48, 22)
    ) {
      updateAvatarRigAnimation(koiRig, 'idle', elapsed, false);
    }

    // 10. Khu Sinh Thái: Stationary Stream/Waterfall & Distance/Frustum-Gated Splash Bubbling (Sủi Bọt)
    if (
      (!frustum || frustum.intersectsSphere(_waterfallSphere)) &&
      shouldAnimateAtDist(
        _waterfallSphere.center,
        waterfallAccum,
        (v) => {
          waterfallAccum = v;
        },
        42,
        18,
      )
    ) {
      if (waterfallSplashIM && waterfallSplashSeeds.length > 0) {
        for (let i = 0; i < waterfallSplashSeeds.length; i++) {
          const s = waterfallSplashSeeds[i];
          const b = 0.5 + 0.5 * Math.sin(elapsed * s.speed + s.phase);
          _instDummy.position.set(s.x, s.y + b * s.hop, s.z);
          _instDummy.rotation.set(0, i * 0.8 + elapsed * 0.6, 0);
          _instDummy.scale.setScalar(s.r * (0.82 + b * 0.38));
          _instDummy.updateMatrix();
          waterfallSplashIM.setMatrixAt(i, _instDummy.matrix);
        }
        waterfallSplashIM.instanceMatrix.needsUpdate = true;
      }
      if (midLedgeMistRing) {
        const mp = 0.94 + Math.sin(elapsed * 4.8 + 0.8) * 0.08;
        midLedgeMistRing.scale.set(mp, 1, mp);
      }
      if (waterfallFoamRing) {
        const pulse = 0.94 + Math.sin(elapsed * 4.2) * 0.09;
        waterfallFoamRing.scale.set(pulse, 1, pulse);
      }
    }
    if (
      shipRig &&
      (!frustum || frustum.intersectsSphere(_shipSphere)) &&
      shouldAnimateAtDist(_shipSphere.center, shipAccum, (v) => {
        shipAccum = v;
      }, 52, 24)
    ) {
      updateAvatarRigAnimation(shipRig, 'idle', elapsed, false);
    }
  };

  const dispose = () => {
    lakeFishingVisuals?.dispose();
    insectManager.dispose();
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => {
            if (!mat.userData?.pooled) mat.dispose();
          });
        } else if (!m.material.userData?.pooled) {
          m.material.dispose();
        }
      } else if ((obj as THREE.Sprite).isSprite) {
        (obj as THREE.Sprite).material.dispose();
      }
    });
  };

  const updateInsects = (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerSpeed: number,
    isCreeping: boolean,
    elapsed: number,
    dt: number,
    frustum?: THREE.Frustum,
    camX?: number,
    camZ?: number,
  ) =>
    insectManager.update(
      elapsed,
      dt,
      playerX,
      playerY,
      playerZ,
      playerSpeed,
      isCreeping,
      frustum,
      camX,
      camZ,
    );

  const tryCatchInsect = (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRotY: number,
  ) => insectManager.tryCatch(playerX, playerY, playerZ, playerRotY);

  return {
    group,
    groundMesh,
    groundMeshes: [groundMesh, hillMesh, ...pierWalkableMeshes],
    clickTargets,
    labelAnchors,
    colliders,
    plazaRadius: TOWN_PLAZA_RADIUS,
    setFishingState,
    updateFishingVisuals,
    setOutdoorSwingSeated,
    getOutdoorSwingSeatPose,
    setMallElevatorY,
    setRiverBoatPose,
    updateInsects,
    tryCatchInsect,
    update,
    dispose,
  };
}
