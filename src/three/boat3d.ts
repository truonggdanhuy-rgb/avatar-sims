import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BoatId} from '../types/game';
import {clayMat, glossyClayMat, mergeStaticGroupByMaterial} from './materials';

export type BoatDriveKind = 'oars' | 'pedal' | 'motor';

export interface BuiltBoatRig {
  boat: THREE.Group;
  driveKind: BoatDriveKind;
  oarLPivot: THREE.Group | null;
  oarRPivot: THREE.Group | null;
  wheelPivot: THREE.Group | null;
  crankPivot: THREE.Group | null;
  pedalLPivot: THREE.Group | null;
  pedalRPivot: THREE.Group | null;
  sailPivot?: THREE.Group | null;
}

export interface WoodenBoatBuild {
  boat: THREE.Group;
  oarLPivot: THREE.Group | null;
  oarRPivot: THREE.Group | null;
}

export interface DuckBoatBuild {
  boat: THREE.Group;
  wheelPivot: THREE.Group | null;
  crankPivot: THREE.Group | null;
  pedalLPivot: THREE.Group | null;
  pedalRPivot: THREE.Group | null;
}

/**
 * Reusable lofted boat hull generator with optional custom width/sheer functions.
 */
function createLoftedHullGeo(
  stations: number,
  sternZ: number,
  prowZ: number,
  hullHalfW: (t: number) => number,
  sheerYFn: (t: number) => number,
  chineYFn: (t: number) => number,
  keelYFn: (t: number) => number,
  wallOffset: number,
  yOffset: number,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const indices: number[] = [];
  const RING = 7;
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const z = THREE.MathUtils.lerp(sternZ, prowZ, t);
    const hw = Math.max(0.025, hullHalfW(t) + wallOffset);
    const sheerY = sheerYFn(t) + yOffset;
    const chineY = chineYFn(t) + yOffset;
    const keelY = keelYFn(t) + yOffset;
    const pts: [number, number][] = [
      [-hw, sheerY],
      [-hw * 0.86, chineY],
      [-hw * 0.44, keelY + 0.018],
      [0, keelY],
      [hw * 0.44, keelY + 0.018],
      [hw * 0.86, chineY],
      [hw, sheerY],
    ];
    for (const [px, py] of pts) verts.push(px, py, z);
  }
  for (let i = 0; i < stations; i++) {
    const rA = i * RING;
    const rB = (i + 1) * RING;
    for (let j = 0; j < RING - 1; j++) {
      indices.push(rA + j, rB + j, rA + j + 1, rA + j + 1, rB + j, rB + j + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted double-curved cupped pointed lotus petal geometry (points outward along +Z/upward +Y).
 */
function makeLotusPetalGeo(
  length: number,
  maxWidth: number,
  cupDepth: number,
  liftTip: number,
  thickness = 0.024,
): THREE.BufferGeometry {
  const U_SEG = 6;
  const V_SEG = 9;
  const verts: number[] = [];
  const indices: number[] = [];

  const samplePos = (u: number, v: number, faceSign: number): [number, number, number] => {
    // v in [0..1] from base to pointed tip; u in [-1..1] across width
    const widthProfile = Math.sin(Math.pow(v, 0.72) * Math.PI) * (1 - 0.12 * v);
    const x = u * maxWidth * 0.5 * widthProfile;
    const z = v * length;
    // Longitudinal graceful S-cup: rises steeply near tip, gently cradles mid-belly
    const archY = Math.sin(v * Math.PI * 0.68) * liftTip * 0.52 + Math.pow(v, 2.2) * liftTip * 0.65;
    // Transverse parabolic cup (edges higher than spine)
    const cupY = u * u * cupDepth * (0.35 + 0.65 * Math.sin(v * Math.PI));
    const taperThick = thickness * 0.5 * (1 - 0.7 * Math.pow(v, 1.5)) * (1 - 0.55 * u * u);
    const y = archY + cupY + faceSign * Math.max(0.004, taperThick);
    return [x, y, z];
  };

  // Top surface (0 .. (V_SEG+1)*(U_SEG+1)-1) and bottom surface
  const stride = U_SEG + 1;
  const ringCount = (V_SEG + 1) * stride;
  for (const faceSign of [1, -1]) {
    for (let iv = 0; iv <= V_SEG; iv++) {
      const v = iv / V_SEG;
      for (let iu = 0; iu <= U_SEG; iu++) {
        const u = (iu / U_SEG) * 2 - 1;
        const [x, y, z] = samplePos(u, v, faceSign);
        verts.push(x, y, z);
      }
    }
  }

  for (let iv = 0; iv < V_SEG; iv++) {
    for (let iu = 0; iu < U_SEG; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      // Top winding
      indices.push(a, c, b, b, c, d);
      // Bottom winding (reversed)
      const ba = ringCount + a;
      const bb = ringCount + b;
      const bc = ringCount + c;
      const bd = ringCount + d;
      indices.push(ba, bb, bc, bb, bd, bc);
    }
  }
  // Stitch left & right perimeter edges so petal silhouette is solid
  for (let iv = 0; iv < V_SEG; iv++) {
    const ltA = iv * stride;
    const ltB = (iv + 1) * stride;
    const lbA = ringCount + ltA;
    const lbB = ringCount + ltB;
    indices.push(ltA, lbA, ltB, ltB, lbA, lbB);

    const rtA = iv * stride + U_SEG;
    const rtB = (iv + 1) * stride + U_SEG;
    const rbA = ringCount + rtA;
    const rbB = ringCount + rtB;
    indices.push(rtA, rtB, rbA, rtB, rbB, rbA);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Curved billowing mainsail geometry for Pirate Galleon.
 */
function makeCurvedSailGeo(width: number, height: number, belly: number): THREE.BufferGeometry {
  const NX = 8;
  const NY = 7;
  const verts: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= NY; iy++) {
    const v = iy / NY; // 0 bottom .. 1 top
    const y = (v - 0.5) * height;
    const rowW = width * THREE.MathUtils.lerp(1.04, 0.88, v);
    for (let ix = 0; ix <= NX; ix++) {
      const u = ix / NX; // 0 left .. 1 right
      const x = (u - 0.5) * rowW;
      const z = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * belly;
      verts.push(x, y, z);
    }
  }
  const stride = NX + 1;
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted wing plume cluster helper (for Duck & Swan boats).
 */
function addFeatheredWing(
  parent: THREE.Group,
  side: number,
  mainMat: THREE.Material,
  tipMat: THREE.Material,
  trimMat: THREE.Material,
  baseY = 0.38,
  baseZ = -0.1,
) {
  const layers = [
    {sx: 0.14, sy: 0.24, sz: 0.72, px: 0.72, py: baseY + 0.04, pz: baseZ + 0.08, rz: 0.18, ry: -0.08, mat: mainMat},
    {sx: 0.12, sy: 0.21, sz: 0.58, px: 0.75, py: baseY - 0.02, pz: baseZ - 0.26, rz: 0.22, ry: -0.14, mat: tipMat},
    {sx: 0.1, sy: 0.17, sz: 0.44, px: 0.73, py: baseY + 0.09, pz: baseZ - 0.48, rz: 0.28, ry: -0.18, mat: trimMat},
  ];
  for (const l of layers) {
    const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), l.mat);
    plume.scale.set(l.sx, l.sy, l.sz);
    plume.position.set(side * l.px, l.py, l.pz);
    plume.rotation.set(0.14, side * l.ry, side * l.rz);
    parent.add(plume);
  }
}

/**
 * Thuyền Gỗ Truyền Thống (Handcrafted Oak Rowboat) — planked oak hull with brass oarlocks,
 * stern tiller rudder, stitched cushion at z = -0.56, coiled hemp rope, tackle bucket,
 * and glowing brass bow lantern.
 */
export function buildWoodenRowboat(
  withOarPivots = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): WoodenBoatBuild {
  const boat = new THREE.Group();
  const oakHull = clayMat('#9E5C2E', 0.66);
  const oakInner = clayMat('#CA925A', 0.72);
  const oakTrim = clayMat('#E0AD73', 0.58);
  const oakDark = clayMat('#573017', 0.76);
  const brassMat = clayMat('#DFB04F', 0.28, 0.78);
  const ropeHempMat = clayMat('#DEC498', 0.86);
  const cushionRed = clayMat('#C65340', 0.7);
  const cushionCream = clayMat('#F8E9D2', 0.65);
  const sailBlue = clayMat('#3B92BD', 0.56);

  const STATIONS = 12;
  const PROW_Z = 1.54;
  const STERN_Z = -1.2;
  const hullHalfW = (t: number) => {
    if (t > 0.58) {
      const u = (1 - t) / 0.42;
      return 0.65 * Math.pow(Math.max(0.02, u), 0.62);
    }
    if (t < 0.22) return THREE.MathUtils.lerp(0.47, 0.63, t / 0.22);
    return 0.63 + 0.03 * Math.sin(((t - 0.22) / 0.36) * Math.PI);
  };
  const sheerLift = (t: number) =>
    Math.pow(Math.max(0, (t - 0.55) / 0.45), 1.7) * 0.22 + (t < 0.2 ? 0.045 : 0);

  const oakHullDouble = new THREE.MeshStandardMaterial({
    color: '#9E5C2E',
    roughness: 0.66,
    side: THREE.DoubleSide,
  });
  const oakInnerDouble = new THREE.MeshStandardMaterial({
    color: '#CA925A',
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  boat.add(
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.39 + sheerLift(t),
        (t) => 0.11 + sheerLift(t) * 0.35,
        (t) => 0.02 + sheerLift(t) * 0.28,
        0,
        0,
      ),
      oakHullDouble,
    ),
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.39 + sheerLift(t),
        (t) => 0.11 + sheerLift(t) * 0.35,
        (t) => 0.02 + sheerLift(t) * 0.28,
        -0.055,
        0.045,
      ),
      oakInnerDouble,
    ),
  );

  // Transom, keel spine, curved stem & external waterline strake
  const transom = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.37, 0.1, 2, 0.03), oakDark);
  transom.position.set(0, 0.23, STERN_Z + 0.03);
  transom.rotation.x = -0.14;
  const keelSpine = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08, 2.42, 2, 0.02), oakDark);
  keelSpine.position.set(0, 0.01, 0.06);
  const stemPost = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.5, 0.18, 2, 0.03), oakDark);
  stemPost.rotation.x = 0.56;
  stemPost.position.set(0, 0.35, PROW_Z - 0.08);
  boat.add(transom, keelSpine, stemPost);

  // Stern tiller rudder assembly
  const rudderBlade = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.32, 0.24, 1, 0.015), oakDark);
  rudderBlade.position.set(0, 0.16, STERN_Z - 0.11);
  const rudderPin = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 6), brassMat);
  rudderPin.position.set(0, 0.26, STERN_Z - 0.03);
  const tillerHandle = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.045, 0.36, 2, 0.015), oakTrim);
  tillerHandle.position.set(0, 0.44, STERN_Z + 0.12);
  boat.add(rudderBlade, rudderPin, tillerHandle);

  // Gunwale rails + rubbing strakes + transom corner knee braces
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * hullHalfW(t0);
      const x1 = side * hullHalfW(t1);
      const y0 = 0.41 + sheerLift(t0);
      const y1 = 0.41 + sheerLift(t1);
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const rail = new THREE.Mesh(
        new RoundedBoxGeometry(0.09, 0.075, segLen + 0.04, 1, 0.02),
        oakTrim,
      );
      rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      rail.lookAt(x1, y1, z1);
      boat.add(rail);
    }
    const brace = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.045, 0.18, 1, 0.015), oakDark);
    brace.rotation.y = side * 0.65;
    brace.position.set(side * 0.38, 0.36, STERN_Z + 0.12);
    boat.add(brace);
  });

  // Floorboards & transverse oak ribs
  for (let s = -2; s <= 2; s++) {
    const plank = new THREE.Mesh(
      new RoundedBoxGeometry(0.115, 0.036, 1.84 - Math.abs(s) * 0.14, 1, 0.01),
      s % 2 === 0 ? oakTrim : oakInner,
    );
    plank.position.set(s * 0.145, 0.1, -0.05);
    boat.add(plank);
  }
  [-0.8, -0.22, 0.32, 0.84].forEach((rz) => {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.042, 0.06, 1, 0.015), oakDark);
    rib.position.set(0, 0.085, rz);
    boat.add(rib);
  });

  // Bow deck, coiled anchor rope, brass cleat & wooden tackle bucket
  const foreDeck = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 4), oakTrim);
  foreDeck.rotation.x = Math.PI / 2;
  foreDeck.rotation.y = Math.PI / 4;
  foreDeck.scale.set(0.95, 1, 0.14);
  foreDeck.position.set(0, 0.39, 1.2);
  const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 7, 14), ropeHempMat);
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(-0.11, 0.44, 1.07);
  const cleat = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.035, 0.04, 1, 0.01), brassMat);
  cleat.position.set(0.13, 0.44, 1.14);
  // Tackle bucket near mid-port floor
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.18, 10), oakInner);
  bucket.position.set(-0.28, 0.19, 0.65);
  const bucketHoop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 12), brassMat);
  bucketHoop.rotation.x = Math.PI / 2;
  bucketHoop.position.set(-0.28, 0.24, 0.65);
  boat.add(foreDeck, ropeCoil, cleat, bucket, bucketHoop);

  // Seats aligned at z = -0.56 with stitched crimson cushion & mid-thwart bench
  const aftBench = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.075, 0.4, 2, 0.02), oakTrim);
  aftBench.position.set(0, 0.28, -0.56);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.068, 0.34, 2, 0.028), cushionRed);
  cushion.position.set(0, 0.33, -0.56);
  [-0.2, 0.2].forEach((bx) => {
    const tuft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 8), cushionCream);
    tuft.position.set(bx, 0.365, -0.56);
    boat.add(tuft);
  });
  const midThwart = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.07, 0.3, 2, 0.02), oakTrim);
  midThwart.position.set(0, 0.27, 0.26);
  boat.add(aftBench, cushion, midThwart);

  // Bow mast, brass storm lantern & swallowtail pennant
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.74, 7), oakDark);
  mast.position.set(0, 0.74, 1.33);
  const bowArm = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, 0.25, 1, 0.01), brassMat);
  bowArm.position.set(0, 1.04, 1.43);
  const bowCap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.075, 6), brassMat);
  bowCap.position.set(0, 0.96, 1.52);
  const bowBulbMat = new THREE.MeshStandardMaterial({
    color: '#FFF4C2',
    emissive: '#FFCC66',
    emissiveIntensity: 0.5,
    roughness: 0.22,
  });
  lampBulbsOut?.push(bowBulbMat);
  const bowBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.13, 6), bowBulbMat);
  bowBulb.position.set(0, 0.87, 1.52);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 3), sailBlue);
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(0.15, 0.96, 1.33);
  boat.add(mast, bowArm, bowCap, bowBulb, flag);

  // Brass U-fork oarlocks + animated oak oars
  let oarLPivot: THREE.Group | null = null;
  let oarRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const oarlock = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.09, 6), brassMat);
    oarlock.position.set(side * 0.62, 0.44, 0.14);
    const uFork = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.01, 6, 10, Math.PI), brassMat);
    uFork.rotation.z = Math.PI;
    uFork.position.set(side * 0.62, 0.495, 0.14);
    boat.add(oarlock, uFork);

    const pivot = new THREE.Group();
    pivot.position.set(side * 0.62, 0.47, 0.14);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.24, 6), oakDark);
    grip.rotation.z = side * 1.16;
    grip.position.set(-side * 0.14, 0.06, 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.28, 7), oakTrim);
    shaft.rotation.z = side * 1.16;
    shaft.position.set(side * 0.44, -0.17, 0);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.12, 7), brassMat);
    collar.rotation.z = side * 1.16;
    collar.position.set(side * 0.02, -0.01, 0);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.028, 0.5, 2, 0.012), oakHull);
    blade.rotation.z = side * 1.16;
    blade.position.set(side * 0.99, -0.41, 0);
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
}

