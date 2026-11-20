import * as THREE from 'three';
import {
  AvatarConfig,
  HairBackStyle,
  HairFrontStyle,
  HeadItemStyle,
} from '../types/game';

// Shared sculpted chibi-sims head constants (centered at y = 0.30 inside headPivot)
export const HEAD_CY = 0.3;
export const HEAD_RX = 0.312;
export const HEAD_RY = 0.296;
export const HEAD_RZ = 0.288;

export type HatFitMode = 'none' | 'crown_cap' | 'headband';

export interface HatAttachmentPoints {
  crownTop: {position: THREE.Vector3; rotation: THREE.Euler; radius: number};
  crownTilted: {position: THREE.Vector3; rotation: THREE.Euler};
  foreheadRim: {position: THREE.Vector3; rotation: THREE.Euler};
  headbandArc: {center: THREE.Vector3; radius: number; tiltX: number};
  templeLeft: {position: THREE.Vector3; rotation: THREE.Euler; normal: THREE.Vector3};
  templeRight: {position: THREE.Vector3; rotation: THREE.Euler; normal: THREE.Vector3};
  backCrown: {position: THREE.Vector3; rotation: THREE.Euler};
  napeAnchor: {position: THREE.Vector3; rotation: THREE.Euler};
}

export interface CharacterHairAssembly {
  root: THREE.Group;
  hairBase: THREE.Group;
  frontHair: THREE.Group;
  sideHair: THREE.Group;
  backHair: THREE.Group;
  hairAccessories: THREE.Group;
  hatAttachmentPoints: THREE.Group;
  attachments: HatAttachmentPoints;
}

export const smoothstep01 = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Evaluates a point on the sculpted stylized chibi head surface + optional radial offset.
 */
export function headSurfacePoint(
  latDeg: number,
  lonDeg: number,
  offset = 0.0,
  includeNose = false,
): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const absLon = Math.abs(lonDeg);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);

  const frontMask =
    Math.max(0, Math.cos(lon)) *
    smoothstep01(42, 95, latDeg) *
    (1 - smoothstep01(130, 168, latDeg));
  const frontFlatten = 1 - 0.055 * frontMask;

  const cheekFull =
    0.014 *
    Math.exp(-Math.pow((latDeg - 114) / 18, 2)) *
    Math.exp(-Math.pow((absLon - 48) / 22, 2));
  const jawTaper = 1 - 0.1 * smoothstep01(114, 165, latDeg);
  const chinLift = 0.018 * smoothstep01(122, 175, latDeg);

  const noseBump = includeNose
    ? 0.018 *
      Math.exp(-Math.pow((latDeg - 103) / 6.5, 2)) *
      Math.exp(-Math.pow(absLon / 7.5, 2))
    : 0;

  const rx = (HEAD_RX + offset) * jawTaper + cheekFull;
  const ry = HEAD_RY + offset;
  const rz = (HEAD_RZ + offset) * frontFlatten + noseBump;

  const x = rx * sinLat * Math.sin(lon);
  const y = HEAD_CY + ry * cosLat + chinLift;
  const z = rz * sinLat * Math.cos(lon);
  return [x, y, z];
}

function headOutwardNormal(latDeg: number, lonDeg: number): THREE.Vector3 {
  const p0 = headSurfacePoint(latDeg, lonDeg, 0);
  const p1 = headSurfacePoint(latDeg, lonDeg, 0.03);
  return new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
}

/**
 * Smooth matte-satin stylized 3D polymer-clay hair material:
 * soft light transition, subtle clay sheen, zero plastic glare, zero strand textures.
 */
export function createHairClayMaterial(color: string | number): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.66,
    metalness: 0.0,
    sheen: 0.36,
    sheenRoughness: 0.76,
    sheenColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.28),
    clearcoat: 0.0,
    envMapIntensity: 0.52,
  });
}

export function resolveHatFitMode(headItem?: HeadItemStyle): HatFitMode {
  if (
    headItem === 'beret' ||
    headItem === 'sunhat' ||
    headItem === 'cap' ||
    headItem === 'beanie'
  ) {
    return 'crown_cap';
  }
  if (
    headItem === 'cat_ears' ||
    headItem === 'flower_crown' ||
    headItem === 'ribbon_bow'
  ) {
    return 'headband';
  }
  return 'none';
}

function isMaleStyle(hairBack: HairBackStyle): boolean {
  return (
    hairBack === 'short_crop' ||
    hairBack === 'boy_1' ||
    hairBack === 'boy_2' ||
    hairBack === 'boy_3'
  );
}

interface LockStep {
  lat: number;
  lon: number;
  offset: number;
}

function sampleHeadSteps(
  steps: LockStep[],
  samples = 14,
): [number, number, number][] {
  if (samples <= 1 || steps.length < 2) {
    return steps.map((s) => headSurfacePoint(s.lat, s.lon, s.offset));
  }
  const paramPts = steps.map((s) => new THREE.Vector3(s.lat, s.lon, s.offset));
  const curve = new THREE.CatmullRomCurve3(paramPts, false, 'centripetal', 0.5);
  const out: [number, number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const p = curve.getPointAt(i / samples);
    out.push(headSurfacePoint(p.x, p.y, p.z));
  }
  return out;
}

interface ClayLockOptions {
  width: number;
  depth: number;
  innerFlatten?: number;
  ridgeBoost?: number;
  profile?: 'bangs' | 'lock' | 'wave' | 'bob' | 'quiff';
  outwardMode?: 'spherical' | 'drape';
  tipLift?: number;
  tubularSegs?: number;
  radialSegs?: number;
  roundTipScale?: number;
}

const _headCenter = new THREE.Vector3(0, HEAD_CY, 0);
const _fallbackUp = new THREE.Vector3(0, 1, 0);

/**
 * Builds a plush, rounded polymer-clay hair lock with:
 * - Skull-aligned frame (never flips or twists like raw Frenet frames)
 * - Soft superellipse cross-section (flat snug inner fit, plump rounded clay outer belly)
 * - Rounded droplet tip & smooth root cap (no sharp rigid triangular needles)
 */
