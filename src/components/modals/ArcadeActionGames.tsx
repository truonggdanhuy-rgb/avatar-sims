import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  CloudRain,
  Compass,
  Flag,
  Heart,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Wind,
  Zap,
} from 'lucide-react';
import {AvatarConfig} from '../../types/game';
import {soundFX} from '../../utils/sound';

const CANVAS_W = 620;
const CANVAS_H = 340;
const PLAYER_W = 24;
const PLAYER_H = 34;

interface AvatarLook {
  headColor: string;
  shirtColor: string;
  pantsColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

function resolveAvatarLook(avatar?: AvatarConfig): AvatarLook {
  return {
    headColor: avatar?.boxHeadColor || '#D4A373',
    shirtColor: avatar?.topColor || '#38BDF8',
    pantsColor: avatar?.bottomColor || '#334155',
  };
}

function drawBoxHeadCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    look: AvatarLook;
    facing: 1 | -1;
    vx: number;
    vy: number;
    onGround: boolean;
    onLadder: boolean;
    slowed?: boolean;
    invulnTimer?: number;
    time: number;
  },
) {
  ctx.save();
  if (opts.invulnTimer && opts.invulnTimer > 0 && Math.floor(opts.time * 16) % 2 === 0) {
    ctx.globalAlpha = 0.42;
  }

  const cx = x + w / 2;
  const walkCycle = opts.onLadder
    ? Math.sin(opts.time * 15)
    : opts.onGround && Math.abs(opts.vx) > 10
      ? Math.sin(opts.time * 17)
      : 0;

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, y + h, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = opts.look.pantsColor;
  const legSwing = walkCycle * 4.5;
  ctx.fillRect(cx - 6 + legSwing * 0.5, y + h - 10, 5, 10);
  ctx.fillRect(cx + 1 - legSwing * 0.5, y + h - 10, 5, 10);

  // Shoes
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(cx - 6.5 + legSwing * 0.5, y + h - 3, 6, 3);
  ctx.fillRect(cx + 0.5 - legSwing * 0.5, y + h - 3, 6, 3);

  // Body / Shirt
  ctx.fillStyle = opts.look.shirtColor;
  ctx.beginPath();
  ctx.roundRect(cx - 8, y + 14, 16, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Arms
  ctx.fillStyle = '#FCE7D6';
  const armY = opts.onLadder ? y + 11 + walkCycle * 4.5 : y + 15 - legSwing * 0.4;
  const armRightY = opts.onLadder ? y + 11 - walkCycle * 4.5 : y + 15 + legSwing * 0.4;
  ctx.fillRect(cx - 11, armY, 4, 9);
  ctx.fillRect(cx + 7, armRightY, 4, 9);

  // Box Head
  ctx.fillStyle = opts.look.headColor;
  ctx.beginPath();
  ctx.roundRect(cx - 10, y - 2, 20, 17, 4);
  ctx.fill();
  ctx.strokeStyle = '#332419';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Box tape stripe
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(cx - 2.5, y - 2, 5, 4);

  // Face plate & eyes
  const eyeOffsetX = opts.facing * 2.2;
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.roundRect(cx - 7 + eyeOffsetX * 0.4, y + 2, 14, 10, 2);
  ctx.fill();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(cx - 3 + eyeOffsetX, y + 6.5, 1.5, 0, Math.PI * 2);
  ctx.arc(cx + 3 + eyeOffsetX, y + 6.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (surprised O if falling fast!)
  ctx.strokeStyle = '#E11D48';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (opts.vy > 280) {
    ctx.arc(cx + eyeOffsetX * 0.6, y + 9.8, 1.5, 0, Math.PI * 2);
  } else {
    ctx.arc(cx + eyeOffsetX * 0.6, y + 9.2, 2.2, 0.15, Math.PI - 0.15);
  }
  ctx.stroke();

  if (opts.slowed) {
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, y + h / 2, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRopeLadder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  tint = '#D97706',
) {
  const sway = Math.sin(time * 2.4 + y * 0.01) * 1.8;
  ctx.save();
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.quadraticCurveTo(x + 4 + sway, y + h / 2, x + 4, y + h);
  ctx.moveTo(x + w - 4, y);
  ctx.quadraticCurveTo(x + w - 4 + sway, y + h / 2, x + w - 4, y + h);
  ctx.stroke();

  ctx.strokeStyle = tint;
  ctx.lineWidth = 3.2;
  for (let ry = y + 10; ry < y + h - 4; ry += 16) {
    const t = (ry - y) / h;
    const off = Math.sin(t * Math.PI) * sway;
    ctx.beginPath();
    ctx.moveTo(x + 2 + off, ry);
    ctx.lineTo(x + w - 2 + off, ry);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTallTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  topY: number,
  trunkW: number,
  canopyTint: string,
) {
  const h = baseY - topY;
  const cx = x + trunkW / 2;

  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.roundRect(x, topY + 12, trunkW, h - 12, 4);
  ctx.fill();
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bark grooves
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.4)';
  ctx.lineWidth = 1.5;
  for (let by = topY + 34; by < baseY - 24; by += 36) {
    ctx.beginPath();
    ctx.moveTo(cx - trunkW * 0.2, by);
    ctx.lineTo(cx - trunkW * 0.2, by + 16);
    ctx.moveTo(cx + trunkW * 0.2, by + 10);
    ctx.lineTo(cx + trunkW * 0.2, by + 24);
    ctx.stroke();
  }

  // Lush layered canopy crown
  ctx.fillStyle = canopyTint;
  const blobs = [
    [cx - 32, topY + 16, 28],
    [cx + 32, topY + 16, 28],
    [cx, topY + 2, 34],
  ];
  for (const [bx, by, r] of blobs) {
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(cx - 6, topY - 4, 18, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================================
// 1. PARKOUR LEO TRÈO (3 MAPS WITH CRUMBLE LEDGES, WIND, THORNS & LIGHTNING ORBS)
// ============================================================================
interface ParkourPlatform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'ground' | 'branch' | 'rock' | 'cloud' | 'bounce' | 'crumble' | 'moving';
  moveDx?: number;
  moveDy?: number;
  moveSpeed?: number;
  thornRange?: [number, number]; // local x offset [start, end] covered in brambles!
}

interface ParkourLadder {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ParkourTree {
  x: number;
  baseY: number;
  topY: number;
  trunkW: number;
}

interface ParkourWindZone {
  x: number;
  y: number;
  w: number;
  h: number;
  forceX: number; // px/s^2 horizontal push
}

interface ParkourOrb {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  speed: number;
  phase: number;
}

interface ParkourStar {
  id: string;
  x: number;
  y: number;
}

interface ParkourCheckpoint {
  x: number;
  y: number;
}

interface ParkourMapConfig {
  id: 'forest_easy' | 'canyon_hard' | 'sky_extreme';
  name: string;
  difficulty: 'Dễ' | 'Khó' | 'Siêu Khó';
  lives: number;
  baseReward: number;
  badgeColor: string;
  desc: string;
  worldW: number;
  worldH: number;
  skyTop: string;
  skyBot: string;
  canopyTint: string;
  spawn: {x: number; y: number};
  goal: {x: number; y: number};
  platforms: ParkourPlatform[];
  ladders: ParkourLadder[];
  trees: ParkourTree[];
  windZones: ParkourWindZone[];
  patrolOrbs: ParkourOrb[];
  stars: ParkourStar[];
  checkpoints: ParkourCheckpoint[];
}

const PARKOUR_MAPS: ParkourMapConfig[] = [
  // MAP 1: RỪNG CỔ THỤ MÂY (Dễ · 4 Mạng · +8 CG + Sao)
  {
    id: 'forest_easy',
    name: 'Rừng Cổ Thụ Mây',
    difficulty: 'Dễ',
    lives: 4,
    baseReward: 8,
    badgeColor: '#10B981',
    desc: 'Cây cổ thụ, thang dây đu mây & nấm đàn hồi. Khởi động leo trèo!',
    worldW: 620,
    worldH: 1760,
    skyTop: '#0EA5E9',
    skyBot: '#DCFCE7',
    canopyTint: '#16A34A',
    spawn: {x: 80, y: 1656},
    goal: {x: 472, y: 100},
    trees: [
      {x: 190, baseY: 1760, topY: 1210, trunkW: 34},
      {x: 425, baseY: 1470, topY: 790, trunkW: 36},
      {x: 130, baseY: 980, topY: 360, trunkW: 34},
      {x: 455, baseY: 560, topY: 110, trunkW: 38},
    ],
    ladders: [
      {x: 158, y: 1475, w: 32, h: 225},
      {x: 392, y: 1125, w: 32, h: 255},
      {x: 164, y: 695, w: 32, h: 245},
      {x: 420, y: 315, w: 32, h: 235},
    ],
    platforms: [
      {id: 'f1', x: 0, y: 1700, w: 280, h: 60, kind: 'ground'},
      {id: 'f2', x: 140, y: 1475, w: 145, h: 22, kind: 'branch'},
      {id: 'f3', x: 310, y: 1380, w: 160, h: 22, kind: 'branch'},
      {id: 'f4', x: 470, y: 1364, w: 56, h: 16, kind: 'bounce'},
      {id: 'f5', x: 340, y: 1125, w: 145, h: 22, kind: 'branch'},
      {id: 'f6', x: 160, y: 1030, w: 120, h: 22, kind: 'moving', moveDx: 58, moveSpeed: 1.4},
      {id: 'f7', x: 75, y: 940, w: 155, h: 22, kind: 'branch'},
      {id: 'f8', x: 100, y: 695, w: 145, h: 22, kind: 'branch'},
      {id: 'f9', x: 270, y: 615, w: 110, h: 22, kind: 'cloud'},
      {id: 'f10', x: 400, y: 550, w: 140, h: 22, kind: 'branch'},
      {id: 'f11', x: 215, y: 420, w: 115, h: 22, kind: 'moving', moveDx: 72, moveSpeed: 1.65},
      {id: 'f12', x: 380, y: 315, w: 145, h: 22, kind: 'branch'},
      {id: 'f13', x: 245, y: 225, w: 92, h: 18, kind: 'bounce'},
      {id: 'f14', x: 390, y: 140, w: 175, h: 26, kind: 'cloud'},
    ],
    windZones: [],
    patrolOrbs: [],
    stars: [
      {id: 'fs1', x: 498, y: 1290},
      {id: 'fs2', x: 110, y: 895},
      {id: 'fs3', x: 325, y: 575},
      {id: 'fs4', x: 290, y: 145},
    ],
    checkpoints: [
      {x: 135, y: 940},
      {x: 465, y: 550},
    ],
  },

  // MAP 2: THUNG LŨNG GIÓ & THANG DÂY (Khó · 4 Mạng · +18 CG + Sao)
  {
    id: 'canyon_hard',
    name: 'Thung Lũng Gió & Thang Dây',
    difficulty: 'Khó',
    lives: 4,
    baseReward: 18,
    badgeColor: '#F59E0B',
    desc: 'Cầu gỗ mục dễ sập, gió hẻm núi đẩy lùi & bụi gai nhọn!',
    worldW: 700,
    worldH: 2150,
    skyTop: '#C2410C',
    skyBot: '#FEF3C7',
    canopyTint: '#D97706',
    spawn: {x: 68, y: 2046},
    goal: {x: 565, y: 106},
    trees: [
      {x: 530, baseY: 2150, topY: 1360, trunkW: 34},
      {x: 115, baseY: 1620, topY: 820, trunkW: 36},
      {x: 500, baseY: 1080, topY: 320, trunkW: 36},
    ],
    ladders: [
      {x: 505, y: 1660, w: 30, h: 245},
      {x: 148, y: 1125, w: 30, h: 265},
      {x: 472, y: 590, w: 30, h: 260},
    ],
    platforms: [
      {id: 'c1', x: 0, y: 2090, w: 200, h: 60, kind: 'ground'},
      {id: 'c2', x: 235, y: 2015, w: 90, h: 20, kind: 'crumble'},
      {id: 'c3', x: 360, y: 1945, w: 105, h: 20, kind: 'rock'},
      {id: 'c4', x: 485, y: 1905, w: 130, h: 22, kind: 'branch', thornRange: [86, 126]},
      {id: 'c5', x: 455, y: 1660, w: 145, h: 22, kind: 'branch'},
      {id: 'c6', x: 280, y: 1585, w: 92, h: 20, kind: 'crumble'},
      {id: 'c7', x: 140, y: 1500, w: 110, h: 22, kind: 'moving', moveDx: 55, moveSpeed: 1.85},
      {id: 'c8', x: 75, y: 1390, w: 165, h: 24, kind: 'rock', thornRange: [120, 160]},
      {id: 'c9', x: 95, y: 1125, w: 140, h: 22, kind: 'branch'},
      {id: 'c10', x: 270, y: 1045, w: 95, h: 20, kind: 'crumble'},
      {id: 'c11', x: 400, y: 970, w: 96, h: 20, kind: 'moving', moveDx: 78, moveSpeed: 2.05},
      {id: 'c12', x: 445, y: 850, w: 160, h: 22, kind: 'rock'},
      {id: 'c13', x: 565, y: 834, w: 50, h: 16, kind: 'bounce'},
      {id: 'c14', x: 415, y: 590, w: 145, h: 22, kind: 'branch', thornRange: [0, 36]},
      {id: 'c15', x: 240, y: 495, w: 92, h: 20, kind: 'crumble'},
      {id: 'c16', x: 95, y: 405, w: 105, h: 22, kind: 'moving', moveDy: 55, moveSpeed: 1.9},
      {id: 'c17', x: 235, y: 290, w: 95, h: 20, kind: 'crumble'},
      {id: 'c18', x: 375, y: 235, w: 80, h: 18, kind: 'bounce'},
      {id: 'c19', x: 495, y: 145, w: 155, h: 26, kind: 'rock'},
    ],
    windZones: [
      {x: 180, y: 1420, w: 320, h: 160, forceX: -245},
      {x: 200, y: 860, w: 330, h: 170, forceX: 255},
      {x: 110, y: 270, w: 340, h: 180, forceX: -275},
    ],
    patrolOrbs: [],
    stars: [
      {id: 'cs1', x: 280, y: 1965},
      {id: 'cs2', x: 325, y: 1530},
      {id: 'cs3', x: 315, y: 995},
      {id: 'cs4', x: 585, y: 740},
      {id: 'cs5', x: 285, y: 440},
      {id: 'cs6', x: 145, y: 300},
    ],
    checkpoints: [
      {x: 115, y: 1390},
      {x: 490, y: 850},
      {x: 475, y: 590},
    ],
  },

  // MAP 3: ĐỈNH THÁP MÂY ĐỊA NGỤC (Siêu Khó · 5 Mạng · +34 CG + Sao)
  {
    id: 'sky_extreme',
    name: 'Đỉnh Tháp Mây Địa Ngục',
    difficulty: 'Siêu Khó',
    lives: 5,
    baseReward: 34,
    badgeColor: '#DC2626',
    desc: 'Cầu sập liên hoàn, gió bão giật mạnh & cầu sét tuần tra! Thưởng cực đại!',
    worldW: 740,
    worldH: 2560,
    skyTop: '#1E1B4B',
    skyBot: '#7E22CE',
    canopyTint: '#0F766E',
    spawn: {x: 75, y: 2456},
    goal: {x: 600, y: 100},
    trees: [
      {x: 560, baseY: 2560, topY: 1680, trunkW: 36},
      {x: 105, baseY: 1940, topY: 980, trunkW: 36},
      {x: 545, baseY: 1320, topY: 220, trunkW: 38},
    ],
    ladders: [
      {x: 530, y: 2010, w: 30, h: 255},
      {x: 136, y: 1350, w: 30, h: 270},
      {x: 515, y: 690, w: 30, h: 275},
      {x: 205, y: 295, w: 30, h: 215},
    ],
    platforms: [
      {id: 's1', x: 0, y: 2500, w: 185, h: 60, kind: 'ground'},
      {id: 's2', x: 220, y: 2420, w: 78, h: 18, kind: 'crumble'},
      {id: 's3', x: 335, y: 2345, w: 78, h: 18, kind: 'crumble'},
      {id: 's4', x: 455, y: 2265, w: 145, h: 22, kind: 'rock', thornRange: [100, 140]},
      {id: 's5', x: 475, y: 2010, w: 140, h: 22, kind: 'branch'},
      {id: 's6', x: 310, y: 1925, w: 85, h: 18, kind: 'moving', moveDx: 65, moveSpeed: 2.3},
      {id: 's7', x: 175, y: 1835, w: 78, h: 18, kind: 'crumble'},
      {id: 's8', x: 70, y: 1735, w: 105, h: 22, kind: 'rock', thornRange: [0, 32]},
      {id: 's9', x: 100, y: 1620, w: 145, h: 22, kind: 'branch'},
      {id: 's10', x: 85, y: 1350, w: 135, h: 22, kind: 'branch'},
      {id: 's11', x: 255, y: 1265, w: 78, h: 18, kind: 'crumble'},
      {id: 's12', x: 365, y: 1180, w: 82, h: 18, kind: 'moving', moveDy: 56, moveSpeed: 2.25},
      {id: 's13', x: 475, y: 1070, w: 145, h: 22, kind: 'rock', thornRange: [95, 140]},
      {id: 's14', x: 585, y: 1054, w: 46, h: 16, kind: 'bounce'},
      {id: 's15', x: 460, y: 965, w: 135, h: 22, kind: 'branch'},
      {id: 's16', x: 460, y: 690, w: 140, h: 22, kind: 'branch'},
      {id: 's17', x: 300, y: 605, w: 76, h: 18, kind: 'crumble'},
      {id: 's18', x: 155, y: 510, w: 125, h: 22, kind: 'rock'},
      {id: 's19', x: 160, y: 295, w: 120, h: 22, kind: 'branch'},
      {id: 's20', x: 320, y: 225, w: 82, h: 18, kind: 'moving', moveDx: 72, moveSpeed: 2.45},
      {id: 's21', x: 440, y: 170, w: 74, h: 18, kind: 'crumble'},
      {id: 's22', x: 540, y: 140, w: 150, h: 26, kind: 'cloud'},
    ],
    windZones: [
      {x: 160, y: 1750, w: 380, h: 180, forceX: -320},
      {x: 210, y: 1120, w: 340, h: 180, forceX: 330},
      {x: 140, y: 510, w: 390, h: 180, forceX: -345},
      {x: 250, y: 135, w: 310, h: 155, forceX: 310},
    ],
    patrolOrbs: [
      {cx: 350, cy: 1885, rx: 95, ry: 22, speed: 2.4, phase: 0},
      {cx: 315, cy: 1205, rx: 110, ry: 28, speed: 2.6, phase: 1.7},
      {cx: 335, cy: 555, rx: 105, ry: 24, speed: 2.8, phase: 0.9},
      {cx: 410, cy: 185, rx: 90, ry: 26, speed: 3.1, phase: 2.4},
    ],
    stars: [
      {id: 'ss1', x: 260, y: 2370},
      {id: 'ss2', x: 375, y: 2295},
      {id: 'ss3', x: 350, y: 1860},
      {id: 'ss4', x: 295, y: 1215},
      {id: 'ss5', x: 605, y: 970},
      {id: 'ss6', x: 338, y: 555},
      {id: 'ss7', x: 360, y: 170},
      {id: 'ss8', x: 477, y: 120},
    ],
    checkpoints: [
      {x: 145, y: 1620},
      {x: 505, y: 965},
      {x: 205, y: 510},
    ],
  },
];

export const ParkourClimbGame: React.FC<{
  avatar?: AvatarConfig;
  onEarnCoinGame: (amt: number) => void;
}> = ({avatar, onEarnCoinGame}) => {
  const [selectedMapId, setSelectedMapId] = useState<ParkourMapConfig['id']>('forest_easy');
  const [phase, setPhase] = useState<'select' | 'playing' | 'won' | 'lost'>('select');
  const [livesLeft, setLivesLeft] = useState(4);
  const [progressPct, setProgressPct] = useState(0);
  const [starsCount, setStarsCount] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rewardedCg, setRewardedCg] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef({left: false, right: false, up: false, down: false, jumpPressed: false});
  const avatarLookRef = useRef<AvatarLook>(resolveAvatarLook(avatar));
  avatarLookRef.current = resolveAvatarLook(avatar);
  const onEarnCoinGameRef = useRef(onEarnCoinGame);
  onEarnCoinGameRef.current = onEarnCoinGame;
  const activeMap = PARKOUR_MAPS.find((m) => m.id === selectedMapId) || PARKOUR_MAPS[0];

  const startMap = (mapId?: ParkourMapConfig['id']) => {
    const id = mapId || selectedMapId;
    const m = PARKOUR_MAPS.find((item) => item.id === id) || PARKOUR_MAPS[0];
    setSelectedMapId(id);
    setLivesLeft(m.lives);
    setProgressPct(0);
    setStarsCount(0);
    setElapsedSec(0);
    setRewardedCg(0);
    soundFX.sparkle();
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = true;
        keysRef.current.jumpPressed = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (e.key === ' ') {
        e.preventDefault();
        keysRef.current.jumpPressed = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysRef.current = {left: false, right: false, up: false, down: false, jumpPressed: false};
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const m = PARKOUR_MAPS.find((item) => item.id === selectedMapId) || PARKOUR_MAPS[0];
    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let lastHudSec = -1;
    let lastHudPct = -1;
    let lives = m.lives;
    let checkpoint = {x: m.spawn.x, y: m.spawn.y};
    let camX = 0;
    let camY = Math.max(0, m.spawn.y - CANVAS_H * 0.65);
    let shake = 0;
    let invuln = 0;
    let coyote = 0;
    let jumpBuffer = 0;

    const collectedStars = new Set<string>();
    const crumbleState = new Map<string, {status: 'solid' | 'shaking' | 'broken'; timer: number}>();
    const particles: Particle[] = [];
    const popups: FloatingPopup[] = [];

    const player = {
      x: m.spawn.x,
      y: m.spawn.y,
      vx: 0,
      vy: 0,
      facing: 1 as 1 | -1,
      onGround: false,
      onLadder: false,
      standingPlatId: null as string | null,
    };

    const spawnParticles = (x: number, y: number, color: string, count: number, speed = 90) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.3 + Math.random() * 0.7) * speed;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 20,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          size: 2.5 + Math.random() * 3,
          color,
        });
      }
    };

    const addPopup = (x: number, y: number, text: string, color: string) => {
      popups.push({x, y, text, color, life: 1.05});
    };

    const getPlatformPos = (p: ParkourPlatform, t: number) => {
      const dx = p.moveDx ? Math.sin(t * (p.moveSpeed || 1.5)) * p.moveDx : 0;
      const dy = p.moveDy ? Math.sin(t * (p.moveSpeed || 1.5)) * p.moveDy : 0;
      return {x: p.x + dx, y: p.y + dy};
    };

    const loseLifeAndRespawn = (reason: string) => {
      if (invuln > 0) return;
      lives -= 1;
      setLivesLeft(lives);
      shake = 9;
      soundFX.tap();
      spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#F43F5E', 14, 150);
      if (lives <= 0) {
        const consolation = Math.floor(collectedStars.size / 2);
        if (consolation > 0) onEarnCoinGameRef.current(consolation);
        setRewardedCg(consolation);
        setPhase('lost');
        return;
      }
      addPopup(checkpoint.x, checkpoint.y - 14, `${reason} (-1❤️)`, '#F43F5E');
      player.x = checkpoint.x;
      player.y = checkpoint.y;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      player.onLadder = false;
      invuln = 1.25;
      // Restore broken crumble platforms immediately so respawn isn't softlocked
      crumbleState.clear();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.035, (now - lastTs) / 1000);
      lastTs = now;
      elapsed += dt;
      const curSec = Math.floor(elapsed);
      if (curSec !== lastHudSec) {
        lastHudSec = curSec;
        setElapsedSec(curSec);
      }
      if (invuln > 0) invuln = Math.max(0, invuln - dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 28);

      // Update crumble tiles
      for (const p of m.platforms) {
        if (p.kind !== 'crumble') continue;
        const st = crumbleState.get(p.id);
        if (!st) continue;
        st.timer -= dt;
        if (st.status === 'shaking' && st.timer <= 0) {
          st.status = 'broken';
          st.timer = 2.4;
          spawnParticles(p.x + p.w / 2, p.y + 8, '#D97706', 8, 95);
        } else if (st.status === 'broken' && st.timer <= 0) {
          crumbleState.delete(p.id);
        }
      }

      const prevTime = elapsed - dt;
      const k = keysRef.current;
      if (k.jumpPressed) {
        jumpBuffer = 0.12;
        k.jumpPressed = false;
      } else if (jumpBuffer > 0) {
        jumpBuffer = Math.max(0, jumpBuffer - dt);
      }

      // Check ladder overlap
      const pCx = player.x + PLAYER_W / 2;
      const pBot = player.y + PLAYER_H;
      const onLadderBox = m.ladders.find(
        (l) =>
          pCx >= l.x - 4 &&
          pCx <= l.x + l.w + 4 &&
          pBot >= l.y + 4 &&
          player.y <= l.y + l.h,
      );

      if (onLadderBox && (k.up || k.down)) {
        player.onLadder = true;
      } else if (!onLadderBox) {
        player.onLadder = false;
      }

      // Carry with moving platform if standing on one
      if (player.onGround && player.standingPlatId) {
        const plat = m.platforms.find((p) => p.id === player.standingPlatId);
        if (plat && (plat.moveDx || plat.moveDy)) {
          const prevPos = getPlatformPos(plat, prevTime);
          const curPos = getPlatformPos(plat, elapsed);
          player.x += curPos.x - prevPos.x;
          player.y += curPos.y - prevPos.y;
        }
      }

      // Horizontal control + wind push
      const moveInput = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (moveInput !== 0) {
        player.facing = moveInput as 1 | -1;
      }
      const targetVx = moveInput * (player.onLadder ? 140 : 225);
      const accel = player.onGround ? 15 : 8.5;
      player.vx += (targetVx - player.vx) * Math.min(1, accel * dt);

      // Apply wind zone force!
      let activeWind = 0;
      for (const wz of m.windZones) {
        if (
          player.x + PLAYER_W > wz.x &&
          player.x < wz.x + wz.w &&
          player.y + PLAYER_H > wz.y &&
          player.y < wz.y + wz.h
        ) {
          activeWind += wz.forceX;
        }
      }
      if (activeWind !== 0 && !player.onLadder) {
        player.vx += activeWind * dt;
      }

      if (player.onLadder) {
        const climbDir = (k.down ? 1 : 0) - (k.up ? 1 : 0);
        player.vy = climbDir * 175;
        if (jumpBuffer > 0 && !k.up) {
          player.onLadder = false;
          player.vy = -440;
          jumpBuffer = 0;
        }
      } else {
        if (player.onGround) coyote = 0.1;
        else coyote = Math.max(0, coyote - dt);

        if (jumpBuffer > 0 && coyote > 0) {
          player.vy = -495;
          player.onGround = false;
          coyote = 0;
          jumpBuffer = 0;
          soundFX.tap();
          spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H, '#FFFFFF', 5, 65);
        }
        player.vy = Math.min(680, player.vy + 1140 * dt);
      }

      const prevY = player.y;
      player.x = Math.max(0, Math.min(m.worldW - PLAYER_W, player.x + player.vx * dt));
      player.y += player.vy * dt;

      // Platform landing collisions
      player.onGround = false;
      player.standingPlatId = null;

      if (player.vy >= 0) {
        for (const p of m.platforms) {
          if (p.kind === 'crumble' && crumbleState.get(p.id)?.status === 'broken') continue;
          const pos = getPlatformPos(p, elapsed);
          const overlapX = player.x + PLAYER_W - 4 > pos.x && player.x + 4 < pos.x + p.w;
          const crossedTop = prevY + PLAYER_H <= pos.y + 10 && player.y + PLAYER_H >= pos.y;
          if (overlapX && crossedTop) {
            // Check bramble thorns on platform
            if (p.thornRange) {
              const localCenter = player.x + PLAYER_W / 2 - pos.x;
              if (localCenter >= p.thornRange[0] && localCenter <= p.thornRange[1]) {
                loseLifeAndRespawn('Đạp gai!');
                break;
              }
            }

            if (p.kind === 'bounce') {
              player.y = pos.y - PLAYER_H;
              player.vy = -665;
              player.onLadder = false;
              soundFX.sparkle();
              spawnParticles(player.x + PLAYER_W / 2, pos.y, '#F472B6', 10, 120);
              addPopup(player.x, pos.y - 16, 'NẤM NẢY!', '#DB2777');
            } else {
              player.y = pos.y - PLAYER_H;
              player.vy = 0;
              player.onGround = true;
              player.standingPlatId = p.id;
              if (p.kind === 'crumble' && !crumbleState.has(p.id)) {
                crumbleState.set(p.id, {status: 'shaking', timer: 0.52});
              }
            }
            break;
          }
        }
      }

      // Check patrol lightning orbs (Map 3)
      for (const orb of m.patrolOrbs) {
        const ox = orb.cx + Math.cos(elapsed * orb.speed + orb.phase) * orb.rx;
        const oy = orb.cy + Math.sin(elapsed * orb.speed * 1.4 + orb.phase) * orb.ry;
        const d = Math.hypot(player.x + PLAYER_W / 2 - ox, player.y + PLAYER_H / 2 - oy);
        if (d < 21) {
          loseLifeAndRespawn('Cầu sét!');
          break;
        }
      }

      // Check abyss fall
      if (player.y > m.worldH + 28) {
        loseLifeAndRespawn('Rơi vực!');
      }

      // Collect Bonus Stars
      for (const st of m.stars) {
        if (collectedStars.has(st.id)) continue;
        const d = Math.hypot(player.x + PLAYER_W / 2 - st.x, player.y + PLAYER_H / 2 - st.y);
        if (d < 24) {
          collectedStars.add(st.id);
          setStarsCount(collectedStars.size);
          soundFX.sparkle();
          spawnParticles(st.x, st.y, '#FDE047', 12, 130);
          addPopup(st.x, st.y - 10, '+1 CG ★', '#FACC15');
        }
      }

      // Check Checkpoints
      for (const cp of m.checkpoints) {
        const d = Math.hypot(player.x + PLAYER_W / 2 - cp.x, player.y + PLAYER_H - cp.y);
        if (d < 36 && (checkpoint.x !== cp.x || checkpoint.y !== cp.y - PLAYER_H)) {
          checkpoint = {x: cp.x - PLAYER_W / 2, y: cp.y - PLAYER_H};
          soundFX.sparkle();
          spawnParticles(cp.x, cp.y - 20, '#38BDF8', 12, 110);
          addPopup(cp.x, cp.y - 34, 'CHECKPOINT!', '#38BDF8');
        }
      }

      // Check Victory Goal Flag
      const goalDist = Math.hypot(
        player.x + PLAYER_W / 2 - m.goal.x,
        player.y + PLAYER_H / 2 - m.goal.y,
      );
      if (goalDist < 38) {
        const totalCg = m.baseReward + collectedStars.size;
        setRewardedCg(totalCg);
        onEarnCoinGameRef.current(totalCg);
        soundFX.sparkle();
        setPhase('won');
        return;
      }

      // Update Progress %
      const totalClimb = Math.max(1, m.spawn.y - m.goal.y);
      const pct = Math.max(0, Math.min(100, Math.round(((m.spawn.y - player.y) / totalClimb) * 100)));
      if (pct !== lastHudPct) {
        lastHudPct = pct;
        setProgressPct(pct);
      }

      // Update particles & popups
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 180 * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
      }
      for (let i = popups.length - 1; i >= 0; i--) {
        popups[i].y -= 30 * dt;
        popups[i].life -= dt;
        if (popups[i].life <= 0) popups.splice(i, 1);
      }

      // Camera smooth follow
      const targetCamX = Math.max(0, Math.min(m.worldW - CANVAS_W, player.x + PLAYER_W / 2 - CANVAS_W / 2));
      const targetCamY = Math.max(0, Math.min(m.worldH - CANVAS_H, player.y + PLAYER_H / 2 - CANVAS_H * 0.56));
      camX += (targetCamX - camX) * Math.min(1, 9 * dt);
      camY += (targetCamY - camY) * Math.min(1, 9 * dt);

      // =================== RENDER ===================
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        grad.addColorStop(0, m.skyTop);
        grad.addColorStop(1, m.skyBot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Parallax Distant Mountains / Clouds
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let i = 0; i < 6; i++) {
          const cx = ((i * 155 - camX * 0.25) % (CANVAS_W + 120)) - 60;
          const cy = ((i * 95 - camY * 0.18) % (CANVAS_H + 80));
          ctx.beginPath();
          ctx.arc(cx, cy < 0 ? cy + CANVAS_H : cy, 26, 0, Math.PI * 2);
          ctx.arc(cx + 22, cy < 0 ? cy + CANVAS_H + 4 : cy + 4, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        ctx.translate(-camX + sx, -camY + sy);

        // Tall Trees
        for (const tr of m.trees) {
          drawTallTree(ctx, tr.x, tr.baseY, tr.topY, tr.trunkW, m.canopyTint);
        }

        // Wind Corridors (Animated Blowing Streaks)
        for (const wz of m.windZones) {
          ctx.fillStyle = 'rgba(224, 242, 254, 0.16)';
          ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
          const dir = wz.forceX > 0 ? 1 : -1;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const wy = wz.y + 18 + ((i * wz.h) / 6);
            const tOffset = ((elapsed * 180 * dir + i * 70) % wz.w + wz.w) % wz.w;
            const wx = wz.x + tOffset;
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(Math.max(wz.x, Math.min(wz.x + wz.w, wx + dir * 32)), wy);
            ctx.stroke();
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText(dir > 0 ? 'GIÓ ĐẨY >>>' : '<<< GIÓ ĐẨY', wz.x + wz.w / 2 - 36, wz.y + 16);
        }

        // Rope Ladders
        for (const l of m.ladders) {
          drawRopeLadder(ctx, l.x, l.y, l.w, l.h, elapsed);
        }

        // Platforms
        for (const p of m.platforms) {
          const st = crumbleState.get(p.id);
          if (st?.status === 'broken') {
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(p.x, p.y, p.w, p.h);
            ctx.setLineDash([]);
            continue;
          }
          const pos = getPlatformPos(p, elapsed);
          const jiggleX = st?.status === 'shaking' ? (Math.random() - 0.5) * 5 : 0;
          const px = pos.x + jiggleX;
          const py = pos.y;

          if (p.kind === 'bounce') {
            ctx.fillStyle = '#F43F5E';
            ctx.beginPath();
            ctx.roundRect(px, py, p.w, p.h, 8);
            ctx.fill();
            ctx.fillStyle = '#FFE4E6';
            ctx.beginPath();
            ctx.arc(px + p.w * 0.28, py + 6, 3.5, 0, Math.PI * 2);
            ctx.arc(px + p.w * 0.72, py + 6, 3.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.kind === 'crumble') {
            ctx.fillStyle = st?.status === 'shaking' ? '#EA580C' : '#B45309';
            ctx.beginPath();
            ctx.roundRect(px, py, p.w, p.h, 4);
            ctx.fill();
            ctx.strokeStyle = '#451A03';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + p.w * 0.35, py);
            ctx.lineTo(px + p.w * 0.42, py + p.h * 0.6);
            ctx.lineTo(px + p.w * 0.3, py + p.h);
            ctx.stroke();
          } else if (p.kind === 'cloud') {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(px, py, p.w, p.h, 12);
            ctx.fill();
          } else if (p.kind === 'moving') {
            ctx.fillStyle = '#0EA5E9';
            ctx.beginPath();
            ctx.roundRect(px, py, p.w, p.h, 6);
            ctx.fill();
            ctx.strokeStyle = '#BAE6FD';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = p.kind === 'rock' ? '#475569' : p.kind === 'ground' ? '#15803D' : '#92400E';
            ctx.beginPath();
            ctx.roundRect(px, py, p.w, p.h, 6);
            ctx.fill();
            ctx.fillStyle = p.kind === 'rock' ? '#94A3B8' : '#22C55E';
            ctx.fillRect(px + 2, py, p.w - 4, 5);
          }

          // Bramble Thorns
          if (p.thornRange) {
            const [ts, te] = p.thornRange;
            ctx.fillStyle = '#E11D48';
            for (let tx = px + ts; tx < px + te - 6; tx += 10) {
              ctx.beginPath();
              ctx.moveTo(tx, py);
              ctx.lineTo(tx + 5, py - 10);
              ctx.lineTo(tx + 10, py);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        // Checkpoints
        for (const cp of m.checkpoints) {
          const active = checkpoint.x === cp.x - PLAYER_W / 2 && checkpoint.y === cp.y - PLAYER_H;
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(cp.x - 2, cp.y - 34, 4, 34);
          ctx.fillStyle = active ? '#38BDF8' : '#94A3B8';
          ctx.beginPath();
          ctx.moveTo(cp.x + 2, cp.y - 34);
          ctx.lineTo(cp.x + 24, cp.y - 26);
          ctx.lineTo(cp.x + 2, cp.y - 18);
          ctx.closePath();
          ctx.fill();
        }

        // Collectible Golden Stars
        for (const st of m.stars) {
          if (collectedStars.has(st.id)) continue;
          const bob = Math.sin(elapsed * 4 + st.x) * 4;
          ctx.fillStyle = '#FACC15';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(st.x, st.y + bob, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText('★', st.x - 5, st.y + bob + 4);
        }

        // Orbiting Lightning Orbs (Map 3)
        for (const orb of m.patrolOrbs) {
          const ox = orb.cx + Math.cos(elapsed * orb.speed + orb.phase) * orb.rx;
          const oy = orb.cy + Math.sin(elapsed * orb.speed * 1.4 + orb.phase) * orb.ry;
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.beginPath();
          ctx.arc(ox, oy, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FDE047';
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ox, oy, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Victory Goal Arch & Crown Flag
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(m.goal.x - 3, m.goal.y - 44, 5, 62);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(m.goal.x + 2, m.goal.y - 44);
        ctx.lineTo(m.goal.x + 38, m.goal.y - 32);
        ctx.lineTo(m.goal.x + 2, m.goal.y - 20);
        ctx.closePath();
        ctx.fill();

        // Particles
        for (const pt of particles) {
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Player Character
        drawBoxHeadCharacter(ctx, player.x, player.y, PLAYER_W, PLAYER_H, {
          look: avatarLookRef.current,
          facing: player.facing,
          vx: player.vx,
          vy: player.vy,
          onGround: player.onGround,
          onLadder: player.onLadder,
          invulnTimer: invuln,
          time: elapsed,
        });

        // Floating Popups
        for (const pop of popups) {
          ctx.globalAlpha = Math.min(1, pop.life * 1.4);
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3;
          ctx.font = '900 12px system-ui, sans-serif';
          ctx.strokeText(pop.text, pop.x - 20, pop.y);
          ctx.fillStyle = pop.color;
          ctx.fillText(pop.text, pop.x - 20, pop.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, selectedMapId]);

  return (
    <div className="space-y-2.5">
      {phase === 'select' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-3.5 py-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#0369A1]">
              <MapIcon className="h-4 w-4" />
              <span>Chọn 1 trong 3 Map Parkour Leo Trèo</span>
            </div>
            <span className="text-[11px] font-black text-[#0284C7]">Map càng khó CG càng khủng!</span>
          </div>

          <div className="grid gap-2">
            {PARKOUR_MAPS.map((m) => {
              const selected = m.id === selectedMapId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setSelectedMapId(m.id);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${
                    selected
                      ? 'border-[#0EA5E9] bg-[#EFF6FF] shadow-sm'
                      : 'border-[#E2E8F0] bg-white hover:border-[#BAE6FD]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#0F172A]">{m.name}</span>
                      <span
                        style={{backgroundColor: m.badgeColor}}
                        className="rounded-md px-2 py-0.5 text-[10px] font-black text-white"
                      >
                        {m.difficulty}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#475569]">{m.desc}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] font-black text-[#0284C7]">
                      <span>❤️ {m.lives} Mạng</span>
                      <span>★ {m.stars.length} Sao ẩn</span>
                      <span className="text-[#D97706]">
                        Thưởng: +{m.baseReward} đến +{m.baseReward + m.stars.length} CG
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-[#0EA5E9] px-3 py-1.5 text-xs font-black text-white">
                    Chọn
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => startMap(selectedMapId)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0284C7] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#0369A1] active:scale-95"
          >
            <Compass className="h-4 w-4" />
            <span>Bắt đầu leo: {activeMap.name}</span>
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="space-y-2">
          {/* HUD Bar */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-1.5 text-xs font-black">
            <div className="flex items-center gap-1 text-[#E11D48]">
              {Array.from({length: activeMap.lives}, (_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${i < livesLeft ? 'fill-current text-[#E11D48]' : 'text-[#CBD5E1]'}`}
                />
              ))}
            </div>
            <span className="flex items-center gap-1 text-[#D97706] tabular-nums">
              <Star className="h-3.5 w-3.5 fill-current" />
              {starsCount}/{activeMap.stars.length}
            </span>
            <span className="text-[#0369A1] tabular-nums">Độ cao: {progressPct}%</span>
            <span className="flex items-center gap-1 text-[#475569] tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {elapsedSec}s
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="max-h-[45dvh] w-full rounded-2xl border-4 border-[#38BDF8] bg-[#0F172A] object-contain shadow-inner"
          />

          {/* Touch + Keyboard Control Bar */}
          <div className="grid grid-cols-5 gap-1.5 select-none">
            <button
              type="button"
              onPointerDown={() => (keysRef.current.left = true)}
              onPointerUp={() => (keysRef.current.left = false)}
              onPointerLeave={() => (keysRef.current.left = false)}
              onPointerCancel={() => (keysRef.current.left = false)}
              className="flex h-11 touch-none items-center justify-center rounded-xl border-2 border-[#7DD3FC] bg-[#F0F9FF] text-[#0369A1] active:bg-[#BAE6FD]"
              aria-label="Trái"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onPointerDown={() => (keysRef.current.right = true)}
              onPointerUp={() => (keysRef.current.right = false)}
              onPointerLeave={() => (keysRef.current.right = false)}
              onPointerCancel={() => (keysRef.current.right = false)}
              className="flex h-11 touch-none items-center justify-center rounded-xl border-2 border-[#7DD3FC] bg-[#F0F9FF] text-[#0369A1] active:bg-[#BAE6FD]"
              aria-label="Phải"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onPointerDown={() => (keysRef.current.up = true)}
              onPointerUp={() => (keysRef.current.up = false)}
              onPointerLeave={() => (keysRef.current.up = false)}
              onPointerCancel={() => (keysRef.current.up = false)}
              className="flex h-11 touch-none items-center justify-center gap-1 rounded-xl border-2 border-[#FCD34D] bg-[#FFFBEB] text-[11px] font-black text-[#B45309] active:bg-[#FEF3C7]"
            >
              <ArrowUp className="h-4 w-4" />
              <span>Leo</span>
            </button>
            <button
              type="button"
              onPointerDown={() => (keysRef.current.down = true)}
              onPointerUp={() => (keysRef.current.down = false)}
              onPointerLeave={() => (keysRef.current.down = false)}
              onPointerCancel={() => (keysRef.current.down = false)}
              className="flex h-11 touch-none items-center justify-center rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] active:bg-[#E2E8F0]"
              aria-label="Xuống"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              onPointerDown={() => (keysRef.current.jumpPressed = true)}
              className="flex h-11 touch-none items-center justify-center gap-1 rounded-xl bg-[#0EA5E9] text-xs font-black text-white shadow active:scale-95"
            >
              <Zap className="h-4 w-4" />
              <span>Nhảy</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748B]">
            <span>Phím: A/D hoặc ←/→ chạy · W/↑/Space nhảy &amp; leo thang dây</span>
            <button
              type="button"
              onClick={() => setPhase('select')}
              className="font-black text-[#0284C7] underline"
            >
              Đổi Map
            </button>
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div className="space-y-3 rounded-3xl border-2 border-[#38BDF8] bg-[#F0F9FF] p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow">
            {phase === 'won' ? (
              <Trophy className="h-8 w-8 text-[#F59E0B]" />
            ) : (
              <Wind className="h-8 w-8 text-[#EF4444]" />
            )}
          </div>
          <div className="text-base font-black text-[#0F172A]">
            {phase === 'won'
              ? `Chinh phục ${activeMap.name} thành công!`
              : `Hết ${activeMap.lives} mạng tại ${activeMap.name}!`}
          </div>
          <div className="text-xs font-bold text-[#475569]">
            Thời gian: {elapsedSec}s · Sao thu thập: {starsCount}/{activeMap.stars.length} ★
          </div>
          {rewardedCg > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#0EA5E9] px-4 py-1.5 text-sm font-black text-white">
              <Sparkles className="h-4 w-4" />
              <span>Nhận +{rewardedCg} CoinGame</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase('select')}
              className="flex-1 rounded-xl border-2 border-[#BAE6FD] bg-white py-2.5 text-xs font-black text-[#0369A1] active:scale-95"
            >
              Chọn Map khác
            </button>
            <button
              type="button"
              onClick={() => startMap(activeMap.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0EA5E9] py-2.5 text-xs font-black text-white active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Chơi lại Map này</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. VỀ ĐÍCH VƯỢT CHƯỚNG NGẠI VẬT (5,600PX / 500M · 6 MẠNG · +5 ĐẾN +35 CG)
// ============================================================================
const OBSTACLE_WORLD_W = 5600;
const OBSTACLE_GROUND_Y = 264;
const OBSTACLE_GOAL_X = 5440;
const OBSTACLE_LIVES = 6;

interface Pitfall {
  id: string;
  x: number;
  w: number;
}
interface Sweeper {
  x: number;
  y: number;
  armLen: number;
  speed: number;
  cross?: boolean;
}
interface SpikeStrip {
  x: number;
  w: number;
  popupPeriod?: number; // seconds if rhythmic pop-up spike!
}
interface Sawblade {
  x1: number;
  x2: number;
  y: number;
  speed: number;
  r: number;
}
interface ToxicCloud {
  x: number;
  w: number;
}
interface SpringPad {
  x: number;
}
interface UpperBridge {
  x: number;
  y: number;
  w: number;
}
interface RollingBoulder {
  id: number;
  x: number;
  y: number;
  vx: number;
  r: number;
  rot: number;
}

const PITFALLS: Pitfall[] = [
  {id: 'p1', x: 520, w: 96},
  {id: 'p2', x: 1180, w: 112},
  {id: 'p3', x: 1960, w: 118},
  {id: 'p4', x: 2660, w: 122},
  {id: 'p5', x: 3420, w: 132},
  {id: 'p6', x: 4240, w: 136},
  {id: 'p7', x: 4860, w: 128},
];

const SWEEPERS: Sweeper[] = [
  {x: 780, y: OBSTACLE_GROUND_Y - 14, armLen: 46, speed: 2.8},
  {x: 1580, y: OBSTACLE_GROUND_Y - 14, armLen: 52, speed: -3.2},
  {x: 2380, y: OBSTACLE_GROUND_Y - 16, armLen: 55, speed: 3.4, cross: true},
  {x: 3120, y: OBSTACLE_GROUND_Y - 16, armLen: 56, speed: -3.6, cross: true},
  {x: 3920, y: OBSTACLE_GROUND_Y - 16, armLen: 58, speed: 3.9, cross: true},
  {x: 4660, y: OBSTACLE_GROUND_Y - 16, armLen: 58, speed: -4.2, cross: true},
];

const SPIKES: SpikeStrip[] = [
  {x: 380, w: 46},
  {x: 960, w: 60, popupPeriod: 2.2},
  {x: 1740, w: 70},
  {x: 2180, w: 68, popupPeriod: 2.0},
  {x: 2880, w: 76},
  {x: 3680, w: 80, popupPeriod: 1.8},
  {x: 4460, w: 82},
  {x: 5120, w: 72, popupPeriod: 1.7},
];

const SAWBLADES: Sawblade[] = [
  {x1: 1380, x2: 1520, y: OBSTACLE_GROUND_Y - 14, speed: 1.9, r: 16},
  {x1: 2990, x2: 3250, y: OBSTACLE_GROUND_Y - 14, speed: 2.2, r: 17},
  {x1: 4030, x2: 4200, y: OBSTACLE_GROUND_Y - 14, speed: 2.5, r: 18},
  {x1: 5030, x2: 5290, y: OBSTACLE_GROUND_Y - 14, speed: 2.8, r: 18},
];

const TOXIC_CLOUDS: ToxicCloud[] = [
  {x: 1340, w: 290},
  {x: 2290, w: 310},
  {x: 3620, w: 360},
  {x: 4600, w: 410},
];

const SPRINGS: SpringPad[] = [{x: 1090}, {x: 2560}, {x: 3810}, {x: 4780}];

const UPPER_BRIDGES: UpperBridge[] = [
  {x: 1120, y: 175, w: 230},
  {x: 2590, y: 170, w: 260},
  {x: 3840, y: 168, w: 275},
  {x: 4800, y: 168, w: 245},
];

const OBSTACLE_CHECKPOINTS = [1700, 3550];

function computeObstacleReward(seconds: number): {cg: number; rank: string} {
  if (seconds <= 42) return {cg: 35, rank: 'Thần Tốc Siêu Phàm'};
  if (seconds <= 58) return {cg: 28, rank: 'Siêu Đỉnh'};
  if (seconds <= 75) return {cg: 20, rank: 'Xuất Sắc'};
  if (seconds <= 95) return {cg: 14, rank: 'Khá Tốt'};
  if (seconds <= 120) return {cg: 9, rank: 'Hoàn Thành'};
  return {cg: 5, rank: 'Kiên Trì Về Đích'};
}

export const ObstacleRushGame: React.FC<{
  avatar?: AvatarConfig;
  onEarnCoinGame: (amt: number) => void;
}> = ({avatar, onEarnCoinGame}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [livesLeft, setLivesLeft] = useState(OBSTACLE_LIVES);
  const [meters, setMeters] = useState(0);
  const [secondsText, setSecondsText] = useState('0.0');
  const [isSlowed, setIsSlowed] = useState(false);
  const [resultReward, setResultReward] = useState<{cg: number; rank: string}>({cg: 0, rank: ''});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef({left: false, right: false, jumpPressed: false});
  const avatarLookRef = useRef<AvatarLook>(resolveAvatarLook(avatar));
  avatarLookRef.current = resolveAvatarLook(avatar);
  const onEarnCoinGameRef = useRef(onEarnCoinGame);
  onEarnCoinGameRef.current = onEarnCoinGame;

  const startRace = () => {
    setLivesLeft(OBSTACLE_LIVES);
    setMeters(0);
    setSecondsText('0.0');
    setIsSlowed(false);
    setResultReward({cg: 0, rank: ''});
    soundFX.sparkle();
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        keysRef.current.jumpPressed = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysRef.current = {left: false, right: false, jumpPressed: false};
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let lastHudDeci = -1;
    let lastHudMeters = -1;
    let lastHudSlowed = false;
    let lives = OBSTACLE_LIVES;
    let checkpointX = 70;
    let camX = 0;
    let shake = 0;
    let invuln = 0;
    let coyote = 0;
    let jumpBuffer = 0;
    let boulderTimer = 0.6;
    let nextBoulderId = 1;

    const pitState = new Map<string, {status: 'solid' | 'cracking' | 'open'; timer: number}>();
    const boulders: RollingBoulder[] = [];
    const particles: Particle[] = [];
    const popups: FloatingPopup[] = [];

    const player = {
      x: 70,
      y: OBSTACLE_GROUND_Y - PLAYER_H,
      vx: 0,
      vy: 0,
      facing: 1 as 1 | -1,
      onGround: true,
    };

    const spawnParticles = (x: number, y: number, color: string, count: number, speed = 110) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.3 + Math.random() * 0.7) * speed;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30,
          life: 0.45 + Math.random() * 0.2,
          maxLife: 0.65,
          size: 3 + Math.random() * 3,
          color,
        });
      }
    };

    const addPopup = (x: number, y: number, text: string, color: string) => {
      popups.push({x, y, text, color, life: 1.1});
    };

    const takeHit = (label: string, knockVx: number, knockVy: number, respawnIfAbyss = false) => {
      if (invuln > 0 && !respawnIfAbyss) return;
      lives -= 1;
      setLivesLeft(lives);
      shake = 10;
      soundFX.tap();
      spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#EF4444', 14, 150);

      if (lives <= 0) {
        setPhase('lost');
        return;
      }

      invuln = 1.2;
      addPopup(player.x, player.y - 14, `${label} (-1❤️)`, '#EF4444');
      if (respawnIfAbyss) {
        player.x = checkpointX;
        player.y = OBSTACLE_GROUND_Y - PLAYER_H - 12;
        player.vx = 0;
        player.vy = 0;
        pitState.clear();
      } else {
        player.vx = knockVx;
        player.vy = knockVy;
        player.onGround = false;
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.035, (now - lastTs) / 1000);
      lastTs = now;
      elapsed += dt;
      const curDeci = Math.floor(elapsed * 5);
      if (curDeci !== lastHudDeci) {
        lastHudDeci = curDeci;
        setSecondsText(elapsed.toFixed(1));
      }
      if (invuln > 0) invuln = Math.max(0, invuln - dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 30);

      // Update pitfalls
      for (const pf of PITFALLS) {
        const st = pitState.get(pf.id);
        if (!st) continue;
        st.timer -= dt;
        if (st.status === 'cracking' && st.timer <= 0) {
          st.status = 'open';
          st.timer = 2.6;
          spawnParticles(pf.x + pf.w / 2, OBSTACLE_GROUND_Y + 6, '#F97316', 10, 95);
        } else if (st.status === 'open' && st.timer <= 0) {
          pitState.delete(pf.id);
        }
      }

      // Spawn rolling boulders ahead of player
      boulderTimer -= dt;
      if (boulderTimer <= 0) {
        boulderTimer = player.x > 2600 ? 1.55 : 2.15;
        const spawnX = Math.min(OBSTACLE_GOAL_X - 80, Math.max(player.x + 560, 720));
        boulders.push({
          id: nextBoulderId++,
          x: spawnX,
          y: OBSTACLE_GROUND_Y - 20,
          vx: player.x > 2800 ? -245 : -205,
          r: 18 + Math.floor(Math.random() * 6),
          rot: 0,
        });
      }

      for (let i = boulders.length - 1; i >= 0; i--) {
        const b = boulders[i];
        b.x += b.vx * dt;
        b.rot += (b.vx / b.r) * dt;
        if (b.x < camX - 180) boulders.splice(i, 1);
      }

      // Checkpoints
      for (const cx of OBSTACLE_CHECKPOINTS) {
        if (player.x >= cx && checkpointX < cx) {
          checkpointX = cx;
          soundFX.sparkle();
          addPopup(cx, OBSTACLE_GROUND_Y - 52, 'CHECKPOINT!', '#38BDF8');
        }
      }

      // Toxic rain slow check
      const pCx = player.x + PLAYER_W / 2;
      const inToxic = TOXIC_CLOUDS.some((tc) => pCx >= tc.x && pCx <= tc.x + tc.w);
      if (inToxic !== lastHudSlowed) {
        lastHudSlowed = inToxic;
        setIsSlowed(inToxic);
      }
      const maxSpeed = inToxic ? 128 : 268;

      const k = keysRef.current;
      if (k.jumpPressed) {
        jumpBuffer = 0.12;
        k.jumpPressed = false;
      } else if (jumpBuffer > 0) {
        jumpBuffer = Math.max(0, jumpBuffer - dt);
      }

      const moveInput = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (moveInput !== 0) player.facing = moveInput as 1 | -1;

      const targetVx = moveInput * maxSpeed;
      player.vx += (targetVx - player.vx) * Math.min(1, (player.onGround ? 14 : 8) * dt);

      if (player.onGround) coyote = 0.1;
      else coyote = Math.max(0, coyote - dt);

      if (jumpBuffer > 0 && coyote > 0) {
        player.vy = -510;
        player.onGround = false;
        coyote = 0;
        jumpBuffer = 0;
        soundFX.tap();
        spawnParticles(pCx, player.y + PLAYER_H, '#FFFFFF', 5, 65);
      }

      player.vy = Math.min(720, player.vy + 1180 * dt);
      const prevY = player.y;
      player.x = Math.max(10, Math.min(OBSTACLE_WORLD_W - PLAYER_W, player.x + player.vx * dt));
      player.y += player.vy * dt;
      player.onGround = false;

      // Upper bridges collision
      if (player.vy >= 0) {
        for (const ub of UPPER_BRIDGES) {
          if (
            player.x + PLAYER_W - 4 > ub.x &&
            player.x + 4 < ub.x + ub.w &&
            prevY + PLAYER_H <= ub.y + 10 &&
            player.y + PLAYER_H >= ub.y
          ) {
            player.y = ub.y - PLAYER_H;
            player.vy = 0;
            player.onGround = true;
            break;
          }
        }
      }

      // Ground & Pitfall collision
      const overOpenPit = PITFALLS.find(
        (pf) =>
          pCx > pf.x + 8 &&
          pCx < pf.x + pf.w - 8 &&
          pitState.get(pf.id)?.status === 'open',
      );
      if (!overOpenPit && player.y + PLAYER_H >= OBSTACLE_GROUND_Y && prevY + PLAYER_H <= OBSTACLE_GROUND_Y + 26) {
        player.y = OBSTACLE_GROUND_Y - PLAYER_H;
        player.vy = 0;
        player.onGround = true;

        // Trigger cracking pitfall if standing on trap segment
        const trap = PITFALLS.find((pf) => pCx > pf.x && pCx < pf.x + pf.w);
        if (trap && !pitState.has(trap.id)) {
          pitState.set(trap.id, {status: 'cracking', timer: 0.42});
        }
      }

      // Spring pads
      for (const sp of SPRINGS) {
        if (Math.abs(pCx - sp.x) < 22 && Math.abs(player.y + PLAYER_H - OBSTACLE_GROUND_Y) < 16 && player.vy >= 0) {
          player.vy = -665;
          player.onGround = false;
          soundFX.sparkle();
          spawnParticles(sp.x, OBSTACLE_GROUND_Y, '#38BDF8', 9, 115);
          addPopup(sp.x, OBSTACLE_GROUND_Y - 26, 'BẬT CAO!', '#0EA5E9');
        }
      }

      // Pitfall abyss fall
      if (player.y > CANVAS_H + 30) {
        takeHit('Hố sụp!', 0, 0, true);
      }

      // Boulders hit
      const pCy = player.y + PLAYER_H / 2;
      for (const b of boulders) {
        if (Math.hypot(pCx - b.x, pCy - b.y) < b.r + 11) {
          takeHit('Đá lăn!', -250, -290);
          break;
        }
      }

      // Sweeper rotating arms hit ("thanh chắn quạt té")
      for (const sw of SWEEPERS) {
        const armCount = sw.cross ? 2 : 1;
        for (let aIdx = 0; aIdx < armCount; aIdx++) {
          const angle = elapsed * sw.speed + aIdx * Math.PI;
          const tipX = sw.x + Math.cos(angle) * sw.armLen;
          const tipY = sw.y + Math.sin(angle) * sw.armLen;
          // Check midpoint + tip
          const midX = sw.x + Math.cos(angle) * (sw.armLen * 0.55);
          const midY = sw.y + Math.sin(angle) * (sw.armLen * 0.55);
          if (
            Math.hypot(pCx - tipX, pCy - tipY) < 17 ||
            Math.hypot(pCx - midX, pCy - midY) < 15
          ) {
            const dir = pCx >= sw.x ? 1 : -1;
            takeHit('Quạt té!', dir * 320, -340);
            break;
          }
        }
      }

      // Spikes hit
      for (const sp of SPIKES) {
        const active = !sp.popupPeriod || Math.sin((elapsed * Math.PI * 2) / sp.popupPeriod) > -0.15;
        if (!active) continue;
        if (
          player.x + PLAYER_W - 5 > sp.x &&
          player.x + 5 < sp.x + sp.w &&
          player.y + PLAYER_H > OBSTACLE_GROUND_Y - 12 &&
          player.y < OBSTACLE_GROUND_Y + 4
        ) {
          takeHit('Gai nhọn!', -180, -300);
          break;
        }
      }

      // Sawblades hit
      for (const sb of SAWBLADES) {
        const sx = (sb.x1 + sb.x2) / 2 + Math.sin(elapsed * sb.speed) * ((sb.x2 - sb.x1) / 2);
        if (Math.hypot(pCx - sx, pCy - sb.y) < sb.r + 10) {
          takeHit('Lưỡi cưa!', -240, -310);
          break;
        }
      }

      // Victory check
      if (player.x + PLAYER_W >= OBSTACLE_GOAL_X) {
        const reward = computeObstacleReward(elapsed);
        setSecondsText(elapsed.toFixed(1));
        setResultReward(reward);
        onEarnCoinGameRef.current(reward.cg);
        soundFX.sparkle();
        setPhase('won');
        return;
      }

      const curMeters = Math.min(500, Math.round((player.x / OBSTACLE_GOAL_X) * 500));
      if (curMeters !== lastHudMeters) {
        lastHudMeters = curMeters;
        setMeters(curMeters);
      }

      // Update particles & popups
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 200 * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(i, 1);
      }
      for (let i = popups.length - 1; i >= 0; i--) {
        popups[i].y -= 28 * dt;
        popups[i].life -= dt;
        if (popups[i].life <= 0) popups.splice(i, 1);
      }

      const targetCamX = Math.max(0, Math.min(OBSTACLE_WORLD_W - CANVAS_W, player.x - CANVAS_W * 0.34));
      camX += (targetCamX - camX) * Math.min(1, 10 * dt);

      // =================== RENDER ===================
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.65, '#1E1B4B');
        grad.addColorStop(1, '#312E81');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Parallax stadium lights & neon mountains
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        for (let i = 0; i < 8; i++) {
          const mx = ((i * 190 - camX * 0.25) % (CANVAS_W + 220)) - 90;
          ctx.beginPath();
          ctx.moveTo(mx, CANVAS_H);
          ctx.lineTo(mx + 85, 130 + (i % 3) * 28);
          ctx.lineTo(mx + 170, CANVAS_H);
          ctx.closePath();
          ctx.fill();
        }

        ctx.save();
        const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        ctx.translate(-camX + sx, sy);

        // Toxic Acid Rain Clouds & Droplets
        for (const tc of TOXIC_CLOUDS) {
          ctx.fillStyle = 'rgba(147, 51, 234, 0.18)';
          ctx.fillRect(tc.x, 42, tc.w, OBSTACLE_GROUND_Y - 42);

          ctx.fillStyle = '#7E22CE';
          for (let cx = tc.x + 22; cx < tc.x + tc.w - 14; cx += 42) {
            ctx.beginPath();
            ctx.arc(cx, 38, 22, 0, Math.PI * 2);
            ctx.fill();
          }
          // Falling rain drops
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 2;
          for (let rx = tc.x + 12; rx < tc.x + tc.w; rx += 22) {
            const ry = 55 + ((elapsed * 220 + rx * 7) % (OBSTACLE_GROUND_Y - 62));
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 3, ry + 11);
            ctx.stroke();
          }
        }

        // Ground Segments + Pitfall Traps
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, OBSTACLE_GROUND_Y, OBSTACLE_WORLD_W, CANVAS_H - OBSTACLE_GROUND_Y);
        ctx.fillStyle = '#FB923C';
        ctx.fillRect(0, OBSTACLE_GROUND_Y, OBSTACLE_WORLD_W, 5);

        for (const pf of PITFALLS) {
          const st = pitState.get(pf.id);
          if (st?.status === 'open') {
            ctx.fillStyle = '#090D16';
            ctx.fillRect(pf.x, OBSTACLE_GROUND_Y, pf.w, CANVAS_H - OBSTACLE_GROUND_Y);
            // Bubbling abyss glow
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(pf.x, CANVAS_H - 12, pf.w, 12);
          } else {
            const jiggle = st?.status === 'cracking' ? (Math.random() - 0.5) * 4 : 0;
            ctx.fillStyle = st?.status === 'cracking' ? '#EA580C' : '#92400E';
            ctx.fillRect(pf.x + jiggle, OBSTACLE_GROUND_Y, pf.w, 14);
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(pf.x + pf.w * 0.3, OBSTACLE_GROUND_Y);
            ctx.lineTo(pf.x + pf.w * 0.45, OBSTACLE_GROUND_Y + 14);
            ctx.stroke();
          }
        }

        // Upper Shortcut Bridges
        for (const ub of UPPER_BRIDGES) {
          ctx.fillStyle = '#0284C7';
          ctx.beginPath();
          ctx.roundRect(ub.x, ub.y, ub.w, 14, 6);
          ctx.fill();
          ctx.fillStyle = '#7DD3FC';
          ctx.fillRect(ub.x + 4, ub.y, ub.w - 8, 4);
        }

        // Spring Pads
        for (const sp of SPRINGS) {
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.roundRect(sp.x - 16, OBSTACLE_GROUND_Y - 10, 32, 10, 4);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Spikes (Static & Rhythmic Pop-up)
        for (const sp of SPIKES) {
          const hScale = !sp.popupPeriod
            ? 1
            : Math.max(0.15, Math.sin((elapsed * Math.PI * 2) / sp.popupPeriod) > -0.15 ? 1 : 0.18);
          ctx.fillStyle = sp.popupPeriod ? '#F43F5E' : '#E11D48';
          for (let x = sp.x; x < sp.x + sp.w - 6; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, OBSTACLE_GROUND_Y);
            ctx.lineTo(x + 6, OBSTACLE_GROUND_Y - 15 * hScale);
            ctx.lineTo(x + 12, OBSTACLE_GROUND_Y);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Sawblades
        for (const sb of SAWBLADES) {
          const sxPos = (sb.x1 + sb.x2) / 2 + Math.sin(elapsed * sb.speed) * ((sb.x2 - sb.x1) / 2);
          ctx.save();
          ctx.translate(sxPos, sb.y);
          ctx.rotate(elapsed * 12);
          ctx.fillStyle = '#E2E8F0';
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, sb.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Checkpoints
        for (const cx of OBSTACLE_CHECKPOINTS) {
          const reached = checkpointX >= cx;
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(cx - 2, OBSTACLE_GROUND_Y - 48, 4, 48);
          ctx.fillStyle = reached ? '#38BDF8' : '#64748B';
          ctx.beginPath();
          ctx.moveTo(cx + 2, OBSTACLE_GROUND_Y - 48);
          ctx.lineTo(cx + 26, OBSTACLE_GROUND_Y - 38);
          ctx.lineTo(cx + 2, OBSTACLE_GROUND_Y - 28);
          ctx.closePath();
          ctx.fill();
        }

        // Sweepers ("Thanh chắn quạt té")
        for (const sw of SWEEPERS) {
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, 8, 0, Math.PI * 2);
          ctx.fill();
          const armCount = sw.cross ? 2 : 1;
          for (let aIdx = 0; aIdx < armCount; aIdx++) {
            const angle = elapsed * sw.speed + aIdx * Math.PI;
            const tipX = sw.x + Math.cos(angle) * sw.armLen;
            const tipY = sw.y + Math.sin(angle) * sw.armLen;
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sw.x, sw.y);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Rolling Boulders
        for (const b of boulders) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.fillStyle = '#78716C';
          ctx.strokeStyle = '#292524';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#57534E';
          ctx.beginPath();
          ctx.arc(-b.r * 0.3, -b.r * 0.25, b.r * 0.28, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Finish Stadium Arch
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(OBSTACLE_GOAL_X, OBSTACLE_GROUND_Y - 96, 8, 96);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(OBSTACLE_GOAL_X + 8, OBSTACLE_GROUND_Y - 94, 48, 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 12px system-ui, sans-serif';
        ctx.fillText('ĐÍCH', OBSTACLE_GOAL_X + 16, OBSTACLE_GROUND_Y - 76);

        // Particles
        for (const pt of particles) {
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Player Character
        drawBoxHeadCharacter(ctx, player.x, player.y, PLAYER_W, PLAYER_H, {
          look: avatarLookRef.current,
          facing: player.facing,
          vx: player.vx,
          vy: player.vy,
          onGround: player.onGround,
          onLadder: false,
          slowed: inToxic,
          invulnTimer: invuln,
          time: elapsed,
        });

        // Popups
        for (const pop of popups) {
          ctx.globalAlpha = Math.min(1, pop.life * 1.4);
          ctx.font = '900 12px system-ui, sans-serif';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3;
          ctx.strokeText(pop.text, pop.x - 18, pop.y);
          ctx.fillStyle = pop.color;
          ctx.fillText(pop.text, pop.x - 18, pop.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  const liveTier = computeObstacleReward(parseFloat(secondsText) || 0);

  return (
    <div className="space-y-2.5">
      {phase === 'ready' && (
        <div className="space-y-3 rounded-3xl border-2 border-[#FDBA74] bg-[#FFF7ED] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-[#9A3412]">
              <Flag className="h-5 w-5 text-[#EA580C]" />
              <span>Đường Đua 500m Vượt Chướng Ngại Vật</span>
            </div>
            <span className="rounded-lg bg-[#EA580C] px-2.5 py-0.5 text-[10px] font-black text-white">
              {OBSTACLE_LIVES} Mạng
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-[#7C2D12]">
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              🪨 Đá lăn tốc độ cao &amp; thanh chắn quạt té 2 chiều
            </div>
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              🕳️ Hố sụp vực thẳm, gai nhọn pop-up &amp; lưỡi cưa
            </div>
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              ☔ Mưa độc tím làm chậm -52% tốc độ di chuyển
            </div>
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              ⏱️ Đếm giây live: Về ≤42s nhận tối đa +35 CoinGame!
            </div>
          </div>

          <button
            type="button"
            onClick={startRace}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EA580C] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#C2410C] active:scale-95"
          >
            <Flag className="h-4 w-4" />
            <span>Xuất phát ngay (500m · 6 Mạng)</span>
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="space-y-2">
          {/* HUD & Distance Progress */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-1.5 text-xs font-black">
            <div className="flex items-center gap-0.5">
              {Array.from({length: OBSTACLE_LIVES}, (_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${i < livesLeft ? 'fill-current text-[#EF4444]' : 'text-[#CBD5E1]'}`}
                />
              ))}
            </div>
            <span className="tabular-nums text-[#C2410C]">{meters}/500m</span>
            {isSlowed && (
              <span className="flex items-center gap-1 rounded-md bg-[#9333EA] px-1.5 py-0.5 text-[10px] text-white">
                <CloudRain className="h-3 w-3" />
                Chậm!
              </span>
            )}
            <span className="flex items-center gap-1 text-[#0F172A] tabular-nums">
              <Clock className="h-3.5 w-3.5 text-[#EA580C]" />
              {secondsText}s (+{liveTier.cg} CG)
            </span>
          </div>

          {/* 500m Track Mini Bar */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              style={{width: `${Math.min(100, (meters / 500) * 100)}%`}}
              className="h-full rounded-full bg-gradient-to-r from-[#FB923C] to-[#EF4444] transition-all duration-150"
            />
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="max-h-[45dvh] w-full rounded-2xl border-4 border-[#FB923C] bg-[#0F172A] object-contain shadow-inner"
          />

          <div className="grid grid-cols-3 gap-2 select-none">
            <button
              type="button"
              onPointerDown={() => (keysRef.current.left = true)}
              onPointerUp={() => (keysRef.current.left = false)}
              onPointerLeave={() => (keysRef.current.left = false)}
              onPointerCancel={() => (keysRef.current.left = false)}
              className="flex h-11 touch-none items-center justify-center gap-1 rounded-xl border-2 border-[#FDBA74] bg-[#FFF7ED] text-xs font-black text-[#C2410C] active:bg-[#FED7AA]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Lùi</span>
            </button>
            <button
              type="button"
              onPointerDown={() => (keysRef.current.right = true)}
              onPointerUp={() => (keysRef.current.right = false)}
              onPointerLeave={() => (keysRef.current.right = false)}
              onPointerCancel={() => (keysRef.current.right = false)}
              className="flex h-11 touch-none items-center justify-center gap-1 rounded-xl border-2 border-[#FDBA74] bg-[#FFF7ED] text-xs font-black text-[#C2410C] active:bg-[#FED7AA]"
            >
              <span>Chạy</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onPointerDown={() => (keysRef.current.jumpPressed = true)}
              className="flex h-11 touch-none items-center justify-center gap-1 rounded-xl bg-[#EA580C] text-xs font-black text-white shadow active:scale-95"
            >
              <Zap className="h-4 w-4" />
              <span>Nhảy</span>
            </button>
          </div>
          <div className="text-center text-[10px] font-bold text-[#64748B]">
            Phím: A/D hoặc ←/→ di chuyển · Space/W/↑ để nhảy qua chướng ngại vật
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div className="space-y-3 rounded-3xl border-2 border-[#FB923C] bg-[#FFF7ED] p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow">
            {phase === 'won' ? (
              <Trophy className="h-8 w-8 text-[#F59E0B]" />
            ) : (
              <Flag className="h-8 w-8 text-[#EF4444]" />
            )}
          </div>
          <div className="text-base font-black text-[#0F172A]">
            {phase === 'won'
              ? `Về đích 500m thành công! (${resultReward.rank})`
              : `Hết ${OBSTACLE_LIVES} mạng tại ${meters}m / 500m!`}
          </div>
          <div className="text-xs font-bold text-[#475569]">
            Thời gian chạy: {secondsText} giây
          </div>
          {phase === 'won' && resultReward.cg > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA580C] px-4 py-1.5 text-sm font-black text-white">
              <Sparkles className="h-4 w-4" />
              <span>Nhận +{resultReward.cg} CoinGame</span>
            </div>
          )}
          <button
            type="button"
            onClick={startRace}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EA580C] py-2.5 text-xs font-black text-white shadow active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Đua lại từ đầu</span>
          </button>
        </div>
      )}
    </div>
  );
};
