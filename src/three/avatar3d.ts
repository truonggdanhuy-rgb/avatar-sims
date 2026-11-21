import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PET_CATALOG} from '../data/petCatalog';
import {AvatarConfig, AvatarPose, BbqFoodId, PetSpeciesId, ToolId} from '../types/game';
import {
  buildCharacterHair,
  createHairClayMaterial,
  headSurfacePoint,
} from './hairSystem';
import {clayMat, glossyClayMat, makeShadowed} from './materials';
import {buildPetModel, PetRig, updatePetAnimation} from './pets3d';

export type HoldPose =
  | 'none'
  | 'carry_front'
  | 'carry_bag'
  | 'carry_umbrella'
  | 'carry_net';

const HEAD_PIVOT_Y = 0.968;

const HAND_POSES: Record<HoldPose, {armX: number; armZ: number; elbowX: number; elbowZ: number}> = {
  none: {armX: 0, armZ: 0.36, elbowX: -0.12, elbowZ: -0.05},
  carry_umbrella: {armX: -0.46, armZ: 0.62, elbowX: -0.94, elbowZ: 0.18},
  carry_front: {armX: -0.42, armZ: 0.44, elbowX: -0.98, elbowZ: 0.08},
  carry_bag: {armX: -0.06, armZ: 0.48, elbowX: -0.14, elbowZ: 0.06},
  carry_net: {armX: -1.16, armZ: 0.24, elbowX: -1.24, elbowZ: -0.18},
};

export interface SkirtDeformPair {
  mesh: THREE.Mesh;
  standGeo: THREE.BufferGeometry;
  sitGeo: THREE.BufferGeometry;
}

export interface AvatarRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup?: THREE.Group;
  skirtPivot?: THREE.Group;
  skirtDeformMeshes?: SkirtDeformPair[];
  headPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow?: THREE.Group;
  rightElbow?: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee?: THREE.Group;
  rightKnee?: THREE.Group;
  eyelids: THREE.Mesh[];
  openEyeGroup?: THREE.Group;
  closedEyeGroup?: THREE.Group;
  skipNaturalBlink?: boolean;
  shadowDisc?: THREE.Mesh;
  holdPose?: HoldPose;
  toolType?: ToolId | null;
  rodBobber?: THREE.Object3D;
  rodLine?: THREE.Object3D;
  heldPetRig?: PetRig;
  headTopAbovePivot: number;
}

function shadeHex(hex: string, factor: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  const nextL = Math.min(0.92, Math.max(0.12, hsl.l + factor));
  c.setHSL(hsl.h, hsl.s, nextL);
  return c;
}

