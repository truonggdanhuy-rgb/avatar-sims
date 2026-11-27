import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AvatarConfig, BoxHeadSkinId, EyeStyle, ExpressionStyle, HeadItemStyle} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

export const BOX_W = 0.62;
export const BOX_H = 0.56;
export const BOX_D = 0.56;
export const BOX_R = 0.068;
export const BOX_CY = 0.31;
export const BOX_TOP_Y = BOX_CY + BOX_H * 0.5; // 0.59
export const BOX_FRONT_Z = BOX_D * 0.5; // 0.28
export const BOX_FACE_PANEL_Z = 0.287; // Front plane of recessed/framed face plate
export const BOX_FACE_DECAL_Z = 0.2895; // Eye/mouth decal plane

export interface BoxHeadAttachments {
  crownTop: {position: THREE.Vector3; rotation: THREE.Euler};
  crownTilted: {position: THREE.Vector3; rotation: THREE.Euler};
  templeLeft: {position: THREE.Vector3; normal: THREE.Vector3};
  templeRight: {position: THREE.Vector3; normal: THREE.Vector3};
  earLeft: {position: THREE.Vector3};
  earRight: {position: THREE.Vector3};
}

export interface BoxHeadAssembly {
  root: THREE.Group;
  accessoriesAnchor: THREE.Group;
  attachments: BoxHeadAttachments;
  isDarkFace: boolean;
}

const _shellTexCache = new Map<string, THREE.CanvasTexture>();
const _eyeTexCache = new Map<string, THREE.CanvasTexture>();
const _mouthTexCache = new Map<string, THREE.CanvasTexture>();

function shadeHex(hex: string, factor: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(0.94, Math.max(0.1, hsl.l + factor)));
  return c;
}

function getBoxLuminance(hex: string): number {
  const c = new THREE.Color(hex);
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

export function isFullCrownHat(headItem: HeadItemStyle | undefined, isPeppaMascot: boolean): boolean {
  if (isPeppaMascot) return true;
  if (!headItem || headItem === 'none') return false;
  return (
    headItem === 'cap' ||
    headItem === 'rainbow_cap' ||
    headItem === 'beanie' ||
    headItem === 'cc_beanie' ||
    headItem === 'bunny_beanie' ||
    headItem === 'bucket_hat' ||
    headItem === 'frog_bucket' ||
    headItem === 'chick_hat' ||
    headItem === 'cloud_bucket' ||
    headItem === 'beret' ||
    headItem === 'sunhat' ||
    headItem === 'sunflower_hat' ||
    headItem === 'non_la' ||
    headItem === 'khan_dong' ||
    headItem === 'picnic_bonnet' ||
    headItem === 'pompom_ear_hood' ||
    headItem === 'royal_crown'
  );
}

function getSkinBaseTexture(skin: BoxHeadSkinId, baseHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `box_shell_v1_${skin}_${baseHex}`;
  const cached = _shellTexCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  if (skin === 'classic_carton') {
    // Subtle corrugated kraft cardboard fibers + fine speckles
    ctx.fillStyle = 'rgba(110, 68, 32, 0.08)';
    for (let y = 0; y < size; y += 6) {
      ctx.fillRect(0, y, size, 2);
    }
    ctx.fillStyle = 'rgba(255, 240, 215, 0.08)';
    for (let i = 0; i < 160; i++) {
      const px = (i * 73) % size;
      const py = (i * 137) % size;
      ctx.fillRect(px, py, 3, 2);
    }
    // Crisp dark cardboard flap border seam
    ctx.strokeStyle = 'rgba(92, 54, 24, 0.22)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, size - 16, size - 16);
  } else if (skin === 'parcel_love') {
    // Soft gift paper diagonal subtle stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = 10;
    for (let d = -size; d < size * 2; d += 34) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + size, size);
      ctx.stroke();
    }
  } else if (skin === 'student_milk') {
    // Clean milk-carton pastel stripe accent
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, size * 0.72, size, size * 0.28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(0, size * 0.1, size, 12);
  } else if (skin === 'witch_rune') {
    // Deep velvet starry dots
    ctx.fillStyle = 'rgba(248, 206, 94, 0.45)';
    const stars = [
      [34, 42],
      [210, 56],
      [62, 198],
      [194, 204],
      [128, 34],
      [44, 128],
      [212, 134],
    ];
    stars.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(248, 206, 94, 0.28)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, size - 20, size - 20);
  } else if (skin === 'midautumn_lantern') {
    // Golden silk brocade border & subtle cloud motif
    ctx.strokeStyle = 'rgba(248, 206, 88, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, size - 20, size - 20);
    ctx.strokeStyle = 'rgba(248, 206, 88, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, 48, 0, Math.PI * 2);
    ctx.stroke();
  } else if (skin === 'tv_screen' || skin === 'hero_visor') {
    // Fine anodized brushed panel grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, size - 20, size - 20);
  } else {
    // Smooth toy-box subtle bevel highlight border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, size - 20, size - 20);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData = {sharedCache: true};
  _shellTexCache.set(key, tex);
  return tex;
}

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

