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

  // Soft anime/Nendoroid front face plane
  const frontMask =
    Math.max(0, Math.cos(lon)) *
    smoothstep01(40, 92, latDeg) *
    (1 - smoothstep01(128, 168, latDeg));
  const frontFlatten = 1 - 0.062 * frontMask;

  // Plump Nendoroid baby-cheeks below eye line before tapering smoothly into V-chin
  const cheekFull =
    0.022 *
    Math.exp(-Math.pow((latDeg - 112) / 14, 2)) *
    Math.exp(-Math.pow((absLon - 46) / 21, 2));

  // Graceful jawline taper creating the soft Nendoroid V-chin instead of a round ball
  const jawTaper = 1 - 0.27 * smoothstep01(108, 168, latDeg);
  const chinDepthTaper = 1 - 0.14 * smoothstep01(126, 174, latDeg);
  const chinShapeY =
    -0.012 *
      Math.exp(-Math.pow((latDeg - 148) / 20, 2)) *
      Math.max(0, Math.cos(lon)) +
    0.016 * smoothstep01(134, 178, latDeg);

  const noseBump = includeNose
    ? 0.0065 *
      Math.exp(-Math.pow((latDeg - 106) / 4.8, 2)) *
      Math.exp(-Math.pow(absLon / 5.5, 2))
    : 0;

  const rx = (HEAD_RX + offset) * jawTaper + cheekFull;
  const ry = HEAD_RY + offset;
  const rz = (HEAD_RZ + offset) * frontFlatten * chinDepthTaper + noseBump;

  const x = rx * sinLat * Math.sin(lon);
  const y = HEAD_CY + ry * cosLat + chinShapeY;
  const z = rz * sinLat * Math.cos(lon);
  return [x, y, z];
}

function headOutwardNormal(latDeg: number, lonDeg: number): THREE.Vector3 {
  const p0 = headSurfacePoint(latDeg, lonDeg, 0);
  const p1 = headSurfacePoint(latDeg, lonDeg, 0.03);
  return new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
}

/**
 * Smooth matte-satin stylized 3D polymer-clay / Nendoroid hair material:
 * soft light rolloff, subtle clay sheen, zero plastic glare, zero strand textures.
 */
export function createHairClayMaterial(color: string | number): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.68,
    metalness: 0.0,
    sheen: 0.34,
    sheenRoughness: 0.78,
    sheenColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.24),
    clearcoat: 0.0,
    envMapIntensity: 0.46,
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
    hairBack === 'boy_3' ||
    hairBack === 'boy_4'
  );
}

interface LockStep {
  lat: number;
  lon: number;
  offset: number;
}

function sampleHeadSteps(
  steps: LockStep[],
  samples = 16,
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
  edgePinch?: number;
  profile?: 'blade' | 'tuft' | 'bangs' | 'lock' | 'wave' | 'bob' | 'quiff';
  outwardMode?: 'spherical' | 'drape';
  tipLift?: number;
  tubularSegs?: number;
  radialSegs?: number;
  roundTipScale?: number;
}

const _headCenter = new THREE.Vector3(0, HEAD_CY, 0);
const _fallbackUp = new THREE.Vector3(0, 1, 0);

/**
 * Builds a Nendoroid-grade sculpted clay hair lock:
 * - Lenticular / almond-blade cross-section (tapered soft beveled edges, flat inner hug, plump outer curve)
 *   so locks shingle cleanly without looking like floating cylindrical worms
 * - Seamless buried root flare that emerges naturally out of the plush HairBase dome
 * - Smooth tapered rounded-almond tip
 */