/**
 * Thuyền Đạp Vịt (Duck Pedal Boat) — cheerful lake-park duck boat with layered feathered wings,
 * sailor aqua collar + bow tie, dash dial console, bolster seat at z = -0.56,
 * rotating foot pedals, and hooded stern paddlewheel.
 */
export function buildDuckPedalBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): DuckBoatBuild {
  const boat = new THREE.Group();

  const shellCreamMat = glossyClayMat('#FFF8EC', 0.26);
  const shellInnerMat = clayMat('#F4EBDC', 0.52);
  const wingCreamMat = glossyClayMat('#FFFDF7', 0.32);
  const aquaTrimMat = glossyClayMat('#4AB3D6', 0.3);
  const aquaDeepMat = clayMat('#2B7B99', 0.45);
  const coralCushionMat = clayMat('#F2786B', 0.62);
  const teakDeckMat = clayMat('#C68C53', 0.68);
  const orangeBillMat = glossyClayMat('#FF8D2E', 0.28);
  const cheekPinkMat = clayMat('#FF9BAE', 0.5);
  const eyeDarkMat = glossyClayMat('#201A17', 0.14);
  const eyeShineMat = glossyClayMat('#FFFFFF', 0.1);
  const chromeMat = clayMat('#DCE4EC', 0.2, 0.8);
  const pedalMat = clayMat('#3B4652', 0.55);
  const goldAccentMat = clayMat('#F2C249', 0.28, 0.58);

  const STATIONS = 12;
  const PROW_Z = 1.44;
  const STERN_Z = -1.16;
  const hullHalfW = (t: number) => {
    if (t > 0.62) return 0.72 * Math.pow(Math.max(0.04, (1 - t) / 0.38), 0.55);
    if (t < 0.2) return THREE.MathUtils.lerp(0.56, 0.71, t / 0.2);
    return 0.71 + 0.05 * Math.sin(((t - 0.2) / 0.42) * Math.PI);
  };
  const gunwaleY = (t: number) => 0.42 + (t > 0.72 ? (t - 0.72) * 0.28 : 0);

  const outerDuckMat = new THREE.MeshStandardMaterial({color: '#FFF8EC', roughness: 0.28, side: THREE.DoubleSide});
  const innerDuckMat = new THREE.MeshStandardMaterial({color: '#F4EBDC', roughness: 0.54, side: THREE.DoubleSide});
  boat.add(
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        gunwaleY,
        () => 0.14,
        () => 0.02,
        0,
        0,
      ),
      outerDuckMat,
    ),
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        gunwaleY,
        () => 0.14,
        () => 0.02,
        -0.06,
        0.04,
      ),
      innerDuckMat,
    ),
  );

  // Aqua bumper gunwales
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.02);
      const x1 = side * (hullHalfW(t1) + 0.02);
      const y0 = gunwaleY(t0) + 0.015;
      const y1 = gunwaleY(t1) + 0.015;
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const rail = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.075, segLen + 0.04, 2, 0.025), aquaTrimMat);
      rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      rail.lookAt(x1, y1, z1);
      boat.add(rail);
    }
  });

  // Stern transom, wood cockpit floor & bow hood
  const transom = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.4, 0.1, 2, 0.04), shellCreamMat);
  transom.position.set(0, 0.24, STERN_Z + 0.03);
  const floorDeck = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.05, 1.72, 2, 0.02), teakDeckMat);
  floorDeck.position.set(0, 0.095, -0.06);
  const foreHood = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), shellCreamMat);
  foreHood.scale.set(1.02, 0.34, 0.92);
  foreHood.position.set(0, 0.43, 0.9);
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 18), aquaTrimMat);
  collarTrim.rotation.x = Math.PI / 2 - 0.16;
  collarTrim.position.set(0, 0.57, 1.05);
  boat.add(transom, floorDeck, foreHood, collarTrim);

  // Layered feathered side wings + upturned triple-feather duck tail
  [-1, 1].forEach((side) => {
    addFeatheredWing(boat, side, wingCreamMat, shellInnerMat, aquaTrimMat, 0.38, -0.08);
  });
  [-0.12, 0, 0.12].forEach((tx, idx) => {
    const feather = new THREE.Mesh(
      new THREE.ConeGeometry(idx === 1 ? 0.18 : 0.13, idx === 1 ? 0.46 : 0.34, 8),
      idx === 1 ? wingCreamMat : shellInnerMat,
    );
    feather.rotation.x = -0.82;
    feather.rotation.z = -tx * 1.4;
    feather.position.set(tx, 0.54 + (idx === 1 ? 0.06 : 0), -1.16);
    boat.add(feather);
  });

  // Cute duck neck, sailor scarf bow, head, tuft, glowing bow crest, orange bill, glossy eyes
  const neckLow = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.21, 0.46, 12), shellCreamMat);
  neckLow.position.set(0, 0.74, 1.12);
  neckLow.rotation.x = 0.32;
  const neckTop = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.36, 12), shellCreamMat);
  neckTop.position.set(0, 1.0, 1.24);
  neckTop.rotation.x = 0.08;
  const neckRibbon = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.034, 7, 16), aquaTrimMat);
  neckRibbon.rotation.x = Math.PI / 2 + 0.15;
  neckRibbon.position.set(0, 0.88, 1.18);
  const neckBow = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.085, 0.06, 2, 0.025), coralCushionMat);
  neckBow.position.set(0, 0.85, 1.33);
  const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), goldAccentMat);
  bowKnot.position.set(0, 0.85, 1.36);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), shellCreamMat);
  head.scale.set(0.96, 0.94, 1.06);
  head.position.set(0, 1.22, 1.28);
  const crownTuft = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 7), shellCreamMat);
  crownTuft.rotation.x = -0.35;
  crownTuft.position.set(0, 1.46, 1.24);
  const crestMat = new THREE.MeshStandardMaterial({
    color: '#FFE993',
    emissive: '#FFBC38',
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  lampBulbsOut?.push(crestMat);
  const bowCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), crestMat);
  bowCrest.position.set(0, 1.46, 1.33);

  const upperBill = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8), orangeBillMat);
  upperBill.scale.set(1.05, 0.42, 1.35);
  upperBill.position.set(0, 1.18, 1.53);
  const lowerBill = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), orangeBillMat);
  lowerBill.scale.set(0.95, 0.34, 1.12);
  lowerBill.position.set(0, 1.12, 1.5);

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeDarkMat);
    eye.position.set(side * 0.14, 1.26, 1.46);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeShineMat);
    shine.position.set(side * 0.148, 1.275, 1.495);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), cheekPinkMat);
    cheek.scale.set(0.75, 0.55, 0.85);
    cheek.position.set(side * 0.185, 1.16, 1.41);
    boat.add(eye, shine, cheek);
  });
  boat.add(neckLow, neckTop, neckRibbon, neckBow, bowKnot, head, crownTuft, bowCrest, upperBill, lowerBill);

  // Cushioned twin rider seat aligned at z = -0.56 with armrests
  const seatBase = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.22, 0.44, 2, 0.04), shellInnerMat);
  seatBase.position.set(0, 0.21, -0.56);
  const seatBack = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.34, 0.11, 2, 0.04), aquaTrimMat);
  seatBack.position.set(0, 0.43, -0.76);
  seatBack.rotation.x = -0.14;
  const cushionMain = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.075, 0.36, 2, 0.03), coralCushionMat);
  cushionMain.position.set(0, 0.33, -0.56);
  const centerStripe = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.082, 0.37, 1, 0.01), shellCreamMat);
  centerStripe.position.set(0, 0.332, -0.56);
  [-0.5, 0.5].forEach((ax) => {
    const armRest = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.12, 0.4, 2, 0.03), aquaTrimMat);
    armRest.position.set(ax, 0.37, -0.56);
    boat.add(armRest);
  });
  boat.add(seatBase, seatBack, cushionMain, centerStripe);

  // Steering console with mini dash pod, dual gauges & handlebars
  const helmPod = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.16, 0.18, 2, 0.03), shellCreamMat);
  helmPod.position.set(0, 0.48, 0.06);
  [-0.07, 0.07].forEach((dx) => {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 10), goldAccentMat);
    dial.rotation.x = Math.PI / 2 - 0.3;
    dial.position.set(dx, 0.54, 0.0);
    boat.add(dial);
  });
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.54, 10), chromeMat);
  helmPost.position.set(0, 0.35, -0.02);
  helmPost.rotation.x = -0.18;
  const helmBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 8), chromeMat);
  helmBar.rotation.z = Math.PI / 2;
  helmBar.position.set(0, 0.61, -0.07);
  [-0.24, 0.24].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 8), aquaDeepMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.61, -0.07);
    boat.add(grip);
  });
  const helmBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), goldAccentMat);
  helmBadge.rotation.x = Math.PI / 2 - 0.18;
  helmBadge.position.set(0, 0.61, -0.045);
  boat.add(helmPod, helmPost, helmBar, helmBadge);

  // Foot pedal crank
  const crankPivot = new THREE.Group();
  crankPivot.position.set(0, 0.22, -0.16);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8), chromeMat);
  axle.rotation.z = Math.PI / 2;
  crankPivot.add(axle);

  let pedalLPivot: THREE.Group | null = null;
  let pedalRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.12, 0.035, 1, 0.01), chromeMat);
    arm.position.set(side * 0.2, side * 0.045, 0);
    crankPivot.add(arm);

    const pGroup = new THREE.Group();
    pGroup.position.set(side * 0.24, side * 0.095, 0);
    pGroup.add(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.032, 0.14, 1, 0.01), pedalMat));
    crankPivot.add(pGroup);
    if (side < 0) pedalLPivot = pGroup;
    else pedalRPivot = pGroup;
  });
  boat.add(crankPivot);

  // Stern paddlewheel & guard
  const wheelGuard = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 16, Math.PI), aquaTrimMat);
  wheelGuard.rotation.y = Math.PI / 2;
  wheelGuard.position.set(0, 0.26, -1.24);
  [-0.22, 0.22].forEach((sx) => {
    const strut = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.07, 0.24, 1, 0.015), aquaDeepMat);
    strut.position.set(sx, 0.22, -1.18);
    boat.add(strut);
  });
  boat.add(wheelGuard);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.22, -1.26);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 10), chromeMat);
  wheelHub.rotation.z = Math.PI / 2;
  wheelPivot.add(wheelHub);
  for (let b = 0; b < 6; b++) {
    const ang = (b / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.025, 0.2, 1, 0.008), b % 2 === 0 ? coralCushionMat : aquaTrimMat);
    spoke.position.set(0, Math.sin(ang) * 0.16, Math.cos(ang) * 0.16);
    spoke.rotation.x = -ang;
    wheelPivot.add(spoke);
  }
  boat.add(wheelPivot);

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    skipSet.add(wheelPivot);
    skipSet.add(crankPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);

  return {
    boat,
    wheelPivot: withAnim ? wheelPivot : null,
    crankPivot: withAnim ? crankPivot : null,
    pedalLPivot: withAnim ? pedalLPivot : null,
    pedalRPivot: withAnim ? pedalRPivot : null,
  };
}