function createClayLockGeometry(
  points: [number, number, number][],
  opts: ClayLockOptions,
): THREE.BufferGeometry {
  const {
    width,
    depth,
    innerFlatten = 0.42,
    ridgeBoost = 0.08,
    profile = 'lock',
    outwardMode = 'spherical',
    tipLift = 0.0,
    tubularSegs = 16,
    radialSegs = 10,
    roundTipScale = 0.28,
  } = opts;

  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);

  const evalProfileScale = (t: number): {wScale: number; dScale: number} => {
    if (profile === 'bangs') {
      const rootEase = smoothstep01(0.0, 0.18, t);
      const tipEase = 1 - (1 - roundTipScale) * Math.pow(smoothstep01(0.55, 1.0, t), 1.45);
      return {
        wScale: Math.max(0.28, (0.62 + 0.38 * rootEase) * tipEase),
        dScale: Math.max(0.24, (0.48 + 0.52 * rootEase) * tipEase),
      };
    }
    if (profile === 'quiff') {
      const rootEase = smoothstep01(0.0, 0.2, t);
      const swell = 0.85 + 0.32 * Math.sin(Math.pow(t, 0.8) * Math.PI);
      const tipEase = 1 - 0.56 * Math.pow(smoothstep01(0.65, 1.0, t), 1.4);
      return {
        wScale: Math.max(0.32, (0.58 + 0.42 * rootEase) * swell * tipEase),
        dScale: Math.max(0.28, (0.52 + 0.48 * rootEase) * swell * tipEase),
      };
    }
    if (profile === 'wave') {
      const rootEase = smoothstep01(0.0, 0.18, t);
      const swell = 0.86 + 0.22 * Math.sin(smoothstep01(0.05, 0.85, t) * Math.PI);
      const tipTaper = 1 - (1 - roundTipScale) * Math.pow(smoothstep01(0.68, 1.0, t), 1.45);
      return {
        wScale: Math.max(0.32, (0.62 + 0.38 * rootEase) * swell * tipTaper),
        dScale: Math.max(0.28, (0.56 + 0.44 * rootEase) * swell * tipTaper),
      };
    }
    if (profile === 'bob') {
      const rootEase = smoothstep01(0.0, 0.18, t);
      const swell = 0.88 + 0.2 * Math.sin(t * Math.PI);
      const tipTaper = 1 - 0.48 * Math.pow(smoothstep01(0.7, 1.0, t), 1.5);
      return {
        wScale: Math.max(0.36, (0.6 + 0.4 * rootEase) * swell * tipTaper),
        dScale: Math.max(0.28, (0.52 + 0.48 * rootEase) * swell * tipTaper),
      };
    }
    const belly = Math.pow(Math.sin(t * Math.PI), 0.45);
    const skew = 0.82 + 0.18 * (1 - t);
    return {
      wScale: Math.max(0.24, belly * skew),
      dScale: Math.max(0.24, belly * skew),
    };
  };

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const center = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    let radial: THREE.Vector3;
    if (outwardMode === 'drape') {
      const horiz = new THREE.Vector3(center.x, 0.06, center.z - 0.03);
      const sph = center.clone().sub(_headCenter);
      const mix = smoothstep01(0.3, 0.0, center.y);
      radial = sph.normalize().lerp(horiz.normalize(), mix).normalize();
    } else {
      radial = center.clone().sub(_headCenter);
      if (radial.lengthSq() < 1e-5) radial.set(0, 0, 1);
      radial.normalize();
    }

    const outDir = radial.clone().addScaledVector(tan, -radial.dot(tan));
    if (outDir.lengthSq() < 1e-4) {
      outDir.copy(_fallbackUp).addScaledVector(tan, -_fallbackUp.dot(tan));
      if (outDir.lengthSq() < 1e-4) outDir.set(0, 0, 1);
    }
    outDir.normalize();

    const sideDir = tan.clone().cross(outDir).normalize();
    const {wScale, dScale} = evalProfileScale(t);
    const endRound = i === 0 ? 0.56 : i === tubularSegs ? 0.48 : 1.0;
    const w = width * wScale * endRound;
    const h = depth * dScale * endRound;
    const curlOut = tipLift * Math.pow(smoothstep01(0.55, 1.0, t), 1.8);

    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Soft superellipse clay cross-section
      const sx = Math.sign(cos) * Math.pow(Math.abs(cos), 0.88);
      const sy = Math.sign(sin) * Math.pow(Math.abs(sin), 0.9);
      const lateral = sx * w;
      const ridge = sy > 0 ? 1 + ridgeBoost * Math.pow(sy, 1.4) : innerFlatten;
      const out = sy * h * ridge + curlOut;

      positions.push(
        center.x + sideDir.x * lateral + outDir.x * out,
        center.y + sideDir.y * lateral + outDir.y * out,
        center.z + sideDir.z * lateral + outDir.z * out,
      );
    }
  }

  for (let i = 0; i < tubularSegs; i++) {
    const rowA = i * radialSegs;
    const rowB = (i + 1) * radialSegs;
    for (let j = 0; j < radialSegs; j++) {
      const nextJ = (j + 1) % radialSegs;
      const a = rowA + j;
      const b = rowB + j;
      const c = rowB + nextJ;
      const d = rowA + nextJ;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Smooth rounded dome end-caps
  const startCenterIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  const t0 = curve.getTangentAt(0).normalize();
  positions.push(p0.x - t0.x * 0.008, p0.y - t0.y * 0.008, p0.z - t0.z * 0.008);
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(startCenterIdx, j, nextJ);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  positions.push(p1.x + t1.x * 0.011, p1.y + t1.y * 0.011, p1.z + t1.z * 0.011);
  const lastRow = tubularSegs * radialSegs;
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(endCenterIdx, lastRow + nextJ, lastRow + j);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * 1. HAIR BASE:
 * Anatomical sculpted cranial cap hugging the skull softly:
 * - Natural forehead curve, temple curve, arching cleanly ABOVE ears, tapering snugly to nape.
 * - Never forms a giant monolithic bell or rigid plastic bowl.
 * - Adapts crown contour cleanly into a tailored hat-seat when wearing a hat.
 */
function createHairBaseGeometry(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hatMode: HatFitMode,
): {geom: THREE.BufferGeometry; crownOuterOffset: number} {
  const lonSegs = 64;
  const outerSegs = 20;
  const lipSegs = 3;
  const innerSegs = 5;

  const male = isMaleStyle(hairBack);
  const isHatCap = hatMode === 'crown_cap';

  const partLon =
    hairBack === 'boy_1'
      ? 24
      : hairBack === 'boy_2' || (!male && hairFront === 'curtain')
        ? 0
        : !male && hairFront === 'side_sweep'
          ? -24
          : null;

  const baseCrownLoft = isHatCap ? 0.013 : male ? 0.025 : 0.027;

  const getPerimeterLat = (lonDeg: number): number => {
    const a = Math.abs(lonDeg);

    // Forehead hairline stays softly tucked behind FrontHair locks
    const browLat =
      !male && hairFront === 'curtain'
        ? 54 - 8 * Math.exp(-Math.pow(lonDeg / 14, 2))
        : hairBack === 'boy_2'
          ? 54 - 9 * Math.exp(-Math.pow(lonDeg / 13, 2))
          : hairBack === 'boy_1'
            ? 56 - 7 * Math.exp(-Math.pow((lonDeg - 24) / 14, 2))
            : 56;

    // Gentle temple contour in front of ears
    const toTemple = smoothstep01(40, 62, a);
    const sideburnDrop = (male ? 13 : 15) * Math.exp(-Math.pow((a - 62) / 7, 2));

    // Arch cleanly ABOVE ear top (lat ~ 74°)
    const earArch = smoothstep01(68, 82, a) * (1 - smoothstep01(95, 110, a));

    let endLat = browLat + toTemple * (75 - browLat) + sideburnDrop;
    endLat = endLat * (1 - earArch * 0.14) + 73 * earArch * 0.14;

    // Nape contour behind ears
    const centerBackNape =
      hairBack === 'boy_2'
        ? 124
        : hairBack === 'boy_1'
          ? 116
          : hairBack === 'boy_3'
            ? 120
            : hairBack === 'short_crop'
              ? 118
              : hairBack === 'long_wave' || hairBack === 'bob_cut'
                ? 116
                : 120;

    const toNape = smoothstep01(96, 128, a);
    const napeWave = 3.5 * Math.cos(((a - 180) * Math.PI) / 36) * smoothstep01(135, 180, a);
    endLat = endLat + toNape * (centerBackNape + napeWave - endLat);
    return endLat;
  };

  const evalCapVertex = (lonDeg: number, s: number): [number, number, number] => {
    const a = Math.abs(lonDeg);
    const endLat = getPerimeterLat(lonDeg);

    const evalAlongSurface = (vSurf: number, wallBias: number): [number, number, number] => {
      const latDeg = vSurf * endLat;

      const frontTapering =
        Math.max(0, Math.cos((lonDeg * Math.PI) / 180)) *
        smoothstep01(0.45, 1.0, vSurf);
      const napeTapering =
        smoothstep01(0.68, 1.0, vSurf) * smoothstep01(96, 132, a);

      // Crown cushion + natural hat-seat indentation when wearing crown hats
      let crownShape =
        baseCrownLoft *
        (1 + 0.18 * Math.sin(vSurf * Math.PI * 0.82)) *
        (1 - 0.52 * frontTapering) *
        (1 - 0.55 * napeTapering);

      if (isHatCap && vSurf < 0.72) {
        const seatFade = 1 - vSurf / 0.72;
        crownShape = THREE.MathUtils.lerp(crownShape, 0.008, seatFade * seatFade);
      }

      const partContour =
        partLon !== null
          ? (-0.005 * Math.exp(-Math.pow((lonDeg - partLon) / 6.5, 2)) +
              0.006 * Math.exp(-Math.pow((Math.abs(lonDeg - partLon) - 18) / 12, 2))) *
            smoothstep01(0.08, 0.36, vSurf) *
            (1 - 0.7 * smoothstep01(0.65, 1.0, vSurf)) *
            (isHatCap ? 0.3 : 1.0)
          : 0;

      const occiputShape =
        a > 105
          ? 0.01 *
            Math.exp(-Math.pow((vSurf - 0.58) / 0.24, 2)) *
            smoothstep01(105, 145, a)
          : 0;

      const tipPinch = 1 - 0.45 * smoothstep01(0.82, 1.0, vSurf);
      const thickness = (isHatCap ? 0.009 : 0.013) * tipPinch;

      const offset = Math.max(
        0.002,
        crownShape + partContour + occiputShape + wallBias * thickness,
      );
      return headSurfacePoint(latDeg, lonDeg, offset);
    };

    if (s <= 1.0) return evalAlongSurface(s, 0.5);
    if (s <= 2.0) {
      const ang = (s - 1.0) * Math.PI;
      const [ox, oy, oz] = evalAlongSurface(1.0, 0.5);
      const [ix, iy, iz] = evalAlongSurface(1.0, -0.5);
      const cx = (ox + ix) * 0.5;
      const cy = (oy + iy) * 0.5;
      const cz = (oz + iz) * 0.5;
      const hx = (ox - ix) * 0.5;
      const hy = (oy - iy) * 0.5;
      const hz = (oz - iz) * 0.5;
      const lip = Math.hypot(hx, hz) * 0.8;
      return [
        cx + hx * Math.cos(ang),
        cy + hy * Math.cos(ang) - lip * Math.sin(ang),
        cz + hz * Math.cos(ang),
      ];
    }
    const inU = s - 2.0;
    return evalAlongSurface(1.0 - inU * 0.25, -0.5);
  };

  const sValues: number[] = [];
  for (let i = 1; i <= outerSegs; i++) sValues.push(i / outerSegs);
  for (let i = 1; i <= lipSegs; i++) sValues.push(1.0 + i / lipSegs);
  for (let i = 1; i <= innerSegs; i++) sValues.push(2.0 + i / innerSegs);

  const positions: number[] = [];
  const indices: number[] = [];

  const [px0, py0, pz0] = evalCapVertex(0, 0);
  positions.push(px0, py0, pz0);

  for (const s of sValues) {
    for (let j = 0; j < lonSegs; j++) {
      const lonDeg = -180 + (j / lonSegs) * 360;
      const [x, y, z] = evalCapVertex(lonDeg, s);
      positions.push(x, y, z);
    }
  }

  for (let j = 0; j < lonSegs; j++) {
    const nextJ = (j + 1) % lonSegs;
    indices.push(0, 1 + j, 1 + nextJ);
  }

  const ringCount = sValues.length;
  for (let i = 0; i < ringCount - 1; i++) {
    const rowA = 1 + i * lonSegs;
    const rowB = 1 + (i + 1) * lonSegs;
    for (let j = 0; j < lonSegs; j++) {
      const nextJ = (j + 1) % lonSegs;
      const a = rowA + j;
      const b = rowB + j;
      const c = rowB + nextJ;
      const d = rowA + nextJ;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return {geom, crownOuterOffset: baseCrownLoft + 0.008};
}

/**
 * 2. FRONT HAIR:
 * Built strictly from overlapping, rounded sculpted clay locks (NO flat visor sheet!).
 * Supports male styles (side-parted crop, comma curtain, tousled clay crop, swept-up quiff)
 * and female bangs (air_bangs, side_sweep, curtain, neat_fringe).
 */
function buildFrontHairLocks(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hairMat: THREE.Material,
  hatMode: HatFitMode,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'FrontHair';
  const male = isMaleStyle(hairBack);
  const isHatCap = hatMode === 'crown_cap';
  const rootLatBase = isHatCap ? 32 : 20;
  const rootOff = isHatCap ? 0.014 : 0.025;

  const addLock = (
    steps: LockStep[],
    width: number,
    depth: number,
    opts?: Partial<ClayLockOptions>,
  ) => {
    const adjusted = steps.map((s, idx) => ({
      lat: idx === 0 ? Math.max(s.lat, rootLatBase) : s.lat,
      lon: s.lon,
      offset:
        idx === 0
          ? Math.min(s.offset, rootOff)
          : isHatCap && idx === 1
            ? Math.max(0.018, s.offset - 0.007)
            : s.offset,
    }));
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(sampleHeadSteps(adjusted, 14), {
          width,
          depth,
          innerFlatten: 0.42,
          ridgeBoost: 0.1,
          profile: 'bangs',
          tubularSegs: 14,
          radialSegs: 10,
          roundTipScale: 0.3,
          ...opts,
        }),
        hairMat,
      ),
    );
  };

  // ---- MALE STYLES ----
  if (hairBack === 'short_crop') {
    // Swept-up / textured clay quiff (or neat under-brim swept fringe with hat)
    if (!isHatCap) {
      addLock(
        [
          {lat: 56, lon: -6, offset: 0.022},
          {lat: 38, lon: -10, offset: 0.068},
          {lat: 16, lon: -18, offset: 0.044},
        ],
        0.072,
        0.036,
        {profile: 'quiff', roundTipScale: 0.36},
      );
      addLock(
        [
          {lat: 56, lon: 14, offset: 0.022},
          {lat: 39, lon: 4, offset: 0.062},
          {lat: 19, lon: -6, offset: 0.04},
        ],
        0.064,
        0.032,
        {profile: 'quiff', roundTipScale: 0.34},
      );
      addLock(
        [
          {lat: 56, lon: -24, offset: 0.02},
          {lat: 42, lon: -28, offset: 0.05},
          {lat: 24, lon: -32, offset: 0.034},
        ],
        0.056,
        0.028,
        {profile: 'quiff', roundTipScale: 0.34},
      );
      addLock(
        [
          {lat: 55, lon: 32, offset: 0.02},
          {lat: 44, lon: 24, offset: 0.042},
          {lat: 26, lon: 14, offset: 0.03},
        ],
        0.052,
        0.024,
        {profile: 'quiff', roundTipScale: 0.32},
      );
    } else {
      // Hat-compatible groomed side-swept fringe peeking smoothly from under hat brim
      addLock(
        [
          {lat: 38, lon: 14, offset: 0.015},
          {lat: 56, lon: -4, offset: 0.026},
          {lat: 68, lon: -22, offset: 0.016},
        ],
        0.074,
        0.022,
      );
      addLock(
        [
          {lat: 40, lon: -10, offset: 0.015},
          {lat: 58, lon: -26, offset: 0.024},
          {lat: 70, lon: -42, offset: 0.015},
        ],
        0.062,
        0.02,
      );
    }
    return grp;
  }

  if (hairBack === 'boy_1') {
    // Sleek side-parted crop (parted at +24°): 4 overlapping smooth diagonal clay locks
    const locks: Array<{steps: LockStep[]; w: number; d: number}> = [
      {
        steps: [
          {lat: 20, lon: 22, offset: 0.024},
          {lat: 48, lon: 6, offset: 0.038},
          {lat: 74, lon: -12, offset: 0.022},
        ],
        w: 0.072,
        d: 0.024,
      },
      {
        steps: [
          {lat: 22, lon: 14, offset: 0.024},
          {lat: 50, lon: -14, offset: 0.036},
          {lat: 73, lon: -32, offset: 0.02},
        ],
        w: 0.066,
        d: 0.022,
      },
      {
        steps: [
          {lat: 24, lon: 2, offset: 0.024},
          {lat: 52, lon: -32, offset: 0.032},
          {lat: 72, lon: -48, offset: 0.018},
        ],
        w: 0.056,
        d: 0.02,
      },
      {
        steps: [
          {lat: 24, lon: 28, offset: 0.024},
          {lat: 50, lon: 38, offset: 0.034},
          {lat: 72, lon: 48, offset: 0.018},
        ],
        w: 0.058,
        d: 0.02,
      },
    ];
    locks.forEach((l) => addLock(l.steps, l.w, l.d));
    return grp;
  }

  if (hairBack === 'boy_2') {
    // Romantic Center-Parted Comma Curtain Bangs (Rẽ ngôi lãng tử)
    [-1, 1].forEach((side) => {
      addLock(
        [
          {lat: 18, lon: side * 4, offset: 0.025},
          {lat: 46, lon: side * 22, offset: 0.042},
          {lat: 68, lon: side * 27, offset: 0.032},
          {lat: 78, lon: side * 14, offset: 0.02},
        ],
        0.066,
        0.025,
      );
      addLock(
        [
          {lat: 22, lon: side * 10, offset: 0.024},
          {lat: 50, lon: side * 34, offset: 0.038},
          {lat: 74, lon: side * 46, offset: 0.022},
        ],
        0.06,
        0.022,
      );
    });
    return grp;
  }

  if (hairBack === 'boy_3') {
    // Fluffy Clay Crop (Mái ngố đất sét nhiều lọn mềm bo tròn)
    const cropLocks: Array<{lon0: number; lonMid: number; lonEnd: number; latEnd: number; w: number}> = [
      {lon0: -2, lonMid: 0, lonEnd: 2, latEnd: 74, w: 0.064},
      {lon0: -14, lonMid: -16, lonEnd: -18, latEnd: 73, w: 0.06},
      {lon0: 14, lonMid: 16, lonEnd: 18, latEnd: 73, w: 0.06},
      {lon0: -28, lonMid: -33, lonEnd: -38, latEnd: 71, w: 0.056},
      {lon0: 28, lonMid: 33, lonEnd: 38, latEnd: 71, w: 0.056},
    ];
    cropLocks.forEach((c) =>
      addLock(
        [
          {lat: 20, lon: c.lon0, offset: 0.024},
          {lat: 48, lon: c.lonMid, offset: 0.038},
          {lat: c.latEnd, lon: c.lonEnd, offset: 0.022},
        ],
        c.w,
        0.024,
        {roundTipScale: 0.34},
      ),
    );
    if (!isHatCap) {
      // Soft rounded crown curls (never sharp)
      addLock(
        [
          {lat: 14, lon: -10, offset: 0.026},
          {lat: 22, lon: 6, offset: 0.044},
          {lat: 34, lon: 20, offset: 0.032},
        ],
        0.056,
        0.024,
        {profile: 'lock'},
      );
    }
    return grp;
  }

  // ---- FEMALE BANGS STYLES ('air_bangs' | 'side_sweep' | 'curtain' | 'neat_fringe') ----
  if (!male) {
    if (hairFront === 'neat_fringe') {
      // Sculpted clay doll bangs: 5 lush overlapping rounded locks forming a soft curved fringe
      const locks = [
        {l0: 0, l1: 0, latEnd: 76, w: 0.068, off: 0.036},
        {l0: -14, l1: -17, latEnd: 75.5, w: 0.065, off: 0.035},
        {l0: 14, l1: 17, latEnd: 75.5, w: 0.065, off: 0.035},
        {l0: -28, l1: -36, latEnd: 74, w: 0.062, off: 0.033},
        {l0: 28, l1: 36, latEnd: 74, w: 0.062, off: 0.033},
        {l0: -40, l1: -50, latEnd: 74, w: 0.056, off: 0.028},
        {l0: 40, l1: 50, latEnd: 74, w: 0.056, off: 0.028},
      ];
      locks.forEach((b) =>
        addLock(
          [
            {lat: 20, lon: b.l0, offset: 0.025},
            {lat: 50, lon: (b.l0 + b.l1) * 0.5, offset: b.off},
            {lat: b.latEnd, lon: b.l1, offset: 0.022},
          ],
          b.w,
          0.024,
          {roundTipScale: 0.36},
        ),
      );
    } else if (hairFront === 'curtain') {
      // Sculpted arched S-curve curtain bangs with inner & outer overlapping layers
      [-1, 1].forEach((side) => {
        addLock(
          [
            {lat: 18, lon: side * 4, offset: 0.026},
            {lat: 48, lon: side * 24, offset: 0.042},
            {lat: 74, lon: side * 38, offset: 0.028},
            {lat: 84, lon: side * 44, offset: 0.02},
          ],
          0.066,
          0.024,
        );
        addLock(
          [
            {lat: 22, lon: side * 12, offset: 0.025},
            {lat: 52, lon: side * 36, offset: 0.038},
            {lat: 78, lon: side * 52, offset: 0.022},
          ],
          0.06,
          0.022,
        );
      });
    } else if (hairFront === 'side_sweep') {
      // Sweeping diagonal clay bangs parted softly at -22°
      const sweeps = [
        {pts: [{lat: 18, lon: -22, offset: 0.025}, {lat: 48, lon: -2, offset: 0.04}, {lat: 74, lon: 18, offset: 0.022}], w: 0.072},
        {pts: [{lat: 20, lon: -16, offset: 0.025}, {lat: 50, lon: 14, offset: 0.038}, {lat: 75, lon: 34, offset: 0.021}], w: 0.064},
        {pts: [{lat: 24, lon: -8, offset: 0.024}, {lat: 54, lon: 30, offset: 0.034}, {lat: 74, lon: 48, offset: 0.018}], w: 0.056},
        {pts: [{lat: 22, lon: -28, offset: 0.024}, {lat: 52, lon: -38, offset: 0.034}, {lat: 74, lon: -48, offset: 0.019}], w: 0.058},
      ];
      sweeps.forEach((s) => addLock(s.pts, s.w, 0.023));
    } else {
      // air_bangs: airy sculpted locks leaving soft brow glimpses between rounded clay strands
      const airLocks = [
        {l0: -2, l1: -3, latEnd: 75, w: 0.054, off: 0.036},
        {l0: 12, l1: 18, latEnd: 74, w: 0.054, off: 0.035},
        {l0: -16, l1: -24, latEnd: 74, w: 0.054, off: 0.035},
        {l0: 26, l1: 42, latEnd: 77, w: 0.058, off: 0.034},
        {l0: -28, l1: -44, latEnd: 77, w: 0.058, off: 0.034},
      ];
      airLocks.forEach((b) =>
        addLock(
          [
            {lat: 20, lon: b.l0, offset: 0.025},
            {lat: 48, lon: (b.l0 + b.l1) * 0.5, offset: b.off},
            {lat: b.latEnd, lon: b.l1, offset: 0.02},
          ],
          b.w,
          0.022,
          {roundTipScale: 0.28},
        ),
      );
    }
  }

  return grp;
}

/**
 * 3. SIDE HAIR:
 * Sculpted multi-layer side framing locks curving cleanly around cheeks/ears:
 * - Cheek-framing front wisps (lọn ôm mặt)
 * - Behind-ear volume layers bridging side hair seamlessly into back hair
 */
function buildSideHairLocks(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  hatMode: HatFitMode,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'SideHair';

  const male = isMaleStyle(hairBack);
  const isLong = hairBack === 'long_wave';
  const isBob = hairBack === 'bob_cut';
  const isHatCap = hatMode === 'crown_cap';
  const topLat = isHatCap ? 38 : 32;
  const topOff = isHatCap ? 0.018 : 0.025;

  [-1, 1].forEach((side) => {
    if (male) {
      // Tapered temple sideburn in front of ear + soft behind-ear transition layer
      const lengthLat = hairBack === 'boy_2' ? 108 : 96;
      const burnPts = sampleHeadSteps(
        [
          {lat: 42, lon: side * 54, offset: 0.02},
          {lat: 68, lon: side * 62, offset: 0.024},
          {lat: lengthLat, lon: side * 63, offset: 0.015},
        ],
        12,
      );
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(burnPts, {
            width: 0.052,
            depth: 0.02,
            innerFlatten: 0.4,
            profile: 'bangs',
            tubularSegs: 12,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );

      const behindPts = sampleHeadSteps(
        [
          {lat: topLat + 4, lon: side * 86, offset: topOff},
          {lat: 72, lon: side * 104, offset: 0.028},
          {lat: hairBack === 'boy_2' ? 116 : 106, lon: side * 110, offset: 0.02},
        ],
        12,
      );
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(behindPts, {
            width: 0.068,
            depth: 0.024,
            innerFlatten: 0.42,
            profile: 'lock',
            tubularSegs: 12,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (isLong) {
      // 1) Delicate face-framing cheek tendril (lọn ôm mặt)
      const cheekPts: [number, number, number][] = [
        headSurfacePoint(topLat + 4, side * 54, topOff),
        headSurfacePoint(72, side * 60, 0.032),
        [side * 0.312, 0.21, 0.105],
        [side * 0.296, 0.05, 0.102],
        [side * 0.268, -0.1, 0.115],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(cheekPts, {
            width: 0.06,
            depth: 0.03,
            innerFlatten: 0.48,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );

      // 2) Full side-shoulder wave behind ear bridging seamlessly into BackHair
      const shoulderPts: [number, number, number][] = [
        headSurfacePoint(topLat + 2, side * 88, topOff + 0.004),
        headSurfacePoint(76, side * 105, 0.038),
        [side * 0.345, 0.19, -0.05],
        [side * 0.352, 0.01, -0.095],
        [side * 0.325, -0.14, -0.075],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(shoulderPts, {
            width: 0.095,
            depth: 0.038,
            innerFlatten: 0.48,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (isBob) {
      // 1) Inward-tucked cheek bob curl
      const cheekPts: [number, number, number][] = [
        headSurfacePoint(topLat + 4, side * 56, topOff),
        headSurfacePoint(74, side * 62, 0.034),
        [side * 0.318, 0.21, 0.088],
        [side * 0.285, 0.095, 0.095],
        [side * 0.232, 0.042, 0.105],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(cheekPts, {
            width: 0.068,
            depth: 0.032,
            innerFlatten: 0.45,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );

      // 2) Behind-ear bob C-curl layer
      const sideBobPts: [number, number, number][] = [
        headSurfacePoint(topLat + 2, side * 90, topOff + 0.004),
        headSurfacePoint(76, side * 106, 0.04),
        [side * 0.335, 0.19, -0.05],
        [side * 0.31, 0.08, -0.075],
        [side * 0.25, 0.042, -0.04],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(sideBobPts, {
            width: 0.096,
            depth: 0.038,
            innerFlatten: 0.46,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
      return;
    }

    // Tied styles (ponytail, twin_tails, twin_buns): delicate cheek tendrils
    const wispPts: [number, number, number][] = [
      headSurfacePoint(44, side * 56, 0.022),
      headSurfacePoint(76, side * 61, 0.028),
      [side * 0.282, 0.21, 0.1],
      [side * 0.242, 0.115, 0.118],
    ];
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(wispPts, {
          width: 0.048,
          depth: 0.023,
          innerFlatten: 0.42,
          profile: 'bangs',
          outwardMode: 'drape',
          tubularSegs: 14,
          radialSegs: 10,
        }),
        hairMat,
      ),
    );
  });

  return grp;
}

/**
 * 4. BACK HAIR:
 * Multi-layered, curved, volumetric polymer clay hair structures!
 * - long_wave: 2 overlapping tiers of curved S-wave clay locks (7 inner full-length + 5 upper layered locks)
 * - bob_cut: 2 overlapping tiers of curved inward-tucked C-curl bob locks
 * - ponytail / twin_tails / twin_buns: gathered sweeps + hair ties + layered curls + hat-compatible lowering
 * - male styles: multi-lock overlapping crown & tapered nape layers
 */
function buildBackHairLayers(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  tieMat: THREE.Material,
  hatMode: HatFitMode,
  backHairGroup: THREE.Group,
  accGroup: THREE.Group,
): void {
  const isHatCap = hatMode === 'crown_cap';
  const topLat = isHatCap ? 44 : 22;
  const topOff = isHatCap ? 0.015 : 0.026;

  // ---- 1. LONG WAVE: Two overlapping sculpted tiers of curved clay S-waves ----
  if (hairBack === 'long_wave') {
    // Tier A (Inner full-length S-wave curtain formed by 7 overlapping sculpted locks)
    const innerLons = [-116, -138, -160, 180, 160, 138, 116];
    innerLons.forEach((lon, idx) => {
      const r0 = headSurfacePoint(topLat, lon, topOff);
      const r1 = headSurfacePoint(78, lon, 0.036);
      const r2 = headSurfacePoint(108, lon, 0.05);
      const flare = 1.15;
      const rad = (lon * Math.PI) / 180;
      const waveOut = idx % 2 === 0 ? 0.02 : -0.01;
      const pMid: [number, number, number] = [
        r2[0] * flare,
        0.04,
        r2[2] * flare - 0.028 + waveOut,
      ];
      const pHem: [number, number, number] = [
        Math.sin(rad) * 0.34,
        -0.165 - (idx === 3 ? 0.02 : 0),
        Math.cos(rad) * 0.35 - 0.02,
      ];

      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2, pMid, pHem], {
            width: 0.115,
            depth: 0.044,
            innerFlatten: 0.45,
            ridgeBoost: 0.1,
            profile: 'wave',
            outwardMode: 'drape',
            tipLift: 0.006,
            tubularSegs: 20,
            radialSegs: 10,
            roundTipScale: 0.36,
          }),
          hairMat,
        ),
      );
    });

    // Tier B (Upper-mid shorter overlapping sculpted clay wave layer for rich depth)
    const upperLons = [-128, -154, 180, 154, 128];
    upperLons.forEach((lon, idx) => {
      const r0 = headSurfacePoint(topLat + 4, lon, topOff + 0.004);
      const r1 = headSurfacePoint(74, lon, 0.052);
      const r2 = headSurfacePoint(100, lon, 0.062);
      const pEnd: [number, number, number] = [
        r2[0] * 1.08,
        0.06 - (idx === 2 ? 0.02 : 0),
        r2[2] * 1.1 - 0.02,
      ];

      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2, pEnd], {
            width: 0.112,
            depth: 0.036,
            innerFlatten: 0.42,
            ridgeBoost: 0.12,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 10,
            roundTipScale: 0.32,
          }),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 2. BOB CUT: Two overlapping curved C-curl clay tiers ----
  if (hairBack === 'bob_cut') {
    const innerLons = [-116, -138, -160, 180, 160, 138, 116];
    innerLons.forEach((lon) => {
      const r0 = headSurfacePoint(topLat, lon, topOff);
      const r1 = headSurfacePoint(78, lon, 0.044);
      const r2 = headSurfacePoint(108, lon, 0.052);
      const r3 = headSurfacePoint(126, lon, 0.022); // curves gracefully inward under jawline!
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2, r3], {
            width: 0.115,
            depth: 0.044,
            innerFlatten: 0.45,
            ridgeBoost: 0.08,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
    });

    const upperLons = [-130, -156, 180, 156, 130];
    upperLons.forEach((lon) => {
      const r0 = headSurfacePoint(topLat + 4, lon, topOff + 0.004);
      const r1 = headSurfacePoint(74, lon, 0.056);
      const r2 = headSurfacePoint(104, lon, 0.054);
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2], {
            width: 0.112,
            depth: 0.034,
            innerFlatten: 0.4,
            ridgeBoost: 0.1,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 14,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 3. PONYTAIL: Gathered back sweeps + tie + multi-lock S-wave ponytail (hat-compatible!) ----
  if (hairBack === 'ponytail') {
    const rootLat = isHatCap ? 90 : 72;
    const rootPt = headSurfacePoint(rootLat, 180, 0.025);

    [-1, 1].forEach((side) => {
      const sweepPts = sampleHeadSteps(
        [
          {lat: 112, lon: side * 140, offset: 0.015},
          {lat: 94, lon: side * 160, offset: 0.026},
          {lat: rootLat, lon: 180, offset: 0.025},
        ],
        10,
      );
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(sweepPts, {
            width: 0.078,
            depth: 0.02,
            innerFlatten: 0.4,
            profile: 'lock',
            tubularSegs: 10,
            radialSegs: 8,
          }),
          hairMat,
        ),
      );
    });

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.054, 16, 12), hairMat);
    knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
    backHairGroup.add(knot);

    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.058, 0.018, 10, 18),
      tieMat,
    );
    tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
    tie.rotation.x = -0.28;
    accGroup.add(tie);

    const ryOffset = isHatCap ? -0.065 : 0.0;
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(
          [
            rootPt,
            [0, 0.37 + ryOffset, -0.375],
            [0, 0.24 + ryOffset, -0.465],
            [0, 0.07 + ryOffset, -0.44],
            [0, -0.1 + ryOffset, -0.385],
          ],
          {
            width: 0.105,
            depth: 0.068,
            innerFlatten: 0.65,
            ridgeBoost: 0.14,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 20,
            radialSegs: 12,
          },
        ),
        hairMat,
      ),
    );
    [-1, 1].forEach((side) => {
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.058, 0.34 + ryOffset, -0.37],
              [side * 0.092, 0.18 + ryOffset, -0.43],
              [side * 0.068, 0.0 + ryOffset, -0.39],
            ],
            {
              width: 0.066,
              depth: 0.044,
              innerFlatten: 0.55,
              ridgeBoost: 0.12,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 18,
              radialSegs: 10,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 4. TWIN TAILS ----
  if (hairBack === 'twin_tails') {
    [-1, 1].forEach((side) => {
      const rootLat = isHatCap ? 88 : 74;
      const rootPt = headSurfacePoint(rootLat, side * 118, 0.025);
      const radialOut = new THREE.Vector3(
        rootPt[0],
        rootPt[1] - HEAD_CY,
        rootPt[2],
      ).normalize();

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12), hairMat);
      knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
      backHairGroup.add(knot);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.018, 10, 18),
        tieMat,
      );
      tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialOut);
      accGroup.add(tie);

      const yAdj = isHatCap ? -0.055 : 0;
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.39, 0.25 + yAdj, -0.14],
              [side * 0.43, 0.08 + yAdj, -0.155],
              [side * 0.41, -0.12 + yAdj, -0.125],
            ],
            {
              width: 0.086,
              depth: 0.058,
              innerFlatten: 0.65,
              ridgeBoost: 0.12,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 18,
              radialSegs: 12,
            },
          ),
          hairMat,
        ),
      );
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.365, 0.23 + yAdj, -0.195],
              [side * 0.38, 0.06 + yAdj, -0.22],
              [side * 0.35, -0.09 + yAdj, -0.185],
            ],
            {
              width: 0.058,
              depth: 0.042,
              innerFlatten: 0.6,
              ridgeBoost: 0.1,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 16,
              radialSegs: 10,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 5. TWIN BUNS ----
  if (hairBack === 'twin_buns') {
    const bunLat = isHatCap ? 74 : 48;
    const bunLon = isHatCap ? 114 : 104;
    const bunScale = isHatCap ? 0.88 : 1.0;

    [-1, 1].forEach((side) => {
      const pBun = headSurfacePoint(bunLat, side * bunLon, 0.044);
      const radialDir = new THREE.Vector3(
        pBun[0],
        pBun[1] - HEAD_CY,
        pBun[2],
      ).normalize();

      const bunBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.114 * bunScale, 20, 16),
        hairMat,
      );
      bunBase.scale.set(1.06, 0.88, 0.98);
      bunBase.position.set(pBun[0], pBun[1], pBun[2]);

      const swirlRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.068 * bunScale, 0.036 * bunScale, 10, 18),
        hairMat,
      );
      swirlRing.position.set(
        pBun[0] + radialDir.x * 0.044 * bunScale,
        pBun[1] + radialDir.y * 0.044 * bunScale,
        pBun[2] + radialDir.z * 0.044 * bunScale,
      );
      swirlRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialDir);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.09 * bunScale, 0.018, 10, 18),
        tieMat,
      );
      tie.position.set(
        pBun[0] - radialDir.x * 0.016,
        pBun[1] - radialDir.y * 0.016,
        pBun[2] - radialDir.z * 0.016,
      );
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialDir);

      backHairGroup.add(bunBase, swirlRing);
      accGroup.add(tie);
    });
    return;
  }

  // ---- 6. MALE & SHORT CROP BACK LAYERS: Multi-layered rounded nape & crown structure ----
  const backCols: {lons: [number, number, number]; latEnd: number; w: number; d: number}[] =
    hairBack === 'boy_2'
      ? [
          {lons: [180, 180, 180], latEnd: 132, w: 0.1, d: 0.028},
          {lons: [154, 150, 144], latEnd: 130, w: 0.096, d: 0.026},
          {lons: [-154, -150, -144], latEnd: 130, w: 0.096, d: 0.026},
          {lons: [126, 122, 118], latEnd: 122, w: 0.084, d: 0.024},
          {lons: [-126, -122, -118], latEnd: 122, w: 0.084, d: 0.024},
        ]
      : hairBack === 'boy_3'
        ? [
            {lons: [180, 180, 180], latEnd: 124, w: 0.1, d: 0.028},
            {lons: [150, 146, 142], latEnd: 120, w: 0.092, d: 0.026},
            {lons: [-150, -146, -142], latEnd: 120, w: 0.092, d: 0.026},
            {lons: [124, 120, 118], latEnd: 114, w: 0.078, d: 0.022},
            {lons: [-124, -120, -118], latEnd: 114, w: 0.078, d: 0.022},
          ]
        : [
            {lons: [180, 180, 180], latEnd: 118, w: 0.1, d: 0.025},
            {lons: [148, 144, 140], latEnd: 114, w: 0.09, d: 0.024},
            {lons: [-148, -144, -140], latEnd: 114, w: 0.09, d: 0.024},
            {lons: [122, 118, 116], latEnd: 108, w: 0.076, d: 0.022},
            {lons: [-122, -118, -116], latEnd: 108, w: 0.076, d: 0.022},
          ];

  backCols.forEach((b) => {
    const pts = sampleHeadSteps(
      [
        {lat: isHatCap ? 46 : 30, lon: b.lons[0], offset: isHatCap ? 0.015 : 0.025},
        {lat: 84, lon: b.lons[1], offset: 0.036},
        {lat: b.latEnd, lon: b.lons[2], offset: 0.016},
      ],
      14,
    );
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(pts, {
          width: b.w,
          depth: b.d,
          innerFlatten: 0.42,
          ridgeBoost: 0.08,
          profile: 'bangs',
          tubularSegs: 14,
          radialSegs: 10,
        }),
        hairMat,
      ),
    );
  });
}