export function createBoxHeadEyeTexture(
  eyeColor: string,
  style: EyeStyle | 'sleep_closed',
  side: -1 | 1,
  isDarkFace: boolean,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const effectiveStyle: EyeStyle | 'sleep_closed' =
    style === 'wink' ? (side === 1 ? 'happy_arc' : 'box_dot') : style;
  const key = `box_eye_v1_${eyeColor}_${effectiveStyle}_${side}_${isDarkFace ? 'd' : 'l'}`;
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
  const cy = h * 0.54;
  const dir = side === -1 ? 1 : -1;
  const strokeInk = isDarkFace ? '#7DF9FF' : '#231917';

  if (effectiveStyle === 'sleep_closed' || effectiveStyle === 'happy_arc') {
    ctx.strokeStyle = strokeInk;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (effectiveStyle === 'sleep_closed') {
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(cx - 86, cy + 4);
      ctx.quadraticCurveTo(cx, cy + 32, cx + 86, cy + 4);
      ctx.stroke();
    } else {
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(cx - 88, cy + 20);
      ctx.quadraticCurveTo(cx, cy - 42, cx + 88, cy + 20);
      ctx.stroke();
    }
  } else if (effectiveStyle === 'joy_xd') {
    ctx.strokeStyle = strokeInk;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    const tipX = cx + dir * 70;
    const tailX = cx - dir * 74;
    const armY = 56;
    ctx.beginPath();
    ctx.moveTo(tailX, cy - armY);
    ctx.quadraticCurveTo(cx + dir * 12, cy - armY * 0.26, tipX, cy);
    ctx.quadraticCurveTo(cx + dir * 12, cy + armY * 0.26, tailX, cy + armY);
    ctx.stroke();
  } else if (effectiveStyle === 'box_dot') {
    // Classic Danbo / Minimalist Box Character glossy oval dot eyes
    ctx.fillStyle = isDarkFace ? '#8EF9FF' : '#1E1614';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 42, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDarkFace ? '#FFFFFF' : '#FFFDFB';
    ctx.beginPath();
    ctx.ellipse(cx - 14, cy - 14, 14, 13, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 14, cy + 16, 6.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (effectiveStyle === 'box_pixel') {
    // Crisp retro-arcade square pixel eyes (4x4 stylized grid)
    const pColor = isDarkFace ? '#5EFCE8' : eyeColor || '#264653';
    const px = 26;
    const ox = cx - px * 2;
    const oy = cy - px * 2;
    const grid = [
      [1, 1, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ];
    ctx.fillStyle = pColor;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 1) {
          ctx.fillRect(ox + c * px, oy + r * px, px - 2, px - 2);
        }
      }
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ox + px, oy + px, px - 2, px - 2);
  } else if (effectiveStyle === 'box_heart') {
    // Big adorable glossy heart eyes
    const hColor = isDarkFace ? '#FF6B9A' : '#E84A72';
    ctx.save();
    ctx.translate(cx, cy + 6);
    ctx.fillStyle = hColor;
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.bezierCurveTo(-84, 6, -86, -66, -34, -66);
    ctx.bezierCurveTo(-10, -66, 0, -44, 0, -34);
    ctx.bezierCurveTo(0, -44, 10, -66, 34, -66);
    ctx.bezierCurveTo(86, -66, 84, 6, 0, 56);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = isDarkFace ? '#FFE4EE' : '#4A1828';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-28, -28, 16, 11, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (effectiveStyle === 'box_sleepy') {
    // Cozy half-drooped chill box eyes
    ctx.fillStyle = '#FFFDFB';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 74, 54, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 74, 54, 0, 0, Math.PI);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = eyeColor || '#4B5563';
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#18141A';
    ctx.beginPath();
    ctx.arc(cx, cy + 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 12, cy + 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = strokeInk;
    ctx.lineWidth = 17;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 82, cy + 12);
    ctx.lineTo(cx + 82, cy + 12);
    ctx.stroke();
  } else {
    // Stylized Expressive Box-Chibi Eyes ('bright', 'gentle', 'sparkle', 'heroic', 'cool')
    const darkHex = `#${shadeHex(eyeColor, -0.32).getHexString()}`;
    const midHex = `#${new THREE.Color(eyeColor).getHexString()}`;
    const lightHex = `#${shadeHex(eyeColor, 0.25).getHexString()}`;
    const lashColor = isDarkFace ? '#E6FAFF' : '#1E1615';

    const traceBoxEye = () => {
      ctx.beginPath();
      if (effectiveStyle === 'cool') {
        ctx.roundRect(cx - 88, cy - 34, 176, 86, [12, 12, 34, 34]);
      } else if (effectiveStyle === 'heroic') {
        ctx.roundRect(cx - 88, cy - 64, 176, 134, 38);
      } else if (effectiveStyle === 'gentle') {
        ctx.ellipse(cx, cy + 4, 88, 80, dir * -0.06, 0, Math.PI * 2);
      } else {
        ctx.roundRect(cx - 86, cy - 72, 172, 148, 52);
      }
      ctx.closePath();
    };

    ctx.save();
    traceBoxEye();
    ctx.clip();

    ctx.fillStyle = '#FFFDFB';
    ctx.fillRect(0, 0, w, h);

    const irisRx = effectiveStyle === 'cool' ? 50 : 66;
    const irisRy = effectiveStyle === 'cool' ? 48 : 72;
    const irisCx = cx + dir * 3;
    const irisCy = effectiveStyle === 'cool' ? cy + 10 : cy + 4;

    ctx.beginPath();
    ctx.ellipse(irisCx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
    const grad = ctx.createLinearGradient(0, irisCy - irisRy, 0, irisCy + irisRy);
    grad.addColorStop(0.0, darkHex);
    grad.addColorStop(0.5, midHex);
    grad.addColorStop(0.88, lightHex);
    grad.addColorStop(1.0, midHex);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(irisCx, irisCy, irisRx * 0.45, irisRy * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#16121A';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(irisCx - irisRx * 0.34, irisCy - irisRy * 0.32, irisRx * 0.27, irisRy * 0.24, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(irisCx + irisRx * 0.32, irisCy + irisRy * 0.34, irisRx * 0.14, 0, Math.PI * 2);
    ctx.fill();

    if (effectiveStyle === 'sparkle') {
      drawFourPointStar(ctx, irisCx - irisRx * 0.12, irisCy + irisRy * 0.38, irisRx * 0.22, irisRx * 0.08);
    }
    ctx.restore();

    ctx.strokeStyle = lashColor;
    ctx.lineWidth = effectiveStyle === 'cool' ? 14 : 15;
    traceBoxEye();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData = {sharedCache: true};
  _eyeTexCache.set(key, tex);
  return tex;
}

export function createBoxHeadMouthTexture(
  expr: ExpressionStyle,
  isDarkFace: boolean,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `box_mouth_v1_${expr}_${isDarkFace ? 'd' : 'l'}`;
  const cached = _mouthTexCache.get(key);
  if (cached) return cached;

  const w = 320;
  const h = 220;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.52;
  const ink = isDarkFace ? '#8EF9FF' : '#3E221D';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;

  if (expr === 'sweet_smile') {
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy - 14);
    ctx.quadraticCurveTo(cx, cy + 30, cx + 50, cy - 14);
    ctx.stroke();
  } else if (expr === 'joy_open') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy - 22);
    ctx.quadraticCurveTo(cx, cy - 14, cx + 56, cy - 22);
    ctx.bezierCurveTo(cx + 56, cy + 44, cx - 56, cy + 44, cx - 56, cy - 22);
    ctx.closePath();
    ctx.fillStyle = '#B83948';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cx - 56, cy - 24, 112, 16);
    ctx.fillStyle = '#F7929F';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, 40, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = isDarkFace ? '#FFE4EE' : '#3E1C1C';
    ctx.stroke();
  } else if (expr === 'cat_w') {
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy - 8);
    ctx.quadraticCurveTo(cx - 28, cy + 28, cx, cy - 2);
    ctx.quadraticCurveTo(cx + 28, cy + 28, cx + 56, cy - 8);
    ctx.stroke();
  } else if (expr === 'gentle_o') {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 24, 28, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#B83D4C';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = isDarkFace ? '#FFE4EE' : '#3E1C1C';
    ctx.stroke();
  } else if (expr === 'confident') {
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(cx - 48, cy + 4);
    ctx.quadraticCurveTo(cx + 6, cy + 12, cx + 54, cy - 16);
    ctx.stroke();
  } else if (expr === 'pout') {
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy + 14);
    ctx.quadraticCurveTo(cx, cy - 16, cx + 38, cy + 14);
    ctx.stroke();
  } else if (expr === 'box_zigzag') {
    // Classic goofy cartoon box-character zigzag grin
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 64, cy - 4);
    ctx.lineTo(cx - 34, cy + 18);
    ctx.lineTo(cx, cy - 8);
    ctx.lineTo(cx + 34, cy + 18);
    ctx.lineTo(cx + 64, cy - 4);
    ctx.stroke();
  } else if (expr === 'box_blep') {
    // Playful :P mouth with pink tongue sticking out
    ctx.fillStyle = '#F26B82';
    ctx.beginPath();
    ctx.roundRect(cx - 6, cy + 2, 34, 42, [4, 4, 18, 18]);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = isDarkFace ? '#FFE4EE' : '#3E1C1C';
    ctx.stroke();

    ctx.strokeStyle = ink;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 2);
    ctx.lineTo(cx + 50, cy + 2);
    ctx.stroke();
  } else if (expr === 'box_triangle') {
    // Classic Danbo cardboard open triangle mouth
    ctx.fillStyle = isDarkFace ? '#8EF9FF' : '#2E1E1A';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx + 34, cy + 24);
    ctx.lineTo(cx - 34, cy + 24);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData = {sharedCache: true};
  _mouthTexCache.set(key, tex);
  return tex;
}