/**
 * Thuyền Thiên Nga Hồng (Pink Swan Princess Pedal Boat) — graceful pearl-pink swan hull,
 * layered wing plumes, fanned tail feathers, pearl chest necklace with ruby gem,
 * bejeweled royal golden crown, plush velvet throne seat at z = -0.56, and gold paddlewheel.
 */
export function buildSwanPrincessBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();

  const pearlPinkMat = glossyClayMat('#FFD6E5', 0.24);
  const softPinkMat = clayMat('#F9BFD3', 0.46);
  const wingRoseMat = glossyClayMat('#FFF3F8', 0.28);
  const goldMat = clayMat('#F2C249', 0.25, 0.68);
  const velvetMat = clayMat('#D65C84', 0.64);
  const deckWoodMat = clayMat('#D8B38E', 0.66);
  const beakMat = glossyClayMat('#FF9554', 0.26);
  const eyeDarkMat = glossyClayMat('#201A17', 0.14);
  const eyeShineMat = glossyClayMat('#FFFFFF', 0.1);
  const pearlMat = glossyClayMat('#FFFDF9', 0.2);
  const chromeMat = clayMat('#DCE4EC', 0.2, 0.8);
  const pedalMat = clayMat('#4C4046', 0.55);

  const STATIONS = 12;
  const PROW_Z = 1.44;
  const STERN_Z = -1.16;
  const hullHalfW = (t: number) => {
    if (t > 0.62) return 0.72 * Math.pow(Math.max(0.04, (1 - t) / 0.38), 0.55);
    if (t < 0.2) return THREE.MathUtils.lerp(0.56, 0.71, t / 0.2);
    return 0.71 + 0.05 * Math.sin(((t - 0.2) / 0.42) * Math.PI);
  };
  const gunwaleY = (t: number) => 0.42 + (t > 0.72 ? (t - 0.72) * 0.28 : 0);

  const outerSwanMat = new THREE.MeshStandardMaterial({color: '#FFD6E5', roughness: 0.24, side: THREE.DoubleSide});
  const innerSwanMat = new THREE.MeshStandardMaterial({color: '#FBEAF1', roughness: 0.52, side: THREE.DoubleSide});
  boat.add(
    new THREE.Mesh(
      createLoftedHullGeo(STATIONS, STERN_Z, PROW_Z, hullHalfW, gunwaleY, () => 0.14, () => 0.02, 0, 0),
      outerSwanMat,
    ),
    new THREE.Mesh(
      createLoftedHullGeo(STATIONS, STERN_Z, PROW_Z, hullHalfW, gunwaleY, () => 0.14, () => 0.02, -0.06, 0.04),
      innerSwanMat,
    ),
  );

  // Gold gunwale bumper rails
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.02);
      const x1 = side * (hullHalfW(t1) + 0.02);
      const y0 = gunwaleY(t0) + 0.015;
      const y1 = gunwaleY(t1) + 0.015;
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const rail = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.07, segLen + 0.04, 2, 0.025), goldMat);
      rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      rail.lookAt(x1, y1, z1);
      boat.add(rail);
    }
  });

  const transom = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.4, 0.1, 2, 0.04), softPinkMat);
  transom.position.set(0, 0.24, STERN_Z + 0.03);
  const floorDeck = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.05, 1.72, 2, 0.02), deckWoodMat);
  floorDeck.position.set(0, 0.095, -0.06);
  const foreHood = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), pearlPinkMat);
  foreHood.scale.set(1.02, 0.34, 0.92);
  foreHood.position.set(0, 0.43, 0.9);
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 18), goldMat);
  collarTrim.rotation.x = Math.PI / 2 - 0.16;
  collarTrim.position.set(0, 0.57, 1.05);
  boat.add(transom, floorDeck, foreHood, collarTrim);

  // Layered feathered swan wings & 5-plume fanned tail
  [-1, 1].forEach((side) => {
    addFeatheredWing(boat, side, wingRoseMat, softPinkMat, goldMat, 0.4, -0.08);
  });
  for (let i = -2; i <= 2; i++) {
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(i === 0 ? 0.15 : 0.11, i === 0 ? 0.48 : 0.38, 8),
      i % 2 === 0 ? wingRoseMat : softPinkMat,
    );
    plume.rotation.x = -0.78 - Math.abs(i) * 0.08;
    plume.rotation.z = -i * 0.22;
    plume.position.set(i * 0.1, 0.55 + (2 - Math.abs(i)) * 0.04, -1.16);
    boat.add(plume);
  }

  // Graceful S-curved swan neck, beaded pearl collar & sculpted head with royal crown
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.56, 1.05),
    new THREE.Vector3(0, 0.88, 0.89),
    new THREE.Vector3(0, 1.24, 1.04),
    new THREE.Vector3(0, 1.44, 1.26),
  ]);
  boat.add(new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 16, 0.115, 12, false), pearlPinkMat));

  // Beaded pearl collar around base of neck
  for (let b = 0; b < 10; b++) {
    const ang = (b / 10) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 7), pearlMat);
    bead.position.set(Math.cos(ang) * 0.21, 0.59 + Math.sin(ang) * 0.03, 1.06 + Math.sin(ang) * 0.21);
    boat.add(bead);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), pearlPinkMat);
  head.scale.set(0.92, 0.96, 1.08);
  head.position.set(0, 1.48, 1.3);
  const bill = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 9), beakMat);
  bill.rotation.x = Math.PI / 2 + 0.18;
  bill.position.set(0, 1.44, 1.52);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeDarkMat);
    eye.position.set(s * 0.145, 1.52, 1.41);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), eyeShineMat);
    shine.position.set(s * 0.152, 1.532, 1.434);
    boat.add(eye, shine);
  });

  // Royal golden princess crown with glowing crystal finial
  const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.075, 12), goldMat);
  crownBand.position.set(0, 1.67, 1.28);
  boat.add(head, bill, crownBand);
  for (let p = 0; p < 5; p++) {
    const ang = (p / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), goldMat);
    spike.position.set(Math.cos(ang) * 0.082, 1.735, 1.28 + Math.sin(ang) * 0.082);
    boat.add(spike);
  }

  const gemMat = new THREE.MeshStandardMaterial({
    color: '#FFE5F0',
    emissive: '#FF7EB6',
    emissiveIntensity: 0.45,
    roughness: 0.16,
  });
  lampBulbsOut?.push(gemMat);
  const gemChest = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), gemMat);
  gemChest.position.set(0, 0.6, 1.23);
  const gemCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), gemMat);
  gemCrown.position.set(0, 1.76, 1.28);
  boat.add(gemChest, gemCrown);

  // Plush throne bench at z = -0.56 with scalloped backrest & gold finials
  const seatBase = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.16, 0.42, 2, 0.04), pearlPinkMat);
  seatBase.position.set(0, 0.18, -0.56);
  const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.1, 0.36, 2, 0.03), velvetMat);
  seatCushion.position.set(0, 0.28, -0.56);
  const backrest = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.34, 0.12, 2, 0.035), velvetMat);
  backrest.position.set(0, 0.45, -0.76);
  backrest.rotation.x = -0.14;
  const backCrest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), goldMat);
  backCrest.scale.set(1.2, 0.45, 0.28);
  backCrest.position.set(0, 0.62, -0.79);
  boat.add(seatBase, seatCushion, backrest, backCrest);

  // Gold tiller steering bar + pedals + gold paddlewheel
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.044, 0.46, 8), chromeMat);
  helmPost.position.set(0, 0.38, -0.05);
  const helmBar = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.045, 0.05, 2, 0.015), goldMat);
  helmBar.position.set(0, 0.61, -0.04);
  const helmGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), gemMat);
  helmGem.position.set(0, 0.64, -0.02);
  boat.add(helmPost, helmBar, helmGem);

  const crankPivot = new THREE.Group();
  crankPivot.position.set(0, 0.22, -0.16);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8), chromeMat);
  axle.rotation.z = Math.PI / 2;
  crankPivot.add(axle);
  let pedalLPivot: THREE.Group | null = null;
  let pedalRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.12, 0.035, 1, 0.01), chromeMat);
    arm.position.set(side * 0.2, side * 0.045, 0);
    const pGroup = new THREE.Group();
    pGroup.position.set(side * 0.24, side * 0.095, 0);
    pGroup.add(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.032, 0.14, 1, 0.01), pedalMat));
    crankPivot.add(arm, pGroup);
    if (side < 0) pedalLPivot = pGroup;
    else pedalRPivot = pGroup;
  });
  boat.add(crankPivot);

  const wheelGuard = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.042, 8, 16, Math.PI), goldMat);
  wheelGuard.rotation.y = Math.PI / 2;
  wheelGuard.position.set(0, 0.26, -1.24);
  boat.add(wheelGuard);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.22, -1.26);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 10), chromeMat);
  wheelHub.rotation.z = Math.PI / 2;
  wheelPivot.add(wheelHub);
  for (let b = 0; b < 6; b++) {
    const ang = (b / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.025, 0.2, 1, 0.008), b % 2 === 0 ? velvetMat : goldMat);
    spoke.position.set(0, Math.sin(ang) * 0.16, Math.cos(ang) * 0.16);
    spoke.rotation.x = -ang;
    wheelPivot.add(spoke);
  }
  boat.add(wheelPivot);

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    skipSet.add(wheelPivot);
    skipSet.add(crankPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'pedal',
    oarLPivot: null,
    oarRPivot: null,
    wheelPivot: withAnim ? wheelPivot : null,
    crankPivot: withAnim ? crankPivot : null,
    pedalLPivot: withAnim ? pedalLPivot : null,
    pedalRPivot: withAnim ? pedalRPivot : null,
  };
}