function createClayLockGeometry(
  points: [number, number, number][],
  opts: ClayLockOptions,
): THREE.BufferGeometry {
  const {
    width,
    depth,
    innerFlatten = 0.3,
    ridgeBoost = 0.14,
    edgePinch = 0.28,
    profile = 'blade',
    outwardMode = 'spherical',
    tipLift = 0.0,
    tubularSegs = 16,
    radialSegs = 12,
    roundTipScale = 0.16,
  } = opts;

  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);

  const evalProfileScale = (t: number): {wScale: number; dScale: number} => {
    if (profile === 'blade') {
      // Broad buried root -> smooth full mid-blade -> crisp soft-almond tapered tip
      const rootW = 0.78 + 0.22 * smoothstep01(0.0, 0.25, t);
      const rootD = 0.45 + 0.55 * smoothstep01(0.0, 0.28, t);
      const u = smoothstep01(0.36, 1.0, t);
      const tipW = 1 - (1 - roundTipScale) * Math.pow(u, 1.15);
      const tipD = 1 - (1 - Math.max(0.18, roundTipScale)) * Math.pow(u, 1.25);
      return {
        wScale: Math.max(0.12, rootW * tipW),
        dScale: Math.max(0.14, rootD * tipD),
      };
    }
    if (profile === 'tuft') {
      // Fluffy sculpted anime clay petal: fuller mid-belly sweeping to a soft almond point
      const rootW = 0.72 + 0.36 * Math.sin(Math.pow(t, 0.75) * Math.PI * 0.65);
      const rootD = 0.48 + 0.52 * smoothstep01(0.0, 0.26, t);
      const u = smoothstep01(0.42, 1.0, t);
      const tip = 1 - (1 - roundTipScale) * Math.pow(u, 1.1);
      return {
        wScale: Math.max(0.12, rootW * tip),
        dScale: Math.max(0.14, rootD * tip),
      };
    }
    if (profile === 'bangs') {
      const rootEase = smoothstep01(0.0, 0.22, t);
      const tipEase = 1 - (1 - roundTipScale) * Math.pow(smoothstep01(0.42, 1.0, t), 1.2);
      return {
        wScale: Math.max(0.16, (0.72 + 0.28 * rootEase) * tipEase),
        dScale: Math.max(0.16, (0.45 + 0.55 * rootEase) * tipEase),
      };
    }
    if (profile === 'quiff') {
      const rootEase = smoothstep01(0.0, 0.24, t);
      const swell = 0.88 + 0.26 * Math.sin(Math.pow(t, 0.8) * Math.PI);
      const tipEase = 1 - 0.72 * Math.pow(smoothstep01(0.48, 1.0, t), 1.2);
      return {
        wScale: Math.max(0.18, (0.68 + 0.32 * rootEase) * swell * tipEase),
        dScale: Math.max(0.16, (0.48 + 0.52 * rootEase) * swell * tipEase),
      };
    }
    if (profile === 'wave') {
      const rootEase = smoothstep01(0.0, 0.22, t);
      const swell = 0.88 + 0.2 * Math.sin(smoothstep01(0.05, 0.82, t) * Math.PI);
      const tipTaper = 1 - (1 - Math.max(0.24, roundTipScale)) * Math.pow(smoothstep01(0.58, 1.0, t), 1.3);
      return {
        wScale: Math.max(0.22, (0.72 + 0.28 * rootEase) * swell * tipTaper),
        dScale: Math.max(0.2, (0.52 + 0.48 * rootEase) * swell * tipTaper),
      };
    }
    if (profile === 'bob') {
      const rootEase = smoothstep01(0.0, 0.22, t);
      const swell = 0.9 + 0.16 * Math.sin(t * Math.PI);
      const tipTaper = 1 - 0.58 * Math.pow(smoothstep01(0.62, 1.0, t), 1.35);
      return {
        wScale: Math.max(0.28, (0.72 + 0.28 * rootEase) * swell * tipTaper),
        dScale: Math.max(0.22, (0.5 + 0.5 * rootEase) * swell * tipTaper),
      };
    }
    const belly = Math.pow(Math.sin(t * Math.PI), 0.42);
    const skew = 0.85 + 0.15 * (1 - t);
    return {
      wScale: Math.max(0.2, belly * skew),
      dScale: Math.max(0.2, belly * skew),
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
    const endRound = i === 0 ? 0.65 : i === tubularSegs ? 0.55 : 1.0;
    const w = width * wScale * endRound;
    const h = depth * dScale * endRound;
    const curlOut = tipLift * Math.pow(smoothstep01(0.55, 1.0, t), 1.8);

    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Sculpted clay almond-blade cross-section (sleek beveled edges, smooth convex ridge)
      const sx = Math.sign(cos) * Math.pow(Math.abs(cos), 0.78);
      const absSin = Math.abs(sin);
      const edgeTaper = edgePinch + (1 - edgePinch) * Math.pow(absSin, 0.62);
      const sy = Math.sign(sin) * Math.pow(absSin, 0.74) * edgeTaper;
      const lateral = sx * w;
      const ridge = sy > 0 ? 1 + ridgeBoost * Math.pow(absSin, 1.6) : innerFlatten;
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

  // Smooth rounded end-caps
  const startCenterIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  const t0 = curve.getTangentAt(0).normalize();
  positions.push(p0.x - t0.x * 0.006, p0.y - t0.y * 0.006, p0.z - t0.z * 0.006);
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(startCenterIdx, j, nextJ);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  positions.push(p1.x + t1.x * 0.009, p1.y + t1.y * 0.009, p1.z + t1.z * 0.009);
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
 * Plush Nendoroid-style unified sculpted crown dome:
 * - Generous plush silhouette (0.048-0.052 loft) so locks blend cleanly out of the dome
 * - Zero exposed temple gaps; cleanly arches above ears & wraps snugly down to nape
 * - Adapts seamlessly into a lower hat-seat contour when wearing crown hats
 */
function createHairBaseGeometry(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hatMode: HatFitMode,
): {geom: THREE.BufferGeometry; crownOuterOffset: number} {
  const lonSegs = 64;
  const outerSegs = 22;
  const lipSegs = 3;
  const innerSegs = 5;

  const male = isMaleStyle(hairBack);
  const isHatCap = hatMode === 'crown_cap';

  const partLon =
    hairBack === 'boy_1'
      ? 14
      : hairBack === 'boy_2' || (!male && hairFront === 'curtain')
        ? 0
        : !male && hairFront === 'side_sweep'
          ? -20
          : null;

  // Plush fluffy Nendoroid dome loft (compacted cleanly under crown hats)
  const baseCrownLoft = isHatCap
    ? 0.016
    : hairBack === 'boy_4'
      ? 0.098
      : hairBack === 'boy_3'
        ? 0.096
        : male
          ? 0.092
          : 0.088;

  const getPerimeterLat = (lonDeg: number): number => {
    const a = Math.abs(lonDeg);

    // Forehead hairline sweeps down behind FrontHair blades so zero bald scalp peeks between bangs
    const browLat =
      hairBack === 'boy_2' || (!male && hairFront === 'curtain')
        ? 57 - 6 * Math.exp(-Math.pow(lonDeg / 12, 2))
        : 63;

    // Wraps generously across upper temples (lon ~38..70°) eliminating side-forehead gaps
    const toTemple = smoothstep01(30, 56, a);
    const sideburnDrop = (male ? 22 : 19) * Math.exp(-Math.pow((a - 56) / 10, 2));

    // Arches cleanly ABOVE the ears (lat ~74°)
    const earArch = smoothstep01(70, 84, a) * (1 - smoothstep01(95, 110, a));

    let endLat = browLat + toTemple * (80 - browLat) + sideburnDrop;
    endLat = endLat * (1 - earArch * 0.14) + 74 * earArch * 0.14;

    // Nape contour behind ears
    const centerBackNape =
      hairBack === 'boy_2'
        ? 128
        : hairBack === 'boy_4'
          ? 126
          : hairBack === 'boy_1'
            ? 124
            : hairBack === 'boy_3'
              ? 126
              : hairBack === 'short_crop'
                ? 122
                : hairBack === 'long_wave' || hairBack === 'bob_cut'
                  ? 120
                  : 122;

    const toNape = smoothstep01(96, 128, a);
    const napeWave = 3.0 * Math.cos(((a - 180) * Math.PI) / 36) * smoothstep01(135, 180, a);
    endLat = endLat + toNape * (centerBackNape + napeWave - endLat);
    return endLat;
  };

  const evalCapVertex = (lonDeg: number, s: number): [number, number, number] => {
    const a = Math.abs(lonDeg);
    const endLat = getPerimeterLat(lonDeg);

    const evalAlongSurface = (vSurf: number, wallBias: number): [number, number, number] => {
      const latDeg = vSurf * endLat;

      // Preserve plush rounded upper-forehead & temple pillow; taper only right at hairline edge
      const frontTapering =
        Math.max(0, Math.cos((lonDeg * Math.PI) / 180)) *
        smoothstep01(0.78, 1.0, vSurf);
      const napeTapering =
        smoothstep01(0.72, 1.0, vSurf) * smoothstep01(96, 132, a);

      // Soft Nendoroid outer cloud cushion swelling gracefully over top & upper sides
      const puffSwell = 1 + 0.18 * Math.sin(Math.pow(vSurf, 0.72) * Math.PI * 0.88);
      let crownShape =
        baseCrownLoft *
        puffSwell *
        (1 - 0.36 * frontTapering) *
        (1 - 0.54 * napeTapering);

      if (isHatCap && vSurf < 0.74) {
        const seatFade = 1 - vSurf / 0.74;
        crownShape = THREE.MathUtils.lerp(crownShape, 0.008, seatFade * seatFade);
      }

      const partContour =
        partLon !== null
          ? (-0.007 * Math.exp(-Math.pow((lonDeg - partLon) / 7, 2)) +
              0.008 * Math.exp(-Math.pow((Math.abs(lonDeg - partLon) - 18) / 12, 2))) *
            smoothstep01(0.08, 0.42, vSurf) *
            (1 - 0.7 * smoothstep01(0.72, 1.0, vSurf)) *
            (isHatCap ? 0.22 : 1.0)
          : 0;

      const occiputShape =
        a > 102
          ? 0.018 *
            Math.exp(-Math.pow((vSurf - 0.56) / 0.28, 2)) *
            smoothstep01(102, 145, a)
          : 0;

      const tipPinch = 1 - 0.48 * smoothstep01(0.84, 1.0, vSurf);
      const thickness = (isHatCap ? 0.009 : 0.016) * tipPinch;

      const offset = Math.max(
        0.003,
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
      const lip = Math.hypot(hx, hz) * 0.75;
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

  return {geom, crownOuterOffset: baseCrownLoft + (isHatCap ? 0.006 : 0.012)};
}

/**
 * 2. FRONT HAIR:
 * Sculpted Nendoroid-style overlapping almond-blade clay locks whose roots emerge
 * seamlessly from inside the plush HairBase dome (zero worms, zero temple gaps!).
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
  // Emerge organically from inside the plush volumetric crown (~0.082-0.098m loft!)
  const rootOff = isHatCap ? 0.015 : 0.082;
  const midOffLift = isHatCap ? -0.056 : 0.042;
  const endOffBase = isHatCap ? 0.02 : 0.032;

  const addBlade = (
    steps: LockStep[],
    width: number,
    depth: number,
    opts?: Partial<ClayLockOptions>,
  ) => {
    const adjusted = steps.map((s, idx) => {
      const lat = isHatCap && idx === 0 ? Math.max(s.lat, 36) : s.lat;
      let offset = s.offset;
      if (idx === 0) {
        offset = isHatCap ? Math.min(s.offset, 0.015) : Math.max(s.offset, rootOff);
      } else if (idx === 1) {
        offset = isHatCap ? Math.max(0.02, s.offset - 0.034) : Math.max(s.offset + midOffLift, 0.09);
      } else {
        offset = isHatCap ? Math.max(0.018, s.offset - 0.005) : Math.max(s.offset, endOffBase);
      }
      return {lat, lon: s.lon, offset};
    });

    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(sampleHeadSteps(adjusted, 16), {
          width,
          depth,
          innerFlatten: 0.3,
          ridgeBoost: 0.16,
          edgePinch: 0.24,
          profile: 'blade',
          tubularSegs: 16,
          radialSegs: 12,
          roundTipScale: 0.14,
          ...opts,
        }),
        hairMat,
      ),
    );
  };

  // ---- MALE 1: Fluffy Nendoroid Layered Chibi Crop ----
  if (hairBack === 'boy_1') {
    const cropBlades: Array<{
      l0: number;
      lMid: number;
      lEnd: number;
      latEnd: number;
      midOff: number;
      w: number;
      d: number;
    }> = [
      {l0: 12, lMid: 2, lEnd: -4, latEnd: 79, midOff: 0.06, w: 0.076, d: 0.033},
      {l0: 4, lMid: -10, lEnd: -16, latEnd: 81, midOff: 0.06, w: 0.072, d: 0.032},
      {l0: -6, lMid: -23, lEnd: -30, latEnd: 78, midOff: 0.058, w: 0.07, d: 0.031},
      {l0: -18, lMid: -36, lEnd: -44, latEnd: 81, midOff: 0.056, w: 0.068, d: 0.03},
      {l0: -28, lMid: -48, lEnd: -57, latEnd: 92, midOff: 0.054, w: 0.066, d: 0.029},
      {l0: -38, lMid: -56, lEnd: -64, latEnd: 98, midOff: 0.05, w: 0.062, d: 0.027},
      {l0: 16, lMid: 18, lEnd: 17, latEnd: 80, midOff: 0.06, w: 0.074, d: 0.032},
      {l0: 22, lMid: 30, lEnd: 33, latEnd: 78, midOff: 0.058, w: 0.07, d: 0.031},
      {l0: 28, lMid: 42, lEnd: 46, latEnd: 82, midOff: 0.056, w: 0.068, d: 0.03},
      {l0: 34, lMid: 52, lEnd: 59, latEnd: 92, midOff: 0.054, w: 0.066, d: 0.029},
      {l0: 40, lMid: 58, lEnd: 64, latEnd: 98, midOff: 0.05, w: 0.062, d: 0.027},
    ];
    cropBlades.forEach((b) =>
      addBlade(
        [
          {lat: 12, lon: b.l0, offset: 0.084},
          {lat: 46, lon: b.lMid, offset: b.midOff},
          {lat: b.latEnd, lon: b.lEnd, offset: 0.034},
        ],
        b.w,
        b.d,
      ),
    );
    return grp;
  }

  // ---- MALE 2: Fluffy Korean 6:4 Curtain Part (Rich crown loft, ZERO temple gaps) ----
  if (hairBack === 'boy_2') {
    [-1, 1].forEach((side) => {
      const curtainBlades: Array<{
        l0: number;
        lMid: number;
        lEnd: number;
        latEnd: number;
        midOff: number;
        endOff: number;
        w: number;
      }> = [
        {
          l0: side * 2,
          lMid: side * 16,
          lEnd: side * 23,
          latEnd: 80,
          midOff: 0.066,
          endOff: 0.036,
          w: 0.076,
        },
        {
          l0: side * 8,
          lMid: side * 27,
          lEnd: side * 36,
          latEnd: 82,
          midOff: 0.064,
          endOff: 0.035,
          w: 0.074,
        },
        {
          l0: side * 15,
          lMid: side * 39,
          lEnd: side * 48,
          latEnd: 85,
          midOff: 0.06,
          endOff: 0.032,
          w: 0.072,
        },
        {
          l0: side * 24,
          lMid: side * 49,
          lEnd: side * 57,
          latEnd: 92,
          midOff: 0.056,
          endOff: 0.028,
          w: 0.068,
        },
        {
          l0: side * 34,
          lMid: side * 57,
          lEnd: side * 63,
          latEnd: 98,
          midOff: 0.052,
          endOff: 0.026,
          w: 0.064,
        },
      ];
      curtainBlades.forEach((b) =>
        addBlade(
          [
            {lat: 12, lon: b.l0, offset: 0.084},
            {lat: 46, lon: b.lMid, offset: b.midOff},
            {lat: b.latEnd, lon: b.lEnd, offset: b.endOff},
          ],
          b.w,
          0.032,
          {roundTipScale: 0.16},
        ),
      );
    });
    return grp;
  }

  // ---- MALE 3: Extra-Fluffy Tousled Anime Clay Hair (Kaworu reference) ----
  if (hairBack === 'boy_3') {
    const frontTufts: Array<{
      l0: number;
      lMid: number;
      lEnd: number;
      latEnd: number;
      midOff: number;
      w: number;
      d: number;
    }> = [
      {l0: 14, lMid: 4, lEnd: -3, latEnd: 81, midOff: 0.068, w: 0.078, d: 0.035},
      {l0: 4, lMid: -12, lEnd: -21, latEnd: 79, midOff: 0.066, w: 0.074, d: 0.034},
      {l0: -10, lMid: -28, lEnd: -39, latEnd: 82, midOff: 0.064, w: 0.072, d: 0.032},
      {l0: -22, lMid: -44, lEnd: -55, latEnd: 88, midOff: 0.06, w: 0.07, d: 0.03},
      {l0: -32, lMid: -55, lEnd: -63, latEnd: 98, midOff: 0.056, w: 0.066, d: 0.028},
      {l0: 20, lMid: 20, lEnd: 16, latEnd: 80, midOff: 0.066, w: 0.074, d: 0.034},
      {l0: 28, lMid: 34, lEnd: 36, latEnd: 79, midOff: 0.064, w: 0.072, d: 0.032},
      {l0: 36, lMid: 48, lEnd: 56, latEnd: 88, midOff: 0.06, w: 0.07, d: 0.03},
      {l0: 42, lMid: 56, lEnd: 63, latEnd: 98, midOff: 0.056, w: 0.066, d: 0.028},
    ];
    frontTufts.forEach((b) =>
      addBlade(
        [
          {lat: 12, lon: b.l0, offset: 0.086},
          {lat: 45, lon: b.lMid, offset: b.midOff},
          {lat: b.latEnd, lon: b.lEnd, offset: 0.034},
        ],
        b.w,
        b.d,
        {profile: 'tuft', roundTipScale: 0.12},
      ),
    );

    if (!isHatCap) {
      const upperPetals: Array<{steps: LockStep[]; w: number; d: number}> = [
        {
          steps: [
            {lat: 10, lon: 16, offset: 0.088},
            {lat: 30, lon: -6, offset: 0.122},
            {lat: 54, lon: -24, offset: 0.106},
          ],
          w: 0.084,
          d: 0.038,
        },
        {
          steps: [
            {lat: 14, lon: -12, offset: 0.088},
            {lat: 34, lon: -38, offset: 0.12},
            {lat: 58, lon: -58, offset: 0.1},
        ],
          w: 0.08,
          d: 0.036,
        },
        {
          steps: [
            {lat: 12, lon: 22, offset: 0.088},
            {lat: 30, lon: 42, offset: 0.118},
            {lat: 56, lon: 58, offset: 0.098},
          ],
          w: 0.08,
          d: 0.036,
        },
        {
          steps: [
            {lat: 12, lon: 40, offset: 0.088},
            {lat: 24, lon: 78, offset: 0.12},
            {lat: 48, lon: 92, offset: 0.098},
          ],
          w: 0.082,
          d: 0.036,
        },
        {
          steps: [
            {lat: 12, lon: -40, offset: 0.088},
            {lat: 24, lon: -78, offset: 0.12},
            {lat: 48, lon: -92, offset: 0.098},
          ],
          w: 0.082,
          d: 0.036,
        },
      ];
      upperPetals.forEach((p) =>
        addBlade(p.steps, p.w, p.d, {profile: 'tuft', roundTipScale: 0.12}),
      );
    }
    return grp;
  }

  // ---- MALE 4: Plush Nendoroid Reference Hair ("Tóc Nam 4" - big fluffy cloud + crisp bangs) ----
  if (hairBack === 'boy_4') {
    const refBangs: Array<{
      l0: number;
      lMid: number;
      lEnd: number;
      latEnd: number;
      midOff: number;
      w: number;
      d: number;
    }> = [
      {l0: -38, lMid: -53, lEnd: -61, latEnd: 103, midOff: 0.062, w: 0.068, d: 0.028},
      {l0: -28, lMid: -45, lEnd: -51, latEnd: 88, midOff: 0.064, w: 0.064, d: 0.028},
      {l0: -20, lMid: -34, lEnd: -38, latEnd: 81, midOff: 0.066, w: 0.062, d: 0.029},
      {l0: -12, lMid: -22, lEnd: -25, latEnd: 80, midOff: 0.067, w: 0.062, d: 0.029},
      {l0: -4, lMid: -10, lEnd: -12, latEnd: 79, midOff: 0.067, w: 0.058, d: 0.028},
      {l0: 4, lMid: 5, lEnd: 8, latEnd: 84, midOff: 0.068, w: 0.062, d: 0.03},
      {l0: 12, lMid: 19, lEnd: 22, latEnd: 79, midOff: 0.067, w: 0.06, d: 0.029},
      {l0: 20, lMid: 30, lEnd: 34, latEnd: 81, midOff: 0.066, w: 0.062, d: 0.029},
      {l0: 28, lMid: 42, lEnd: 48, latEnd: 86, midOff: 0.064, w: 0.064, d: 0.028},
      {l0: 38, lMid: 54, lEnd: 60, latEnd: 103, midOff: 0.062, w: 0.068, d: 0.029},
    ];
    refBangs.forEach((b) =>
      addBlade(
        [
          {lat: 12, lon: b.l0, offset: 0.088},
          {lat: 46, lon: b.lMid, offset: b.midOff},
          {lat: b.latEnd, lon: b.lEnd, offset: 0.032},
        ],
        b.w,
        b.d,
        {
          edgePinch: 0.16,
          ridgeBoost: 0.16,
          roundTipScale: 0.07,
        },
      ),
    );

    if (!isHatCap) {
      // 2 iconic flared-out side tips poking diagonally out beyond the plush dome on viewer's left (-lon)
      const leftFlares: LockStep[][] = [
        [
          {lat: 30, lon: -50, offset: 0.09},
          {lat: 56, lon: -66, offset: 0.105},
          {lat: 70, lon: -77, offset: 0.142},
        ],
        [
          {lat: 38, lon: -56, offset: 0.09},
          {lat: 66, lon: -72, offset: 0.098},
          {lat: 82, lon: -81, offset: 0.132},
        ],
      ];
      leftFlares.forEach((steps) =>
        addBlade(steps, 0.062, 0.028, {
          profile: 'tuft',
          edgePinch: 0.15,
          roundTipScale: 0.07,
        }),
      );

      // Prominent cute top crown cowlick (ahoge) rising cleanly above the plush 0.10m dome
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              [0.018, HEAD_CY + HEAD_RY + 0.082, -0.012],
              [0.038, HEAD_CY + HEAD_RY + 0.132, -0.018],
              [0.058, HEAD_CY + HEAD_RY + 0.172, -0.024],
            ],
            {
              width: 0.022,
              depth: 0.014,
              innerFlatten: 0.65,
              edgePinch: 0.22,
              profile: 'tuft',
              tubularSegs: 10,
              radialSegs: 8,
              roundTipScale: 0.07,
            },
          ),
          hairMat,
        ),
      );
    }
    return grp;
  }

  // ---- MALE 5: Fluffy Short Crop (Textured Voluminous Swept Quiff + under-brim hat variant) ----
  if (hairBack === 'short_crop') {
    if (!isHatCap) {
      const quiffBlades: Array<{steps: LockStep[]; w: number; d: number}> = [
        {
          steps: [
            {lat: 64, lon: -4, offset: 0.066},
            {lat: 38, lon: -12, offset: 0.118},
            {lat: 16, lon: -24, offset: 0.104},
          ],
          w: 0.086,
          d: 0.038,
        },
        {
          steps: [
            {lat: 64, lon: 16, offset: 0.064},
            {lat: 40, lon: 4, offset: 0.114},
            {lat: 18, lon: -8, offset: 0.102},
          ],
          w: 0.08,
          d: 0.036,
        },
        {
          steps: [
            {lat: 66, lon: -26, offset: 0.062},
            {lat: 44, lon: -34, offset: 0.106},
            {lat: 24, lon: -40, offset: 0.094},
          ],
          w: 0.074,
          d: 0.032,
        },
        {
          steps: [
            {lat: 66, lon: 34, offset: 0.062},
            {lat: 46, lon: 26, offset: 0.1},
            {lat: 26, lon: 16, offset: 0.09},
          ],
          w: 0.072,
          d: 0.03,
        },
        // Forehead-framing wispy brow locks so front never looks bald under quiff
        {
          steps: [
            {lat: 22, lon: 18, offset: 0.082},
            {lat: 52, lon: 38, offset: 0.068},
            {lat: 78, lon: 52, offset: 0.034},
          ],
          w: 0.068,
          d: 0.028,
        },
        {
          steps: [
            {lat: 22, lon: -18, offset: 0.082},
            {lat: 52, lon: -40, offset: 0.068},
            {lat: 78, lon: -54, offset: 0.034},
          ],
          w: 0.068,
          d: 0.028,
        },
      ];
      quiffBlades.forEach((q) =>
        addBlade(q.steps, q.w, q.d, {profile: 'quiff', roundTipScale: 0.22}),
      );
    } else {
      addBlade(
        [
          {lat: 36, lon: 14, offset: 0.016},
          {lat: 56, lon: -4, offset: 0.032},
          {lat: 72, lon: -20, offset: 0.022},
        ],
        0.076,
        0.024,
      );
      addBlade(
        [
          {lat: 38, lon: -8, offset: 0.016},
          {lat: 58, lon: -24, offset: 0.03},
          {lat: 74, lon: -40, offset: 0.02},
        ],
        0.068,
        0.022,
      );
      addBlade(
        [
          {lat: 38, lon: 22, offset: 0.016},
          {lat: 58, lon: 34, offset: 0.03},
          {lat: 74, lon: 46, offset: 0.02},
        ],
        0.064,
        0.022,
      );
    }
    return grp;
  }

  // ---- FEMALE BANGS ('air_bangs' | 'side_sweep' | 'curtain' | 'neat_fringe') ----
  if (!male) {
    if (hairFront === 'neat_fringe') {
      const fringe = [
        {l0: 0, lMid: 0, lEnd: 0, latEnd: 79, w: 0.078},
        {l0: -10, lMid: -13, lEnd: -15, latEnd: 79, w: 0.074},
        {l0: 10, lMid: 13, lEnd: 15, latEnd: 79, w: 0.074},
        {l0: -20, lMid: -26, lEnd: -30, latEnd: 78.5, w: 0.072},
        {l0: 20, lMid: 26, lEnd: 30, latEnd: 78.5, w: 0.072},
        {l0: -30, lMid: -39, lEnd: -44, latEnd: 80, w: 0.07},
        {l0: 30, lMid: 39, lEnd: 44, latEnd: 80, w: 0.07},
        {l0: -38, lMid: -52, lEnd: -58, latEnd: 88, w: 0.068},
        {l0: 38, lMid: 52, lEnd: 58, latEnd: 88, w: 0.068},
      ];
      fringe.forEach((b) =>
        addBlade(
          [
            {lat: 12, lon: b.l0, offset: 0.082},
            {lat: 46, lon: b.lMid, offset: 0.062},
            {lat: b.latEnd, lon: b.lEnd, offset: 0.032},
          ],
          b.w,
          0.032,
          {roundTipScale: 0.22},
        ),
      );
    } else if (hairFront === 'curtain') {
      [-1, 1].forEach((side) => {
        const blades = [
          {l0: side * 2, lMid: side * 18, lEnd: side * 27, latEnd: 80, w: 0.076},
          {l0: side * 10, lMid: side * 30, lEnd: side * 41, latEnd: 84, w: 0.074},
          {l0: side * 20, lMid: side * 44, lEnd: side * 54, latEnd: 90, w: 0.07},
          {l0: side * 30, lMid: side * 54, lEnd: side * 62, latEnd: 96, w: 0.066},
        ];
        blades.forEach((b) =>
          addBlade(
            [
              {lat: 12, lon: b.l0, offset: 0.082},
              {lat: 46, lon: b.lMid, offset: 0.064},
              {lat: b.latEnd, lon: b.lEnd, offset: 0.032},
            ],
            b.w,
            0.032,
            {roundTipScale: 0.18},
          ),
        );
      });
    } else if (hairFront === 'side_sweep') {
      const sweeps = [
        {l0: -20, lMid: -4, lEnd: 12, latEnd: 78, w: 0.078},
        {l0: -14, lMid: 10, lEnd: 28, latEnd: 79, w: 0.074},
        {l0: -4, lMid: 24, lEnd: 42, latEnd: 82, w: 0.072},
        {l0: 8, lMid: 40, lEnd: 56, latEnd: 88, w: 0.068},
        {l0: -24, lMid: -37, lEnd: -46, latEnd: 82, w: 0.072},
        {l0: -32, lMid: -50, lEnd: -59, latEnd: 90, w: 0.068},
      ];
      sweeps.forEach((b) =>
        addBlade(
          [
            {lat: 12, lon: b.l0, offset: 0.082},
            {lat: 46, lon: b.lMid, offset: 0.064},
            {lat: b.latEnd, lon: b.lEnd, offset: 0.032},
          ],
          b.w,
          0.032,
          {roundTipScale: 0.18},
        ),
      );
    } else {
      // air_bangs: delicate airy bangs puffing smoothly out from plush crown
      const airLocks = [
        {l0: -1, lMid: -2, lEnd: -2, latEnd: 79, w: 0.06},
        {l0: 11, lMid: 15, lEnd: 18, latEnd: 78, w: 0.06},
        {l0: -13, lMid: -17, lEnd: -20, latEnd: 78, w: 0.06},
        {l0: 22, lMid: 31, lEnd: 38, latEnd: 81, w: 0.066},
        {l0: -24, lMid: -33, lEnd: -40, latEnd: 81, w: 0.066},
        {l0: 32, lMid: 46, lEnd: 56, latEnd: 88, w: 0.068},
        {l0: -34, lMid: -48, lEnd: -57, latEnd: 88, w: 0.068},
      ];
      airLocks.forEach((b) =>
        addBlade(
          [
            {lat: 12, lon: b.l0, offset: 0.082},
            {lat: 46, lon: b.lMid, offset: 0.062},
            {lat: b.latEnd, lon: b.lEnd, offset: 0.031},
          ],
          b.w,
          0.03,
          {roundTipScale: 0.16},
        ),
      );
    }
  }

  return grp;
}

/**
 * 3. SIDE HAIR:
 * Seamless sculpted clay sideburn & behind-ear volume layers bridging FrontHair to BackHair.
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
  const topLat = isHatCap ? 36 : 16;
  const topOff = isHatCap ? 0.016 : 0.084;
  const midSideOff = isHatCap ? 0.036 : 0.088;

  [-1, 1].forEach((side) => {
    if (male) {
      // Plush sideburn lock curving slightly toward cheek in front of ear + fuller behind-ear layer
      const burnLen =
        hairBack === 'boy_2' ? 110 : hairBack === 'boy_3' ? 108 : hairBack === 'boy_4' ? 108 : 104;
      const burnPts = sampleHeadSteps(
        [
          {lat: topLat + 4, lon: side * 46, offset: topOff},
          {lat: 68, lon: side * 62, offset: midSideOff},
          {lat: burnLen, lon: side * 60, offset: 0.026},
        ],
        14,
      );
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(burnPts, {
            width: 0.068,
            depth: 0.032,
            innerFlatten: 0.3,
            edgePinch: 0.26,
            profile: 'blade',
            tubularSegs: 14,
            radialSegs: 12,
            roundTipScale: 0.14,
          }),
          hairMat,
        ),
      );

      // Behind-ear voluminous tapered nape-framing tuft
      const behindPts = sampleHeadSteps(
        [
          {lat: topLat + 2, lon: side * 86, offset: topOff},
          {lat: 74, lon: side * 104, offset: midSideOff},
          {lat: hairBack === 'boy_2' ? 120 : 114, lon: side * 108, offset: 0.03},
        ],
        14,
      );
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(behindPts, {
            width: 0.084,
            depth: 0.034,
            innerFlatten: 0.32,
            edgePinch: 0.28,
            profile: 'blade',
            tubularSegs: 14,
            radialSegs: 12,
            roundTipScale: 0.18,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (isLong) {
      // 1) Plush face-framing cheek tendril with bouncy outer volume
      const cheekPts: [number, number, number][] = [
        headSurfacePoint(topLat + 4, side * 52, topOff),
        headSurfacePoint(72, side * 62, midSideOff),
        [side * 0.348, 0.21, 0.105],
        [side * 0.326, 0.05, 0.104],
        [side * 0.292, -0.11, 0.116],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(cheekPts, {
            width: 0.074,
            depth: 0.036,
            innerFlatten: 0.38,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );

      // 2) Full puffy side-shoulder wave behind ear bridging seamlessly into BackHair
      const shoulderPts: [number, number, number][] = [
        headSurfacePoint(topLat + 2, side * 88, topOff),
        headSurfacePoint(74, side * 105, midSideOff + 0.008),
        [side * 0.388, 0.19, -0.052],
        [side * 0.386, 0.01, -0.095],
        [side * 0.352, -0.15, -0.075],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(shoulderPts, {
            width: 0.108,
            depth: 0.044,
            innerFlatten: 0.42,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (isBob) {
      // 1) Fluffy inward-tucked cheek bob curl
      const cheekPts: [number, number, number][] = [
        headSurfacePoint(topLat + 4, side * 54, topOff),
        headSurfacePoint(72, side * 62, midSideOff),
        [side * 0.352, 0.21, 0.092],
        [side * 0.308, 0.095, 0.098],
        [side * 0.246, 0.042, 0.108],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(cheekPts, {
            width: 0.078,
            depth: 0.038,
            innerFlatten: 0.38,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );

      // 2) Fluffy behind-ear bob C-curl layer
      const sideBobPts: [number, number, number][] = [
        headSurfacePoint(topLat + 2, side * 90, topOff),
        headSurfacePoint(74, side * 106, midSideOff + 0.008),
        [side * 0.372, 0.19, -0.052],
        [side * 0.336, 0.08, -0.075],
        [side * 0.268, 0.042, -0.04],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(sideBobPts, {
            width: 0.108,
            depth: 0.044,
            innerFlatten: 0.42,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );
      return;
    }

    // Tied styles (ponytail, twin_tails, twin_buns): plush cheek tendrils emerging cleanly
    const wispPts: [number, number, number][] = [
      headSurfacePoint(36, side * 54, isHatCap ? 0.022 : 0.078),
      headSurfacePoint(74, side * 60, isHatCap ? 0.03 : 0.062),
      [side * 0.306, 0.21, 0.104],
      [side * 0.258, 0.11, 0.122],
    ];
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(wispPts, {
          width: 0.06,
          depth: 0.028,
          innerFlatten: 0.34,
          profile: 'blade',
          outwardMode: 'drape',
          tubularSegs: 14,
          radialSegs: 12,
          roundTipScale: 0.16,
        }),
        hairMat,
      ),
    );
  });

  return grp;
}

/**
 * 4. BACK HAIR:
 * Multi-layered, curved, volumetric polymer clay hair structures flowing seamlessly
 * from the plush HairBase dome!
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
  const topLat = isHatCap ? 44 : 16;
  const topOff = isHatCap ? 0.016 : 0.084;
  const upperMidOff = isHatCap ? 0.038 : 0.094;
  const midBackOff = isHatCap ? 0.042 : 0.088;

  // ---- 1. LONG WAVE: Two overlapping sculpted tiers of curved clay S-waves ----
  if (hairBack === 'long_wave') {
    const innerLons = [-116, -138, -160, 180, 160, 138, 116];
    innerLons.forEach((lon, idx) => {
      const r0 = headSurfacePoint(topLat, lon, topOff);
      const r1 = headSurfacePoint(74, lon, upperMidOff);
      const r2 = headSurfacePoint(108, lon, midBackOff);
      const flare = 1.15;
      const rad = (lon * Math.PI) / 180;
      const waveOut = idx % 2 === 0 ? 0.02 : -0.01;
      const pMid: [number, number, number] = [
        r2[0] * flare,
        0.04,
        r2[2] * flare - 0.032 + waveOut,
      ];
      const pHem: [number, number, number] = [
        Math.sin(rad) * 0.365,
        -0.17 - (idx === 3 ? 0.02 : 0),
        Math.cos(rad) * 0.375 - 0.024,
      ];

      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2, pMid, pHem], {
            width: 0.124,
            depth: 0.048,
            innerFlatten: 0.42,
            ridgeBoost: 0.12,
            profile: 'wave',
            outwardMode: 'drape',
            tipLift: 0.006,
            tubularSegs: 20,
            radialSegs: 12,
            roundTipScale: 0.34,
          }),
          hairMat,
        ),
      );
    });

    const upperLons = [-128, -154, 180, 154, 128];
    upperLons.forEach((lon, idx) => {
      const r0 = headSurfacePoint(topLat + 4, lon, topOff);
      const r1 = headSurfacePoint(72, lon, upperMidOff + 0.008);
      const r2 = headSurfacePoint(100, lon, midBackOff + 0.008);
      const pEnd: [number, number, number] = [
        r2[0] * 1.09,
        0.06 - (idx === 2 ? 0.02 : 0),
        r2[2] * 1.11 - 0.022,
      ];

      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2, pEnd], {
            width: 0.118,
            depth: 0.042,
            innerFlatten: 0.38,
            ridgeBoost: 0.12,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
            roundTipScale: 0.28,
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
      const r1 = headSurfacePoint(74, lon, upperMidOff);
      const r2 = headSurfacePoint(108, lon, midBackOff);
      const r3 = headSurfacePoint(126, lon, 0.032);
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2, r3], {
            width: 0.124,
            depth: 0.048,
            innerFlatten: 0.42,
            ridgeBoost: 0.1,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );
    });

    const upperLons = [-130, -156, 180, 156, 130];
    upperLons.forEach((lon) => {
      const r0 = headSurfacePoint(topLat + 4, lon, topOff);
      const r1 = headSurfacePoint(72, lon, upperMidOff + 0.008);
      const r2 = headSurfacePoint(104, lon, midBackOff + 0.008);
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, r2], {
            width: 0.118,
            depth: 0.04,
            innerFlatten: 0.38,
            ridgeBoost: 0.1,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 14,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 3. PONYTAIL ----
  if (hairBack === 'ponytail') {
    const rootLat = isHatCap ? 90 : 72;
    const rootOff = isHatCap ? 0.042 : 0.088;
    const rootPt = headSurfacePoint(rootLat, 180, rootOff);

    [-1, 1].forEach((side) => {
      const sweepPts = sampleHeadSteps(
        [
          {lat: 112, lon: side * 140, offset: 0.026},
          {lat: 94, lon: side * 160, offset: rootOff * 0.85},
          {lat: rootLat, lon: side * 180, offset: rootOff},
        ],
        10,
      );
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(sweepPts, {
            width: 0.082,
            depth: 0.024,
            innerFlatten: 0.35,
            profile: 'lock',
            tubularSegs: 10,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
    });

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 12), hairMat);
    knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
    backHairGroup.add(knot);

    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.018, 10, 18),
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
            [0, 0.37 + ryOffset, -0.39],
            [0, 0.24 + ryOffset, -0.475],
            [0, 0.07 + ryOffset, -0.45],
            [0, -0.1 + ryOffset, -0.395],
          ],
          {
            width: 0.108,
            depth: 0.068,
            innerFlatten: 0.62,
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
              [side * 0.058, 0.34 + ryOffset, -0.385],
              [side * 0.092, 0.18 + ryOffset, -0.44],
              [side * 0.068, 0.0 + ryOffset, -0.4],
            ],
            {
              width: 0.068,
              depth: 0.044,
              innerFlatten: 0.52,
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
    });
    return;
  }

  // ---- 4. TWIN TAILS ----
  if (hairBack === 'twin_tails') {
    [-1, 1].forEach((side) => {
      const rootLat = isHatCap ? 88 : 74;
      const rootPt = headSurfacePoint(rootLat, side * 118, isHatCap ? 0.04 : 0.086);
      const radialOut = new THREE.Vector3(
        rootPt[0],
        rootPt[1] - HEAD_CY,
        rootPt[2],
      ).normalize();

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.054, 14, 12), hairMat);
      knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
      backHairGroup.add(knot);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.059, 0.018, 10, 18),
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
              [side * 0.435, 0.26 + yAdj, -0.145],
              [side * 0.475, 0.08 + yAdj, -0.16],
              [side * 0.445, -0.12 + yAdj, -0.13],
            ],
            {
              width: 0.094,
              depth: 0.062,
              innerFlatten: 0.62,
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
              [side * 0.405, 0.24 + yAdj, -0.2],
              [side * 0.415, 0.06 + yAdj, -0.225],
              [side * 0.385, -0.09 + yAdj, -0.19],
            ],
            {
              width: 0.064,
              depth: 0.044,
              innerFlatten: 0.56,
              ridgeBoost: 0.1,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 16,
              radialSegs: 12,
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
    const bunLat = isHatCap ? 74 : 46;
    const bunLon = isHatCap ? 114 : 104;
    const bunScale = isHatCap ? 0.88 : 1.04;

    [-1, 1].forEach((side) => {
      const pBun = headSurfacePoint(bunLat, side * bunLon, isHatCap ? 0.05 : 0.092);
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

  // ---- 6. MALE & SHORT CROP BACK LAYERS: Seamless Nendoroid nape blades ----
  const backCols: {lons: [number, number, number]; latEnd: number; w: number; d: number}[] =
    hairBack === 'boy_2'
      ? [
          {lons: [180, 180, 180], latEnd: 134, w: 0.106, d: 0.03},
          {lons: [154, 150, 144], latEnd: 132, w: 0.1, d: 0.028},
          {lons: [-154, -150, -144], latEnd: 132, w: 0.1, d: 0.028},
          {lons: [128, 124, 118], latEnd: 124, w: 0.088, d: 0.026},
          {lons: [-128, -124, -118], latEnd: 124, w: 0.088, d: 0.026},
        ]
      : hairBack === 'boy_3'
        ? [
            {lons: [180, 180, 180], latEnd: 130, w: 0.106, d: 0.032},
            {lons: [150, 146, 140], latEnd: 126, w: 0.096, d: 0.03},
            {lons: [-150, -146, -140], latEnd: 126, w: 0.096, d: 0.03},
            {lons: [124, 118, 114], latEnd: 118, w: 0.084, d: 0.026},
            {lons: [-124, -118, -114], latEnd: 118, w: 0.084, d: 0.026},
          ]
        : hairBack === 'boy_4'
          ? [
              {lons: [180, 180, 180], latEnd: 126, w: 0.106, d: 0.03},
              {lons: [152, 148, 144], latEnd: 122, w: 0.098, d: 0.028},
              {lons: [-152, -148, -144], latEnd: 122, w: 0.098, d: 0.028},
              {lons: [126, 122, 116], latEnd: 116, w: 0.086, d: 0.026},
              {lons: [-126, -122, -116], latEnd: 116, w: 0.086, d: 0.026},
            ]
          : [
              {lons: [180, 180, 180], latEnd: 124, w: 0.104, d: 0.028},
              {lons: [150, 146, 142], latEnd: 120, w: 0.096, d: 0.026},
              {lons: [-150, -146, -142], latEnd: 120, w: 0.096, d: 0.026},
              {lons: [124, 120, 116], latEnd: 114, w: 0.082, d: 0.024},
              {lons: [-124, -120, -116], latEnd: 114, w: 0.082, d: 0.024},
            ];

  backCols.forEach((b) => {
    const pts = sampleHeadSteps(
      [
        {lat: isHatCap ? 44 : 16, lon: b.lons[0], offset: topOff},
        {lat: 82, lon: b.lons[1], offset: isHatCap ? 0.024 : 0.092},
        {lat: b.latEnd, lon: b.lons[2], offset: 0.028},
      ],
      14,
    );
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(pts, {
          width: b.w * 1.12,
          depth: b.d * 1.15,
          innerFlatten: 0.32,
          edgePinch: 0.28,
          profile: hairBack === 'boy_3' ? 'tuft' : 'blade',
          tubularSegs: 14,
          radialSegs: 12,
          roundTipScale: 0.18,
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

  // Standardized Attachment Points hugging the actual outer fluffy hair envelope cleanly
  const isHatCap = hatMode === 'crown_cap';
  const crownY = HEAD_CY + HEAD_RY + crownOuterOffset;
  const sideSurf = headSurfacePoint(78, 90, isHatCap ? 0.022 : crownOuterOffset + 0.022);
  const headbandRadius = Math.max(0.422, Math.abs(sideSurf[0]) + 0.008);

  const templeL = headSurfacePoint(64, -50, isHatCap ? 0.042 : crownOuterOffset + 0.024);
  const templeR = headSurfacePoint(64, 50, isHatCap ? 0.042 : crownOuterOffset + 0.024);
  const foreheadPt = headSurfacePoint(54, 0, isHatCap ? 0.042 : crownOuterOffset + 0.018);
  const backPt = headSurfacePoint(52, 180, crownOuterOffset * 0.92);
  const napePt = headSurfacePoint(116, 180, 0.028);

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
      center: new THREE.Vector3(0, HEAD_CY + 0.004, 0.014),
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
