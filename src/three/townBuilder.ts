import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TimeOfDay, ZoneId} from '../types/game';
import {KOI_AVATAR} from '../data/avatarCatalog';
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
  createGrassTexture,
  createStoneWalkwayTexture,
  glossyClayMat,
  mergeStaticGroupByMaterial,
} from './materials';

export const TOWN_PLAZA_RADIUS = 7.2;
export const HILL_CENTER = {x: 0, z: -64};
export const HILL_RADIUS = 40.0;
export const HILL_PEAK_Y = 8.4;

export const TOWN_ZONE_ENTRANCES: Record<
  Exclude<ZoneId, 'town'>,
  {tx: number; tz: number; exitRotY: number}
> = {
  home: {tx: -32.0, tz: -16.2, exitRotY: 0},
  garden: {tx: 32.0, tz: -16.4, exitRotY: 0},
  boutique: {tx: -32.0, tz: 23.2, exitRotY: 0},
  arcade: {tx: 32.0, tz: 23.1, exitRotY: 0},
  fishing: {tx: -19.6, tz: 38.6, exitRotY: 0},
  petshop: {tx: 11.8, tz: 43.2, exitRotY: 0},
};

export const LAKE_CENTER = {x: -23.0, z: 46.8};
export const TOWN_LAKE_WATER_Y = -0.26;

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
  updateInsects?: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerSpeed: number,
    isCreeping: boolean,
    elapsed: number,
    dt: number,
    frustum?: THREE.Frustum,
  ) => {escapedByRun: number; startledByRun: number};
  tryCatchInsect?: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRotY: number,
  ) => InsectCatchEvaluation;
  update: (elapsed: number, timeOfDay: TimeOfDay, frustum?: THREE.Frustum) => void;
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

function createKoiStallSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FDF6E6';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#7A4E2D';
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, 488, 232);

  ctx.strokeStyle = '#3B9AB2';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 464, 208);

  // Decorative fish illustration on the left
  ctx.save();
  ctx.translate(152, 108);
  ctx.fillStyle = '#43A3B8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fish tail
  ctx.beginPath();
  ctx.moveTo(46, 0);
  ctx.lineTo(76, -22);
  ctx.lineTo(68, 0);
  ctx.lineTo(76, 22);
  ctx.closePath();
  ctx.fillStyle = '#2F7D92';
  ctx.fill();
  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-12, -24);
  ctx.lineTo(6, -38);
  ctx.lineTo(22, -20);
  ctx.closePath();
  ctx.fillStyle = '#E87A54';
  ctx.fill();
  // Eye & smile
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-28, -5, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1E2A32';
  ctx.beginPath();
  ctx.arc(-29, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Woven bamboo fish basket illustration on the right
  ctx.save();
  ctx.translate(358, 114);
  ctx.fillStyle = '#D99E57';
  ctx.beginPath();
  ctx.moveTo(-36, -18);
  ctx.lineTo(36, -18);
  ctx.quadraticCurveTo(46, 28, 22, 36);
  ctx.lineTo(-22, 36);
  ctx.quadraticCurveTo(-46, 28, -36, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8F5A29';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Basket rim & weave lines
  ctx.fillStyle = '#B87638';
  ctx.fillRect(-40, -24, 80, 10);
  ctx.strokeStyle = '#A66931';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-34, 4);
  ctx.lineTo(34, 4);
  ctx.moveTo(-30, 18);
  ctx.lineTo(30, 18);
  ctx.stroke();
  // Little tail peeking out of basket
  ctx.fillStyle = '#FF9C6E';
  ctx.beginPath();
  ctx.moveTo(10, -24);
  ctx.lineTo(26, -42);
  ctx.lineTo(2, -38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#382414';
  ctx.font = 'bold 46px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tiệm của Koi', 256, 194);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPetShopSideSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFF7EA';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#E0825B';
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, 488, 232);

  ctx.strokeStyle = '#5BB7B0';
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 26, 460, 204);

  const drawPaw = (cx: number, cy: number, s: number, col: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 10, 18, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    [
      [-18, -10],
      [-6, -20],
      [7, -20],
      [18, -10],
    ].forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.arc(tx, ty, 6.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  drawPaw(88, 130, 0.95, '#F09470');
  drawPaw(424, 130, 0.95, '#5BB7B0');

  ctx.fillStyle = '#4A3122';
  ctx.font = '900 94px "Nunito", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pets', 256, 132);

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
    const petal = new THREE.SphereGeometry(0.056, 6, 5);
    petal.scale(0.84, 0.34, 1.48);
    petal.rotateX(-0.22); // Cupped slightly upward so every petal silhouette reads clearly
    petal.translate(0, 0.012, 0.068);
    petal.rotateY(a);
    petal.applyMatrix4(dummy.matrix);
    petalParts.push(petal);
  }

  const pistil = new THREE.SphereGeometry(0.044, 6, 5);
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
    const g = new THREE.SphereGeometry(r, 10, 8);
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
    const g = new THREE.SphereGeometry(r, 9, 7);
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
      const g = new THREE.SphereGeometry(r, 9, 7);
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
      const g = new THREE.SphereGeometry(r, 9, 7);
      g.scale(sx, sy, sz);
      g.translate(x, y, z);
      return g;
    }),
  );

  return {trunkGeo, lowerCanopyGeo, upperCanopyGeo};
}