const _eyeTexCache = new Map<string, THREE.CanvasTexture>();
const _mouthTexCache = new Map<string, THREE.CanvasTexture>();

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 4;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function createChibiEyeTexture(
  eyeColor: string,
  style: AvatarConfig['eyeStyle'] | 'sleep_closed',
  side: -1 | 1,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const effectiveStyle: AvatarConfig['eyeStyle'] | 'sleep_closed' =
    style === 'wink' ? (side === 1 ? 'happy_arc' : 'bright') : style;
  const key = `chibi_eye_v3_${eyeColor}_${effectiveStyle}_${side}`;
  const cached = _eyeTexCache.get(key);
  if (cached) return cached;

  const w = 320;
  const h = 280;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.56;
  // side === -1 is viewer's left eye (inner corner toward +X / canvas right)
  const dir = side === -1 ? 1 : -1;

  if (effectiveStyle === 'sleep_closed' || effectiveStyle === 'happy_arc') {
    ctx.strokeStyle = '#241814';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (effectiveStyle === 'sleep_closed') {
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(cx - 88, cy - 4);
      ctx.quadraticCurveTo(cx, cy + 32, cx + 88, cy - 4);
      ctx.stroke();
    } else {
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(cx - 90, cy + 20);
      ctx.quadraticCurveTo(cx, cy - 44, cx + 90, cy + 20);
      ctx.stroke();
      // Cute outer lash flick
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 78, cy + 10);
      ctx.quadraticCurveTo(cx - dir * 94, cy + 4, cx - dir * 102, cy - 12);
      ctx.stroke();
    }
  } else if (effectiveStyle === 'joy_xd') {
    ctx.strokeStyle = '#1E1512';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 21;

    // Viewer left eye draws '>' pointing inward (+X), viewer right eye draws '<' pointing inward (-X)
    const tipX = cx + dir * 72;
    const tailX = cx - dir * 76;
    const armY = 56;
    ctx.beginPath();
    ctx.moveTo(tailX, cy - armY);
    ctx.quadraticCurveTo(cx + dir * 12, cy - armY * 0.32, tipX, cy);
    ctx.quadraticCurveTo(cx + dir * 12, cy + armY * 0.32, tailX, cy + armY);
    ctx.stroke();
  } else {
    // Rich expressive big chibi eyes: 'bright', 'gentle', 'sparkle', 'heroic', 'cool'
    const darkHex = `#${shadeHex(eyeColor, -0.34).getHexString()}`;
    const midHex = `#${new THREE.Color(eyeColor).getHexString()}`;
    const lightHex = `#${shadeHex(eyeColor, 0.26).getHexString()}`;
    const rimHex = `#${shadeHex(eyeColor, -0.42).getHexString()}`;
    const lashColor = effectiveStyle === 'gentle' ? '#362016' : '#1B1516';

    const traceEyeShape = () => {
      ctx.beginPath();
      if (effectiveStyle === 'cool') {
        const halfW = 104;
        const topY = cy - 36;
        const botY = cy + 52;
        ctx.moveTo(cx - halfW, topY + 6);
        ctx.quadraticCurveTo(cx, topY - 12, cx + halfW, topY + 6);
        ctx.bezierCurveTo(
          cx + halfW - 6,
          botY + 12,
          cx - halfW + 6,
          botY + 12,
          cx - halfW,
          topY + 6,
        );
      } else if (effectiveStyle === 'gentle') {
        // Warm, softly droopy-outer large oval chibi eye
        ctx.ellipse(cx, cy + 4, 102, 92, dir * -0.07, 0, Math.PI * 2);
      } else if (effectiveStyle === 'sparkle') {
        ctx.ellipse(cx, cy, 106, 98, 0, 0, Math.PI * 2);
      } else if (effectiveStyle === 'heroic') {
        // Bold rounded-almond chibi eye with crisp outer lift
        const rx = 104;
        const ry = 88;
        ctx.moveTo(cx - dir * rx, cy - 10);
        ctx.bezierCurveTo(
          cx - dir * (rx * 0.65),
          cy - ry * 1.15,
          cx + dir * (rx * 0.62),
          cy - ry * 1.06,
          cx + dir * rx,
          cy + 8,
        );
        ctx.bezierCurveTo(
          cx + dir * (rx * 0.65),
          cy + ry * 1.04,
          cx - dir * (rx * 0.58),
          cy + ry * 1.05,
          cx - dir * rx,
          cy - 10,
        );
      } else {
        // 'bright': classic big luminous Nendoroid-style rounded eye
        ctx.ellipse(cx, cy + 2, 104, 94, 0, 0, Math.PI * 2);
      }
      ctx.closePath();
    };

    // 1. Sclera + subtle soft top lid shade
    ctx.save();
    traceEyeShape();
    ctx.clip();

    ctx.fillStyle = '#FFFDFB';
    ctx.fillRect(0, 0, w, h);

    const lidShade = ctx.createLinearGradient(0, cy - 96, 0, cy - 16);
    lidShade.addColorStop(0, 'rgba(155, 145, 175, 0.30)');
    lidShade.addColorStop(1, 'rgba(255, 253, 251, 0)');
    ctx.fillStyle = lidShade;
    ctx.fillRect(0, cy - 104, w, 94);

    // 2. Large Soulful Iris & Pupil
    const irisRx =
      effectiveStyle === 'cool'
        ? 54
        : effectiveStyle === 'sparkle'
          ? 78
          : effectiveStyle === 'gentle'
            ? 74
            : 75;
    const irisRy =
      effectiveStyle === 'cool'
        ? 52
        : effectiveStyle === 'sparkle'
          ? 84
          : effectiveStyle === 'gentle'
            ? 80
            : 80;
    const irisCx =
      cx +
      dir *
        (effectiveStyle === 'heroic' ? 5 : effectiveStyle === 'gentle' ? 6 : 2);
    const irisCy =
      effectiveStyle === 'cool'
        ? cy + 12
        : effectiveStyle === 'gentle'
          ? cy + 8
          : cy + 5;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(irisCx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createLinearGradient(0, irisCy - irisRy, 0, irisCy + irisRy);
    grad.addColorStop(0.0, darkHex);
    grad.addColorStop(0.45, midHex);
    grad.addColorStop(0.84, lightHex);
    grad.addColorStop(1.0, midHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Luminous lower iris crescent glow
    const glow = ctx.createRadialGradient(
      irisCx,
      irisCy + irisRy * 0.48,
      6,
      irisCx,
      irisCy + irisRy * 0.42,
      irisRx * 0.85,
    );
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Crisp deep pupil
    ctx.beginPath();
    ctx.ellipse(
      irisCx,
      irisCy - irisRy * 0.04,
      irisRx * 0.46,
      irisRy * 0.46,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#17131B';
    ctx.fill();

    ctx.restore();

    // Subtle iris outline ring
    ctx.beginPath();
    ctx.ellipse(irisCx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = rimHex;
    ctx.stroke();

    // Glossy anime/chibi specular catchlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(
      irisCx - irisRx * 0.36,
      irisCy - irisRy * 0.34,
      irisRx * 0.28,
      irisRy * 0.25,
      -0.28,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (effectiveStyle !== 'cool') {
      // Secondary bottom-right bounce dot
      ctx.beginPath();
      ctx.arc(
        irisCx + irisRx * 0.34,
        irisCy + irisRy * 0.38,
        irisRx * (effectiveStyle === 'sparkle' ? 0.17 : 0.13),
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Tiny crisp upper-right glint
      ctx.beginPath();
      ctx.arc(
        irisCx + irisRx * 0.28,
        irisCy - irisRy * 0.42,
        irisRx * 0.09,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(irisCx + irisRx * 0.3, irisCy + irisRy * 0.28, irisRx * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (effectiveStyle === 'sparkle') {
      ctx.fillStyle = '#FFFDF8';
      drawFourPointStar(
        ctx,
        irisCx - irisRx * 0.12,
        irisCy + irisRy * 0.42,
        irisRx * 0.2,
        irisRx * 0.07,
      );
    }

    ctx.restore();

    // 3. Crisp Upper Eyelash Wing & Gentle Lower Rim
    ctx.strokeStyle = lashColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (effectiveStyle === 'cool') {
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 112, cy - 34);
      ctx.quadraticCurveTo(cx, cy - 48, cx + dir * 106, cy - 28);
      ctx.stroke();

      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(42, 30, 26, 0.72)';
      ctx.beginPath();
      ctx.moveTo(cx - dir * 84, cy + 54);
      ctx.quadraticCurveTo(cx, cy + 62, cx + dir * 82, cy + 54);
      ctx.stroke();
    } else if (effectiveStyle === 'gentle') {
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 106, cy - 12);
      ctx.quadraticCurveTo(cx - dir * 88, cy - 24, cx - dir * 68, cy - 58);
      ctx.bezierCurveTo(
        cx - dir * 32,
        cy - 92,
        cx + dir * 50,
        cy - 92,
        cx + dir * 94,
        cy - 18,
      );
      ctx.stroke();

      ctx.lineWidth = 5.5;
      ctx.strokeStyle = 'rgba(62, 36, 24, 0.58)';
      ctx.beginPath();
      ctx.moveTo(cx - dir * 74, cy + 72);
      ctx.quadraticCurveTo(cx, cy + 94, cx + dir * 74, cy + 70);
      ctx.stroke();
    } else {
      // 'bright', 'sparkle', 'heroic': thick velvety curved upper lash + adorable outer wing
      const outerX = cx - dir * 104;
      const innerX = cx + dir * 98;
      const peakY =
        effectiveStyle === 'sparkle'
          ? cy - 98
          : effectiveStyle === 'heroic'
            ? cy - 88
            : cy - 94;

      ctx.lineWidth = effectiveStyle === 'heroic' ? 19 : 18;
      ctx.beginPath();
      ctx.moveTo(outerX - dir * 14, cy - 22);
      ctx.quadraticCurveTo(outerX + dir * 4, cy - 16, outerX + dir * 18, cy - 42);
      ctx.bezierCurveTo(
        cx - dir * 42,
        peakY,
        cx + dir * 50,
        peakY + 8,
        innerX,
        cy + 4,
      );
      ctx.stroke();

      if (effectiveStyle === 'sparkle') {
        // Extra cute dainty upper-outer lash accent
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        ctx.moveTo(outerX + dir * 10, cy - 48);
        ctx.lineTo(outerX - dir * 10, cy - 60);
        ctx.stroke();
      }

      // Soft lower contour
      ctx.lineWidth = 5.5;
      ctx.strokeStyle = 'rgba(42, 28, 24, 0.65)';
      ctx.beginPath();
      ctx.moveTo(outerX + dir * 24, cy + 68);
      ctx.quadraticCurveTo(
        cx,
        cy + (effectiveStyle === 'sparkle' ? 98 : 90),
        innerX - dir * 22,
        cy + 66,
      );
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _eyeTexCache.set(key, tex);
  return tex;
}

function createChibiMouthTexture(
  expr: AvatarConfig['expression'],
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `chibi_mouth_v3_${expr}`;
  const cached = _mouthTexCache.get(key);
  if (cached) return cached;

  const w = 320;
  const h = 260;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const noseY = h * 0.22;
  const mouthY = h * 0.58;

  // Tiny sculpted warm nose button with soft highlight
  ctx.fillStyle = expr === 'joy_open' ? '#CF6B6F' : '#C27C62';
  ctx.beginPath();
  ctx.ellipse(cx, noseY, 6.2, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 232, 218, 0.72)';
  ctx.beginPath();
  ctx.arc(cx - 1.8, noseY - 1.4, 2.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (expr === 'sweet_smile') {
    ctx.strokeStyle = '#582D24';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 14);
    ctx.quadraticCurveTo(cx, mouthY + 24, cx + 46, mouthY - 14);
    ctx.stroke();

    // Subtle rosy corner dimples
    ctx.fillStyle = 'rgba(220, 120, 118, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - 50, mouthY - 12, 5.5, 0, Math.PI * 2);
    ctx.arc(cx + 50, mouthY - 12, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'joy_open') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 14);
    ctx.quadraticCurveTo(cx, mouthY - 8, cx + 46, mouthY - 14);
    ctx.bezierCurveTo(cx + 46, mouthY + 38, cx - 46, mouthY + 38, cx - 46, mouthY - 14);
    ctx.closePath();
    ctx.fillStyle = '#A83844';
    ctx.fill();
    ctx.clip();

    // Crisp white upper teeth band
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cx - 44, mouthY - 16, 88, 14);

    // Warm pink tongue
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 22, 34, 19, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F68B97';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#4A2220';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 14);
    ctx.quadraticCurveTo(cx, mouthY - 8, cx + 46, mouthY - 14);
    ctx.bezierCurveTo(cx + 46, mouthY + 38, cx - 46, mouthY + 38, cx - 46, mouthY - 14);
    ctx.stroke();
  } else if (expr === 'cat_w') {
    ctx.strokeStyle = '#48241C';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 6);
    ctx.quadraticCurveTo(cx - 24, mouthY + 22, cx, mouthY - 2);
    ctx.quadraticCurveTo(cx + 24, mouthY + 22, cx + 46, mouthY - 6);
    ctx.stroke();
  } else if (expr === 'gentle_o') {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 4, 21, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#A83844';
    ctx.fill();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 19, 19, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F48E99';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#4E2422';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 4, 21, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (expr === 'confident') {
    ctx.strokeStyle = '#38201B';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx - 44, mouthY + 2);
    ctx.quadraticCurveTo(cx + 6, mouthY + 8, cx + 48, mouthY - 12);
    ctx.stroke();
  } else if (expr === 'pout') {
    ctx.strokeStyle = '#38201B';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx - 34, mouthY + 14);
    ctx.quadraticCurveTo(cx - 2, mouthY - 14, cx + 28, mouthY + 12);
    ctx.stroke();

    // Cute side puff cheek curve
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(cx + 22, mouthY - 8);
    ctx.quadraticCurveTo(cx + 42, mouthY + 6, cx + 24, mouthY + 24);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _mouthTexCache.set(key, tex);
  return tex;
}

/**
 * Curved conformal surface patch sampled directly from `headSurfacePoint`
 * so procedural eye and mouth decals wrap flush on the clay head with zero clipping.
 */
function createHeadConformalPatchGeometry(
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
  loft = 0.0028,
  segU = 18,
  segV = 14,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const lat = THREE.MathUtils.lerp(latMax, latMin, v);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const lon = THREE.MathUtils.lerp(lonMin, lonMax, u);
      const [px, py, pz] = headSurfacePoint(lat, lon, loft);
      positions.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const d = (iv + 1) * stride + iu;
      const c = d + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Smooth tapered 3D clay stroke (for delicate anime brows, winged lashes, squint lids, and mouths).
 */
function createTaperedTubeGeometry(
  pts: [number, number, number][],
  baseRadius: number,
  tubularSegs = 14,
  radialSegs = 8,
  tipScale = 0.22,
): THREE.BufferGeometry {
  const vecs = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);
  const positions: number[] = [];
  const indices: number[] = [];
  const upRef = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const c = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const normal = upRef.clone().addScaledVector(tan, -upRef.dot(tan));
    if (normal.lengthSq() < 1e-4) normal.set(0, 1, 0);
    normal.normalize();
    const binorm = tan.clone().cross(normal).normalize();

    const arch = Math.sin(t * Math.PI);
    const r = baseRadius * (tipScale + (1 - tipScale) * Math.pow(arch, 0.55));
    for (let j = 0; j < radialSegs; j++) {
      const th = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      positions.push(
        c.x + (normal.x * cos + binorm.x * sin) * r,
        c.y + (normal.y * cos + binorm.y * sin) * r,
        c.z + (normal.z * cos + binorm.z * sin) * r,
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

  const startIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  positions.push(p0.x, p0.y, p0.z);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(startIdx, j, (j + 1) % radialSegs);
  }
  const endIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  positions.push(p1.x, p1.y, p1.z);
  const lastRow = tubularSegs * radialSegs;
  for (let j = 0; j < radialSegs; j++) {
    indices.push(endIdx, lastRow + ((j + 1) % radialSegs), lastRow + j);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
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

/**
 * Universal seated drape deformer for ANY skirt, dress hem, or trim geometry attached under skirtPivot.
 * Automatically drapes front vertices smoothly over horizontal thighs & knees while tucking
 * back/side hems cleanly atop the seat without poking under the bench or into the backrest.
 */
function createSeatedSkirtDrapeGeometry(
  standGeo: THREE.BufferGeometry,
  meshOffsetY: number,
  meshRotX = 0,
): THREE.BufferGeometry {
  const sitGeo = standGeo.clone();
  const posAttr = sitGeo.attributes.position as THREE.BufferAttribute;

  // First find max drop below skirtPivot waist (y = 0) across this skirt piece
  const cosR = Math.cos(meshRotX);
  const sinR = Math.sin(meshRotX);
  let maxDrop = 0.22;
  for (let i = 0; i < posAttr.count; i++) {
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);
    const sy = ly * cosR - lz * sinR + meshOffsetY;
    if (-sy > maxDrop) maxDrop = -sy;
  }

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);

    // Transform vertex from mesh-local into upright skirtPivot space (waist at y = 0)
    const sx = lx;
    const sy = ly * cosR - lz * sinR + meshOffsetY;
    const sz = ly * sinR + lz * cosR;

    const drop = Math.max(0, -sy);
    const v = THREE.MathUtils.clamp(drop / maxDrop, 0, 1);
    const radial = Math.hypot(sx, sz) || 0.001;
    const frontAmt = THREE.MathUtils.clamp(sz / radial, 0, 1);
    const frontCurve = Math.pow(frontAmt, 1.12);
    const backAmt = THREE.MathUtils.clamp(-sz / radial, 0, 1);

    // Subtle natural sideways hip relaxation when sitting
    const nx = sx * (1 + 0.08 * v);

    // Forward drape along seated lap (+Z) & slight forward tuck at lower back against backrest
    const lapPush = frontCurve * (0.045 + 0.215 * Math.pow(v, 0.88));
    const backNudge = backAmt * (0.045 * v);
    const nz = sz + lapPush + backNudge;

    // Vertical drape: front fabric rests gently atop horizontal thighs & folds softly down at knees;
    // side/back fabric gathers cleanly just above the wooden bench surface (bench top ≈ -0.215)
    const seatSurfaceY = -0.182;
    const flatSideBackY = Math.max(seatSurfaceY, sy * (0.72 - 0.06 * backAmt));
    // Longer skirts (drop > 0.25) drape gently downward past the knee edge
    const kneeCascade = Math.max(0, drop - 0.24) * 0.65;
    const frontLapY = Math.max(-0.115 - kneeCascade, -0.025 - 0.075 * v - kneeCascade);
    let ny = THREE.MathUtils.lerp(flatSideBackY, frontLapY, frontCurve);
    // Keep very top waistband row flush with torso waist
    if (v < 0.08) {
      ny = THREE.MathUtils.lerp(sy, ny, v / 0.08);
    }

    // Transform back from skirtPivot space into mesh-local space
    const dy = ny - meshOffsetY;
    const ddz = nz;
    posAttr.setXYZ(
      i,
      nx,
      dy * cosR + ddz * sinR,
      -dy * sinR + ddz * cosR,
    );
  }

  posAttr.needsUpdate = true;
  sitGeo.computeVertexNormals();
  return sitGeo;
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

function createFittedFemaleTorsoProfile(): THREE.Vector2[] {
  const pts: [number, number][] = [
    [0.01, -0.195],
    [0.195, -0.195],
    [0.172, -0.14],
    [0.162, -0.095],
    [0.184, -0.02],
    [0.194, 0.055],
    [0.184, 0.125],
    [0.166, 0.168],
    [0.106, 0.196],
    [0.072, 0.21],
  ];
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

function createPencilSkirtGeometry(
  waistR: number,
  hipR: number,
  hemR: number,
  height: number,
  segU = 32,
  segV = 12,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const t = iv / segV; // 0 = top waist, 1 = bottom hem
    const y = (0.5 - t) * height;
    const curveR =
      t < 0.36
        ? THREE.MathUtils.lerp(waistR, hipR, Math.sin((t / 0.36) * (Math.PI * 0.5)))
        : THREE.MathUtils.lerp(hipR, hemR, (t - 0.36) / 0.64);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const th = u * Math.PI * 2;
      positions.push(Math.sin(th) * curveR, y, Math.cos(th) * curveR);
      uvs.push(u, 1 - t);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + segU + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}



export function buildAvatarRig(
  config: AvatarConfig,
  options?: {
    equippedTool?: ToolId | null;
    equippedFood?: BbqFoodId | null;
    carryingPet?: {speciesId: PetSpeciesId; sick?: boolean} | null;
  },
): AvatarRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = clayMat(config.skinTone, 0.54, 0.02);
  const hairMat = createHairClayMaterial(config.hairColor);
  const topMat = clayMat(config.topColor, 0.66, 0.02);
  const topDarkMat = clayMat(shadeHex(config.topColor, -0.09).getHex(), 0.7, 0.02);
  const topLightMat = clayMat(shadeHex(config.topColor, 0.09).getHex(), 0.62, 0.02);
  const topTrimMat = clayMat('#FFFBF2', 0.7, 0.02);
  const bottomMat = clayMat(config.bottomColor, 0.72, 0.02);
  const bottomDarkMat = clayMat(shadeHex(config.bottomColor, -0.09).getHex(), 0.74, 0.02);
  const bottomLightMat = clayMat(shadeHex(config.bottomColor, 0.07).getHex(), 0.68, 0.02);
  const cheekMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F28A95'),
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });

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

  // ========== ARTICULATED LEGS (HIP -> THIGH -> KNEE -> SHIN -> GROUNDED SHOES) ==========
  const KNEE_Y = -0.215;
  const sockMat = clayMat('#FFF8EE', 0.72, 0.01);
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.52, 0);

    const isTrousers = config.bottom === 'wide_trousers' || config.bottom === 'office_trousers';
    const legMat = isTrousers ? bottomMat : skinMat;
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), legMat);
    legPivot.add(hipCap);

    // Upper thigh (hip y=0 down to knee y=-0.215) — openEnded meets seamless sphere cap without dark ring seam
    const thighMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.077, 0.066, 0.218, 18, 1, true),
      legMat,
    );
    thighMesh.position.y = -0.109;
    legPivot.add(thighMesh);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.0685, 14, 12), legMat);
    kneeCap.position.y = KNEE_Y;
    legPivot.add(kneeCap);

    if (config.bottom === 'wide_trousers') {
      const hipPantCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 14, 12),
        bottomMat,
      );
      hipPantCap.scale.set(1, 0.88, 1);
      const thighPant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.094, 0.105, 0.22, 18),
        bottomMat,
      );
      thighPant.position.y = -0.108;
      const kneeTrouserCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.103, 14, 12),
        bottomMat,
      );
      kneeTrouserCap.scale.set(1, 0.92, 1);
      kneeTrouserCap.position.y = KNEE_Y;
      legPivot.add(hipPantCap, thighPant, kneeTrouserCap);
    } else if (config.bottom === 'office_trousers') {
      // Handsome tailored straight-leg dress slacks (suông gọn, không loe!)
      const hipPantCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 14, 12),
        bottomMat,
      );
      hipPantCap.scale.set(1, 0.88, 0.96);
      const thighPant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.092, 0.086, 0.22, 18),
        bottomMat,
      );
      thighPant.position.y = -0.108;
      const thighCrease = new THREE.Mesh(
        new RoundedBoxGeometry(0.014, 0.18, 0.012, 2, 0.004),
        bottomLightMat,
      );
      thighCrease.position.set(0, -0.11, 0.086);
      const kneeTrouserCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 14, 12),
        bottomMat,
      );
      kneeTrouserCap.scale.set(1, 0.9, 0.96);
      kneeTrouserCap.position.y = KNEE_Y;
      legPivot.add(hipPantCap, thighPant, thighCrease, kneeTrouserCap);
    } else if (config.bottom === 'denim_shorts') {
      const hipShortCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 14, 12),
        bottomMat,
      );
      hipShortCap.scale.set(1, 0.84, 1);
      const shortMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.102, 0.165, 16),
        bottomMat,
      );
      shortMesh.position.y = -0.08;
      legPivot.add(hipShortCap, shortMesh);

      const hem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.107, 0.026, 16),
        bottomLightMat,
      );
      hem.position.y = -0.16;
      legPivot.add(hem);
    }

    // Lower leg (shin + socks + shoes) pivoted at KNEE_Y so knees bend naturally when sitting/walking
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, KNEE_Y, 0);
    legPivot.add(kneePivot);

    const shinMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.055, 0.225, 18, 1, true),
      legMat,
    );
    shinMesh.position.y = -0.112;
    kneePivot.add(shinMesh);

    if (config.bottom === 'wide_trousers') {
      const shinPant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.114, 0.195, 18),
        bottomMat,
      );
      shinPant.position.y = -0.095;
      kneePivot.add(shinPant);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.118, 0.12, 0.044, 18),
        bottomDarkMat,
      );
      cuff.position.y = -0.18;
      kneePivot.add(cuff);
    } else if (config.bottom === 'office_trousers') {
      // Straight tapered tailored slacks ending cleanly above dress shoes
      const shinPant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.078, 0.21, 18),
        bottomMat,
      );
      shinPant.position.y = -0.104;
      const shinCrease = new THREE.Mesh(
        new RoundedBoxGeometry(0.013, 0.185, 0.012, 2, 0.004),
        bottomLightMat,
      );
      shinCrease.position.set(0, -0.102, 0.079);
      const tailoredHem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.079, 0.022, 18),
        bottomDarkMat,
      );
      tailoredHem.position.y = -0.196;
      kneePivot.add(shinPant, shinCrease, tailoredHem);
    }

    // Knit ankle sock + rolled cuff bridging the lower shin smoothly into shoes
    if (!isTrousers && config.shoes !== 'boots') {
      const sockTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.059, 0.105, 18),
        sockMat,
      );
      sockTube.position.y = -0.175;
      const sockCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.011, 8, 18),
        sockMat,
      );
      sockCuff.rotation.x = Math.PI / 2;
      sockCuff.position.y = -0.123;
      kneePivot.add(sockTube, sockCuff);
    }

    // Shoe planted flush on ground when standing (0.52 - 0.215 - 0.297 = 0.008 right above shadowDisc)
    const shoeMat = glossyClayMat(config.shoeColor || '#3A2B2B', 0.34);
    const isSneaker = config.shoes === 'sneakers';
    const shoeBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.154, isSneaker ? 0.092 : 0.102, 0.23, 4, isSneaker ? 0.04 : 0.044),
      shoeMat,
    );
    shoeBase.position.set(0, isSneaker ? -0.239 : -0.245, 0.036);
    kneePivot.add(shoeBase);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.074, 14, 10), shoeMat);
    toeCap.scale.set(1.0, isSneaker ? 0.6 : 0.68, 1.05);
    toeCap.position.set(0, isSneaker ? -0.245 : -0.251, 0.114);
    kneePivot.add(toeCap);

    if (isSneaker) {
      const outsole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.069, 0.022, 22),
        clayMat('#EBE5DB', 0.48),
      );
      outsole.scale.set(1.04, 1, 1.56);
      outsole.position.set(0, -0.284, 0.056);
      kneePivot.add(outsole);

      for (let i = 0; i < 2; i++) {
        const lace = new THREE.Mesh(
          new RoundedBoxGeometry(0.064, 0.014, 0.02, 2, 0.005),
          clayMat('#FFFFFF', 0.4),
        );
        lace.position.set(0, -0.193, 0.042 + i * 0.04);
        kneePivot.add(lace);
      }
    } else if (config.shoes === 'boots') {
      const bootShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.084, 0.088, 0.165, 16),
        shoeMat,
      );
      bootShaft.position.set(0, -0.155, 0);
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.084, 0.015, 8, 16),
        clayMat(shadeHex(config.shoeColor || '#3A2B2B', -0.08).getHex(), 0.45),
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, -0.073, 0);
      kneePivot.add(bootShaft, collar);
    } else if (config.shoes === 'mary_janes') {
      const collarRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.012, 8, 18),
        shoeMat,
      );
      collarRim.rotation.x = Math.PI / 2;
      collarRim.position.set(0, -0.195, 0.005);
      const strap = new THREE.Mesh(
        new RoundedBoxGeometry(0.148, 0.02, 0.03, 2, 0.008),
        clayMat(shadeHex(config.shoeColor || '#3A2B2B', 0.08).getHex(), 0.35),
      );
      strap.position.set(0, -0.2, 0.032);
      kneePivot.add(collarRim, strap);
    } else if (config.shoes === 'loafers') {
      const collarRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.012, 8, 18),
        shoeMat,
      );
      collarRim.rotation.x = Math.PI / 2;
      collarRim.position.set(0, -0.195, 0.005);
      const saddle = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.02, 0.052, 2, 0.008),
        clayMat(shadeHex(config.shoeColor || '#D8B894', -0.14).getHex(), 0.4),
      );
      saddle.position.set(0, -0.197, 0.054);
      kneePivot.add(collarRim, saddle);
    }

    return {legPivot, kneePivot};
  };

  const leftLegRig = makeLeg(-0.125);
  const rightLegRig = makeLeg(0.125);
  const leftLeg = leftLegRig.legPivot;
  const rightLeg = rightLegRig.legPivot;
  const leftKnee = leftLegRig.kneePivot;
  const rightKnee = rightLegRig.kneePivot;
  bodyPivot.add(leftLeg, rightLeg);

  // ========== TORSO & SCULPTED CLOTHING ==========
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.77, 0);
  bodyPivot.add(torsoGroup);

  const isOfficeFemale = config.top === 'office_female';
  const baseTorsoMat =
    config.top === 'sailor_blouse' || config.top === 'cardigan_vest'
      ? topTrimMat
      : topMat;

  const isHoodie = config.top === 'hoodie';
  const torsoMesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      isOfficeFemale
        ? createFittedFemaleTorsoProfile()
        : createTorsoProfilePoints(isHoodie ? 0.024 : 0, isHoodie ? -0.215 : -0.195, 0.21),
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

    // Tailored knit placket trims hugging the front opening seamlessly from collar to hem
    [-1, 1].forEach((s) => {
      const placket = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.31, 0.024, 2, 0.008),
        topDarkMat,
      );
      placket.position.set(s * 0.068, -0.005, 0.198);
      placket.rotation.x = 0.08;
      placket.rotation.y = s * 0.28;
      torsoGroup.add(placket);

      const collar = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.042, 0.036, 2, 0.014),
        topTrimMat,
      );
      collar.position.set(s * 0.058, 0.192, 0.108);
      collar.rotation.z = -s * 0.32;
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
  } else if (config.top === 'office_male') {
    // Crisp white tailored dress shirt with structured V-collar, tie, tie clip & central placket
    const shirtWhite = clayMat(config.topColor || '#FFFFFF', 0.56, 0.02);
    const shirtShade = clayMat('#E3E9F0', 0.62, 0.02);
    const tieMat = clayMat('#1F3456', 0.44, 0.05);
    const tieStripeMat = clayMat('#3B5D8C', 0.42, 0.05);
    const silverMat = new THREE.MeshStandardMaterial({
      color: '#DCE2EA',
      roughness: 0.18,
      metalness: 0.65,
    });

    const neckBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.118, 0.132, 0.042, 22),
      shirtWhite,
    );
    neckBand.position.set(0, 0.196, 0);
    torsoGroup.add(neckBand);

    [-1, 1].forEach((s) => {
      const collarWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.048, 0.032, 2, 0.012),
        shirtWhite,
      );
      collarWing.position.set(s * 0.058, 0.172, 0.106);
      collarWing.rotation.z = -s * 0.34;
      collarWing.rotation.y = s * 0.36;
      collarWing.rotation.x = 0.22;
      torsoGroup.add(collarWing);
    });

    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.04, 0.3, 0.018, 2, 0.006),
      shirtShade,
    );
    placket.position.set(0, -0.01, 0.205);
    placket.rotation.x = -0.05;
    torsoGroup.add(placket);

    // Sculpted 3D tailored necktie + Windsor knot + metallic tie clip
    const tieKnot = new THREE.Mesh(
      new RoundedBoxGeometry(0.054, 0.052, 0.034, 3, 0.014),
      tieMat,
    );
    tieKnot.position.set(0, 0.146, 0.198);
    tieKnot.rotation.x = -0.22;

    const tieShape = new THREE.Shape();
    tieShape.moveTo(-0.018, 0.135);
    tieShape.lineTo(0.018, 0.135);
    tieShape.lineTo(0.036, -0.088);
    tieShape.lineTo(0.0, -0.142);
    tieShape.lineTo(-0.036, -0.088);
    tieShape.closePath();
    const tieGeo = new THREE.ExtrudeGeometry(tieShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    const tieBlade = new THREE.Mesh(tieGeo, tieMat);
    tieBlade.position.set(0, -0.004, 0.204);
    tieBlade.rotation.x = -0.06;

    const tieAccent = new THREE.Mesh(
      new RoundedBoxGeometry(0.054, 0.016, 0.022, 2, 0.005),
      tieStripeMat,
    );
    tieAccent.position.set(0, 0.035, 0.216);
    tieAccent.rotation.z = 0.32;

    const tieClip = new THREE.Mesh(
      new RoundedBoxGeometry(0.044, 0.011, 0.012, 2, 0.004),
      silverMat,
    );
    tieClip.position.set(0.008, 0.015, 0.223);
    torsoGroup.add(tieKnot, tieBlade, tieAccent, tieClip);
  } else if (config.top === 'office_female') {
    // Fitted waist-cinching white office blouse with sculpted feminine chest & crisp V-collar
    const shirtWhite = clayMat(config.topColor || '#FFFFFF', 0.54, 0.02);
    const shirtShadow = clayMat('#E6EBF0', 0.62, 0.02);
    const pearlBtnMat = glossyClayMat('#FFF8F2', 0.2);

    // Subtle collarbone V-neck skin reveal
    const vNeckShape = new THREE.Shape();
    vNeckShape.moveTo(-0.056, 0.04);
    vNeckShape.lineTo(0.056, 0.04);
    vNeckShape.lineTo(0.0, -0.042);
    vNeckShape.closePath();
    const vNeckSkin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(vNeckShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.005,
        bevelSegments: 2,
      }),
      skinMat,
    );
    vNeckSkin.position.set(0, 0.16, 0.118);
    vNeckSkin.rotation.x = -0.45;
    torsoGroup.add(vNeckSkin);

    // Sculpted feminine bust contour integrated cleanly in crisp blouse fabric
    [-1, 1].forEach((s) => {
      const bust = new THREE.Mesh(new THREE.SphereGeometry(0.088, 18, 16), shirtWhite);
      bust.scale.set(1.06, 0.94, 0.86);
      bust.position.set(s * 0.068, 0.05, 0.138);
      torsoGroup.add(bust);
    });
    const bridgeChest = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 14, 12),
      shirtWhite,
    );
    bridgeChest.scale.set(1.25, 0.82, 0.72);
    bridgeChest.position.set(0, 0.048, 0.142);
    torsoGroup.add(bridgeChest);

    // Crisp tailored V-lapels
    [-1, 1].forEach((s) => {
      const lapel = new THREE.Mesh(
        new RoundedBoxGeometry(0.042, 0.125, 0.022, 2, 0.008),
        shirtWhite,
      );
      lapel.position.set(s * 0.042, 0.145, 0.155);
      lapel.rotation.z = s * 0.42;
      lapel.rotation.y = s * 0.28;
      lapel.rotation.x = -0.35;
      torsoGroup.add(lapel);
    });

    // Vertical waist-contour seams & delicate pearl buttons
    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.026, 0.21, 0.016, 2, 0.005),
      shirtShadow,
    );
    placket.position.set(0, -0.025, 0.175);
    torsoGroup.add(placket);

    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 10, 8),
        pearlBtnMat,
      );
      btn.scale.set(1, 1, 0.6);
      btn.position.set(0, 0.01 - i * 0.058, 0.186 - i * 0.004);
      torsoGroup.add(btn);
    }
  }

  // Bottoms on Torso (clean radial hierarchy so all skirts drape smoothly over seated lap via paired geometries)
  let skirtPivot: THREE.Group | undefined;
  const skirtDeformMeshes: SkirtDeformPair[] = [];
  if (config.bottom === 'pleated_skirt' || config.bottom === 'midi_skirt') {
    const isMidi = config.bottom === 'midi_skirt';
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.214, 0.22, 0.048, 26),
      bottomDarkMat,
    );
    waistband.position.set(0, -0.158, 0);
    torsoGroup.add(waistband);

    skirtPivot = new THREE.Group();
    skirtPivot.position.set(0, -0.158, 0);
    torsoGroup.add(skirtPivot);

    const skirtGeo = createPleatedSkirtGeometry(
      0.216,
      isMidi ? 0.325 : 0.285,
      isMidi ? 0.33 : 0.23,
      isMidi ? 12 : 16,
      isMidi ? 0.011 : 0.016,
    );
    const skirtOffsetY = isMidi ? -0.182 : -0.13;
    const skirtSitGeo = createSeatedSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, skirtOffsetY, 0);
    skirtPivot.add(skirtMesh);
    skirtDeformMeshes.push({mesh: skirtMesh, standGeo: skirtGeo, sitGeo: skirtSitGeo});

    const hemStandGeo = new THREE.TorusGeometry(isMidi ? 0.322 : 0.282, 0.012, 8, 32);
    const hemOffsetY = isMidi ? -0.332 : -0.23;
    const hemSitGeo = createSeatedSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemRing = new THREE.Mesh(hemStandGeo, bottomLightMat);
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, hemOffsetY, 0);
    skirtPivot.add(hemRing);
    skirtDeformMeshes.push({mesh: hemRing, standGeo: hemStandGeo, sitGeo: hemSitGeo});
  } else if (config.bottom === 'office_skirt') {
    // High-waisted chic office pencil skirt hugging waist smoothly with slim belt & gold buckle
    const skirtWaistR = isOfficeFemale ? 0.168 : 0.215;
    const waistbandY = isOfficeFemale ? -0.118 : -0.156;
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(skirtWaistR, skirtWaistR + 0.012, 0.048, 28),
      bottomDarkMat,
    );
    waistband.position.set(0, waistbandY, 0);
    torsoGroup.add(waistband);

    const goldBuckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.046, 0.028, 0.014, 2, 0.005),
      new THREE.MeshStandardMaterial({color: '#E8C36A', roughness: 0.2, metalness: 0.65}),
    );
    goldBuckle.position.set(0, waistbandY, skirtWaistR + 0.008);
    torsoGroup.add(goldBuckle);

    skirtPivot = new THREE.Group();
    skirtPivot.position.set(0, waistbandY, 0);
    torsoGroup.add(skirtPivot);

    const skirtH = isOfficeFemale ? 0.295 : 0.255;
    const skirtGeo = createPencilSkirtGeometry(
      skirtWaistR + 0.008,
      isOfficeFemale ? 0.218 : 0.234,
      isOfficeFemale ? 0.204 : 0.218,
      skirtH,
    );
    const skirtOffsetY = -skirtH * 0.5 - 0.012;
    const skirtSitGeo = createSeatedSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, skirtOffsetY, 0);
    skirtPivot.add(skirtMesh);
    skirtDeformMeshes.push({mesh: skirtMesh, standGeo: skirtGeo, sitGeo: skirtSitGeo});

    const hemStandGeo = new THREE.TorusGeometry(isOfficeFemale ? 0.204 : 0.218, 0.01, 8, 32);
    const hemOffsetY = -skirtH - 0.008;
    const hemSitGeo = createSeatedSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemRing = new THREE.Mesh(hemStandGeo, bottomDarkMat);
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, hemOffsetY, 0);
    skirtPivot.add(hemRing);
    skirtDeformMeshes.push({mesh: hemRing, standGeo: hemStandGeo, sitGeo: hemSitGeo});
  } else if (config.bottom === 'office_trousers') {
    const waistR = isOfficeFemale ? 0.194 : 0.22;
    const beltMat = clayMat('#241B17', 0.42, 0.1);
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(waistR, waistR + 0.006, 0.072, 26),
      bottomMat,
    );
    waist.position.set(0, -0.204, 0);
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(waistR + 0.008, waistR + 0.008, 0.032, 26),
      beltMat,
    );
    belt.position.set(0, -0.186, 0);
    const buckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.048, 0.032, 0.016, 2, 0.005),
      new THREE.MeshStandardMaterial({color: '#D6DCE4', roughness: 0.2, metalness: 0.65}),
    );
    buckle.position.set(0, -0.186, waistR + 0.01);
    torsoGroup.add(waist, belt, buckle);
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
  const carryingPet = options?.carryingPet ?? null;
  const equippedTool = options?.equippedTool ?? null;
  const equippedFood = !equippedTool ? (options?.equippedFood ?? null) : null;
  const handheld =
    !equippedTool && !equippedFood && config.handheld && config.handheld !== 'none'
      ? config.handheld
      : null;
  const holdPose: HoldPose = equippedTool
    ? equippedTool === 'wooden_net'
      ? 'carry_net'
      : 'carry_front'
    : equippedFood
      ? 'carry_front'
      : !handheld
        ? 'none'
        : handheld === 'tote_bag'
          ? 'carry_bag'
          : handheld === 'mini_umbrella'
            ? 'carry_umbrella'
            : 'carry_front';

  const makeArm = (side: -1 | 1) => {
    // Relaxed natural A-pose seated flush on shoulder corner with breathing room beside waist/hips
    const shoulderPivot = new THREE.Group();
    const baseArmZ = isHoodie ? 0.4 : HAND_POSES.none.armZ;
    shoulderPivot.position.set(
      side * (isHoodie ? 0.214 : isOfficeFemale ? 0.184 : 0.198),
      isOfficeFemale ? 0.885 : 0.89,
      0,
    );
    shoulderPivot.rotation.z = side * baseArmZ;

    const upperMat = isSleeveless ? skinMat : isShortSleeve ? topTrimMat : topMat;
    const upperR = isHoodie ? 0.062 : isShortSleeve ? 0.05 : 0.055;
    const midR = isHoodie ? 0.055 : isShortSleeve ? 0.044 : 0.048;
    const wristR = isHoodie ? 0.05 : isShortSleeve ? 0.041 : 0.043;

    if (isShortSleeve) {
      const sleeveCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 14, 12),
        topTrimMat,
      );
      const sleeveTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.064, 0.12, 16),
        topTrimMat,
      );
      sleeveTube.position.y = -0.06;
      const sleeveCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.063, 0.011, 8, 16),
        topMat,
      );
      sleeveCuff.rotation.x = Math.PI / 2;
      sleeveCuff.position.y = -0.12;
      shoulderPivot.add(sleeveCap, sleeveTube, sleeveCuff);

      const innerSkinUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.046, midR, 0.15, 16),
        skinMat,
      );
      innerSkinUpper.position.y = -0.075;
      shoulderPivot.add(innerSkinUpper);
    } else {
      const shoulderJoint = new THREE.Mesh(
        new THREE.SphereGeometry(upperR, 14, 12),
        upperMat,
      );
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(upperR, midR, 0.15, 16),
        upperMat,
      );
      upperArm.position.y = -0.075;
      shoulderPivot.add(shoulderJoint, upperArm);
    }

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.15, 0);
    elbowPivot.rotation.x = HAND_POSES.none.elbowX;
    elbowPivot.rotation.z = side * HAND_POSES.none.elbowZ;
    shoulderPivot.add(elbowPivot);

    const forearmMat = isSleeveless || isShortSleeve ? skinMat : topMat;
    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(midR, 14, 12),
      forearmMat,
    );
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(midR, wristR, 0.132, 16),
      forearmMat,
    );
    forearm.position.y = -0.066;
    elbowPivot.add(elbowJoint, forearm);

    if (!isSleeveless && !isShortSleeve) {
      const cuffMat = config.top === 'cardigan_vest' ? topTrimMat : topDarkMat;
      const wristCuff = new THREE.Mesh(
        new THREE.TorusGeometry(wristR + 0.005, 0.012, 8, 16),
        cuffMat,
      );
      wristCuff.rotation.x = Math.PI / 2;
      wristCuff.position.y = -0.125;
      const cuffInner = new THREE.Mesh(
        new THREE.CylinderGeometry(wristR + 0.002, wristR + 0.004, 0.024, 14),
        cuffMat,
      );
      cuffInner.position.y = -0.121;
      elbowPivot.add(wristCuff, cuffInner);
    }

    const wristBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(wristR * 0.78, 0.033, 0.036, 12),
      skinMat,
    );
    wristBridge.position.y = -0.138;
    elbowPivot.add(wristBridge);

    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.16, 0);
    elbowPivot.add(handGroup);

    const isGripping =
      side === 1 && (Boolean(handheld) || Boolean(equippedTool) || Boolean(equippedFood));
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12), skinMat);
    palm.scale.set(0.92, 1.06, isGripping ? 0.86 : 0.88);
    if (isGripping) palm.position.set(0, 0, -0.004);
    handGroup.add(palm);

    if (isGripping) {
      // Sculpted curled fingers + opposing thumb forming a real closed grip pocket at (0, -0.005, 0.024)
      const fingerCurl = new THREE.Mesh(
        new RoundedBoxGeometry(0.058, 0.044, 0.034, 3, 0.014),
        skinMat,
      );
      fingerCurl.position.set(-0.004, -0.01, 0.034);
      fingerCurl.rotation.x = 0.22;
      handGroup.add(fingerCurl);

      const thumbGrip = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.028, 6, 8),
        skinMat,
      );
      thumbGrip.position.set(-0.024, 0.014, 0.03);
      thumbGrip.rotation.z = -0.95;
      thumbGrip.rotation.x = 0.25;
      handGroup.add(thumbGrip);
    } else {
      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.024, 6, 8),
        skinMat,
      );
      thumb.position.set(-side * 0.032, 0.006, 0.03);
      thumb.rotation.z = side * 0.52;
      thumb.rotation.x = -0.45;
      handGroup.add(thumb);
    }

    return {shoulderPivot, elbowPivot, handGroup};
  };

  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);
  const leftArm = leftArmRig.shoulderPivot;
  const rightArm = rightArmRig.shoulderPivot;
  const leftElbow = leftArmRig.elbowPivot;
  const rightElbow = rightArmRig.elbowPivot;

  bodyPivot.add(leftArm, rightArm);

  let rodBobberObj: THREE.Object3D | undefined;
  let rodLineObj: THREE.Object3D | undefined;

  if (handheld || equippedTool || equippedFood) {
    const hColor = config.handheldColor || '#E8B84B';
    const poseCfg = HAND_POSES[holdPose];
    const hoodieClearZ = isHoodie ? 0.06 : 0;
    rightArm.rotation.x = poseCfg.armX;
    rightArm.rotation.z = poseCfg.armZ + hoodieClearZ;
    rightElbow.rotation.x = poseCfg.elbowX;
    rightElbow.rotation.z = poseCfg.elbowZ;

    // Attach handAnchor directly at the closed-fist grip pocket, oriented upright in world space
    const handAnchor = new THREE.Group();
    handAnchor.position.set(0, -0.005, 0.026);
    rightArmRig.handGroup.add(handAnchor);

    bodyPivot.updateMatrixWorld(true);
    const handWorldQuat = new THREE.Quaternion();
    rightArmRig.handGroup.getWorldQuaternion(handWorldQuat);
    const desiredWorldQuat = new THREE.Quaternion().setFromEuler(
      holdPose === 'carry_umbrella'
        ? new THREE.Euler(-0.04, 0, -0.04) // angled gently outward away from face/hat; safe for balloons too
        : holdPose === 'carry_front'
          ? new THREE.Euler(0.1, 0, -0.04)
          : new THREE.Euler(0, 0, 0),
    );
    handAnchor.quaternion.copy(handWorldQuat).invert().multiply(desiredWorldQuat);

    if (equippedTool === 'wooden_rod') {
      const rodGroup = new THREE.Group();
      // Tilt rod forward and slightly upward (~48 deg) from the hand grip
      rodGroup.rotation.x = 0.72;
      rodGroup.rotation.z = -0.08;

      const corkMat = clayMat('#B88450', 0.78);
      const darkWoodMat = clayMat('#7D502E', 0.68);
      const bambooMat = clayMat('#D2A466', 0.56);
      const brassMat = glossyClayMat('#DDA844', 0.25);

      const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), darkWoodMat);
      buttCap.position.set(0, -0.14, 0);

      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.021, 0.023, 0.28, 12),
        corkMat,
      );
      handle.position.set(0, 0.0, 0);

      const reelBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.045, 12),
        brassMat,
      );
      reelBody.rotation.z = Math.PI / 2;
      reelBody.position.set(0.026, 0.095, 0.022);

      const reelCrank = new THREE.Mesh(
        new RoundedBoxGeometry(0.038, 0.012, 0.012, 2, 0.004),
        darkWoodMat,
      );
      reelCrank.position.set(0.052, 0.095, 0.034);

      const shaftLower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.018, 0.62, 10),
        darkWoodMat,
      );
      shaftLower.position.set(0, 0.44, 0);

      const shaftUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.013, 0.72, 10),
        bambooMat,
      );
      shaftUpper.position.set(0, 1.09, 0.025);
      shaftUpper.rotation.x = 0.07;

      const tipRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.015, 0.004, 6, 12),
        brassMat,
      );
      tipRing.position.set(0, 1.445, 0.052);

      const lineDrop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 0.34, 4),
        clayMat('#F5FAFF', 0.3),
      );
      lineDrop.position.set(0, 1.28, 0.21);
      lineDrop.rotation.x = -0.72;
      rodLineObj = lineDrop;

      const miniBobberGroup = new THREE.Group();
      miniBobberGroup.position.set(0, 1.15, 0.33);
      const miniBobber = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 10, 10),
        glossyClayMat('#8B5228', 0.24),
      );
      const miniBobberBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.024, 0.0045, 6, 12),
        glossyClayMat('#D6A168', 0.32),
      );
      miniBobberBand.rotation.x = Math.PI / 2;
      miniBobberBand.position.y = -0.003;
      miniBobberGroup.add(miniBobber, miniBobberBand);
      rodBobberObj = miniBobberGroup;

      rodGroup.add(
        buttCap,
        handle,
        reelBody,
        reelCrank,
        shaftLower,
        shaftUpper,
        tipRing,
        lineDrop,
        miniBobberGroup,
      );
      handAnchor.add(rodGroup);
    } else if (equippedTool === 'wooden_net') {
      const netGroup = new THREE.Group();
      // Rest pole comfortably backward & slightly outward over right shoulder
      netGroup.rotation.x = -0.82;
      netGroup.rotation.z = -0.22;

      const darkWoodMat = clayMat('#7D4F2D', 0.68);
      const handleWoodMat = clayMat('#B87F4D', 0.64);
      const shaftWoodMat = clayMat('#9D6639', 0.62);
      const netSackMat = new THREE.MeshStandardMaterial({
        color: '#ECF7FC',
        roughness: 0.78,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });

      const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), darkWoodMat);
      buttCap.position.set(0, -0.15, 0);

      const handleGrip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.021, 0.022, 0.28, 12),
        handleWoodMat,
      );
      handleGrip.position.set(0, -0.01, 0);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.019, 0.64, 10),
        shaftWoodMat,
      );
      pole.position.set(0, 0.42, 0);

      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.02, 0.075, 10),
        darkWoodMat,
      );
      socket.position.set(0, 0.74, 0);

      const hoopGroup = new THREE.Group();
      hoopGroup.position.set(0, 0.96, 0);
      hoopGroup.rotation.x = 0.06;

      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.215, 0.02, 10, 26),
        darkWoodMat,
      );

      // Deep tapered white mesh sack hanging backward behind the shoulder
      const sackPts = [
        new THREE.Vector2(0.0, -0.49),
        new THREE.Vector2(0.055, -0.45),
        new THREE.Vector2(0.115, -0.32),
        new THREE.Vector2(0.175, -0.14),
        new THREE.Vector2(0.208, 0.0),
      ];
      const sackGeo = new THREE.LatheGeometry(sackPts, 20);
      const sack = new THREE.Mesh(sackGeo, netSackMat);
      sack.rotation.x = Math.PI / 2;
      sack.position.set(0, 0, 0.0);

      hoopGroup.add(hoop, sack);
      netGroup.add(buttCap, handleGrip, pole, socket, hoopGroup);
      handAnchor.add(netGroup);
    } else if (handheld === 'milk_tea') {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.052, 0.185, 16),
        clayMat(hColor, 0.35),
      );
      cup.position.set(0.006, 0.024, 0.012);
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.058, 0.064, 16),
        clayMat('#E8D3B9', 0.8),
      );
      sleeve.position.set(0.006, 0.01, 0.012);
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.074, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        glossyClayMat('#FFF8F0', 0.2),
      );
      lid.position.set(0.006, 0.116, 0.012);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.135, 8),
        clayMat('#E86F82', 0.4),
      );
      straw.position.set(0.022, 0.184, 0.012);
      straw.rotation.z = -0.15;
      handAnchor.add(cup, sleeve, lid, straw);
    } else if (handheld === 'plush_bear') {
      const bearGrp = new THREE.Group();
      bearGrp.position.set(0.032, 0.016, 0.048);
      bearGrp.rotation.y = -0.34;

      const bearMat = clayMat(hColor, 0.85);
      const creamMat = clayMat('#F7E6D0', 0.78);
      const noseMat = glossyClayMat('#2A1D18', 0.18);

      const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 14), bearMat);
      bearBody.scale.set(0.95, 1.14, 0.85);
      bearBody.position.set(0, 0.045, 0.02);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), creamMat);
      belly.scale.set(0.9, 1.05, 0.5);
      belly.position.set(0, 0.04, 0.082);

      const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.098, 14, 14), bearMat);
      bearHead.scale.set(1.05, 0.96, 0.96);
      bearHead.position.set(0, 0.205, 0.03);

      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), bearMat);
        ear.position.set(s * 0.078, 0.282, 0.025);
        const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), creamMat);
        innerEar.scale.set(1, 1, 0.5);
        innerEar.position.set(s * 0.078, 0.282, 0.052);
        const bEye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), noseMat);
        bEye.position.set(s * 0.036, 0.22, 0.118);
        const bArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.046, 6, 10), bearMat);
        bArm.position.set(s * 0.098, 0.085, 0.04);
        bArm.rotation.z = s * 0.55;
        bArm.rotation.x = -0.3;
        const bLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.044, 6, 10), bearMat);
        bLeg.position.set(s * 0.064, -0.05, 0.075);
        bLeg.rotation.x = -1.15;
        bLeg.rotation.z = s * 0.25;
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 8), creamMat);
        paw.scale.set(1, 1, 0.5);
        paw.position.set(s * 0.074, -0.062, 0.115);
        bearGrp.add(ear, innerEar, bEye, bArm, bLeg, paw);
      });

      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), creamMat);
      snout.scale.set(1.1, 0.85, 0.85);
      snout.position.set(0, 0.186, 0.112);
      const bNose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), noseMat);
      bNose.scale.set(1.2, 0.8, 0.7);
      bNose.position.set(0, 0.196, 0.144);

      const bow = new THREE.Mesh(
        new RoundedBoxGeometry(0.072, 0.026, 0.02, 2, 0.01),
        clayMat('#E85D68', 0.5),
      );
      bow.position.set(0, 0.128, 0.102);

      bearGrp.add(bearBody, belly, bearHead, snout, bNose, bow);
      handAnchor.add(bearGrp);
    } else if (handheld === 'flower_bouquet') {
      const wrap = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.3, 14, 1, true),
        clayMat('#E9D5B5', 0.82),
      );
      wrap.rotation.x = Math.PI;
      wrap.position.set(0, 0.065, 0);

      const tissueRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.132, 0.021, 8, 18),
        clayMat('#FFF9F0', 0.78),
      );
      tissueRim.rotation.x = Math.PI / 2;
      tissueRim.position.set(0, 0.205, 0);

      const ribbonTie = new THREE.Mesh(
        new THREE.TorusGeometry(0.046, 0.014, 8, 14),
        clayMat('#E86F82', 0.5),
      );
      ribbonTie.rotation.x = Math.PI / 2;
      ribbonTie.position.set(0, 0.025, 0);
      handAnchor.add(wrap, tissueRim, ribbonTie);

      const leafMat = clayMat('#5E9E69', 0.65);
      [-1, 0, 1].forEach((s) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), leafMat);
        leaf.scale.set(0.75, 1.35, 0.3);
        leaf.position.set(s * 0.08, 0.22, -0.025);
        leaf.rotation.z = -s * 0.4;
        handAnchor.add(leaf);
      });

      const buildSunflower = (fx: number, fy: number, fz: number, scale: number) => {
        const fGrp = new THREE.Group();
        fGrp.position.set(fx, fy, fz);
        fGrp.scale.setScalar(scale);
        fGrp.rotation.x = 0.28;
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.052, 12, 10),
          clayMat('#5E3A22', 0.72),
        );
        center.scale.set(1, 1, 0.5);
        fGrp.add(center);
        const petalMat = clayMat(hColor, 0.58);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), petalMat);
          petal.scale.set(0.7, 1.45, 0.4);
          petal.position.set(Math.cos(a) * 0.068, Math.sin(a) * 0.068, -0.005);
          petal.rotation.z = a - Math.PI / 2;
          fGrp.add(petal);
        }
        handAnchor.add(fGrp);
      };

      buildSunflower(0, 0.275, 0.015, 1.1);
      buildSunflower(-0.078, 0.23, 0.02, 0.82);
      buildSunflower(0.078, 0.23, 0.02, 0.82);
    } else if (handheld === 'tote_bag') {
      const strapMat = clayMat('#C59F76', 0.75);
      [-0.036, 0.036].forEach((sx) => {
        const strap = new THREE.Mesh(
          new THREE.TorusGeometry(0.082, 0.012, 8, 18, Math.PI),
          strapMat,
        );
        strap.rotation.y = Math.PI / 2;
        strap.position.set(0.056 + sx, -0.082, 0);
        handAnchor.add(strap);
      });
      const bag = new THREE.Mesh(
        new RoundedBoxGeometry(0.115, 0.25, 0.215, 3, 0.025),
        clayMat(hColor, 0.78),
      );
      bag.position.set(0.056, -0.208, 0);
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.018, 0.12, 0.125, 2, 0.012),
        clayMat(shadeHex(hColor, -0.08).getHex(), 0.78),
      );
      pocket.position.set(0.113, -0.218, 0);
      const badge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12),
        clayMat('#E86F82', 0.5),
      );
      badge.rotation.z = Math.PI / 2;
      badge.position.set(0.123, -0.178, 0.038);
      handAnchor.add(bag, pocket, badge);
    } else if (handheld === 'mini_umbrella') {
      // Tall, wide protective umbrella clearing head & hats cleanly (~1.92m rim, 2.16m dome)
      const stickMat = clayMat('#7D5333', 0.55);
      const metalMat = clayMat('#D6CEC4', 0.35, 0.35);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 1.38, 10),
        stickMat,
      );
      stick.position.set(0, 0.57, 0);

      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.014, 8, 16, Math.PI),
        stickMat,
      );
      hook.rotation.z = Math.PI;
      hook.position.set(0.034, -0.118, 0);

      const runner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.055, 10),
        metalMat,
      );
      runner.position.set(0, 1.07, 0);

      const canopyPts = [
        new THREE.Vector2(0.005, 0.24),
        new THREE.Vector2(0.26, 0.205),
        new THREE.Vector2(0.52, 0.115),
        new THREE.Vector2(0.72, 0.0),
      ];
      const canopyMat = clayMat(hColor, 0.52);
      canopyMat.side = THREE.DoubleSide;
      const canopy = new THREE.Mesh(new THREE.LatheGeometry(canopyPts, 24), canopyMat);
      canopy.position.set(0, 1.13, 0);

      const edgeTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.718, 0.016, 8, 32),
        clayMat('#FFFDF7', 0.6),
      );
      edgeTrim.rotation.x = Math.PI / 2;
      edgeTrim.position.set(0, 1.13, 0);

      // 8 delicate underside ribs connecting runner collar to canopy rim
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const pA = new THREE.Vector3(0, 1.08, 0);
        const pB = new THREE.Vector3(Math.cos(ang) * 0.69, 1.13, Math.sin(ang) * 0.69);
        const mid = pA.clone().add(pB).multiplyScalar(0.5);
        const rib = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, pA.distanceTo(pB), 6),
          metalMat,
        );
        rib.position.copy(mid);
        rib.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          pB.clone().sub(pA).normalize(),
        );
        handAnchor.add(rib);
      }

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.09, 10),
        stickMat,
      );
      tip.position.set(0, 1.405, 0);

      handAnchor.add(stick, hook, runner, canopy, edgeTrim, tip);
    } else if (equippedFood === 'bbq_meat_skewer') {
      const skewerGroup = new THREE.Group();
      skewerGroup.rotation.x = 0.24;
      skewerGroup.rotation.z = -0.08;
      const stickMat = clayMat('#D9B47E', 0.72);
      const meatMat = glossyClayMat('#B94E28', 0.36);
      const searMat = clayMat('#4C2615', 0.78);
      const redPepMat = glossyClayMat('#E34D3C', 0.38);
      const yelPepMat = glossyClayMat('#F4B93D', 0.42);
      const grnPepMat = glossyClayMat('#63AD48', 0.44);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.011, 0.44, 8),
        stickMat,
      );
      stick.position.set(0, 0.14, 0);
      skewerGroup.add(stick);

      [
        {y: 0.08, geo: new THREE.SphereGeometry(0.036, 9, 8), scale: [1.1, 0.72, 1.0], mat: grnPepMat},
        {y: 0.14, geo: new RoundedBoxGeometry(0.072, 0.062, 0.068, 2, 0.018), scale: [1, 1, 1], mat: meatMat},
        {y: 0.20, geo: new RoundedBoxGeometry(0.066, 0.034, 0.064, 2, 0.01), scale: [1, 1, 1], mat: yelPepMat},
        {y: 0.255, geo: new RoundedBoxGeometry(0.074, 0.062, 0.068, 2, 0.018), scale: [1, 1, 1], mat: meatMat},
        {y: 0.31, geo: new RoundedBoxGeometry(0.062, 0.032, 0.062, 2, 0.01), scale: [1, 1, 1], mat: redPepMat},
      ].forEach((chunk, ci) => {
        const m = new THREE.Mesh(chunk.geo, chunk.mat);
        m.position.set(0, chunk.y, 0);
        m.scale.set(chunk.scale[0], chunk.scale[1], chunk.scale[2]);
        m.rotation.y = ci * 0.42;
        skewerGroup.add(m);
        if (chunk.mat === meatMat) {
          const charBar = new THREE.Mesh(
            new RoundedBoxGeometry(0.078, 0.012, 0.072, 1, 0.004),
            searMat,
          );
          charBar.position.set(0, chunk.y, 0);
          charBar.rotation.y = ci * 0.42;
          skewerGroup.add(charBar);
        }
      });
      handAnchor.add(skewerGroup);
    } else if (equippedFood === 'bbq_grilled_fish') {
      const fishPlateGroup = new THREE.Group();
      fishPlateGroup.position.set(0.01, 0.03, 0.02);
      fishPlateGroup.rotation.x = -0.35;
      fishPlateGroup.rotation.z = -0.14;

      const bambooMat = clayMat('#D8B37C', 0.72);
      const leafMat = clayMat('#529446', 0.62);
      const fishSkinMat = glossyClayMat('#DF8E3A', 0.36);
      const fishCharMat = clayMat('#5C3116', 0.76);
      const lemonMat = glossyClayMat('#F9DC5C', 0.38);

      const handleStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.012, 0.24, 8),
        bambooMat,
      );
      handleStick.position.set(0, 0.03, 0);

      const leafTray = new THREE.Mesh(
        new RoundedBoxGeometry(0.16, 0.024, 0.28, 2, 0.012),
        leafMat,
      );
      leafTray.position.set(0, 0.14, 0.04);

      const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), fishSkinMat);
      fishBody.scale.set(0.75, 0.56, 1.55);
      fishBody.position.set(0, 0.175, 0.03);

      const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.075, 6), fishSkinMat);
      fishTail.rotation.x = Math.PI / 2;
      fishTail.scale.set(0.38, 1, 1.0);
      fishTail.position.set(0, 0.175, 0.155);

      [-0.03, 0.02, 0.07].forEach((fz) => {
        const mark = new THREE.Mesh(
          new RoundedBoxGeometry(0.088, 0.012, 0.014, 1, 0.004),
          fishCharMat,
        );
        mark.position.set(0, 0.205, fz);
        mark.rotation.y = 0.24;
        fishPlateGroup.add(mark);
      });

      const lemon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.012, 10),
        lemonMat,
      );
      lemon.position.set(0.042, 0.162, -0.03);
      fishPlateGroup.add(handleStick, leafTray, fishBody, fishTail, lemon);
      handAnchor.add(fishPlateGroup);
    } else if (equippedFood === 'bbq_corn_sausage') {
      const comboGroup = new THREE.Group();
      comboGroup.rotation.x = 0.2;
      comboGroup.rotation.z = -0.06;

      const stickMat = clayMat('#D8B37C', 0.72);
      const cornMat = glossyClayMat('#F6C93E', 0.42);
      const butterMat = glossyClayMat('#FFF199', 0.3);
      const sausageMat = glossyClayMat('#C94933', 0.32);
      const searMat = clayMat('#522414', 0.76);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.011, 0.42, 8),
        stickMat,
      );
      stick.position.set(0, 0.13, 0);

      const cornCob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.038, 0.14, 12),
        cornMat,
      );
      cornCob.position.set(-0.026, 0.21, 0);
      cornCob.rotation.z = 0.12;

      const butterPat = new THREE.Mesh(
        new RoundedBoxGeometry(0.034, 0.018, 0.034, 1, 0.005),
        butterMat,
      );
      butterPat.position.set(-0.028, 0.25, 0.034);

      const sausage = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.115, 6, 10),
        sausageMat,
      );
      sausage.position.set(0.034, 0.21, 0.008);
      sausage.rotation.z = -0.1;

      [-0.03, 0.0, 0.03].forEach((sy) => {
        const notch = new THREE.Mesh(
          new RoundedBoxGeometry(0.056, 0.009, 0.056, 1, 0.003),
          searMat,
        );
        notch.position.set(0.034, 0.21 + sy, 0.008);
        notch.rotation.z = 0.16;
        comboGroup.add(notch);
      });

      comboGroup.add(stick, cornCob, butterPat, sausage);
      handAnchor.add(comboGroup);
    } else if (equippedFood === 'drink_water') {
      const bottleGroup = new THREE.Group();
      bottleGroup.rotation.x = 0.16;
      bottleGroup.rotation.z = -0.05;
      const plasticMat = new THREE.MeshStandardMaterial({
        color: '#CBEFFF',
        roughness: 0.18,
        metalness: 0.05,
        transparent: true,
        opacity: 0.86,
      });
      const capMat = glossyClayMat('#2A7FB2', 0.28);
      const labelMat = glossyClayMat('#4AB1E6', 0.34);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.165, 12), plasticMat);
      body.position.y = 0.11;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.068, 12), labelMat);
      label.position.y = 0.11;
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.038, 0.04, 12), plasticMat);
      shoulder.position.y = 0.212;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.028, 10), capMat);
      cap.position.y = 0.244;
      bottleGroup.add(body, label, shoulder, cap);
      handAnchor.add(bottleGroup);
    } else if (equippedFood === 'drink_strawberry_milk') {
      const milkGroup = new THREE.Group();
      milkGroup.rotation.x = 0.18;
      milkGroup.rotation.z = -0.06;
      const cartonMat = clayMat('#FFB2CE', 0.56);
      const bandMat = clayMat('#FFF8FA', 0.62);
      const berryMat = glossyClayMat('#EB4876', 0.32);
      const strawMat = glossyClayMat('#F45886', 0.3);

      const carton = new THREE.Mesh(
        new RoundedBoxGeometry(0.086, 0.135, 0.072, 2, 0.01),
        cartonMat,
      );
      carton.position.y = 0.1;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.058, 0.042, 4), cartonMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.186;
      const band = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.048, 0.076, 1, 0.005), bandMat);
      band.position.y = 0.1;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), berryMat);
      berry.position.set(0, 0.1, 0.04);
      const strawStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.075, 6), strawMat);
      strawStem.position.set(0.018, 0.21, 0);
      strawStem.rotation.z = -0.24;
      milkGroup.add(carton, roof, band, berry, strawStem);
      handAnchor.add(milkGroup);
    } else if (equippedFood === 'drink_matcha_can' || equippedFood === 'drink_cola') {
      const canGroup = new THREE.Group();
      canGroup.rotation.x = 0.16;
      canGroup.rotation.z = -0.06;
      const isMatcha = equippedFood === 'drink_matcha_can';
      const bodyMat = glossyClayMat(isMatcha ? '#62B36E' : '#EB6834', 0.26);
      const labelMat = glossyClayMat(isMatcha ? '#E8F7E3' : '#FFF4D8', 0.36);
      const rimMat = glossyClayMat('#DCE4EC', 0.18);

      const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.138, 14), bodyMat);
      canBody.position.y = 0.105;
      const canLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.062, 14), labelMat);
      canLabel.position.y = 0.105;
      const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.036, 0.014, 14), rimMat);
      topRim.position.y = 0.178;
      const botRim = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.012, 14), rimMat);
      botRim.position.y = 0.034;
      canGroup.add(canBody, canLabel, topRim, botRim);
      handAnchor.add(canGroup);
    }
  }

  // ========== SCULPTED CHIBI-SIMS HEAD & EXPRESSIVE FACE ==========
  const headPivot = new THREE.Group();
  headPivot.position.set(0, HEAD_PIVOT_Y, 0);
  bodyPivot.add(headPivot);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.076, 0.092, 16),
    skinMat,
  );
  neck.position.y = -0.004;
  headPivot.add(neck);

  // Sculpted head mesh (already centered at HEAD_CY = 0.30)
  const headMesh = new THREE.Mesh(createSculptedHeadGeometry(), skinMat);
  headPivot.add(headMesh);

  // Detailed Ears nested cleanly beside Nendoroid cheek/jaw contour
  const innerEarMat = clayMat(shadeHex(config.skinTone, -0.11).getHex(), 0.72);
  [-1, 1].forEach((side) => {
    const earGrp = new THREE.Group();
    earGrp.position.set(side * 0.298, 0.252, -0.01);
    earGrp.rotation.y = -side * 0.22;

    const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 12), skinMat);
    earOuter.scale.set(0.6, 1.0, 0.72);
    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), innerEarMat);
    earInner.scale.set(0.42, 0.72, 0.45);
    earInner.position.set(side * 0.012, 0, 0.008);
    earGrp.add(earOuter, earInner);
    headPivot.add(earGrp);
  });

  // Optional Soft Rosy Cheeks positioned right beneath large chibi eye corners
  if (config.blush) {
    const blushPatchGeo = new THREE.SphereGeometry(0.048, 14, 10);
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(blushPatchGeo, cheekMat);
      cheek.scale.set(1.38, 0.72, 0.08);
      const [cx, cy, cz] = headSurfacePoint(117, side * 42, 0.0022);
      cheek.position.set(cx, cy, cz);
      cheek.rotation.y = side * 0.48;
      headPivot.add(cheek);
    });
  }

  // ========== CONFORMAL BIG CHIBI FACIAL SYSTEM ==========
  const eyelids: THREE.Mesh[] = [];
  const openEyeGroup = new THREE.Group();
  const closedEyeGroup = new THREE.Group();
  closedEyeGroup.visible = false;

  const eyeLatMin = 80;
  const eyeLatMax = 115;

  ([-1, 1] as const).forEach((side) => {
    const lonA = side === -1 ? -46 : 10;
    const lonB = side === -1 ? -10 : 46;
    const patchGeo = createHeadConformalPatchGeometry(
      eyeLatMin,
      eyeLatMax,
      lonA,
      lonB,
      0.0028,
      20,
      16,
    );

    const openTex = createChibiEyeTexture(config.eyeColor, config.eyeStyle, side);
    const openMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: openTex,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.24,
      metalness: 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    openEyeGroup.add(new THREE.Mesh(patchGeo, openMat));

    const closedTex = createChibiEyeTexture(config.eyeColor, 'sleep_closed', side);
    const closedMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: closedTex,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.34,
      metalness: 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    closedEyeGroup.add(new THREE.Mesh(patchGeo, closedMat));
  });
  headPivot.add(openEyeGroup, closedEyeGroup);

  // Clean Sculpted Eyebrows aligned smoothly above the big chibi eyes
  const browBaseCol = new THREE.Color(config.hairColor);
  const browLum = {h: 0, s: 0, l: 0};
  browBaseCol.getHSL(browLum);
  if (browLum.l > 0.58) browBaseCol.setHSL(browLum.h, browLum.s * 0.85, 0.44);
  else browBaseCol.lerp(new THREE.Color('#1A1412'), 0.32);
  const eyebrowMat = clayMat(browBaseCol.getHex(), 0.54);

  [-1, 1].forEach((side) => {
    const es = config.eyeStyle;
    const ex = config.expression;
    const isPout = ex === 'pout';
    const isCool = es === 'cool' || ex === 'confident';
    const isHappy =
      es === 'happy_arc' ||
      es === 'joy_xd' ||
      es === 'sparkle' ||
      ex === 'joy_open';

    const browLat = isPout ? 78 : isCool ? 78 : isHappy ? 74 : 76;
    const innerLat = isPout ? browLat + 3.2 : isCool ? browLat + 1.8 : browLat + 0.6;
    const midLat = isPout ? browLat - 0.4 : isCool ? browLat : browLat - 2.2;
    const outerLat = isPout ? browLat - 3.8 : isCool ? browLat + 0.4 : browLat + 0.8;

    const lonInner = side * 15;
    const lonMid = side * 27;
    const lonOuter = side * 39;

    const brow = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          headSurfacePoint(innerLat, lonInner, 0.0034),
          headSurfacePoint(midLat, lonMid, 0.0038),
          headSurfacePoint(outerLat, lonOuter, 0.0032),
        ],
        isPout || isCool ? 0.0046 : 0.0042,
        12,
        6,
        0.24,
      ),
      eyebrowMat,
    );
    headPivot.add(brow);
  });

  // Conformal Cute Chibi Mouth + Nose Button
  const mouthTex = createChibiMouthTexture(config.expression);
  const mouthPatchGeo = createHeadConformalPatchGeometry(107, 142, -22, 22, 0.0026, 18, 14);
  const mouthMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map: mouthTex,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.42,
    metalness: 0.0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  headPivot.add(new THREE.Mesh(mouthPatchGeo, mouthMat));

  // ========== MODULAR STYLIZED 3D CLAY HAIR SYSTEM ==========
  const hairAssembly = buildCharacterHair(config, hairMat, topMat);
  headPivot.add(hairAssembly.root);

  // ========== STANDARDIZED HEADWEAR & ACCESSORIES ON HAT ATTACHMENT POINTS ==========
  const {crownTop, crownTilted, headbandArc, templeLeft, templeRight} =
    hairAssembly.attachments;
  const accGroup = hairAssembly.hairAccessories;
  const headItemCol = config.headItemColor || config.topColor;

  if (config.headItem === 'beret') {
    const beretMat = clayMat(headItemCol, 0.66);
    const rimMat = clayMat(shadeHex(headItemCol, -0.14).getHex(), 0.72);
    // Ordered bottom-up for crisp outward-facing Three.js LatheGeometry normals
    const pts = [
      new THREE.Vector2(0.245, -0.008),
      new THREE.Vector2(0.268, 0.0),
      new THREE.Vector2(0.32, 0.024),
      new THREE.Vector2(0.332, 0.072),
      new THREE.Vector2(0.248, 0.114),
      new THREE.Vector2(0.1, 0.124),
      new THREE.Vector2(0.0, 0.118),
    ];
    const beretGeo = new THREE.LatheGeometry(pts, 28);
    beretGeo.scale(1.06, 0.96, 1.0);
    const beretBody = new THREE.Mesh(beretGeo, beretMat);
    beretBody.position.set(
      crownTilted.position.x,
      crownTilted.position.y - 0.078,
      crownTilted.position.z,
    );
    beretBody.rotation.copy(crownTilted.rotation);

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.02, 10, 28), rimMat);
    band.rotation.x = Math.PI / 2;
    band.scale.set(1.04, 0.98, 1.0);
    const bandHolder = new THREE.Group();
    bandHolder.position.set(
      crownTilted.position.x,
      crownTilted.position.y - 0.074,
      crownTilted.position.z,
    );
    bandHolder.rotation.copy(crownTilted.rotation);
    bandHolder.add(band);

    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.026, 6, 8), rimMat);
    stem.position.set(
      crownTilted.position.x + 0.018,
      crownTilted.position.y + 0.044,
      crownTilted.position.z,
    );
    stem.rotation.copy(crownTilted.rotation);
    accGroup.add(beretBody, bandHolder, stem);
  } else if (config.headItem === 'sunhat') {
    const hatMat = clayMat(headItemCol || '#EBD08E', 0.74);
    const ribbonMat = clayMat('#E57A6B', 0.65);
    // Ordered inner-underbrim -> outer-brim -> top-crown for outward normals
    const pts = [
      new THREE.Vector2(0.262, 0.006),
      new THREE.Vector2(0.42, -0.022),
      new THREE.Vector2(0.518, -0.042),
      new THREE.Vector2(0.516, -0.028),
      new THREE.Vector2(0.43, -0.008),
      new THREE.Vector2(0.278, 0.018),
      new THREE.Vector2(0.245, 0.118),
      new THREE.Vector2(0.16, 0.14),
      new THREE.Vector2(0.0, 0.146),
    ];
    const hatGeo = new THREE.LatheGeometry(pts, 32);
    hatGeo.scale(1.06, 1.0, 0.98);
    const pos = hatGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r > 0.28) {
        pos.setY(i, y + Math.sin(Math.atan2(z, x) * 2) * 0.015 * ((r - 0.28) / 0.23));
      }
    }
    hatGeo.computeVertexNormals();

    const sunhat = new THREE.Mesh(hatGeo, hatMat);
    sunhat.position.set(crownTop.position.x, crownTop.position.y - 0.068, crownTop.position.z);
    sunhat.rotation.copy(crownTop.rotation);

    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.274, 0.282, 0.036, 24), ribbonMat);
    ribbon.scale.set(1.06, 1, 0.98);
    ribbon.position.set(crownTop.position.x, crownTop.position.y - 0.036, crownTop.position.z);
    ribbon.rotation.copy(crownTop.rotation);
    accGroup.add(sunhat, ribbon);
  } else if (config.headItem === 'cap') {
    const capCol = headItemCol || '#4B86B4';
    const capMat = clayMat(capCol, 0.6);
    const darkCapMat = clayMat(shadeHex(capCol, -0.14).getHex(), 0.64);
    const trimMat = clayMat('#F7F3EA', 0.62);

    const capGrp = new THREE.Group();
    // Roomy sporty dome covering crown cleanly down to brow & temples while bangs peek out underneath
    capGrp.position.set(crownTop.position.x, crownTop.position.y - 0.168, crownTop.position.z - 0.004);
    capGrp.rotation.set(-0.08, 0, 0);

    const domeGeo = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
    domeGeo.scale(0.382, 0.252, 0.368);
    const dome = new THREE.Mesh(domeGeo, capMat);

    const rimGeo = new THREE.TorusGeometry(1, 0.018, 10, 32);
    rimGeo.rotateX(Math.PI / 2);
    rimGeo.scale(0.376, 1, 0.362);
    const rim = new THREE.Mesh(rimGeo, darkCapMat);
    rim.position.y = -0.004;

    const visorShape = new THREE.Shape();
    visorShape.moveTo(-0.255, 0);
    visorShape.bezierCurveTo(-0.25, 0.225, -0.135, 0.335, 0, 0.345);
    visorShape.bezierCurveTo(0.135, 0.335, 0.25, 0.225, 0.255, 0);
    visorShape.quadraticCurveTo(0, 0.078, -0.255, 0);

    const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 16,
    });
    visorGeo.rotateX(Math.PI / 2 + 0.1);
    const vPos = visorGeo.attributes.position;
    for (let i = 0; i < vPos.count; i++) {
      const vx = vPos.getX(i);
      const vz = vPos.getZ(i);
      vPos.setY(i, vPos.getY(i) - vx * vx * 0.62 - vz * 0.04);
    }
    visorGeo.computeVertexNormals();
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, 0.014, 0.272);

    const emblem = new THREE.Mesh(
      new RoundedBoxGeometry(0.088, 0.048, 0.018, 2, 0.008),
      trimMat,
    );
    emblem.position.set(0, 0.09, 0.352);
    emblem.rotation.x = -0.34;

    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), darkCapMat);
    btn.scale.set(1, 0.52, 1);
    btn.position.set(0, 0.252, 0);

    capGrp.add(dome, rim, visor, emblem, btn);
    accGroup.add(capGrp);
  } else if (config.headItem === 'beanie') {
    const knitCol = headItemCol || '#D89A48';
    const knitMat = clayMat(knitCol, 0.78);
    const cuffMat = clayMat(shadeHex(knitCol, -0.1).getHex(), 0.8);
    const pomMat = clayMat('#F8F4EC', 0.82);

    const beanieGrp = new THREE.Group();
    beanieGrp.position.set(crownTop.position.x, crownTop.position.y - 0.112, crownTop.position.z - 0.006);
    beanieGrp.rotation.set(-0.1, 0, 0);

    // Oversized plush knit beanie sitting snugly over hair without poke-through
    const pts = [
      new THREE.Vector2(0.352, -0.076),
      new THREE.Vector2(0.388, -0.068),
      new THREE.Vector2(0.384, 0.018),
      new THREE.Vector2(0.326, 0.112),
      new THREE.Vector2(0.195, 0.168),
      new THREE.Vector2(0.0, 0.178),
    ];
    const domeGeo = new THREE.LatheGeometry(pts, 32);
    domeGeo.scale(1.06, 1.0, 1.0);
    const dome = new THREE.Mesh(domeGeo, knitMat);

    const cuffGeo = new THREE.TorusGeometry(0.368, 0.048, 12, 32);
    cuffGeo.rotateX(Math.PI / 2);
    cuffGeo.scale(1.06, 1.0, 1.0);
    const cuff = new THREE.Mesh(cuffGeo, cuffMat);
    cuff.position.y = -0.064;

    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.064, 16, 12), pomMat);
    pom.position.set(0, 0.2, -0.01);

    beanieGrp.add(dome, cuff, pom);
    accGroup.add(beanieGrp);
  } else if (config.headItem === 'cat_ears') {
    const bandR = headbandArc.radius;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(bandR, 0.019, 10, 28, Math.PI),
      clayMat('#3A2B28', 0.65),
    );
    band.scale.set(1.01, 0.99, 1.0);
    band.position.copy(headbandArc.center);
    band.rotation.x = headbandArc.tiltX;
    accGroup.add(band);

    const earTopY = headbandArc.center.y + bandR * 0.99 * Math.cos(headbandArc.tiltX) - 0.012;
    const earZ = headbandArc.center.z - bandR * Math.sin(headbandArc.tiltX) * 0.52 + 0.022;
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.084, 0.145, 14), clayMat('#FFF8F2'));
      ear.scale.set(1.0, 1.0, 0.62);
      ear.position.set(side * 0.21, earTopY, earZ);
      ear.rotation.z = -side * 0.3;
      ear.rotation.x = headbandArc.tiltX;
      const inner = new THREE.Mesh(
        new THREE.ConeGeometry(0.046, 0.095, 12),
        clayMat(headItemCol || '#F497AC'),
      );
      inner.scale.set(1.0, 1.0, 0.52);
      inner.position.set(side * 0.21, earTopY - 0.012, earZ + 0.022);
      inner.rotation.z = -side * 0.3;
      inner.rotation.x = headbandArc.tiltX;
      accGroup.add(ear, inner);
    });
  } else if (config.headItem === 'flower_crown') {
    const bandR = headbandArc.radius;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(bandR, 0.017, 10, 28, Math.PI),
      clayMat('#5E9E69', 0.72),
    );
    band.scale.set(1.01, 0.99, 1.0);
    band.position.copy(headbandArc.center);
    band.rotation.x = headbandArc.tiltX;
    accGroup.add(band);

    const petalGeo = new THREE.SphereGeometry(0.019, 10, 8);
    petalGeo.scale(0.85, 1.15, 0.45);
    const coreMat = clayMat('#F7C844', 0.58);

    for (let i = 0; i < 5; i++) {
      const ang = -1.06 + i * 0.53;
      const fx = Math.sin(ang) * (bandR * 1.01 + 0.014);
      const fy = headbandArc.center.y + Math.cos(ang) * (bandR * 0.99 + 0.014) * Math.cos(headbandArc.tiltX);
      const fz = headbandArc.center.z - Math.cos(ang) * (bandR + 0.014) * Math.sin(headbandArc.tiltX);

      const flowerGrp = new THREE.Group();
      flowerGrp.position.set(fx, fy, fz);
      const radialN = new THREE.Vector3(
        Math.sin(ang),
        Math.cos(ang) * Math.cos(headbandArc.tiltX),
        -Math.cos(ang) * Math.sin(headbandArc.tiltX) + 0.22,
      ).normalize();
      flowerGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialN);

      const pMat = clayMat(i % 2 === 0 ? headItemCol || '#F7A8B8' : '#FFF3B8', 0.62);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, pMat);
        petal.position.set(Math.cos(pa) * 0.022, Math.sin(pa) * 0.022, 0);
        petal.rotation.z = pa - Math.PI / 2;
        flowerGrp.add(petal);
      }
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), coreMat);
      bud.scale.set(1, 1, 0.65);
      bud.position.z = 0.006;
      flowerGrp.add(bud);
      accGroup.add(flowerGrp);
    }
  } else if (config.headItem === 'ribbon_bow') {
    const bowMat = clayMat(headItemCol || '#6BAEE6', 0.56);
    const knotMat = clayMat(shadeHex(headItemCol || '#6BAEE6', -0.1).getHex(), 0.58);
    const bandR = headbandArc.radius;

    // Band sits flush on outer hair envelope
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(bandR, 0.02, 10, 28, Math.PI),
      bowMat,
    );
    band.scale.set(1.01, 0.99, 1.0);
    band.position.copy(headbandArc.center);
    band.rotation.x = headbandArc.tiltX;
    accGroup.add(band);

    // Sculpted bow mounted cleanly ON TOP of the headband arch so hair never hides it
    const bowAng = 0.56;
    const archR = bandR + 0.022;
    const bowGrp = new THREE.Group();
    bowGrp.position.set(
      Math.sin(bowAng) * archR * 1.01,
      headbandArc.center.y + Math.cos(bowAng) * archR * 0.99 * Math.cos(headbandArc.tiltX),
      headbandArc.center.z - Math.cos(bowAng) * archR * Math.sin(headbandArc.tiltX) + 0.012,
    );
    bowGrp.rotation.set(headbandArc.tiltX, -0.16, -bowAng * 0.72);

    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), bowMat);
      wing.scale.set(1.25, 0.76, 0.54);
      wing.position.set(side * 0.064, 0.008, 0);
      wing.rotation.z = side * 0.24;

      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.056, 6, 8), bowMat);
      tail.position.set(side * 0.036, -0.048, -0.006);
      tail.rotation.z = side * 0.42;
      bowGrp.add(wing, tail);
    });
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), knotMat);
    knot.scale.set(1.05, 0.92, 0.85);
    knot.position.set(0, 0.004, 0.016);
    bowGrp.add(knot);
    accGroup.add(bowGrp);
  } else if (config.headItem === 'hair_clip') {
    const clipMat1 = clayMat(headItemCol || '#F4A261', 0.45);
    const clipMat2 = clayMat('#FDF2D6', 0.48);
    const clipGrp = new THREE.Group();
    clipGrp.position.copy(templeRight.position);
    clipGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), templeRight.normal);

    const barGeo = new THREE.CapsuleGeometry(0.011, 0.068, 6, 10);
    barGeo.rotateZ(Math.PI / 2);
    const bar1 = new THREE.Mesh(barGeo, clipMat1);
    bar1.position.set(0, 0.013, 0.006);
    bar1.rotation.z = 0.08;
    const bar2 = new THREE.Mesh(barGeo, clipMat2);
    bar2.position.set(0, -0.013, 0.006);
    bar2.rotation.z = -0.06;
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), clipMat2);
    gem.position.set(0.028, 0.013, 0.01);
    clipGrp.add(bar1, bar2, gem);
    accGroup.add(clipGrp);
  } else if (config.headItem === 'flower_pin') {
    const petalMat = clayMat(headItemCol || '#FFF9F0', 0.58);
    const coreMat = clayMat('#F4B942', 0.54);
    const pinGrp = new THREE.Group();
    pinGrp.position.copy(templeLeft.position);
    pinGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), templeLeft.normal);

    const petalGeo = new THREE.SphereGeometry(0.022, 10, 10);
    petalGeo.scale(0.85, 1.15, 0.45);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = new THREE.Mesh(petalGeo, petalMat);
      p.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.005);
      p.rotation.z = a - Math.PI / 2;
      pinGrp.add(p);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), coreMat);
    core.scale.set(1, 1, 0.65);
    core.position.set(0, 0, 0.011);
    pinGrp.add(core);
    accGroup.add(pinGrp);
  }

  // ========== SCULPTED ACCESSORIES ==========
  const accCol = config.accessoryColor || '#4A3628';
  if (config.accessory === 'glasses' || config.accessory === 'sunglasses') {
    const isSun = config.accessory === 'sunglasses';
    const frameMat = glossyClayMat(accCol, 0.25);
    const lensMat = glossyClayMat('#1A1D24', 0.1);
    [-1, 1].forEach((side) => {
      const gx = side * 0.132;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.0095, 8, 22), frameMat);
      rim.position.set(gx, 0.25, 0.296);
      rim.rotation.y = side * 0.14;
      headPivot.add(rim);
      if (isSun) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.01, 18), lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.rotation.z = -side * 0.14;
        lens.position.set(gx, 0.25, 0.292);
        headPivot.add(lens);
      }
      const pStart = new THREE.Vector3(side * 0.204, 0.254, 0.288);
      const pEnd = new THREE.Vector3(side * 0.302, 0.258, 0.015);
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
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.013, 0.013, 2, 0.005), frameMat);
    bridge.position.set(0, 0.256, 0.302);
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

  let heldPetRig: PetRig | undefined;
  if (carryingPet) {
    const carryMoveType = PET_CATALOG[carryingPet.speciesId]?.moveType ?? 'walk';
    if (carryMoveType === 'fly') {
      heldPetRig = buildPetModel(carryingPet.speciesId, {
        scale: 1.08,
        sick: carryingPet.sick,
        withShadow: false,
      });
      // Orbit smoothly around the player's body in root space
      heldPetRig.root.position.set(0.72, 1.06, 0);
      heldPetRig.root.rotation.y = 0;
      root.add(heldPetRig.root);
    } else {
      heldPetRig = buildPetModel(carryingPet.speciesId, {
        scale: 1.08,
        sick: carryingPet.sick,
        withShadow: true,
      });
      // Orbit smoothly around the player on ground level in root space
      heldPetRig.root.position.set(0.85, 0, 0);
      heldPetRig.root.rotation.y = 0;
      root.add(heldPetRig.root);
    }
  }

  root.updateMatrixWorld(true);
  const headBounds = new THREE.Box3().setFromObject(headPivot);
  const headTopAbovePivot = Number.isFinite(headBounds.max.y)
    ? Math.max(0.28, headBounds.max.y - HEAD_PIVOT_Y)
    : 0.42;

  makeShadowed(root, true, true);
  shadowDisc.castShadow = false;
  if (heldPetRig?.shadowDisc) {
    heldPetRig.shadowDisc.castShadow = false;
  }

  return {
    root,
    bodyPivot,
    torsoGroup,
    skirtPivot,
    skirtDeformMeshes,
    headPivot,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    eyelids,
    openEyeGroup,
    closedEyeGroup,
    skipNaturalBlink:
      config.eyeStyle === 'happy_arc' ||
      config.eyeStyle === 'joy_xd' ||
      config.eyeStyle === 'wink',
    shadowDisc,
    holdPose,
    toolType: equippedTool,
    rodBobber: rodBobberObj,
    rodLine: rodLineObj,
    heldPetRig,
    headTopAbovePivot,
  };
}

