import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TimeOfDay} from '../types/game';
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
  clayMat,
  createGrassTexture,
  createWaterfallTexture,
  createWoodPlankTexture,
  glossyClayMat,
  mergeStaticGroupByMaterial,
} from './materials';
import type {SubzoneUpdateContext, SubzoneWorld} from './subzonesBuilder';
import {buildWoodenRowboat, TownAnchor, WorldCollider} from './townBuilder';

export const ISLAND_WATER_Y = -0.35;
export const ISLAND_SWIM_MAX_R = 72.0;
export const ISLAND_TREEHOUSE_DECK_Y = 5.65;
export const ISLAND_PIER_DECK_Y = 0.48;
export const ISLAND_BALLOON_POS = {x: 13.5, z: -4.5};
export const ISLAND_BALLOON_INTERACT = {tx: 11.4, tz: -2.2};
export const ISLAND_PIER_INTERACT = {tx: 0, tz: 32.6};
export const ISLAND_PIER_DUCK_INTERACT = {tx: -0.85, tz: 31.8};
export const ISLAND_BOAT_INTERACT = {tx: 0.85, tz: 31.8};
export const ISLAND_BOAT_SPAWN = {x: 3.05, z: 32.0, rotY: 0.14};
export const ISLAND_SPAWN = {x: 10.6, z: -1.6, rotY: -Math.PI * 0.72};

export const ISLAND_TREEHOUSE_CENTER = {x: -7.5, z: -9.5};
export const ISLAND_LADDER_BOTTOM = {x: -7.5, z: -4.75};
export const ISLAND_LADDER_CLIMB_START = {x: -7.5, z: -4.36};
export const ISLAND_LADDER_CLIMB_END = {x: -7.5, z: -5.85};
export const ISLAND_LADDER_TOP = {x: -7.5, z: -6.92};
export const ISLAND_TREEHOUSE_DOOR = {x: -7.5, z: -8.15};

export const ISLAND_TREEHOUSE_BOUNDS = {
  minX: -11.05,
  maxX: -3.95,
  minZ: -12.35,
  maxZ: -6.45,
};

export function clampPointToIslandTreehouse(x: number, z: number): {x: number; z: number} {
  return {
    x: THREE.MathUtils.clamp(x, ISLAND_TREEHOUSE_BOUNDS.minX, ISLAND_TREEHOUSE_BOUNDS.maxX),
    z: THREE.MathUtils.clamp(z, ISLAND_TREEHOUSE_BOUNDS.minZ, ISLAND_TREEHOUSE_BOUNDS.maxZ),
  };
}

export const ISLAND_PIER_X_MIN = -1.58;
export const ISLAND_PIER_X_MAX = 1.58;
export const ISLAND_PIER_Z_MIN = 22.0;
export const ISLAND_PIER_Z_MAX = 33.8;

const STREAM_POINTS: [number, number][] = [
  [-0.8, -16.8],
  [2.5, -14.6],
  [6.5, -13.4],
  [11.5, -13.6],
  [16.5, -15.4],
  [21.8, -17.5],
];

const _instDummy = new THREE.Object3D();
const _instColor = new THREE.Color();

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mergeBufferParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((g) => {
    const out = g.index ? g.toNonIndexed() : g.clone();
    if (!out.attributes.normal) {
      out.computeVertexNormals();
    }
    for (const attrName of Object.keys(out.attributes)) {
      if (
        attrName !== 'position' &&
        attrName !== 'normal' &&
        attrName !== 'uv' &&
        attrName !== 'color'
      ) {
        out.deleteAttribute(attrName);
      }
    }
    return out;
  });

  if (nonIndexed.length > 1) {
    const allHaveUv = nonIndexed.every((g) => Boolean(g.attributes.uv));
    const allHaveColor = nonIndexed.every((g) => Boolean(g.attributes.color));
    for (const g of nonIndexed) {
      if (!allHaveUv && g.attributes.uv) g.deleteAttribute('uv');
      if (!allHaveColor && g.attributes.color) g.deleteAttribute('color');
    }
  }

  const merged = mergeGeometries(nonIndexed, false);
  parts.forEach((g) => g.dispose());
  nonIndexed.forEach((g) => g.dispose());
  if (!merged) {
    return new THREE.BufferGeometry();
  }
  return merged;
}

function createSculptedCragGeo(
  seed: number,
  sx: number,
  sy: number,
  sz: number,
  detail = 1,
): THREE.BufferGeometry {
  const base = new THREE.IcosahedronGeometry(1.0, detail);
  const nonIdx = base.index ? base.toNonIndexed() : base.clone();
  base.dispose();
  const p = nonIdx.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i);
    let vy = p.getY(i);
    const vz = p.getZ(i);
    const strata = Math.sin(vy * 5.2 + seed) * 0.08;
    const crag =
      Math.sin(vx * 3.4 + vz * 2.1 + seed) * 0.14 +
      Math.cos(vz * 3.8 - vx * 1.9 + seed * 1.7) * 0.12;
    if (vy > 0.38) vy = 0.38 + (vy - 0.38) * 0.52;
    const baseFlare = vy < -0.2 ? 1.14 : 1.0;
    const radScale = (1 + strata + crag) * baseFlare;
    p.setXYZ(i, vx * radScale * sx, vy * sy, vz * radScale * sz);
  }
  nonIdx.computeVertexNormals();
  return nonIdx;
}

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
    petal.rotateX(-0.22);
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

/**
 * Creates a smooth double-sided tapered curved leaf blade geometry pointing along +Z
 * with natural arching camber and gentle center fold (for banana trees and ferns).
 */
function createCurvedLeafBladeGeo(
  length: number,
  maxWidth: number,
  archY: number,
  dropY: number,
  vFold = 0.04,
): THREE.BufferGeometry {
  const segs = 5;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = t * length;
    const y = Math.sin(t * Math.PI) * archY - t * t * dropY;
    const widthProfile = Math.sin(Math.pow(t, 0.68) * Math.PI);
    const hw = Math.max(0.008, maxWidth * 0.5 * widthProfile);
    const edgeDrop = vFold * widthProfile;

    positions.push(-hw, y - edgeDrop, z);
    positions.push(0, y + 0.012, z);
    positions.push(hw, y - edgeDrop, z);
    uvs.push(0, t, 0.5, t, 1, t);
  }

  for (let i = 0; i < segs; i++) {
    const r0 = i * 3;
    const r1 = (i + 1) * 3;
    indices.push(r0, r1, r0 + 1, r0 + 1, r1, r1 + 1);
    indices.push(r0 + 1, r1 + 1, r0 + 2, r0 + 2, r1 + 1, r1 + 2);
    indices.push(r0, r0 + 1, r1, r0 + 1, r1 + 1, r1);
    indices.push(r0 + 1, r0 + 2, r1 + 1, r0 + 2, r1 + 2, r1 + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a plump, smooth 3D sculpted clay-style palm frond pointing along +Z
 * with a gentle botanical arch and rounded paddle silhouette (mat clay aesthetic).
 */
function createClayPalmFrondGeo(
  length: number,
  maxWidth: number,
  thickness: number,
  archHeight: number,
  droopEnd: number,
): THREE.BufferGeometry {
  const segs = 9;
  const ringPts = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = t * length;
    const centerY = Math.sin(t * Math.PI) * archHeight - t * t * droopEnd;

    // Smooth plump clay paddle profile: slim stem base -> full lush belly -> soft rounded tip
    const lobeProfile =
      t < 0.08
        ? 0.22 + (t / 0.08) * 0.28
        : Math.sin(Math.pow((t - 0.04) / 0.96, 0.72) * Math.PI);
    const clayWave = 1 + 0.06 * Math.sin(t * Math.PI * 5);
    const hw = Math.max(0.022, maxWidth * 0.5 * Math.max(0.12, lobeProfile) * clayWave);
    const ht = Math.max(0.014, thickness * 0.5 * (0.35 + 0.65 * Math.sin(Math.pow(t, 0.55) * Math.PI * 0.92)));

    // 6-vertex rounded elliptical cross-section with a soft pillowed upper spine
    const ring: [number, number][] = [
      [-hw, 0],
      [-hw * 0.45, ht * 1.12],
      [hw * 0.45, ht * 1.12],
      [hw, 0],
      [hw * 0.42, -ht * 0.85],
      [-hw * 0.42, -ht * 0.85],
    ];
    for (let k = 0; k < ringPts; k++) {
      positions.push(ring[k][0], centerY + ring[k][1], z);
      uvs.push(k / ringPts, t);
    }
  }

  for (let i = 0; i < segs; i++) {
    const r0 = i * ringPts;
    const r1 = (i + 1) * ringPts;
    for (let k = 0; k < ringPts; k++) {
      const kNext = (k + 1) % ringPts;
      indices.push(r0 + k, r0 + kNext, r1 + kNext);
      indices.push(r0 + k, r1 + kNext, r1 + k);
    }
  }

  // Stem & tip rounded cap centers so fronds are solid closed clay pieces
  const stemCenterIdx = positions.length / 3;
  positions.push(0, 0, -0.02);
  uvs.push(0.5, 0);
  for (let k = 0; k < ringPts; k++) {
    const kNext = (k + 1) % ringPts;
    indices.push(stemCenterIdx, kNext, k);
  }

  const tipCenterIdx = positions.length / 3;
  const endY = Math.sin(Math.PI) * archHeight - droopEnd;
  positions.push(0, endY, length + 0.04);
  uvs.push(0.5, 1);
  const lastRingStart = segs * ringPts;
  for (let k = 0; k < ringPts; k++) {
    const kNext = (k + 1) % ringPts;
    indices.push(tipCenterIdx, lastRingStart + k, lastRingStart + kNext);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds sculpted coconut palm instancing geometries in soft matte clay style ("đất nặn"):
 * - tapered S-curved ringed trunk
 * - plump, smooth 3D rounded clay palm fronds (no thin needle spikes!) + coconuts
 */
function createCoconutPalmGeometries() {
  const leanAngle = 0.3;
  const crownY = 5.05;
  const getTrunkPt = (t: number) => ({
    x: Math.sin(t * leanAngle * 1.55) * 1.38,
    y: t * crownY,
    z: Math.sin(t * Math.PI) * 0.22,
  });
  const crownPt = getTrunkPt(1.0);

  // Trunk root flare & 10 tapered bark segments with distinct palm ring collars
  const trunkParts: THREE.BufferGeometry[] = [];
  const ringParts: THREE.BufferGeometry[] = [];

  const rootMound = new THREE.CylinderGeometry(0.32, 0.62, 0.3, 9);
  rootMound.translate(0, 0.14, 0);
  trunkParts.push(rootMound);

  const segs = 10;
  for (let s = 0; s < segs; s++) {
    const t = (s + 0.5) / segs;
    const pt = getTrunkPt(t);
    const rBot = THREE.MathUtils.lerp(0.28, 0.13, t);
    const segH = (crownY / segs) * 1.16;
    const cyl = new THREE.CylinderGeometry(rBot * 0.87, rBot, segH, 8);
    cyl.rotateZ(-t * leanAngle * 0.86);
    cyl.translate(pt.x, pt.y, pt.z);
    trunkParts.push(cyl);

    if (s > 0) {
      const collar = new THREE.CylinderGeometry(rBot * 1.07, rBot * 0.94, 0.085, 8);
      collar.rotateZ(-t * leanAngle * 0.86);
      collar.translate(pt.x, pt.y - segH * 0.34, pt.z);
      ringParts.push(collar);
    }
  }

  // Fibrous green palm heart-crown collar + cute sprout top + 4 plump coconuts
  const sheathParts: THREE.BufferGeometry[] = [];
  const sheath = new THREE.CylinderGeometry(0.24, 0.15, 0.44, 8);
  sheath.translate(crownPt.x, crownPt.y - 0.06, crownPt.z);
  sheathParts.push(sheath);
  const sproutCap = new THREE.SphereGeometry(0.18, 8, 6);
  sproutCap.scale(1.0, 1.35, 1.0);
  sproutCap.translate(crownPt.x, crownPt.y + 0.14, crownPt.z);
  sheathParts.push(sproutCap);

  const coconutParts: THREE.BufferGeometry[] = [];
  for (let c = 0; c < 4; c++) {
    const ca = (c / 4) * Math.PI * 2 + 0.45;
    const coco = new THREE.SphereGeometry(0.195, 8, 6);
    coco.scale(0.96, 1.14, 0.96);
    coco.translate(
      crownPt.x + Math.cos(ca) * 0.25,
      crownPt.y - 0.21 - (c % 2) * 0.05,
      crownPt.z + Math.sin(ca) * 0.25,
    );
    coconutParts.push(coco);
  }

  // Soft chunky clay-sculpted fronds split into lower deep-emerald tier (7 fronds) & upper sun-kissed tier (5 fronds)
  const lowerFrondParts: THREE.BufferGeometry[] = [];
  const upperFrondParts: THREE.BufferGeometry[] = [];

  const appendClayFrond = (
    targetParts: THREE.BufferGeometry[],
    yaw: number,
    length: number,
    width: number,
    thickness: number,
    archHeight: number,
    droopEnd: number,
    basePitch: number,
  ) => {
    const frondPivot = new THREE.Object3D();
    frondPivot.position.set(crownPt.x, crownPt.y + 0.06, crownPt.z);
    frondPivot.rotation.set(basePitch, yaw, 0);
    frondPivot.updateMatrix();

    const frondGeo = createClayPalmFrondGeo(length, width, thickness, archHeight, droopEnd);
    frondGeo.applyMatrix4(frondPivot.matrix);
    targetParts.push(frondGeo);
  };

  for (let i = 0; i < 7; i++) {
    const yaw = (i / 7) * Math.PI * 2 + (i % 2) * 0.1;
    appendClayFrond(lowerFrondParts, yaw, 2.38, 0.72, 0.13, 0.56, 0.96, 0.08);
  }
  for (let i = 0; i < 5; i++) {
    const yaw = (i / 5) * Math.PI * 2 + 0.34;
    appendClayFrond(upperFrondParts, yaw, 1.98, 0.62, 0.12, 0.72, 0.48, -0.34);
  }

  return {
    trunkGeo: mergeBufferParts(trunkParts),
    ringGeo: mergeBufferParts(ringParts),
    sheathGeo: mergeBufferParts(sheathParts),
    coconutGeo: mergeBufferParts(coconutParts),
    lowerFrondGeo: mergeBufferParts(lowerFrondParts),
    upperFrondGeo: mergeBufferParts(upperFrondParts),
  };
}

function distanceToSegment2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq <= 0.0001) return Math.hypot(px - ax, pz - az);
  const t = THREE.MathUtils.clamp(((px - ax) * vx + (pz - az) * vz) / lenSq, 0, 1);
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

function getStreamChannelDistance(x: number, z: number): number {
  let minDist = Infinity;
  for (let i = 0; i < STREAM_POINTS.length - 1; i++) {
    const [ax, az] = STREAM_POINTS[i];
    const [bx, bz] = STREAM_POINTS[i + 1];
    const d = distanceToSegment2D(x, z, ax, az, bx, bz);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Organic island elevation (grassy glade -> gentle sloping sandy beach -> shallow reef -> deep seabed)
 * with subtle stream channel depression, balloon pad, and treehouse plaza clearing.
 */
export function getIslandBaseTerrainY(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  const coveOffset =
    Math.sin(ang * 3 + 0.45) * 1.35 +
    Math.cos(ang * 2 - 0.75) * 1.05 +
    Math.sin(ang * 5 + 1.2) * 0.38;
  const southCoveFlatten = Math.exp(-Math.pow((x - 0) / 7.5, 2) - Math.pow((z - 23.0) / 8.0, 2));
  const rEff = r + coveOffset * (1 - southCoveFlatten * 0.6);

  let y: number;
  if (rEff <= 17.2) {
    const roll =
      Math.sin(x * 0.16) * Math.cos(z * 0.16) * 0.24 +
      Math.cos((x + z) * 0.11) * 0.16;
    const edgeBlend = 1 - smoothStep(12.8, 17.2, rEff);
    y = 0.78 + Math.max(-0.08, roll * edgeBlend);
  } else if (rEff <= 34.5) {
    const t = smoothStep(17.2, 34.5, rEff);
    y = THREE.MathUtils.lerp(0.78, -1.55, t);
  } else {
    const deepT = smoothStep(34.5, 58.0, rEff);
    y = THREE.MathUtils.lerp(-1.55, -2.45, deepT);
  }

  // Smooth flat knoll pad for the Island Hot Air Balloon Station at (13.5, -4.5)
  const dBalloon = Math.hypot(x - ISLAND_BALLOON_POS.x, z - ISLAND_BALLOON_POS.z);
  const balloonPadW = 1 - smoothStep(3.8, 6.8, dBalloon);
  y = THREE.MathUtils.lerp(y, 1.38, balloonPadW);

  // Smooth clearing under the Giant Island Treehouse & rope ladder landing at (-7.5, -9.2)
  const dHouse = Math.hypot(x - -7.5, z - -9.2);
  const housePadW = 1 - smoothStep(4.5, 8.0, dHouse);
  y = THREE.MathUtils.lerp(y, 0.72, housePadW);

  // Scenic springhead waterfall bluff behind (-0.8, -17.3)
  const dSpring = Math.hypot(x - -0.8, z - -17.3);
  if (dSpring < 4.8) {
    y += (1 - smoothStep(1.0, 4.8, dSpring)) * 0.78;
  }

  // Scenic north-west bluff behind palms (-16.5, -14.5)
  const dBluff = Math.hypot(x - -16.5, z - -14.5);
  if (dBluff < 7.0) {
    y += (1 - smoothStep(1.5, 7.0, dBluff)) * 0.52;
  }

  // Gentle recessed channel along the winding island brook
  if (x > 0.2 && x < 21.5 && z < -11.0 && z > -19.5) {
    const streamD = getStreamChannelDistance(x, z);
    if (streamD < 1.95) {
      const dip = (1 - smoothStep(0.3, 1.95, streamD)) * 0.24;
      y -= dip;
    }
  }

  return y;
}

export function isPointOnIslandPier(x: number, z: number): boolean {
  return (
    x >= ISLAND_PIER_X_MIN &&
    x <= ISLAND_PIER_X_MAX &&
    z >= ISLAND_PIER_Z_MIN &&
    z <= ISLAND_PIER_Z_MAX
  );
}

const OCT_COS = Math.cos(Math.PI / 8);
const OCT_SIN = Math.sin(Math.PI / 8);

function isInsideOctagon(dx: number, dz: number, vertexRadius: number): boolean {
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  const limit = vertexRadius * OCT_COS;
  return ax * OCT_COS + az * OCT_SIN <= limit && ax * OCT_SIN + az * OCT_COS <= limit;
}

/**
 * Ground-layer walkable height (terrain + boat pier + balloon platform). Upper Treehouse height is managed via climbing state.
 */
export function getIslandGroundHeight(x: number, z: number): number {
  let y = getIslandBaseTerrainY(x, z);
  if (isPointOnIslandPier(x, z)) {
    y = Math.max(y, ISLAND_PIER_DECK_Y);
  }
  const bdx = x - ISLAND_BALLOON_POS.x;
  const bdz = z - ISLAND_BALLOON_POS.z;
  if (Math.abs(bdx) <= 3.9 && Math.abs(bdz) <= 3.9) {
    // Island balloon pad base sits at terrain height 1.38
    const padBaseY = 1.38;
    if (isInsideOctagon(bdx, bdz, 3.43)) {
      y = Math.max(y, padBaseY + 0.27);
    } else if (isInsideOctagon(bdx, bdz, 3.74)) {
      y = Math.max(y, padBaseY + 0.18);
    }
  }
  return y;
}

function addBoxProxy(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  userData: Record<string, unknown>,
  targets: THREE.Object3D[],
) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({visible: false}),
  );
  proxy.position.set(pos[0], pos[1], pos[2]);
  proxy.userData = userData;
  parent.add(proxy);
  targets.push(proxy);
  return proxy;
}


export interface IslandWorld extends SubzoneWorld {
  setSwimRingPose: (
    active: boolean,
    x?: number,
    z?: number,
    moving?: boolean,
    elapsed?: number,
  ) => void;
  setTreehouseFocus: (active: boolean) => void;
  updateInsects: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerSpeed: number,
    isCreeping: boolean,
    elapsed: number,
    delta: number,
    frustum?: THREE.Frustum,
    cameraX?: number,
    cameraZ?: number,
  ) => {escapedByRun: number; startledByRun: number};
  tryCatchInsect: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRotY: number,
  ) => InsectCatchEvaluation;
}

