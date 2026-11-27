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
  Trophy,
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
  if (opts.invulnTimer && opts.invulnTimer > 0 && Math.floor(opts.time * 16) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  const cx = x + w / 2;
  const walkCycle =
    opts.onLadder
      ? Math.sin(opts.time * 14)
      : opts.onGround && Math.abs(opts.vx) > 10
        ? Math.sin(opts.time * 16)
        : 0;

  // Shadow on ground if near
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, y + h, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = opts.look.pantsColor;
  const legSwing = walkCycle * 4;
  ctx.fillRect(cx - 6 + legSwing * 0.5, y + h - 10, 5, 10);
  ctx.fillRect(cx + 1 - legSwing * 0.5, y + h - 10, 5, 10);

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
  const armY = opts.onLadder ? y + 12 + walkCycle * 4 : y + 15 - legSwing * 0.4;
  const armRightY = opts.onLadder ? y + 12 - walkCycle * 4 : y + 15 + legSwing * 0.4;
  ctx.fillRect(cx - 11, armY, 4, 9);
  ctx.fillRect(cx + 7, armRightY, 4, 9);

  // Cute Box Head
  ctx.fillStyle = opts.look.headColor;
  ctx.beginPath();
  ctx.roundRect(cx - 10, y - 2, 20, 17, 4);
  ctx.fill();
  ctx.strokeStyle = '#332419';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Box tape stripe on top
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

  // Smile
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx + eyeOffsetX, y + 8.5, 2.2, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Toxic slow aura if slowed
  if (opts.slowed) {
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, y + h / 2, 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// ============================================================================
// 1. PARKOUR LEO TRÈO (3 Maps, Chọn Map, Thang Dây, Cây Cối Cao, N Mạng Khi Té)
// ============================================================================
interface ParkourPlatform {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'ground' | 'wood' | 'canopy' | 'stone' | 'moving' | 'bounce';
  moveDx?: number;
  moveDy?: number;
  moveSpeed?: number;
}

interface ParkourLadder {
  x: number;
  y: number;
  h: number;
  kind: 'rope' | 'vine';
}

interface ParkourTree {
  x: number;
  baseY: number;
  trunkH: number;
  canopyR: number;
  tone: 'emerald' | 'pine' | 'autumn';
}

interface ParkourMapDef {
  id: 'forest_canopy' | 'rope_valley' | 'sky_temple';
  name: string;
  difficulty: string;
  lives: number;
  rewardMin: number;
  rewardMax: number;
  skyTop: string;
  skyBottom: string;
  mountainColor: string;
  finishX: number;
  finishY: number;
  spawnX: number;
  spawnY: number;
  checkpoints: {x: number; y: number}[];
  trees: ParkourTree[];
  platforms: ParkourPlatform[];
  ladders: ParkourLadder[];
  description: string;
  badgeColor: string;
}

const PARKOUR_MAPS: ParkourMapDef[] = [
  {
    id: 'forest_canopy',
    name: 'Rừng Cổ Thụ Mây',
    difficulty: 'Dễ · 3 Mạng',
    lives: 3,
    rewardMin: 2,
    rewardMax: 4,
    skyTop: '#BAE6FD',
    skyBottom: '#ECFDF5',
    mountainColor: '#99D5B8',
    finishX: 2440,
    finishY: 132,
    spawnX: 55,
    spawnY: 246,
    description: 'Leo thang dây qua tán cây cổ thụ cao & bật nấm nhún giữa rừng xanh.',
    badgeColor: 'bg-[#10B981] text-white',
    checkpoints: [
      {x: 845, y: 158},
      {x: 1640, y: 170},
    ],
    trees: [
      {x: 245, baseY: 280, trunkH: 150, canopyR: 48, tone: 'emerald'},
      {x: 560, baseY: 315, trunkH: 205, canopyR: 54, tone: 'emerald'},
      {x: 890, baseY: 325, trunkH: 190, canopyR: 50, tone: 'pine'},
      {x: 1270, baseY: 330, trunkH: 225, canopyR: 58, tone: 'emerald'},
      {x: 1660, baseY: 320, trunkH: 175, canopyR: 48, tone: 'pine'},
      {x: 2040, baseY: 330, trunkH: 230, canopyR: 56, tone: 'emerald'},
      {x: 2410, baseY: 320, trunkH: 200, canopyR: 58, tone: 'emerald'},
    ],
    platforms: [
      {x: 0, y: 280, w: 300, h: 60, kind: 'ground'},
      {x: 195, y: 196, w: 105, h: 16, kind: 'canopy'},
      {x: 345, y: 238, w: 110, h: 16, kind: 'wood'},
      {x: 410, y: 218, w: 46, h: 14, kind: 'bounce'},
      {x: 500, y: 138, w: 125, h: 18, kind: 'canopy'},
      {x: 685, y: 176, w: 96, h: 16, kind: 'wood'},
      {x: 810, y: 158, w: 155, h: 20, kind: 'canopy'},
      {x: 1020, y: 228, w: 110, h: 16, kind: 'wood'},
      {x: 1085, y: 212, w: 42, h: 14, kind: 'bounce'},
      {x: 1190, y: 124, w: 150, h: 18, kind: 'canopy'},
      {x: 1410, y: 164, w: 115, h: 16, kind: 'moving', moveDx: 58, moveSpeed: 1.4},
      {x: 1590, y: 170, w: 145, h: 20, kind: 'ground'},
      {x: 1790, y: 222, w: 98, h: 16, kind: 'wood'},
      {x: 1965, y: 132, w: 145, h: 18, kind: 'canopy'},
      {x: 2165, y: 172, w: 110, h: 16, kind: 'moving', moveDy: 34, moveSpeed: 1.6},
      {x: 2325, y: 132, w: 175, h: 28, kind: 'ground'},
    ],
    ladders: [
      {x: 215, y: 196, h: 84, kind: 'rope'},
      {x: 545, y: 138, h: 100, kind: 'vine'},
      {x: 1245, y: 124, h: 105, kind: 'rope'},
      {x: 1840, y: 132, h: 95, kind: 'rope'},
      {x: 2015, y: 132, h: 98, kind: 'vine'},
    ],
  },
  {
    id: 'rope_valley',
    name: 'Thung Lũng Thang Dây',
    difficulty: 'Trung Bình · 4 Mạng',
    lives: 4,
    rewardMin: 3,
    rewardMax: 5,
    skyTop: '#FDE68A',
    skyBottom: '#FFF7ED',
    mountainColor: '#D9A77D',
    finishX: 2840,
    finishY: 118,
    spawnX: 50,
    spawnY: 246,
    description: 'Vượt hẻm núi sâu với thang dây nối tầng, cầu gỗ treo & bệ mây chuyển động.',
    badgeColor: 'bg-[#F59E0B] text-white',
    checkpoints: [
      {x: 960, y: 154},
      {x: 1930, y: 150},
    ],
    trees: [
      {x: 190, baseY: 280, trunkH: 140, canopyR: 42, tone: 'autumn'},
      {x: 685, baseY: 320, trunkH: 195, canopyR: 46, tone: 'pine'},
      {x: 1290, baseY: 330, trunkH: 220, canopyR: 50, tone: 'autumn'},
      {x: 1960, baseY: 325, trunkH: 180, canopyR: 44, tone: 'pine'},
      {x: 2490, baseY: 330, trunkH: 225, canopyR: 52, tone: 'autumn'},
    ],
    platforms: [
      {x: 0, y: 280, w: 235, h: 60, kind: 'stone'},
      {x: 280, y: 238, w: 88, h: 16, kind: 'wood'},
      {x: 415, y: 192, w: 94, h: 16, kind: 'wood'},
      {x: 425, y: 108, w: 110, h: 16, kind: 'stone'},
      {x: 600, y: 156, w: 135, h: 18, kind: 'canopy'},
      {x: 785, y: 220, w: 95, h: 16, kind: 'wood'},
      {x: 830, y: 204, w: 40, h: 14, kind: 'bounce'},
      {x: 925, y: 154, w: 140, h: 20, kind: 'stone'},
      {x: 1120, y: 188, w: 100, h: 16, kind: 'moving', moveDx: 65, moveSpeed: 1.75},
      {x: 1245, y: 118, w: 115, h: 18, kind: 'canopy'},
      {x: 1435, y: 168, w: 95, h: 16, kind: 'wood'},
      {x: 1590, y: 230, w: 100, h: 16, kind: 'stone'},
      {x: 1715, y: 120, w: 105, h: 16, kind: 'wood'},
      {x: 1895, y: 150, w: 145, h: 20, kind: 'stone'},
      {x: 2095, y: 204, w: 95, h: 16, kind: 'moving', moveDy: 42, moveSpeed: 1.8},
      {x: 2260, y: 128, w: 95, h: 16, kind: 'wood'},
      {x: 2425, y: 114, w: 125, h: 18, kind: 'canopy'},
      {x: 2610, y: 162, w: 92, h: 16, kind: 'wood'},
      {x: 2740, y: 118, w: 165, h: 28, kind: 'stone'},
    ],
    ladders: [
      {x: 452, y: 108, h: 86, kind: 'rope'},
      {x: 645, y: 156, h: 115, kind: 'rope'},
      {x: 1625, y: 120, h: 110, kind: 'rope'},
      {x: 1742, y: 120, h: 110, kind: 'vine'},
      {x: 2465, y: 114, h: 105, kind: 'rope'},
      {x: 2642, y: 118, h: 90, kind: 'rope'},
    ],
  },
  {
    id: 'sky_temple',
    name: 'Đỉnh Tháp Mây Cổ Đại',
    difficulty: 'Thử Thách · 5 Mạng',
    lives: 5,
    rewardMin: 4,
    rewardMax: 7,
    skyTop: '#1E1B4B',
    skyBottom: '#4F46E5',
    mountainColor: '#3730A3',
    finishX: 3180,
    finishY: 96,
    spawnX: 50,
    spawnY: 246,
    description: 'Chinh phục tháp trời đêm sao với cây bách khổng lồ, thang dây tầng cao & bệ bay.',
    badgeColor: 'bg-[#6366F1] text-white',
    checkpoints: [
      {x: 1020, y: 144},
      {x: 2080, y: 138},
    ],
    trees: [
      {x: 240, baseY: 280, trunkH: 155, canopyR: 46, tone: 'pine'},
      {x: 780, baseY: 325, trunkH: 225, canopyR: 52, tone: 'pine'},
      {x: 1520, baseY: 330, trunkH: 235, canopyR: 54, tone: 'pine'},
      {x: 2350, baseY: 330, trunkH: 230, canopyR: 52, tone: 'pine'},
      {x: 3150, baseY: 325, trunkH: 235, canopyR: 56, tone: 'pine'},
    ],
    platforms: [
      {x: 0, y: 280, w: 220, h: 60, kind: 'stone'},
      {x: 195, y: 186, w: 92, h: 16, kind: 'canopy'},
      {x: 340, y: 146, w: 86, h: 16, kind: 'stone'},
      {x: 495, y: 196, w: 92, h: 16, kind: 'moving', moveDx: 55, moveSpeed: 1.9},
      {x: 685, y: 108, w: 120, h: 18, kind: 'canopy'},
      {x: 860, y: 194, w: 86, h: 16, kind: 'wood'},
      {x: 895, y: 178, w: 40, h: 14, kind: 'bounce'},
      {x: 990, y: 144, w: 135, h: 20, kind: 'stone'},
      {x: 1185, y: 188, w: 84, h: 16, kind: 'stone'},
      {x: 1330, y: 232, w: 88, h: 16, kind: 'wood'},
      {x: 1455, y: 108, w: 125, h: 18, kind: 'canopy'},
      {x: 1645, y: 154, w: 95, h: 16, kind: 'moving', moveDy: 44, moveSpeed: 2.0},
      {x: 1815, y: 118, w: 88, h: 16, kind: 'stone'},
      {x: 1945, y: 174, w: 82, h: 16, kind: 'wood'},
      {x: 2050, y: 138, w: 135, h: 20, kind: 'stone'},
      {x: 2255, y: 108, w: 125, h: 18, kind: 'canopy'},
      {x: 2450, y: 170, w: 92, h: 16, kind: 'moving', moveDx: 72, moveSpeed: 2.1},
      {x: 2635, y: 215, w: 86, h: 16, kind: 'wood'},
      {x: 2670, y: 199, w: 42, h: 14, kind: 'bounce'},
      {x: 2795, y: 110, w: 95, h: 16, kind: 'stone'},
      {x: 2955, y: 142, w: 85, h: 16, kind: 'moving', moveDy: 34, moveSpeed: 2.0},
      {x: 3095, y: 96, w: 170, h: 28, kind: 'stone'},
    ],
    ladders: [
      {x: 208, y: 186, h: 94, kind: 'rope'},
      {x: 722, y: 108, h: 112, kind: 'vine'},
      {x: 1365, y: 108, h: 124, kind: 'rope'},
      {x: 1485, y: 108, h: 124, kind: 'vine'},
      {x: 2295, y: 108, h: 118, kind: 'rope'},
      {x: 2825, y: 110, h: 110, kind: 'rope'},
    ],
  },
];

export const ParkourClimbGame: React.FC<{
  avatar?: AvatarConfig;
  onEarnCoinGame: (amt: number) => void;
}> = ({avatar, onEarnCoinGame}) => {
  const [selectedMapIdx, setSelectedMapIdx] = useState(0);
  const [phase, setPhase] = useState<'select' | 'playing' | 'won' | 'lost'>('select');
  const [livesLeft, setLivesLeft] = useState(PARKOUR_MAPS[0].lives);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rewardedCg, setRewardedCg] = useState(0);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<{left: boolean; right: boolean; up: boolean; down: boolean; jump: boolean}>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
  });
  const jumpConsumedRef = useRef(false);
  const lookRef = useRef<AvatarLook>(resolveAvatarLook(avatar));
  lookRef.current = resolveAvatarLook(avatar);

  const activeMap = PARKOUR_MAPS[selectedMapIdx];
  const mapRef = useRef(activeMap);
  mapRef.current = activeMap;

  const gameRef = useRef({
    px: activeMap.spawnX,
    py: activeMap.spawnY,
    vx: 0,
    vy: 0,
    facing: 1 as 1 | -1,
    onGround: false,
    onLadder: false,
    coyote: 0,
    invuln: 0,
    respawnX: activeMap.spawnX,
    respawnY: activeMap.spawnY,
    lives: activeMap.lives,
    camX: 0,
    time: 0,
    ended: false,
    reachedCheckpoints: new Set<number>(),
  });

  const startMapRun = useCallback((idx: number) => {
    const m = PARKOUR_MAPS[idx];
    setSelectedMapIdx(idx);
    setLivesLeft(m.lives);
    setProgressPct(0);
    setElapsedSec(0);
    setRewardedCg(0);
    setStatusBanner('Leo thang dây & nhảy qua ngọn cây để về đích!');
    jumpConsumedRef.current = false;
    gameRef.current = {
      px: m.spawnX,
      py: m.spawnY,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      onLadder: false,
      coyote: 0,
      invuln: 0,
      respawnX: m.spawnX,
      respawnY: m.spawnY,
      lives: m.lives,
      camX: 0,
      time: 0,
      ended: false,
      reachedCheckpoints: new Set<number>(),
    };
    setPhase('playing');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        keysRef.current.right = true;
      } else if (k === 'arrowup' || k === 'w') {
        e.preventDefault();
        keysRef.current.up = true;
        keysRef.current.jump = true;
      } else if (k === 'arrowdown' || k === 's') {
        e.preventDefault();
        keysRef.current.down = true;
      } else if (k === ' ') {
        e.preventDefault();
        keysRef.current.jump = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = false;
      else if (k === 'arrowright' || k === 'd') keysRef.current.right = false;
      else if (k === 'arrowup' || k === 'w') {
        keysRef.current.up = false;
        keysRef.current.jump = false;
        jumpConsumedRef.current = false;
      } else if (k === 'arrowdown' || k === 's') keysRef.current.down = false;
      else if (k === ' ') {
        keysRef.current.jump = false;
        jumpConsumedRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = 0;
    let lastTs = performance.now();
    let hudSyncAcc = 0;

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;

      const g = gameRef.current;
      const map = mapRef.current;
      if (g.ended) return;

      g.time += dt;
      if (g.invuln > 0) g.invuln = Math.max(0, g.invuln - dt);

      const keys = keysRef.current;
      const moveDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (moveDir !== 0) g.facing = moveDir > 0 ? 1 : -1;

      // Compute dynamic platform rects
      const dynPlatforms = map.platforms.map((p) => {
        const dx = p.moveDx ? Math.sin(g.time * (p.moveSpeed ?? 1.5)) * p.moveDx : 0;
        const dy = p.moveDy ? Math.sin(g.time * (p.moveSpeed ?? 1.5)) * p.moveDy : 0;
        const prevDx = p.moveDx ? Math.sin((g.time - dt) * (p.moveSpeed ?? 1.5)) * p.moveDx : 0;
        const prevDy = p.moveDy ? Math.sin((g.time - dt) * (p.moveSpeed ?? 1.5)) * p.moveDy : 0;
        return {
          ...p,
          cx: p.x + dx,
          cy: p.y + dy,
          deltaX: dx - prevDx,
          deltaY: dy - prevDy,
        };
      });

      // Check ladder overlap
      const playerCenterX = g.px + PLAYER_W / 2;
      const touchingLadder = map.ladders.find(
        (l) =>
          playerCenterX >= l.x - 10 &&
          playerCenterX <= l.x + 22 &&
          g.py + PLAYER_H >= l.y - 4 &&
          g.py <= l.y + l.h + 6,
      );

      if (touchingLadder && (keys.up || keys.down)) {
        g.onLadder = true;
        g.onGround = false;
      }
      if (!touchingLadder) {
        g.onLadder = false;
      }

      if (g.onLadder && touchingLadder) {
        g.vx = moveDir * 135;
        const climbDir = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        g.vy = climbDir * 165;
        // Softly pull toward ladder center when climbing vertically
        if (climbDir !== 0 && moveDir === 0) {
          const targetX = touchingLadder.x + 6 - PLAYER_W / 2;
          g.px += (targetX - g.px) * Math.min(1, dt * 8);
        }
        // Jump off ladder with Space
        if (keys.jump && !keys.up && !jumpConsumedRef.current) {
          g.onLadder = false;
          g.vy = -410;
          jumpConsumedRef.current = true;
          soundFX.tap();
        }
      } else {
        g.vx = moveDir * 198;
        g.vy = Math.min(640, g.vy + 1080 * dt);
        if (g.onGround) {
          g.coyote = 0.1;
        } else {
          g.coyote = Math.max(0, g.coyote - dt);
        }
        if (keys.jump && !jumpConsumedRef.current && g.coyote > 0) {
          g.vy = -445;
          g.onGround = false;
          g.coyote = 0;
          jumpConsumedRef.current = true;
          soundFX.tap();
        }
      }

      const prevBottom = g.py + PLAYER_H;
      g.px = Math.max(0, Math.min(map.finishX + 120, g.px + g.vx * dt));
      g.py += g.vy * dt;

      // Platform landing (ignore top collision if climbing down intentionally on ladder)
      g.onGround = false;
      if (!(g.onLadder && keys.down)) {
        for (const p of dynPlatforms) {
          const withinX = g.px + PLAYER_W - 4 > p.cx && g.px + 4 < p.cx + p.w;
          const nextBottom = g.py + PLAYER_H;
          if (withinX && g.vy >= 0 && prevBottom <= p.cy + 10 && nextBottom >= p.cy) {
            g.py = p.cy - PLAYER_H;
            g.px += p.deltaX;
            if (p.kind === 'bounce') {
              g.vy = -595;
              g.onGround = false;
              g.onLadder = false;
              soundFX.sparkle();
            } else {
              g.vy = 0;
              g.onGround = true;
              g.onLadder = false;
            }
          }
        }
      }

      // Checkpoints
      map.checkpoints.forEach((cp, idx) => {
        if (!g.reachedCheckpoints.has(idx) && Math.hypot(g.px - cp.x, g.py - (cp.y - PLAYER_H)) < 44) {
          g.reachedCheckpoints.add(idx);
          g.respawnX = cp.x;
          g.respawnY = cp.y - PLAYER_H - 4;
          soundFX.sparkle();
          setStatusBanner(`Đã chạm mốc hồi sinh #${idx + 1}!`);
        }
      });

      // Fell into abyss
      if (g.py > CANVAS_H + 38) {
        g.lives -= 1;
        setLivesLeft(g.lives);
        if (g.lives <= 0) {
          g.ended = true;
          setPhase('lost');
          setStatusBanner('Hết mạng mất rồi! Thử lại nhé!');
          return;
        }
        soundFX.tap();
        g.px = g.respawnX;
        g.py = g.respawnY;
        g.vx = 0;
        g.vy = 0;
        g.onLadder = false;
        g.invuln = 1.4;
        setStatusBanner(`Bị té! Còn ${g.lives} mạng — quay lại mốc gần nhất!`);
      }

      // Reached Finish Flag
      if (g.px + PLAYER_W >= map.finishX - 8 && Math.abs(g.py + PLAYER_H - map.finishY) < 76) {
        g.ended = true;
        const lifeRatio = g.lives / map.lives;
        const reward =
          lifeRatio >= 1
            ? map.rewardMax
            : Math.max(map.rewardMin, Math.round(map.rewardMin + (map.rewardMax - map.rewardMin) * lifeRatio));
        setRewardedCg(reward);
        setProgressPct(100);
        setElapsedSec(Number(g.time.toFixed(1)));
        onEarnCoinGame(reward);
        soundFX.sparkle();
        setPhase('won');
        return;
      }

      // Camera smooth follow
      const targetCamX = Math.max(0, Math.min(map.finishX + 180 - CANVAS_W, g.px - CANVAS_W * 0.34));
      g.camX += (targetCamX - g.camX) * Math.min(1, dt * 8);

      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.12) {
        hudSyncAcc = 0;
        setElapsedSec(Number(g.time.toFixed(1)));
        setProgressPct(Math.max(0, Math.min(99, Math.round((g.px / map.finishX) * 100))));
      }

      // RENDER
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        skyGrad.addColorStop(0, map.skyTop);
        skyGrad.addColorStop(1, map.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Starry sparkles on sky_temple
        if (map.id === 'sky_temple') {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          for (let s = 0; s < 26; s += 1) {
            const sx = ((s * 97 - g.camX * 0.15) % CANVAS_W + CANVAS_W) % CANVAS_W;
            const sy = 16 + ((s * 43) % 140);
            ctx.fillRect(sx, sy, 2, 2);
          }
        }

        // Parallax distant hills
        ctx.fillStyle = map.mountainColor;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H);
        for (let hx = -80; hx <= CANVAS_W + 120; hx += 120) {
          const worldHx = hx - ((g.camX * 0.25) % 240);
          ctx.lineTo(worldHx, 235 - Math.abs(Math.sin((hx + 40) * 0.015)) * 75);
        }
        ctx.lineTo(CANVAS_W, CANVAS_H);
        ctx.closePath();
        ctx.fill();

        // Clouds
        ctx.fillStyle = map.id === 'sky_temple' ? 'rgba(199,210,254,0.22)' : 'rgba(255,255,255,0.75)';
        for (let c = 0; c < 6; c += 1) {
          const cx = ((c * 175 - g.camX * 0.2 + g.time * 8) % (CANVAS_W + 120) + CANVAS_W + 120) % (CANVAS_W + 120) - 60;
          const cy = 42 + (c % 3) * 34;
          ctx.beginPath();
          ctx.arc(cx, cy, 18, 0, Math.PI * 2);
          ctx.arc(cx + 16, cy - 5, 22, 0, Math.PI * 2);
          ctx.arc(cx + 34, cy, 16, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        ctx.translate(-g.camX, 0);

        // Tall background trees
        for (const t of map.trees) {
          const trunkW = 24;
          ctx.fillStyle = '#78350F';
          ctx.fillRect(t.x - trunkW / 2, t.baseY - t.trunkH, trunkW, t.trunkH + 60);
          ctx.fillStyle = '#92400E';
          ctx.fillRect(t.x - trunkW / 2 + 4, t.baseY - t.trunkH, 6, t.trunkH + 60);

          const leafMain =
            t.tone === 'emerald' ? '#16A34A' : t.tone === 'pine' ? '#0F766E' : '#EA580C';
          const leafLight =
            t.tone === 'emerald' ? '#4ADE80' : t.tone === 'pine' ? '#2DD4BF' : '#FB923C';
          const topY = t.baseY - t.trunkH;
          ctx.fillStyle = leafMain;
          ctx.beginPath();
          ctx.arc(t.x, topY, t.canopyR, 0, Math.PI * 2);
          ctx.arc(t.x - t.canopyR * 0.65, topY + 14, t.canopyR * 0.72, 0, Math.PI * 2);
          ctx.arc(t.x + t.canopyR * 0.65, topY + 14, t.canopyR * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = leafLight;
          ctx.beginPath();
          ctx.arc(t.x - 8, topY - 12, t.canopyR * 0.56, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ladders & Vines (Thang dây)
        for (const l of map.ladders) {
          const sway = Math.sin(g.time * 2.4 + l.x * 0.02) * 1.8;
          ctx.strokeStyle = l.kind === 'rope' ? '#D97706' : '#15803D';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x + sway, l.y + l.h);
          ctx.moveTo(l.x + 14, l.y);
          ctx.lineTo(l.x + 14 + sway, l.y + l.h);
          ctx.stroke();

          ctx.strokeStyle = l.kind === 'rope' ? '#FEF3C7' : '#86EFAC';
          ctx.lineWidth = 3.2;
          for (let ry = l.y + 10; ry < l.y + l.h - 4; ry += 14) {
            const ratio = (ry - l.y) / Math.max(1, l.h);
            const rx = l.x + sway * ratio;
            ctx.beginPath();
            ctx.moveTo(rx - 2, ry);
            ctx.lineTo(rx + 16, ry);
            ctx.stroke();
          }
        }

        // Platforms
        for (const p of dynPlatforms) {
          if (p.kind === 'bounce') {
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.ellipse(p.cx + p.w / 2, p.cy + 5, p.w / 2, 9, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FEF2F2';
            ctx.beginPath();
            ctx.arc(p.cx + p.w * 0.3, p.cy + 1, 3, 0, Math.PI * 2);
            ctx.arc(p.cx + p.w * 0.7, p.cy + 1, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FDE68A';
            ctx.fillRect(p.cx + p.w / 2 - 6, p.cy + 5, 12, 9);
          } else {
            ctx.fillStyle =
              p.kind === 'ground'
                ? '#78350F'
                : p.kind === 'canopy'
                  ? '#15803D'
                  : p.kind === 'stone'
                    ? '#475569'
                    : p.kind === 'moving'
                      ? '#0284C7'
                      : '#B45309';
            ctx.beginPath();
            ctx.roundRect(p.cx, p.cy, p.w, p.h, 6);
            ctx.fill();

            ctx.fillStyle =
              p.kind === 'ground' || p.kind === 'canopy'
                ? '#4ADE80'
                : p.kind === 'stone'
                  ? '#94A3B8'
                  : p.kind === 'moving'
                    ? '#7DD3FC'
                    : '#FCD34D';
            ctx.beginPath();
            ctx.roundRect(p.cx, p.cy, p.w, Math.min(7, p.h), [6, 6, 2, 2]);
            ctx.fill();
          }
        }

        // Checkpoints
        map.checkpoints.forEach((cp, idx) => {
          const active = g.reachedCheckpoints.has(idx);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(cp.x, cp.y - 38, 4, 38);
          ctx.fillStyle = active ? '#22C55E' : '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(cp.x + 4, cp.y - 38);
          ctx.lineTo(cp.x + 26, cp.y - 30);
          ctx.lineTo(cp.x + 4, cp.y - 22);
          ctx.closePath();
          ctx.fill();
        });

        // Finish Flag
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(map.finishX, map.finishY - 64, 5, 64);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(map.finishX + 5, map.finishY - 64);
        ctx.lineTo(map.finishX + 42, map.finishY - 50);
        ctx.lineTo(map.finishX + 5, map.finishY - 36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('ĐÍCH', map.finishX + 8, map.finishY - 46);

        // Player
        drawBoxHeadCharacter(ctx, g.px, g.py, PLAYER_W, PLAYER_H, {
          look: lookRef.current,
          facing: g.facing,
          vx: g.vx,
          vy: g.vy,
          onGround: g.onGround,
          onLadder: g.onLadder,
          invulnTimer: g.invuln,
          time: g.time,
        });

        ctx.restore();
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, onEarnCoinGame]);

  const setKey = (key: 'left' | 'right' | 'up' | 'down' | 'jump', pressed: boolean) => {
    keysRef.current[key] = pressed;
    if (!pressed && (key === 'jump' || key === 'up')) {
      jumpConsumedRef.current = false;
    }
  };

  if (phase === 'select') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] to-[#ECFDF5] p-3">
          <div className="flex items-center gap-1.5 text-sm font-black text-[#0F172A]">
            <MapIcon className="h-4 w-4 text-[#0284C7]" />
            <span>Chọn Map Parkour Leo Trèo</span>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-[#475569]">
            Leo thang dây, nhảy qua ngọn cây cao, bật nấm nhún để về đích. Té vực sẽ trừ 1 mạng!
          </p>
        </div>

        <div className="space-y-2">
          {PARKOUR_MAPS.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                soundFX.tap();
                startMapRun(idx);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[#E2E8F0] bg-white p-3 text-left transition hover:border-[#38BDF8] active:scale-[0.99]"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-black text-[#0F172A]">{m.name}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${m.badgeColor}`}>
                    {m.difficulty}
                  </span>
                </div>
                <p className="text-[11px] font-medium leading-snug text-[#475569]">
                  {m.description}
                </p>
                <div className="text-[11px] font-black text-[#0284C7]">
                  Thưởng: +{m.rewardMin} đến +{m.rewardMax} CoinGame
                </div>
              </div>
              <span className="shrink-0 rounded-xl bg-[#0EA5E9] px-3 py-2 text-xs font-black text-white shadow-xs">
                Vào Map
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Top Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-black">
        <div className="flex items-center gap-2">
          <span className="text-[#0F172A]">{activeMap.name}</span>
          <span className="flex items-center gap-0.5 text-[#EF4444]">
            {Array.from({length: activeMap.lives}, (_, idx) => (
              <Heart
                key={idx}
                className={`h-3.5 w-3.5 ${
                  idx < livesLeft ? 'fill-[#EF4444] text-[#EF4444]' : 'text-[#CBD5E1]'
                }`}
              />
            ))}
          </span>
        </div>

        <div className="flex items-center gap-2.5 tabular-nums text-[#334155]">
          <span className="flex items-center gap-1">
            <Flag className="h-3.5 w-3.5 text-[#10B981]" />
            {progressPct}%
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[#0284C7]" />
            {elapsedSec.toFixed(1)}s
          </span>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setPhase('select');
            }}
            className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[10px] font-black text-[#334155] active:scale-95"
          >
            Đổi Map
          </button>
        </div>
      </div>

      {/* Playfield */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#CBD5E1] bg-[#E0F2FE]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block aspect-[620/340] w-full select-none"
        />

        {(phase === 'won' || phase === 'lost') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A]/75 p-4 text-center text-white backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Trophy className={`h-7 w-7 ${phase === 'won' ? 'text-[#FDE047]' : 'text-[#FCA5A5]'}`} />
            </div>
            <div className="mt-2 text-base font-black">
              {phase === 'won' ? 'Chinh Phục Đỉnh Cao!' : 'Hết Mạng Mất Rồi!'}
            </div>
            <div className="mt-1 text-xs font-semibold text-white/90">
              {phase === 'won'
                ? `Hoàn thành ${activeMap.name} trong ${elapsedSec.toFixed(1)}s (còn ${livesLeft} mạng)`
                : `Bạn đã té hết ${activeMap.lives} mạng ở map ${activeMap.name}.`}
            </div>
            {phase === 'won' && (
              <div className="mt-2 flex items-center gap-1 rounded-xl bg-[#0EA5E9] px-3 py-1 text-xs font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                <span>+{rewardedCg} CoinGame</span>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  startMapRun(selectedMapIdx);
                }}
                className="flex items-center gap-1 rounded-xl bg-[#22C55E] px-3.5 py-2 text-xs font-black text-white active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Chơi lại</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setPhase('select');
                }}
                className="rounded-xl bg-white/20 px-3.5 py-2 text-xs font-black text-white active:scale-95"
              >
                Chọn Map khác
              </button>
            </div>
          </div>
        )}
      </div>

      {statusBanner && (
        <div className="rounded-xl bg-[#EFF6FF] px-3 py-1.5 text-center text-[11px] font-bold text-[#1E40AF]">
          {statusBanner}
        </div>
      )}

      {/* Touch & Mouse Controls */}
      <div className="flex items-center justify-between gap-2 pt-0.5 select-none">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onPointerDown={() => setKey('left', true)}
            onPointerUp={() => setKey('left', false)}
            onPointerLeave={() => setKey('left', false)}
            onPointerCancel={() => setKey('left', false)}
            aria-label="Sang trái"
            className="flex h-11 w-12 items-center justify-center rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A] active:bg-[#BAE6FD]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => setKey('up', true)}
            onPointerUp={() => setKey('up', false)}
            onPointerLeave={() => setKey('up', false)}
            onPointerCancel={() => setKey('up', false)}
            aria-label="Leo lên"
            className="flex h-11 w-12 items-center justify-center rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A] active:bg-[#BAE6FD]"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => setKey('down', true)}
            onPointerUp={() => setKey('down', false)}
            onPointerLeave={() => setKey('down', false)}
            onPointerCancel={() => setKey('down', false)}
            aria-label="Leo xuống"
            className="flex h-11 w-12 items-center justify-center rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A] active:bg-[#BAE6FD]"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => setKey('right', true)}
            onPointerUp={() => setKey('right', false)}
            onPointerLeave={() => setKey('right', false)}
            onPointerCancel={() => setKey('right', false)}
            aria-label="Sang phải"
            className="flex h-11 w-12 items-center justify-center rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] text-[#0F172A] active:bg-[#BAE6FD]"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onPointerDown={() => setKey('jump', true)}
          onPointerUp={() => setKey('jump', false)}
          onPointerLeave={() => setKey('jump', false)}
          onPointerCancel={() => setKey('jump', false)}
          className="flex h-11 min-w-[96px] items-center justify-center gap-1 rounded-xl bg-[#0EA5E9] px-4 text-xs font-black text-white shadow-sm active:scale-95"
        >
          <Zap className="h-4 w-4" />
          <span>NHẢY</span>
        </button>
      </div>
      <div className="text-center text-[10px] font-semibold text-[#64748B]">
        Phím: A/D hoặc ←/→ chạy · W/↑ leo thang &amp; nhảy · S/↓ leo xuống · Space nhảy
      </div>
    </div>
  );
};

// ============================================================================
// 2. VƯỢT CHƯỚNG NGẠI VẬT (1 Map To, Đá Lăn, Thanh Quạt Té, Hố Sụp, Gai, Mưa Độc, Đếm Giây)
// ============================================================================
const OBSTACLE_MAX_LIVES = 5;
const OBSTACLE_FINISH_X = 4120;

interface GroundSlab {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PitfallTile {
  x: number;
  y: number;
  w: number;
  steppedAt: number | null;
  fallen: boolean;
  resetAt: number | null;
}

interface SpikeHazard {
  x: number;
  y: number;
  w: number;
  popup?: boolean;
  phaseOffset?: number;
}

interface SweeperHazard {
  pivotX: number;
  pivotY: number;
  len: number;
  speed: number;
}

interface BoulderLane {
  spawnX: number;
  minX: number;
  y: number;
  interval: number;
  speed: number;
  radius: number;
}

interface ToxicRainZone {
  x: number;
  w: number;
}

const OBSTACLE_SLABS: GroundSlab[] = [
  {x: 0, y: 268, w: 690, h: 72},
  {x: 780, y: 268, w: 500, h: 72},
  {x: 1380, y: 268, w: 580, h: 72},
  {x: 2050, y: 268, w: 620, h: 72},
  {x: 2770, y: 268, w: 590, h: 72},
  {x: 3450, y: 268, w: 800, h: 72},
  // Elevated helper ledges
  {x: 420, y: 208, w: 96, h: 16},
  {x: 1090, y: 206, w: 96, h: 16},
  {x: 1710, y: 206, w: 96, h: 16},
  {x: 2420, y: 204, w: 105, h: 16},
  {x: 3120, y: 204, w: 105, h: 16},
  {x: 3740, y: 204, w: 96, h: 16},
];

const OBSTACLE_PITFALL_BASES: {x: number; y: number; w: number}[] = [
  {x: 690, y: 268, w: 90},
  {x: 1280, y: 268, w: 100},
  {x: 1960, y: 268, w: 90},
  {x: 2670, y: 268, w: 100},
  {x: 3360, y: 268, w: 90},
];

const OBSTACLE_SPIKES: SpikeHazard[] = [
  {x: 310, y: 268, w: 46},
  {x: 910, y: 268, w: 52, popup: true, phaseOffset: 0},
  {x: 1470, y: 268, w: 52},
  {x: 1810, y: 268, w: 48, popup: true, phaseOffset: 1.2},
  {x: 2300, y: 268, w: 52},
  {x: 2940, y: 268, w: 56, popup: true, phaseOffset: 0.6},
  {x: 3560, y: 268, w: 52},
  {x: 3920, y: 268, w: 48, popup: true, phaseOffset: 1.8},
];

const OBSTACLE_SWEEPERS: SweeperHazard[] = [
  {pivotX: 545, pivotY: 234, len: 50, speed: 2.3},
  {pivotX: 1185, pivotY: 234, len: 52, speed: -2.6},
  {pivotX: 1665, pivotY: 234, len: 52, speed: 2.7},
  {pivotX: 2560, pivotY: 234, len: 54, speed: -2.9},
  {pivotX: 3240, pivotY: 234, len: 54, speed: 3.1},
  {pivotX: 3825, pivotY: 234, len: 54, speed: -3.2},
];

const OBSTACLE_BOULDER_LANES: BoulderLane[] = [
  {spawnX: 660, minX: 170, y: 268, interval: 3.6, speed: 128, radius: 17},
  {spawnX: 2620, minX: 2070, y: 268, interval: 3.1, speed: 148, radius: 19},
  {spawnX: 3990, minX: 3465, y: 268, interval: 2.8, speed: 158, radius: 20},
];

const OBSTACLE_TOXIC_RAIN: ToxicRainZone[] = [
  {x: 1120, w: 255},
  {x: 2355, w: 280},
  {x: 3520, w: 285},
];

const OBSTACLE_CHECKPOINTS = [
  {x: 840, y: 268},
  {x: 2095, y: 268},
  {x: 3475, y: 268},
];

function computeObstacleCoinGameReward(seconds: number): number {
  if (seconds <= 35) return 6;
  if (seconds <= 50) return 5;
  if (seconds <= 65) return 4;
  if (seconds <= 85) return 3;
  if (seconds <= 110) return 2;
  return 1;
}

export const ObstacleRushGame: React.FC<{
  avatar?: AvatarConfig;
  onEarnCoinGame: (amt: number) => void;
}> = ({avatar, onEarnCoinGame}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const [livesLeft, setLivesLeft] = useState(OBSTACLE_MAX_LIVES);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [isSlowed, setIsSlowed] = useState(false);
  const [rewardedCg, setRewardedCg] = useState(0);
  const [alertText, setAlertText] = useState<string>('Nhấn Bắt đầu để chạy về đích!');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<{left: boolean; right: boolean; jump: boolean}>({
    left: false,
    right: false,
    jump: false,
  });
  const jumpConsumedRef = useRef(false);
  const lookRef = useRef<AvatarLook>(resolveAvatarLook(avatar));
  lookRef.current = resolveAvatarLook(avatar);

  const gameRef = useRef<{
    px: number;
    py: number;
    vx: number;
    vy: number;
    facing: 1 | -1;
    onGround: boolean;
    coyote: number;
    invuln: number;
    knockVx: number;
    lives: number;
    respawnX: number;
    respawnY: number;
    camX: number;
    time: number;
    ended: boolean;
    reachedCheckpoints: Set<number>;
    pitfalls: PitfallTile[];
    boulders: {x: number; y: number; r: number; speed: number; minX: number; rot: number}[];
    laneTimers: number[];
    bannerText: string;
    bannerTimer: number;
  }>({
    px: 45,
    py: 230,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyote: 0,
    invuln: 0,
    knockVx: 0,
    lives: OBSTACLE_MAX_LIVES,
    respawnX: 45,
    respawnY: 230,
    camX: 0,
    time: 0,
    ended: false,
    reachedCheckpoints: new Set<number>(),
    pitfalls: OBSTACLE_PITFALL_BASES.map((b) => ({
      ...b,
      steppedAt: null,
      fallen: false,
      resetAt: null,
    })),
    boulders: [],
    laneTimers: OBSTACLE_BOULDER_LANES.map(() => 0.4),
    bannerText: '',
    bannerTimer: 0,
  });

  const startRun = useCallback(() => {
    soundFX.tap();
    jumpConsumedRef.current = false;
    setLivesLeft(OBSTACLE_MAX_LIVES);
    setElapsedSec(0);
    setProgressPct(0);
    setIsSlowed(false);
    setRewardedCg(0);
    setAlertText('Né đá lăn, thanh quạt, hố sụp, gai & mưa độc!');
    gameRef.current = {
      px: 45,
      py: 230,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyote: 0,
      invuln: 0,
      knockVx: 0,
      lives: OBSTACLE_MAX_LIVES,
      respawnX: 45,
      respawnY: 230,
      camX: 0,
      time: 0,
      ended: false,
      reachedCheckpoints: new Set<number>(),
      pitfalls: OBSTACLE_PITFALL_BASES.map((b) => ({
        ...b,
        steppedAt: null,
        fallen: false,
        resetAt: null,
      })),
      boulders: OBSTACLE_BOULDER_LANES.map((lane) => ({
        x: lane.spawnX - 180,
        y: lane.y - lane.radius,
        r: lane.radius,
        speed: lane.speed,
        minX: lane.minX,
        rot: 0,
      })),
      laneTimers: OBSTACLE_BOULDER_LANES.map((l) => l.interval * 0.65),
      bannerText: '',
      bannerTimer: 0,
    };
    setPhase('playing');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        keysRef.current.right = true;
      } else if (k === 'arrowup' || k === 'w' || k === ' ') {
        e.preventDefault();
        keysRef.current.jump = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = false;
      else if (k === 'arrowright' || k === 'd') keysRef.current.right = false;
      else if (k === 'arrowup' || k === 'w' || k === ' ') {
        keysRef.current.jump = false;
        jumpConsumedRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = 0;
    let lastTs = performance.now();
    let hudSyncAcc = 0;

    const triggerHit = (reason: string, respawnAtCheckpoint: boolean, knockbackX = 0) => {
      const g = gameRef.current;
      if (g.ended || (!respawnAtCheckpoint && g.invuln > 0)) return;
      g.lives -= 1;
      setLivesLeft(g.lives);
      soundFX.tap();

      if (g.lives <= 0) {
        g.ended = true;
        setAlertText(`${reason} — Hết ${OBSTACLE_MAX_LIVES} mạng, kết thúc ván!`);
        setPhase('lost');
        return;
      }

      if (respawnAtCheckpoint) {
        g.px = g.respawnX;
        g.py = g.respawnY;
        g.vx = 0;
        g.vy = 0;
        g.knockVx = 0;
      } else {
        g.vy = -265;
        g.knockVx = knockbackX;
      }
      g.invuln = 1.3;
      g.bannerText = `${reason} (-1 mạng, còn ${g.lives})`;
      g.bannerTimer = 1.6;
      setAlertText(g.bannerText);
    };

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;
      const g = gameRef.current;
      if (g.ended) return;

      g.time += dt;
      if (g.invuln > 0) g.invuln = Math.max(0, g.invuln - dt);
      if (g.bannerTimer > 0) g.bannerTimer = Math.max(0, g.bannerTimer - dt);

      // Toxic rain slow check
      const playerMidX = g.px + PLAYER_W / 2;
      const inToxicRain = OBSTACLE_TOXIC_RAIN.some(
        (z) => playerMidX >= z.x && playerMidX <= z.x + z.w,
      );

      const keys = keysRef.current;
      const moveDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (moveDir !== 0) g.facing = moveDir > 0 ? 1 : -1;

      const baseSpeed = inToxicRain ? 108 : 212;
      g.knockVx *= Math.pow(0.04, dt);
      if (Math.abs(g.knockVx) < 5) g.knockVx = 0;
      g.vx = moveDir * baseSpeed + g.knockVx;

      g.vy = Math.min(680, g.vy + 1140 * dt);
      if (g.onGround) g.coyote = 0.1;
      else g.coyote = Math.max(0, g.coyote - dt);

      if (keys.jump && !jumpConsumedRef.current && g.coyote > 0) {
        g.vy = inToxicRain ? -405 : -450;
        g.onGround = false;
        g.coyote = 0;
        jumpConsumedRef.current = true;
        soundFX.tap();
      }

      const prevBottom = g.py + PLAYER_H;
      g.px = Math.max(0, Math.min(OBSTACLE_FINISH_X + 120, g.px + g.vx * dt));
      g.py += g.vy * dt;

      // Update pitfalls (Hố sụp)
      for (const pf of g.pitfalls) {
        if (pf.steppedAt !== null && !pf.fallen && g.time - pf.steppedAt >= 0.45) {
          pf.fallen = true;
          pf.resetAt = g.time + 2.4;
        }
        if (pf.fallen && pf.resetAt !== null && g.time >= pf.resetAt) {
          pf.fallen = false;
          pf.steppedAt = null;
          pf.resetAt = null;
        }
      }

      // Ground & pitfall landing
      g.onGround = false;
      for (const s of OBSTACLE_SLABS) {
        const withinX = g.px + PLAYER_W - 4 > s.x && g.px + 4 < s.x + s.w;
        const nextBottom = g.py + PLAYER_H;
        if (withinX && g.vy >= 0 && prevBottom <= s.y + 10 && nextBottom >= s.y) {
          g.py = s.y - PLAYER_H;
          g.vy = 0;
          g.onGround = true;
        }
      }
      for (const pf of g.pitfalls) {
        if (pf.fallen) continue;
        const withinX = g.px + PLAYER_W - 4 > pf.x && g.px + 4 < pf.x + pf.w;
        const nextBottom = g.py + PLAYER_H;
        if (withinX && g.vy >= 0 && prevBottom <= pf.y + 10 && nextBottom >= pf.y) {
          g.py = pf.y - PLAYER_H;
          g.vy = 0;
          g.onGround = true;
          if (pf.steppedAt === null) {
            pf.steppedAt = g.time;
          }
        }
      }

      // Update Rolling Boulders (Đá lăn)
      OBSTACLE_BOULDER_LANES.forEach((lane, idx) => {
        g.laneTimers[idx] -= dt;
        if (g.laneTimers[idx] <= 0) {
          g.laneTimers[idx] = lane.interval;
          g.boulders.push({
            x: lane.spawnX,
            y: lane.y - lane.radius,
            r: lane.radius,
            speed: lane.speed,
            minX: lane.minX,
            rot: 0,
          });
        }
      });

      g.boulders = g.boulders.filter((b) => {
        b.x -= b.speed * dt;
        b.rot -= (b.speed * dt) / Math.max(1, b.r);
        // Check hit with player
        const closestX = Math.max(g.px + 3, Math.min(b.x, g.px + PLAYER_W - 3));
        const closestY = Math.max(g.py + 3, Math.min(b.y, g.py + PLAYER_H - 3));
        if (Math.hypot(b.x - closestX, b.y - closestY) < b.r - 2) {
          triggerHit('Trúng đá lăn!', false, -210);
        }
        return b.x >= b.minX - 40;
      });

      // Check Spikes (Gai)
      for (const sp of OBSTACLE_SPIKES) {
        const activeHeight = sp.popup
          ? Math.max(0, Math.sin(g.time * 2.6 + (sp.phaseOffset ?? 0))) > 0.15
            ? 15
            : 2
          : 16;
        if (activeHeight >= 10) {
          const hitX = g.px + PLAYER_W - 5 > sp.x && g.px + 5 < sp.x + sp.w;
          const hitY = g.py + PLAYER_H > sp.y - activeHeight + 2 && g.py < sp.y;
          if (hitX && hitY) {
            triggerHit('Dẫm trúng gai nhọn!', false, -150);
          }
        }
      }

      // Check Spinning Sweeper Bars (Thanh chắn quạt té)
      for (const sw of OBSTACLE_SWEEPERS) {
        const angle = g.time * sw.speed;
        const tipX = sw.pivotX + Math.cos(angle) * sw.len;
        const tipY = sw.pivotY + Math.sin(angle) * sw.len;
        const cx = g.px + PLAYER_W / 2;
        const cy = g.py + PLAYER_H / 2;
        // Distance from player center to segment (pivot -> tip)
        const dx = tipX - sw.pivotX;
        const dy = tipY - sw.pivotY;
        const lenSq = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((cx - sw.pivotX) * dx + (cy - sw.pivotY) * dy) / lenSq));
        const projX = sw.pivotX + t * dx;
        const projY = sw.pivotY + t * dy;
        if (Math.hypot(cx - projX, cy - projY) < 14) {
          triggerHit('Bị thanh chắn quạt té!', false, -265);
        }
      }

      // Checkpoints
      OBSTACLE_CHECKPOINTS.forEach((cp, idx) => {
        if (!g.reachedCheckpoints.has(idx) && g.px >= cp.x - 16) {
          g.reachedCheckpoints.add(idx);
          g.respawnX = cp.x;
          g.respawnY = cp.y - PLAYER_H - 4;
          soundFX.sparkle();
          g.bannerText = `Qua trạm lưu #${idx + 1}!`;
          g.bannerTimer = 1.4;
          setAlertText(g.bannerText);
        }
      });

      // Fell into pit / hố sụp
      if (g.py > CANVAS_H + 34) {
        triggerHit('Rơi xuống hố sụp!', true);
        if (g.ended) return;
      }

      // Reached Finish Line
      if (g.px + PLAYER_W >= OBSTACLE_FINISH_X) {
        g.ended = true;
        const sec = Number(g.time.toFixed(1));
        const reward = computeObstacleCoinGameReward(sec);
        setElapsedSec(sec);
        setProgressPct(100);
        setRewardedCg(reward);
        onEarnCoinGame(reward);
        soundFX.sparkle();
        setPhase('won');
        return;
      }

      const targetCamX = Math.max(0, Math.min(OBSTACLE_FINISH_X + 140 - CANVAS_W, g.px - CANVAS_W * 0.3));
      g.camX += (targetCamX - g.camX) * Math.min(1, dt * 8);

      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.1) {
        hudSyncAcc = 0;
        setElapsedSec(Number(g.time.toFixed(1)));
        setProgressPct(Math.max(0, Math.min(99, Math.round((g.px / OBSTACLE_FINISH_X) * 100))));
        setIsSlowed(inToxicRain);
      }

      // RENDER
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        sky.addColorStop(0, '#FFE4C4');
        sky.addColorStop(1, '#FFFBEB');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Distant stadium hills
        ctx.fillStyle = '#FDBA74';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H);
        for (let hx = -60; hx <= CANVAS_W + 120; hx += 120) {
          ctx.lineTo(hx - ((g.camX * 0.2) % 240), 220 - Math.abs(Math.sin(hx * 0.02)) * 55);
        }
        ctx.lineTo(CANVAS_W, CANVAS_H);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(-g.camX, 0);

        // Toxic Rain Zones (Mưa độc đi chậm)
        for (const z of OBSTACLE_TOXIC_RAIN) {
          ctx.fillStyle = 'rgba(147, 51, 234, 0.12)';
          ctx.fillRect(z.x, 48, z.w, 220);

          // Dark purple storm cloud at top
          ctx.fillStyle = '#581C87';
          for (let cx = z.x + 18; cx < z.x + z.w - 12; cx += 34) {
            ctx.beginPath();
            ctx.arc(cx, 44, 22, 0, Math.PI * 2);
            ctx.fill();
          }

          // Animated toxic raindrops
          ctx.strokeStyle = '#A3E635';
          ctx.lineWidth = 2;
          for (let r = 0; r < 18; r += 1) {
            const rx = z.x + ((r * 37 + g.time * 40) % z.w);
            const ry = 55 + ((r * 53 + g.time * 240) % 205);
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 3, ry + 11);
            ctx.stroke();
          }

          ctx.fillStyle = '#6B21A8';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('MƯA ĐỘC · CHẬM', z.x + z.w / 2 - 42, 74);
        }

        // Ground Slabs
        for (const s of OBSTACLE_SLABS) {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.roundRect(s.x, s.y, s.w, s.h, 6);
          ctx.fill();
          ctx.fillStyle = s.h > 30 ? '#F97316' : '#CBD5E1';
          ctx.fillRect(s.x, s.y, s.w, 7);
        }

        // Collapsing Pitfalls (Hố sụp)
        for (const pf of g.pitfalls) {
          if (pf.fallen) {
            ctx.strokeStyle = '#DC2626';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(pf.x + 2, pf.y, pf.w - 4, 14);
            ctx.setLineDash([]);
          } else {
            const shakeX = pf.steppedAt !== null ? Math.sin(g.time * 45) * 3 : 0;
            ctx.fillStyle = pf.steppedAt !== null ? '#EF4444' : '#F59E0B';
            ctx.beginPath();
            ctx.roundRect(pf.x + shakeX, pf.y, pf.w, 14, 4);
            ctx.fill();
            // Cracks
            ctx.strokeStyle = '#78350F';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(pf.x + shakeX + pf.w * 0.3, pf.y + 1);
            ctx.lineTo(pf.x + shakeX + pf.w * 0.4, pf.y + 12);
            ctx.moveTo(pf.x + shakeX + pf.w * 0.7, pf.y + 2);
            ctx.lineTo(pf.x + shakeX + pf.w * 0.62, pf.y + 13);
            ctx.stroke();
          }
        }

        // Spikes (Gai)
        for (const sp of OBSTACLE_SPIKES) {
          const activeH = sp.popup
            ? Math.max(0, Math.sin(g.time * 2.6 + (sp.phaseOffset ?? 0))) > 0.15
              ? 15
              : 2
            : 16;
          ctx.fillStyle = sp.popup ? '#E11D48' : '#DC2626';
          const count = Math.max(2, Math.floor(sp.w / 12));
          const stepW = sp.w / count;
          for (let i = 0; i < count; i += 1) {
            const sx = sp.x + i * stepW;
            ctx.beginPath();
            ctx.moveTo(sx, sp.y);
            ctx.lineTo(sx + stepW / 2, sp.y - activeH);
            ctx.lineTo(sx + stepW, sp.y);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Spinning Sweeper Bars (Thanh chắn quạt té)
        for (const sw of OBSTACLE_SWEEPERS) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(sw.pivotX - 4, sw.pivotY, 8, 34);
          const angle = g.time * sw.speed;
          const tipX = sw.pivotX + Math.cos(angle) * sw.len;
          const tipY = sw.pivotY + Math.sin(angle) * sw.len;

          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sw.pivotX, sw.pivotY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(sw.pivotX, sw.pivotY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(sw.pivotX, sw.pivotY, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Rolling Boulders (Đá lăn)
        for (const b of g.boulders) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(-b.r * 0.35, -b.r * 0.25, b.r * 0.25, 0, Math.PI * 2);
          ctx.arc(b.r * 0.3, b.r * 0.3, b.r * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Checkpoints
        OBSTACLE_CHECKPOINTS.forEach((cp, idx) => {
          const active = g.reachedCheckpoints.has(idx);
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(cp.x, cp.y - 38, 4, 38);
          ctx.fillStyle = active ? '#22C55E' : '#38BDF8';
          ctx.beginPath();
          ctx.moveTo(cp.x + 4, cp.y - 38);
          ctx.lineTo(cp.x + 26, cp.y - 30);
          ctx.lineTo(cp.x + 4, cp.y - 22);
          ctx.closePath();
          ctx.fill();
        });

        // Finish Arch
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(OBSTACLE_FINISH_X, 180, 7, 88);
        ctx.fillStyle = '#16A34A';
        ctx.beginPath();
        ctx.roundRect(OBSTACLE_FINISH_X - 24, 162, 66, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('VỀ ĐÍCH', OBSTACLE_FINISH_X - 15, 178);

        // Player
        drawBoxHeadCharacter(ctx, g.px, g.py, PLAYER_W, PLAYER_H, {
          look: lookRef.current,
          facing: g.facing,
          vx: g.vx,
          vy: g.vy,
          onGround: g.onGround,
          onLadder: false,
          slowed: inToxicRain,
          invulnTimer: g.invuln,
          time: g.time,
        });

        ctx.restore();
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase, onEarnCoinGame]);

  const setKey = (key: 'left' | 'right' | 'jump', pressed: boolean) => {
    keysRef.current[key] = pressed;
    if (!pressed && key === 'jump') jumpConsumedRef.current = false;
  };

  const expectedCg = computeObstacleCoinGameReward(elapsedSec);

  return (
    <div className="space-y-2.5">
      {/* Live Timer & Expected CoinGame Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] px-3 py-2 text-xs font-black">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-[#EF4444]">
            {Array.from({length: OBSTACLE_MAX_LIVES}, (_, idx) => (
              <Heart
                key={idx}
                className={`h-3.5 w-3.5 ${
                  idx < livesLeft ? 'fill-[#EF4444] text-[#EF4444]' : 'text-[#FED7AA]'
                }`}
              />
            ))}
          </span>
          {isSlowed && (
            <span className="flex items-center gap-1 rounded-md bg-[#7E22CE] px-1.5 py-0.5 text-[10px] font-black text-white">
              <CloudRain className="h-3 w-3" />
              Mưa độc (Chậm!)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 tabular-nums text-[#7C2D12]">
          <span className="flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-[#EA580C]" />
            {progressPct}%
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[#9A3412]">
            <Clock className="h-3.5 w-3.5 text-[#EA580C]" />
            {elapsedSec.toFixed(1)}s
          </span>
          <span className="rounded-lg bg-[#0EA5E9] px-2 py-0.5 text-[11px] text-white">
            +{expectedCg} CG
          </span>
        </div>
      </div>

      {/* Playfield */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#FDBA74] bg-[#FFFBEB]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block aspect-[620/340] w-full select-none"
        />

        {phase === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A]/75 p-4 text-center text-white backdrop-blur-[2px]">
            <div className="text-base font-black text-[#FDE047]">
              Đại Lộ Vượt Chướng Ngại Vật
            </div>
            <p className="mt-1.5 max-w-sm text-xs font-semibold leading-relaxed text-white/90">
              Vượt qua <b>Đá lăn</b>, <b>Thanh chắn quạt té</b>, <b>Hố sụp</b>, <b>Gai nhọn</b> &amp; <b>Mưa độc đi chậm</b>. Về đích càng nhanh càng nhiều CoinGame (tối đa +6 CG). Chết 5 mạng sẽ kết thúc ván!
            </p>
            <button
              type="button"
              onClick={startRun}
              className="mt-3 rounded-2xl bg-[#F97316] px-5 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95"
            >
              Bắt Đầu Chạy Về Đích
            </button>
          </div>
        )}

        {(phase === 'won' || phase === 'lost') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A]/78 p-4 text-center text-white backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Trophy className={`h-7 w-7 ${phase === 'won' ? 'text-[#FDE047]' : 'text-[#FCA5A5]'}`} />
            </div>
            <div className="mt-2 text-base font-black">
              {phase === 'won' ? `Về Đích Trong ${elapsedSec.toFixed(1)} Giây!` : 'Hết 5 Mạng — Kết Thúc Ván!'}
            </div>
            <div className="mt-1 text-xs font-semibold text-white/90">
              {phase === 'won'
                ? 'Về càng nhanh phần thưởng CoinGame càng cao!'
                : 'Hãy né đá lăn, thanh chắn quạt, gai và hố sụp thật khéo nhé!'}
            </div>
            {phase === 'won' && (
              <div className="mt-2 flex items-center gap-1 rounded-xl bg-[#0EA5E9] px-3 py-1 text-xs font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                <span>+{rewardedCg} CoinGame</span>
              </div>
            )}
            <button
              type="button"
              onClick={startRun}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-black text-white active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Chơi lại</span>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[#FFF7ED] px-3 py-1.5 text-center text-[11px] font-bold text-[#9A3412]">
        {alertText}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-0.5 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => setKey('left', true)}
            onPointerUp={() => setKey('left', false)}
            onPointerLeave={() => setKey('left', false)}
            onPointerCancel={() => setKey('left', false)}
            aria-label="Chạy trái"
            className="flex h-11 w-14 items-center justify-center rounded-xl border border-[#FDBA74] bg-[#FFEDD5] text-[#7C2D12] active:bg-[#FDBA74]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => setKey('right', true)}
            onPointerUp={() => setKey('right', false)}
            onPointerLeave={() => setKey('right', false)}
            onPointerCancel={() => setKey('right', false)}
            aria-label="Chạy phải"
            className="flex h-11 w-14 items-center justify-center rounded-xl border border-[#FDBA74] bg-[#FFEDD5] text-[#7C2D12] active:bg-[#FDBA74]"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onPointerDown={() => setKey('jump', true)}
          onPointerUp={() => setKey('jump', false)}
          onPointerLeave={() => setKey('jump', false)}
          onPointerCancel={() => setKey('jump', false)}
          className="flex h-11 min-w-[110px] items-center justify-center gap-1.5 rounded-xl bg-[#F97316] px-5 text-xs font-black text-white shadow-sm active:scale-95"
        >
          <Zap className="h-4 w-4" />
          <span>NHẢY</span>
        </button>
      </div>
      <div className="text-center text-[10px] font-semibold text-[#64748B]">
        Phím: A/D hoặc ←/→ chạy · W/↑/Space nhảy · ≤35s: +6 CG · ≤50s: +5 CG · ≤65s: +4 CG
      </div>
    </div>
  );
};