export function updateAvatarRigAnimation(
  rig: AvatarRig,
  pose: AvatarPose,
  elapsed: number,
  isCozyEyes = false,
  poseProgress = 0,
): void {
  const isNaturalBlink = !isCozyEyes && !rig.skipNaturalBlink && elapsed % 4.5 > 4.38;
  const eyesClosed = pose === 'sleep' || isNaturalBlink;
  if (rig.openEyeGroup && rig.closedEyeGroup) {
    rig.openEyeGroup.visible = !eyesClosed;
    rig.closedEyeGroup.visible = eyesClosed;
  }
  if (rig.eyelids.length > 0) {
    const lidClosed = pose === 'sleep' || isCozyEyes;
    rig.eyelids.forEach((lid) => {
      const baseScaleY = (lid.userData.baseScaleY as number) ?? 0.06;
      const baseY = (lid.userData.baseY as number) ?? 0.046;
      lid.scale.y = lidClosed ? 1.15 : baseScaleY;
      lid.position.y = lidClosed ? 0 : baseY;
    });
  }

  if (rig.shadowDisc) {
    rig.shadowDisc.visible = pose !== 'sit' && pose !== 'sleep';
  }

  const hold = rig.holdPose || 'none';

  if (pose !== 'sit') {
    rig.leftLeg.position.z = 0;
    rig.rightLeg.position.z = 0;
    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.standGeo) {
          pair.mesh.geometry = pair.standGeo;
        }
      }
    }
  }

  if (pose === 'walk') {
    const swing = Math.sin(elapsed * 12);
    rig.leftLeg.rotation.x = swing * 0.55;
    rig.rightLeg.rotation.x = -swing * 0.55;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = Math.max(0, -swing) * 0.5 + 0.06;
    if (rig.rightKnee) rig.rightKnee.rotation.x = Math.max(0, swing) * 0.5 + 0.06;
    rig.leftArm.rotation.x = -swing * 0.45;
    if (rig.leftElbow) rig.leftElbow.rotation.x = HAND_POSES.none.elbowX - 0.08 + Math.max(0, -swing) * 0.15;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX + swing * 0.06;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX + swing * 0.1;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX + swing * 0.22;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + swing * 0.05;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = swing * 0.45;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.none.elbowX - 0.08 + Math.max(0, swing) * 0.15;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = Math.abs(Math.cos(elapsed * 12)) * 0.075;
    rig.bodyPivot.rotation.x = 0.06;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = Math.sin(elapsed * 6) * 0.03;
  } else if (pose === 'creep') {
    // Khum nhẹ người, bước rất chậm rón rén khi kéo nhẹ joystick lúc cầm vợt
    const swing = Math.sin(elapsed * 3.1);
    rig.leftLeg.rotation.x = swing * 0.24 - 0.14;
    rig.rightLeg.rotation.x = -swing * 0.24 - 0.14;
    rig.leftLeg.rotation.z = -0.04;
    rig.rightLeg.rotation.z = 0.04;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.42 + Math.max(0, -swing) * 0.24;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.42 + Math.max(0, swing) * 0.24;

    rig.leftArm.rotation.x = -0.28 - swing * 0.11;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.58;

    if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + 0.14;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX + 0.16;
    } else {
      rig.rightArm.rotation.x = -0.28 + swing * 0.11;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.58;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.09 + Math.abs(Math.cos(elapsed * 3.1)) * 0.016;
    rig.bodyPivot.rotation.x = 0.27;
    rig.headPivot.rotation.x = -0.2;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'net_swing') {
    const u = THREE.MathUtils.clamp(poseProgress, 0, 1);
    let armX: number;
    let elbowX: number;
    let torsoLean: number;
    if (u < 0.28) {
      const t = u / 0.28;
      armX = THREE.MathUtils.lerp(HAND_POSES.carry_net.armX, -1.68, t);
      elbowX = THREE.MathUtils.lerp(HAND_POSES.carry_net.elbowX, -0.55, t);
      torsoLean = THREE.MathUtils.lerp(0.05, -0.12, t);
    } else if (u < 0.66) {
      const t = Math.sin(((u - 0.28) / 0.38) * (Math.PI * 0.5));
      armX = THREE.MathUtils.lerp(-1.68, 0.24, t);
      elbowX = THREE.MathUtils.lerp(-0.55, -0.16, t);
      torsoLean = THREE.MathUtils.lerp(-0.12, 0.24, t);
    } else {
      const t = (u - 0.66) / 0.34;
      armX = THREE.MathUtils.lerp(0.24, HAND_POSES.carry_net.armX, t);
      elbowX = THREE.MathUtils.lerp(-0.16, HAND_POSES.carry_net.elbowX, t);
      torsoLean = THREE.MathUtils.lerp(0.24, 0.04, t);
    }
    rig.leftLeg.rotation.x = -0.12;
    rig.rightLeg.rotation.x = 0.14;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.16;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.12;
    rig.leftArm.rotation.x = -0.22;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.34;
    rig.rightArm.rotation.x = armX;
    if (rig.rightElbow) rig.rightElbow.rotation.x = elbowX;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.02;
    rig.bodyPivot.rotation.x = torsoLean;
    rig.headPivot.rotation.x = -torsoLean * 0.45;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'jump') {
    rig.leftLeg.rotation.x = -0.34;
    rig.rightLeg.rotation.x = 0.24;
    rig.leftLeg.rotation.z = -0.05;
    rig.rightLeg.rotation.z = 0.05;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.62;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.42;

    rig.leftArm.rotation.x = -0.58;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.42;
    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX - 0.08;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX - 0.12;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX - 0.15;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX - 0.06;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = -0.58;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.42;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0.03;
    rig.bodyPivot.rotation.x = -0.06;
    rig.headPivot.rotation.x = -0.04;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'fish_cast') {
    const u = THREE.MathUtils.clamp(poseProgress, 0, 1);
    // Smooth two-beat cast: wind up back (0..0.38) then brisk forward throw (0.38..1)
    let armX: number;
    let elbowX: number;
    let torsoLean: number;
    if (u < 0.38) {
      const t = u / 0.38;
      armX = THREE.MathUtils.lerp(-0.42, -1.25, t);
      elbowX = THREE.MathUtils.lerp(-0.98, -0.52, t);
      torsoLean = THREE.MathUtils.lerp(0, -0.1, t);
    } else {
      const t = Math.sin(((u - 0.38) / 0.62) * (Math.PI * 0.5));
      armX = THREE.MathUtils.lerp(-1.25, -0.18, t);
      elbowX = THREE.MathUtils.lerp(-0.52, -0.45, t);
      torsoLean = THREE.MathUtils.lerp(-0.1, 0.12, t);
    }
    rig.leftLeg.rotation.x = -0.08;
    rig.rightLeg.rotation.x = 0.08;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.08;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.05;
    rig.leftArm.rotation.x = -0.12;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.25;
    rig.rightArm.rotation.x = armX;
    if (rig.rightElbow) rig.rightElbow.rotation.x = elbowX;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = torsoLean;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'fish_wait') {
    const breathe = Math.sin(elapsed * 2.2) * 0.018;
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0.04;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.18;
    rig.rightArm.rotation.x = HAND_POSES.carry_front.armX - 0.06 + breathe;
    if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX + 0.18;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = 0.03;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'fish_pull') {
    const u = THREE.MathUtils.clamp(poseProgress, 0, 1);
    const snap = Math.sin(Math.min(1, u * 1.45) * Math.PI);
    rig.leftLeg.rotation.x = 0.12 * snap;
    rig.rightLeg.rotation.x = -0.14 * snap;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.12 * snap;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.18 * snap;
    rig.leftArm.rotation.x = -0.35 * snap;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.45 * snap;
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(-0.48, -1.32, snap);
    if (rig.rightElbow) rig.rightElbow.rotation.x = THREE.MathUtils.lerp(-0.8, -0.58, snap);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0.02 * snap;
    rig.bodyPivot.rotation.x = -0.14 * snap;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'sit') {
    const sitBreath = Math.sin(elapsed * 1.9);
    const breath01 = 0.5 + 0.5 * sitBreath;

    // Unified natural sitting posture across all skirts, shorts, and trousers:
    // level horizontal thighs resting squarely on bench, knees bent cleanly downward,
    // and skirt meshes swapped to seated-drape geometry instead of tilting a stiff cone
    rig.leftLeg.position.z = 0.036;
    rig.rightLeg.position.z = 0.036;
    rig.leftLeg.rotation.x = -1.38;
    rig.rightLeg.rotation.x = -1.38;
    rig.leftLeg.rotation.z = -0.02;
    rig.rightLeg.rotation.z = 0.02;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 1.32;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 1.32;

    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.sitGeo) {
          pair.mesh.geometry = pair.sitGeo;
        }
      }
    }

    rig.leftArm.rotation.x = -0.44 + sitBreath * 0.015;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.62;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX + sitBreath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX + sitBreath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX + sitBreath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + sitBreath * 0.01;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = -0.44 + sitBreath * 0.015;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.62;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77 + breath01 * 0.008;
    rig.headPivot.position.y = HEAD_PIVOT_Y + breath01 * 0.01;
    rig.bodyPivot.position.y = -0.152;
    rig.bodyPivot.rotation.x = 0.02 + sitBreath * 0.008;
    rig.headPivot.rotation.x = Math.sin(elapsed * 1.9 - 0.5) * 0.015;
    rig.headPivot.rotation.z = Math.sin(elapsed * 0.85) * 0.01;
  } else if (pose === 'bath') {
    const bathBreath = Math.sin(elapsed * 1.65);
    const breath01 = 0.5 + 0.5 * bathBreath;

    rig.leftLeg.position.z = 0.036;
    rig.rightLeg.position.z = 0.036;
    rig.leftLeg.rotation.x = -1.46;
    rig.rightLeg.rotation.x = -1.46;
    rig.leftLeg.rotation.z = -0.02;
    rig.rightLeg.rotation.z = 0.02;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.08;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.08;

    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.sitGeo) {
          pair.mesh.geometry = pair.sitGeo;
        }
      }
    }

    rig.leftArm.rotation.x = -0.3 + bathBreath * 0.03;
    rig.rightArm.rotation.x = -0.3 - bathBreath * 0.03;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.38;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.38;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77 + breath01 * 0.01;
    rig.headPivot.position.y = HEAD_PIVOT_Y + breath01 * 0.012;
    rig.bodyPivot.position.y = -0.245;
    rig.bodyPivot.rotation.x = -0.04 + bathBreath * 0.01;
    rig.headPivot.rotation.x = Math.sin(elapsed * 1.65 - 0.4) * 0.018;
    rig.headPivot.rotation.z = Math.sin(elapsed * 0.75) * 0.012;
  } else if (pose === 'sleep') {
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.08;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.08;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0.88;
    rig.bodyPivot.rotation.x = -Math.PI / 2;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'play_pet') {
    const wave = Math.sin(elapsed * 11);
    const waveOpp = Math.sin(elapsed * 11 + Math.PI * 0.85);
    rig.leftLeg.rotation.x = -0.1;
    rig.rightLeg.rotation.x = 0.08;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.16;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.14;

    rig.leftArm.rotation.x = -0.84 + wave * 0.24;
    rig.rightArm.rotation.x = -0.84 + waveOpp * 0.24;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.58 + Math.cos(elapsed * 11) * 0.26;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.58 - Math.cos(elapsed * 11) * 0.26;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.025 + Math.abs(Math.sin(elapsed * 5.5)) * 0.014;
    rig.bodyPivot.rotation.x = 0.16;
    rig.headPivot.rotation.x = 0.12 + Math.sin(elapsed * 5.5) * 0.035;
    rig.headPivot.rotation.z = Math.sin(elapsed * 3.5) * 0.045;
  } else {
    // Gentle breathing Idle: subtle body bob & soft breathing rhythm
    const breathPhase = elapsed * 2.15;
    const breath = Math.sin(breathPhase);
    const breath01 = 0.5 + 0.5 * breath;

    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0;
    rig.bodyPivot.position.y = breath01 * 0.016;
    rig.bodyPivot.rotation.x = breath * 0.012;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77 + breath01 * 0.014;
    rig.headPivot.position.y = HEAD_PIVOT_Y + breath01 * 0.018;
    rig.headPivot.rotation.x = Math.sin(breathPhase - 0.5) * 0.024;
    rig.headPivot.rotation.z = Math.sin(elapsed * 0.95) * 0.016;

    rig.leftArm.rotation.x = Math.sin(breathPhase - 0.3) * 0.024;
    if (rig.leftElbow) rig.leftElbow.rotation.x = HAND_POSES.none.elbowX - breath01 * 0.03;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX + breath * 0.014;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX + breath * 0.014;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX + breath * 0.014;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + breath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = -Math.sin(breathPhase - 0.3) * 0.024;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.none.elbowX - breath01 * 0.03;
    }
  }

  if (rig.heldPetRig) {
    const orbitAngle = elapsed * 2.15;
    const isFlyPet = (PET_CATALOG[rig.heldPetRig.speciesId]?.moveType ?? 'walk') === 'fly';
    if (isFlyPet) {
      const orbitRadius = 0.72;
      const orbitY = 1.05 + Math.sin(elapsed * 3.0) * 0.11;
      rig.heldPetRig.root.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        orbitY,
        Math.sin(orbitAngle) * orbitRadius,
      );
      rig.heldPetRig.root.rotation.y = -orbitAngle;
      updatePetAnimation(rig.heldPetRig, 'held_orbit', elapsed, {baseScale: 1.08});
    } else {
      const orbitRadius = 0.85;
      rig.heldPetRig.root.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        0,
        Math.sin(orbitAngle) * orbitRadius,
      );
      rig.heldPetRig.root.rotation.y = -orbitAngle;
      updatePetAnimation(rig.heldPetRig, 'walk', elapsed, {baseScale: 1.08});
    }
  }
}