/**
 * Thuyền Hoa Sen Đêm Trăng (Imperial Pink Lotus Blossom Boat) —
 * sculptural double-tier cupped pointed petals cradled in a carved emerald lotus-leaf keel,
 * golden stamen pearls, bow & stern closed lotus buds, rosewood deck with jade lotus inlay,
 * carved petal throne at z = -0.56, and S-curved rosewood post suspending a hexagonal palace lantern.
 */
export function buildLotusLanternBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();

  const leafDarkMat = new THREE.MeshStandardMaterial({color: '#255E49', roughness: 0.56, side: THREE.DoubleSide});
  const leafTrimMat = clayMat('#3B8466', 0.52);
  const petalOuterMat = new THREE.MeshStandardMaterial({color: '#E86D96', roughness: 0.36, side: THREE.DoubleSide});
  const petalInnerMat = new THREE.MeshStandardMaterial({color: '#FFC4D9', roughness: 0.32, side: THREE.DoubleSide});
  const petalTipMat = glossyClayMat('#FFEBF2', 0.28);
  const jadeMat = clayMat('#4C9B7A', 0.48);
  const rosewoodMat = clayMat('#6E3B26', 0.62);
  const teakDeckMat = clayMat('#B97C4B', 0.68);
  const goldMat = clayMat('#F2C249', 0.26, 0.68);
  const silkRedMat = clayMat('#D14343', 0.58);

  // 1. Emerald Carved Lotus-Leaf Cradle Hull underneath the petals
  const STATIONS = 13;
  const PROW_Z = 1.46;
  const STERN_Z = -1.2;
  const hullHalfW = (t: number) => Math.sin(Math.pow(t, 0.88) * Math.PI) * 0.65 + 0.07;
  const sheerLift = (t: number) => Math.pow(Math.abs(t - 0.45) * 1.85, 1.75) * 0.18;

  boat.add(
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.33 + sheerLift(t),
        (t) => 0.1 + sheerLift(t) * 0.35,
        (t) => 0.02 + sheerLift(t) * 0.22,
        0,
        0,
      ),
      leafDarkMat,
    ),
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.33 + sheerLift(t),
        (t) => 0.1 + sheerLift(t) * 0.35,
        (t) => 0.02 + sheerLift(t) * 0.22,
        -0.05,
        0.04,
      ),
      leafTrimMat,
    ),
  );

  // 2. Two concentric sculpted pointed cupped lotus petal rings cradling the boat!
  const outerPetalGeo = makeLotusPetalGeo(0.56, 0.46, 0.085, 0.34, 0.028);
  const innerPetalGeo = makeLotusPetalGeo(0.46, 0.38, 0.07, 0.38, 0.024);

  const OUTER_COUNT = 12;
  for (let i = 0; i < OUTER_COUNT; i++) {
    const ang = (i / OUTER_COUNT) * Math.PI * 2;
    const rx = Math.sin(ang) * 0.56;
    const rz = Math.cos(ang) * 1.18 + 0.1;
    const petal = new THREE.Mesh(outerPetalGeo, petalOuterMat);
    petal.position.set(rx, 0.17, rz);
    petal.rotation.y = ang;
    petal.rotation.x = 0.06;
    boat.add(petal);
  }

  const INNER_COUNT = 10;
  for (let i = 0; i < INNER_COUNT; i++) {
    const ang = ((i + 0.5) / INNER_COUNT) * Math.PI * 2;
    const rx = Math.sin(ang) * 0.48;
    const rz = Math.cos(ang) * 1.04 + 0.1;
    const petal = new THREE.Mesh(innerPetalGeo, i % 2 === 0 ? petalInnerMat : petalTipMat);
    petal.position.set(rx, 0.26, rz);
    petal.rotation.y = ang;
    petal.rotation.x = -0.08;
    boat.add(petal);
  }

  // 3. Sculpted closed pink lotus buds at both bow & stern stems + golden stamen pearls
  const addLotusBud = (bx: number, by: number, bz: number, scale: number, tiltX: number) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.034 * scale, 0.32 * scale, 7), leafTrimMat);
    stem.position.set(bx, by - 0.12 * scale, bz);
    stem.rotation.x = tiltX;
    const bud = new THREE.Group();
    bud.position.set(bx, by, bz + Math.sin(tiltX) * 0.14 * scale);
    bud.rotation.x = tiltX;
    for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.085 * scale, 0.22 * scale, 6), k % 2 === 0 ? petalOuterMat : petalInnerMat);
      p.scale.set(0.85, 1, 0.55);
      p.rotation.y = (k * Math.PI) / 2;
      p.rotation.x = 0.22;
      p.position.y = 0.06 * scale;
      bud.add(p);
    }
    boat.add(stem, bud);
  };
  addLotusBud(0, 0.68, 1.48, 1.15, 0.26);
  addLotusBud(0, 0.62, -1.24, 0.95, -0.32);

  // Golden stamen beads tucked along bow & stern inner rim
  for (let i = -3; i <= 3; i++) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), goldMat);
    bead.position.set(i * 0.11, 0.34, 0.88 - Math.abs(i) * 0.05);
    boat.add(bead);
  }

  // 4. Rosewood cockpit deck with engraved jade lotus-pod medallion + petal throne seat at z = -0.56
  const deck = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.05, 1.66, 2, 0.02), teakDeckMat);
  deck.position.set(0, 0.095, 0.06);
  const deckInlay = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.015, 12), jadeMat);
  deckInlay.position.set(0, 0.12, 0.18);
  const bench = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.075, 0.34, 2, 0.02), rosewoodMat);
  bench.position.set(0, 0.26, -0.56);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.07, 0.28, 2, 0.025), jadeMat);
  cushion.position.set(0, 0.32, -0.56);
  // Carved lotus-petal backrest behind seat
  [-0.22, 0, 0.22].forEach((bx, idx) => {
    const backPetal = new THREE.Mesh(
      new THREE.ConeGeometry(idx === 1 ? 0.18 : 0.14, idx === 1 ? 0.36 : 0.3, 6),
      idx === 1 ? petalInnerMat : petalOuterMat,
    );
    backPetal.scale.set(1, 1, 0.28);
    backPetal.rotation.x = -0.14;
    backPetal.rotation.z = -bx * 0.55;
    backPetal.position.set(bx, 0.48, -0.74);
    boat.add(backPetal);
  });
  boat.add(deck, deckInlay, bench, cushion);

  // 5. Ornate S-curved carved rosewood post suspending a Hexagonal Palace Lantern (sailPivot)
  const poleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.14, 8), goldMat);
  poleBase.position.set(0, 0.44, 1.12);
  const poleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.46, 1.12),
    new THREE.Vector3(0, 1.02, 1.24),
    new THREE.Vector3(0, 1.38, 1.06),
    new THREE.Vector3(0, 1.32, 0.88),
  ]);
  boat.add(poleBase, new THREE.Mesh(new THREE.TubeGeometry(poleCurve, 16, 0.026, 8, false), rosewoodMat));

  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: '#FFE9A3',
    emissive: '#FF9E2C',
    emissiveIntensity: 0.72,
    roughness: 0.2,
  });
  lampBulbsOut?.push(lanternGlowMat);

  const sailPivot = new THREE.Group();
  sailPivot.position.set(0, 1.31, 0.88);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), goldMat);
  cord.position.y = -0.06;
  const roofCone = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.09, 6), goldMat);
  roofCone.position.y = -0.14;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), goldMat);
  finial.position.y = -0.09;
  const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.092, 0.21, 6), lanternGlowMat);
  lanternBody.position.y = -0.27;
  const bottomRing = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.07, 0.035, 6), goldMat);
  bottomRing.position.y = -0.39;
  // 6 carved gold frame pillars around lantern glass
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), rosewoodMat);
    rib.position.set(Math.cos(a) * 0.105, -0.27, Math.sin(a) * 0.105);
    sailPivot.add(rib);
  }
  const tasselKnot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 7), silkRedMat);
  tasselKnot.position.y = -0.43;
  const tasselTail = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 6), silkRedMat);
  tasselTail.position.y = -0.5;
  sailPivot.add(cord, roofCone, finial, lanternBody, bottomRing, tasselKnot, tasselTail);
  boat.add(sailPivot);

  // 6. Rosewood & petal-blade oars (oarLPivot, oarRPivot)
  let oarLPivot: THREE.Group | null = null;
  let oarRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const oarlock = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.08, 6), goldMat);
    oarlock.position.set(side * 0.62, 0.42, 0.14);
    boat.add(oarlock);

    const pivot = new THREE.Group();
    pivot.position.set(side * 0.62, 0.46, 0.14);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 1.42, 7), rosewoodMat);
    shaft.rotation.z = side * 1.16;
    shaft.position.set(side * 0.36, -0.14, 0);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.026, 0.48, 2, 0.012), petalOuterMat);
    blade.rotation.z = side * 1.16;
    blade.position.set(side * 0.98, -0.41, 0);
    pivot.add(shaft, blade);
    boat.add(pivot);
    if (side < 0) oarLPivot = pivot;
    else oarRPivot = pivot;
  });

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    if (oarLPivot) skipSet.add(oarLPivot);
    if (oarRPivot) skipSet.add(oarRPivot);
    skipSet.add(sailPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'oars',
    oarLPivot: withAnim ? oarLPivot : null,
    oarRPivot: withAnim ? oarRPivot : null,
    wheelPivot: null,
    crankPivot: null,
    pedalLPivot: null,
    pedalRPivot: null,
    sailPivot: withAnim ? sailPivot : null,
  };
}