export function buildIslandScene(options?: {
  fishingState?: 'idle' | 'waiting' | 'bite';
}): IslandWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const disposables: THREE.Texture[] = [];

  const matCache = new Map<string, THREE.Material>();
  const getMat = (color: string, roughness = 0.68, metalness = 0.04) => {
    const key = `${color}_${roughness}_${metalness}`;
    let m = matCache.get(key);
    if (!m) {
      m =
        metalness > 0.2 || roughness < 0.42
          ? glossyClayMat(color, roughness)
          : clayMat(color, roughness);
      if (metalness > 0.04 && m instanceof THREE.MeshStandardMaterial) {
        m.metalness = metalness;
      }
      matCache.set(key, m);
    }
    return m;
  };

  // =========================================================================
  // 1. CONTINUOUS SCULPTED ISLAND TERRAIN WITH VERTEX-COLORED BEACH & REEF
  // =========================================================================
  const grassTex = createGrassTexture(18, 18);
  disposables.push(grassTex);

  const terrainSize = 148;
  const terrainSegs = 136;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);

  const colGrassHigh = new THREE.Color('#80CA62');
  const colGrassMid = new THREE.Color('#6BB74F');
  const colSandDry = new THREE.Color('#F5DFB0');
  const colSandWet = new THREE.Color('#D9B982');
  const colReef = new THREE.Color('#9EC7A8');
  const colDeep = new THREE.Color('#5A92A0');
  const colBrookBed = new THREE.Color('#C4B898');
  const tmpCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getIslandBaseTerrainY(vx, vz);
    posAttr.setY(i, vy);

    if (vy >= 0.72) {
      const grassMix = smoothStep(0.72, 1.35, vy);
      tmpCol.copy(colGrassMid).lerp(colGrassHigh, grassMix);
    } else if (vy >= 0.42) {
      const t = smoothStep(0.42, 0.72, vy);
      tmpCol.copy(colSandDry).lerp(colGrassMid, t);
    } else if (vy >= ISLAND_WATER_Y + 0.04) {
      const t = smoothStep(ISLAND_WATER_Y + 0.04, 0.42, vy);
      tmpCol.copy(colSandWet).lerp(colSandDry, t);
    } else if (vy >= -1.05) {
      const t = smoothStep(-1.05, ISLAND_WATER_Y + 0.04, vy);
      tmpCol.copy(colReef).lerp(colSandWet, t);
    } else {
      const t = smoothStep(-2.35, -1.05, vy);
      tmpCol.copy(colDeep).lerp(colReef, t);
    }

    if (vx > 0 && vx < 21.5 && vz < -11.0 && vz > -19.5) {
      const sd = getStreamChannelDistance(vx, vz);
      if (sd < 1.8) {
        tmpCol.lerp(colBrookBed, (1 - smoothStep(0.3, 1.8, sd)) * 0.72);
      }
    }

    const n = Math.sin(vx * 0.43) * Math.cos(vz * 0.41) * 0.025;
    colors[i * 3] = THREE.MathUtils.clamp(tmpCol.r + n, 0, 1);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(tmpCol.g + n, 0, 1);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(tmpCol.b + n * 0.7, 0, 1);
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: grassTex,
    roughness: 0.88,
    metalness: 0.02,
  });
  const groundMesh = new THREE.Mesh(terrainGeo, terrainMat);
  groundMesh.receiveShadow = true;
  groundMesh.userData = {kind: 'ground', noShadowBlock: true, isTreehouseFloor: false};
  group.add(groundMesh);

  // Cozy stepping stones connecting Treehouse Rope Ladder Pad -> Central Plaza -> Balloon Station -> Pier -> Picnic
  const steppingStonesGroup = new THREE.Group();
  const stonePathPoints: [number, number, number][] = [
    [-7.5, -3.05, 0.54],
    [-7.1, -1.65, 0.5],
    [-6.0, -0.3, 0.46],
    [-4.4, 1.6, 0.5],
    [-2.5, 3.4, 0.48],
    [-0.4, 4.4, 0.54],
    [2.0, 3.5, 0.46],
    [4.6, 2.2, 0.52],
    [7.2, 0.8, 0.48],
    [9.4, -0.5, 0.5],
    [-0.6, 6.8, 0.48],
    [0.2, 9.4, 0.52],
    [-0.3, 12.1, 0.46],
    [0.1, 14.8, 0.5],
    [-0.2, 17.4, 0.46],
    [0.0, 20.0, 0.5],
    // Branch path over to Picnic Feast
    [-7.8, 1.5, 0.45],
    [-9.6, 2.0, 0.48],
    // Branch path toward Beach Grill & Lounge
    [2.6, 12.2, 0.46],
    [5.2, 14.4, 0.48],
    [7.5, 16.0, 0.46],
  ];
  const stoneMat = getMat('#E8DEC8', 0.84);
  for (const [sx, sz, sr] of stonePathPoints) {
    const sy = getIslandBaseTerrainY(sx, sz);
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(sr, sr * 1.12, 0.14, 9),
      stoneMat,
    );
    stone.position.set(sx, sy + 0.02, sz);
    stone.rotation.y = sx * 0.7 + sz;
    stone.scale.set(1.15, 1, 0.88);
    steppingStonesGroup.add(stone);
  }
  mergeStaticGroupByMaterial(steppingStonesGroup);
  group.add(steppingStonesGroup);

  // =========================================================================
  // 2. SURROUNDING TROPICAL OCEAN SURFACE, FOAM RING & CLEAN WHITE-ORANGE BUOYS
  // =========================================================================
  const oceanGeo = new THREE.PlaneGeometry(340, 340, 56, 56);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanPos = oceanGeo.attributes.position as THREE.BufferAttribute;
  const oceanBaseY = new Float32Array(oceanPos.count);
  for (let i = 0; i < oceanPos.count; i++) {
    oceanBaseY[i] = oceanPos.getY(i);
  }
  const oceanMat = new THREE.MeshStandardMaterial({
    color: '#2FB9D8',
    roughness: 0.18,
    metalness: 0.12,
    transparent: true,
    opacity: 0.82,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = ISLAND_WATER_Y;
  oceanMesh.userData = {kind: 'island_sea_water', isWaterMesh: true};
  group.add(oceanMesh);
  clickTargets.push(oceanMesh);

  const outerSeaMesh = new THREE.Mesh(
    new THREE.RingGeometry(44, 195, 48),
    new THREE.MeshStandardMaterial({
      color: '#187DA5',
      roughness: 0.55,
      metalness: 0.08,
    }),
  );
  outerSeaMesh.rotation.x = -Math.PI / 2;
  outerSeaMesh.position.y = ISLAND_WATER_Y - 0.18;
  group.add(outerSeaMesh);

  const foamPts: THREE.Vector3[] = [];
  const foamSegments = 72;
  for (let i = 0; i <= foamSegments; i++) {
    const a = (i / foamSegments) * Math.PI * 2;
    let shoreR = 25.5;
    for (let rTest = 19.0; rTest <= 32.0; rTest += 0.35) {
      const h = getIslandBaseTerrainY(Math.cos(a) * rTest, Math.sin(a) * rTest);
      if (h <= ISLAND_WATER_Y + 0.02) {
        shoreR = rTest;
        break;
      }
    }
    foamPts.push(new THREE.Vector3(Math.cos(a) * shoreR, ISLAND_WATER_Y + 0.02, Math.sin(a) * shoreR));
  }
  const foamCurve = new THREE.CatmullRomCurve3(foamPts, true);
  const foamTubeGeo = new THREE.TubeGeometry(foamCurve, 96, 0.24, 5, true);
  foamTubeGeo.scale(1, 0.18, 1);
  const foamMat = new THREE.MeshBasicMaterial({
    color: '#F4FDFF',
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });
  const foamMesh = new THREE.Mesh(foamTubeGeo, foamMat);
  foamMesh.renderOrder = 3;
  group.add(foamMesh);

  const buoysGroup = new THREE.Group();
  const buoyOrangeMat = glossyClayMat('#FF6A3D', 0.34);
  const buoyWhiteMat = glossyClayMat('#FFFFFF', 0.32);
  const buoyCount = 20;
  for (let i = 0; i < buoyCount; i++) {
    const a = (i / buoyCount) * Math.PI * 2;
    const bx = Math.cos(a) * ISLAND_SWIM_MAX_R;
    const bz = Math.sin(a) * ISLAND_SWIM_MAX_R;
    const buoy = new THREE.Group();
    buoy.position.set(bx, ISLAND_WATER_Y + 0.04, bz);
    const floatRing = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.24, 12), buoyOrangeMat);
    const midStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.28, 12), buoyWhiteMat);
    midStripe.position.y = 0.23;
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), buoyOrangeMat);
    topCap.position.y = 0.41;
    buoy.add(floatRing, midStripe, topCap);
    buoysGroup.add(buoy);
  }
  mergeStaticGroupByMaterial(buoysGroup);
  group.add(buoysGroup);

  // =========================================================================
  // 3. CLEAN HARBOR WOODEN PIER + SWIM FLOAT + WOODEN ROWBOAT
  // =========================================================================
  const pierWoodTex = createWoodPlankTexture('#C68D57', '#946134', 2, 8);
  disposables.push(pierWoodTex);
  const pierDeckMat = new THREE.MeshStandardMaterial({map: pierWoodTex, roughness: 0.78});
  const pierPlankWarmMat = getMat('#CE9762', 0.72);
  const pierPlankAltMat = getMat('#BC834F', 0.75);
  const pierTimberMat = getMat('#6D4325', 0.8);
  const pierBrassMat = getMat('#DDA84F', 0.34, 0.65);
  const ropeHempMat = getMat('#DCC194', 0.86);

  const pierGroup = new THREE.Group();
  const pierLen = ISLAND_PIER_Z_MAX - ISLAND_PIER_Z_MIN;
  const pierCenterZ = (ISLAND_PIER_Z_MIN + ISLAND_PIER_Z_MAX) * 0.5;

  // Main walkable structural deck (top flush at ISLAND_PIER_DECK_Y = 0.48)
  const pierDeckMesh = new THREE.Mesh(
    new RoundedBoxGeometry(3.16, 0.14, pierLen, 2, 0.03),
    pierDeckMat,
  );
  pierDeckMesh.position.set(0, ISLAND_PIER_DECK_Y - 0.07, pierCenterZ);
  pierDeckMesh.userData = {kind: 'ground', noShadowBlock: true, isTreehouseFloor: false};
  pierGroup.add(pierDeckMesh);

  // Shore approach ramp flush onto sandy beach (z: 21.25 .. 22.1)
  const shoreRamp = new THREE.Mesh(
    new RoundedBoxGeometry(3.04, 0.12, 0.95, 2, 0.03),
    pierPlankWarmMat,
  );
  shoreRamp.position.set(0, ISLAND_PIER_DECK_Y - 0.05, ISLAND_PIER_Z_MIN - 0.32);
  shoreRamp.rotation.x = -0.14;
  pierGroup.add(shoreRamp);

  // Sculpted beveled transverse deck planks & longitudinal under-deck stringers
  let plankIdx = 0;
  for (let pz = ISLAND_PIER_Z_MIN + 0.18; pz <= ISLAND_PIER_Z_MAX - 0.16; pz += 0.38) {
    const plank = new THREE.Mesh(
      new RoundedBoxGeometry(3.08, 0.032, 0.31, 1, 0.01),
      plankIdx % 2 === 0 ? pierPlankWarmMat : pierPlankAltMat,
    );
    plank.position.set(0, ISLAND_PIER_DECK_Y - 0.006, pz);
    pierGroup.add(plank);
    plankIdx++;
  }
  for (const sx of [-1.42, 1.42]) {
    const stringer = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.15, pierLen + 0.1, 1, 0.02),
      pierTimberMat,
    );
    stringer.position.set(sx, ISLAND_PIER_DECK_Y - 0.13, pierCenterZ);
    pierGroup.add(stringer);
  }

  // Aligned Pier Pilings (5 pairs at x = +/-1.38) rising smoothly into deck bollards — ZERO double posts!
  const pierZPosts = [23.0, 25.7, 28.4, 31.1, 33.5];
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: '#FFE79A',
    emissive: '#FFB347',
    emissiveIntensity: 0.9,
    roughness: 0.35,
  });

  pierZPosts.forEach((pz, idx) => {
    const crossJoist = new THREE.Mesh(
      new RoundedBoxGeometry(2.96, 0.13, 0.16, 1, 0.02),
      pierTimberMat,
    );
    crossJoist.position.set(0, ISLAND_PIER_DECK_Y - 0.21, pz);
    pierGroup.add(crossJoist);

    for (const px of [-1.38, 1.38]) {
      const isLeft = px < 0;
      const isTip = idx === pierZPosts.length - 1;
      const isBerthCleat = idx === 3; // z = 31.1
      const aboveH = isTip && isLeft ? 1.18 : isTip || isBerthCleat ? 0.38 : 0.62;
      const botY = ISLAND_WATER_Y - 2.05;
      const topY = ISLAND_PIER_DECK_Y + aboveH;
      const totalH = topY - botY;

      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.13, totalH, 9),
        pierTimberMat,
      );
      piling.position.set(px, (botY + topY) * 0.5, pz);
      pierGroup.add(piling);

      if (isTip && isLeft) {
        // Harbor Lantern crowning the seaward-left piling
        const lanternArm = new THREE.Mesh(
          new RoundedBoxGeometry(0.26, 0.07, 0.07, 1, 0.02),
          pierTimberMat,
        );
        lanternArm.position.set(px + 0.08, topY - 0.02, pz);
        const lanternHead = new THREE.Mesh(
          new RoundedBoxGeometry(0.28, 0.34, 0.28, 2, 0.04),
          lanternGlowMat,
        );
        lanternHead.position.set(px + 0.16, topY - 0.24, pz);
        const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), pierTimberMat);
        lanternCap.rotation.y = Math.PI / 4;
        lanternCap.position.set(px + 0.16, topY - 0.02, pz);
        pierGroup.add(lanternArm, lanternHead, lanternCap);
      } else {
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 8, 6),
          isTip || isBerthCleat ? pierBrassMat : pierPlankWarmMat,
        );
        cap.position.set(px, topY + 0.02, pz);
        pierGroup.add(cap);
      }
    }
  });

  // Clean taut hemp rope handrail on inner approach (z: 23.0 .. 28.4), leaving seaward berth area completely open!
  for (const px of [-1.38, 1.38]) {
    const railSpan = 28.4 - 23.0;
    const ropeRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, railSpan, 6),
      ropeHempMat,
    );
    ropeRail.rotation.x = Math.PI / 2;
    ropeRail.position.set(px, ISLAND_PIER_DECK_Y + 0.44, (23.0 + 28.4) * 0.5);
    pierGroup.add(ropeRail);
  }

  // Colliders strictly aligned to the outer side bollards (central walkway x: -1.16..+1.16 wide open!)
  colliders.push(
    {type: 'circle', id: 'island_pier_post_l1', x: -1.38, z: 23.0, r: 0.22},
    {type: 'circle', id: 'island_pier_post_r1', x: 1.38, z: 23.0, r: 0.22},
    {type: 'circle', id: 'island_pier_post_l2', x: -1.38, z: 25.7, r: 0.22},
    {type: 'circle', id: 'island_pier_post_r2', x: 1.38, z: 25.7, r: 0.22},
    {type: 'circle', id: 'island_pier_post_l3', x: -1.38, z: 28.4, r: 0.22},
    {type: 'circle', id: 'island_pier_post_r3', x: 1.38, z: 28.4, r: 0.22},
    {type: 'circle', id: 'island_pier_cleat_l', x: -1.38, z: 31.1, r: 0.22},
    {type: 'circle', id: 'island_pier_cleat_r', x: 1.38, z: 31.1, r: 0.22},
    {type: 'circle', id: 'island_pier_lantern_l', x: -1.38, z: 33.5, r: 0.24},
    {type: 'circle', id: 'island_pier_bollard_r', x: 1.38, z: 33.5, r: 0.24},
  );

  // Wooden Swim Ladder on West edge next to Swim Float (x = -1.60, z = 31.8)
  for (const lz of [31.52, 32.08]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.32, 7), pierTimberMat);
    rail.position.set(-1.62, ISLAND_PIER_DECK_Y - 0.34, lz);
    rail.rotation.z = 0.08;
    pierGroup.add(rail);
  }
  for (let r = 0; r < 4; r++) {
    const rung = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.045, 0.56, 1, 0.015), pierPlankWarmMat);
    rung.position.set(-1.62 - r * 0.02, ISLAND_PIER_DECK_Y - 0.14 - r * 0.25, 31.8);
    pierGroup.add(rung);
  }

  // Slack catenary mooring lines (cleanly curving down from bollard to berth without intersecting deck!)
  const addCatenaryRope = (
    pStart: THREE.Vector3,
    pMid: THREE.Vector3,
    pEnd: THREE.Vector3,
  ) => {
    const curve = new THREE.CatmullRomCurve3([pStart, pMid, pEnd]);
    const ropeGeo = new THREE.TubeGeometry(curve, 12, 0.022, 6, false);
    pierGroup.add(new THREE.Mesh(ropeGeo, ropeHempMat));
  };
  addCatenaryRope(
    new THREE.Vector3(-1.38, ISLAND_PIER_DECK_Y + 0.26, 31.1),
    new THREE.Vector3(-1.95, ISLAND_WATER_Y + 0.18, 31.45),
    new THREE.Vector3(-2.36, ISLAND_WATER_Y + 0.14, 31.72),
  );
  addCatenaryRope(
    new THREE.Vector3(1.38, ISLAND_PIER_DECK_Y + 0.28, 33.5),
    new THREE.Vector3(2.08, ISLAND_WATER_Y + 0.32, 33.42),
    new THREE.Vector3(2.8, ISLAND_WATER_Y + 0.42, 33.16),
  );

  mergeStaticGroupByMaterial(pierGroup, new Set([pierDeckMesh]));
  group.add(pierGroup);

  // Choice 1: Classic Beach Swim Float ("Phao Bơi") moored cleanly at West berth (triggers normal swim!)
  const mooredSwimFloat = new THREE.Group();
  mooredSwimFloat.position.set(-2.85, ISLAND_WATER_Y + 0.05, 31.8);
  const floatRedMat = glossyClayMat('#EE5A4F', 0.34);
  const floatWhiteMat = glossyClayMat('#FFF8EE', 0.36);
  const floatStripeCount = 8;
  const floatSegArc = (Math.PI * 2) / floatStripeCount;
  for (let s = 0; s < floatStripeCount; s++) {
    const segMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.19, 12, 8, floatSegArc + 0.02),
      s % 2 === 0 ? floatRedMat : floatWhiteMat,
    );
    segMesh.rotation.x = Math.PI / 2;
    segMesh.rotation.z = s * floatSegArc;
    segMesh.position.y = 0.08;
    mooredSwimFloat.add(segMesh);
  }
  const floatTrim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.022, 6, 24), ropeHempMat);
  floatTrim.rotation.x = Math.PI / 2;
  floatTrim.position.y = 0.11;
  mooredSwimFloat.add(floatTrim);
  mergeStaticGroupByMaterial(mooredSwimFloat);
  group.add(mooredSwimFloat);

  colliders.push({type: 'circle', id: 'island_swim_float', x: -2.85, z: 31.8, r: 0.88});
  addBoxProxy(
    group,
    [1.75, 1.25, 1.75],
    [-2.85, ISLAND_WATER_Y + 0.42, 31.8],
    {
      kind: 'island_swim_float',
      tx: ISLAND_PIER_DUCK_INTERACT.tx,
      tz: ISLAND_PIER_DUCK_INTERACT.tz,
    },
    clickTargets,
  );

  // Choice 2: Crafted Regular Wooden Rowboat moored cleanly parallel at East berth + Active Steerable Sea Boat
  const mooredBoatBuilt = buildWoodenRowboat(false);
  const mooredIslandBoat = mooredBoatBuilt.boat;
  mooredIslandBoat.position.set(2.8, ISLAND_WATER_Y + 0.05, 31.7);
  mooredIslandBoat.rotation.y = 0;
  addBoxProxy(
    mooredIslandBoat,
    [1.85, 1.5, 3.1],
    [0, 0.55, 0.1],
    {
      kind: 'island_boat_board',
      tx: ISLAND_BOAT_INTERACT.tx,
      tz: ISLAND_BOAT_INTERACT.tz,
    },
    clickTargets,
  );
  group.add(mooredIslandBoat);

  const activeBoatBuilt = buildWoodenRowboat(true);
  const activeIslandBoat = activeBoatBuilt.boat;
  const activeIslandOarL = activeBoatBuilt.oarLPivot;
  const activeIslandOarR = activeBoatBuilt.oarRPivot;
  activeIslandBoat.visible = false;
  group.add(activeIslandBoat);

  // =========================================================================
  // 4. OPEN-AIR ELEVATED TREE GARDEN TERRACE ("VƯỜN TRÊN CÂY") + ROPE LADDER
  // =========================================================================
  const houseWoodTex = createWoodPlankTexture('#D89E65', '#A56D3B', 4, 4);
  disposables.push(houseWoodTex);
  const houseDeckMat = new THREE.MeshStandardMaterial({map: houseWoodTex, roughness: 0.72});
  const housePostMat = getMat('#734625', 0.78);
  const houseRailMat = getMat('#C88D56', 0.72);
  const ropeJuteMat = getMat('#D8BA85', 0.88);
  const ropeTieMat = getMat('#8D6B3E', 0.9);
  const fabricTealMat = getMat('#57C1B8', 0.75);
  const fabricCreamMat = getMat('#FFF7E8', 0.7);
  const fabricCoralMat = getMat('#F2846E', 0.72);

  const treeTrunkMat = getMat('#7B5132', 0.86);
  const treeBarkDarkMat = getMat('#5E3B22', 0.9);
  const canopyDeepMat = getMat('#3E9C45', 0.78);
  const canopyMidMat = getMat('#54B852', 0.74);
  const canopyTopMat = getMat('#73D060', 0.7);
  const blossomPinkMat = getMat('#FF8EA8', 0.58);

  const treehouseGroup = new THREE.Group();
  const basePadY = getIslandBaseTerrainY(ISLAND_LADDER_BOTTOM.x, ISLAND_LADDER_BOTTOM.z);

  // 4A. Tall Ancient Banyan Tree cleanly cradling behind & beneath the high stilt garden deck
  const treeBasePos = {x: -7.5, z: -14.35};
  const treeBaseGroundY = getIslandBaseTerrainY(treeBasePos.x, treeBasePos.z);

  // Flared stone-and-earth landing terrace at bottom of outward Rope Ladder (-7.5, -4.75)
  const ladderPad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.38, 1.56, 0.14, 14),
    getMat('#E6DEC8', 0.82),
  );
  ladderPad.position.set(ISLAND_LADDER_BOTTOM.x, basePadY + 0.04, ISLAND_LADDER_BOTTOM.z);
  treehouseGroup.add(ladderPad);
  for (const side of [-1.25, 1.25]) {
    const pPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 8), housePostMat);
    pPost.position.set(ISLAND_LADDER_BOTTOM.x + side, basePadY + 0.55, ISLAND_LADDER_BOTTOM.z);
    const pOrb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), lanternGlowMat);
    pOrb.position.set(ISLAND_LADDER_BOTTOM.x + side, basePadY + 1.15, ISLAND_LADDER_BOTTOM.z);
    treehouseGroup.add(pPost, pOrb);
  }

  // Massive Gnarled Tall Trunk cleanly clear of deck back edge (-12.85) + 6 thick buttress root flares
  const trunkLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.86, 1.48, 6.6, 11),
    treeTrunkMat,
  );
  trunkLower.position.set(treeBasePos.x, treeBaseGroundY + 3.25, treeBasePos.z);
  const trunkUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.88, 5.8, 10),
    treeTrunkMat,
  );
  trunkUpper.position.set(treeBasePos.x, treeBaseGroundY + 9.0, treeBasePos.z - 0.2);
  treehouseGroup.add(trunkLower, trunkUpper);

  for (let r = 0; r < 6; r++) {
    const ra = (r / 6) * Math.PI * 2 + 0.35;
    const rootFin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.44, 2.45, 7),
      r % 2 === 0 ? treeBarkDarkMat : treeTrunkMat,
    );
    rootFin.position.set(
      treeBasePos.x + Math.cos(ra) * 1.4,
      treeBaseGroundY + 0.72,
      treeBasePos.z + Math.sin(ra) * 1.4,
    );
    rootFin.rotation.z = Math.cos(ra) * 0.68;
    rootFin.rotation.x = -Math.sin(ra) * 0.68;
    treehouseGroup.add(rootFin);
  }

  // 4 Sweeping Heavy Cradle Boughs strictly terminating into saddle blocks BELOW deck joist (ZERO floor piercing!)
  const upAxis = new THREE.Vector3(0, 1, 0);
  const cradleTargets: [number, number][] = [
    [-10.2, -9.9],
    [-4.8, -9.9],
    [-9.6, -7.5],
    [-5.4, -7.5],
  ];
  cradleTargets.forEach(([tx, tz]) => {
    const startPt = new THREE.Vector3(treeBasePos.x, treeBaseGroundY + 3.05, treeBasePos.z);
    const endPt = new THREE.Vector3(tx, ISLAND_TREEHOUSE_DECK_Y - 0.54, tz);
    const dir = new THREE.Vector3().subVectors(endPt, startPt);
    const len = dir.length();
    const bough = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, len, 8), treeTrunkMat);
    bough.position.addVectors(startPt, endPt).multiplyScalar(0.5);
    bough.quaternion.setFromUnitVectors(upAxis, dir.normalize());
    const saddle = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.26, 0.46, 1, 0.03),
      housePostMat,
    );
    saddle.position.set(tx, ISLAND_TREEHOUSE_DECK_Y - 0.41, tz);
    treehouseGroup.add(bough, saddle);
  });

  // Prominent Elevated Timber Stilts ("Chân Trụ") + angled knee-braces cleanly terminating strictly below deck joist
  for (const [sx, sz] of [
    [-10.95, -6.55],
    [-4.05, -6.55],
    [-10.8, -12.3],
    [-4.2, -12.3],
  ]) {
    const stiltBotY = getIslandBaseTerrainY(sx, sz) - 0.25;
    const stiltTopY = ISLAND_TREEHOUSE_DECK_Y - 0.29;
    const stiltH = stiltTopY - stiltBotY;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.23, stiltH, 9),
      housePostMat,
    );
    pillar.position.set(sx, (stiltBotY + stiltTopY) * 0.5, sz);

    const bStart = new THREE.Vector3(sx, ISLAND_TREEHOUSE_DECK_Y - 1.32, sz);
    const bEnd = new THREE.Vector3(sx + (sx < -7.5 ? 0.95 : -0.95), ISLAND_TREEHOUSE_DECK_Y - 0.36, sz);
    const bDir = new THREE.Vector3().subVectors(bEnd, bStart);
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, bDir.length(), 7), housePostMat);
    brace.position.addVectors(bStart, bEnd).multiplyScalar(0.5);
    brace.quaternion.setFromUnitVectors(upAxis, bDir.normalize());
    treehouseGroup.add(pillar, brace);
  }
  colliders.push({
    type: 'circle',
    id: 'island_tree_trunk',
    x: treeBasePos.x,
    z: treeBasePos.z,
    r: 1.55,
  });

  // High Upper Crown Canopy arched cleanly behind & flanking the open terrace (always visible, zero view obstruction!)
  const treeCanopyGroup = new THREE.Group();
  const crownCenterY = ISLAND_TREEHOUSE_DECK_Y + 5.75;
  const canopyBlobs: [number, number, number, number, number, THREE.Material][] = [
    [-7.5, crownCenterY + 0.75, -15.5, 3.4, 0.6, canopyMidMat],
    [-11.4, crownCenterY + 0.1, -14.3, 2.65, 0.64, canopyDeepMat],
    [-3.6, crownCenterY + 0.1, -14.3, 2.65, 0.64, canopyDeepMat],
    [-10.4, crownCenterY + 1.05, -13.3, 2.25, 0.58, canopyTopMat],
    [-4.6, crownCenterY + 1.05, -13.3, 2.25, 0.58, canopyTopMat],
    [-7.5, crownCenterY + 1.65, -14.5, 2.55, 0.62, canopyTopMat],
    [-12.6, crownCenterY - 0.15, -11.4, 2.0, 0.65, canopyMidMat],
    [-2.4, crownCenterY - 0.15, -11.4, 2.0, 0.65, canopyMidMat],
  ];
  canopyBlobs.forEach(([cx, cy, cz, cr, sy, mat]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 11, 8), mat);
    puff.scale.set(1.18, sy, 1.05);
    puff.position.set(cx, cy, cz);
    treeCanopyGroup.add(puff);
  });

  // Blossom puffs & hanging moss vines + warm fairy lanterns beneath outer side boughs
  [
    [-12.4, crownCenterY - 0.95, -11.0],
    [-2.6, crownCenterY - 0.95, -11.0],
    [-11.2, crownCenterY - 0.95, -15.2],
    [-3.8, crownCenterY - 0.95, -15.2],
  ].forEach(([vx, vy, vz]) => {
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.015, 1.65, 5), canopyMidMat);
    vine.position.set(vx, vy - 0.75, vz);
    const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 6), blossomPinkMat);
    blossom.position.set(vx + 0.18, vy + 0.35, vz + 0.12);
    const fCord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 5), housePostMat);
    fCord.position.set(vx * 0.98, vy - 0.3, vz + 0.35);
    const fOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), lanternGlowMat);
    fOrb.position.set(vx * 0.98, vy - 0.7, vz + 0.35);
    treeCanopyGroup.add(vine, blossom, fCord, fOrb);
  });
  mergeStaticGroupByMaterial(treeCanopyGroup);
  group.add(treeCanopyGroup);

  // 4B. Open-Air Elevated Garden Platform Deck (no walls, no cabin roof!)
  const deckW = 7.8;
  const deckD = 6.7;
  const deckCx = ISLAND_TREEHOUSE_CENTER.x;
  const deckCz = ISLAND_TREEHOUSE_CENTER.z; // spans z: -12.85 .. -6.15, x: -11.4 .. -3.6

  const deckJoist = new THREE.Mesh(
    new RoundedBoxGeometry(deckW + 0.16, 0.18, deckD + 0.16, 2, 0.04),
    housePostMat,
  );
  deckJoist.position.set(deckCx, ISLAND_TREEHOUSE_DECK_Y - 0.2, deckCz);
  treehouseGroup.add(deckJoist);

  const treehouseDeckMesh = new THREE.Mesh(
    new RoundedBoxGeometry(deckW, 0.16, deckD, 2, 0.04),
    houseDeckMat,
  );
  treehouseDeckMesh.position.set(deckCx, ISLAND_TREEHOUSE_DECK_Y - 0.08, deckCz);
  treehouseDeckMesh.userData = {kind: 'ground', noShadowBlock: true, isTreehouseFloor: true};
  treehouseGroup.add(treehouseDeckMesh);

  // Balcony Rope-and-Timber Railings around perimeter (leaving clean front Rope Ladder gap x: -8.35..-6.65)
  const addBalconyRail = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const mx = (x1 + x2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const yaw = Math.atan2(x2 - x1, z2 - z1);
    const topBar = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, len, 2, 0.03), houseRailMat);
    topBar.position.set(mx, ISLAND_TREEHOUSE_DECK_Y + 0.84, mz);
    topBar.rotation.y = yaw;
    const ropeMid = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), ropeJuteMat);
    ropeMid.rotation.x = Math.PI / 2;
    ropeMid.rotation.z = -yaw;
    ropeMid.position.set(mx, ISLAND_TREEHOUSE_DECK_Y + 0.45, mz);
    treehouseGroup.add(topBar, ropeMid);

    for (const [px, pz] of [
      [x1, z1],
      [x2, z2],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.96, 8), housePostMat);
      post.position.set(px, ISLAND_TREEHOUSE_DECK_Y + 0.48, pz);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), houseRailMat);
      cap.position.set(px, ISLAND_TREEHOUSE_DECK_Y + 0.98, pz);
      treehouseGroup.add(post, cap);
    }
  };
  addBalconyRail(-11.2, -12.6, -11.2, -6.28);
  addBalconyRail(-3.8, -12.6, -3.8, -6.28);
  addBalconyRail(-11.2, -12.6, -3.8, -12.6);
  addBalconyRail(-11.2, -6.28, -8.35, -6.28);
  addBalconyRail(-6.65, -6.28, -3.8, -6.28);

  // Corner railing fairy lantern orbs for warm garden ambiance
  for (const [lx, lz] of [
    [-11.2, -12.6],
    [-3.8, -12.6],
    [-11.2, -6.28],
    [-3.8, -6.28],
  ]) {
    const poleExt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.42, 7), housePostMat);
    poleExt.position.set(lx, ISLAND_TREEHOUSE_DECK_Y + 1.15, lz);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 7), lanternGlowMat);
    orb.position.set(lx, ISLAND_TREEHOUSE_DECK_Y + 1.42, lz);
    treehouseGroup.add(poleExt, orb);
  }

  const cabY = ISLAND_TREEHOUSE_DECK_Y;
  const cabCz = -10.05;
  const seaPotMatA = getMat('#56C2DF', 0.58);
  const seaPotMatB = getMat('#F29C79', 0.62);
  const seaPotRimMat = getMat('#FFF5E1', 0.58);
  const seaShellMat = getMat('#FFF0DF', 0.5);
  const seaStarMat = getMat('#FF7D5C', 0.56);
  // 4 Corner Ceramic Pots inset >= 0.95m from every railing bar/post (zero clipping!)
  const coastalPots: [number, number, string, number][] = [
    [-10.1, -11.6, '#FF7B9B', 0],
    [-4.9, -11.6, '#FFD166', 1],
    [-10.1, -7.35, '#7DE2D1', 1],
    [-4.9, -7.35, '#FF8FA3', 0],
  ];
  coastalPots.forEach(([px, pz, flowerCol, styleIdx], idx) => {
    const potBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.19, 0.4, 10),
      styleIdx === 0 ? seaPotMatA : seaPotMatB,
    );
    potBody.position.set(px, cabY + 0.2, pz);
    const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 7, 12), seaPotRimMat);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.set(px, cabY + 0.39, pz);
    const badge = new THREE.Mesh(
      idx % 2 === 0
        ? new THREE.CylinderGeometry(0.07, 0.08, 0.028, 5)
        : new THREE.SphereGeometry(0.06, 7, 5),
      idx % 2 === 0 ? seaStarMat : seaShellMat,
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.set(px, cabY + 0.22, pz + 0.22);

    const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), canopyTopMat);
    foliage.scale.set(1.06, 0.78, 1.06);
    foliage.position.set(px, cabY + 0.53, pz);
    treehouseGroup.add(potBody, potRim, badge, foliage);

    for (let f = 0; f < 3; f++) {
      const fa = (f / 3) * Math.PI * 2 + idx;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.082, 6, 5), getMat(flowerCol, 0.5));
      fl.position.set(px + Math.cos(fa) * 0.12, cabY + 0.67 + (f % 2) * 0.05, pz + Math.sin(fa) * 0.12);
      treehouseGroup.add(fl);
    }

    colliders.push({
      type: 'circle',
      id: `island_th_pot_${idx}`,
      x: px,
      z: pz,
      r: 0.32,
    });
  });

  // 4C. Open Garden Terrace Centerpiece: Woven Rug, Tea Table + Tea Set + Pastry Stand, 2 Chairs & Tall Pastel Umbrella
  const rugMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.78, 0.03, 24), fabricCreamMat);
  rugMesh.position.set(deckCx, cabY + 0.015, cabCz);
  const rugBorder = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.024, 24), fabricTealMat);
  rugBorder.position.set(deckCx, cabY + 0.012, cabCz);
  treehouseGroup.add(rugBorder, rugMesh);

  // Tea Table at (-7.5, -10.05)
  const teaTblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.76, 0.09, 18), houseRailMat);
  teaTblTop.position.set(deckCx, cabY + 0.72, cabCz);
  const teaTblCloth = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.56, 0.02, 14), fabricCreamMat);
  teaTblCloth.position.set(deckCx, cabY + 0.775, cabCz);
  const teaTblPost = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 0.68, 10), housePostMat);
  teaTblPost.position.set(deckCx, cabY + 0.36, cabCz);
  const teaTblFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 12), housePostMat);
  teaTblFoot.position.set(deckCx, cabY + 0.04, cabCz);
  treehouseGroup.add(teaTblTop, teaTblCloth, teaTblPost, teaTblFoot);

  // Tall Pastel Striped Garden Umbrella ("Cây Dù Dựng Lên") shading the tea set cleanly from behind-right
  const thUmbX = deckCx + 0.96;
  const thUmbZ = cabCz - 1.15;
  const thUmbBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.1, 10), getMat('#DFD8C8', 0.72));
  thUmbBase.position.set(thUmbX, cabY + 0.05, thUmbZ);
  const thUmbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.85, 8), housePostMat);
  thUmbPole.position.set(thUmbX, cabY + 1.45, thUmbZ);
  const thUmbCanopyPivot = new THREE.Group();
  thUmbCanopyPivot.position.set(thUmbX, cabY + 2.82, thUmbZ);
  thUmbCanopyPivot.rotation.set(0.08, 0, 0.1);
  const umbGoreCount = 8;
  const umbSliceA = (Math.PI * 2) / umbGoreCount;
  for (let g = 0; g < umbGoreCount; g++) {
    const gore = new THREE.Mesh(
      new THREE.ConeGeometry(1.75, 0.56, 3, 1, false, g * umbSliceA, umbSliceA + 0.02),
      g % 2 === 0 ? fabricCreamMat : getMat('#5BB5AC', 0.64),
    );
    thUmbCanopyPivot.add(gore);
  }
  const umbFinial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), getMat('#F2C249', 0.4));
  umbFinial.position.y = 0.31;
  thUmbCanopyPivot.add(umbFinial);
  treehouseGroup.add(thUmbBase, thUmbPole, thUmbCanopyPivot);
  colliders.push({
    type: 'circle',
    id: 'island_th_umbrella',
    x: thUmbX,
    z: thUmbZ,
    r: 0.24,
  });

  // Tea Set on Table ("Bộ Nước Trà")
  const teapotBody = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 8), fabricTealMat);
  teapotBody.scale.set(1.1, 0.88, 1.1);
  teapotBody.position.set(deckCx - 0.18, cabY + 0.9, cabCz + 0.12);
  const teapotLid = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), fabricCreamMat);
  teapotLid.position.set(deckCx - 0.18, cabY + 1.03, cabCz + 0.12);
  const teapotSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.036, 0.14, 6), fabricTealMat);
  teapotSpout.position.set(deckCx - 0.06, cabY + 0.93, cabCz + 0.16);
  teapotSpout.rotation.z = -0.85;
  treehouseGroup.add(teapotBody, teapotLid, teapotSpout);

  for (const [tcx, tcz] of [
    [deckCx - 0.42, cabCz - 0.12],
    [deckCx + 0.38, cabCz + 0.18],
  ]) {
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.025, 10), fabricCreamMat);
    saucer.position.set(tcx, cabY + 0.79, tcz);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.085, 10), fabricCreamMat);
    cup.position.set(tcx, cabY + 0.84, tcz);
    const teaLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.015, 8),
      getMat('#C87D32', 0.35),
    );
    teaLiquid.position.set(tcx, cabY + 0.875, tcz);
    treehouseGroup.add(saucer, cup, teaLiquid);
  }

  // 2-Tier Pastry Stand on Table ("Bộ Bánh Ngọt")
  const brassMat = getMat('#F2C249', 0.32, 0.48);
  const pStandX = deckCx + 0.16;
  const pStandZ = cabCz - 0.16;
  const standStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.38, 8), brassMat);
  standStem.position.set(pStandX, cabY + 0.96, pStandZ);
  const tierBot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.025, 12), fabricCreamMat);
  tierBot.position.set(pStandX, cabY + 0.84, pStandZ);
  const tierTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.025, 12), fabricCreamMat);
  tierTop.position.set(pStandX, cabY + 1.04, pStandZ);
  const cakeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 10), getMat('#FFF0F5', 0.55));
  cakeBase.position.set(pStandX, cabY + 1.1, pStandZ);
  const strawberry = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 6), getMat('#FF4D6D', 0.45));
  strawberry.position.set(pStandX, cabY + 1.16, pStandZ);
  const pastryColors = ['#FF8FA3', '#FFD166', '#95D5B2', '#DDA15E'];
  for (let m = 0; m < 4; m++) {
    const ma = (m / 4) * Math.PI * 2 + 0.3;
    const pastry = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 7, 5),
      getMat(pastryColors[m], 0.58),
    );
    pastry.scale.set(1.2, 0.72, 1.0);
    pastry.position.set(pStandX + Math.cos(ma) * 0.14, cabY + 0.88, pStandZ + Math.sin(ma) * 0.14);
    treehouseGroup.add(pastry);
  }
  treehouseGroup.add(standStem, tierBot, tierTop, cakeBase, strawberry);

  // Two Upholstered Wooden Chairs ("2 Cái Ghế") flanking the Tea Table
  const thChairOffsets: [number, number, number][] = [
    [-1.24, 0, Math.PI / 2],
    [1.24, 0, -Math.PI / 2],
  ];
  const thChairSlots: Array<{
    seatX: number;
    seatZ: number;
    seatY: number;
    sitRotY: number;
    tx: number;
    tz: number;
  }> = [];
  thChairOffsets.forEach(([ox, oz, rotY], idx) => {
    const cx = deckCx + ox;
    const cz = cabCz + oz;
    const chair = new THREE.Group();
    chair.position.set(cx, cabY, cz);
    chair.rotation.y = rotY;
    const cSeat = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.1, 0.64, 2, 0.03), houseRailMat);
    cSeat.position.y = 0.44;
    const cushion = new THREE.Mesh(
      new RoundedBoxGeometry(0.54, 0.08, 0.54, 2, 0.03),
      idx === 0 ? fabricTealMat : fabricCoralMat,
    );
    cushion.position.y = 0.5;
    const cBack = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.52, 0.09, 2, 0.03), houseRailMat);
    cBack.position.set(0, 0.74, -0.27);
    const backPad = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.34, 0.06, 2, 0.02),
      idx === 0 ? fabricTealMat : fabricCoralMat,
    );
    backPad.position.set(0, 0.76, -0.22);
    for (const [lx, lz] of [
      [-0.22, -0.22],
      [0.22, -0.22],
      [-0.22, 0.22],
      [0.22, 0.22],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.44, 6), housePostMat);
      leg.position.set(lx, 0.22, lz);
      chair.add(leg);
    }
    chair.add(cSeat, cushion, cBack, backPad);
    treehouseGroup.add(chair);

    colliders.push({
      type: 'circle',
      id: `island_th_chair_${idx}`,
      x: cx,
      z: cz,
      r: 0.34,
    });
    thChairSlots.push({
      seatX: cx,
      seatZ: cz,
      seatY: cabY + 0.53,
      sitRotY: rotY,
      tx: deckCx + ox * 0.72,
      tz: cabCz + 0.72,
    });
  });

  // Upper Garden Terrace Furniture Colliders (no enclosing cabin walls — open-air walkability!)
  colliders.push({type: 'circle', id: 'island_th_table', x: deckCx, z: cabCz, r: 0.85});

  // Interactive Proxies for Garden Tea Table & 2 Chairs
  addBoxProxy(
    group,
    [3.5, 1.35, 1.8],
    [deckCx, cabY + 0.7, cabCz],
    {
      kind: 'bench',
      isTreehouseItem: true,
      seatSlots: thChairSlots,
      seatX: thChairSlots[0].seatX,
      seatZ: thChairSlots[0].seatZ,
      seatY: thChairSlots[0].seatY,
      sitRotY: thChairSlots[0].sitRotY,
      tx: thChairSlots[0].tx,
      tz: thChairSlots[0].tz,
    },
    clickTargets,
  );

  mergeStaticGroupByMaterial(treehouseGroup, new Set([treehouseDeckMesh]));
  group.add(treehouseGroup);

  // 4F. Hanging Rope Ladder ("Cầu Thang Dây") Sloping OUTWARD from Veranda Top (-7.5, -6.24) to Ground Landing (-7.5, -4.75)
  const ropeLadderPivot = new THREE.Group();
  const ropeLadderGroup = new THREE.Group();
  const ladderBotPos = new THREE.Vector3(ISLAND_LADDER_BOTTOM.x, basePadY + 0.12, ISLAND_LADDER_BOTTOM.z);
  const ladderTopPos = new THREE.Vector3(ISLAND_LADDER_BOTTOM.x, ISLAND_TREEHOUSE_DECK_Y + 0.04, -6.24);
  const ladderDirOut = new THREE.Vector3().subVectors(ladderBotPos, ladderTopPos);
  const ladderLen = ladderDirOut.length();

  ropeLadderPivot.position.copy(ladderTopPos);
  ropeLadderPivot.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    ladderDirOut.clone().normalize(),
  );
  ropeLadderPivot.add(ropeLadderGroup);

  const ladderHalfW = 0.38;
  for (const sx of [-ladderHalfW, ladderHalfW]) {
    // Upper wooden cleat bollard anchored onto front balcony beam
    const topAnchor = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.24, 7), housePostMat);
    topAnchor.position.set(sx, 0.05, 0);
    ropeLadderGroup.add(topAnchor);

    // Side braided jute rope extending outward and down to ground stake
    const sideRope = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, ladderLen, 7), ropeJuteMat);
    sideRope.position.set(sx, -ladderLen * 0.5, 0);
    ropeLadderGroup.add(sideRope);
  }

  const rungCount = 14;
  for (let r = 1; r <= rungCount; r++) {
    const t = r / (rungCount + 0.65);
    const ry = -t * ladderLen;
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, ladderHalfW * 2 + 0.14, 8), houseRailMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, ry, 0);
    ropeLadderGroup.add(rung);

    for (const sx of [-ladderHalfW, ladderHalfW]) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.058, 6, 5), ropeTieMat);
      knot.position.set(sx, ry, 0);
      ropeLadderGroup.add(knot);
    }
  }
  mergeStaticGroupByMaterial(ropeLadderGroup);
  group.add(ropeLadderPivot);

  // Pegged bottom anchor stakes holding rope ends on landing pad
  for (const sx of [-ladderHalfW, ladderHalfW]) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.34, 7), housePostMat);
    stake.position.set(ISLAND_LADDER_BOTTOM.x + sx, basePadY + 0.14, ISLAND_LADDER_BOTTOM.z);
    stake.rotation.x = -0.25;
    group.add(stake);
  }

  // Click target proxy wrapping the entire outward Rope Ladder
  addBoxProxy(
    group,
    [1.45, ladderLen + 0.7, 2.0],
    [ISLAND_LADDER_BOTTOM.x, (basePadY + ISLAND_TREEHOUSE_DECK_Y) * 0.5, (ladderBotPos.z + ladderTopPos.z) * 0.5],
    {
      kind: 'island_rope_ladder',
      bottomX: ISLAND_LADDER_CLIMB_START.x,
      bottomZ: ISLAND_LADDER_CLIMB_START.z,
      topX: ISLAND_LADDER_TOP.x,
      topZ: ISLAND_LADDER_TOP.z,
    },
    clickTargets,
  );

  // =========================================================================
  // 5. HOT AIR BALLOON STATION ON EAST KNOLL ("VỀ MÂY")
  // =========================================================================
  const balloonY = getIslandBaseTerrainY(ISLAND_BALLOON_POS.x, ISLAND_BALLOON_POS.z);
  const balloonStation = new THREE.Group();
  balloonStation.position.set(ISLAND_BALLOON_POS.x, balloonY, ISLAND_BALLOON_POS.z);

  const bStoneMat = getMat('#DFE6EE', 0.8);
  const bTimberMat = getMat('#8A5B36', 0.76);
  const bDeckMat = getMat('#D6A46E', 0.72);
  const bRopeMat = getMat('#DFC79C', 0.84);
  const bWickerMat = getMat('#B87D44', 0.82);
  const bSteelMat = getMat('#4E5A66', 0.45, 0.45);
  const bAccentGold = getMat('#F2C249', 0.34, 0.35);

  const bBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.85, 0.2, 8), bStoneMat);
  bBase.position.y = 0.08;
  const bDeck = new THREE.Mesh(new THREE.CylinderGeometry(3.38, 3.48, 0.14, 8), bDeckMat);
  bDeck.position.y = 0.2;
  balloonStation.add(bBase, bDeck);

  const basketBody = new THREE.Mesh(new RoundedBoxGeometry(1.48, 1.04, 1.48, 2, 0.1), bWickerMat);
  basketBody.position.y = 0.78;
  const basketRim = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.14, 1.6, 2, 0.05), bTimberMat);
  basketRim.position.y = 1.32;
  balloonStation.add(basketBody, basketRim);

  [
    [-0.62, -0.62],
    [0.62, -0.62],
    [-0.62, 0.62],
    [0.62, 0.62],
  ].forEach(([sx, sz]) => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 1.4, 7), bSteelMat);
    strut.position.set(sx, 2.0, sz);
    const mooring = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.15, 5), bRopeMat);
    mooring.position.set(sx * 1.45, 0.68, sz * 1.45);
    mooring.rotation.z = sx > 0 ? 0.32 : -0.32;
    balloonStation.add(strut, mooring);
  });

  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.2, 10), bSteelMat);
  burner.position.y = 2.74;
  balloonStation.add(burner);

  const envPoints = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.8, 0.16),
    new THREE.Vector2(1.7, 1.0),
    new THREE.Vector2(2.6, 2.25),
    new THREE.Vector2(2.96, 3.55),
    new THREE.Vector2(2.85, 4.72),
    new THREE.Vector2(2.08, 5.7),
    new THREE.Vector2(1.0, 6.3),
    new THREE.Vector2(0.01, 6.55),
  ];
  const envColors = ['#66C7E8', '#FFF6E3', '#FF8DA1', '#FFD166', '#7AD89E', '#FFF6E3', '#F79D65', '#88A6F0'];
  const goreAngle = (Math.PI * 2) / 8;
  for (let g = 0; g < 8; g++) {
    const goreGeo = new THREE.LatheGeometry(envPoints, 3, g * goreAngle, goreAngle + 0.02);
    const goreMesh = new THREE.Mesh(goreGeo, getMat(envColors[g % envColors.length], 0.56));
    goreMesh.position.y = 2.74;
    balloonStation.add(goreMesh);
  }
  const eqBand = new THREE.Mesh(new THREE.TorusGeometry(2.94, 0.1, 8, 28), bAccentGold);
  eqBand.rotation.x = Math.PI / 2;
  eqBand.position.y = 6.32;
  const crownCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), getMat('#56C2DF', 0.52));
  crownCap.scale.set(1.2, 0.65, 1.2);
  crownCap.position.y = 9.32;
  balloonStation.add(eqBand, crownCap);

  mergeStaticGroupByMaterial(balloonStation);
  group.add(balloonStation);

  colliders.push({
    type: 'circle',
    id: 'island_balloon_basket',
    x: ISLAND_BALLOON_POS.x,
    z: ISLAND_BALLOON_POS.z,
    r: 1.45,
  });
  addBoxProxy(
    group,
    [2.4, 3.2, 2.4],
    [ISLAND_BALLOON_POS.x, balloonY + 1.6, ISLAND_BALLOON_POS.z],
    {
      kind: 'balloon_to_town',
      tx: ISLAND_BALLOON_INTERACT.tx,
      tz: ISLAND_BALLOON_INTERACT.tz,
    },
    clickTargets,
  );
  labelAnchors.push({
    id: 'island_balloon_station',
    label: 'Khinh Khí Cầu · Về Mây',
    worldPos: new THREE.Vector3(ISLAND_BALLOON_POS.x, balloonY + 5.8, ISLAND_BALLOON_POS.z),
  });

  // =========================================================================
  // 6. SCULPTED SPRING GORGE WATERFALL & WINDING FRESHWATER BROOK ("CON SUỐI ĐẢO")
  // =========================================================================
  const insectAnchors: InsectAnchor[] = [];
  const decorGroup = new THREE.Group();

  const graniteMat = getMat('#7B8693', 0.88);
  const slateMat = getMat('#616C77', 0.9);
  const wetRockMat = getMat('#46505A', 0.56);
  const mossCapMat = getMat('#55B24C', 0.84);
  const creekFernMat = getMat('#439A46', 0.78);

  // Carved stratified spring crag formations framing waterfall headwater at (-0.8, -17.3)
  const springY = getIslandBaseTerrainY(-0.8, -17.2);
  const springCragSpecs: [number, number, number, number, number, number, number, 'granite' | 'slate' | 'wet', boolean][] = [
    [-1.85, springY + 0.95, -17.55, 1.55, 1.65, 1.35, 0.4, 'granite', true],
    [0.85, springY + 0.88, -17.45, 1.45, 1.5, 1.28, 1.6, 'slate', true],
    [-0.55, springY + 1.38, -18.55, 1.85, 1.85, 1.45, 2.5, 'granite', true],
    [-2.85, springY + 0.45, -16.2, 1.15, 0.9, 1.05, 0.9, 'wet', true],
    [1.95, springY + 0.42, -16.1, 1.1, 0.85, 0.98, 2.1, 'wet', true],
    [-0.4, springY + 0.62, -17.05, 0.85, 0.52, 0.72, 1.2, 'wet', false], // Wet gorge spill sill!
  ];
  springCragSpecs.forEach(([bx, by, bz, sx, sy, sz, seed, tone, addMoss], idx) => {
    const mat = tone === 'wet' ? wetRockMat : tone === 'slate' ? slateMat : graniteMat;
    const crag = new THREE.Mesh(createSculptedCragGeo(seed, sx, sy, sz, 1), mat);
    crag.position.set(bx, by, bz);
    crag.rotation.y = (idx * 0.82) % (Math.PI * 2);
    decorGroup.add(crag);

    if (addMoss) {
      const mCap = new THREE.Mesh(
        createSculptedCragGeo(seed + 3.7, sx * 0.76, sy * 0.2, sz * 0.74, 1),
        mossCapMat,
      );
      mCap.position.set(bx, by + sy * 0.48, bz);
      mCap.rotation.y = idx * 0.9;
      decorGroup.add(mCap);

      if (idx % 2 === 0) {
        const ledgeTuft = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), creekFernMat);
        ledgeTuft.scale.set(1.2, 0.7, 1.1);
        ledgeTuft.position.set(bx + 0.15, by + sy * 0.58, bz + 0.12);
        decorGroup.add(ledgeTuft);
      }
    }
  });
  colliders.push({type: 'circle', id: 'island_spring_bluff', x: -0.6, z: -17.3, r: 2.45});

  // Smooth curved waterfall cascade using createWaterfallTexture() (identical craft to Town Waterfall!)
  const waterfallTex = createWaterfallTexture();
  disposables.push(waterfallTex);
  const wfCascadeMat = new THREE.MeshStandardMaterial({
    color: '#D9F6FF',
    map: waterfallTex,
    roughness: 0.72,
    metalness: 0.0,
    emissive: '#38A2C4',
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const buildSpringCascadeSheet = () => {
    const verts: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];
    const rows = 9;
    const z0 = -17.05;
    const y0 = springY + 0.95;
    const z1 = -15.6;
    const y1 = getIslandBaseTerrainY(0.1, -15.6) + 0.06;
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const cz = THREE.MathUtils.lerp(z0, z1, Math.pow(t, 0.75));
      const cy = THREE.MathUtils.lerp(y0, y1, t * t * 0.72 + t * 0.28);
      const halfW = THREE.MathUtils.lerp(0.68, 0.96, t);
      const centerX = THREE.MathUtils.lerp(-0.35, 0.15, t);
      verts.push(centerX - halfW, cy, cz);
      verts.push(centerX + halfW, cy, cz);
      uvs.push(0, t * 1.4);
      uvs.push(1, t * 1.4);
    }
    for (let r = 0; r < rows; r++) {
      const a = r * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, wfCascadeMat);
    mesh.renderOrder = 4;
    return mesh;
  };
  group.add(buildSpringCascadeSheet());

  const streamWaterMat = new THREE.MeshStandardMaterial({
    color: '#46D4EC',
    emissive: '#1D8AA8',
    emissiveIntensity: 0.2,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.84,
  });
  const streamFoamMat = new THREE.MeshBasicMaterial({
    color: '#EFFCFF',
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });

  const splashPool = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.68, 0.1, 16), streamWaterMat);
  splashPool.position.set(0.32, getIslandBaseTerrainY(0.32, -15.4) + 0.06, -15.4);
  group.add(splashPool);

  const cascadeFoamRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.14, 8, 20), streamFoamMat);
  cascadeFoamRing.rotation.x = Math.PI / 2;
  cascadeFoamRing.position.set(0.15, getIslandBaseTerrainY(0.15, -15.6) + 0.11, -15.6);
  group.add(cascadeFoamRing);

  const brookCurvePts: THREE.Vector3[] = [];
  const brookSamples: [number, number][] = [
    [0.32, -15.4],
    [2.5, -14.6],
    [5.0, -13.7],
    [7.5, -13.3],
    [10.8, -13.5],
    [14.2, -14.4],
    [17.5, -15.7],
    [21.6, -17.5],
  ];
  for (const [bx, bz] of brookSamples) {
    brookCurvePts.push(new THREE.Vector3(bx, getIslandBaseTerrainY(bx, bz) + 0.09, bz));
  }
  const brookCurve = new THREE.CatmullRomCurve3(brookCurvePts);
  const brookGeo = new THREE.TubeGeometry(brookCurve, 44, 1.05, 6, false);
  brookGeo.scale(1, 0.1, 1);
  const brookPos = brookGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < brookPos.count; i++) {
    const bx = brookPos.getX(i);
    const bz = brookPos.getZ(i);
    brookPos.setY(i, getIslandBaseTerrainY(bx, bz) + 0.09);
  }
  brookGeo.computeVertexNormals();
  const streamWaterMesh = new THREE.Mesh(brookGeo, streamWaterMat);
  group.add(streamWaterMesh);

  // Sculpted Mossy Brookside Boulder Clusters along the stream banks (same crag craft as Town West River!)
  const brookBoulderGeo = mergeBufferParts([
    createSculptedCragGeo(1.3, 0.65, 0.42, 0.54, 1),
    createSculptedCragGeo(3.1, 0.38, 0.28, 0.34, 0).translate(0.45, -0.06, 0.22),
  ]);
  const brookMossGeo = createSculptedCragGeo(5.2, 0.48, 0.12, 0.4, 0).translate(0, 0.22, 0);
  const brookRockSpots: [number, number, number, boolean][] = [];
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const pt = brookCurve.getPoint(t);
    const side = i % 2 === 0 ? 1 : -1;
    // Keep walkable stone ford opening at t ~ 0.28..0.38 clear
    if (Math.abs(pt.x - 6.3) < 1.2) continue;
    const px = pt.x + side * (1.02 + (i % 3) * 0.22);
    const pz = pt.z + side * (0.95 + (i % 2) * 0.28);
    brookRockSpots.push([px, pz, 0.68 + (i % 4) * 0.16, i % 3 !== 1]);
  }
  const brookRockIM = new THREE.InstancedMesh(brookBoulderGeo, graniteMat, brookRockSpots.length);
  const brookMossList = brookRockSpots.filter(([, , , m]) => m);
  const brookMossIM = new THREE.InstancedMesh(brookMossGeo, mossCapMat, brookMossList.length);
  let bmIdx = 0;
  brookRockSpots.forEach(([rx, rz, rs, hasMoss], i) => {
    const ry = getIslandBaseTerrainY(rx, rz) + 0.06;
    _instDummy.position.set(rx, ry, rz);
    _instDummy.rotation.set(0, (i * 1.43) % (Math.PI * 2), 0);
    _instDummy.scale.setScalar(rs);
    _instDummy.updateMatrix();
    brookRockIM.setMatrixAt(i, _instDummy.matrix);
    if (hasMoss) {
      brookMossIM.setMatrixAt(bmIdx++, _instDummy.matrix);
    }
  });
  brookRockIM.instanceMatrix.needsUpdate = true;
  brookMossIM.instanceMatrix.needsUpdate = true;
  brookRockIM.computeBoundingSphere();
  brookMossIM.computeBoundingSphere();
  group.add(brookRockIM, brookMossIM);

  // Smooth Brook Pebbles & Walkable 3-Stone Ford crossing
  const pebbleMat = getMat('#C4B9A6', 0.85);
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.4) / 18;
    const pt = brookCurve.getPoint(t);
    const side = i % 2 === 0 ? -1 : 1;
    const px = pt.x + side * (0.88 + (i % 2) * 0.25);
    const pz = pt.z + side * 0.72;
    const py = getIslandBaseTerrainY(px, pz);
    const peb = new THREE.Mesh(createSculptedCragGeo(i * 0.7, 0.22, 0.1, 0.18, 0), pebbleMat);
    peb.position.set(px, py + 0.04, pz);
    peb.rotation.y = i * 0.9;
    decorGroup.add(peb);
  }
  [
    [5.8, -13.9, 0.5],
    [6.3, -13.35, 0.54],
    [6.8, -12.75, 0.48],
  ].forEach(([fx, fz, fr]) => {
    const fy = getIslandBaseTerrainY(fx, fz);
    const ford = new THREE.Mesh(new THREE.CylinderGeometry(fr, fr * 1.1, 0.16, 10), stoneMat);
    ford.position.set(fx, fy + 0.08, fz);
    decorGroup.add(ford);
  });

  // Lily Pads + Blooming Water-Lilies floating on splash pool
  const lilyMat = getMat('#5AB854', 0.65);
  [
    [0.95, -15.0, 0.29],
    [-0.12, -14.78, 0.23],
    [1.42, -15.42, 0.25],
  ].forEach(([lx, lz, lr], idx) => {
    const ly = getIslandBaseTerrainY(lx, lz) + 0.12;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(lr, lr, 0.03, 10), lilyMat);
    pad.position.set(lx, ly, lz);
    decorGroup.add(pad);
    if (idx !== 1) {
      const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), blossomPinkMat);
      lotus.scale.set(1.1, 0.7, 1.1);
      lotus.position.set(lx, ly + 0.06, lz);
      decorGroup.add(lotus);
    }
  });

  insectAnchors.push(
    {x: 1.4, y: getIslandBaseTerrainY(1.4, -14.5) + 0.22, z: -14.5, habitat: 'water_edge', zone: 'inner'},
    {x: 7.8, y: getIslandBaseTerrainY(7.8, -12.8) + 0.2, z: -12.8, habitat: 'water_edge', zone: 'outer'},
    {x: 14.5, y: getIslandBaseTerrainY(14.5, -14.0) + 0.2, z: -14.0, habitat: 'water_edge', zone: 'outer'},
    {x: -1.1, y: getIslandBaseTerrainY(-1.1, -16.2) + 0.85, z: -16.2, habitat: 'rock', zone: 'outer'},
  );

  // =========================================================================
  // 7. LUSH SCULPTED COCONUT PALMS (INSTANCED SMOOTH RINGED TRUNKS & FEATHERED FRONDS)
  // =========================================================================
  const palmGeos = createCoconutPalmGeometries();
  const palmTrunkMat = getMat('#94643E', 0.82);
  const palmRingMat = getMat('#734B2C', 0.86);
  const palmSheathMat = getMat('#459942', 0.72);
  const palmCocoMat = getMat('#664023', 0.68);
  const palmLowerFrondMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.64,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const palmUpperFrondMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.6,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const palmPlacements: [number, number, number, number][] = [
    [-15.2, -14.8, 1.15, 0.4],
    [-16.4, -5.2, 1.06, 1.2],
    [-17.2, 5.2, 1.12, -0.6],
    [-12.5, 13.8, 1.08, 2.1],
    [-6.2, 16.8, 0.98, 1.5],
    [5.4, 17.6, 1.04, -1.3],
    [16.8, 11.4, 1.14, 0.8],
    [18.2, 4.6, 1.08, -2.1],
    [16.8, -11.2, 1.02, 2.5],
    [8.2, -18.2, 1.12, -0.3],
    [-3.4, -16.8, 1.06, 0.9],
    [-18.2, -11.2, 0.96, 2.8],
    [18.8, -4.2, 0.98, 1.7],
    [-6.2, -16.8, 1.0, -1.8],
    [4.4, -10.8, 0.96, 0.25],
    [-14.6, -2.8, 1.0, 2.9],
    [9.4, 9.6, 0.96, -0.9],
    [-7.8, 11.4, 0.96, 1.1],
    [12.0, -10.6, 1.06, 0.55],
    [-18.0, 10.6, 1.0, -2.4],
    [-1.4, -10.8, 0.94, 0.7],
    [14.2, -17.8, 1.02, -0.9],
  ];

  const pCount = palmPlacements.length;
  const pTrunkIM = new THREE.InstancedMesh(palmGeos.trunkGeo, palmTrunkMat, pCount);
  const pRingIM = new THREE.InstancedMesh(palmGeos.ringGeo, palmRingMat, pCount);
  const pSheathIM = new THREE.InstancedMesh(palmGeos.sheathGeo, palmSheathMat, pCount);
  const pCocoIM = new THREE.InstancedMesh(palmGeos.coconutGeo, palmCocoMat, pCount);
  const pLowerFrondIM = new THREE.InstancedMesh(palmGeos.lowerFrondGeo, palmLowerFrondMat, pCount);
  const pUpperFrondIM = new THREE.InstancedMesh(palmGeos.upperFrondGeo, palmUpperFrondMat, pCount);

  const frondLowerTints = ['#48AD49', '#52B851', '#3E9D43', '#4EB24C'];
  const frondUpperTints = ['#66CB57', '#74D562', '#5EC251', '#6FD15E'];

  palmPlacements.forEach(([px, pz, scale, leanRot], i) => {
    const py = getIslandBaseTerrainY(px, pz) - 0.06;
    _instDummy.position.set(px, py, pz);
    _instDummy.rotation.set(0, leanRot, 0);
    _instDummy.scale.setScalar(scale);
    _instDummy.updateMatrix();

    pTrunkIM.setMatrixAt(i, _instDummy.matrix);
    pRingIM.setMatrixAt(i, _instDummy.matrix);
    pSheathIM.setMatrixAt(i, _instDummy.matrix);
    pCocoIM.setMatrixAt(i, _instDummy.matrix);
    pLowerFrondIM.setMatrixAt(i, _instDummy.matrix);
    pUpperFrondIM.setMatrixAt(i, _instDummy.matrix);

    _instColor.set(frondLowerTints[i % frondLowerTints.length]);
    pLowerFrondIM.setColorAt(i, _instColor);
    _instColor.set(frondUpperTints[i % frondUpperTints.length]);
    pUpperFrondIM.setColorAt(i, _instColor);

    colliders.push({type: 'circle', x: px, z: pz, r: 0.44 * scale});
    insectAnchors.push({
      x: px + Math.cos(leanRot) * 0.22,
      y: py + 1.32 * scale,
      z: pz + Math.sin(leanRot) * 0.22,
      habitat: 'tree',
      clingAngle: leanRot,
      zone: 'outer',
    });
  });

  [pTrunkIM, pRingIM, pSheathIM, pCocoIM, pLowerFrondIM, pUpperFrondIM].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });

  // =========================================================================
  // 8. MAIN-MAP QUALITY MEADOW GRASS, 5-PETAL WILDFLOWERS, BANANA & HIBISCUS FLORA
  // =========================================================================
  // 8A. Static Instanced Grass Blade Tufts across grassy meadow & creek banks (~175 clusters!)
  const gBladeParts: THREE.BufferGeometry[] = [];
  for (let b = 0; b < 7; b++) {
    const ang = (b / 7) * Math.PI * 2;
    const h = 0.34 + (b % 3) * 0.14;
    const blade = new THREE.ConeGeometry(0.044, h, 4);
    blade.translate(0, h / 2, 0);
    blade.rotateZ(0.28 + (b % 2) * 0.12);
    blade.rotateY(ang);
    blade.translate(Math.cos(ang) * 0.08, 0, Math.sin(ang) * 0.08);
    gBladeParts.push(blade);
  }
  const meadowGrassGeo = mergeBufferParts(gBladeParts);
  const meadowGrassMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.72});
  const grassSpots: [number, number, number][] = [];
  for (let i = 0; i < 185; i++) {
    const ang = i * 2.39996;
    const rad = 2.4 + Math.sqrt((i + 1) / 185) * 14.5;
    const gx = Math.cos(ang) * rad;
    const gz = Math.sin(ang) * rad;
    // Skip central paths, picnic deck, balloon pad, and stream channel bed
    if (Math.hypot(gx - -12.6, gz - 2.2) < 2.8) continue;
    if (Math.hypot(gx - ISLAND_BALLOON_POS.x, gz - ISLAND_BALLOON_POS.z) < 4.3) continue;
    if (Math.hypot(gx - -7.5, gz - -5.5) < 2.2) continue;
    if (Math.hypot(gx - -7.5, gz - -14.2) < 2.6) continue;
    if (gx > 0 && gx < 20 && gz < -11 && gz > -19 && getStreamChannelDistance(gx, gz) < 1.35) {
      continue;
    }
    if (getIslandBaseTerrainY(gx, gz) < 0.64) continue;
    grassSpots.push([gx, gz, 0.85 + (i % 4) * 0.14]);
  }
  const meadowGrassIM = new THREE.InstancedMesh(meadowGrassGeo, meadowGrassMat, grassSpots.length);
  const grassPalette = ['#50B354', '#63C462', '#449D4A', '#74CF6B'];
  grassSpots.forEach(([gx, gz, gs], i) => {
    const gy = getIslandBaseTerrainY(gx, gz) - 0.02;
    _instDummy.position.set(gx, gy, gz);
    _instDummy.rotation.set(0, i * 1.17, 0);
    _instDummy.scale.setScalar(gs);
    _instDummy.updateMatrix();
    meadowGrassIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(grassPalette[i % grassPalette.length]);
    meadowGrassIM.setColorAt(i, _instColor);
  });
  meadowGrassIM.instanceMatrix.needsUpdate = true;
  if (meadowGrassIM.instanceColor) meadowGrassIM.instanceColor.needsUpdate = true;
  meadowGrassIM.computeBoundingSphere();
  meadowGrassIM.userData = {noShadowBlock: true};
  group.add(meadowGrassIM);

  // 8B. Genuine 5-Petal Tropical Wildflowers (Static InstancedMesh matching Town Wildflowers!)
  const wPetalParts: THREE.BufferGeometry[] = [];
  const wCenterParts: THREE.BufferGeometry[] = [];
  append5PetalFlower(wPetalParts, wCenterParts, 0, 0.16, 0, 1.35, 0.1, 0, 0.1);
  append5PetalFlower(wPetalParts, wCenterParts, 0.11, 0.13, 0.08, 1.08, 0.18, -0.18, 0.9);
  const wfTopGeo = mergeBufferParts(wPetalParts);
  const wfCenterGeo = mergeBufferParts(wCenterParts);
  const wfColors = ['#FF7B9B', '#FFD166', '#8EE0FF', '#FFAC6A', '#FFF8E8', '#D199FF'];
  const wfSpots: [number, number, string][] = [];
  for (let i = 0; i < 120; i++) {
    const ang = i * 2.39996 + 0.55;
    const rad = 2.6 + Math.sqrt((i + 1) / 120) * 14.2;
    const fx = Math.cos(ang) * rad;
    const fz = Math.sin(ang) * rad;
    if (Math.hypot(fx - -12.6, fz - 2.2) < 2.9) continue;
    if (Math.hypot(fx - ISLAND_BALLOON_POS.x, fz - ISLAND_BALLOON_POS.z) < 4.4) continue;
    if (Math.hypot(fx - -7.5, fz - -5.5) < 2.3) continue;
    if (gxCloseToBrook(fx, fz)) continue;
    if (getIslandBaseTerrainY(fx, fz) < 0.66) continue;
    wfSpots.push([fx, fz, wfColors[i % wfColors.length]]);
  }
  function gxCloseToBrook(x: number, z: number) {
    return x > -0.2 && x < 20 && z < -11 && z > -19 && getStreamChannelDistance(x, z) < 1.3;
  }
  const wfTopIM = new THREE.InstancedMesh(
    wfTopGeo,
    new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.48}),
    wfSpots.length,
  );
  const wfCenterIM = new THREE.InstancedMesh(
    wfCenterGeo,
    getMat('#FFD24C', 0.42),
    wfSpots.length,
  );
  wfSpots.forEach(([fx, fz, col], i) => {
    const fy = getIslandBaseTerrainY(fx, fz) - 0.01;
    _instDummy.position.set(fx, fy, fz);
    _instDummy.rotation.set(0, i * 0.9, 0);
    _instDummy.scale.setScalar(0.95 + (i % 3) * 0.16);
    _instDummy.updateMatrix();
    wfTopIM.setMatrixAt(i, _instDummy.matrix);
    wfCenterIM.setMatrixAt(i, _instDummy.matrix);
    _instColor.set(col);
    wfTopIM.setColorAt(i, _instColor);
  });
  wfTopIM.instanceMatrix.needsUpdate = true;
  wfCenterIM.instanceMatrix.needsUpdate = true;
  if (wfTopIM.instanceColor) wfTopIM.instanceColor.needsUpdate = true;
  wfTopIM.computeBoundingSphere();
  wfCenterIM.computeBoundingSphere();
  wfTopIM.userData = {noShadowBlock: true};
  wfCenterIM.userData = {noShadowBlock: true};
  group.add(wfTopIM, wfCenterIM);

  // 8C. Sculpted Broadleaf Banana & Tropical Bird-of-Paradise Clumps (curved leaf geometry!)
  const bananaStemParts: THREE.BufferGeometry[] = [];
  const bananaLeafParts: THREE.BufferGeometry[] = [];
  const bStem = new THREE.CylinderGeometry(0.11, 0.17, 0.92, 7);
  bStem.translate(0, 0.44, 0);
  bananaStemParts.push(bStem);
  for (let l = 0; l < 6; l++) {
    const a = (l / 6) * Math.PI * 2;
    const leafBlade = createCurvedLeafBladeGeo(1.22, 0.44, 0.22, 0.36, 0.055);
    leafBlade.rotateX(-0.34 + (l % 2) * 0.14);
    leafBlade.rotateY(a);
    leafBlade.translate(0, 0.72 + (l % 2) * 0.12, 0);
    bananaLeafParts.push(leafBlade);
  }
  const bananaStemGeo = mergeBufferParts(bananaStemParts);
  const bananaLeafGeo = mergeBufferParts(bananaLeafParts);
  const bananaSpots: [number, number, number][] = [
    [-12.2, -13.2, 1.05],
    [-2.8, -13.6, 0.95],
    [1.8, -12.6, 0.9],
    [-16.2, -1.8, 1.08],
    [15.6, -9.2, 0.96],
    [16.2, 1.4, 1.0],
    [-5.0, -2.8, 0.86],
    [-10.4, 8.8, 0.95],
    [7.2, 4.8, 0.92],
  ];
  const banStemIM = new THREE.InstancedMesh(bananaStemGeo, getMat('#74A54D', 0.76), bananaSpots.length);
  const banLeafIM = new THREE.InstancedMesh(
    bananaLeafGeo,
    new THREE.MeshStandardMaterial({color: '#52BE54', roughness: 0.62, side: THREE.DoubleSide}),
    bananaSpots.length,
  );
  bananaSpots.forEach(([bx, bz, bs], i) => {
    const by = getIslandBaseTerrainY(bx, bz) - 0.02;
    _instDummy.position.set(bx, by, bz);
    _instDummy.rotation.set(0, i * 1.3, 0);
    _instDummy.scale.setScalar(bs);
    _instDummy.updateMatrix();
    banStemIM.setMatrixAt(i, _instDummy.matrix);
    banLeafIM.setMatrixAt(i, _instDummy.matrix);
    colliders.push({type: 'circle', x: bx, z: bz, r: 0.45 * bs});
  });
  banStemIM.instanceMatrix.needsUpdate = true;
  banLeafIM.instanceMatrix.needsUpdate = true;
  group.add(banStemIM, banLeafIM);

  // 8D. Sculpted Fern Rosettes (curved leaflets instead of stiff bars)
  const fernRosetteParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const fBlade = createCurvedLeafBladeGeo(0.72, 0.22, 0.14, 0.22, 0.03);
    fBlade.rotateX(-0.26);
    fBlade.rotateY(a);
    fBlade.translate(0, 0.06, 0);
    fernRosetteParts.push(fBlade);
  }
  const fernRosetteGeo = mergeBufferParts(fernRosetteParts);
  const fernSpots: [number, number, number][] = [
    [1.2, -13.6, 1.08],
    [4.4, -12.2, 1.0],
    [9.2, -12.4, 1.12],
    [13.4, -12.8, 0.96],
    [-2.2, -15.2, 1.15],
    [-9.2, -4.6, 0.95],
    [-5.8, -4.6, 0.95],
    [-14.2, -0.8, 0.96],
    [-15.4, 4.2, 1.05],
    [-10.0, 7.2, 0.95],
    [-4.8, 6.2, 0.92],
    [3.5, 6.8, 1.0],
    [11.0, 7.6, 0.96],
    [13.8, 10.6, 0.95],
    [4.8, 15.2, 1.0],
    [-8.6, 15.6, 1.02],
  ];
  const fernIM = new THREE.InstancedMesh(
    fernRosetteGeo,
    new THREE.MeshStandardMaterial({color: '#46A448', roughness: 0.7, side: THREE.DoubleSide}),
    fernSpots.length,
  );
  fernSpots.forEach(([fx, fz, fs], i) => {
    const fy = getIslandBaseTerrainY(fx, fz) - 0.01;
    _instDummy.position.set(fx, fy, fz);
    _instDummy.rotation.set(0, i * 1.1, 0);
    _instDummy.scale.setScalar(fs);
    _instDummy.updateMatrix();
    fernIM.setMatrixAt(i, _instDummy.matrix);
  });
  fernIM.instanceMatrix.needsUpdate = true;
  group.add(fernIM);

  // 8E. Plush Multi-Lobe Flowering Hibiscus Bushes with Genuine 5-Petal Blossoms!
  const bushGreenMat1 = getMat('#4DAA4E', 0.78);
  const bushGreenMat2 = getMat('#61BE55', 0.76);
  const hibiscusColors = ['#FF6B8B', '#FFD166', '#F472B6', '#FB923C', '#FFF3B0'];
  const bushCoords: [number, number, number][] = [
    [-12.4, -14.2, 1.05],
    [-4.4, -14.4, 0.95],
    [-15.8, -3.4, 1.08],
    [-8.0, 6.8, 1.0],
    [-8.6, 9.2, 0.92],
    [-3.6, -1.6, 0.95],
    [3.2, -16.8, 1.05],
    [6.6, -9.2, 1.02],
    [7.2, 6.2, 1.08],
    [11.6, 6.8, 0.98],
    [16.0, 2.2, 1.05],
    [16.2, -8.8, 1.0],
    [6.2, 13.4, 0.95],
    [-4.8, 14.2, 1.02],
    [-14.2, 9.8, 1.1],
    [-17.2, -8.6, 0.95],
    [15.6, 8.6, 0.98],
    [3.8, -5.8, 0.92],
    [-1.4, -8.6, 1.04],
    [10.2, 3.2, 0.96],
    [12.8, -17.2, 0.96],
    [-0.6, -12.6, 0.92],
  ];

  const bPetalGeos: THREE.BufferGeometry[] = [];
  const bCenterGeos: THREE.BufferGeometry[] = [];
  const bushLeafParts1: THREE.BufferGeometry[] = [];
  bushLeafParts1.push(new THREE.SphereGeometry(0.62, 9, 7).scale(1.15, 0.78, 1.05).translate(0, 0.34, 0));
  bushLeafParts1.push(new THREE.SphereGeometry(0.45, 8, 6).translate(0.35, 0.28, 0.22));
  bushLeafParts1.push(new THREE.SphereGeometry(0.4, 8, 6).translate(-0.32, 0.26, -0.22));
  const bushCanopyGeo = mergeBufferParts(bushLeafParts1);
  for (let f = 0; f < 5; f++) {
    const fa = (f / 5) * Math.PI * 2;
    append5PetalFlower(
      bPetalGeos,
      bCenterGeos,
      Math.cos(fa) * 0.44,
      0.56 + (f % 2) * 0.12,
      Math.sin(fa) * 0.44,
      1.35,
      Math.sin(fa) * 0.25,
      -Math.cos(fa) * 0.25,
      fa,
    );
  }
  const bushPetalGeo = mergeBufferParts(bPetalGeos);
  const bushCenterGeo = mergeBufferParts(bCenterGeos);

  const bushCanopyIM = new THREE.InstancedMesh(
    bushCanopyGeo,
    new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.76}),
    bushCoords.length,
  );
  const bushPetalIM = new THREE.InstancedMesh(
    bushPetalGeo,
    new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.5}),
    bushCoords.length,
  );
  const bushCenterIM = new THREE.InstancedMesh(bushCenterGeo, getMat('#FFE46B', 0.45), bushCoords.length);
  bushCoords.forEach(([bx, bz, bs], idx) => {
    const by = getIslandBaseTerrainY(bx, bz);
    _instDummy.position.set(bx, by, bz);
    _instDummy.rotation.set(0, idx * 1.15, 0);
    _instDummy.scale.setScalar(bs);
    _instDummy.updateMatrix();
    bushCanopyIM.setMatrixAt(idx, _instDummy.matrix);
    bushPetalIM.setMatrixAt(idx, _instDummy.matrix);
    bushCenterIM.setMatrixAt(idx, _instDummy.matrix);

    _instColor.set(idx % 2 === 0 ? '#4DAA4E' : '#61BE55');
    bushCanopyIM.setColorAt(idx, _instColor);
    _instColor.set(hibiscusColors[idx % hibiscusColors.length]);
    bushPetalIM.setColorAt(idx, _instColor);

    colliders.push({type: 'circle', x: bx, z: bz, r: 0.65 * bs});
    insectAnchors.push({
      x: bx,
      y: by + 0.92 * bs,
      z: bz,
      habitat: idx % 2 === 0 ? 'flower' : 'bush',
      zone: 'inner',
    });
  });
  [bushCanopyIM, bushPetalIM, bushCenterIM].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    group.add(im);
  });
  void bushGreenMat1;
  void bushGreenMat2;

  // Coastal Sculpted Boulders, Moss Caps & Coral Tide-Pool Reefs
  const rockCoords: [number, number, number, number][] = [
    [-19.5, -16.8, 1.55, 0.3],
    [-21.2, -14.8, 1.1, 1.1],
    [-22.6, 2.5, 1.35, 0.7],
    [-21.8, 13.8, 1.25, 2.0],
    [22.4, 8.2, 1.4, 0.9],
    [23.2, -10.5, 1.6, 1.5],
    [16.2, -19.8, 1.35, 2.2],
    [-6.2, -21.4, 1.45, 0.4],
    [8.2, 20.5, 0.95, 1.4],
    [-9.5, 20.8, 1.05, 0.2],
    [25.0, -1.8, 0.9, 1.9],
    [-24.6, -6.2, 1.15, 2.6],
    [20.4, 16.5, 1.15, 0.8],
    [-18.8, 17.2, 1.05, 1.7],
  ];
  rockCoords.forEach(([rx, rz, rs, ry], idx) => {
    const rHeight = getIslandBaseTerrainY(rx, rz);
    const rock = new THREE.Mesh(
      createSculptedCragGeo(idx * 1.4, 0.95 * rs, 0.62 * rs, 0.86 * rs, 1),
      idx % 2 === 0 ? graniteMat : slateMat,
    );
    rock.position.set(rx, rHeight + 0.2 * rs, rz);
    rock.rotation.y = ry;
    decorGroup.add(rock);

    if (idx % 2 === 0 && rHeight > 0.1) {
      const cap = new THREE.Mesh(
        createSculptedCragGeo(idx * 1.4 + 2.5, 0.72 * rs, 0.18 * rs, 0.65 * rs, 0),
        mossCapMat,
      );
      cap.position.set(rx, rHeight + 0.48 * rs, rz);
      cap.rotation.y = ry;
      decorGroup.add(cap);
    }

    colliders.push({type: 'circle', x: rx, z: rz, r: 0.78 * rs});
    if (idx % 3 === 0) {
      insectAnchors.push({
        x: rx,
        y: rHeight + 0.78 * rs,
        z: rz,
        habitat: 'rock',
        zone: 'outer',
      });
    }
  });

  // Starfish, Shells & Shallow Coral Reefs
  const starfishMat = getMat('#FF7D5C', 0.62);
  const shellMat = getMat('#FFF0DF', 0.52);
  const coralPinkMat = getMat('#F6869F', 0.64);
  const coralGoldMat = getMat('#F6BD60', 0.64);
  [
    [4.2, 22.8],
    [-5.8, 22.2],
    [14.4, 18.8],
    [-15.6, 17.8],
    [20.2, 11.4],
    [-20.5, 10.8],
    [19.5, -13.5],
    [-19.2, -12.6],
    [23.8, 3.2],
    [-23.6, -1.8],
  ].forEach(([sx, sz], i) => {
    const sy = getIslandBaseTerrainY(sx, sz);
    const item = new THREE.Mesh(
      i % 2 === 0
        ? new THREE.CylinderGeometry(0.2, 0.24, 0.06, 5)
        : new THREE.SphereGeometry(0.16, 8, 6),
      i % 2 === 0 ? starfishMat : shellMat,
    );
    item.position.set(sx, sy + 0.03, sz);
    item.rotation.y = i * 1.1;
    item.scale.set(1.15, 0.55, 1.0);
    decorGroup.add(item);
  });

  [
    [-10.5, 24.5],
    [11.2, 23.8],
    [24.2, -6.5],
    [-25.4, 7.2],
  ].forEach(([cx, cz], idx) => {
    const cy = getIslandBaseTerrainY(cx, cz);
    const coral = new THREE.Mesh(
      createSculptedCragGeo(idx + 5, 0.55, 0.35, 0.45, 0),
      idx % 2 === 0 ? coralPinkMat : coralGoldMat,
    );
    coral.position.set(cx, cy + 0.16, cz);
    decorGroup.add(coral);
  });

  // =========================================================================
  // 9. SINGLE ULTRA-DETAILED PICNIC FEAST BLANKET & HANGING FESTOON LIGHTS (NO TENT!)
  // =========================================================================
  const picX = -12.8;
  const picZ = 2.1;
  const picY = getIslandBaseTerrainY(picX, picZ);
  const picnicGroup = new THREE.Group();
  picnicGroup.position.set(picX, picY, picZ);
  const picRotY = 0.24;
  picnicGroup.rotation.y = picRotY;

  // Warm slatted timber mat underlay + wide Coral-Cream checkered picnic blanket with fringe tassels
  const matUnderlay = new THREE.Mesh(
    new RoundedBoxGeometry(3.45, 0.05, 2.85, 2, 0.02),
    houseDeckMat,
  );
  matUnderlay.position.y = 0.025;
  picnicGroup.add(matUnderlay);

  const rugMain = new THREE.Mesh(
    new RoundedBoxGeometry(3.15, 0.045, 2.55, 2, 0.02),
    fabricCreamMat,
  );
  rugMain.position.y = 0.06;
  picnicGroup.add(rugMain);

  // Crisp woven coral gingham stripe bands + tassels at both blanket edges
  [-0.78, 0, 0.78].forEach((bz) => {
    const hBand = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.05, 0.34), fabricCoralMat);
    hBand.position.set(0, 0.062, bz);
    picnicGroup.add(hBand);
  });
  [-0.96, 0, 0.96].forEach((bx) => {
    const vBand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.052, 2.56), getMat('#F8B195', 0.74));
    vBand.position.set(bx, 0.063, 0);
    picnicGroup.add(vBand);
  });
  for (let fr = -6; fr <= 6; fr++) {
    for (const sideX of [-1.62, 1.62]) {
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), fabricCreamMat);
      tassel.rotation.z = Math.PI / 2;
      tassel.position.set(sideX, 0.05, fr * 0.19);
      picnicGroup.add(tassel);
    }
  }

  // Central Low Bamboo Picnic Feast Table
  const pTblTop = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.07, 1.05, 2, 0.03), houseRailMat);
  pTblTop.position.set(0, 0.32, 0);
  for (const [lx, lz] of [
    [-0.58, -0.4],
    [0.58, -0.4],
    [-0.58, 0.4],
    [0.58, 0.4],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 6), housePostMat);
    leg.position.set(lx, 0.19, lz);
    picnicGroup.add(leg);
  }
  const laceRunner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.015, 1.08), fabricCreamMat);
  laceRunner.position.set(0, 0.36, 0);
  picnicGroup.add(pTblTop, laceRunner);

  // Feast Goodies atop the Low Picnic Table & Blanket Corners:
  // 1) Open Wicker Hamper with French Baguettes & Linen Cloth
  const hamperBox = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.32, 0.38, 2, 0.05), bWickerMat);
  hamperBox.position.set(-0.96, 0.24, -0.76);
  const hamperLid = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.06, 0.38, 2, 0.03), bWickerMat);
  hamperLid.position.set(-0.96, 0.44, -0.96);
  hamperLid.rotation.x = -0.95;
  const baguette1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 7), getMat('#DDA15E', 0.65));
  baguette1.rotation.set(0.35, 0.2, 0.28);
  baguette1.position.set(-0.88, 0.42, -0.72);
  picnicGroup.add(hamperBox, hamperLid, baguette1);

  // 2) Strawberry Cake & Croissant Platter + Watermelon Wedges
  const pCakePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.03, 12), fabricCreamMat);
  pCakePlate.position.set(-0.24, 0.37, -0.1);
  const pCake = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.11, 10), getMat('#FFE4EC', 0.55));
  pCake.position.set(-0.24, 0.43, -0.1);
  const pBerry = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), getMat('#FF4D6D', 0.45));
  pBerry.position.set(-0.24, 0.5, -0.1);
  const fruitPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.03, 12), fabricCreamMat);
  fruitPlate.position.set(0.32, 0.37, 0.15);
  const melon1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), getMat('#FF6B6B', 0.52));
  melon1.rotation.z = Math.PI / 2;
  melon1.position.set(0.28, 0.42, 0.14);
  const orange = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 6), getMat('#FFA94D', 0.52));
  orange.position.set(0.38, 0.42, 0.2);
  picnicGroup.add(pCakePlate, pCake, pBerry, fruitPlate, melon1, orange);

  // 3) Glass Lemonade Pitcher + 2 Tumblers with Straws + Porcelain Teapot
  const pitcherGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.105, 0.22, 10),
    glossyClayMat('#FFF275', 0.2),
  );
  pitcherGlass.position.set(0.28, 0.47, -0.2);
  for (const [gx, gz] of [
    [-0.1, 0.26],
    [0.08, 0.28],
  ]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.12, 8), glossyClayMat('#B5EAEA', 0.25));
    cup.position.set(gx, 0.42, gz);
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), fabricCoralMat);
    straw.position.set(gx + 0.02, 0.48, gz);
    straw.rotation.z = -0.22;
    picnicGroup.add(cup, straw);
  }
  const pKettle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), fabricTealMat);
  pKettle.position.set(-0.42, 0.44, 0.18);
  picnicGroup.add(pitcherGlass, pKettle);

  // 4) Acoustic Guitar on Wooden Rest beside Picnic Blanket corner
  const gStand = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.16, 0.28, 2, 0.03), housePostMat);
  gStand.position.set(1.12, 0.15, -0.78);
  const gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, 0.1, 10), houseRailMat);
  gBody.rotation.x = Math.PI / 2 - 0.32;
  gBody.position.set(1.12, 0.34, -0.78);
  const gNeck = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.52, 0.05, 1, 0.01), housePostMat);
  gNeck.position.set(1.12, 0.64, -0.86);
  gNeck.rotation.x = -0.32;
  picnicGroup.add(gStand, gBody, gNeck);

  // 4 Plush Quilted Floor Cushion Poufs (clickable seats directly on the picnic rug!)
  const cosP = Math.cos(picRotY);
  const sinP = Math.sin(picRotY);
  const cushionLocalOffsets: [number, number, number, string][] = [
    [0, 0.92, Math.PI, '#57C1B8'],
    [0, -0.92, 0, '#F2846E'],
    [-1.12, 0.1, Math.PI / 2, '#FFD166'],
    [1.12, 0.1, -Math.PI / 2, '#95D5B2'],
  ];
  const picnicSeatSlots: Array<{
    seatX: number;
    seatZ: number;
    seatY: number;
    sitRotY: number;
    tx: number;
    tz: number;
  }> = [];

  cushionLocalOffsets.forEach(([ox, oz, localYaw, colHex]) => {
    const poufBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.16, 12),
      getMat(colHex, 0.72),
    );
    poufBase.position.set(ox, 0.16, oz);
    const poufPiping = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 6, 14),
      fabricCreamMat,
    );
    poufPiping.rotation.x = Math.PI / 2;
    poufPiping.position.set(ox, 0.23, oz);
    const poufBtn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), fabricCreamMat);
    poufBtn.position.set(ox, 0.245, oz);
    picnicGroup.add(poufBase, poufPiping, poufBtn);

    const worldSeatX = picX + ox * cosP + oz * sinP;
    const worldSeatZ = picZ - ox * sinP + oz * cosP;
    const standOff = 1.65;
    picnicSeatSlots.push({
      seatX: worldSeatX,
      seatZ: worldSeatZ,
      seatY: picY + 0.25,
      sitRotY: picRotY + localYaw,
      tx: picX + (ox * 1.45) * cosP + (oz * 1.45) * sinP + (ox === 0 ? 0 : Math.sign(ox) * standOff * 0.4),
      tz: picZ - (ox * 1.45) * sinP + (oz * 1.45) * cosP + (oz === 0 ? 0 : Math.sign(oz) * standOff * 0.4),
    });
  });

  decorGroup.add(picnicGroup);
  colliders.push({type: 'box', id: 'island_picnic_table', x: picX, z: picZ, hw: 0.85, hd: 0.65, rotY: picRotY});

  addBoxProxy(
    group,
    [3.2, 0.9, 2.6],
    [picX, picY + 0.4, picZ],
    {
      kind: 'bench',
      seatSlots: picnicSeatSlots,
      seatX: picnicSeatSlots[0].seatX,
      seatZ: picnicSeatSlots[0].seatZ,
      seatY: picnicSeatSlots[0].seatY,
      sitRotY: picnicSeatSlots[0].sitRotY,
      tx: picnicSeatSlots[0].tx,
      tz: picnicSeatSlots[0].tz,
    },
    clickTargets,
  );

  // Cozy Glade Kettle Campfire beside Picnic Zone at (-10.2, 5.4) (kept warm!)
  const campX = -10.2;
  const campZ = 5.4;
  const campY = getIslandBaseTerrainY(campX, campZ);
  const campCircleGroup = new THREE.Group();
  campCircleGroup.position.set(campX, campY, campZ);

  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const st = new THREE.Mesh(createSculptedCragGeo(s * 0.9, 0.2, 0.14, 0.18, 0), graniteMat);
    st.position.set(campX + Math.cos(a) * 0.68, campY + 0.07, campZ + Math.sin(a) * 0.68);
    decorGroup.add(st);
  }
  const cLog1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.92, 7), housePostMat);
  cLog1.rotation.z = Math.PI / 2;
  cLog1.rotation.y = 0.5;
  cLog1.position.y = 0.1;
  const cLog2 = cLog1.clone();
  cLog2.rotation.y = -0.6;
  for (let p = 0; p < 3; p++) {
    const a = (p / 3) * Math.PI * 2 + 0.3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6), housePostMat);
    leg.position.set(Math.cos(a) * 0.44, 0.7, Math.sin(a) * 0.44);
    leg.rotation.z = Math.cos(a) * 0.36;
    leg.rotation.x = -Math.sin(a) * 0.36;
    campCircleGroup.add(leg);
  }
  const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), getMat('#3A434D', 0.45, 0.42));
  kettle.position.set(0, 0.9, 0);
  const campFlameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.56, 8),
    new THREE.MeshStandardMaterial({
      color: '#FF9240',
      emissive: '#FF5E1A',
      emissiveIntensity: 0.95,
      roughness: 0.4,
    }),
  );
  campFlameMesh.position.y = 0.36;
  campCircleGroup.add(cLog1, cLog2, kettle, campFlameMesh);
  group.add(campCircleGroup);
  colliders.push({type: 'circle', id: 'island_camp_circle_fire', x: campX, z: campZ, r: 0.85});

  // Warm Festoon String Lights with Actual Draped Wire Cords over the Picnic Glade
  const postPos: [number, number][] = [
    [-15.2, 0.2],
    [-10.4, 1.4],
    [-12.2, 5.8],
  ];
  postPos.forEach(([px, pz]) => {
    const py = getIslandBaseTerrainY(px, pz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.55, 7), housePostMat);
    post.position.set(px, py + 1.25, pz);
    decorGroup.add(post);
  });
  const wireMat = getMat('#2F3640', 0.7);
  for (let i = 0; i < 2; i++) {
    const [ax, az] = postPos[i];
    const [bx, bz] = postPos[i + 1];
    const ay = getIslandBaseTerrainY(ax, az) + 2.42;
    const by = getIslandBaseTerrainY(bx, bz) + 2.42;
    const wirePts: THREE.Vector3[] = [];
    for (let b = 0; b <= 6; b++) {
      const t = b / 6;
      const lx = THREE.MathUtils.lerp(ax, bx, t);
      const lz = THREE.MathUtils.lerp(az, bz, t);
      const sag = Math.sin(t * Math.PI) * 0.26;
      const ly = THREE.MathUtils.lerp(ay, by, t) - sag;
      wirePts.push(new THREE.Vector3(lx, ly, lz));
      if (b > 0 && b < 6) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), lanternGlowMat);
        bulb.position.set(lx, ly - 0.06, lz);
        decorGroup.add(bulb);
      }
    }
    const wireGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), 14, 0.015, 4, false);
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    decorGroup.add(wireMesh);
  }

  // =========================================================================
  // 10. SINGLE BEACH SUN LOUNGER + SMALL UMBRELLA + SIDE TABLE W/ LEMONADE,
  //     MAIN-MAP INTERACTIVE BBQ GRILL + 2 CARVED BARK LOG BENCHES & SW BONFIRE
  // =========================================================================
  const louX = 14.2;
  const louZ = 14.2;
  const louY = getIslandBaseTerrainY(louX, louZ);
  const louRotY = -0.58;
  const cosL = Math.cos(louRotY);
  const sinL = Math.sin(louRotY);
  const toLouWorld = (lx: number, lz: number) => ({
    wx: louX + lx * cosL + lz * sinL,
    wz: louZ - lx * sinL + lz * cosL,
  });

  const loungeGroup = new THREE.Group();
  loungeGroup.position.set(louX, louY, louZ);
  loungeGroup.rotation.y = louRotY;

  // 1) Sun Lounger Frame (4 timber legs + slatted teak deck + plush turquoise cushion top at y=0.43 + pillow at localZ=-0.78)
  for (const [lx, lz] of [
    [-0.4, -0.84],
    [0.4, -0.84],
    [-0.4, 0.84],
    [0.4, 0.84],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.24, 7), housePostMat);
    leg.position.set(lx, 0.12, lz);
    loungeGroup.add(leg);
  }
  const loungerFrame = new THREE.Mesh(
    new RoundedBoxGeometry(1.02, 0.12, 2.2, 2, 0.04),
    houseRailMat,
  );
  loungerFrame.position.set(0, 0.27, -0.06);
  const loungerCushion = new THREE.Mesh(
    new RoundedBoxGeometry(0.92, 0.14, 2.08, 3, 0.05),
    fabricTealMat,
  );
  loungerCushion.position.set(0, 0.36, -0.06); // cushion top surface = 0.43
  // Soft headrest pillow placed cleanly at localZ = -0.75 matching sleepAnchor head center
  const loungerPillow = new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 0.11, 0.4, 3, 0.045),
    fabricCreamMat,
  );
  loungerPillow.position.set(0, 0.45, -0.75);
  loungeGroup.add(loungerFrame, loungerCushion, loungerPillow);

  // 2) Small Sun Umbrella ("Cây Dù Nhỏ Che Nắng") beside upper-right side
  const umbLocalX = 0.96;
  const umbLocalZ = -0.68;
  const beachUmbBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.24, 0.09, 10),
    getMat('#E4DEC8', 0.72),
  );
  beachUmbBase.position.set(umbLocalX, 0.045, umbLocalZ);
  const beachUmbPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.042, 2.05, 8),
    housePostMat,
  );
  beachUmbPole.position.set(umbLocalX, 1.05, umbLocalZ);
  const beachUmbPivot = new THREE.Group();
  beachUmbPivot.position.set(umbLocalX, 2.05, umbLocalZ);
  beachUmbPivot.rotation.set(0.06, 0, 0.12);
  const beachUmbSliceA = (Math.PI * 2) / 8;
  for (let g = 0; g < 8; g++) {
    const gore = new THREE.Mesh(
      new THREE.ConeGeometry(1.12, 0.36, 3, 1, false, g * beachUmbSliceA, beachUmbSliceA + 0.02),
      g % 2 === 0 ? fabricCoralMat : fabricCreamMat,
    );
    beachUmbPivot.add(gore);
  }
  const beachUmbCap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), housePostMat);
  beachUmbCap.position.y = 0.2;
  beachUmbPivot.add(beachUmbCap);
  loungeGroup.add(beachUmbBase, beachUmbPole, beachUmbPivot);

  // 3) Small Round Beach Side Table + Refreshing Glass of Lemonade ("Bàn Nhỏ & Ly Nước Chanh")
  const tblLocalX = 0.96;
  const tblLocalZ = 0.26;
  const tblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.055, 14), houseRailMat);
  tblTop.position.set(tblLocalX, 0.44, tblLocalZ);
  const tblStem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.42, 8), housePostMat);
  tblStem.position.set(tblLocalX, 0.21, tblLocalZ);
  const tblFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 10), housePostMat);
  tblFoot.position.set(tblLocalX, 0.025, tblLocalZ);

  const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.018, 10), bWickerMat);
  coaster.position.set(tblLocalX, 0.475, tblLocalZ);
  const lemonGlassOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.068, 0.22, 12),
    new THREE.MeshStandardMaterial({
      color: '#EBF9FF',
      roughness: 0.15,
      metalness: 0.08,
      transparent: true,
      opacity: 0.56,
    }),
  );
  lemonGlassOuter.position.set(tblLocalX, 0.59, tblLocalZ);
  const lemonadeFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.076, 0.058, 0.16, 10),
    glossyClayMat('#FFE247', 0.22),
  );
  lemonadeFill.position.set(tblLocalX, 0.565, tblLocalZ);
  const iceCube = new THREE.Mesh(
    new RoundedBoxGeometry(0.048, 0.048, 0.048, 1, 0.01),
    glossyClayMat('#E8FCFF', 0.18),
  );
  iceCube.rotation.set(0.35, 0.4, 0.2);
  iceCube.position.set(tblLocalX - 0.015, 0.635, tblLocalZ + 0.01);
  // Cute yellow lemon slice perched on rim + striped coral straw
  const lemonSlice = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.056, 0.022, 10),
    getMat('#FFD426', 0.45),
  );
  lemonSlice.rotation.z = Math.PI / 2 - 0.25;
  lemonSlice.position.set(tblLocalX + 0.078, 0.695, tblLocalZ);
  const lemonStraw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.26, 6),
    fabricCoralMat,
  );
  lemonStraw.rotation.z = -0.26;
  lemonStraw.position.set(tblLocalX + 0.03, 0.69, tblLocalZ - 0.015);
  loungeGroup.add(
    tblTop,
    tblStem,
    tblFoot,
    coaster,
    lemonGlassOuter,
    lemonadeFill,
    iceCube,
    lemonSlice,
    lemonStraw,
  );

  decorGroup.add(loungeGroup);

  const sleepAnchorWorld = toLouWorld(0, 0.54);
  const standAnchorWorld = toLouWorld(-1.12, 0.25);
  const umbWorld = toLouWorld(umbLocalX, umbLocalZ);
  const tblWorld = toLouWorld(tblLocalX, tblLocalZ);

  colliders.push(
    {type: 'box', id: 'island_beach_lounger', x: louX, z: louZ, hw: 0.56, hd: 1.14, rotY: louRotY},
    {type: 'circle', id: 'island_beach_umbrella', x: umbWorld.wx, z: umbWorld.wz, r: 0.24},
    {type: 'circle', id: 'island_beach_side_table', x: tblWorld.wx, z: tblWorld.wz, r: 0.36},
  );
  addBoxProxy(
    group,
    [1.35, 0.95, 2.35],
    [louX, louY + 0.48, louZ],
    {
      kind: 'bed',
      seatX: sleepAnchorWorld.wx,
      seatZ: sleepAnchorWorld.wz,
      seatY: louY + 0.43,
      sitRotY: louRotY,
      tx: standAnchorWorld.wx,
      tz: standAnchorWorld.wz,
      sleepMessage: 'Nằm thư giãn ngắm biển & thưởng thức nước chanh mát lạnh! (+Năng lượng)',
    },
    clickTargets,
  );

  // Interactive Outdoor BBQ Grill ("Lò Nướng BBQ" — identical to Main Map!) at (9.0, 17.8)
  const grillX = 9.0;
  const grillZ = 17.8;
  const grillY = getIslandBaseTerrainY(grillX, grillZ);
  const grillRotY = 0.28;
  const grillGroup = new THREE.Group();
  grillGroup.position.set(grillX, grillY, grillZ);
  grillGroup.rotation.y = grillRotY;

  const bbqIronMat = getMat('#2F3540', 0.45, 0.55);
  const bbqSteelMat = getMat('#B7C0CC', 0.35, 0.68);
  const bbqShelfMat = getMat('#BA8551', 0.72);
  const grillEmberMat = new THREE.MeshStandardMaterial({
    color: '#3A1F14',
    emissive: '#E54E1E',
    emissiveIntensity: 0.85,
    roughness: 0.8,
  });

  const bbqBasin = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.34, 0.84, 2, 0.05), bbqIronMat);
  bbqBasin.position.y = 0.86;
  const coalBed = new THREE.Mesh(new RoundedBoxGeometry(1.26, 0.08, 0.68, 1, 0.02), grillEmberMat);
  coalBed.position.y = 0.98;
  const grateFrame = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.04, 0.74, 1, 0.01), bbqSteelMat);
  grateFrame.position.y = 1.05;
  [-0.58, 0.58].forEach((lx) => {
    [-0.32, 0.32].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.74, 7), bbqIronMat);
      leg.position.set(lx, 0.37, lz);
      grillGroup.add(leg);
    });
  });
  const sideShelf = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.06, 0.72, 2, 0.02), bbqShelfMat);
  sideShelf.position.set(-0.98, 0.84, 0);
  const gSkewer = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.11, 0.14, 2, 0.04), getMat('#B54935', 0.55));
  gSkewer.position.set(-0.28, 1.12, 0.08);
  const gCorn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.28, 8), getMat('#F5C836', 0.45));
  gCorn.rotation.z = Math.PI / 2;
  gCorn.position.set(0.28, 1.12, -0.08);
  const gSausage = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), getMat('#C84D3C', 0.48));
  gSausage.rotation.z = Math.PI / 2;
  gSausage.position.set(0.18, 1.11, 0.18);
  grillGroup.add(bbqBasin, coalBed, grateFrame, sideShelf, gSkewer, gCorn, gSausage);

  mergeStaticGroupByMaterial(grillGroup, new Set([coalBed]));
  group.add(grillGroup);
  colliders.push({
    type: 'box',
    id: 'island_beach_grill',
    x: grillX,
    z: grillZ,
    hw: 1.05,
    hd: 0.62,
    rotY: grillRotY,
  });
  addBoxProxy(
    group,
    [2.2, 1.65, 1.3],
    [grillX, grillY + 0.75, grillZ],
    {
      kind: 'campsite_bbq',
      tx: grillX - 0.85,
      tz: grillZ + 1.25,
    },
    clickTargets,
  );

  // Two Sit-able Carved Bark Log Benches (identical style to Main Map, 2 seats per log!)
  const logBarkMat = getMat('#7C4E2C', 0.8);
  const logRingMat = getMat('#DFBA88', 0.72);
  [
    {id: 'island_grill_log_0', lx: 6.7, lz: 19.65},
    {id: 'island_grill_log_1', lx: 11.05, lz: 19.75},
  ].forEach(({id, lx, lz}) => {
    const ly = getIslandBaseTerrainY(lx, lz);
    const rotY = Math.atan2(grillX - lx, grillZ - lz);
    const logGroup = new THREE.Group();
    logGroup.position.set(lx, ly, lz);
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
      const chock = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.42, 2, 0.03), graniteMat);
      chock.position.set(cx, 0.06, 0);
      logGroup.add(chock);
    });
    logGroup.add(trunk);

    const cosLog = Math.cos(rotY);
    const sinLog = Math.sin(rotY);
    const seatSlots = [-0.62, 0.62].map((localOffsetX) => {
      const sx = lx + localOffsetX * cosLog;
      const sz = lz - localOffsetX * sinLog;
      return {
        seatX: sx,
        seatZ: sz,
        seatY: ly + 0.48,
        sitRotY: rotY,
        tx: sx - sinLog * 0.92,
        tz: sz - cosLog * 0.92,
      };
    });

    decorGroup.add(logGroup);
    colliders.push({type: 'box', id, x: lx, z: lz, hw: 1.28, hd: 0.34, rotY});
    addBoxProxy(
      group,
      [2.75, 0.85, 0.92],
      [lx, ly + 0.35, lz],
      {
        kind: 'bench',
        tx: seatSlots[0].tx,
        tz: seatSlots[0].tz,
        seatX: seatSlots[0].seatX,
        seatZ: seatSlots[0].seatZ,
        seatY: seatSlots[0].seatY,
        sitRotY: rotY,
        seatSlots,
      },
      clickTargets,
    );
  });

  // Southwest Beach Sunset Bonfire + Log Bench (-13.5, 16.5)
  const fireX = -13.5;
  const fireZ = 16.5;
  const fireY = getIslandBaseTerrainY(fireX, fireZ);
  const campGroup = new THREE.Group();
  campGroup.position.set(fireX, fireY, fireZ);
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const st = new THREE.Mesh(createSculptedCragGeo(s * 1.1, 0.2, 0.14, 0.18, 0), graniteMat);
    st.position.set(Math.cos(a) * 0.72, 0.08, Math.sin(a) * 0.72);
    campGroup.add(st);
  }
  const fireLog1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.95, 7), housePostMat);
  fireLog1.rotation.z = Math.PI / 2;
  fireLog1.rotation.y = 0.5;
  fireLog1.position.y = 0.1;
  const fireLog2 = fireLog1.clone();
  fireLog2.rotation.y = -0.6;
  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.65, 8),
    new THREE.MeshStandardMaterial({
      color: '#FF9240',
      emissive: '#FF5E1A',
      emissiveIntensity: 0.95,
      roughness: 0.4,
    }),
  );
  flameMesh.position.y = 0.42;
  const sitLog = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.85, 9), housePostMat);
  sitLog.rotation.z = Math.PI / 2;
  sitLog.position.set(0, 0.22, 1.65);
  campGroup.add(fireLog1, fireLog2, flameMesh, sitLog);
  group.add(campGroup);
  colliders.push({type: 'circle', id: 'island_campfire', x: fireX, z: fireZ, r: 0.85});
  colliders.push({type: 'box', id: 'island_fire_log', x: fireX, z: fireZ + 1.65, hw: 1.0, hd: 0.3});
  addBoxProxy(
    group,
    [2.0, 1.1, 1.0],
    [fireX, fireY + 0.55, fireZ + 1.65],
    {
      kind: 'outdoor_campfire',
      seatX: fireX,
      seatZ: fireZ + 1.65,
      seatY: fireY + 0.42,
      sitRotY: Math.PI,
      tx: fireX,
      tz: fireZ + 2.35,
    },
    clickTargets,
  );

  // Additional glade hover anchors so insects feel lively everywhere on the Island
  const gladeInsectSpots: [number, number][] = [
    [2.0, 2.5],
    [-2.5, 4.0],
    [5.5, -1.5],
    [-3.5, 9.5],
    [4.5, 10.5],
    [8.5, -10.5],
    [-9.5, -1.5],
    [13.0, 3.0],
    [-7.5, 15.0],
    [2.5, -8.5],
  ];
  gladeInsectSpots.forEach(([gx, gz], idx) => {
    insectAnchors.push({
      x: gx,
      y: getIslandBaseTerrainY(gx, gz) + 0.45,
      z: gz,
      habitat: idx % 2 === 0 ? 'flower' : 'bush',
      zone: 'inner',
    });
  });

  mergeStaticGroupByMaterial(decorGroup);
  group.add(decorGroup);

  // =========================================================================
  // 11. ISLAND INSECT MANAGER & SWIM RIPPLE RING & SEA FISHING VISUALS
  // =========================================================================
  const insectGroup = new THREE.Group();
  group.add(insectGroup);
  const insectManager = new TownInsectManager(insectGroup, insectAnchors);

  const swimRippleGeo = new THREE.RingGeometry(0.46, 0.72, 28);
  swimRippleGeo.rotateX(-Math.PI / 2);
  const swimRippleMat = new THREE.MeshBasicMaterial({
    color: '#ECFCFF',
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const swimRippleMesh = new THREE.Mesh(swimRippleGeo, swimRippleMat);
  swimRippleMesh.position.set(0, ISLAND_WATER_Y + 0.025, 0);
  swimRippleMesh.renderOrder = 5;
  swimRippleMesh.visible = false;
  group.add(swimRippleMesh);

  const swimRippleOuterGeo = new THREE.RingGeometry(0.75, 0.92, 28);
  swimRippleOuterGeo.rotateX(-Math.PI / 2);
  const swimRippleOuterMat = new THREE.MeshBasicMaterial({
    color: '#BDF3FF',
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const swimRippleOuterMesh = new THREE.Mesh(swimRippleOuterGeo, swimRippleOuterMat);
  swimRippleOuterMesh.position.set(0, ISLAND_WATER_Y + 0.02, 0);
  swimRippleOuterMesh.renderOrder = 4;
  swimRippleOuterMesh.visible = false;
  group.add(swimRippleOuterMesh);

  const islandFishingVisuals: FishingSpotVisuals = createFishingSpotVisuals({
    waterY: ISLAND_WATER_Y,
    defaultPos: [0, ISLAND_WATER_Y, 36.2],
  });
  islandFishingVisuals.setLegacyState(options?.fishingState ?? 'idle');
  group.add(islandFishingVisuals.group);

  let useExternalFishingFrame = false;
  let treehouseFocused = false;

  const setTreehouseFocus = (active: boolean) => {
    treehouseFocused = active;
  };

  const setSwimRingPose = (
    active: boolean,
    x = 0,
    z = 0,
    moving = false,
    elapsed = 0,
  ) => {
    swimRippleMesh.visible = active;
    swimRippleOuterMesh.visible = active;
    if (!active) return;
    const pulseSpeed = moving ? 2.4 : 1.1;
    const p1 = (elapsed * pulseSpeed) % 1;
    const p2 = (elapsed * pulseSpeed + 0.5) % 1;
    swimRippleMesh.position.set(x, ISLAND_WATER_Y + 0.026, z);
    swimRippleMesh.scale.setScalar(0.85 + p1 * 0.45);
    swimRippleMat.opacity = (1 - p1 * 0.65) * (moving ? 0.85 : 0.55);

    swimRippleOuterMesh.position.set(x, ISLAND_WATER_Y + 0.022, z);
    swimRippleOuterMesh.scale.setScalar(0.95 + p2 * 0.72);
    swimRippleOuterMat.opacity = (1 - p2) * (moving ? 0.55 : 0.34);
  };

  const setIslandBoatPose = (
    active: boolean,
    x = ISLAND_BOAT_SPAWN.x,
    z = ISLAND_BOAT_SPAWN.z,
    rotY = ISLAND_BOAT_SPAWN.rotY,
    moving = false,
    elapsed = 0,
  ) => {
    mooredIslandBoat.visible = !active;
    activeIslandBoat.visible = active;
    if (active) {
      const bob = Math.sin(elapsed * 2.2) * 0.028;
      activeIslandBoat.position.set(x, ISLAND_WATER_Y + 0.05 + bob, z);
      activeIslandBoat.rotation.set(
        moving ? Math.sin(elapsed * 4.4) * 0.02 : Math.sin(elapsed * 1.7) * 0.01,
        rotY,
        Math.cos(elapsed * 2.1) * 0.018,
      );
      if (activeIslandOarL && activeIslandOarR) {
        const stroke = moving ? Math.sin(elapsed * 5.6) * 0.42 : 0;
        const dip = moving ? Math.cos(elapsed * 5.6) * 0.14 : 0;
        activeIslandOarL.rotation.set(dip, stroke, 0);
        activeIslandOarR.rotation.set(dip, -stroke, 0);
      }
    }
  };

  const setFishingState = (state: 'idle' | 'waiting' | 'bite') => {
    useExternalFishingFrame = false;
    islandFishingVisuals.setLegacyState(state);
  };

  const updateFishingVisuals = (frame: FishingVisualFrame, elapsed: number) => {
    useExternalFishingFrame = true;
    islandFishingVisuals.applyFrame(frame, elapsed);
  };

  const update = (elapsed: number, timeOfDay: TimeOfDay, _context?: SubzoneUpdateContext) => {
    foamMat.opacity = 0.45 + Math.sin(elapsed * 1.8) * 0.14;
    foamMesh.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.008);

    mooredSwimFloat.position.y = ISLAND_WATER_Y + 0.05 + Math.sin(elapsed * 2.1 + 0.7) * 0.04;
    mooredSwimFloat.rotation.z = Math.sin(elapsed * 1.65) * 0.05;
    mooredSwimFloat.rotation.x = Math.cos(elapsed * 1.4) * 0.032;

    if (mooredIslandBoat.visible) {
      mooredIslandBoat.position.y = ISLAND_WATER_Y + 0.05 + Math.sin(elapsed * 1.9) * 0.035;
      mooredIslandBoat.rotation.z = Math.sin(elapsed * 1.5) * 0.03;
      mooredIslandBoat.rotation.x = Math.cos(elapsed * 1.3) * 0.018;
    }

    const waveAmp = timeOfDay === 'night' ? 0.032 : 0.045;
    for (let i = 0; i < oceanPos.count; i++) {
      const ox = oceanPos.getX(i);
      const oz = oceanPos.getZ(i);
      const wave =
        Math.sin(ox * 0.14 + elapsed * 1.65) * waveAmp +
        Math.cos(oz * 0.13 + elapsed * 1.25) * (waveAmp * 0.8);
      oceanPos.setY(i, oceanBaseY[i] + wave);
    }
    oceanPos.needsUpdate = true;

    streamWaterMat.emissiveIntensity = 0.18 + Math.sin(elapsed * 3.1) * 0.07;
    cascadeFoamRing.scale.setScalar(0.94 + Math.sin(elapsed * 4.4) * 0.09);
    streamFoamMat.opacity = 0.6 + Math.sin(elapsed * 4.4) * 0.16;

    // Gentle breeze sway on outward-sloping hanging rope ladder (kept still while climbing/on treehouse)
    ropeLadderGroup.rotation.z = treehouseFocused ? 0 : Math.sin(elapsed * 1.65) * 0.012;

    const fScale = 0.92 + Math.sin(elapsed * 9.2) * 0.12 + Math.cos(elapsed * 14.5) * 0.06;
    flameMesh.scale.set(1, fScale, 1);
    campFlameMesh.scale.set(1, 0.9 + Math.cos(elapsed * 8.6) * 0.14, 1);
    grillEmberMat.emissiveIntensity = 0.82 + Math.sin(elapsed * 6.5) * 0.18;

    buoysGroup.position.y = Math.sin(elapsed * 2.1) * 0.035;

    if (!useExternalFishingFrame) {
      islandFishingVisuals.updateLegacy(elapsed);
    }
  };

  return {
    group,
    groundMesh,
    groundMeshes: [groundMesh, treehouseDeckMesh, pierDeckMesh],
    clickTargets,
    labelAnchors,
    colliders,
    setSwimRingPose,
    setIslandBoatPose,
    setTreehouseFocus,
    updateInsects: (
      playerX,
      playerY,
      playerZ,
      playerSpeed,
      isCreeping,
      elapsed,
      delta,
      frustum,
      cameraX,
      cameraZ,
    ) =>
      insectManager.update(
        elapsed,
        delta,
        playerX,
        playerY,
        playerZ,
        playerSpeed,
        isCreeping,
        frustum,
        cameraX,
        cameraZ,
      ),
    tryCatchInsect: (playerX, playerY, playerZ, playerRotY) =>
      insectManager.tryCatch(playerX, playerY, playerZ, playerRotY),
    setFishingState,
    updateFishingVisuals,
    update,
    dispose: () => {
      disposables.forEach((t) => {
        if (!t.userData?.sharedCache) t.dispose();
      });
      insectManager.dispose();
      islandFishingVisuals.dispose();
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mt) => mt.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    },
  };
}
