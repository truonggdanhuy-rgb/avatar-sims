import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AvatarConfig, AvatarPose} from '../types/game';
import {clayMat, glossyClayMat, makeShadowed} from './materials';

export type HoldPose = 'none' | 'carry_front' | 'carry_bag' | 'carry_umbrella';

export interface AvatarRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup?: THREE.Group;
  headPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow?: THREE.Group;
  rightElbow?: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  eyelids: THREE.Mesh[];
  shadowDisc?: THREE.Mesh;
  holdPose?: HoldPose;
}

function shadeHex(hex: string, factor: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  const nextL = Math.min(0.92, Math.max(0.12, hsl.l + factor));
  c.setHSL(hsl.h, hsl.s, nextL);
  return c;
}

// Sculpted Chibi-Sims head constants (centered at y = 0.30 inside headPivot)
const HEAD_CY = 0.3;
const HEAD_RX = 0.312;
const HEAD_RY = 0.296;
const HEAD_RZ = 0.288;

const smoothstep01 = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Evaluates a point on the sculpted stylized chibi head surface (flatter forehead/eye plane,
 * soft chubby lower cheeks, gentle tapered chin, and tiny nose bridge) + optional radial offset.
 */
function headSurfacePoint(
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

  // Subtle flat front plane so bangs & eyes seat naturally without ball-bulge
  const frontMask =
    Math.max(0, Math.cos(lon)) *
    smoothstep01(42, 95, latDeg) *
    (1 - smoothstep01(130, 168, latDeg));
  const frontFlatten = 1 - 0.055 * frontMask;

  // Soft lower-cheek fullness & gentle V-chin
  const cheekFull =
    0.014 *
    Math.exp(-Math.pow((latDeg - 114) / 18, 2)) *
    Math.exp(-Math.pow((absLon - 48) / 22, 2));
  const jawTaper = 1 - 0.1 * smoothstep01(114, 165, latDeg);
  const chinLift = 0.018 * smoothstep01(122, 175, latDeg);

  // Cute tiny nose button on front center (used only by face mesh, skipped by hair)
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

function sampleSphericalArc(
  steps: {lat: number; lon: number; offset: number}[],
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    out.push(headSurfacePoint(a.lat, a.lon, a.offset));
    out.push(
      headSurfacePoint(
        (a.lat + b.lat) * 0.5,
        (a.lon + b.lon) * 0.5,
        (a.offset + b.offset) * 0.5 + 0.004,
      ),
    );
  }
  const last = steps[steps.length - 1];
  out.push(headSurfacePoint(last.lat, last.lon, last.offset));
  return out;
}

/**
 * Builds the sculpted stylized chibi head mesh (flatter brow, soft cheeks, chin, nose).
 */