/**
 * Thuyền Hải Tặc Mini (Imperial Mini Pirate Galleon) —
 * weathered dark walnut planked hull, copper-red lower waterline, raised stern quarterdeck
 * with oak balusters & glowing amber cabin gallery windows, curved striped canvas mainsail +
 * Jolly Roger skull pennant (`sailPivot`), 4 wheeled brass cannons, rum barrel, treasure chest,
 * spoked ship's wheel, captain seat at z = -0.56, and animated oars.
 */
export function buildPirateGalleonBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();
  const darkWoodMat = new THREE.MeshStandardMaterial({color: '#5B3117', roughness: 0.72, side: THREE.DoubleSide});
  const deckWoodMat = new THREE.MeshStandardMaterial({color: '#AC7240', roughness: 0.74, side: THREE.DoubleSide});
  const railDarkMat = clayMat('#3B1E0D', 0.74);
  const copperHullMat = clayMat('#7D3226', 0.62);
  const goldMat = clayMat('#E8BA4C', 0.26, 0.72);
  const brassMat = clayMat('#B8893A', 0.34, 0.65);
  const ironMat = clayMat('#24272D', 0.56, 0.45);
  const redVelvetMat = clayMat('#BA3530', 0.66);
  const sailClothMat = new THREE.MeshStandardMaterial({color: '#FAF3E3', roughness: 0.78, side: THREE.DoubleSide});
  const sailStripeMat = clayMat('#B8322E', 0.74);
  const ropeMat = clayMat('#D8BE92', 0.85);
  const ivoryMat = clayMat('#F8FAFC', 0.52);

  const STATIONS = 12;
  const PROW_Z = 1.56;
  const STERN_Z = -1.22;
  const hullHalfW = (t: number) => {
    if (t > 0.58) return 0.66 * Math.pow(Math.max(0.03, (1 - t) / 0.42), 0.6);
    if (t < 0.24) return THREE.MathUtils.lerp(0.51, 0.65, t / 0.24);
    return 0.65 + 0.03 * Math.sin(((t - 0.24) / 0.34) * Math.PI);
  };
  const sheerLift = (t: number) =>
    Math.pow(Math.max(0, (t - 0.55) / 0.45), 1.65) * 0.26 + (t < 0.26 ? 0.16 : 0);

  boat.add(
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.42 + sheerLift(t),
        (t) => 0.12 + sheerLift(t) * 0.32,
        (t) => 0.02 + sheerLift(t) * 0.25,
        0,
        0,
      ),
      darkWoodMat,
    ),
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.42 + sheerLift(t),
        (t) => 0.12 + sheerLift(t) * 0.32,
        (t) => 0.02 + sheerLift(t) * 0.25,
        -0.055,
        0.04,
      ),
      deckWoodMat,
    ),
  );

  // Lower copper waterline rubbing band + upper gold rail trim
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.012);
      const x1 = side * (hullHalfW(t1) + 0.012);
      const y0 = 0.43 + sheerLift(t0);
      const y1 = 0.43 + sheerLift(t1);
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const gun = new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.068, len + 0.03, 1, 0.015), goldMat);
      gun.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      gun.lookAt(x1, y1, z1);
      const lowerBand = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.08, len + 0.03, 1, 0.012), copperHullMat);
      lowerBand.position.set((x0 + x1) * 0.47, 0.16 + sheerLift((t0 + t1) * 0.5) * 0.35, (z0 + z1) * 0.5);
      lowerBand.lookAt(x1 * 0.94, 0.16 + sheerLift(t1) * 0.35, z1);
      boat.add(gun, lowerBand);
    }

    // 2 detailed wheeled brass/iron cannons per broadside
    [-0.08, 0.48].forEach((cz) => {
      const carriage = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.07, 0.14, 1, 0.015), railDarkMat);
      carriage.position.set(side * 0.48, 0.3, cz);
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.052, 0.28, 10), ironMat);
      cannon.rotation.z = side * (Math.PI / 2);
      cannon.position.set(side * 0.62, 0.36, cz);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 6, 10), goldMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * 0.74, 0.36, cz);
      boat.add(carriage, cannon, ring);
    });
  });

  // Floor decking & golden bow crest flush on prow stem (nothing poking forward)
  const floorDeck = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.05, 1.94, 2, 0.015), deckWoodMat);
  floorDeck.position.set(0, 0.095, 0.06);
  const bowCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
  bowCrest.scale.set(0.75, 1.0, 0.55);
  bowCrest.position.set(0, 0.54, 1.56);
  boat.add(floorDeck, bowCrest);

  // Raised Aft Stern Castle Transom with glowing gallery cabin windows & balusters
  const sternWall = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.48, 0.12, 2, 0.03), railDarkMat);
  sternWall.position.set(0, 0.36, -1.16);
  const sternTrimTop = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.07, 0.16, 2, 0.02), goldMat);
  sternTrimTop.position.set(0, 0.6, -1.16);
  boat.add(sternWall, sternTrimTop);

  const cabinGlowMat = new THREE.MeshStandardMaterial({
    color: '#FFE79A',
    emissive: '#FFAA2B',
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  lampBulbsOut?.push(cabinGlowMat);

  [-0.26, 0, 0.26].forEach((wx) => {
    const winFrame = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.04, 1, 0.01), goldMat);
    winFrame.position.set(wx, 0.42, -1.22);
    const winPane = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.11, 0.05, 1, 0.008), cabinGlowMat);
    winPane.position.set(wx, 0.42, -1.225);
    boat.add(winFrame, winPane);
  });

  // Ornate brass stern lantern on aft port quarter
  const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.58, 6), goldMat);
  lanternPole.position.set(0.38, 0.74, -1.14);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.07, 6), goldMat);
  lanternCap.position.set(0.38, 1.07, -1.14);
  const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.052, 0.14, 6), cabinGlowMat);
  lanternGlass.position.set(0.38, 0.98, -1.14);
  boat.add(lanternPole, lanternCap, lanternGlass);

  // Captain velvet seat bench at z = -0.56 + spoked ship's wheel behind helm
  const seatBench = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.08, 0.34, 2, 0.02), railDarkMat);
  seatBench.position.set(0, 0.28, -0.56);
  const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.065, 0.28, 2, 0.02), redVelvetMat);
  seatCushion.position.set(0, 0.34, -0.56);

  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.44, 8), railDarkMat);
  helmPost.position.set(0, 0.42, -0.96);
  const helmRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 7, 16), goldMat);
  helmRim.position.set(0, 0.64, -0.94);
  for (let sp = 0; sp < 4; sp++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6), brassMat);
    spoke.rotation.z = (sp * Math.PI) / 4;
    spoke.position.set(0, 0.64, -0.94);
    boat.add(spoke);
  }
  boat.add(seatBench, seatCushion, helmPost, helmRim);

  // Deck cargo props: hooped rum barrel + brass-strapped treasure chest + coiled hemp rope
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.24, 10), darkWoodMat);
  barrel.position.set(-0.34, 0.22, 0.94);
  const barrelHoop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 12), ironMat);
  barrelHoop.rotation.x = Math.PI / 2;
  barrelHoop.position.set(-0.34, 0.28, 0.94);
  const chestBody = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.16, 0.19, 2, 0.02), railDarkMat);
  chestBody.position.set(0.28, 0.18, 0.95);
  const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.28, 8, 1, false, 0, Math.PI), brassMat);
  chestLid.rotation.z = Math.PI / 2;
  chestLid.position.set(0.28, 0.26, 0.95);
  const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 6, 12), ropeMat);
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(0, 0.13, 0.98);
  boat.add(barrel, barrelHoop, chestBody, chestLid, ropeCoil);

  // Tall Mainmast, wooden crow's nest, shrouds & animated sailPivot (billowing striped mainsail + Jolly Roger)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.052, 1.82, 9), railDarkMat);
  mast.position.set(0, 0.98, 0.66);
  const crowsNest = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.14, 10), railDarkMat);
  crowsNest.position.set(0, 1.56, 0.66);
  const nestRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 12), goldMat);
  nestRim.rotation.x = Math.PI / 2;
  nestRim.position.set(0, 1.63, 0.66);
  boat.add(mast, crowsNest, nestRim);

  // Stay rope anchored cleanly from masthead (0, 1.76, 0.66) down to inner prow rail (0, 0.62, 1.42)
  const stayTop = new THREE.Vector3(0, 1.76, 0.66);
  const stayBow = new THREE.Vector3(0, 0.62, 1.42);
  const stayDir = stayBow.clone().sub(stayTop);
  const foreStay = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, stayDir.length(), 5),
    ropeMat,
  );
  foreStay.position.copy(stayTop).addScaledVector(stayDir, 0.5);
  foreStay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stayDir.normalize());
  boat.add(foreStay);

  const sailPivot = new THREE.Group();
  sailPivot.position.set(0, 1.46, 0.66);
  // Yardarm + billowing curved canvas sail + crimson vertical racing stripes
  const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.12, 8), railDarkMat);
  yardarm.rotation.z = Math.PI / 2;
  yardarm.position.set(0, -0.02, 0.04);
  const mainSail = new THREE.Mesh(makeCurvedSailGeo(0.98, 0.72, 0.14), sailClothMat);
  mainSail.position.set(0, -0.38, 0.05);
  [-0.24, 0.24].forEach((sx) => {
    const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.7, 0.03, 1, 0.005), sailStripeMat);
    stripe.position.set(sx, -0.38, 0.13);
    sailPivot.add(stripe);
  });
  // Top Jolly Roger pirate flag
  const flagCloth = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.3, 0.48, 1, 0.006), ironMat);
  flagCloth.position.set(0, 0.36, -0.25);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ivoryMat);
  skull.scale.set(0.35, 1, 1);
  skull.position.set(0, 0.38, -0.25);
  sailPivot.add(yardarm, mainSail, flagCloth, skull);
  boat.add(sailPivot);

  // Animated wooden oars
  let oarLPivot: THREE.Group | null = null;
  let oarRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.64, 0.49, 0.12);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.45, 7), deckWoodMat);
    shaft.rotation.z = side * 1.16;
    shaft.position.set(side * 0.36, -0.14, 0);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.028, 0.48, 2, 0.01), railDarkMat);
    blade.rotation.z = side * 1.16;
    blade.position.set(side * 0.98, -0.4, 0);
    pivot.add(shaft, blade);
    boat.add(pivot);
    if (side < 0) oarLPivot = pivot;
    else oarRPivot = pivot;
  });

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    if (oarLPivot) skipSet.add(oarLPivot);
    if (oarRPivot) skipSet.add(oarRPivot);
    skipSet.add(sailPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'oars',
    oarLPivot: withAnim ? oarLPivot : null,
    oarRPivot: withAnim ? oarRPivot : null,
    wheelPivot: null,
    crankPivot: null,
    pedalLPivot: null,
    pedalRPivot: null,
    sailPivot: withAnim ? sailPivot : null,
  };
}