// Cute, friendly & simple layered Evergreen Pine tree (clean rounded conical tiers, never scary!)
function createPineConiferGeometries() {
  const root = new THREE.CylinderGeometry(0.18, 0.32, 0.36, 8);
  root.translate(0, 0.18, 0);

  const trunk = new THREE.CylinderGeometry(0.12, 0.21, 1.45, 8);
  trunk.translate(0, 0.88, 0);

  const trunkGeo = mergeParts([root, trunk]);

  // Lower 2 clean rounded conical skirts (9-sided cozy stylized pine)
  const tier1 = new THREE.ConeGeometry(1.42, 1.38, 10);
  tier1.translate(0, 1.82, 0);
  const tier1Rim = new THREE.TorusGeometry(1.16, 0.22, 7, 12);
  tier1Rim.rotateX(Math.PI / 2);
  tier1Rim.scale(1, 1, 0.65);
  tier1Rim.translate(0, 1.2, 0);

  const tier2 = new THREE.ConeGeometry(1.16, 1.28, 10);
  tier2.rotateY(0.31);
  tier2.translate(0, 2.58, 0);

  const lowerFoliageGeo = mergeParts([tier1, tier1Rim, tier2]);

  // Upper 2 sun-kissed conical tiers + soft rounded tip
  const tier3 = new THREE.ConeGeometry(0.9, 1.16, 10);
  tier3.rotateY(0.15);
  tier3.translate(0, 3.28, 0);

  const tier4 = new THREE.ConeGeometry(0.6, 0.98, 10);
  tier4.rotateY(0.45);
  tier4.translate(0, 3.94, 0);

  const crownTip = new THREE.SphereGeometry(0.18, 8, 6);
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
      const g = new THREE.SphereGeometry(r, 10, 8);
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

function createRadialGlowTexture(innerRgba: string, midRgba: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.45, midRgba);
  grad.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  // ShapeGeometry UVs are in world meters (110/600m ≈ 0.185 repeats/m)
  grassTex.repeat.set(0.185, 0.185);
  const plazaStoneTex = createStoneWalkwayTexture(4, 4);
  const signTex = createDailyQuestSignTexture();
  const koiSignTex = createKoiStallSignTexture();
  const petShopSignTex = createPetShopSideSignTexture();
  const warmGlowTex = createRadialGlowTexture('rgba(255, 214, 130, 0.92)', 'rgba(255, 192, 95, 0.35)');
  let koiRig: AvatarRig | null = null;

  // ========== 1. EXPANDED TERRAIN (WITH PUNCHED LAKE BASIN) + GENTLE SCENIC HILL ==========
  const terrainShape = new THREE.Shape();
  terrainShape.absarc(0, 0, 300, 0, Math.PI * 2, false);
  const LAKE_HOLE_SEGMENTS = 64;
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

  const terrainGeo = new THREE.ShapeGeometry(terrainShape, 48);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.88,
    metalness: 0.0,
  });
  const groundMesh = new THREE.Mesh(terrainGeo, terrainMat);
  groundMesh.userData = {kind: 'ground'};
  group.add(groundMesh);

  // Gentle walkable Scenic Overlook Hill in the North (-Z)
  const hillSize = HILL_RADIUS * 2.12;
  const hillGeo = new THREE.PlaneGeometry(hillSize, hillSize, 64, 64);
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
  hillTex.repeat.set(18, 18);
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

  // Warm central plaza illumination at Sunset / Night
  const plazaNightLight = new THREE.PointLight('#FFB960', 0, 22, 1.35);
  plazaNightLight.position.set(0, 3.0, 0);
  group.add(plazaNightLight);

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
    home.position.set(-32, 0, -22.5);
    home.rotation.y = 0;
    home.scale.setScalar(1.68);

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
    colliders.push({type: 'box', id: 'home', x: -32, z: -22.5, hw: 4.8, hd: 4.0, rotY: 0});
    const mailWorld = new THREE.Vector3(1.55, 0, 3.08).applyMatrix4(home.matrixWorld);
    colliders.push({type: 'circle', id: 'home_mailbox', x: mailWorld.x, z: mailWorld.z, r: 0.54});
    mergeStaticGroupByMaterial(home);
    group.add(home);

    // Lightweight 1-draw-call InstancedMesh chimney smoke
    const smokeGeo = new THREE.SphereGeometry(0.26, 7, 6);
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

  // Warm cottage porch light for Sunset / Night
  const homePorchNightLight = new THREE.PointLight('#FFB35C', 0, 16, 1.45);
  homePorchNightLight.position.set(-32, 3.5, -18.2);
  group.add(homePorchNightLight);

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
    colliders.push({type: 'circle', id: 'garden_windmill', x: 42.8, z: -23.2, r: 2.5});
    mergeStaticGroupByMaterial(windmill, new Set([sailHub]));
    group.add(windmill);
  }

  // ========== DISTRICT 3: TIỆM THỜI TRANG (Parisian Pastel Boutique) ==========
  {
    const shop = new THREE.Group();
    shop.position.set(-32, 0, 18.0);
    shop.rotation.y = 0;
    shop.scale.setScalar(1.68);

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
    colliders.push({type: 'box', id: 'boutique', x: -32, z: 18.0, hw: 4.55, hd: 3.85, rotY: 0});
    mergeStaticGroupByMaterial(shop);
    group.add(shop);
  }

  // ========== DISTRICT 4: TIỆM MINIGAME (Large Flat-Roofed Game House + Upright 3D GAME Sign on Roof) ==========
  {
    const arcade = new THREE.Group();
    arcade.position.set(32, 0, 17.5);
    arcade.rotation.y = 0;
    arcade.scale.setScalar(1.52);

    const stonePlinthMat = getMat('#CFC8E2', 0.76);
    const stepMat = getMat('#DFDAEC', 0.74);
    const wallCreamMat = getMat('#F7F1FE', 0.66);
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

    // 2. Large Architectural Game Building Body + Wainscot + Recessed Side/Back Neon Trim (never slicing front glass doors!)
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

    const neonBelt = new THREE.Group();
    [-3.01, 3.01].forEach((sx) => {
      const sideTrim = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.1, 3.96, 2, 0.025),
        tealNeonMat,
      );
      sideTrim.position.set(sx, 1.16, -0.05);
      neonBelt.add(sideTrim);
    });
    const backTrim = new THREE.Mesh(
      new RoundedBoxGeometry(6.08, 0.1, 0.08, 2, 0.025),
      tealNeonMat,
    );
    backTrim.position.set(0, 1.16, -2.11);
    neonBelt.add(backTrim);

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
    colliders.push({type: 'box', id: 'arcade', x: 32, z: 17.5, hw: 5.1, hd: 3.95, rotY: 0});
    mergeStaticGroupByMaterial(arcade);
    group.add(arcade);
  }

  // ========== DISTRICT 5: HỒ CÂU CÁ TƯƠNG TÁC (Large Sunken Lotus Lake, Walkable Bridge, Aquatic Flora & Fireflies) ==========
  const pierWalkableMeshes: THREE.Object3D[] = [];
  let lakeWaterMat: THREE.MeshPhysicalMaterial | null = null;
  let lakePierNightLight: THREE.PointLight | null = null;
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
    lake.add(basinMesh);

    // 2. Recessed Translucent Glossy Water Surface (sits at y = -0.26, visibly below y = 0 ground)
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
    lakeWaterMat = new THREE.MeshPhysicalMaterial({
      color: '#3BB0D8',
      roughness: 0.08,
      metalness: 0.06,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.78,
    });
    const waterMesh = new THREE.Mesh(waterGeo, lakeWaterMat);
    waterMesh.position.y = LAKE_WATER_Y;
    waterMesh.userData = {
      kind: 'town_lake_fish',
      tx: PIER_X,
      tz: 43.4,
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
        color: '#217BA1',
        roughness: 0.14,
        transparent: true,
        opacity: 0.45,
      }),
    );
    deepMesh.position.y = LAKE_WATER_Y - 0.18;
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

    lakePierNightLight = new THREE.PointLight('#FFB960', 0, 18, 1.35);
    lakePierNightLight.position.set(PIER_X + 1.32, 2.0, 44.3);
    lake.add(lanternPost, lanternArm, lanternCord, lanternCap, pierLamp, lakePierNightLight);

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
    const STALL_ROT_Y = Math.PI + 0.35;
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
      new THREE.PlaneGeometry(1.42, 0.68),
      new THREE.MeshStandardMaterial({map: koiSignTex, roughness: 0.45}),
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
      {kind: 'koi_shop', tx: -17.6, tz: 35.15},
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

  // ========== DISTRICT 6: TRẠM BƯU ĐIỆN & ĐỒNG HỒ (Orthogonal Clock Tower & Post Office) ==========
  {
    const kiosk = new THREE.Group();
    kiosk.position.set(24, 0, 39.5);
    kiosk.rotation.y = 0;
    kiosk.scale.setScalar(1.6);

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
      {kind: 'settings', tx: 24, tz: 43.4},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'settings', x: 24, z: 39.5, hw: 2.8, hd: 2.48, rotY: 0});
    mergeStaticGroupByMaterial(kiosk);
    group.add(kiosk);
  }

  // ========== DISTRICT 6B: CỬA HÀNG THÚ CƯNG ("Pets" Hanging Side Sign + Large Puppy on Roof) ==========
  {
    const PET_X = 11.8;
    const PET_Z = 38.6;
    const petShop = new THREE.Group();
    petShop.position.set(PET_X, 0, PET_Z);
    petShop.scale.setScalar(1.42);

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

    const signMat = new THREE.MeshStandardMaterial({map: petShopSignTex, roughness: 0.45});
    const signFaceF = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.48), signMat);
    signFaceF.position.set(-0.64, -0.34, 0.055);
    const signFaceB = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.48), signMat);
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

    addInteractionProxy(
      petShop,
      [4.5, 5.2, 3.8],
      2.3,
      {
        kind: 'zone',
        zone: 'petshop' as ZoneId,
        tx: TOWN_ZONE_ENTRANCES.petshop.tx,
        tz: TOWN_ZONE_ENTRANCES.petshop.tz,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'petshop', x: PET_X, z: PET_Z, hw: 2.85, hd: 2.45, rotY: 0});
    mergeStaticGroupByMaterial(petShop);
    group.add(petShop);
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

    // East-West Main Trail (z = 0)
    addSteppingTrail(-35.5, 0, -8.8, 0);
    addSteppingTrail(8.8, 0, 35.5, 0);

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
  const oakTrees: [number, number, number, boolean?, number?][] = [
    [-13.5, -5.8, 1.14, true, 0.78],
    [13.8, -5.8, 1.16, true, 2.36],
    [-13.8, 6.2, 1.15, true, -0.78],
    [13.8, 6.2, 1.15, true, -2.36],
    [-10.2, 17.5, 1.12, true, 0.2],
    [10.5, 17.5, 1.14, true, Math.PI - 0.2],
    [9.6, -24.4, 1.12, true, -0.55],
    [-44.5, -18.5, 1.24, true, 0.5],
    [51.5, -18.5, 1.24, true, 2.6],
    [-44.5, 16.5, 1.22, true, -0.45],
    [45.0, 16.5, 1.24, true, -2.5],
    [-37.5, 36.0, 1.2, true, 0.7],
    [36.5, 35.5, 1.22, true, 2.45],
    [-8.8, 56.5, 1.24, true, -1.2],
    [12.8, 53.5, 1.24, true, -2.0],
    [-56.0, -4.5, 1.28, true, 0.1],
    [56.5, -4.8, 1.26, true, Math.PI - 0.1],
    [-55.0, 29.5, 1.26, true, -0.3],
    [55.5, 29.0, 1.28, true, -Math.PI + 0.3],
    [-40.5, 59.5, 1.26, true, 0.9],
    [40.5, 55.5, 1.26, true, 2.2],
    [-25.5, 48.0, 1.22, true, 0.4],
    [25.5, 48.0, 1.24, true, 2.7],
    [-62.0, -34.0, 1.28, true, 0.5],
    [62.5, -34.5, 1.26, true, 2.6],
    [-60.5, 42.0, 1.24, true, -0.5],
    [60.5, 41.5, 1.24, true, -2.5],
    [-22.0, 62.5, 1.26, true, 1.1],
    [22.5, 61.5, 1.28, true, 2.0],
  ];

  const oakTrunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, oakTrees.length);
  const oakLowerIM = new THREE.InstancedMesh(lowerCanopyGeo, lowerLeafMat, oakTrees.length);
  const oakUpperIM = new THREE.InstancedMesh(upperCanopyGeo, upperLeafMat, oakTrees.length);

  const oakLowerPalette = ['#4E9756', '#56A25E', '#488E50', '#5CA863'];
  const oakUpperPalette = ['#6BBC73', '#75C67D', '#64B46C', '#7ECD85'];

  const treeLanternSpots: {x: number; y: number; z: number; rotY: number; scale: number}[] = [];
  const treeNestMatrices: THREE.Matrix4[] = [];
  const treeBerryRecords: {mat: THREE.Matrix4; color: string}[] = [];
  const berryColors = ['#E94E65', '#F26B82', '#F7A83B'];

  oakTrees.forEach(([tx, tz, ts, hasLantern, lanternAng], i) => {
    const gy = getTownGroundHeight(tx, tz) - 0.04;
    const rotY = (i * 1.41) % (Math.PI * 2);
    _instDummy.position.set(tx, gy, tz);
    _instDummy.rotation.set(0, rotY, 0);
    _instDummy.scale.setScalar(ts);
    _instDummy.updateMatrix();
    oakTrunkIM.setMatrixAt(i, _instDummy.matrix);
    oakLowerIM.setMatrixAt(i, _instDummy.matrix);
    oakUpperIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(oakLowerPalette[i % oakLowerPalette.length]);
    oakLowerIM.setColorAt(i, _instColor);
    _instColor.set(oakUpperPalette[i % oakUpperPalette.length]);
    oakUpperIM.setColorAt(i, _instColor);

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
  oakTrunkIM.instanceMatrix.needsUpdate = true;
  oakLowerIM.instanceMatrix.needsUpdate = true;
  oakUpperIM.instanceMatrix.needsUpdate = true;
  if (oakLowerIM.instanceColor) oakLowerIM.instanceColor.needsUpdate = true;
  if (oakUpperIM.instanceColor) oakUpperIM.instanceColor.needsUpdate = true;
  oakTrunkIM.computeBoundingSphere();
  oakLowerIM.computeBoundingSphere();
  oakUpperIM.computeBoundingSphere();
  group.add(oakTrunkIM, oakLowerIM, oakUpperIM);

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

  const branchedTrees: [number, number, number, boolean?, number?][] = [
    [-8.2, -9.2, 1.1, true, -0.4],
    [8.4, -9.2, 1.12, true, -Math.PI + 0.4],
    [-8.2, 31.5, 1.14, true, 0.3],
    [8.4, 31.5, 1.12, true, Math.PI - 0.3],
    [19.4, -18.8, 1.1, true, 2.55],
    [-18.8, 6.8, 1.14, true, -0.35],
    [18.8, 6.8, 1.14, true, -2.8],
    [-42.5, -5.2, 1.2, true, 0.25],
    [43.0, -5.5, 1.2, true, Math.PI - 0.25],
    [-42.0, 29.5, 1.22, true, -0.4],
    [42.0, 29.5, 1.22, true, -2.7],
    [-27.5, -34.0, 1.24, true, -0.6],
    [27.5, -33.5, 1.24, true, -2.5],
    [-60.0, 12.0, 1.26, true, 0.15],
    [60.5, 11.5, 1.26, true, Math.PI - 0.15],
    [-48.5, -36.0, 1.28, true, -0.65],
    [49.0, -36.5, 1.28, true, -2.45],
    [-33.5, 18.0, 1.18, true, 0.3],
    [34.0, 18.0, 1.18, true, 2.8],
    [-52.0, 56.0, 1.24, true, 0.5],
    [52.5, 55.5, 1.24, true, 2.6],
    [-18.5, -48.5, 1.22, true, -0.7],
    [18.5, -48.5, 1.22, true, -2.4],
  ];

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
    group.add(treeBerryIM);
  }

  // Under-Canopy Hanging Tree Lanterns (hooked onto trees across central + outer perimeter + soft warm ground pools)
  let treeLampHaloIM: THREE.InstancedMesh | null = null;
  let treeLampPoolIM: THREE.InstancedMesh | null = null;
  const ambientLanternLights: THREE.PointLight[] = [];
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
    const treeLampBulbGeo = new THREE.SphereGeometry(0.105, 10, 8);
    treeLampBulbGeo.translate(0.44, -0.27, 0);
    const treeLampHaloGeo = new THREE.SphereGeometry(0.42, 8, 6);
    treeLampHaloGeo.translate(0.44, -0.27, 0);

    const treeLampPoolGeo = new THREE.PlaneGeometry(4.2, 4.2);
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
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
    group.add(treeLampBracketIM, treeLampBulbIM, treeLampHaloIM, treeLampPoolIM);

    // 6 softly distributed warm PointLights positioned directly beneath outer & mid tree lanterns
    const districtLanternLightPos: [number, number][] = [
      [-44.5, -18.5],
      [51.5, -18.5],
      [-44.5, 16.5],
      [45.0, 16.5],
      [-37.5, 36.0],
      [36.5, 35.5],
    ];
    districtLanternLightPos.forEach(([lx, lz]) => {
      const ly = getTownGroundHeight(lx, lz) + 2.35;
      const pl = new THREE.PointLight('#FFB85E', 0, 26, 1.28);
      pl.position.set(lx, ly, lz);
      pl.visible = false;
      group.add(pl);
      ambientLanternLights.push(pl);
    });
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

  const pineCoords: [number, number, number][] = [
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

  // Outer Scenic Evergreen Ring far outside walkable zone
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const rx = Math.cos(a) * 92 + Math.sin(a * 3) * 6;
    const rz = -10 + Math.sin(a) * 98 + Math.cos(a * 2) * 6;
    const s = 1.42 + (i % 5) * 0.1;
    pineCoords.push([rx, rz, s]);
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

    if (px >= -82 && px <= 82 && pz >= -98 && pz <= 78) {
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
  group.add(petalIM);

  // ========== 5. SMALL ORNAMENTAL AQUATIC POND, INTERACTIVE OUTDOOR ZONE, FLOWER BEDS & RICH FLORA ==========
  // 5A. Small Scenic Ornamental Pond with Moss, Algae & Aquatic Reeds (Ao nhỏ có cây thủy sinh, rong rêu tại x=13.8, z=13.8)
  {
    const MINI_POND_X = 13.8;
    const MINI_POND_Z = 13.8;
    const miniPond = new THREE.Group();
    miniPond.position.set(MINI_POND_X, 0.02, MINI_POND_Z);

    const evalMiniPondR = (th: number) =>
      2.65 + 0.36 * Math.cos(th * 2 + 0.4) + 0.22 * Math.sin(th * 3 - 0.5);

    const pondShape = new THREE.Shape();
    const MP_SEGS = 32;
    for (let i = 0; i <= MP_SEGS; i++) {
      const th = (i / MP_SEGS) * Math.PI * 2;
      const r = evalMiniPondR(th);
      const px = Math.cos(th) * r;
      const py = -Math.sin(th) * r;
      if (i === 0) pondShape.moveTo(px, py);
      else pondShape.lineTo(px, py);
    }

    const pondBedGeo = new THREE.ShapeGeometry(pondShape, 20);
    pondBedGeo.rotateX(-Math.PI / 2);
    const pondBedMesh = new THREE.Mesh(pondBedGeo, getMat('#28574A', 0.92));
    pondBedMesh.position.y = 0.015;

    const pondWaterGeo = new THREE.ShapeGeometry(pondShape, 20);
    pondWaterGeo.rotateX(-Math.PI / 2);
    const miniPondWaterMat = new THREE.MeshPhysicalMaterial({
      color: '#45B8D4',
      roughness: 0.1,
      metalness: 0.04,
      clearcoat: 0.85,
      transparent: true,
      opacity: 0.74,
    });
    const pondWaterMesh = new THREE.Mesh(pondWaterGeo, miniPondWaterMat);
    pondWaterMesh.position.y = 0.075;
    miniPond.add(pondBedMesh, pondWaterMesh);

    // Underwater & bankside moss/algae cushions (Rong rêu)
    const mossMat = getMat('#3D7F44', 0.88);
    const algaeMat = getMat('#2F6B3A', 0.9);
    for (let m = 0; m < 12; m++) {
      const th = (m / 12) * Math.PI * 2 + 0.25;
      const rad = evalMiniPondR(th) * (0.45 + (m % 3) * 0.16);
      const mossPatch = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + (m % 3) * 0.09, 7, 5),
        m % 2 === 0 ? mossMat : algaeMat,
      );
      mossPatch.scale.set(1.4, 0.18, 1.15);
      mossPatch.position.set(Math.cos(th) * rad, 0.025, Math.sin(th) * rad);
      miniPond.add(mossPatch);
    }

    // Natural mossy stone rim (18 stones around the small pond)
    const stoneRimMat = getMat('#8E99A2', 0.84);
    for (let s = 0; s < 18; s++) {
      const th = (s / 18) * Math.PI * 2;
      const rad = evalMiniPondR(th) * 0.98;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (s % 3) * 0.09, 0), stoneRimMat);
      rock.scale.set(1.25, 0.56, 1.05);
      rock.position.set(Math.cos(th) * rad, 0.12, Math.sin(th) * rad);
      rock.rotation.y = th + s * 0.5;
      miniPond.add(rock);
      if (s % 3 === 0) {
        const capMoss = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), mossMat);
        capMoss.scale.set(1.1, 0.35, 0.95);
        capMoss.position.set(Math.cos(th) * rad, 0.24, Math.sin(th) * rad);
        miniPond.add(capMoss);
      }
    }

    // Swaying aquatic cattails & reed clusters (Cây thủy sinh ven ao)
    const reedLeafMat = getMat('#4E9A54', 0.72);
    const cattailHeadMat = getMat('#784A29', 0.82);
    [0.45, 1.25, 2.35, 3.4, 4.45, 5.5].forEach((th, idx) => {
      const rad = evalMiniPondR(th) * 0.86;
      const clump = new THREE.Group();
      clump.position.set(Math.cos(th) * rad, 0.04, Math.sin(th) * rad);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.68 + b * 0.12, 4), reedLeafMat);
        blade.position.set((b - 1.5) * 0.07, 0.34, ((b % 2) - 0.5) * 0.06);
        blade.rotation.set((b % 2 === 0 ? 0.14 : -0.12), b * 0.9, (b - 1.5) * 0.11);
        clump.add(blade);
      }
      if (idx % 2 === 0) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.92, 5), reedLeafMat);
        stalk.position.y = 0.46;
        const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.18, 5, 7), cattailHeadMat);
        head.position.y = 0.84;
        clump.add(stalk, head);
      }
      miniPond.add(clump);
    });

    // Floating Lily Pads & Pastel Lotus Blooms
    const padMat = getMat('#5FB860', 0.66);
    const lotusMat = glossyClayMat('#FFB7C9', 0.32);
    [
      [-0.75, -0.45, 0.34, true],
      [0.65, -0.68, 0.28, false],
      [-0.35, 0.85, 0.31, true],
      [0.85, 0.52, 0.26, false],
    ].forEach(([lx, lz, lr, hasFlower], i) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(lr as number, lr as number, 0.025, 12, 1, false, 0, Math.PI * 1.82), padMat);
      pad.position.set(lx as number, 0.085, lz as number);
      pad.rotation.y = i * 1.4;
      miniPond.add(pad);
      if (hasFlower) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), lotusMat);
        lotus.scale.set(1.15, 0.72, 1.15);
        lotus.position.set(lx as number, 0.13, lz as number);
        miniPond.add(lotus);
      }
    });

    colliders.push({type: 'circle', id: 'mini_pond', x: MINI_POND_X, z: MINI_POND_Z, r: 2.95});
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
      new THREE.MeshBasicMaterial({color: '#FF7B29', transparent: true, opacity: 0.92}),
    );
    campfireFlameA.position.y = 0.36;
    campfireFlameB = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.44, 6),
      new THREE.MeshBasicMaterial({color: '#FFE066', transparent: true, opacity: 0.95}),
    );
    campfireFlameB.position.set(0.04, 0.32, -0.03);
    campfireGlowMat = new THREE.MeshBasicMaterial({
      map: warmGlowTex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const campGlowPool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), campfireGlowMat);
    campGlowPool.rotation.x = -Math.PI / 2;
    campGlowPool.position.y = 0.035;
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
        bevelSegments: 2,
        curveSegments: 28,
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
    group.add(bedFoliageIM, bedBloomIM, bedCenterIM);
  }

  // B. Small & Medium Flowering Bushes (Bụi hoa nhỏ & vừa phủ khắp khu trung tâm & vùng ngoài)
  const bushCoords: [number, number, string, number?][] = [
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
    [-46.0, 5.5, '#D0A6FF', 0.94],
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
    [-60.0, 3.0, '#8ECAE6', 0.98],
    [60.5, 2.5, '#FF9EBB', 0.98],
  ];
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
  const bigBushCoords: [number, number, number, string][] = [
    [-16.8, -16.8, 1.15, '#4CA456'],
    [17.2, -16.6, 1.18, '#55AF5E'],
    [-18.0, 20.5, 1.16, '#489C52'],
    [18.2, 20.8, 1.18, '#5BB464'],
    [-40.5, -10.5, 1.32, '#4E9F57'],
    [40.8, -10.2, 1.28, '#59B061'],
    [-40.8, 26.2, 1.3, '#4A9C53'],
    [41.0, 26.0, 1.34, '#56AD5E'],
    [-33.5, 48.5, 1.25, '#4B9F55'],
    [-12.5, 42.5, 1.14, '#54AA5D'],
    [15.0, 48.2, 1.26, '#4E9F57'],
    [32.5, 45.8, 1.3, '#57AE60'],
    [-22.5, -38.5, 1.35, '#4A9D54'],
    [22.8, -38.0, 1.34, '#54AC5D'],
    [-51.0, 4.5, 1.38, '#4D9E56'],
    [51.5, 4.0, 1.36, '#58AF61'],
    [-52.0, -25.0, 1.4, '#489852'],
    [52.5, -24.5, 1.38, '#53A95B'],
    [-29.0, 56.5, 1.32, '#4CA256'],
    [29.5, 52.0, 1.34, '#55AB5E'],
    [-8.5, -32.5, 1.22, '#4E9F57'],
    [8.8, -32.5, 1.24, '#56AE5E'],
    // Outer ring lush bushes
    [-58.0, -8.5, 1.36, '#4B9E54'],
    [58.5, -8.0, 1.36, '#56AF5E'],
    [-56.5, 22.0, 1.38, '#489A51'],
    [57.0, 21.5, 1.38, '#53A95B'],
    [-45.0, 52.0, 1.34, '#4E9F57'],
    [45.5, 51.5, 1.34, '#58AF61'],
    [-14.5, 60.5, 1.32, '#4CA256'],
    [15.0, 60.0, 1.32, '#55AB5E'],
    [-56.0, -44.0, 1.4, '#4A9D54'],
    [56.5, -43.5, 1.4, '#54AC5D'],
  ];
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
  group.add(bigBushIM);

  // Static 5-petal wildflower clusters scattered generously across inner & outer meadows (3 draw calls total)
  const FLOWER_COUNT = 560;
  const fStem1 = new THREE.CylinderGeometry(0.018, 0.024, 0.24, 5);
  fStem1.translate(0, 0.12, 0);
  const fStem2 = new THREE.CylinderGeometry(0.014, 0.02, 0.18, 5);
  fStem2.rotateZ(-0.28);
  fStem2.translate(0.06, 0.09, 0.04);
  const fLeafA = new THREE.SphereGeometry(0.075, 5, 4);
  fLeafA.scale(0.55, 0.22, 1.45);
  fLeafA.rotateX(-0.35);
  fLeafA.rotateY(0.6);
  fLeafA.translate(-0.05, 0.05, 0.06);
  const fLeafB = new THREE.SphereGeometry(0.072, 5, 4);
  fLeafB.scale(0.55, 0.22, 1.45);
  fLeafB.rotateX(-0.35);
  fLeafB.rotateY(-0.8);
  fLeafB.translate(0.06, 0.05, -0.05);
  const flowerBaseGeo = mergeParts([fStem1, fStem2, fLeafA, fLeafB]);
  const flowerBaseMat = getMat('#5CB662', 0.78);
  const flowerBaseIM = new THREE.InstancedMesh(flowerBaseGeo, flowerBaseMat, FLOWER_COUNT);

  const wfPetals: THREE.BufferGeometry[] = [];
  const wfCenters: THREE.BufferGeometry[] = [];
  append5PetalFlower(wfPetals, wfCenters, 0, 0.24, 0, 1.08, 0.14, 0, 0.2);
  append5PetalFlower(wfPetals, wfCenters, 0.09, 0.17, 0.05, 0.86, 0.22, -0.26, 1.1);
  const flowerTopGeo = mergeParts(wfPetals);
  const flowerCenterGeo = mergeParts(wfCenters);
  const flowerTopMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.48});
  const flowerCenterMat = getMat('#FFD24C', 0.42);
  const flowerTopIM = new THREE.InstancedMesh(flowerTopGeo, flowerTopMat, FLOWER_COUNT);
  const flowerCenterIM = new THREE.InstancedMesh(flowerCenterGeo, flowerCenterMat, FLOWER_COUNT);

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
    if (Math.hypot(px - 13.8, pz - 13.8) < 3.55) return true;
    if (Math.hypot(px - 14.5, pz + 21.0) < 4.6) return true;
    if (Math.hypot(px + 32, pz + 22.5) < 6.5) return true;
    if (Math.hypot(px - 32, pz + 22.5) < 6.5) return true;
    if (Math.hypot(px - 42.8, pz + 23.2) < 3.6) return true;
    if (Math.hypot(px + 32, pz - 18.0) < 6.2) return true;
    if (Math.hypot(px - 32, pz - 17.5) < 6.6) return true;
    if (Math.hypot(px - 24, pz - 39.5) < 4.5) return true;
    if (Math.hypot(px - 11.8, pz - 38.6) < 4.4) return true;
    if (Math.hypot(px + 16.8, pz - 37.2) < 3.4) return true;
    return false;
  };

  const wildflowerPalette = ['#FF9EAA', '#A8E0FF', '#D5B8FF', '#FFFFFF', '#FFB48A'];
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
    flowerBaseIM.setMatrixAt(placedFlowers, _instDummy.matrix);
    flowerTopIM.setMatrixAt(placedFlowers, _instDummy.matrix);
    flowerCenterIM.setMatrixAt(placedFlowers, _instDummy.matrix);
    _instColor.set(wildflowerPalette[placedFlowers % wildflowerPalette.length]);
    flowerTopIM.setColorAt(placedFlowers, _instColor);
    placedFlowers++;
  }
  flowerBaseIM.count = placedFlowers;
  flowerTopIM.count = placedFlowers;
  flowerCenterIM.count = placedFlowers;
  flowerBaseIM.instanceMatrix.needsUpdate = true;
  flowerTopIM.instanceMatrix.needsUpdate = true;
  flowerCenterIM.instanceMatrix.needsUpdate = true;
  if (flowerTopIM.instanceColor) flowerTopIM.instanceColor.needsUpdate = true;
  flowerBaseIM.computeBoundingSphere();
  flowerTopIM.computeBoundingSphere();
  flowerCenterIM.computeBoundingSphere();
  group.add(flowerBaseIM, flowerTopIM, flowerCenterIM);

  // D. Sculpted Layered Meadow Grass Clusters (Cỏ vừa & cỏ cao mượt mà phủ đều ra rìa map)
  const TUFT_COUNT = 720;
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
  const tuftIM = new THREE.InstancedMesh(tuftGeo, tuftMat, TUFT_COUNT);
  const tuftPalette = ['#5EB662', '#68C16B', '#54AA58', '#73C972'];
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
    tuftIM.setMatrixAt(placedTufts, _instDummy.matrix);
    _instColor.set(tuftPalette[placedTufts % tuftPalette.length]);
    tuftIM.setColorAt(placedTufts, _instColor);
    placedTufts++;
  }
  tuftIM.count = placedTufts;
  tuftIM.instanceMatrix.needsUpdate = true;
  if (tuftIM.instanceColor) tuftIM.instanceColor.needsUpdate = true;
  tuftIM.computeBoundingSphere();
  group.add(tuftIM);

  // Tall Lush Meadow Grass Clumps (Cỏ cao rậm tự nhiên vùng ngoài)
  const TALL_GRASS_COUNT = 420;
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
  const tallGrassIM = new THREE.InstancedMesh(tallGrassGeo, tallGrassMat, TALL_GRASS_COUNT);
  const tallGrassPalette = ['#50A255', '#5CB060', '#48964D', '#67BA6A', '#72C474'];
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
    tallGrassIM.setMatrixAt(placedTall, _instDummy.matrix);
    _instColor.set(tallGrassPalette[placedTall % tallGrassPalette.length]);
    tallGrassIM.setColorAt(placedTall, _instColor);
    placedTall++;
  }
  tallGrassIM.count = placedTall;
  tallGrassIM.instanceMatrix.needsUpdate = true;
  if (tallGrassIM.instanceColor) tallGrassIM.instanceColor.needsUpdate = true;
  tallGrassIM.computeBoundingSphere();
  group.add(tallGrassIM);

  // Small Pebbles & Large Mossy Boulder Clusters (Tảng đá lớn bé khắp đường mòn, đồi & vùng rìa)
  const smallRockCoords: [number, number, number][] = [
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
    [-53.5, -2.5, 0.56],
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
  ];
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

  const largeRockCoords: [number, number, number][] = [
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
    [-59.5, 7.5, 1.16],
    [60.0, 7.0, 1.16],
    [-58.0, -24.5, 1.2],
    [58.5, -24.0, 1.18],
    [-25.5, 62.5, 1.14],
    [26.0, 62.0, 1.16],
    [-46.0, -49.5, 1.22],
    [46.5, -49.0, 1.2],
  ];
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
  group.add(mushStemIM, mushCapIM);

  // 2. Mossy Fallen Logs (Khúc gỗ mục phủ rêu ngoài đồng cỏ & bìa rừng — điểm đậu côn trùng)
  const fallenLogCoords: [number, number, number][] = [
    [-46.5, 16.5, 0.4],
    [47.0, 16.0, -0.5],
    [-42.0, -28.0, 1.1],
    [43.0, -27.5, -1.0],
    [-26.5, 51.0, 0.25],
    [27.0, 50.5, -0.3],
    [-55.5, -1.5, 1.3],
    [56.0, -1.0, -1.2],
    [-16.0, 48.0, 0.8],
    [16.5, 48.5, -0.75],
    [-49.5, 40.5, 0.6],
    [50.0, 40.0, -0.6],
  ];
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
    [-16.0, 52.5, 0.15],
    [-13.0, 52.9, 0.15],
    [13.0, 52.9, -0.15],
    [16.0, 52.5, -0.15],
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
  group.add(woodenFenceIM);

  // 4. Water Lily Pads & Floating Lotus Blossoms on Main Lake Edge & Mini Pond (Lá sen & hoa súng mặt nước)
  const lilySpots: [number, number, number][] = [];
  for (let i = 0; i < 20; i++) {
    const th = (i / 20) * Math.PI * 2 + 0.14;
    if (Math.abs(Math.sin(th - 0.5)) < 0.18 && Math.cos(th - 0.5) < 0) continue; // skip fishing pier
    const r = getLakeShoreRadius(th) - 1.05 - (i % 3) * 0.45;
    lilySpots.push([LAKE_CENTER.x + Math.cos(th) * r, TOWN_LAKE_WATER_Y + 0.015, LAKE_CENTER.z + Math.sin(th) * r]);
  }
  for (let i = 0; i < 6; i++) {
    const th = (i / 6) * Math.PI * 2 + 0.4;
    const r = 1.45 + (i % 2) * 0.35;
    lilySpots.push([13.8 + Math.cos(th) * r, 0.102, 13.8 + Math.sin(th) * r]);
  }
  const padGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.024, 12, 1, false, 0.22, Math.PI * 1.86);
  const lilyPadIM = new THREE.InstancedMesh(padGeo, getMat('#4E9D57', 0.65), lilySpots.length);

  const lilyPetalParts: THREE.BufferGeometry[] = [];
  const lilyCenterParts: THREE.BufferGeometry[] = [];
  append5PetalFlower(lilyPetalParts, lilyCenterParts, 0.04, 0.035, 0.02, 1.35, 0.05, 0.04, 0);
  const lilyBloomGeo = mergeParts(lilyPetalParts);
  const lilyCenterGeo = mergeParts(lilyCenterParts);
  const lilyBloomMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.42});
  const lilyBloomIM = new THREE.InstancedMesh(lilyBloomGeo, lilyBloomMat, lilySpots.length);
  const lilyCenterIM = new THREE.InstancedMesh(lilyCenterGeo, getMat('#FFD24C', 0.38), lilySpots.length);
  const lilyColors = ['#FFA8C2', '#FFFFFF', '#FFB8D0', '#FFE3F0'];

  lilySpots.forEach(([lx, ly, lz], i) => {
    _instDummy.position.set(lx, ly, lz);
    _instDummy.rotation.set(0, (i * 1.9) % (Math.PI * 2), 0);
    _instDummy.scale.setScalar(0.82 + (i % 3) * 0.18);
    _instDummy.updateMatrix();
    lilyPadIM.setMatrixAt(i, _instDummy.matrix);
    lilyBloomIM.setMatrixAt(i, _instDummy.matrix);
    lilyCenterIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(lilyColors[i % lilyColors.length]);
    lilyBloomIM.setColorAt(i, _instColor);
  });
  lilyPadIM.instanceMatrix.needsUpdate = true;
  lilyBloomIM.instanceMatrix.needsUpdate = true;
  lilyCenterIM.instanceMatrix.needsUpdate = true;
  if (lilyBloomIM.instanceColor) lilyBloomIM.instanceColor.needsUpdate = true;
  lilyPadIM.computeBoundingSphere();
  lilyBloomIM.computeBoundingSphere();
  lilyCenterIM.computeBoundingSphere();
  group.add(lilyPadIM, lilyBloomIM, lilyCenterIM);

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
  group.add(signpostIM);

  // Town Insect Habitats & Live 3D Bug Manager (Côn trùng khắp trung tâm lẫn vùng ngoài)
  const insectAnchors: InsectAnchor[] = [];
  bigFlowerCoords.forEach(([fx, fz]) => {
    insectAnchors.push({x: fx, y: getTownGroundHeight(fx, fz) + 0.34, z: fz, habitat: 'flower'});
  });
  bushCoords.forEach(([bx, bz]) => {
    insectAnchors.push({x: bx, y: getTownGroundHeight(bx, bz) + 0.44, z: bz, habitat: 'bush'});
  });
  bigBushCoords.forEach(([bx, bz]) => {
    insectAnchors.push({x: bx, y: getTownGroundHeight(bx, bz) + 0.56, z: bz, habitat: 'bush'});
  });
  oakTrees.forEach(([tx, tz]) => {
    insectAnchors.push({x: tx + 0.42, y: getTownGroundHeight(tx, tz) + 0.86, z: tz + 0.25, habitat: 'tree'});
  });
  branchedTrees.forEach(([tx, tz]) => {
    insectAnchors.push({x: tx - 0.35, y: getTownGroundHeight(tx, tz) + 0.82, z: tz + 0.3, habitat: 'tree'});
  });
  fallenLogCoords.forEach(([lx, lz]) => {
    insectAnchors.push({x: lx, y: getTownGroundHeight(lx, lz) + 0.45, z: lz, habitat: 'tree'});
  });
  smallRockCoords.forEach(([rx, rz]) => {
    insectAnchors.push({x: rx, y: getTownGroundHeight(rx, rz) + 0.35, z: rz, habitat: 'rock'});
  });
  largeRockCoords.forEach(([rx, rz]) => {
    insectAnchors.push({x: rx, y: getTownGroundHeight(rx, rz) + 0.92, z: rz, habitat: 'rock'});
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sr = getLakeShoreRadius(a) + 0.85;
    const wx = LAKE_CENTER.x + Math.cos(a) * sr;
    const wz = LAKE_CENTER.z + Math.sin(a) * sr;
    insectAnchors.push({x: wx, y: 0.25, z: wz, habitat: 'water_edge'});
  }
  const insectManager = new TownInsectManager(group, insectAnchors);

  // Track last applied timeOfDay so emissive updates only run when changed
  let lastAppliedTod: TimeOfDay | null = null;
  let currentTod: TimeOfDay = 'morning';
  const _swayEuler = new THREE.Euler();
  const _swayRotQ = new THREE.Quaternion();

  // Precomputed bounding spheres for fast zero-allocation frustum culling
  const _fountainSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 3.6);
  const _smokeSphere = new THREE.Sphere(smokeOriginWorld.clone().add(new THREE.Vector3(0, 1.4, 0)), 3.8);
  const _windmillSphere = new THREE.Sphere(new THREE.Vector3(42.8, 5.8, -23.2), 5.2);
  const _petalsSphere = new THREE.Sphere(new THREE.Vector3(patioCenter.x - 1.6, 2.5, patioCenter.z - 1.1), 5.4);
  const _reedsSphere = new THREE.Sphere(new THREE.Vector3(LAKE_CENTER.x, 0.5, LAKE_CENTER.z), 12.5);
  const _fireflySphere = new THREE.Sphere(new THREE.Vector3(LAKE_CENTER.x, 1.0, LAKE_CENTER.z), 12.0);
  const _campfireSphere = new THREE.Sphere(new THREE.Vector3(16.6, 0.6, -22.2), 2.8);
  const _koiSphere = new THREE.Sphere(new THREE.Vector3(-16.8, 1.2, 37.2), 3.2);
  const _lightSphere = new THREE.Sphere();
  const _patioLightPos = new THREE.Vector3(patioCenter.x, 3.2, patioCenter.z);

  let useExternalFishingFrame = false;
  let prevTownElapsed = 0;

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

  const update = (elapsed: number, timeOfDay: TimeOfDay, frustum?: THREE.Frustum) => {
    const dt = prevTownElapsed > 0 ? Math.min(0.05, elapsed - prevTownElapsed) : 0.016;
    prevTownElapsed = elapsed;

    if (timeOfDay !== lastAppliedTod) {
      lastAppliedTod = timeOfDay;
      currentTod = timeOfDay;
      const isNight = timeOfDay === 'night';
      const isSunset = timeOfDay === 'sunset';
      const winEmissive = isNight ? 1.35 : isSunset ? 0.68 : 0.08;
      const bulbEmissive = isNight ? 2.15 : isSunset ? 1.0 : 0.14;

      windowMeshes.forEach((m) => {
        m.emissiveIntensity = winEmissive;
      });
      lampBulbs.forEach((m) => {
        m.emissiveIntensity = m.userData?.isArcadeNeon
          ? isNight
            ? 0.62
            : isSunset
              ? 0.42
              : 0.24
          : bulbEmissive;
      });
      if (treeLampHaloIM) {
        treeLampHaloIM.visible = isNight || isSunset;
        (treeLampHaloIM.material as THREE.MeshBasicMaterial).opacity = isNight ? 0.26 : 0.12;
      }
      if (treeLampPoolIM) {
        treeLampPoolIM.visible = isNight || isSunset;
        (treeLampPoolIM.material as THREE.MeshBasicMaterial).opacity = isNight ? 0.28 : 0.12;
      }
      moonGroup.visible = isNight;
      starPoints.visible = isNight;
      const showLights = isNight || isSunset;
      ambientLanternLights.forEach((pl) => {
        pl.visible = showLights;
        pl.intensity = isNight ? 2.85 : isSunset ? 1.1 : 0;
      });
      if (stringBulbMat) {
        stringBulbMat.emissiveIntensity = isNight ? 2.8 : isSunset ? 1.4 : 0.16;
      }
      if (patioNightLight) {
        patioNightLight.visible = showLights;
        patioNightLight.intensity = isNight ? 5.2 : isSunset ? 2.2 : 0;
      }
      if (plazaNightLight) {
        plazaNightLight.visible = showLights;
        plazaNightLight.intensity = isNight ? 3.8 : isSunset ? 1.6 : 0;
      }
      if (lakePierNightLight) {
        lakePierNightLight.visible = showLights;
        lakePierNightLight.intensity = isNight ? 3.4 : isSunset ? 1.5 : 0;
      }
      if (homePorchNightLight) {
        homePorchNightLight.visible = showLights;
        homePorchNightLight.intensity = isNight ? 2.6 : isSunset ? 1.15 : 0;
      }
      if (lakeWaterMat) {
        lakeWaterMat.color.set(isNight ? '#1B4B6E' : isSunset ? '#2F87AC' : '#3BB0D8');
      }
      if (fireflyCoreIM && fireflyHaloIM) {
        const showFireflies = isNight || isSunset;
        fireflyCoreIM.visible = showFireflies;
        fireflyHaloIM.visible = showFireflies;
      }
    }

    // Dynamic PointLight frustum culling at Sunset/Night to save fragment shader CPU/GPU work
    const nightOrSunset = currentTod === 'night' || currentTod === 'sunset';
    if (nightOrSunset && frustum) {
      for (let i = 0; i < ambientLanternLights.length; i++) {
        const pl = ambientLanternLights[i];
        _lightSphere.set(pl.position, pl.distance);
        pl.visible = frustum.intersectsSphere(_lightSphere);
      }
      if (patioNightLight) {
        _lightSphere.set(_patioLightPos, patioNightLight.distance);
        patioNightLight.visible = frustum.intersectsSphere(_lightSphere);
      }
      _lightSphere.set(plazaNightLight.position, plazaNightLight.distance);
      plazaNightLight.visible = frustum.intersectsSphere(_lightSphere);
      if (lakePierNightLight) {
        _lightSphere.set(lakePierNightLight.position, lakePierNightLight.distance);
        lakePierNightLight.visible = frustum.intersectsSphere(_lightSphere);
      }
      _lightSphere.set(homePorchNightLight.position, homePorchNightLight.distance);
      homePorchNightLight.visible = frustum.intersectsSphere(_lightSphere);
    }

    // 1. Fountain spray (frustum-culled, zero allocations)
    if (!frustum || frustum.intersectsSphere(_fountainSphere)) {
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

    // 2. Gentle chimney smoke (frustum-culled, zero allocations)
    if (chimneySmokeMesh && (!frustum || frustum.intersectsSphere(_smokeSphere))) {
      for (let i = 0; i < SMOKE_COUNT; i++) {
        const t = (elapsed * 0.28 + i / SMOKE_COUNT) % 1;
        const sx = smokeOriginWorld.x + Math.sin(t * Math.PI * 2 + i) * 0.28 + t * 0.42;
        const sy = smokeOriginWorld.y + t * 2.8;
        const sz = smokeOriginWorld.z + Math.cos(t * Math.PI * 1.6 + i) * 0.2 - t * 0.25;
        const s = Math.sin(t * Math.PI) * (0.85 + t * 1.05);
        _smokeDummy.position.set(sx, sy, sz);
        _smokeDummy.scale.setScalar(Math.max(0.001, s));
        _smokeDummy.updateMatrix();
        chimneySmokeMesh.setMatrixAt(i, _smokeDummy.matrix);
      }
      chimneySmokeMesh.instanceMatrix.needsUpdate = true;
    }

    // 3. Spin Windmill Sails beside the Conservatory Greenhouse
    if (windmillSailHub && (!frustum || frustum.intersectsSphere(_windmillSphere))) {
      windmillSailHub.rotation.z = -elapsed * 0.55;
    }

    // 4. Drifting Sakura Petals over Tea Patio (frustum-culled, zero allocations)
    if (fallingPetalIM && (!frustum || frustum.intersectsSphere(_petalsSphere))) {
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

    // 5. Gentle Wind Sway on Lake Aquatic Grass / Reeds (frustum-culled, zero matrix decompositions!)
    if (reedClumpIM && reedClumpBaseTfs.length > 0 && (!frustum || frustum.intersectsSphere(_reedsSphere))) {
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

    // 6. Nighttime Fireflies (Đom Đóm) over the Sunken Lotus Lake
    if (
      fireflyCoreIM &&
      fireflyHaloIM &&
      nightOrSunset &&
      (!frustum || frustum.intersectsSphere(_fireflySphere))
    ) {
      const todFactor = currentTod === 'night' ? 1.0 : 0.45;
      for (let i = 0; i < FIREFLY_COUNT; i++) {
        const s = fireflySeeds[i];
        const t = elapsed * s.speed + s.phase;
        const fx = s.x + Math.sin(t) * s.rx;
        const fy = s.y + Math.sin(t * 1.35 + 1.2) * 0.24;
        const fz = s.z + Math.cos(t * 0.85) * s.rz;
        const pulse = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * s.blinkSpeed + s.phase))) * todFactor;
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
    if (campfireFlameA && campfireFlameB && campfireGlowMat && (!frustum || frustum.intersectsSphere(_campfireSphere))) {
      const fPulse = 0.9 + Math.sin(elapsed * 11) * 0.12 + Math.cos(elapsed * 17) * 0.06;
      campfireFlameA.scale.set(1, fPulse, 1);
      campfireFlameB.scale.set(1, 1.05 - (fPulse - 0.9) * 0.8, 1);
      campfireGlowMat.opacity = currentTod === 'night' ? 0.52 + Math.sin(elapsed * 8) * 0.08 : 0.26;
    }

    // 8. Fallback legacy lake bobber update if Play Together frame driver is idle
    if (lakeFishingVisuals && !useExternalFishingFrame) {
      lakeFishingVisuals.updateLegacy(elapsed);
    }
    // 9. Koi NPC gentle idle animation (frustum-culled)
    if (koiRig && (!frustum || frustum.intersectsSphere(_koiSphere))) {
      updateAvatarRigAnimation(koiRig, 'idle', elapsed, false);
    }
  };

  const dispose = () => {
    grassTex.dispose();
    hillTex.dispose();
    plazaStoneTex.dispose();
    signTex.dispose();
    koiSignTex.dispose();
    petShopSignTex.dispose();
    warmGlowTex.dispose();
    lakeFishingVisuals?.dispose();
    insectManager.dispose();
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
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
    updateInsects,
    tryCatchInsect,
    update,
    dispose,
  };
}