function createSculptedHeadGeometry(): THREE.BufferGeometry {
  const lonSegs = 64;
  const latSegs = 36;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= latSegs; i++) {
    const latDeg = (i / latSegs) * 180;
    for (let j = 0; j <= lonSegs; j++) {
      const lonDeg = -180 + (j / lonSegs) * 360;
      const [x, y, z] = headSurfacePoint(latDeg, lonDeg, 0, true);
      positions.push(x, y, z);
    }
  }

  const stride = lonSegs + 1;
  for (let i = 0; i < latSegs; i++) {
    for (let j = 0; j < lonSegs; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds the snug hairline base cap hugging the skull with a clean forehead hairline,
 * temple corners, sideburns, ear cutout, and neat nape.
 */
function createHairlineCapGeometry(isMaleShort: boolean): THREE.BufferGeometry {
  const lonSegs = 96;
  const latSegs = 24;
  const positions: number[] = [];
  const indices: number[] = [];

  const getCapMaxLat = (lonDeg: number) => {
    const a = Math.abs(lonDeg);
    const napeLat = isMaleShort ? 116 : 124;
    const browBase = 54 + 5 * smoothstep01(18, 46, a);
    const toTemple = smoothstep01(42, 60, a);
    const sideburn = Math.exp(-Math.pow((a - 64) / 7, 2)) * 20;
    const earCut = smoothstep01(70, 82, a) * (1 - smoothstep01(90, 106, a));
    const toNape = smoothstep01(96, 120, a);

    let maxLat = browBase + toTemple * (74 - browBase) + sideburn;
    maxLat = maxLat * (1 - earCut * 0.06) + toNape * (napeLat - maxLat);
    return maxLat;
  };

  for (let i = 0; i <= latSegs; i++) {
    const v = i / latSegs;
    for (let j = 0; j <= lonSegs; j++) {
      const lonDeg = -180 + (j / lonSegs) * 360;
      const latDeg = v * getCapMaxLat(lonDeg);
      const loft = 0.009 * (1 - 0.55 * smoothstep01(0.82, 1.0, v));
      const [x, y, z] = headSurfacePoint(latDeg, lonDeg, loft);
      positions.push(x, y, z);
    }
  }

  const stride = lonSegs + 1;
  for (let i = 0; i < latSegs; i++) {
    for (let j = 0; j < lonSegs; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds ONE plush, smooth sculpted clay outer hair dome on top of the hairline cap,
 * curving cleanly over crown, parted brow/fringe, temples, and nape with soft beveled edges.
 */
function createHairShellGeometry(
  hairBack: AvatarConfig['hairBack'],
  hairFront: AvatarConfig['hairFront'],
): THREE.BufferGeometry {
  const lonSegs = 128;
  const latSegs = 40;
  const positions: number[] = [];
  const indices: number[] = [];

  const isMaleShort =
    hairBack === 'short_crop' ||
    hairBack === 'boy_1' ||
    hairBack === 'boy_2' ||
    hairBack === 'boy_3';

  const hasPart =
    hairBack === 'boy_1' ||
    hairBack === 'boy_2' ||
    (!isMaleShort && hairFront === 'curtain');
  const partLon = hairBack === 'boy_1' ? 18 : hairBack === 'boy_2' ? -2 : 0;

  const evalFlowLon = (lonDeg: number, v: number) => {
    const f = smoothstep01(0.18, 0.95, v);
    if (hairBack === 'boy_1') return lonDeg + (lonDeg <= 18 ? -8 * f : 6 * f);
    if (hairBack === 'boy_2') {
      const side = lonDeg >= -2 ? 1 : -1;
      return lonDeg - side * (Math.sin(f * Math.PI) * 8 - f * 4);
    }
    if (hairBack === 'short_crop') return lonDeg + 6 * f;
    if (!isMaleShort && hairFront === 'side_sweep') return lonDeg + 8 * f;
    if (!isMaleShort && hairFront === 'curtain') {
      const side = lonDeg >= 0 ? 1 : -1;
      return lonDeg - side * Math.sin(f * Math.PI) * 6;
    }
    return lonDeg;
  };

  const getMaxLatDeg = (lonDeg: number) => {
    const a = Math.abs(lonDeg);
    const napeLat = isMaleShort ? 115 : 122;

    let foreheadLat = 60;
    if (hairBack === 'boy_1') {
      const partNotch = 16 * Math.exp(-Math.pow((lonDeg - 18) / 15, 2));
      foreheadLat = 63 - partNotch;
    } else if (hairBack === 'boy_2') {
      const partNotch = 17 * Math.exp(-Math.pow((lonDeg + 2) / 14, 2));
      foreheadLat = 61 + 4 * smoothstep01(10, 44, Math.abs(lonDeg + 2)) - partNotch;
    } else if (hairBack === 'boy_3') {
      foreheadLat = 60;
    } else if (hairBack === 'short_crop') {
      foreheadLat = 59 + 2 * smoothstep01(-35, 35, lonDeg);
    } else if (hairFront === 'curtain') {
      const partNotch = 17 * Math.exp(-Math.pow(lonDeg / 15, 2));
      foreheadLat = 62 + 5 * smoothstep01(12, 46, a) - partNotch;
    } else if (hairFront === 'side_sweep') {
      const partNotch = 12 * Math.exp(-Math.pow((lonDeg + 22) / 15, 2));
      foreheadLat = 61 + 3.5 * smoothstep01(-22, 42, lonDeg) - partNotch;
    } else if (hairFront === 'neat_fringe') {
      foreheadLat = 62;
    } else {
      foreheadLat = 60;
    }

    const toTemple = smoothstep01(48, 66, a);
    const sideburnDrop = Math.exp(-Math.pow((a - 67) / 8.0, 2)) * (isMaleShort ? 15 : 18);
    const earArchMask = smoothstep01(73, 86, a) * (1 - smoothstep01(88, 104, a));
    const toNape = smoothstep01(92, 118, a);

    let maxLat = foreheadLat + toTemple * (79 - foreheadLat) + sideburnDrop;
    maxLat = maxLat * (1 - earArchMask * 0.04) + toNape * (napeLat - maxLat);
    return maxLat;
  };

  for (let i = 0; i <= latSegs; i++) {
    const v = i / latSegs;
    for (let j = 0; j <= lonSegs; j++) {
      const lonDeg = -180 + (j / lonSegs) * 360;
      const latDeg = v * getMaxLatDeg(lonDeg);

      // Plush rounded clay dome with soft beveled edge roll-off
      const crownLoft = 0.036 + 0.021 * Math.sin(v * Math.PI * 0.78 + 0.25);
      const edgeBevel = 1 - 0.56 * Math.pow(smoothstep01(0.84, 1.0, v), 1.35);

      // Infinitely smooth C1 cosine lock cushion (no sharp sawtooth ridges!)
      const flowedLon = evalFlowLon(lonDeg, v);
      const softLobe = 0.5 + 0.5 * Math.cos((flowedLon * Math.PI) / 18);
      const lobeStrength =
        0.0042 * smoothstep01(0.28, 0.58, v) * (1 - 0.45 * smoothstep01(0.86, 1.0, v));

      let partCrest = 0;
      if (hasPart) {
        const distFromPart = Math.abs(flowedLon - partLon);
        const groove = -0.008 * Math.exp(-Math.pow(distFromPart / 6.5, 2));
        const lift =
          0.014 *
          Math.exp(-Math.pow((distFromPart - 20) / 13, 2)) *
          (1 - 0.45 * smoothstep01(0.76, 1.0, v));
        partCrest = (groove + lift) * smoothstep01(0.1, 0.4, v);
      }

      const loft = crownLoft * edgeBevel + softLobe * lobeStrength + partCrest;
      const [x, y, z] = headSurfacePoint(latDeg, lonDeg, loft);
      positions.push(x, y, z);
    }
  }

  const rowStride = lonSegs + 1;
  for (let i = 0; i < latSegs; i++) {
    for (let j = 0; j < lonSegs; j++) {
      const a = i * rowStride + j;
      const b = (i + 1) * rowStride + j;
      const c = (i + 1) * rowStride + (j + 1);
      const d = i * rowStride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds ONE unified, solid double-walled sculpted clay back-hair mass (for long_wave & bob_cut),
 * smoothly tucked inside the crown shell so there are zero disconnected floating sausage tubes.
 */
function createBackHairCloakGeometry(variant: 'long_wave' | 'bob_cut'): THREE.BufferGeometry {
  const uSegs = 56;
  const vSegs = 26;
  const isLong = variant === 'long_wave';

  const evalCloakPoint = (u: number, v: number, isInner: boolean): [number, number, number] => {
    const arcDeg = -70 + u * 140;
    const edgeTaper = Math.sin(u * Math.PI);
    const edgeSmooth = smoothstep01(0.0, 0.14, u) * smoothstep01(1.0, 0.86, u);

    const scallopWave = 0.5 + 0.5 * Math.cos((arcDeg * Math.PI) / 14);
    const tipScallop = isLong
      ? (0.048 * scallopWave + 0.025 * edgeTaper) * smoothstep01(0.55, 1.0, v)
      : (0.018 * scallopWave + 0.012 * edgeTaper) * smoothstep01(0.6, 1.0, v);

    const yTop = 0.44;
    const yBottom = isLong ? -0.2 - tipScallop : 0.015 - tipScallop;
    const y = yTop + (yBottom - yTop) * v;

    const arcRad = (arcDeg * Math.PI) / 180;
    const baseRx = isLong
      ? 0.342 - 0.028 * Math.sin(v * Math.PI * 0.9) + 0.022 * smoothstep01(0.55, 1.0, v)
      : 0.342 + 0.016 * Math.sin(v * Math.PI) - 0.042 * smoothstep01(0.65, 1.0, v);
    const baseRz = isLong
      ? 0.335 - 0.022 * Math.sin(v * Math.PI * 0.85) + 0.026 * smoothstep01(0.5, 1.0, v)
      : 0.335 + 0.022 * Math.sin(v * Math.PI) - 0.045 * smoothstep01(0.65, 1.0, v);

    const lobeCrest =
      (isLong ? 0.018 : 0.011) *
      (0.5 + 0.5 * Math.cos((arcDeg * Math.PI) / 14)) *
      smoothstep01(0.18, 0.5, v) *
      (1 - 0.35 * smoothstep01(0.88, 1.0, v)) *
      edgeSmooth;

    const thickness =
      (isLong ? 0.056 : 0.05) *
      (1 - 0.8 * Math.pow(smoothstep01(0.84, 1.0, v), 1.4)) *
      (0.28 + 0.72 * edgeSmooth);

    const radialOffset = (isInner ? -0.45 : 0.55) * thickness + (isInner ? 0 : lobeCrest);
    const rx = baseRx + radialOffset;
    const rz = baseRz + radialOffset;

    const x = rx * Math.sin(arcRad);
    const z = -rz * Math.cos(arcRad);
    return [x, y, z];
  };

  const positions: number[] = [];
  const indices: number[] = [];
  const rowStride = uSegs + 1;
  const layerSize = (vSegs + 1) * rowStride;

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs;
    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const [x, y, z] = evalCloakPoint(u, v, false);
      positions.push(x, y, z);
    }
  }

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs;
    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const [x, y, z] = evalCloakPoint(u, v, true);
      positions.push(x, y, z);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * rowStride + iu;
      const b = (iv + 1) * rowStride + iu;
      const c = (iv + 1) * rowStride + (iu + 1);
      const d = iv * rowStride + (iu + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = layerSize + iv * rowStride + iu;
      const b = layerSize + (iv + 1) * rowStride + iu;
      const c = layerSize + (iv + 1) * rowStride + (iu + 1);
      const d = layerSize + iv * rowStride + (iu + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const outerBot = vSegs * rowStride;
  const innerBot = layerSize + vSegs * rowStride;
  for (let iu = 0; iu < uSegs; iu++) {
    const a = outerBot + iu;
    const b = innerBot + iu;
    const c = innerBot + iu + 1;
    const d = outerBot + iu + 1;
    indices.push(a, d, b);
    indices.push(b, d, c);
  }

  for (let iu = 0; iu < uSegs; iu++) {
    const a = iu;
    const b = layerSize + iu;
    const c = layerSize + iu + 1;
    const d = iu + 1;
    indices.push(a, b, d);
    indices.push(b, c, d);
  }

  for (let iv = 0; iv < vSegs; iv++) {
    const la = iv * rowStride;
    const lb = (iv + 1) * rowStride;
    const lc = layerSize + (iv + 1) * rowStride;
    const ld = layerSize + iv * rowStride;
    indices.push(la, lb, ld);
    indices.push(lb, lc, ld);

    const ra = iv * rowStride + uSegs;
    const rb = (iv + 1) * rowStride + uSegs;
    const rc = layerSize + (iv + 1) * rowStride + uSegs;
    const rd = layerSize + iv * rowStride + uSegs;
    indices.push(ra, rd, rb);
    indices.push(rb, rd, rc);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds a seamless sculpted accordion/pleated skirt geometry from waist to hem.
 */
function createPleatedSkirtGeometry(
  waistR: number,
  hemR: number,
  height: number,
  pleatCount: number,
  pleatAmp: number,
): THREE.BufferGeometry {
  const radSegs = pleatCount * 4;
  const heightSegs = 6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const y = (0.5 - v) * height;
    const baseR = waistR + (hemR - waistR) * Math.pow(v, 0.92);
    // Start pleat wave at 0 at the waistband so the top ring never pokes through shirts/cardigans
    const amp = pleatAmp * Math.pow(v, 0.85);

    for (let ir = 0; ir <= radSegs; ir++) {
      const u = ir / radSegs;
      const theta = u * Math.PI * 2;
      const wave = Math.cos(theta * pleatCount);
      const r = baseR + amp * wave;
      positions.push(Math.sin(theta) * r, y, Math.cos(theta) * r);
    }
  }

  const stride = radSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ir = 0; ir < radSegs; ir++) {
      const a = iy * stride + ir;
      const b = (iy + 1) * stride + ir;
      const c = (iy + 1) * stride + (ir + 1);
      const d = iy * stride + (ir + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const bottomCenterIdx = positions.length / 3;
  positions.push(0, -height * 0.44, 0);
  const lastRow = heightSegs * stride;
  for (let ir = 0; ir < radSegs; ir++) {
    indices.push(bottomCenterIdx, lastRow + ir + 1, lastRow + ir);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function createTorsoProfilePoints(scaleOffset = 0, yMin = -0.195, yMax = 0.21): THREE.Vector2[] {
  const basePts: [number, number][] = [
    [0.01, yMin],
    [0.218 + scaleOffset, yMin],
    [0.222 + scaleOffset, -0.14],
    [0.212 + scaleOffset, -0.05],
    [0.204 + scaleOffset, 0.05],
    [0.202 + scaleOffset, 0.128],
    [0.174 + scaleOffset, 0.17],
    [0.114 + scaleOffset * 0.6, 0.198],
    [0.075, yMax],
  ];
  return basePts.map(([r, y]) => new THREE.Vector2(Math.max(0.005, r), y));
}

/**
 * Builds a 100% solid, outward-facing tapered clay strand along a 3D Catmull-Rom curve.
 * Enforces right-handed (tangent × normal = +binormal) so triangles NEVER invert inside-out!
 */
function createTaperedStrandGeometry(
  points: [number, number, number][],
  radii: number[],
  widthScale = 1.22,
  depthScale = 0.78,
  tubularSegs = 16,
  radialSegs = 10,
): THREE.BufferGeometry {
  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs);

  const sampleRadius = (t: number) => {
    if (radii.length === 1) return radii[0];
    const scaled = t * (radii.length - 1);
    const idx = Math.min(radii.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    return radii[idx] + (radii[idx + 1] - radii[idx]) * frac;
  };

  const positions: number[] = [];
  const indices: number[] = [];

  const prevTan = curve.getTangentAt(0).normalize();
  const upRef =
    Math.abs(prevTan.y) < 0.88
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
  // Guarantee right-handed frame: tangent × normal = +binormal => binormal × tangent = +normal (OUTWARD)
  const normal = upRef.clone().cross(prevTan).normalize();
  const binormal = prevTan.clone().cross(normal).normalize();
  const q = new THREE.Quaternion();

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const center = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    if (i > 0) {
      q.setFromUnitVectors(prevTan, tan);
      normal.applyQuaternion(q).normalize();
      binormal.applyQuaternion(q).normalize();
      prevTan.copy(tan);
    }

    const r = sampleRadius(t);
    const rx = r * widthScale;
    const rz = r * depthScale;

    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      positions.push(
        center.x + normal.x * cos * rx + binormal.x * sin * rz,
        center.y + normal.y * cos * rx + binormal.y * sin * rz,
        center.z + normal.z * cos * rx + binormal.z * sin * rz,
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
      // (d - a) × (b - a) = (+binormal) × (+tangent) = +normal (OUTWARD)
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const startCenterIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  const t0 = curve.getTangentAt(0).normalize();
  positions.push(
    p0.x - t0.x * radii[0] * 0.4,
    p0.y - t0.y * radii[0] * 0.4,
    p0.z - t0.z * radii[0] * 0.4,
  );
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(startCenterIdx, nextJ, j);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  const rEnd = radii[radii.length - 1];
  positions.push(
    p1.x + t1.x * rEnd * 0.55,
    p1.y + t1.y * rEnd * 0.55,
    p1.z + t1.z * rEnd * 0.55,
  );
  const lastRow = tubularSegs * radialSegs;
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(endCenterIdx, lastRow + j, lastRow + nextJ);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds a smooth vinyl/clay sculpted hair lock hugging the head ellipsoid.
 * Uses a pillowy beveled crescent cross-section (soft rounded shoulders, flush underside)
 * tapering gracefully into a smooth clay tip—never jagged triangles or harsh pipe ridges.
 */
function createHairBladeGeometry(
  points: [number, number, number][],
  radii: number[],
  widthScale = 1.85,
  depthScale = 0.56,
  tubularSegs = 20,
  radialSegs = 16,
): THREE.BufferGeometry {
  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs);
  const headCenter = new THREE.Vector3(0, HEAD_CY, 0);

  const sampleRadius = (t: number) => {
    if (radii.length === 1) return radii[0];
    const scaled = t * (radii.length - 1);
    const idx = Math.min(radii.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    const s = frac * frac * (3 - 2 * frac);
    return radii[idx] + (radii[idx + 1] - radii[idx]) * s;
  };

  const positions: number[] = [];
  const indices: number[] = [];
  const fallbackUp = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const center = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    const radial = center.clone().sub(headCenter);
    if (radial.lengthSq() < 1e-5) radial.set(0, 0, 1);
    radial.normalize();

    const outDir = radial.clone().addScaledVector(tan, -radial.dot(tan));
    if (outDir.lengthSq() < 1e-4) {
      outDir.copy(fallbackUp).addScaledVector(tan, -fallbackUp.dot(tan));
      if (outDir.lengthSq() < 1e-4) outDir.set(0, 0, 1);
    }
    outDir.normalize();

    const sideDir = tan.clone().cross(outDir).normalize();

    const r = sampleRadius(t);
    const w = r * widthScale;
    const h = r * depthScale;

    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const lateral = Math.sign(cos) * Math.pow(Math.abs(cos), 0.82) * w;
      const out = (sin * (sin >= 0 ? 0.85 : 0.42) - 0.1 * cos * cos) * h;

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

  const startCenterIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  const t0 = curve.getTangentAt(0).normalize();
  positions.push(
    p0.x - t0.x * radii[0] * 0.25,
    p0.y - t0.y * radii[0] * 0.25,
    p0.z - t0.z * radii[0] * 0.25,
  );
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(startCenterIdx, j, nextJ);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  const rEnd = radii[radii.length - 1];
  positions.push(
    p1.x + t1.x * rEnd * 0.48,
    p1.y + t1.y * rEnd * 0.48,
    p1.z + t1.z * rEnd * 0.48,
  );
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

export function buildAvatarRig(config: AvatarConfig): AvatarRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = clayMat(config.skinTone, 0.54, 0.02);
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: config.hairColor,
    roughness: 0.42,
    metalness: 0.03,
    clearcoat: 0.2,
    clearcoatRoughness: 0.48,
  });
  const topMat = clayMat(config.topColor, 0.66, 0.02);
  const topDarkMat = clayMat(shadeHex(config.topColor, -0.09).getHex(), 0.7, 0.02);
  const topLightMat = clayMat(shadeHex(config.topColor, 0.09).getHex(), 0.62, 0.02);
  const topTrimMat = clayMat('#FFFBF2', 0.7, 0.02);
  const bottomMat = clayMat(config.bottomColor, 0.72, 0.02);
  const bottomDarkMat = clayMat(shadeHex(config.bottomColor, -0.09).getHex(), 0.74, 0.02);
  const bottomLightMat = clayMat(shadeHex(config.bottomColor, 0.07).getHex(), 0.68, 0.02);
  const eyeWhiteMat = glossyClayMat('#FFFFFF', 0.16);
  const irisMat = glossyClayMat(config.eyeColor, 0.14);
  const pupilMat = glossyClayMat('#241B19', 0.12);
  const cheekMat = clayMat('#F28B92', 0.65, 0);

  // Soft contact shadow disc right under the planted shoes
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 24),
    new THREE.MeshBasicMaterial({
      color: 0x261a14,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.004;
  root.add(shadowDisc);

  // ========== LEGS, SOCKS & GROUNDED SHOES ==========
  const sockMat = clayMat('#FFF8EE', 0.72, 0.01);
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.52, 0);

    // Continuous tapered leg extending deep inside the shoe so there is never an empty ankle gap
    const legMat = config.bottom === 'wide_trousers' ? bottomMat : skinMat;
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), legMat);
    legPivot.add(hipCap);

    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.056, 0.44, 18),
      legMat,
    );
    legMesh.position.y = -0.22;
    legPivot.add(legMesh);

    if (config.bottom === 'wide_trousers') {
      const pantCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.094, 0.114, 0.395, 18),
        bottomMat,
      );
      pantCyl.position.y = -0.202;
      legPivot.add(pantCyl);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.118, 0.12, 0.044, 18),
        bottomDarkMat,
      );
      cuff.position.y = -0.395;
      legPivot.add(cuff);
    } else if (config.bottom === 'denim_shorts') {
      const shortMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.102, 0.165, 16),
        bottomMat,
      );
      shortMesh.position.y = -0.08;
      legPivot.add(shortMesh);

      const hem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.107, 0.026, 16),
        bottomLightMat,
      );
      hem.position.y = -0.16;
      legPivot.add(hem);
    }

    // Knit ankle sock + rolled cuff bridging the lower shin smoothly into shoes
    if (config.bottom !== 'wide_trousers' && config.shoes !== 'boots') {
      const sockTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.059, 0.105, 18),
        sockMat,
      );
      sockTube.position.y = -0.39;
      const sockCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.011, 8, 18),
        sockMat,
      );
      sockCuff.rotation.x = Math.PI / 2;
      sockCuff.position.y = -0.338;
      legPivot.add(sockTube, sockCuff);
    }

    // Shoe planted flush on ground (0.52 - 0.512 = 0.008 right above shadowDisc)
    const shoeMat = glossyClayMat(config.shoeColor || '#3A2B2B', 0.34);
    const isSneaker = config.shoes === 'sneakers';
    const shoeBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.154, isSneaker ? 0.092 : 0.102, 0.23, 4, isSneaker ? 0.04 : 0.044),
      shoeMat,
    );
    shoeBase.position.set(0, isSneaker ? -0.454 : -0.46, 0.036);
    legPivot.add(shoeBase);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.074, 14, 10), shoeMat);
    toeCap.scale.set(1.0, isSneaker ? 0.6 : 0.68, 1.05);
    toeCap.position.set(0, isSneaker ? -0.46 : -0.466, 0.114);
    legPivot.add(toeCap);

    if (isSneaker) {
      const outsole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.069, 0.022, 22),
        clayMat('#EBE5DB', 0.48),
      );
      outsole.scale.set(1.04, 1, 1.56);
      outsole.position.set(0, -0.499, 0.056);
      legPivot.add(outsole);

      for (let i = 0; i < 2; i++) {
        const lace = new THREE.Mesh(
          new RoundedBoxGeometry(0.064, 0.014, 0.02, 2, 0.005),
          clayMat('#FFFFFF', 0.4),
        );
        lace.position.set(0, -0.408, 0.042 + i * 0.04);
        legPivot.add(lace);
      }
    } else if (config.shoes === 'boots') {
      const bootShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.084, 0.088, 0.165, 16),
        shoeMat,
      );
      bootShaft.position.set(0, -0.37, 0);
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.084, 0.015, 8, 16),
        clayMat(shadeHex(config.shoeColor || '#3A2B2B', -0.08).getHex(), 0.45),
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, -0.288, 0);
      legPivot.add(bootShaft, collar);
    } else if (config.shoes === 'mary_janes') {
      const collarRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.012, 8, 18),
        shoeMat,
      );
      collarRim.rotation.x = Math.PI / 2;
      collarRim.position.set(0, -0.41, 0.005);
      const strap = new THREE.Mesh(
        new RoundedBoxGeometry(0.148, 0.02, 0.03, 2, 0.008),
        clayMat(shadeHex(config.shoeColor || '#3A2B2B', 0.08).getHex(), 0.35),
      );
      strap.position.set(0, -0.415, 0.032);
      legPivot.add(collarRim, strap);
    } else if (config.shoes === 'loafers') {
      const collarRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.012, 8, 18),
        shoeMat,
      );
      collarRim.rotation.x = Math.PI / 2;
      collarRim.position.set(0, -0.41, 0.005);
      const saddle = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.02, 0.052, 2, 0.008),
        clayMat(shadeHex(config.shoeColor || '#D8B894', -0.14).getHex(), 0.4),
      );
      saddle.position.set(0, -0.412, 0.054);
      legPivot.add(collarRim, saddle);
    }

    return legPivot;
  };

  const leftLeg = makeLeg(-0.125);
  const rightLeg = makeLeg(0.125);
  bodyPivot.add(leftLeg, rightLeg);

  // ========== TORSO & SCULPTED CLOTHING ==========
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.77, 0);
  bodyPivot.add(torsoGroup);

  const baseTorsoMat =
    config.top === 'sailor_blouse' || config.top === 'cardigan_vest'
      ? topTrimMat
      : topMat;

  const isHoodie = config.top === 'hoodie';
  const torsoMesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      createTorsoProfilePoints(isHoodie ? 0.024 : 0, isHoodie ? -0.215 : -0.195, 0.21),
      28,
    ),
    baseTorsoMat,
  );
  torsoGroup.add(torsoMesh);

  if (config.top === 'cardigan_vest') {
    const vestProfile = [
      new THREE.Vector2(0.232, -0.165),
      new THREE.Vector2(0.234, -0.13),
      new THREE.Vector2(0.222, -0.05),
      new THREE.Vector2(0.212, 0.05),
      new THREE.Vector2(0.21, 0.13),
      new THREE.Vector2(0.184, 0.172),
    ];
    const vestMesh = new THREE.Mesh(
      new THREE.LatheGeometry(vestProfile, 26, 0.33, Math.PI * 2 - 0.66),
      topMat,
    );
    torsoGroup.add(vestMesh);

    // Clean vertical knit placket trims framing the front opening
    [-1, 1].forEach((s) => {
      const placket = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.29, 6, 10),
        topDarkMat,
      );
      placket.position.set(s * 0.068, -0.015, 0.205);
      placket.rotation.x = 0.06;
      torsoGroup.add(placket);

      const collar = new THREE.Mesh(
        new RoundedBoxGeometry(0.082, 0.048, 0.04, 2, 0.015),
        topTrimMat,
      );
      collar.position.set(s * 0.06, 0.198, 0.114);
      collar.rotation.z = -s * 0.34;
      collar.rotation.y = s * 0.32;
      torsoGroup.add(collar);
    });

    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.234, 0.238, 0.044, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.17, 0);
    torsoGroup.add(ribHem);

    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.016, 10),
        clayMat('#5C3E2B', 0.4),
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.08 - i * 0.082, 0.208 + i * 0.008);
      torsoGroup.add(btn);
    }

    [-1, 1].forEach((s) => {
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.075, 0.066, 0.022, 2, 0.008),
        topLightMat,
      );
      pocket.position.set(s * 0.122, -0.065, 0.198);
      pocket.rotation.y = s * 0.48;
      torsoGroup.add(pocket);
    });
  } else if (config.top === 'sailor_blouse') {
    const backFlap = new THREE.Mesh(
      new RoundedBoxGeometry(0.36, 0.11, 0.26, 3, 0.03),
      topMat,
    );
    backFlap.position.set(0, 0.145, -0.045);
    backFlap.rotation.x = -0.14;
    torsoGroup.add(backFlap);

    const stripeTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.368, 0.02, 0.268, 2, 0.008),
      topTrimMat,
    );
    stripeTrim.position.set(0, 0.105, -0.048);
    stripeTrim.rotation.x = -0.14;
    torsoGroup.add(stripeTrim);

    const bowMat = clayMat('#E85D68', 0.45);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), bowMat);
    knot.position.set(0, 0.135, 0.198);
    torsoGroup.add(knot);
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(
        new RoundedBoxGeometry(0.07, 0.044, 0.025, 2, 0.014),
        bowMat,
      );
      wing.position.set(s * 0.05, 0.14, 0.192);
      wing.rotation.z = s * 0.25;
      wing.rotation.y = -s * 0.22;
      const tail = new THREE.Mesh(
        new RoundedBoxGeometry(0.028, 0.08, 0.016, 2, 0.007),
        bowMat,
      );
      tail.position.set(s * 0.028, 0.088, 0.198);
      tail.rotation.z = s * 0.22;
      torsoGroup.add(wing, tail);
    });
  } else if (config.top === 'hoodie') {
    // Plush Oversized Hoodie Collar + Large Sculpted Draped Back Hood
    const hoodInnerMat = clayMat(shadeHex(config.topColor, -0.18).getHex(), 0.78);

    const cowlCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.172, 0.056, 12, 26),
      topMat,
    );
    cowlCollar.rotation.x = Math.PI / 2 + 0.24;
    cowlCollar.position.set(0, 0.192, -0.025);
    torsoGroup.add(cowlCollar);

    // Large draped hood pouch behind shoulders & neck
    const backHoodGroup = new THREE.Group();
    backHoodGroup.position.set(0, 0.135, -0.175);

    const hoodOuterShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 18, 16),
      topMat,
    );
    hoodOuterShell.scale.set(1.12, 0.72, 0.88);
    hoodOuterShell.rotation.x = -0.42;
    backHoodGroup.add(hoodOuterShell);

    const hoodCowlLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.044, 10, 22),
      topLightMat,
    );
    hoodCowlLip.rotation.x = Math.PI / 2 - 0.52;
    hoodCowlLip.position.set(0, 0.068, -0.015);
    backHoodGroup.add(hoodCowlLip);

    const hoodInnerPocket = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 14, 12),
      hoodInnerMat,
    );
    hoodInnerPocket.scale.set(1.02, 0.45, 0.78);
    hoodInnerPocket.rotation.x = -0.48;
    hoodInnerPocket.position.set(0, 0.055, -0.02);
    backHoodGroup.add(hoodInnerPocket);

    [-1, 1].forEach((side) => {
      const shoulderFold = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.054, 0.11, 8, 12),
        topDarkMat,
      );
      shoulderFold.position.set(side * 0.13, 0.005, 0.045);
      shoulderFold.rotation.z = side * 0.55;
      shoulderFold.rotation.x = 0.38;
      backHoodGroup.add(shoulderFold);
    });
    torsoGroup.add(backHoodGroup);

    // Wide Tapered Ribbed Waistband
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.252, 0.244, 0.052, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.186, 0);
    torsoGroup.add(ribHem);

    // Detailed Kangaroo Front Pocket + Angled Side Entry Shadow Recesses
    const pocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.27, 0.12, 0.055, 3, 0.022),
      topLightMat,
    );
    pocket.position.set(0, -0.072, 0.224);
    const pocketTopTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.215, 0.018, 0.058, 2, 0.006),
      topDarkMat,
    );
    pocketTopTrim.position.set(0, -0.014, 0.226);
    torsoGroup.add(pocket, pocketTopTrim);

    [-1, 1].forEach((s) => {
      const sideSlit = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.092, 0.045, 2, 0.008),
        topDarkMat,
      );
      sideSlit.position.set(s * 0.13, -0.075, 0.218);
      sideSlit.rotation.z = s * 0.24;
      sideSlit.rotation.y = s * 0.35;
      torsoGroup.add(sideSlit);
    });

    // Metal Collar Eyelets & Curved Drawstrings with Aglet Tips
    const eyeletMat = clayMat('#D8CFC2', 0.35, 0.3);
    [-1, 1].forEach((s) => {
      const eyelet = new THREE.Mesh(
        new THREE.TorusGeometry(0.014, 0.0045, 6, 12),
        eyeletMat,
      );
      eyelet.position.set(s * 0.054, 0.154, 0.214);
      eyelet.rotation.y = s * 0.22;

      const cord = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.01, 0.105, 6, 8),
        topTrimMat,
      );
      cord.position.set(s * 0.058, 0.095, 0.226);
      cord.rotation.z = s * 0.06;
      cord.rotation.x = -0.14;

      const aglet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.009, 0.024, 8),
        eyeletMat,
      );
      aglet.position.set(s * 0.062, 0.036, 0.234);
      aglet.rotation.z = s * 0.06;
      torsoGroup.add(eyelet, cord, aglet);
    });
  } else if (config.top === 'knit_sweater') {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.125, 0.042, 10, 22),
      topTrimMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.205, 0);
    torsoGroup.add(collar);

    const chestBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.206, 0.21, 0.044, 24),
      topLightMat,
    );
    chestBand.position.set(0, 0.045, 0);
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.232, 0.236, 0.044, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.17, 0);
    torsoGroup.add(chestBand, ribHem);
  } else if (config.top === 'sundress') {
    const chestSkin = new THREE.Mesh(
      new THREE.LatheGeometry(createTorsoProfilePoints(0.004, 0.11, 0.215), 24),
      skinMat,
    );
    torsoGroup.add(chestSkin);

    [-1, 1].forEach((s) => {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.018, 8, 16, Math.PI),
        topMat,
      );
      strap.rotation.y = Math.PI / 2;
      strap.position.set(s * 0.115, 0.165, 0);
      torsoGroup.add(strap);
    });

    const neckTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.195, 0.018, 8, 24),
      topTrimMat,
    );
    neckTrim.rotation.x = Math.PI / 2;
    neckTrim.position.set(0, 0.115, 0);
    const waistSash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.226, 0.044, 24),
      topTrimMat,
    );
    waistSash.position.set(0, -0.09, 0);
    torsoGroup.add(neckTrim, waistSash);
  }

  // Bottoms on Torso (clean radial hierarchy so skirts & trousers never clip through tops)
  if (config.bottom === 'pleated_skirt' || config.bottom === 'midi_skirt') {
    const isMidi = config.bottom === 'midi_skirt';
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.214, 0.22, 0.048, 26),
      bottomDarkMat,
    );
    waistband.position.set(0, -0.158, 0);
    torsoGroup.add(waistband);

    const skirtGeo = createPleatedSkirtGeometry(
      0.216,
      isMidi ? 0.325 : 0.285,
      isMidi ? 0.33 : 0.23,
      isMidi ? 12 : 16,
      isMidi ? 0.011 : 0.016,
    );
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, isMidi ? -0.34 : -0.288, 0);
    torsoGroup.add(skirtMesh);

    const hemRing = new THREE.Mesh(
      new THREE.TorusGeometry(isMidi ? 0.322 : 0.282, 0.012, 8, 32),
      bottomLightMat,
    );
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, isMidi ? -0.49 : -0.388, 0);
    torsoGroup.add(hemRing);
  } else {
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.224, 0.078, 26),
      bottomDarkMat,
    );
    waist.position.set(0, -0.206, 0);
    torsoGroup.add(waist);

    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 0.016, 10),
      clayMat('#E8C476', 0.35),
    );
    button.rotation.x = Math.PI / 2;
    button.position.set(0, -0.205, 0.224);
    torsoGroup.add(button);
  }

  // ========== SEAMLESS ARTICULATED ARMS + REAL HANDHELD GRIP ==========
  const isShortSleeve = config.top === 'sailor_blouse';
  const isSleeveless = config.top === 'sundress';
  const handheld = config.handheld && config.handheld !== 'none' ? config.handheld : null;
  const holdPose: HoldPose = !handheld
    ? 'none'
    : handheld === 'tote_bag'
      ? 'carry_bag'
      : handheld === 'mini_umbrella'
        ? 'carry_umbrella'
        : 'carry_front';

  const makeArm = (side: -1 | 1) => {
    // Embedded flush inside the sculpted shoulder slope so arms connect organically to torso
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * (isHoodie ? 0.204 : 0.184), 0.896, 0);
    shoulderPivot.rotation.z = side * (isHoodie ? 0.28 : 0.26);

    const upperMat = isSleeveless ? skinMat : isShortSleeve ? topTrimMat : topMat;
    const upperR = isHoodie ? 0.06 : isShortSleeve ? 0.048 : 0.052;
    const midR = isHoodie ? 0.053 : isShortSleeve ? 0.043 : 0.046;
    const wristR = isHoodie ? 0.049 : isShortSleeve ? 0.04 : 0.042;

    if (isShortSleeve) {
      // Short puff sleeve cap over continuous skin upper arm
      const sleeveCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 14, 12),
        topTrimMat,
      );
      const sleeveTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.062, 0.118, 16),
        topTrimMat,
      );
      sleeveTube.position.y = -0.059;
      const sleeveCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.061, 0.011, 8, 16),
        topMat,
      );
      sleeveCuff.rotation.x = Math.PI / 2;
      sleeveCuff.position.y = -0.118;
      shoulderPivot.add(sleeveCap, sleeveTube, sleeveCuff);

      const innerSkinUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, midR, 0.148, 16),
        skinMat,
      );
      innerSkinUpper.position.y = -0.074;
      shoulderPivot.add(innerSkinUpper);
    } else {
      const shoulderJoint = new THREE.Mesh(
        new THREE.SphereGeometry(upperR, 14, 12),
        upperMat,
      );
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(upperR, midR, 0.148, 16),
        upperMat,
      );
      upperArm.position.y = -0.074;
      shoulderPivot.add(shoulderJoint, upperArm);
    }

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.148, 0);
    elbowPivot.rotation.x = -0.1;
    elbowPivot.rotation.z = side * 0.03;
    shoulderPivot.add(elbowPivot);

    const forearmMat = isSleeveless || isShortSleeve ? skinMat : topMat;
    // Exact radius match (midR) between upperArm, elbowJoint, and forearm eliminates ring seams!
    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(midR, 14, 12),
      forearmMat,
    );
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(midR, wristR, 0.128, 16),
      forearmMat,
    );
    forearm.position.y = -0.064;
    elbowPivot.add(elbowJoint, forearm);

    if (!isSleeveless && !isShortSleeve) {
      const cuffMat = config.top === 'cardigan_vest' ? topTrimMat : topDarkMat;
      const wristCuff = new THREE.Mesh(
        new THREE.TorusGeometry(wristR + 0.005, 0.012, 8, 16),
        cuffMat,
      );
      wristCuff.rotation.x = Math.PI / 2;
      wristCuff.position.y = -0.122;
      const cuffInner = new THREE.Mesh(
        new THREE.CylinderGeometry(wristR + 0.002, wristR + 0.004, 0.024, 14),
        cuffMat,
      );
      cuffInner.position.y = -0.118;
      elbowPivot.add(wristCuff, cuffInner);
    }

    const wristBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(wristR * 0.78, 0.032, 0.036, 12),
      skinMat,
    );
    wristBridge.position.y = -0.136;
    elbowPivot.add(wristBridge);

    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.158, 0);
    elbowPivot.add(handGroup);

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), skinMat);
    palm.scale.set(0.88, 1.05, 0.85);
    handGroup.add(palm);

    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.015, 0.024, 6, 8),
      skinMat,
    );
    thumb.position.set(-side * 0.03, 0.006, 0.03);
    thumb.rotation.z = side * 0.52;
    thumb.rotation.x = -0.45;
    handGroup.add(thumb);

    if (side === 1 && handheld) {
      const curlFingers = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.019, 0.044, 6, 10),
        skinMat,
      );
      curlFingers.rotation.z = Math.PI / 2;
      curlFingers.position.set(-0.016, -0.016, 0.034);
      handGroup.add(curlFingers);
    }

    return {shoulderPivot, elbowPivot, handGroup};
  };

  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);
  const leftArm = leftArmRig.shoulderPivot;
  const rightArm = rightArmRig.shoulderPivot;
  const leftElbow = leftArmRig.elbowPivot;
  const rightElbow = rightArmRig.elbowPivot;

  if (handheld) {
    const hColor = config.handheldColor || '#E8B84B';
    const handAnchor = new THREE.Group();

    if (holdPose === 'carry_umbrella') {
      rightArm.rotation.x = -0.18;
      rightArm.rotation.z = 0.42;
      rightElbow.rotation.x = -0.82;
      rightElbow.rotation.z = 0.06;
      handAnchor.rotation.x = 1.0;
      handAnchor.rotation.z = -0.48;
      handAnchor.position.set(0.025, 0.0, 0.02);
    } else if (holdPose === 'carry_front') {
      rightArm.rotation.x = -0.22;
      rightArm.rotation.z = 0.26;
      rightElbow.rotation.x = -0.76;
      rightElbow.rotation.z = -0.1;
      handAnchor.rotation.x = 0.98;
      handAnchor.rotation.z = -0.16;
      handAnchor.position.set(0.0, -0.01, 0.02);
    } else {
      rightArm.rotation.x = -0.05;
      rightArm.rotation.z = 0.28;
      rightElbow.rotation.x = -0.16;
      handAnchor.rotation.x = 0.21;
      handAnchor.rotation.z = -0.25;
      handAnchor.position.set(0.018, -0.015, 0.0);
    }

    if (handheld === 'milk_tea') {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.058, 0.2, 14),
        clayMat(hColor, 0.35),
      );
      cup.position.set(0, 0.02, 0.03);
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.082, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        glossyClayMat('#FFF8F0', 0.2),
      );
      lid.position.set(0, 0.118, 0.03);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8),
        clayMat('#E86F82', 0.4),
      );
      straw.position.set(0.016, 0.19, 0.03);
      straw.rotation.z = -0.15;
      handAnchor.add(cup, lid, straw);
    } else if (handheld === 'plush_bear') {
      // Realistic, plump, adorable stuffed teddy bear (~1.35x bigger!)
      const bearMat = clayMat(hColor, 0.85);
      const creamMat = clayMat('#F7E6D0', 0.78);
      const noseMat = glossyClayMat('#2A1D18', 0.18);

      const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 14), bearMat);
      bearBody.scale.set(0.95, 1.15, 0.85);
      bearBody.position.set(0, 0.05, 0.04);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 12), creamMat);
      belly.scale.set(0.9, 1.05, 0.5);
      belly.position.set(0, 0.045, 0.105);

      const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.102, 14, 14), bearMat);
      bearHead.scale.set(1.05, 0.96, 0.96);
      bearHead.position.set(0, 0.215, 0.05);

      // Ears + cream inner ears
      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), bearMat);
        ear.position.set(s * 0.082, 0.295, 0.045);
        const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), creamMat);
        innerEar.scale.set(1, 1, 0.5);
        innerEar.position.set(s * 0.082, 0.295, 0.072);
        // Eyes
        const bEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), noseMat);
        bEye.position.set(s * 0.038, 0.23, 0.14);
        // Stubby plush arms & seated legs
        const bArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.05, 6, 10), bearMat);
        bArm.position.set(s * 0.105, 0.09, 0.06);
        bArm.rotation.z = s * 0.55;
        bArm.rotation.x = -0.3;
        const bLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.045, 6, 10), bearMat);
        bLeg.position.set(s * 0.068, -0.05, 0.095);
        bLeg.rotation.x = -1.15;
        bLeg.rotation.z = s * 0.25;
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), creamMat);
        paw.scale.set(1, 1, 0.5);
        paw.position.set(s * 0.078, -0.062, 0.138);
        handAnchor.add(ear, innerEar, bEye, bArm, bLeg, paw);
      });

      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), creamMat);
      snout.scale.set(1.1, 0.85, 0.85);
      snout.position.set(0, 0.195, 0.135);
      const bNose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), noseMat);
      bNose.scale.set(1.2, 0.8, 0.7);
      bNose.position.set(0, 0.205, 0.168);

      const bow = new THREE.Mesh(
        new RoundedBoxGeometry(0.075, 0.028, 0.022, 2, 0.01),
        clayMat('#E85D68', 0.5),
      );
      bow.position.set(0, 0.135, 0.125);

      handAnchor.add(bearBody, belly, bearHead, snout, bNose, bow);
    } else if (handheld === 'flower_bouquet') {
      // Larger, lush sunflower bouquet (~1.45x bigger with 3 detailed sunflowers + leaves + bow!)
      const wrap = new THREE.Mesh(
        new THREE.ConeGeometry(0.145, 0.31, 14, 1, true),
        clayMat('#E9D5B5', 0.82),
      );
      wrap.rotation.x = Math.PI;
      wrap.position.set(0, 0.055, 0.028);

      const tissueRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.135, 0.022, 8, 18),
        clayMat('#FFF9F0', 0.78),
      );
      tissueRim.rotation.x = Math.PI / 2;
      tissueRim.position.set(0, 0.2, 0.028);

      const ribbonTie = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.015, 8, 14),
        clayMat('#E86F82', 0.5),
      );
      ribbonTie.rotation.x = Math.PI / 2;
      ribbonTie.position.set(0, -0.015, 0.028);
      handAnchor.add(wrap, tissueRim, ribbonTie);

      const leafMat = clayMat('#5E9E69', 0.65);
      [-1, 0, 1].forEach((s) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), leafMat);
        leaf.scale.set(0.75, 1.4, 0.3);
        leaf.position.set(s * 0.085, 0.215, -0.01);
        leaf.rotation.z = -s * 0.4;
        handAnchor.add(leaf);
      });

      const buildSunflower = (fx: number, fy: number, fz: number, scale: number) => {
        const fGrp = new THREE.Group();
        fGrp.position.set(fx, fy, fz);
        fGrp.scale.setScalar(scale);
        fGrp.rotation.x = 0.28;
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 12, 10),
          clayMat('#5E3A22', 0.72),
        );
        center.scale.set(1, 1, 0.5);
        fGrp.add(center);
        const petalMat = clayMat(hColor, 0.58);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), petalMat);
          petal.scale.set(0.7, 1.45, 0.4);
          petal.position.set(Math.cos(a) * 0.072, Math.sin(a) * 0.072, -0.005);
          petal.rotation.z = a - Math.PI / 2;
          fGrp.add(petal);
        }
        handAnchor.add(fGrp);
      };

      buildSunflower(0, 0.27, 0.04, 1.15);
      buildSunflower(-0.082, 0.225, 0.045, 0.85);
      buildSunflower(0.082, 0.225, 0.045, 0.85);
    } else if (handheld === 'tote_bag') {
      // Larger realistic canvas tote bag hanging directly from gripped handles!
      const strapMat = clayMat('#C59F76', 0.75);
      [-0.038, 0.038].forEach((sx) => {
        const strap = new THREE.Mesh(
          new THREE.TorusGeometry(0.082, 0.013, 8, 18, Math.PI),
          strapMat,
        );
        strap.rotation.y = Math.PI / 2;
        strap.position.set(0.02 + sx, -0.078, 0.01);
        handAnchor.add(strap);
      });
      const bag = new THREE.Mesh(
        new RoundedBoxGeometry(0.115, 0.255, 0.22, 3, 0.025),
        clayMat(hColor, 0.78),
      );
      bag.position.set(0.02, -0.205, 0.01);
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.018, 0.125, 0.13, 2, 0.012),
        clayMat(shadeHex(hColor, -0.08).getHex(), 0.78),
      );
      pocket.position.set(0.078, -0.215, 0.01);
      const badge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12),
        clayMat('#E86F82', 0.5),
      );
      badge.rotation.z = Math.PI / 2;
      badge.position.set(0.088, -0.175, 0.04);
      handAnchor.add(bag, pocket, badge);
    } else if (handheld === 'mini_umbrella') {
      const stickMat = clayMat('#7D5333', 0.55);
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 0.92, 8),
        stickMat,
      );
      stick.position.set(0, 0.38, 0.02);

      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.013, 8, 14, Math.PI),
        stickMat,
      );
      hook.rotation.z = Math.PI;
      hook.position.set(0.032, -0.08, 0.02);

      const canopyPts = [
        new THREE.Vector2(0.005, 0.17),
        new THREE.Vector2(0.18, 0.145),
        new THREE.Vector2(0.36, 0.08),
        new THREE.Vector2(0.49, 0.0),
      ];
      const canopyMat = clayMat(hColor, 0.52);
      canopyMat.side = THREE.DoubleSide;
      const canopy = new THREE.Mesh(new THREE.LatheGeometry(canopyPts, 16), canopyMat);
      canopy.position.set(0, 0.74, 0.02);

      const edgeTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.488, 0.014, 8, 24),
        clayMat('#FFFDF7', 0.6),
      );
      edgeTrim.rotation.x = Math.PI / 2;
      edgeTrim.position.set(0, 0.74, 0.02);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.085, 8),
        stickMat,
      );
      tip.position.set(0, 0.94, 0.02);

      handAnchor.add(stick, hook, canopy, edgeTrim, tip);
    }

    rightArmRig.handGroup.add(handAnchor);
  }

  bodyPivot.add(leftArm, rightArm);

  // ========== SCULPTED CHIBI-SIMS HEAD & EXPRESSIVE FACE ==========
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.02, 0);
  bodyPivot.add(headPivot);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.082, 0.12, 14),
    skinMat,
  );
  neck.position.y = -0.01;
  headPivot.add(neck);

  // Sculpted head mesh (already centered at HEAD_CY = 0.30)
  const headMesh = new THREE.Mesh(createSculptedHeadGeometry(), skinMat);
  headPivot.add(headMesh);

  // Detailed Ears with soft inner ear hollows
  const innerEarMat = clayMat(shadeHex(config.skinTone, -0.11).getHex(), 0.72);
  [-1, 1].forEach((side) => {
    const earGrp = new THREE.Group();
    earGrp.position.set(side * 0.305, 0.27, -0.012);
    earGrp.rotation.y = -side * 0.22;

    const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 12), skinMat);
    earOuter.scale.set(0.6, 1.0, 0.72);
    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), innerEarMat);
    earInner.scale.set(0.42, 0.72, 0.45);
    earInner.position.set(side * 0.012, 0, 0.008);
    earGrp.add(earOuter, earInner);
    headPivot.add(earGrp);
  });

  // Soft Rosy Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.044, 12, 10);
  const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
  cheekL.scale.set(1.26, 0.68, 0.35);
  cheekL.position.set(-0.172, 0.195, 0.214);
  cheekL.rotation.y = -0.32;
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.172;
  cheekR.rotation.y = 0.32;
  headPivot.add(cheekL, cheekR);

  // Expressive Eyes + Sleek Curved Upper Lash Liners + Eyelids
  const eyelids: THREE.Mesh[] = [];
  const makeEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.112, 0.258, 0.246);
    eyeGroup.rotation.y = side * 0.18;

    if (config.eyeStyle === 'cozy') {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(0.042, 0.01, 8, 14, Math.PI * 0.85),
        pupilMat,
      );
      arc.rotation.z = 0.24;
      arc.position.set(0, -0.01, 0.018);
      eyeGroup.add(arc);
    } else {
      const isAlmond = config.eyeStyle === 'almond';
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 14), eyeWhiteMat);
      sclera.scale.set(isAlmond ? 1.04 : 0.96, isAlmond ? 0.92 : 1.08, 0.42);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.041, 14, 14), irisMat);
      iris.scale.set(0.96, isAlmond ? 0.92 : 1.05, 0.42);
      iris.position.z = 0.015;
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 12), pupilMat);
      pupil.scale.set(1, 1, 0.42);
      pupil.position.z = 0.025;
      eyeGroup.add(pupil);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 8, 8),
        new THREE.MeshBasicMaterial({color: '#FFFFFF'}),
      );
      glint.position.set(-0.013, 0.017, 0.034);
      eyeGroup.add(glint);

      if (config.eyeStyle === 'starry') {
        const subGlint = new THREE.Mesh(
          new THREE.SphereGeometry(0.008, 8, 8),
          new THREE.MeshBasicMaterial({color: '#FFFFFF'}),
        );
        subGlint.position.set(0.014, -0.014, 0.033);
        eyeGroup.add(subGlint);
      }

      const lash = new THREE.Mesh(
        new THREE.TorusGeometry(0.056, 0.0105, 8, 16, Math.PI * 0.86),
        pupilMat,
      );
      lash.rotation.z = 0.22 + (isAlmond ? -side * 0.14 : 0);
      lash.position.set(0, 0.012, 0.017);
      eyeGroup.add(lash);

      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), skinMat);
      lid.scale.set(1.04, 0.08, 0.52);
      lid.position.set(0, 0.044, 0.008);
      eyeGroup.add(lid);
      eyelids.push(lid);
    }

    return eyeGroup;
  };
  headPivot.add(makeEye(-1), makeEye(1));

  // Fine Curved Sculpted Eyebrows (cleanly seated on sculpted forehead above eyes & glasses)
  const eyebrowMat = clayMat(shadeHex(config.hairColor, -0.05).getHex(), 0.52);
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.0072, 6, 12, Math.PI * 0.42),
      eyebrowMat,
    );
    const browY =
      config.expression === 'grin'
        ? 0.314
        : config.expression === 'calm'
          ? 0.304
          : 0.308;
    const tilt =
      config.expression === 'grin'
        ? side * 0.06
        : config.expression === 'cat'
          ? -side * 0.12
          : config.expression === 'calm'
            ? side * 0.04
            : -side * 0.04;
    brow.position.set(side * 0.112, browY, 0.256);
    brow.rotation.y = side * 0.18;
    brow.rotation.z = Math.PI * 0.29 + tilt;
    headPivot.add(brow);
  });

  // Mouth Expressions ('smile' | 'grin' | 'cat' | 'calm') seated cleanly on sculpted chin plane
  const mouthLineMat = clayMat('#5B342E', 0.48);
  if (config.expression === 'grin') {
    const mouthCavity = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.027, 0.018, 12, 1, false, 0, Math.PI),
      clayMat('#9C3D46', 0.5),
    );
    mouthCavity.rotation.x = Math.PI / 2;
    mouthCavity.rotation.y = Math.PI / 2;
    mouthCavity.scale.set(0.95, 1, 0.85);
    mouthCavity.position.set(0, 0.155, 0.236);
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.019, 10, 8),
      clayMat('#F07F89', 0.45),
    );
    tongue.scale.set(1.1, 0.55, 0.6);
    tongue.position.set(0, 0.141, 0.24);
    headPivot.add(mouthCavity, tongue);
  } else if (config.expression === 'cat') {
    [-1, 1].forEach((s) => {
      const catArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.018, 0.0068, 6, 12, Math.PI),
        mouthLineMat,
      );
      catArc.rotation.z = Math.PI;
      catArc.position.set(s * 0.018, 0.155, 0.238);
      headPivot.add(catArc);
    });
  } else if (config.expression === 'calm') {
    const calmMouth = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0068, 0.028, 6, 8),
      mouthLineMat,
    );
    calmMouth.rotation.z = Math.PI / 2;
    calmMouth.position.set(0, 0.153, 0.239);
    headPivot.add(calmMouth);
  } else {
    const smileMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.0082, 8, 14, Math.PI),
      mouthLineMat,
    );
    smileMesh.rotation.z = Math.PI;
    smileMesh.position.set(0, 0.156, 0.238);
    headPivot.add(smileMesh);
  }

  // ========== SCULPTED SMOOTH CLAY HAIR + HAIRLINE CAP ==========
  const isMaleShortHair =
    config.hairBack === 'short_crop' ||
    config.hairBack === 'boy_1' ||
    config.hairBack === 'boy_2' ||
    config.hairBack === 'boy_3';
  const hairlineCap = new THREE.Mesh(
    createHairlineCapGeometry(isMaleShortHair),
    hairMat,
  );
  headPivot.add(hairlineCap);

  const hairShell = new THREE.Mesh(
    createHairShellGeometry(config.hairBack, config.hairFront),
    hairMat,
  );
  headPivot.add(hairShell);

  const addBlade = (
    steps: {lat: number; lon: number; offset: number}[],
    radii: number[],
    widthScale = 2.45,
    depthScale = 0.52,
    tubularSegs = 20,
  ) => {
    const arc = sampleSphericalArc(steps);
    headPivot.add(
      new THREE.Mesh(
        createHairBladeGeometry(arc, radii, widthScale, depthScale, tubularSegs, 16),
        hairMat,
      ),
    );
  };

  const addPointBlade = (
    pts: [number, number, number][],
    radii: number[],
    widthScale = 1.75,
    depthScale = 0.58,
    tubularSegs = 14,
  ) => {
    headPivot.add(
      new THREE.Mesh(
        createHairBladeGeometry(pts, radii, widthScale, depthScale, tubularSegs, 14),
        hairMat,
      ),
    );
  };

  if (config.hairBack === 'boy_1') {
    const leftSweeps: {lons: [number, number, number]; latEnd: number; r: number}[] = [
      {lons: [18, 2, -10], latEnd: 72, r: 0.048},
      {lons: [14, -14, -28], latEnd: 74, r: 0.048},
      {lons: [4, -30, -48], latEnd: 73, r: 0.044},
    ];
    leftSweeps.forEach((b) => {
      addBlade(
        [
          {lat: 16, lon: b.lons[0], offset: 0.032},
          {lat: 44, lon: b.lons[1], offset: 0.052},
          {lat: b.latEnd, lon: b.lons[2], offset: 0.028},
        ],
        [0.024, b.r, 0.017],
        2.45,
        0.54,
      );
    });
    const rightSweeps: {lons: [number, number, number]; latEnd: number; r: number}[] = [
      {lons: [22, 36, 44], latEnd: 70, r: 0.044},
      {lons: [30, 50, 58], latEnd: 75, r: 0.04},
    ];
    rightSweeps.forEach((b) => {
      addBlade(
        [
          {lat: 18, lon: b.lons[0], offset: 0.032},
          {lat: 46, lon: b.lons[1], offset: 0.05},
          {lat: b.latEnd, lon: b.lons[2], offset: 0.028},
        ],
        [0.022, b.r, 0.016],
        2.4,
        0.54,
      );
    });
    [-1, 1].forEach((side) => {
      addBlade(
        [
          {lat: 56, lon: side * 66, offset: 0.034},
          {lat: 74, lon: side * 68, offset: 0.036},
          {lat: 92, lon: side * 66, offset: 0.022},
        ],
        [0.026, 0.032, 0.013],
        1.75,
        0.52,
        14,
      );
    });
  } else if (config.hairBack === 'boy_2') {
    [-1, 1].forEach((side) => {
      addBlade(
        [
          {lat: 16, lon: -2 + side * 4, offset: 0.032},
          {lat: 38, lon: -2 + side * 24, offset: 0.053},
          {lat: 58, lon: side * 32, offset: 0.048},
          {lat: 73, lon: side * 18, offset: 0.028},
        ],
        [0.024, 0.048, 0.042, 0.016],
        2.4,
        0.54,
        20,
      );
      addBlade(
        [
          {lat: 20, lon: side * 14, offset: 0.032},
          {lat: 48, lon: side * 44, offset: 0.05},
          {lat: 72, lon: side * 58, offset: 0.04},
          {lat: 86, lon: side * 52, offset: 0.025},
        ],
        [0.022, 0.046, 0.036, 0.015],
        2.3,
        0.5,
        18,
      );
    });
  } else if (config.hairBack === 'boy_3') {
    const animeLayers: {lon0: number; lonMid: number; lonEnd: number; latEnd: number}[] = [
      {lon0: -12, lonMid: -34, lonEnd: -44, latEnd: 73},
      {lon0: -4, lonMid: -16, lonEnd: -20, latEnd: 74},
      {lon0: 2, lonMid: -2, lonEnd: -4, latEnd: 72},
      {lon0: 8, lonMid: 18, lonEnd: 22, latEnd: 74},
      {lon0: 14, lonMid: 34, lonEnd: 44, latEnd: 73},
    ];
    animeLayers.forEach((b) => {
      addBlade(
        [
          {lat: 14, lon: b.lon0, offset: 0.032},
          {lat: 44, lon: b.lonMid, offset: 0.05},
          {lat: b.latEnd, lon: b.lonEnd, offset: 0.028},
        ],
        [0.024, 0.046, 0.016],
        2.45,
        0.54,
      );
    });
    const pCrown = headSurfacePoint(4, 8, 0.045);
    addPointBlade(
      [
        pCrown,
        [pCrown[0] + 0.032, pCrown[1] + 0.064, pCrown[2] - 0.01],
        [pCrown[0] + 0.088, pCrown[1] + 0.076, pCrown[2] - 0.02],
      ],
      [0.018, 0.014, 0.005],
      1.4,
      0.68,
      12,
    );
  } else if (config.hairBack === 'short_crop') {
    const cropLayers: {lon0: number; lonEnd: number; latEnd: number}[] = [
      {lon0: -26, lonEnd: -38, latEnd: 70},
      {lon0: -12, lonEnd: -16, latEnd: 71},
      {lon0: 0, lonEnd: -2, latEnd: 70},
      {lon0: 12, lonEnd: 18, latEnd: 71},
      {lon0: 24, lonEnd: 36, latEnd: 70},
    ];
    cropLayers.forEach((b) => {
      addBlade(
        [
          {lat: 16, lon: b.lon0, offset: 0.034},
          {lat: 44, lon: (b.lon0 + b.lonEnd) * 0.55, offset: 0.05},
          {lat: b.latEnd, lon: b.lonEnd, offset: 0.028},
        ],
        [0.025, 0.048, 0.02],
        2.6,
        0.52,
      );
    });
  } else if (config.hairFront === 'curtain') {
    [-1, 1].forEach((side) => {
      addBlade(
        [
          {lat: 16, lon: side * 6, offset: 0.032},
          {lat: 44, lon: side * 30, offset: 0.05},
          {lat: 72, lon: side * 50, offset: 0.042},
          {lat: 92, lon: side * 56, offset: 0.026},
        ],
        [0.024, 0.05, 0.042, 0.016],
        2.45,
        0.52,
        20,
      );
    });
  } else if (config.hairFront === 'side_sweep') {
    [
      {lons: [-26, -2, 22] as [number, number, number], latEnd: 70},
      {lons: [-20, 14, 42] as [number, number, number], latEnd: 73},
    ].forEach((b) => {
      addBlade(
        [
          {lat: 18, lon: b.lons[0], offset: 0.032},
          {lat: 45, lon: b.lons[1], offset: 0.05},
          {lat: b.latEnd, lon: b.lons[2], offset: 0.028},
        ],
        [0.024, 0.048, 0.018],
        2.5,
        0.5,
      );
    });
  } else if (config.hairFront === 'neat_fringe') {
    [-32, -12, 8, 28].forEach((lon) => {
      addBlade(
        [
          {lat: 16, lon: lon * 0.7, offset: 0.034},
          {lat: 44, lon: lon * 0.92, offset: 0.049},
          {lat: 69, lon, offset: 0.028},
        ],
        [0.025, 0.047, 0.02],
        2.65,
        0.5,
      );
    });
  } else {
    [-30, -10, 10, 30].forEach((lon) => {
      addBlade(
        [
          {lat: 16, lon: lon * 0.72, offset: 0.034},
          {lat: 44, lon: lon * 0.92, offset: 0.049},
          {lat: 68, lon, offset: 0.028},
        ],
        [0.024, 0.047, 0.018],
        2.55,
        0.48,
      );
    });
  }

  // Smooth Unified Back Hair Styles (Sculpted Solid Clay Volumes)
  if (config.hairBack === 'long_wave') {
    const backCloak = new THREE.Mesh(createBackHairCloakGeometry('long_wave'), hairMat);
    headPivot.add(backCloak);

    [-1, 1].forEach((side) => {
      addPointBlade(
        [
          headSurfacePoint(68, side * 70, 0.03),
          [side * 0.308, 0.24, 0.055],
          [side * 0.295, 0.08, 0.045],
          [side * 0.268, -0.05, 0.025],
        ],
        [0.032, 0.04, 0.034, 0.015],
        1.65,
        0.68,
        16,
      );
    });
  } else if (config.hairBack === 'bob_cut') {
    const bobCloak = new THREE.Mesh(createBackHairCloakGeometry('bob_cut'), hairMat);
    headPivot.add(bobCloak);

    [-1, 1].forEach((side) => {
      addPointBlade(
        [
          headSurfacePoint(66, side * 72, 0.03),
          [side * 0.31, 0.22, 0.055],
          [side * 0.282, 0.08, 0.055],
        ],
        [0.032, 0.039, 0.016],
        1.6,
        0.66,
        14,
      );
    });
  } else if (config.hairBack === 'twin_tails') {
    [-1, 1].forEach((side) => {
      const rootPt = headSurfacePoint(78, side * 112, 0.034);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.054, 14, 12), hairMat);
      knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.058, 0.02, 10, 18),
        topMat,
      );
      tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
      tie.rotation.y = side * 0.95;
      tie.rotation.x = 0.22;
      headPivot.add(knot, tie);

      const mainTail = new THREE.Mesh(
        createTaperedStrandGeometry(
          [
            rootPt,
            [side * 0.42, 0.24, -0.14],
            [side * 0.39, 0.04, -0.15],
            [side * 0.42, -0.17, -0.12],
          ],
          [0.054, 0.088, 0.068, 0.02],
          1.22,
          0.92,
          22,
          16,
        ),
        hairMat,
      );
      headPivot.add(mainTail);
    });
  } else if (config.hairBack === 'ponytail') {
    const rootPt = headSurfacePoint(74, 180, 0.034);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), hairMat);
    knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.064, 0.021, 10, 18),
      topMat,
    );
    tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
    tie.rotation.x = -0.25;
    headPivot.add(knot, tie);

    const centerTail = new THREE.Mesh(
      createTaperedStrandGeometry(
        [
          rootPt,
          [0, 0.4, -0.38],
          [0, 0.34, -0.45],
          [0, 0.16, -0.46],
          [0, -0.05, -0.39],
        ],
        [0.056, 0.092, 0.106, 0.082, 0.024],
        1.26,
        0.88,
        24,
        16,
      ),
      hairMat,
    );
    headPivot.add(centerTail);
  } else if (config.hairBack === 'twin_buns') {
    [-1, 1].forEach((side) => {
      const pBun = headSurfacePoint(46, side * 102, 0.086);
      const bunBase = new THREE.Mesh(new THREE.SphereGeometry(0.128, 20, 16), hairMat);
      bunBase.scale.set(1.06, 0.92, 0.96);
      bunBase.position.set(pBun[0], pBun[1], pBun[2]);
      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.088, 0.019, 10, 18),
        topMat,
      );
      tie.position.set(pBun[0] * 0.92, pBun[1] - 0.042, pBun[2]);
      tie.rotation.x = Math.PI / 2;
      tie.rotation.y = side * 0.38;
      headPivot.add(bunBase, tie);
    });
  }

  // ========== SCULPTED HEADWEAR (SEATED SNUGLY ON FULLER HAIR VOLUME) ==========
  const headItemCol = config.headItemColor || config.topColor;
  if (config.headItem === 'beret') {
    const beretMat = clayMat(headItemCol, 0.62);
    const beretBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.275, 24, 16),
      beretMat,
    );
    beretBody.scale.set(1.06, 0.38, 1.04);
    beretBody.position.set(0.045, 0.622, -0.02);
    beretBody.rotation.z = -0.18;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, 0.055, 8),
      clayMat('#3A2B28'),
    );
    stem.position.set(0.07, 0.722, -0.02);
    stem.rotation.z = -0.18;
    headPivot.add(beretBody, stem);
  } else if (config.headItem === 'sunhat') {
    const hatMat = clayMat(headItemCol || '#EBD08E', 0.78);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.032, 24), hatMat);
    brim.position.set(0, 0.558, -0.015);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.295, 0.165, 20), hatMat);
    crown.position.set(0, 0.638, -0.015);
    const ribbon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.299, 0.303, 0.042, 20),
      clayMat('#E57A6B'),
    );
    ribbon.position.set(0, 0.588, -0.015);
    headPivot.add(brim, crown, ribbon);
  } else if (config.headItem === 'cat_ears') {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.02, 8, 24, Math.PI),
      clayMat('#3A2B28'),
    );
    band.position.set(0, 0.3, 0.01);
    headPivot.add(band);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.155, 12), clayMat('#FFF8F2'));
      ear.position.set(side * 0.21, 0.635, 0.03);
      ear.rotation.z = -side * 0.28;
      const inner = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.102, 10),
        clayMat(headItemCol || '#F497AC'),
      );
      inner.position.set(side * 0.21, 0.62, 0.062);
      inner.rotation.z = -side * 0.28;
      headPivot.add(ear, inner);
    });
  } else if (config.headItem === 'flower_crown') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.348, 0.023, 8, 24), clayMat('#5E9E69'));
    band.rotation.x = Math.PI / 2 - 0.16;
    band.position.set(0, 0.525, 0);
    headPivot.add(band);
    for (let i = 0; i < 6; i++) {
      const ang = -1.0 + i * 0.4;
      const fl = new THREE.Mesh(
        new THREE.SphereGeometry(0.046, 10, 10),
        clayMat(i % 2 === 0 ? headItemCol || '#F7A8B8' : '#FFE082'),
      );
      fl.position.set(Math.sin(ang) * 0.352, 0.545, Math.cos(ang) * 0.352);
      headPivot.add(fl);
    }
  } else if (config.headItem === 'ribbon_bow') {
    const bowMat = clayMat(headItemCol || '#6BAEE6', 0.52);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.021, 8, 24, Math.PI),
      bowMat,
    );
    band.position.set(0, 0.3, 0.01);
    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.074, 10, 10), bowMat);
    wingL.scale.set(1.2, 0.72, 0.52);
    wingL.position.set(0.145, 0.635, 0.08);
    wingL.rotation.z = -0.25;
    const wingR = wingL.clone();
    wingR.position.set(0.25, 0.59, 0.08);
    wingR.rotation.z = 0.25;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), bowMat);
    knot.position.set(0.195, 0.612, 0.102);
    headPivot.add(band, wingL, wingR, knot);
  }

  // ========== SCULPTED ACCESSORIES ==========
  const accCol = config.accessoryColor || '#4A3628';
  if (config.accessory === 'glasses' || config.accessory === 'sunglasses') {
    const isSun = config.accessory === 'sunglasses';
    const frameMat = glossyClayMat(accCol, 0.25);
    const lensMat = glossyClayMat('#1A1D24', 0.1);
    [-1, 1].forEach((side) => {
      const gx = side * 0.112;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.01, 8, 18), frameMat);
      rim.position.set(gx, 0.258, 0.304);
      rim.rotation.y = side * 0.12;
      headPivot.add(rim);
      if (isSun) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16), lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.rotation.z = -side * 0.12;
        lens.position.set(gx, 0.258, 0.3);
        headPivot.add(lens);
      }
      const pStart = new THREE.Vector3(side * 0.175, 0.262, 0.296);
      const pEnd = new THREE.Vector3(side * 0.302, 0.262, 0.015);
      const mid = pStart.clone().add(pEnd).multiplyScalar(0.5);
      const len = pStart.distanceTo(pEnd);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, len, 6),
        frameMat,
      );
      arm.position.copy(mid);
      arm.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        pEnd.clone().sub(pStart).normalize(),
      );
      headPivot.add(arm);
    });
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.013, 0.013, 2, 0.005), frameMat);
    bridge.position.set(0, 0.264, 0.308);
    headPivot.add(bridge);
  } else if (config.accessory === 'scarf') {
    const scarfMat = clayMat(accCol, 0.78);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.055, 10, 22), scarfMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.195, 0);
    const tail = new THREE.Mesh(
      new RoundedBoxGeometry(0.095, 0.21, 0.048, 2, 0.016),
      scarfMat,
    );
    tail.position.set(0.095, 0.085, 0.198);
    tail.rotation.z = -0.15;
    torsoGroup.add(ring, tail);
  } else if (config.accessory === 'pearl_necklace') {
    const pearlMat = glossyClayMat(accCol || '#FFFDF7', 0.15);
    for (let i = 0; i < 9; i++) {
      const ang = -1.25 + (i / 8) * 2.5;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), pearlMat);
      bead.position.set(Math.sin(ang) * 0.168, 0.185, Math.cos(ang) * 0.168);
      torsoGroup.add(bead);
    }
  }

  makeShadowed(root, true, true);
  shadowDisc.castShadow = false;

  return {
    root,
    bodyPivot,
    torsoGroup,
    headPivot,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftLeg,
    rightLeg,
    eyelids,
    shadowDisc,
    holdPose,
  };
}