/**
 * Generates a rounded-square arch TubeGeometry hugging the top + left/right sides
 * of the Box Head cleanly so headbands, cat ears, bows, and headphones never float.
 */
export function createBoxHeadbandCurveGeometry(
  insetRadiusOffset = 0.008,
  tubeRadius = 0.018,
  zOffset = 0,
): THREE.BufferGeometry {
  const hw = BOX_W * 0.5 + insetRadiusOffset; // ~0.318
  const topY = BOX_TOP_Y + insetRadiusOffset; // ~0.598
  const sideBotY = BOX_CY - 0.02; // ~0.29

  const pts = [
    new THREE.Vector3(-hw, sideBotY, zOffset),
    new THREE.Vector3(-hw, topY - 0.095, zOffset),
    new THREE.Vector3(-hw + 0.028, topY - 0.025, zOffset),
    new THREE.Vector3(-hw + 0.105, topY, zOffset),
    new THREE.Vector3(0, topY + 0.006, zOffset),
    new THREE.Vector3(hw - 0.105, topY, zOffset),
    new THREE.Vector3(hw - 0.028, topY - 0.025, zOffset),
    new THREE.Vector3(hw, topY - 0.095, zOffset),
    new THREE.Vector3(hw, sideBotY, zOffset),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.35);
  return new THREE.TubeGeometry(curve, 32, tubeRadius, 10, false);
}