/**
 * Standardized entry point building all 6 modular hair components:
 * HairBase, FrontHair, SideHair, BackHair, HairAccessories, and HatAttachmentPoints.
 */
export function buildCharacterHair(
  config: AvatarConfig,
  hairMat: THREE.Material,
  tieMat: THREE.Material,
): CharacterHairAssembly {
  const hatMode = resolveHatFitMode(config.headItem);

  const root = new THREE.Group();
  root.name = 'CharacterHair';

  const hairBase = new THREE.Group();
  hairBase.name = 'HairBase';
  const {geom: baseGeom, crownOuterOffset} = createHairBaseGeometry(
    config.hairBack,
    config.hairFront,
    hatMode,
  );
  hairBase.add(new THREE.Mesh(baseGeom, hairMat));

  const frontHair = buildFrontHairLocks(
    config.hairBack,
    config.hairFront,
    hairMat,
    hatMode,
  );
  const sideHair = buildSideHairLocks(config.hairBack, hairMat, hatMode);

  const backHair = new THREE.Group();
  backHair.name = 'BackHair';
  const hairAccessories = new THREE.Group();
  hairAccessories.name = 'HairAccessories';

  buildBackHairLayers(
    config.hairBack,
    hairMat,
    tieMat,
    hatMode,
    backHair,
    hairAccessories,
  );

  // Standardized Attachment Points on the Head
  const crownY = HEAD_CY + HEAD_RY + crownOuterOffset;
  const sideSurf = headSurfacePoint(86, 90, crownOuterOffset * 0.72);
  const headbandRadius = Math.max(0.328, Math.abs(sideSurf[0]));

  const templeL = headSurfacePoint(68, -50, 0.032);
  const templeR = headSurfacePoint(68, 50, 0.032);
  const foreheadPt = headSurfacePoint(54, 0, 0.028);
  const backPt = headSurfacePoint(52, 180, crownOuterOffset * 0.85);
  const napePt = headSurfacePoint(116, 180, 0.02);

  const attachments: HatAttachmentPoints = {
    crownTop: {
      position: new THREE.Vector3(0, crownY - 0.02, -0.012),
      rotation: new THREE.Euler(-0.06, 0, 0),
      radius: headbandRadius * 0.84,
    },
    crownTilted: {
      position: new THREE.Vector3(0.038, crownY - 0.012, -0.016),
      rotation: new THREE.Euler(-0.08, 0, -0.22),
    },
    foreheadRim: {
      position: new THREE.Vector3(foreheadPt[0], foreheadPt[1], foreheadPt[2]),
      rotation: new THREE.Euler(-0.14, 0, 0),
    },
    headbandArc: {
      center: new THREE.Vector3(0, HEAD_CY + 0.014, 0.01),
      radius: headbandRadius,
      tiltX: -0.16,
    },
    templeLeft: {
      position: new THREE.Vector3(templeL[0], templeL[1], templeL[2]),
      rotation: new THREE.Euler(0.12, -0.78, 0.22),
      normal: headOutwardNormal(68, -50),
    },
    templeRight: {
      position: new THREE.Vector3(templeR[0], templeR[1], templeR[2]),
      rotation: new THREE.Euler(0.12, 0.78, -0.22),
      normal: headOutwardNormal(68, 50),
    },
    backCrown: {
      position: new THREE.Vector3(backPt[0], backPt[1], backPt[2]),
      rotation: new THREE.Euler(-0.35, Math.PI, 0),
    },
    napeAnchor: {
      position: new THREE.Vector3(napePt[0], napePt[1], napePt[2]),
      rotation: new THREE.Euler(0.18, Math.PI, 0),
    },
  };

  // Dedicated 6th technical group: HatAttachmentPoints (actual Three.js Object3D sockets)
  const hatAttachmentPoints = new THREE.Group();
  hatAttachmentPoints.name = 'HatAttachmentPoints';
  (
    [
      ['crownTop', attachments.crownTop.position, attachments.crownTop.rotation],
      ['crownTilted', attachments.crownTilted.position, attachments.crownTilted.rotation],
      ['foreheadRim', attachments.foreheadRim.position, attachments.foreheadRim.rotation],
      ['templeLeft', attachments.templeLeft.position, attachments.templeLeft.rotation],
      ['templeRight', attachments.templeRight.position, attachments.templeRight.rotation],
      ['backCrown', attachments.backCrown.position, attachments.backCrown.rotation],
      ['napeAnchor', attachments.napeAnchor.position, attachments.napeAnchor.rotation],
    ] as const
  ).forEach(([name, pos, rot]) => {
    const node = new THREE.Object3D();
    node.name = `Socket_${name}`;
    node.position.copy(pos);
    node.rotation.copy(rot);
    hatAttachmentPoints.add(node);
  });

  root.add(
    hairBase,
    frontHair,
    sideHair,
    backHair,
    hairAccessories,
    hatAttachmentPoints,
  );

  return {
    root,
    hairBase,
    frontHair,
    sideHair,
    backHair,
    hairAccessories,
    hatAttachmentPoints,
    attachments,
  };
}