export function updateAvatarRigAnimation(
  rig: AvatarRig,
  pose: AvatarPose,
  elapsed: number,
  isCozyEyes = false,
): void {
  if (rig.eyelids.length > 0) {
    const eyesClosed = pose === 'sleep' || isCozyEyes;
    const targetLidY = eyesClosed ? 1.15 : 0.08;
    const lidY = eyesClosed ? 0 : 0.044;
    rig.eyelids.forEach((lid) => {
      lid.scale.y = targetLidY;
      lid.position.y = lidY;
    });
  }

  if (rig.shadowDisc) {
    rig.shadowDisc.visible = pose !== 'sit' && pose !== 'sleep';
  }

  const hold = rig.holdPose || 'none';

  if (pose === 'walk') {
    const swing = Math.sin(elapsed * 12);
    rig.leftLeg.rotation.x = swing * 0.55;
    rig.rightLeg.rotation.x = -swing * 0.55;
    rig.leftArm.rotation.x = -swing * 0.45;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.2 + Math.max(0, -swing) * 0.15;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = -0.18 + swing * 0.08;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.82;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = -0.22 + swing * 0.12;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.76;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = -0.05 + swing * 0.22;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.16;
    } else {
      rig.rightArm.rotation.x = swing * 0.45;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.2 + Math.max(0, swing) * 0.15;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = 1.02;
    rig.bodyPivot.position.y = Math.abs(Math.cos(elapsed * 12)) * 0.075;
    rig.bodyPivot.rotation.x = 0.06;
    rig.headPivot.rotation.z = Math.sin(elapsed * 6) * 0.03;
  } else if (pose === 'sit') {
    rig.leftLeg.rotation.x = -1.36;
    rig.rightLeg.rotation.x = -1.36;
    rig.leftArm.rotation.x = -0.42;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.52;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = -0.18;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.82;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = -0.22;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.76;
    } else {
      rig.rightArm.rotation.x = -0.42;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.52;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = 1.02;
    rig.bodyPivot.position.y = -0.18;
    rig.bodyPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'sleep') {
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.08;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.08;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = 1.02;
    rig.bodyPivot.position.y = 0.36;
    rig.bodyPivot.rotation.x = -Math.PI / 2;
    rig.headPivot.rotation.z = 0;
  } else {
    // Calm static Idle: planted cleanly on the ground with zero jitter/idle sway
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = 0;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = 1.02;
    rig.headPivot.rotation.z = 0;

    rig.leftArm.rotation.x = 0;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.1;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = -0.18;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.82;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = -0.22;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.76;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = -0.05;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.16;
    } else {
      rig.rightArm.rotation.x = 0;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.1;
    }
  }
}