/**
 * Ca Nô Thể Thao Retro (Luxury Riva-Mint Retro Speedboat) —
 * two-tone teal/cream stepped V-hull, inlaid teak foredeck & aft lounge deck,
 * chrome rub-rail, navigation lights & cleats, chrome-framed wrap-around windshield,
 * triple-gauge marine dashboard + 3-spoke sport steering wheel & chrome throttle,
 * bolstered camel bucket bench at z = -0.56, chrome ski-tow arch & swim ladder,
 * and streamlined cowled outboard motor with 3-blade brass propeller.
 */
export function buildSpeedboatRetro(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();
  const mintHullMat = new THREE.MeshStandardMaterial({color: '#34BCA4', roughness: 0.22, side: THREE.DoubleSide});
  const creamDeckMat = glossyClayMat('#FFF8EB', 0.22);
  const mahoganyMat = clayMat('#A85B31', 0.44);
  const teakInlayMat = clayMat('#E8CCA2', 0.52);
  const racingCoralMat = glossyClayMat('#F27852', 0.26);
  const leatherTanMat = clayMat('#D8964C', 0.52);
  const leatherCreamMat = clayMat('#F7E8D0', 0.5);
  const chromeMat = clayMat('#E2E9F0', 0.16, 0.88);
  const darkMetalMat = clayMat('#28313A', 0.42, 0.48);
  const goldPropMat = clayMat('#EBB844', 0.24, 0.78);
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#AEE8F8',
    roughness: 0.08,
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
  });

  const STATIONS = 12;
  const PROW_Z = 1.58;
  const STERN_Z = -1.18;
  const hullHalfW = (t: number) => {
    if (t > 0.54) return 0.69 * Math.pow(Math.max(0.03, (1 - t) / 0.46), 0.68);
    return THREE.MathUtils.lerp(0.63, 0.69, t / 0.54);
  };

  boat.add(
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.42 + (t > 0.6 ? (t - 0.6) * 0.24 : 0),
        (t) => 0.12 + (t > 0.6 ? (t - 0.6) * 0.12 : 0),
        () => 0.02,
        0,
        0,
      ),
      mintHullMat,
    ),
    new THREE.Mesh(
      createLoftedHullGeo(
        STATIONS,
        STERN_Z,
        PROW_Z,
        hullHalfW,
        (t) => 0.42 + (t > 0.6 ? (t - 0.6) * 0.24 : 0),
        (t) => 0.12 + (t > 0.6 ? (t - 0.6) * 0.12 : 0),
        () => 0.02,
        -0.06,
        0.05,
      ),
      creamDeckMat,
    ),
  );

  // Wrap-around chrome rub-rail & waterline cream pinstripe
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.015);
      const x1 = side * (hullHalfW(t1) + 0.015);
      const y0 = 0.43 + (t0 > 0.6 ? (t0 - 0.6) * 0.24 : 0);
      const y1 = 0.43 + (t1 > 0.6 ? (t1 - 0.6) * 0.24 : 0);
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const chromeRail = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.045, segLen + 0.03, 1, 0.015), chromeMat);
      chromeRail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      chromeRail.lookAt(x1, y1, z1);
      boat.add(chromeRail);
    }
    // Port (red) / Starboard (emerald) chrome navigation light pods on foredeck
    const navCol = side < 0 ? '#EF4444' : '#22C55E';
    const navPod = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.045, 0.09, 1, 0.015), chromeMat);
    navPod.position.set(side * 0.44, 0.51, 0.92);
    const navBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 7, 7),
      new THREE.MeshStandardMaterial({color: navCol, emissive: navCol, emissiveIntensity: 0.6}),
    );
    navBulb.position.set(side * 0.44, 0.52, 0.965);
    const cleat = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.03, 0.12, 1, 0.01), chromeMat);
    cleat.position.set(side * 0.52, 0.48, -0.92);
    boat.add(navPod, navBulb, cleat);
  });

  // Inlaid Mahogany Foredeck, Cream Nose & Maple Racing Stripes
  const foreDeck = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.08, 1.06, 2, 0.04), mahoganyMat);
  foreDeck.position.set(0, 0.46, 0.85);
  const bowNose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.66, 12), mahoganyMat);
  bowNose.rotation.x = Math.PI / 2;
  bowNose.scale.set(1.14, 1, 0.35);
  bowNose.position.set(0, 0.49, 1.33);
  const centerStripe = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.022, 1.2, 1, 0.005), racingCoralMat);
  centerStripe.position.set(0, 0.51, 0.92);
  [-0.22, 0.22].forEach((ix) => {
    const inlay = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.018, 0.95, 1, 0.004), teakInlayMat);
    inlay.position.set(ix, 0.506, 0.88);
    boat.add(inlay);
  });
  const transom = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.4, 0.1, 2, 0.03), creamDeckMat);
  transom.position.set(0, 0.25, STERN_Z + 0.04);
  const cockpitFloor = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.04, 1.38, 2, 0.015), teakInlayMat);
  cockpitFloor.position.set(0, 0.1, -0.35);
  boat.add(foreDeck, bowNose, centerStripe, transom, cockpitFloor);

  // Chrome-framed Wrap-Around Panoramic Windshield
  const wsCenter = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.28, 0.025, 1, 0.01), glassMat);
  wsCenter.position.set(0, 0.63, 0.38);
  wsCenter.rotation.x = -0.46;
  const wsTopBar = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.032, 0.04, 1, 0.01), chromeMat);
  wsTopBar.position.set(0, 0.75, 0.32);
  const wsBotBar = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.032, 0.04, 1, 0.01), chromeMat);
  wsBotBar.position.set(0, 0.51, 0.44);
  [-0.5, 0.5].forEach((sx) => {
    const wingGlass = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.24, 0.44, 1, 0.01), glassMat);
    wingGlass.position.set(sx, 0.6, 0.18);
    wingGlass.rotation.z = sx * -0.16;
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.28, 0.04, 1, 0.01), chromeMat);
    pillar.position.set(sx, 0.63, 0.34);
    pillar.rotation.x = -0.46;
    const topSide = new THREE.Mesh(new RoundedBoxGeometry(0.032, 0.03, 0.42, 1, 0.01), chromeMat);
    topSide.position.set(sx * 1.02, 0.72, 0.15);
    boat.add(wingGlass, pillar, topSide);
  });
  boat.add(wsCenter, wsTopBar, wsBotBar);

  // Triple-gauge Dash Console + 3-Spoke Sport Wheel + Chrome Throttle Lever
  const dash = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.2, 0.2, 2, 0.03), mahoganyMat);
  dash.position.set(0, 0.4, 0.24);
  const dashTrim = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.04, 0.21, 1, 0.01), creamDeckMat);
  dashTrim.position.set(0, 0.49, 0.24);
  [-0.02, 0.12, 0.26].forEach((gx, idx) => {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.024, 12), chromeMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(gx, 0.42, 0.135);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.028, 12), leatherCreamMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(gx, 0.42, 0.133);
    const needle = new THREE.Mesh(new RoundedBoxGeometry(0.008, 0.028, 0.01, 1, 0.002), racingCoralMat);
    needle.rotation.z = idx === 1 ? -0.5 : 0.45;
    needle.position.set(gx, 0.42, 0.118);
    boat.add(bezel, dial, needle);
  });

  const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.24, 8), chromeMat);
  steeringCol.rotation.x = 0.62;
  steeringCol.position.set(-0.24, 0.48, 0.1);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.019, 8, 20), leatherTanMat);
  steeringWheel.rotation.x = 0.62;
  steeringWheel.position.set(-0.24, 0.54, 0.01);
  const steeringHub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.025, 10), chromeMat);
  steeringHub.rotation.x = 0.62 - Math.PI / 2;
  steeringHub.position.set(-0.24, 0.54, 0.01);
  // Side chrome throttle lever with coral knob
  const throttleBase = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.08, 0.12, 1, 0.015), chromeMat);
  throttleBase.position.set(-0.48, 0.44, -0.05);
  const throttleStick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), chromeMat);
  throttleStick.rotation.x = 0.45;
  throttleStick.position.set(-0.48, 0.52, -0.02);
  const throttleKnob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), racingCoralMat);
  throttleKnob.position.set(-0.48, 0.59, 0.015);
  boat.add(dash, dashTrim, steeringCol, steeringWheel, steeringHub, throttleBase, throttleStick, throttleKnob);

  // Bow Chrome Headlight Pod
  const bowLightMat = new THREE.MeshStandardMaterial({
    color: '#FFF5CC',
    emissive: '#FFE066',
    emissiveIntensity: 0.5,
    roughness: 0.18,
  });
  lampBulbsOut?.push(bowLightMat);
  const headlightRim = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.06, 12), chromeMat);
  headlightRim.rotation.x = Math.PI / 2;
  headlightRim.position.set(0, 0.54, 1.44);
  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), bowLightMat);
  headlight.position.set(0, 0.54, 1.48);
  boat.add(headlightRim, headlight);

  // Bolstered Pleated Bucket Seat Bench at z = -0.56 + Rear Lounge Pad + Swim Platform & Ladder
  const seatBase = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.16, 0.42, 2, 0.04), creamDeckMat);
  seatBase.position.set(0, 0.19, -0.56);
  const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.11, 0.38, 2, 0.03), leatherTanMat);
  seatCushion.position.set(0, 0.29, -0.56);
  const seatInsert = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.12, 0.3, 2, 0.025), leatherCreamMat);
  seatInsert.position.set(0, 0.295, -0.55);
  const seatBack = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.34, 0.12, 2, 0.035), leatherTanMat);
  seatBack.position.set(0, 0.46, -0.78);
  seatBack.rotation.x = -0.15;
  const sunDeck = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.12, 0.28, 2, 0.03), mahoganyMat);
  sunDeck.position.set(0, 0.44, -0.98);
  const skiArch = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 7, 14, Math.PI), chromeMat);
  skiArch.position.set(0, 0.49, -1.04);
  boat.add(seatBase, seatCushion, seatInsert, seatBack, sunDeck, skiArch);

  // Rear swim platform + chrome ladder on port transom
  const swimPlatform = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.04, 0.2, 1, 0.01), teakInlayMat);
  swimPlatform.position.set(-0.34, 0.16, -1.24);
  const ladder = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.24, 0.03, 1, 0.01), chromeMat);
  ladder.position.set(-0.34, 0.12, -1.35);
  boat.add(swimPlatform, ladder);

  // Streamlined Cowled Outboard Motor & Spinning 3-Blade Brass Propeller (wheelPivot)
  const motorPod = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.36, 0.28, 2, 0.05), darkMetalMat);
  motorPod.position.set(0, 0.54, -1.26);
  const motorCap = new THREE.Mesh(new RoundedBoxGeometry(0.29, 0.11, 0.29, 2, 0.04), mintHullMat);
  motorCap.position.set(0, 0.69, -1.26);
  const motorStripe = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.04, 0.26, 1, 0.01), creamDeckMat);
  motorStripe.position.set(0, 0.61, -1.26);
  const shaft = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.38, 0.11, 1, 0.02), chromeMat);
  shaft.position.set(0, 0.24, -1.25);
  boat.add(motorPod, motorCap, motorStripe, shaft);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.12, -1.33);
  const propHub = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.11, 8), goldPropMat);
  propHub.rotation.x = -Math.PI / 2;
  wheelPivot.add(propHub);
  for (let b = 0; b < 3; b++) {
    const bladeGrp = new THREE.Group();
    bladeGrp.rotation.z = (b * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.15, 0.018, 1, 0.005), goldPropMat);
    blade.position.y = 0.09;
    blade.rotation.y = 0.42;
    bladeGrp.add(blade);
    wheelPivot.add(bladeGrp);
  }
  boat.add(wheelPivot);

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) skipSet.add(wheelPivot);
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'motor',
    oarLPivot: null,
    oarRPivot: null,
    wheelPivot: withAnim ? wheelPivot : null,
    crankPivot: null,
    pedalLPivot: null,
    pedalRPivot: null,
  };
}