/**
 * Builds the composite 3D Box Head ("Đầu Hộp") assembly with skin-specific 3D accents
 * and clean attachment anchors for hats, headbands, and glasses.
 */
export function buildBoxHeadAssembly(
  config: AvatarConfig,
  options: {isPeppaMascot: boolean},
): BoxHeadAssembly {
  const root = new THREE.Group();
  const accessoriesAnchor = new THREE.Group();
  root.add(accessoriesAnchor);

  const skinId: BoxHeadSkinId = config.boxHeadSkin || 'cream_cube';
  const baseColor = config.boxHeadColor || config.skinTone || '#F7D7BC';
  const hideTopEars = isFullCrownHat(config.headItem, options.isPeppaMascot);

  const isScreenSkin = skinId === 'tv_screen' || skinId === 'hero_visor';
  const isWitchDark = skinId === 'witch_rune' && getBoxLuminance(baseColor) < 0.35;
  const isDarkFace = isScreenSkin || isWitchDark;

  // 1. Main Outer Rounded Box Shell
  const shellTex = getSkinBaseTexture(skinId, baseColor);
  const shellMat = shellTex
    ? new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        map: shellTex,
        roughness: isScreenSkin ? 0.34 : 0.62,
        metalness: isScreenSkin ? 0.16 : 0.02,
      })
    : clayMat(baseColor, 0.62, 0.02);

  const mainBox = new THREE.Mesh(
    new RoundedBoxGeometry(BOX_W, BOX_H, BOX_D, 4, BOX_R),
    shellMat,
  );
  mainBox.position.set(0, BOX_CY, 0);
  root.add(mainBox);

  // 2. Framed Front Face Plate (creates layered 3D tactile depth on every skin)
  const frameTrimCol =
    skinId === 'tv_screen'
      ? '#64748B'
      : skinId === 'hero_visor'
        ? '#38BDF8'
        : skinId === 'witch_rune'
          ? '#E9B949'
          : skinId === 'pompom_box'
            ? '#6D442B'
            : skinId === 'midautumn_lantern'
              ? '#F4C446'
              : `#${shadeHex(baseColor, -0.11).getHexString()}`;

  const facePanelCol =
    skinId === 'tv_screen'
      ? '#161C28'
      : skinId === 'hero_visor'
        ? '#141B29'
        : skinId === 'witch_rune'
          ? '#231D2E'
          : skinId === 'classic_carton'
            ? `#${shadeHex(baseColor, 0.06).getHexString()}`
            : skinId === 'panda_box' || skinId === 'student_milk'
              ? '#FFFDF9'
              : `#${shadeHex(baseColor, 0.04).getHexString()}`;

  const frameBorder = new THREE.Mesh(
    new RoundedBoxGeometry(0.524, 0.448, 0.02, 3, 0.042),
    isScreenSkin || skinId === 'witch_rune' || skinId === 'midautumn_lantern'
      ? glossyClayMat(frameTrimCol, 0.28)
      : clayMat(frameTrimCol, 0.66),
  );
  frameBorder.position.set(0, 0.305, 0.273);
  root.add(frameBorder);

  const facePanelMat = isScreenSkin
    ? new THREE.MeshStandardMaterial({
        color: facePanelCol,
        emissive: skinId === 'tv_screen' ? '#102438' : '#0E1C36',
        emissiveIntensity: 0.48,
        roughness: 0.16,
        metalness: 0.08,
      })
    : clayMat(facePanelCol, 0.58);

  const facePanel = new THREE.Mesh(
    new RoundedBoxGeometry(0.496, 0.422, 0.022, 3, 0.036),
    facePanelMat,
  );
  facePanel.position.set(0, 0.305, 0.276);
  root.add(facePanel);

  // 3. Minimal Side Speaker / Hinge / Stamp Accents (replaces human ears cleanly)
  const hasHeadphone = config.headItem === 'headphone';
  if (!hasHeadphone) {
    const sideAccentMat = clayMat(
      skinId === 'classic_carton' ? '#A47148' : frameTrimCol,
      0.56,
    );
    [-1, 1].forEach((side) => {
      const sideBadge = new THREE.Mesh(
        new RoundedBoxGeometry(0.016, 0.11, 0.11, 2, 0.022),
        sideAccentMat,
      );
      sideBadge.position.set(side * (BOX_W * 0.5 + 0.002), BOX_CY - 0.01, 0);
      root.add(sideBadge);
    });
  }

  // 4. Skin-Specific 3D Silhouette Details (composite multi-part geometry)
  if (skinId === 'classic_carton') {
    const tapeMat = new THREE.MeshStandardMaterial({
      color: '#E9CC8B',
      roughness: 0.36,
      metalness: 0.02,
      transparent: true,
      opacity: 0.9,
    });
    const topTape = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.012, BOX_D - 0.04, 2, 0.004),
      tapeMat,
    );
    topTape.position.set(0, BOX_TOP_Y + 0.001, 0);
    const backTape = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.18, 0.012, 2, 0.004),
      tapeMat,
    );
    backTape.position.set(0, BOX_TOP_Y - 0.085, -BOX_FRONT_Z - 0.002);
    const seamLine = new THREE.Mesh(
      new THREE.BoxGeometry(BOX_W - 0.08, 0.006, 0.01),
      clayMat('#8C5B32', 0.78),
    );
    seamLine.position.set(0, BOX_TOP_Y + 0.002, 0.001);
    seamLine.rotation.y = Math.PI / 2;

    // Fragile heart shipping label on right side
    const labelCard = new THREE.Mesh(
      new RoundedBoxGeometry(0.012, 0.11, 0.15, 2, 0.008),
      clayMat('#FFFDF6', 0.72),
    );
    labelCard.position.set(BOX_W * 0.5 + 0.005, BOX_CY + 0.1, 0.09);
    const redMark = new THREE.Mesh(
      new RoundedBoxGeometry(0.014, 0.04, 0.09, 1, 0.004),
      clayMat('#DC4C4C', 0.65),
    );
    redMark.position.set(BOX_W * 0.5 + 0.006, BOX_CY + 0.12, 0.09);
    root.add(topTape, backTape, seamLine, labelCard, redMark);
  } else if (skinId === 'parcel_love') {
    const ribbonMat = glossyClayMat('#E85D75', 0.42);
    const wrapBandX = new THREE.Mesh(
      new RoundedBoxGeometry(0.08, BOX_H + 0.014, BOX_D + 0.014, 2, 0.02),
      ribbonMat,
    );
    wrapBandX.position.set(0, BOX_CY, -0.02);
    const seal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.018, 16),
      clayMat('#FFFDF6', 0.55),
    );
    seal.position.set(0, BOX_TOP_Y + 0.008, -0.02);
    root.add(wrapBandX, seal);
    if (!hideTopEars) {
      [-1, 1].forEach((side) => {
        const bowLoop = new THREE.Mesh(
          new RoundedBoxGeometry(0.11, 0.048, 0.055, 2, 0.018),
          ribbonMat,
        );
        bowLoop.position.set(side * 0.065, BOX_TOP_Y + 0.032, -0.02);
        bowLoop.rotation.z = side * 0.28;
        root.add(bowLoop);
      });
    }
  } else if (skinId === 'tv_screen') {
    const metalMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      roughness: 0.24,
      metalness: 0.52,
    });
    const tipMat = glossyClayMat('#F43F5E', 0.26);
    [-1, 1].forEach((side) => {
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.048, 0.032, 14),
        metalMat,
      );
      dial.rotation.z = Math.PI / 2;
      dial.position.set(BOX_W * 0.5 + 0.014, BOX_CY + side * 0.09, 0.08);
      root.add(dial);
    });
    if (!hideTopEars) {
      const baseDome = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.072, 0.028, 14),
        metalMat,
      );
      baseDome.position.set(0, BOX_TOP_Y + 0.014, 0);
      root.add(baseDome);
      [-1, 1].forEach((side) => {
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.011, 0.18, 8),
          metalMat,
        );
        rod.position.set(side * 0.078, BOX_TOP_Y + 0.092, 0);
        rod.rotation.z = -side * 0.44;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), tipMat);
        ball.position.set(side * 0.118, BOX_TOP_Y + 0.168, 0);
        root.add(rod, ball);
      });
    }
  } else if (skinId === 'cat_box' && !hideTopEars) {
    const outerEarMat = clayMat(baseColor, 0.62);
    const innerEarMat = clayMat('#F497AC', 0.66);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.14, 4), outerEarMat);
      ear.rotation.y = Math.PI / 4;
      ear.scale.set(1.0, 1.0, 0.64);
      ear.position.set(side * 0.185, BOX_TOP_Y + 0.058, 0.02);
      ear.rotation.z = -side * 0.18;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.088, 4), innerEarMat);
      inner.rotation.y = Math.PI / 4;
      inner.scale.set(1.0, 1.0, 0.48);
      inner.position.set(side * 0.185, BOX_TOP_Y + 0.048, 0.048);
      inner.rotation.z = -side * 0.18;
      root.add(ear, inner);
    });
  } else if (skinId === 'bunny_box') {
    const tailPom = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), clayMat('#FFF8FA', 0.74));
    tailPom.position.set(0, BOX_CY - 0.14, -BOX_FRONT_Z - 0.026);
    root.add(tailPom);
    if (!hideTopEars) {
      const outerEarMat = clayMat(baseColor, 0.62);
      const innerEarMat = clayMat('#FF9EB5', 0.68);
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new RoundedBoxGeometry(0.095, 0.25, 0.058, 3, 0.028), outerEarMat);
        ear.position.set(side * 0.145, BOX_TOP_Y + 0.105, 0.0);
        ear.rotation.z = -side * 0.14;
        const inner = new THREE.Mesh(new RoundedBoxGeometry(0.048, 0.17, 0.022, 2, 0.012), innerEarMat);
        inner.position.set(side * 0.145, BOX_TOP_Y + 0.1, 0.024);
        inner.rotation.z = -side * 0.14;
        root.add(ear, inner);
      });
    }
  } else if (skinId === 'frog_box' && !hideTopEars) {
    const frogMat = clayMat(baseColor, 0.62);
    const scleraMat = glossyClayMat('#FFFFFF', 0.2);
    const pupilMat = glossyClayMat('#1B1D24', 0.14);
    [-1, 1].forEach((side) => {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), frogMat);
      bump.position.set(side * 0.185, BOX_TOP_Y + 0.022, 0.08);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), scleraMat);
      eye.position.set(side * 0.185, BOX_TOP_Y + 0.032, 0.125);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pupilMat);
      pupil.position.set(side * 0.185, BOX_TOP_Y + 0.034, 0.175);
      root.add(bump, eye, pupil);
    });
  } else if (skinId === 'panda_box') {
    const darkPandaMat = clayMat('#22242C', 0.66);
    const backBand = new THREE.Mesh(
      new RoundedBoxGeometry(BOX_W + 0.012, 0.14, 0.05, 2, 0.02),
      darkPandaMat,
    );
    backBand.position.set(0, BOX_CY - 0.14, -BOX_FRONT_Z + 0.01);
    root.add(backBand);
    if (!hideTopEars) {
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(
          new THREE.CylinderGeometry(0.082, 0.082, 0.052, 16),
          darkPandaMat,
        );
        ear.rotation.x = Math.PI / 2;
        ear.position.set(side * 0.21, BOX_TOP_Y + 0.036, 0.01);
        ear.rotation.z = -side * 0.2;
        root.add(ear);
      });
    }
  } else if (skinId === 'student_milk') {
    const capMat = glossyClayMat('#FFFFFF', 0.36);
    const strawMat = glossyClayMat('#E85D75', 0.42);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.06, 0.026, 14), capMat);
    cap.position.set(-0.14, BOX_TOP_Y + 0.013, 0.11);
    root.add(cap);
    if (!hideTopEars) {
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10), strawMat);
      straw.position.set(0.16, BOX_TOP_Y + 0.052, -0.06);
      straw.rotation.z = -0.22;
      root.add(straw);
    }
  } else if (skinId === 'witch_rune') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#F4C446',
      roughness: 0.28,
      metalness: 0.48,
    });
    const moonSeal = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 20), goldMat);
    moonSeal.rotation.x = Math.PI / 2;
    moonSeal.position.set(0, BOX_TOP_Y + 0.008, 0.02);
    root.add(moonSeal);
  } else if (skinId === 'pompom_box') {
    const caramelMat = glossyClayMat('#6D442B', 0.36);
    const topDrip = new THREE.Mesh(
      new RoundedBoxGeometry(BOX_W + 0.016, 0.088, BOX_D + 0.016, 3, 0.038),
      caramelMat,
    );
    topDrip.position.set(0, BOX_TOP_Y - 0.032, 0);
    root.add(topDrip);
    if (!hideTopEars) {
      const miniBeret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.082, 0.038, 18),
        caramelMat,
      );
      miniBeret.position.set(-0.04, BOX_TOP_Y + 0.024, 0.02);
      miniBeret.rotation.z = 0.14;
      root.add(miniBeret);
    }
  } else if (skinId === 'hero_visor') {
    const neonMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#38BDF8',
      emissiveIntensity: 0.65,
      roughness: 0.2,
    });
    const crest = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.026, 0.34, 2, 0.01), neonMat);
    crest.position.set(0, BOX_TOP_Y + 0.012, 0.02);
    root.add(crest);
  } else if (skinId === 'midautumn_lantern') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#F4C542',
      roughness: 0.28,
      metalness: 0.36,
    });
    const topCrown = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.024, 0.42, 2, 0.01), goldMat);
    topCrown.position.set(0, BOX_TOP_Y + 0.008, 0);
    root.add(topCrown);
  } else {
    // 'cream_cube' subtle corner seam + top minimalist vent badge
    const topCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.012, 0.24, 2, 0.006),
      clayMat(frameTrimCol, 0.65),
    );
    topCap.position.set(0, BOX_TOP_Y + 0.002, 0);
    root.add(topCap);
  }

  return {
    root,
    accessoriesAnchor,
    isDarkFace,
    attachments: {
      crownTop: {
        position: new THREE.Vector3(0, BOX_TOP_Y + 0.01, 0),
        rotation: new THREE.Euler(0, 0, 0),
      },
      crownTilted: {
        position: new THREE.Vector3(-0.032, BOX_TOP_Y + 0.032, -0.012),
        rotation: new THREE.Euler(-0.08, 0, 0.18),
      },
      templeLeft: {
        position: new THREE.Vector3(-0.265, BOX_TOP_Y - 0.07, 0.24),
        normal: new THREE.Vector3(-0.42, 0.24, 0.88).normalize(),
      },
      templeRight: {
        position: new THREE.Vector3(0.265, BOX_TOP_Y - 0.07, 0.24),
        normal: new THREE.Vector3(0.42, 0.24, 0.88).normalize(),
      },
      earLeft: {
        position: new THREE.Vector3(-BOX_W * 0.5 - 0.01, BOX_CY, 0),
      },
      earRight: {
        position: new THREE.Vector3(BOX_W * 0.5 + 0.01, BOX_CY, 0),
      },
    },
  };
}