/**
 * Unified factory building any of the 6 boat skins with identical player seating (z = -0.56).
 */
export function buildBoatById(
  boatId: BoatId,
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  switch (boatId) {
    case 'duck_boat': {
      const built = buildDuckPedalBoat(withAnim, lampBulbsOut);
      return {
        boat: built.boat,
        driveKind: 'pedal',
        oarLPivot: null,
        oarRPivot: null,
        wheelPivot: built.wheelPivot,
        crankPivot: built.crankPivot,
        pedalLPivot: built.pedalLPivot,
        pedalRPivot: built.pedalRPivot,
      };
    }
    case 'swan_princess_boat':
      return buildSwanPrincessBoat(withAnim, lampBulbsOut);
    case 'pirate_galleon_boat':
      return buildPirateGalleonBoat(withAnim, lampBulbsOut);
    case 'speedboat_retro':
      return buildSpeedboatRetro(withAnim, lampBulbsOut);
    case 'lotus_lantern_boat':
      return buildLotusLanternBoat(withAnim, lampBulbsOut);
    case 'wooden_boat':
    default: {
      const built = buildWoodenRowboat(withAnim, lampBulbsOut);
      return {
        boat: built.boat,
        driveKind: 'oars',
        oarLPivot: built.oarLPivot,
        oarRPivot: built.oarRPivot,
        wheelPivot: null,
        crankPivot: null,
        pedalLPivot: null,
        pedalRPivot: null,
      };
    }
  }
}
