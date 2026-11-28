import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Coins,
  Flag,
  Gift,
  Hammer,
  Monitor,
  Mountain,
  Music,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {ArcadeGameId, AvatarConfig, COINGAME_TO_XU_RATE} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {ObstacleRushGame, ParkourClimbGame} from './ArcadeActionGames';

interface ArcadeMiniGameModalProps {
  gameId: ArcadeGameId;
  avatar?: AvatarConfig;
  coins: number;
  coinGame: number;
  hasFreeClawToday: boolean;
  onUseFreeClawToday: () => void;
  onSpendCoins: (amount: number) => boolean;
  onEarnCoinGame: (amount: number) => void;
  onEarnCoins: (amount: number) => void;
  onSelectGame: (next: ArcadeGameId) => void;
  onClose: () => void;
}

const GAME_META: Record<
  ArcadeGameId,
  {title: string; badge: string; headerBg: string; accentBorder: string}
> = {
  whack_mole: {
    title: 'Đập Chuột Vui Nhộn',
    badge: '+1 đến +3 CG · 30s',
    headerBg: 'bg-gradient-to-r from-[#EC4899] to-[#F472B6]',
    accentBorder: 'border-[#F472B6]',
  },
  catch_stars: {
    title: 'Hứng Sao Bầu Trời',
    badge: '+1 đến +3 CG · 30s',
    headerBg: 'bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]',
    accentBorder: 'border-[#38BDF8]',
  },
  claw_ball: {
    title: 'Máy Gắp Bóng ?',
    badge: '15 Xu/lượt · 0–5 CG',
    headerBg: 'bg-gradient-to-r from-[#F59E0B] to-[#FB923C]',
    accentBorder: 'border-[#FBBF24]',
  },
  rhythm_dance: {
    title: 'Sàn Nhảy Rhythm (4 Bài Nhạc)',
    badge: '+1 đến +5 CG · 35s',
    headerBg: 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]',
    accentBorder: 'border-[#818CF8]',
  },
  pc_games: {
    title: 'Dàn PC Mini HTML',
    badge: '+1 đến +9 Xu',
    headerBg: 'bg-gradient-to-r from-[#10B981] to-[#34D399]',
    accentBorder: 'border-[#34D399]',
  },
  parkour_climb: {
    title: 'Parkour Phiêu Lưu 3D',
    badge: '1 Map Lớn · ~2 Phút · +12–18 CG',
    headerBg: 'bg-gradient-to-r from-[#0284C7] to-[#10B981]',
    accentBorder: 'border-[#38BDF8]',
  },
  obstacle_rush: {
    title: 'Vượt Chướng Ngại Vật 3D',
    badge: '1000m · ~2 Phút · +10–19 CG',
    headerBg: 'bg-gradient-to-r from-[#EA580C] to-[#FB923C]',
    accentBorder: 'border-[#FB923C]',
  },
};

/**
 * Balanced CoinGame reward per 30s round (~1.5–2 CG avg = 15–20 Xu, matching 30–40 Xu/min fishing & bug catching)
 */
function computeCoinGameTier(score: number): number {
  if (score >= 220) return 3;
  if (score >= 100) return 2;
  return 1;
}

// ============================================================================
// CUSTOM SVG GAME SPRITES (Bright, Crisp, Zero-Text Visuals)
// ============================================================================
const MoleSprite: React.FC<{golden?: boolean}> = ({golden = false}) => (
  <svg viewBox="0 0 64 64" className="h-14 w-14 drop-shadow-md" aria-hidden="true">
    {/* Little Crown for Golden King Mole */}
    {golden && (
      <path
        d="M20 14 L23 5 L32 11 L41 5 L44 14 Z"
        fill="#FDE047"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    )}
    {/* Ears */}
    <circle
      cx="16"
      cy="24"
      r="7"
      fill={golden ? '#F59E0B' : '#0284C7'}
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    <circle
      cx="48"
      cy="24"
      r="7"
      fill={golden ? '#F59E0B' : '#0284C7'}
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    {/* Head & Body */}
    <path
      d="M14 54 C14 26 20 15 32 15 C44 15 50 26 50 54 Z"
      fill={golden ? '#FBBF24' : '#38BDF8'}
      stroke="#FFFFFF"
      strokeWidth="2.5"
    />
    {/* Belly */}
    <ellipse cx="32" cy="46" rx="11" ry="8" fill={golden ? '#FEF3C7' : '#E0F2FE'} />
    {/* Cool Cyber Visor / Glasses */}
    <rect
      x="18"
      y="24"
      width="28"
      height="10"
      rx="5"
      fill={golden ? '#78350F' : '#1E293B'}
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <circle cx="25" cy="29" r="2.2" fill="#FFFFFF" />
    <circle cx="39" cy="29" r="2.2" fill="#FFFFFF" />
    {/* Rosy cheeks */}
    <ellipse cx="20" cy="37" rx="3.2" ry="2" fill="#FB7185" opacity="0.8" />
    <ellipse cx="44" cy="37" rx="3.2" ry="2" fill="#FB7185" opacity="0.8" />
    {/* Cute Pink Nose + Buck Tooth */}
    <ellipse cx="32" cy="36" rx="4.2" ry="3" fill="#FB7185" />
    <rect x="29.5" y="40" width="5" height="4" rx="1" fill="#FFFFFF" />
    {/* Paws */}
    <circle cx="20" cy="49" r="4" fill={golden ? '#F59E0B' : '#0EA5E9'} stroke="#FFFFFF" strokeWidth="1.5" />
    <circle cx="44" cy="49" r="4" fill={golden ? '#F59E0B' : '#0EA5E9'} stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);

const BombSprite: React.FC = () => (
  <svg viewBox="0 0 64 64" className="h-13 w-13 drop-shadow-md" aria-hidden="true">
    {/* Fuse */}
    <path d="M35 16 Q42 8 49 11" fill="none" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
    {/* Sparkle Flame */}
    <polygon points="50,5 52,10 57,10 53,13 55,18 50,15 45,18 47,13 43,10 48,10" fill="#FDE047" />
    <circle cx="50" cy="11" r="3" fill="#F97316" />
    {/* Cap */}
    <rect x="27" y="14" width="10" height="6" rx="2" fill="#64748B" stroke="#FFFFFF" strokeWidth="1.5" />
    {/* Bomb Body */}
    <circle cx="32" cy="38" r="19" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.5" />
    <ellipse cx="25" cy="30" rx="5" ry="3" transform="rotate(-30 25 30)" fill="#FCA5A5" opacity="0.7" />
    {/* Warning X Eyes */}
    <path d="M23 35 L28 40 M28 35 L23 40 M36 35 L41 40 M41 35 L36 40" stroke="#FFF1F2" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const WovenBasketSvg: React.FC<{catchPulse?: boolean}> = ({catchPulse}) => (
  <svg
    viewBox="0 0 110 56"
    className={`h-12 w-24 drop-shadow-lg transition-transform duration-150 ${
      catchPulse ? 'scale-110' : 'scale-100'
    }`}
    aria-hidden="true"
  >
    {/* Inner Shadow */}
    <ellipse cx="55" cy="12" rx="46" ry="9" fill="#92400E" />
    {/* Woven Body */}
    <path
      d="M11 14 L22 48 C24 52 86 52 88 48 L99 14 Z"
      fill="#F59E0B"
      stroke="#78350F"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Weave Diagonal Stripes */}
    <path
      d="M22 24 L88 24 M25 34 L85 34 M28 43 L82 43 M34 15 L38 49 M55 15 L55 50 M76 15 L72 49"
      stroke="#B45309"
      strokeWidth="2.2"
      opacity="0.65"
    />
    {/* Top Rim */}
    <rect x="6" y="7" width="98" height="11" rx="5.5" fill="#FBBF24" stroke="#78350F" strokeWidth="2.5" />
    {/* Cute Center Star Emblem */}
    <polygon
      points="55,21 58,28 66,28 60,33 62,40 55,36 48,40 50,33 44,28 52,28"
      fill="#FEF08A"
      stroke="#92400E"
      strokeWidth="1.5"
    />
  </svg>
);

const StarItemSvg: React.FC<{gold?: boolean}> = ({gold = false}) => (
  <svg viewBox="0 0 48 48" className="h-10 w-10 drop-shadow-md" aria-hidden="true">
    <polygon
      points="24,3 29.5,16.5 44,17.5 33,27 36.5,41 24,33.5 11.5,41 15,27 4,17.5 18.5,16.5"
      fill={gold ? '#FDE047' : '#38BDF8'}
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <circle cx="20" cy="23" r="1.8" fill="#1E293B" />
    <circle cx="28" cy="23" r="1.8" fill="#1E293B" />
    <path d="M21.5 27 Q24 29.5 26.5 27" fill="none" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const MeteorSvg: React.FC = () => (
  <svg viewBox="0 0 48 54" className="h-11 w-10 drop-shadow-md" aria-hidden="true">
    {/* Flame Tail */}
    <path
      d="M15 26 Q12 8 24 2 Q36 8 33 26 Z"
      fill="#F97316"
      opacity="0.9"
    />
    <path d="M19 26 Q18 13 24 8 Q30 13 29 26 Z" fill="#FDE047" />
    {/* Craggy Rock */}
    <polygon
      points="12,30 18,22 30,22 36,30 33,42 22,46 13,40"
      fill="#64748B"
      stroke="#FEF2F2"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="20" cy="31" r="2.6" fill="#475569" />
    <circle cx="28" cy="37" r="2" fill="#475569" />
  </svg>
);

// ============================================================================
// 1. WHACK-A-MOLE (Full Visible 3x3 Meadow Board, Animated Hammer + Pops)
// ============================================================================
const WhackMoleGame: React.FC<{onEarnCoinGame: (amt: number) => void}> = ({onEarnCoinGame}) => {
  type HoleKind = 'empty' | 'cyber' | 'gold' | 'bomb';
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [rewarded, setRewarded] = useState(0);
  const [holes, setHoles] = useState<HoleKind[]>([
    'empty',
    'cyber',
    'empty',
    'gold',
    'empty',
    'cyber',
    'empty',
    'empty',
    'empty',
  ]);
  const [whackFx, setWhackFx] = useState<{idx: number; text: string; color: string} | null>(null);
  const scoreRef = useRef(0);
  const onEarnCoinGameRef = useRef(onEarnCoinGame);
  onEarnCoinGameRef.current = onEarnCoinGame;

  const start = () => {
    soundFX.sparkle();
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setRewarded(0);
    setTimeLeft(30);
    setWhackFx(null);
    setHoles(Array(9).fill('empty'));
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          const cg = computeCoinGameTier(scoreRef.current);
          setRewarded(cg);
          setPhase('done');
          onEarnCoinGameRef.current(cg);
          soundFX.sparkle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawner = window.setInterval(() => {
      setHoles(() => {
        const next: HoleKind[] = Array(9).fill('empty');
        const activeCount = Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < activeCount; i++) {
          const idx = Math.floor(Math.random() * 9);
          const roll = Math.random();
          next[idx] = roll < 0.18 ? 'bomb' : roll < 0.42 ? 'gold' : 'cyber';
        }
        return next;
      });
    }, 670);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(spawner);
    };
  }, [phase]);

  const hitHole = (idx: number) => {
    if (phase !== 'playing') return;
    const kind = holes[idx];
    if (kind === 'empty') return;

    setHoles((prev) => prev.map((h, i) => (i === idx ? 'empty' : h)));
    if (kind === 'bomb') {
      soundFX.tap();
      setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current - 15);
      setScore(scoreRef.current);
      setWhackFx({idx, text: '-15', color: 'text-[#DC2626]'});
    } else {
      soundFX.sparkle();
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      const base = kind === 'gold' ? 25 : 12;
      const bonus = Math.min(10, Math.floor(nextCombo / 3) * 3);
      const gained = base + bonus;
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setWhackFx({idx, text: `+${gained}`, color: kind === 'gold' ? 'text-[#D97706]' : 'text-[#0284C7]'});
    }
    window.setTimeout(() => setWhackFx((cur) => (cur?.idx === idx ? null : cur)), 280);
  };

  return (
    <div className="space-y-3">
      {/* Compact Score Strip */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-center text-xs font-black text-[#065F46]">
        <div className="tabular-nums">Điểm: {score}</div>
        <div className="tabular-nums text-[#DB2777]">Combo x{combo}</div>
        <div className="tabular-nums text-[#0284C7]">{timeLeft}s</div>
      </div>

      {/* Sunny Meadow 3x3 Burrow Arena (ALWAYS visible, never covered by ready screen!) */}
      <div className="relative rounded-3xl border-4 border-[#34D399] bg-gradient-to-b from-[#BAE6FD] via-[#BBF7D0] to-[#86EFAC] p-3 shadow-inner">
        <div className="grid grid-cols-3 gap-2.5">
          {holes.map((kind, idx) => (
            <button
              key={idx}
              type="button"
              onPointerDown={() => hitHole(idx)}
              className="group relative flex h-22 flex-col items-center justify-end overflow-hidden rounded-2xl border-2 border-[#4ADE80]/80 bg-gradient-to-b from-[#DCFCE7]/80 to-[#4ADE80]/45 pb-2 transition active:scale-95"
            >
              {/* Burrow Mound + Dark Hole Rim */}
              <div className="pointer-events-none absolute inset-x-2 bottom-1.5 h-6 rounded-full border-2 border-[#92400E] bg-[#451A03] shadow-inner" />

              {/* Critter / Bomb Pop-up */}
              <div
                className={`relative z-10 transition-transform duration-150 ${
                  kind === 'empty' ? 'translate-y-12 scale-75 opacity-0' : 'translate-y-0 scale-100 opacity-100'
                }`}
              >
                {kind === 'bomb' && <BombSprite />}
                {kind === 'cyber' && <MoleSprite />}
                {kind === 'gold' && <MoleSprite golden />}
              </div>

              {/* Floating Whack Feedback + Hammer Flash */}
              {whackFx?.idx === idx && (
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/45">
                  <Hammer className="h-6 w-6 -rotate-45 text-[#EC4899]" />
                  <span className={`text-sm font-black tabular-nums ${whackFx.color}`}>
                    {whackFx.text}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Action Control (below board so board is never hidden!) */}
      {phase === 'ready' && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EC4899] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#DB2777] active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Bắt đầu đập chuột (30s)</span>
        </button>
      )}

      {phase === 'playing' && (
        <div className="text-center text-[11px] font-bold text-[#475569]">
          Chạm nhanh Chuột Lam (+12) &amp; Chuột Vàng (+25), tránh Bom Đỏ (-15)!
        </div>
      )}

      {phase === 'done' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#38BDF8] bg-[#F0F9FF] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 shrink-0 text-[#F59E0B]" />
            <div>
              <div className="text-xs font-bold text-[#475569]">
                Điểm: <span className="font-black tabular-nums text-[#0F172A]">{score}</span>
              </div>
              <div className="text-sm font-black tabular-nums text-[#0284C7]">
                Nhận +{rewarded} CoinGame
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={start}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#EC4899] px-4 py-2 text-xs font-black text-white whitespace-nowrap active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Chơi lại</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. CATCH STARS (Radiant Sky + Real Woven Basket SVG + Cute Stars + Meteors)
// ============================================================================
interface FallingItem {
  id: number;
  x: number;
  y: number;
  speed: number;
  kind: 'blue' | 'gold' | 'meteor';
}

const CatchStarsGame: React.FC<{onEarnCoinGame: (amt: number) => void}> = ({onEarnCoinGame}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [rewarded, setRewarded] = useState(0);
  const [basketX, setBasketX] = useState(50);
  const [catchPulse, setCatchPulse] = useState(false);
  const [popMsg, setPopMsg] = useState<{text: string; x: number; good: boolean} | null>(null);
  const [items, setItems] = useState<FallingItem[]>([
    {id: -1, x: 24, y: 26, speed: 0, kind: 'blue'},
    {id: -2, x: 58, y: 42, speed: 0, kind: 'gold'},
    {id: -3, x: 78, y: 24, speed: 0, kind: 'meteor'},
  ]);

  const basketRef = useRef(50);
  const scoreRef = useRef(0);
  const moveDirRef = useRef<-1 | 0 | 1>(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const nextIdRef = useRef(1);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const onEarnCoinGameRef = useRef(onEarnCoinGame);
  onEarnCoinGameRef.current = onEarnCoinGame;

  const start = () => {
    soundFX.sparkle();
    scoreRef.current = 0;
    basketRef.current = 50;
    itemsRef.current = [];
    setScore(0);
    setBasketX(50);
    setItems([]);
    setPopMsg(null);
    setRewarded(0);
    setTimeLeft(30);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveDirRef.current = -1;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveDirRef.current = 1;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D'
      ) {
        moveDirRef.current = 0;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      moveDirRef.current = 0;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          const cg = computeCoinGameTier(scoreRef.current);
          setRewarded(cg);
          setPhase('done');
          onEarnCoinGameRef.current(cg);
          soundFX.sparkle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let spawnAccum = 0;
    let lastTs = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      if (moveDirRef.current !== 0) {
        basketRef.current = Math.max(12, Math.min(88, basketRef.current + moveDirRef.current * 78 * dt));
        setBasketX(basketRef.current);
      }

      spawnAccum += dt;
      if (spawnAccum >= 0.5) {
        spawnAccum = 0;
        const r = Math.random();
        const kind: FallingItem['kind'] = r < 0.2 ? 'meteor' : r < 0.44 ? 'gold' : 'blue';
        itemsRef.current.push({
          id: nextIdRef.current++,
          x: 10 + Math.random() * 80,
          y: -6,
          speed: kind === 'gold' ? 48 : kind === 'meteor' ? 44 : 38,
          kind,
        });
      }

      const nextList: FallingItem[] = [];
      let scoreChanged = false;
      for (const it of itemsRef.current) {
        const ny = it.y + it.speed * dt;
        const caught = ny >= 76 && ny <= 90 && Math.abs(it.x - basketRef.current) <= 14;
        if (caught) {
          scoreChanged = true;
          if (it.kind === 'meteor') {
            soundFX.tap();
            scoreRef.current = Math.max(0, scoreRef.current - 20);
            setPopMsg({text: '-20', x: basketRef.current, good: false});
          } else {
            soundFX.sparkle();
            const gain = it.kind === 'gold' ? 25 : 12;
            scoreRef.current += gain;
            setCatchPulse(true);
            window.setTimeout(() => setCatchPulse(false), 140);
            setPopMsg({text: `+${gain}`, x: basketRef.current, good: true});
          }
        } else if (ny < 104) {
          nextList.push({...it, y: ny});
        }
      }
      itemsRef.current = nextList;
      setItems(nextList);
      if (scoreChanged) setScore(scoreRef.current);

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(rafId);
    };
  }, [phase]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'playing' || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    basketRef.current = Math.max(12, Math.min(88, pct));
    setBasketX(basketRef.current);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-3.5 py-2 text-xs font-black">
        <span className="tabular-nums text-[#D97706]">Điểm: {score}</span>
        <span className="text-[#475569]">Hứng Sao · Né Thiên Thạch</span>
        <span className="tabular-nums text-[#0284C7]">{timeLeft}s</span>
      </div>

      {/* Bright Sky Viewport (Always visible!) */}
      <div
        ref={arenaRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        className="relative h-64 w-full touch-none overflow-hidden rounded-3xl border-4 border-[#38BDF8] bg-gradient-to-b from-[#38BDF8] via-[#7DD3FC] to-[#E0F2FE] shadow-inner"
      >
        {/* Fluffy Decorative Clouds */}
        <div className="pointer-events-none absolute top-4 left-6 h-7 w-20 rounded-full bg-white/70 blur-[0.5px]" />
        <div className="pointer-events-none absolute top-10 right-8 h-8 w-24 rounded-full bg-white/65 blur-[0.5px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#BAE6FD]/80 to-transparent" />

        {items.map((it) => (
          <div
            key={it.id}
            style={{left: `${it.x}%`, top: `${it.y}%`}}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          >
            {it.kind === 'meteor' ? (
              <MeteorSvg />
            ) : (
              <StarItemSvg gold={it.kind === 'gold'} />
            )}
          </div>
        ))}

        {popMsg && (
          <div
            style={{left: `${popMsg.x}%`, top: '68%'}}
            className={`pointer-events-none absolute -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-black tabular-nums shadow ${
              popMsg.good ? 'text-[#D97706]' : 'text-[#DC2626]'
            }`}
          >
            {popMsg.text}
          </div>
        )}

        {/* Illustrated Woven Catcher Basket */}
        <div
          style={{left: `${basketX}%`, top: '84%'}}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        >
          <WovenBasketSvg catchPulse={catchPulse} />
        </div>
      </div>

      {phase === 'ready' && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0EA5E9] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#0284C7] active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Bắt đầu hứng sao (30s)</span>
        </button>
      )}

      {phase === 'playing' && (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onPointerDown={() => {
              moveDirRef.current = -1;
            }}
            onPointerUp={() => {
              moveDirRef.current = 0;
            }}
            onPointerLeave={() => {
              moveDirRef.current = 0;
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#7DD3FC] bg-[#F0F9FF] text-xs font-black text-[#0369A1] active:bg-[#BAE6FD]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Trái</span>
          </button>
          <button
            type="button"
            onPointerDown={() => {
              moveDirRef.current = 1;
            }}
            onPointerUp={() => {
              moveDirRef.current = 0;
            }}
            onPointerLeave={() => {
              moveDirRef.current = 0;
            }}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#7DD3FC] bg-[#F0F9FF] text-xs font-black text-[#0369A1] active:bg-[#BAE6FD]"
          >
            <span>Phải</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#38BDF8] bg-[#F0F9FF] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 shrink-0 text-[#F59E0B]" />
            <div>
              <div className="text-xs font-bold text-[#475569]">
                Điểm: <span className="font-black tabular-nums text-[#0F172A]">{score}</span>
              </div>
              <div className="text-sm font-black tabular-nums text-[#0284C7]">
                Nhận +{rewarded} CoinGame
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={start}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0EA5E9] px-4 py-2 text-xs font-black text-white whitespace-nowrap active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Chơi lại</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. INTERACTIVE CLAW MACHINE (Joystick + Claw Prongs + Chute Drop + Balanced RNG)
// ============================================================================
interface MysteryBall {
  id: number;
  x: number;
  row: 0 | 1;
  topColor: string;
  botColor: string;
}

const CLAW_BALLS: MysteryBall[] = [
  {id: 1, x: 24, row: 0, topColor: '#38BDF8', botColor: '#FFFFFF'},
  {id: 2, x: 38, row: 1, topColor: '#F472B6', botColor: '#FCE7F3'},
  {id: 3, x: 50, row: 0, topColor: '#FBBF24', botColor: '#FEF3C7'},
  {id: 4, x: 64, row: 1, topColor: '#A78BFA', botColor: '#EDE9FE'},
  {id: 5, x: 76, row: 0, topColor: '#34D399', botColor: '#ECFDF5'},
  {id: 6, x: 87, row: 1, topColor: '#FB7185', botColor: '#FFE4E6'},
];

const CLAW_COST_XU = 15;

const ClawBallGame: React.FC<{
  coins: number;
  hasFreeClawToday: boolean;
  onUseFreeClawToday: () => void;
  onSpendCoins: (amt: number) => boolean;
  onEarnCoinGame: (amt: number) => void;
}> = ({coins, hasFreeClawToday, onUseFreeClawToday, onSpendCoins, onEarnCoinGame}) => {
  type ClawPhase = 'idle' | 'aiming' | 'dropping' | 'lifting' | 'delivering' | 'result';
  const [phase, setPhase] = useState<ClawPhase>('idle');
  const [clawX, setClawX] = useState(52);
  const [clawDropY, setClawDropY] = useState(14);
  const [clawClosed, setClawClosed] = useState(false);
  const [joyTilt, setJoyTilt] = useState<-1 | 0 | 1>(0);
  const [caughtBall, setCaughtBall] = useState<MysteryBall | null>(null);
  const [slippedMsg, setSlippedMsg] = useState(false);
  const [resultText, setResultText] = useState('');
  const [wonCg, setWonCg] = useState(0);

  const steerRef = useRef<-1 | 0 | 1>(0);
  const xRef = useRef(52);
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const onEarnCoinGameRef = useRef(onEarnCoinGame);
  onEarnCoinGameRef.current = onEarnCoinGame;

  // Manual joystick movement loop during 'aiming'
  useEffect(() => {
    if (phase !== 'aiming') {
      steerRef.current = 0;
      setJoyTilt(0);
      return;
    }
    let last = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (steerRef.current !== 0) {
        xRef.current = Math.max(20, Math.min(90, xRef.current + steerRef.current * 44 * dt));
        setClawX(xRef.current);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  const dropClaw = useCallback(() => {
    if (phase !== 'aiming') return;
    soundFX.tap();
    steerRef.current = 0;
    setJoyTilt(0);
    setPhase('dropping');
    setClawClosed(false);

    const curX = xRef.current;
    // Find nearest ball within grab radius
    let nearest: MysteryBall | null = null;
    let bestDist = 11.5;
    for (const b of CLAW_BALLS) {
      const d = Math.abs(b.x - curX);
      if (d <= bestDist) {
        bestDist = d;
        nearest = b;
      }
    }

    const targetDepth = nearest ? (nearest.row === 0 ? 64 : 56) : 68;
    setClawDropY(targetDepth);

    // 1. Clamp claw around capsule
    window.setTimeout(() => {
      setClawClosed(true);
      setCaughtBall(nearest);
      setPhase('lifting');
      setClawDropY(15);

      // 2. Roll balanced RNG ("tùy nhân phẩm": EV ~13.9 Xu vs 15 Xu ticket!)
      window.setTimeout(() => {
        if (!nearest) {
          setWonCg(0);
          setResultText('Gắp hụt! Hãy gạt cần để đưa càng đúng tâm quả bóng ?.');
          setPhase('result');
          return;
        }
        const r = Math.random();
        if (r < 0.22) {
          // Suspenseful drop midway!
          setSlippedMsg(true);
          setCaughtBall(null);
          setClawClosed(false);
          soundFX.tap();
          window.setTimeout(() => {
            setSlippedMsg(false);
            setWonCg(0);
            setResultText('Ôi! Bóng ? tuột khỏi càng gắp giữa chừng!');
            setPhase('result');
          }, 420);
          return;
        }

        // Carry capsule left into the Prize Chute (x = 12%)
        setPhase('delivering');
        xRef.current = 11;
        setClawX(11);

        window.setTimeout(() => {
          setClawClosed(false);
          setCaughtBall(null);
          let cg = 1;
          let label = 'Bóng ? Xanh Lam! Nhận +1 CoinGame.';
          if (r < 0.62) {
            cg = 1;
            label = 'Bóng ? Xanh Lam! Nhận +1 CoinGame.';
          } else if (r < 0.85) {
            cg = 2;
            label = 'Bóng ? Hồng May Mắn! Nhận +2 CoinGame.';
          } else if (r < 0.96) {
            cg = 3;
            label = 'Bóng ? Tím Nhân Phẩm Cao! Nhận +3 CoinGame!';
          } else {
            cg = 5;
            label = 'JACKPOT Hoàng Kim! Mở ra +5 CoinGame!';
          }
          setWonCg(cg);
          setResultText(label);
          onEarnCoinGameRef.current(cg);
          soundFX.sparkle();
          setPhase('result');
        }, 560);
      }, 540);
    }, 520);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'aiming') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        steerRef.current = -1;
        setJoyTilt(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        steerRef.current = 1;
        setJoyTilt(1);
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        dropClaw();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D'
      ) {
        steerRef.current = 0;
        setJoyTilt(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase, dropClaw]);

  const startRound = () => {
    if (hasFreeClawToday) {
      onUseFreeClawToday();
    } else if (!onSpendCoins(CLAW_COST_XU)) {
      soundFX.tap();
      return;
    }
    soundFX.sparkle();
    xRef.current = 20;
    setClawX(20);
    setClawDropY(15);
    setClawClosed(false);
    setCaughtBall(null);
    setSlippedMsg(false);
    setResultText('');
    setWonCg(0);
    setPhase('aiming');
  };

  const handleJoystickDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'aiming' || !joyPadRef.current) return;
    const rect = joyPadRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    if (dx < -8) {
      steerRef.current = -1;
      setJoyTilt(-1);
    } else if (dx > 8) {
      steerRef.current = 1;
      setJoyTilt(1);
    } else {
      steerRef.current = 0;
      setJoyTilt(0);
    }
  };

  const canPlay = hasFreeClawToday || coins >= CLAW_COST_XU;

  return (
    <div className="space-y-2.5">
      {/* Cabinet Ticket Info */}
      <div className="flex items-center justify-between rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2 text-xs font-black text-[#92400E]">
        <span>{hasFreeClawToday ? 'Miễn phí 1 lượt hôm nay' : `Giá lượt: ${CLAW_COST_XU} Xu`}</span>
        <span className="tabular-nums">Xu hiện có: {coins}</span>
      </div>

      {/* Bright Arcade Claw Machine Cabinet */}
      <div className="rounded-3xl border-4 border-[#0EA5E9] bg-gradient-to-b from-[#38BDF8] to-[#0284C7] p-2.5 shadow-lg">
        {/* Glass Display Case */}
        <div className="relative h-56 w-full overflow-hidden rounded-2xl border-2 border-white/80 bg-gradient-to-b from-[#EFF6FF] via-[#E0F2FE] to-[#BAE6FD]">
          {/* Overhead Steel Gantry Rail */}
          <div className="absolute inset-x-3 top-2.5 h-2 rounded-full bg-[#64748B] shadow-inner" />

          {/* Sliding Claw Trolley + Hinged Mechanical Prongs */}
          <div
            style={{left: `${clawX}%`, height: `${clawDropY}%`}}
            className="absolute top-2.5 z-20 flex -translate-x-1/2 flex-col items-center transition-[left,height] duration-500 ease-in-out"
          >
            {/* Trolley Box */}
            <div className="h-3.5 w-9 rounded-md border-2 border-[#1E293B] bg-[#F59E0B]" />
            {/* Steel Cable */}
            <div className="w-1 flex-1 bg-[#475569]" />
            {/* Mechanical Claw SVG */}
            <div className="relative -mt-1 flex flex-col items-center">
              <svg viewBox="0 0 60 36" className="h-9 w-14 drop-shadow" aria-hidden="true">
                <rect x="22" y="0" width="16" height="8" rx="3" fill="#334155" />
                {/* Left prong */}
                <path
                  d={clawClosed ? 'M23 7 L14 20 L22 31' : 'M23 7 L8 18 L15 31'}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Right prong */}
                <path
                  d={clawClosed ? 'M37 7 L46 20 L38 31' : 'M37 7 L52 18 L45 31'}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Held Mystery ? Capsule */}
              {caughtBall && (
                <div className="absolute top-4 h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-lg">
                  <div className="h-1/2 w-full" style={{backgroundColor: caughtBall.topColor}} />
                  <div className="h-1/2 w-full" style={{backgroundColor: caughtBall.botColor}} />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#1E293B]/35" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#0F172A]">
                    ?
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Slip Warning Bubble */}
          {slippedMsg && (
            <div className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-[#FB7185] bg-white px-3 py-1 text-xs font-black text-[#E11D48] shadow">
              Tuột tay mất rồi!
            </div>
          )}

          {/* Left Prize Drop Chute (Cửa nhận quà) */}
          <div className="absolute bottom-0 left-2 z-10 flex h-16 w-14 flex-col items-center justify-center rounded-t-xl border-2 border-[#475569] bg-[#1E293B] text-center shadow-inner">
            <ArrowDown className="h-4 w-4 text-[#FDE047]" />
            <span className="text-[9px] font-black text-[#E2E8F0]">NHẬN</span>
          </div>

          {/* Capsule Tray Floor */}
          <div className="absolute inset-x-0 bottom-0 h-5 bg-[#93C5FD]/80" />

          {/* Stacked Glossy Gashapon ? Capsules */}
          {CLAW_BALLS.map((ball) => {
            if (caughtBall?.id === ball.id) return null;
            return (
              <div
                key={ball.id}
                style={{
                  left: `${ball.x}%`,
                  bottom: ball.row === 0 ? '8px' : '30px',
                }}
                className="absolute h-11 w-11 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white shadow-md"
              >
                <div className="h-1/2 w-full" style={{backgroundColor: ball.topColor}} />
                <div className="h-1/2 w-full" style={{backgroundColor: ball.botColor}} />
                <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#1E293B]/35" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#0F172A]">
                  ?
                </span>
              </div>
            );
          })}
        </div>

        {/* Arcade Control Deck: Real Joystick + Big Drop / Insert Coin Button */}
        <div className="mt-2.5 flex items-center justify-between gap-2.5 rounded-2xl border-2 border-white/50 bg-[#E0F2FE] px-3 py-2.5">
          {/* Interactive Arcade Joystick + Steer Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={phase !== 'aiming'}
              onPointerDown={() => {
                if (phase !== 'aiming') return;
                steerRef.current = -1;
                setJoyTilt(-1);
              }}
              onPointerUp={() => {
                steerRef.current = 0;
                setJoyTilt(0);
              }}
              onPointerLeave={() => {
                steerRef.current = 0;
                setJoyTilt(0);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#0284C7] bg-white text-[#0284C7] shadow-sm disabled:opacity-45 active:scale-95"
              aria-label="Gạt trái"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Interactive Tilting Red Joystick */}
            <div
              ref={joyPadRef}
              onPointerDown={handleJoystickDrag}
              onPointerMove={handleJoystickDrag}
              onPointerUp={() => {
                steerRef.current = 0;
                setJoyTilt(0);
              }}
              onPointerLeave={() => {
                steerRef.current = 0;
                setJoyTilt(0);
              }}
              className="relative flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border-2 border-[#64748B] bg-[#334155] shadow-inner"
              title="Kéo cần gạt trái / phải"
            >
              <div
                style={{
                  transform: `translateX(${joyTilt * 7}px) rotate(${joyTilt * 18}deg)`,
                }}
                className="flex flex-col items-center transition-transform duration-100"
              >
                <div className="h-6 w-6 rounded-full border-2 border-white bg-[#EF4444] shadow-md" />
                <div className="-mt-1 h-2.5 w-1.5 rounded-b bg-[#CBD5E1]" />
              </div>
            </div>

            <button
              type="button"
              disabled={phase !== 'aiming'}
              onPointerDown={() => {
                if (phase !== 'aiming') return;
                steerRef.current = 1;
                setJoyTilt(1);
              }}
              onPointerUp={() => {
                steerRef.current = 0;
                setJoyTilt(0);
              }}
              onPointerLeave={() => {
                steerRef.current = 0;
                setJoyTilt(0);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#0284C7] bg-white text-[#0284C7] shadow-sm disabled:opacity-45 active:scale-95"
              aria-label="Gạt phải"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Big Arcade Action Button */}
          {phase === 'aiming' ? (
            <button
              type="button"
              onClick={dropClaw}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#B91C1C] bg-[#EF4444] px-4 text-sm font-black text-white shadow-md whitespace-nowrap transition hover:bg-[#DC2626] active:scale-95"
            >
              <ArrowDown className="h-4 w-4" />
              <span>GẮP NGAY!</span>
            </button>
          ) : phase === 'idle' || phase === 'result' ? (
            <button
              type="button"
              disabled={!canPlay}
              onClick={startRound}
              className={`flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-black whitespace-nowrap shadow-md transition active:scale-95 ${
                canPlay
                  ? 'border-2 border-[#D97706] bg-[#F59E0B] text-white hover:bg-[#D97706]'
                  : 'cursor-not-allowed border border-[#CBD5E1] bg-[#E2E8F0] text-[#64748B]'
              }`}
            >
              <Gift className="h-4 w-4 shrink-0" />
              <span>
                {hasFreeClawToday
                  ? 'Chơi Miễn Phí (1/ngày)'
                  : canPlay
                    ? `Thả ${CLAW_COST_XU} Xu Chơi`
                    : `Thiếu Xu (${CLAW_COST_XU})`}
              </span>
            </button>
          ) : (
            <div className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#DBEAFE] text-xs font-black text-[#1E40AF]">
              Đang gắp bóng...
            </div>
          )}
        </div>
      </div>

      {phase === 'result' && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-[#38BDF8] bg-[#F0F9FF] px-3.5 py-2">
          <span className="text-xs font-black text-[#0F172A]">{resultText}</span>
          {wonCg > 0 && (
            <span className="shrink-0 text-sm font-black tabular-nums text-[#0284C7]">
              +{wonCg} CG
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. RHYTHM BEAT DANCE STAGE (4 Playable Songs + Synth Beat Fallback + Equalizer)
// ============================================================================
interface BeatNote {
  id: number;
  lane: 0 | 1 | 2 | 3;
  y: number;
}

interface RhythmSong {
  id: string;
  title: string;
  artist: string;
  difficulty: 'Dễ' | 'Vừa' | 'Khó' | 'Siêu Khó';
  bpm: number;
  noteSpeed: number;
  doubleChance: number;
  baseReward: number;
  maxReward: number;
  accent: string;
  mp3Url: string;
  scaleNotes: number[];
  bassNotes: number[];
}

const RHYTHM_SONGS: RhythmSong[] = [
  {
    id: 'neon_city',
    title: 'Neon City Pop',
    artist: 'SoundHelix Vol.1',
    difficulty: 'Dễ',
    bpm: 112,
    noteSpeed: 48,
    doubleChance: 0,
    baseReward: 1,
    maxReward: 2,
    accent: '#0EA5E9',
    mp3Url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    scaleNotes: [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33],
    bassNotes: [130.81, 130.81, 164.81, 164.81, 196.0, 196.0, 146.83, 196.0],
  },
  {
    id: 'starlight_disco',
    title: 'Starlight Disco',
    artist: 'SoundHelix Vol.8',
    difficulty: 'Vừa',
    bpm: 124,
    noteSpeed: 56,
    doubleChance: 0.14,
    baseReward: 1,
    maxReward: 3,
    accent: '#EC4899',
    mp3Url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    scaleNotes: [440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25],
    bassNotes: [110.0, 110.0, 146.83, 146.83, 164.81, 164.81, 130.81, 164.81],
  },
  {
    id: 'cyber_sakura',
    title: 'Cyber Sakura Groove',
    artist: 'SoundHelix Vol.10',
    difficulty: 'Khó',
    bpm: 134,
    noteSpeed: 64,
    doubleChance: 0.24,
    baseReward: 2,
    maxReward: 4,
    accent: '#8B5CF6',
    mp3Url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    scaleNotes: [587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25],
    bassNotes: [146.83, 146.83, 174.61, 174.61, 196.0, 196.0, 130.81, 146.83],
  },
  {
    id: 'turbo_galaxy',
    title: 'Turbo Galaxy Remix',
    artist: 'SoundHelix Vol.13',
    difficulty: 'Siêu Khó',
    bpm: 146,
    noteSpeed: 74,
    doubleChance: 0.34,
    baseReward: 2,
    maxReward: 5,
    accent: '#F59E0B',
    mp3Url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
    scaleNotes: [659.25, 783.99, 880.0, 987.77, 1174.66, 987.77, 880.0, 783.99],
    bassNotes: [164.81, 164.81, 196.0, 196.0, 220.0, 220.0, 146.83, 196.0],
  },
];

const LANE_LABELS = ['←', '↓', '↑', '→'] as const;
const LANE_COLORS = ['#0EA5E9', '#EC4899', '#8B5CF6', '#F59E0B'] as const;

const RhythmDanceGame: React.FC<{onEarnCoinGame: (amt: number) => void}> = ({onEarnCoinGame}) => {
  const [selectedSongId, setSelectedSongId] = useState<string>(RHYTHM_SONGS[0].id);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(35);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [judge, setJudge] = useState<string>('CHỌN NHẠC');
  const [litLane, setLitLane] = useState<number | null>(null);
  const [rewarded, setRewarded] = useState(0);
  const [muted, setMuted] = useState(false);
  const [eqHeights, setEqHeights] = useState<number[]>([26, 48, 34, 62, 42, 54, 30, 44]);
  const [audioSourceLabel, setAudioSourceLabel] = useState<string>('Nhạc MP3 + Beat Synth');
  const [notes, setNotes] = useState<BeatNote[]>([
    {id: -1, lane: 0, y: 26},
    {id: -2, lane: 2, y: 52},
    {id: -3, lane: 3, y: 74},
  ]);

  const song = RHYTHM_SONGS.find((s) => s.id === selectedSongId) || RHYTHM_SONGS[0];
  const songRef = useRef(song);
  songRef.current = song;

  const notesRef = useRef<BeatNote[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const nextIdRef = useRef(1);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mp3PlayingRef = useRef(false);

  const stopAllMusic = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current.src = '';
      audioElRef.current = null;
    }
    mp3PlayingRef.current = false;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopAllMusic();
    };
  }, [stopAllMusic]);

  const playSynthStep = useCallback((stepIdx: number, activeSong: RhythmSong) => {
    if (mutedRef.current) return;
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtor();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const isDownbeat = stepIdx % 2 === 0;
      const masterGain = mp3PlayingRef.current ? 0.05 : 0.14;

      // Kick drum on downbeats
      if (isDownbeat) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.13);
        g.gain.setValueAtTime(masterGain * 1.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // Crisp synth clap/hi-hat on offbeat
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);
        g.gain.setValueAtTime(masterGain * 0.55, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      }

      // Bass pulse (only strong when MP3 is not streaming)
      if (!mp3PlayingRef.current) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sawtooth';
        const bassFreq = activeSong.bassNotes[stepIdx % activeSong.bassNotes.length];
        bassOsc.frequency.setValueAtTime(bassFreq, now);
        bassGain.gain.setValueAtTime(masterGain * 0.52, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);

        // Lead melody chime
        const leadOsc = ctx.createOscillator();
        const leadGain = ctx.createGain();
        leadOsc.type = stepIdx % 4 === 0 ? 'square' : 'triangle';
        const leadFreq = activeSong.scaleNotes[stepIdx % activeSong.scaleNotes.length];
        leadOsc.frequency.setValueAtTime(leadFreq, now);
        leadGain.gain.setValueAtTime(masterGain * 0.42, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        leadOsc.connect(leadGain);
        leadGain.connect(ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.17);
      }
    } catch {
      // Ignore browser autoplay / audio errors safely
    }
  }, []);

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (audioElRef.current) {
      audioElRef.current.muted = nextMuted;
    }
  };

  const computeSongReward = (pts: number, activeSong: RhythmSong) => {
    const ratio = Math.min(1, pts / (activeSong.bpm >= 134 ? 540 : 420));
    return Math.round(activeSong.baseReward + ratio * (activeSong.maxReward - activeSong.baseReward));
  };

  const start = () => {
    stopAllMusic();
    soundFX.sparkle();
    const activeSong = songRef.current;
    notesRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    setNotes([]);
    setScore(0);
    setCombo(0);
    setJudge(activeSong.title.toUpperCase());
    setRewarded(0);
    setTimeLeft(35);
    setAudioSourceLabel(`Đang phát: ${activeSong.title}`);

    // Start streaming free SoundHelix MP3 track (with seamless Synth fallback if offline/blocked)
    try {
      const audio = new Audio(activeSong.mp3Url);
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.55;
      audio.muted = mutedRef.current;
      audio.currentTime = 12; // Jump straight into energetic beat section!
      audio.onplaying = () => {
        mp3PlayingRef.current = true;
        setAudioSourceLabel(`MP3 Live · ${activeSong.title}`);
      };
      audio.onerror = () => {
        mp3PlayingRef.current = false;
        setAudioSourceLabel(`Beat Synth · ${activeSong.title}`);
      };
      audio.play().catch(() => {
        mp3PlayingRef.current = false;
        setAudioSourceLabel(`Beat Synth · ${activeSong.title}`);
      });
      audioElRef.current = audio;
    } catch {
      mp3PlayingRef.current = false;
      setAudioSourceLabel(`Beat Synth · ${activeSong.title}`);
    }

    setPhase('playing');
  };

  const hitLane = useCallback(
    (lane: 0 | 1 | 2 | 3) => {
      if (phase !== 'playing') return;
      setLitLane(lane);
      window.setTimeout(() => setLitLane((cur) => (cur === lane ? null : cur)), 130);

      const idx = notesRef.current.findIndex(
        (n) => n.lane === lane && n.y >= 67 && n.y <= 97,
      );
      if (idx === -1) {
        comboRef.current = 0;
        setCombo(0);
        setJudge('Lệch nhịp');
        soundFX.tap();
        return;
      }
      const note = notesRef.current[idx];
      notesRef.current = notesRef.current.filter((n) => n.id !== note.id);
      setNotes(notesRef.current);

      const dist = Math.abs(note.y - 82);
      const pts = dist <= 7.5 ? 24 : 14;
      comboRef.current += 1;
      scoreRef.current += pts + Math.min(12, Math.floor(comboRef.current / 4) * 3);
      setCombo(comboRef.current);
      setScore(scoreRef.current);
      setJudge(dist <= 7.5 ? 'PERFECT!' : 'GOOD!');
      if (!mutedRef.current) soundFX.sparkle();
    },
    [phase],
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') hitLane(0);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') hitLane(1);
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') hitLane(2);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') hitLane(3);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, hitLane]);

  const onEarnCoinGameRef = useRef(onEarnCoinGame);
  onEarnCoinGameRef.current = onEarnCoinGame;

  useEffect(() => {
    if (phase !== 'playing') return;
    const activeSong = songRef.current;
    const beatInterval = 60 / activeSong.bpm;
    let beatStep = 0;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          stopAllMusic();
          const cg = computeSongReward(scoreRef.current, songRef.current);
          setRewarded(cg);
          setPhase('done');
          onEarnCoinGameRef.current(cg);
          soundFX.sparkle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let spawnAcc = 0;
    let lastTs = performance.now();
    let rafId = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      spawnAcc += dt;
      if (spawnAcc >= beatInterval) {
        spawnAcc -= beatInterval;
        playSynthStep(beatStep, activeSong);
        beatStep += 1;

        setEqHeights(
          Array.from({length: 8}, (_, i) =>
            Math.round(24 + ((Math.sin(beatStep * 1.1 + i) + 1) * 0.5) * 68),
          ),
        );

        const lane = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
        notesRef.current.push({id: nextIdRef.current++, lane, y: -5});
        if (Math.random() < activeSong.doubleChance) {
          const lane2 = ((lane + 1 + Math.floor(Math.random() * 3)) % 4) as 0 | 1 | 2 | 3;
          notesRef.current.push({id: nextIdRef.current++, lane: lane2, y: -5});
        }
      }
      const next: BeatNote[] = [];
      for (const n of notesRef.current) {
        const ny = n.y + activeSong.noteSpeed * dt;
        if (ny <= 100) next.push({...n, y: ny});
        else {
          comboRef.current = 0;
          setCombo(0);
        }
      }
      notesRef.current = next;
      setNotes(next);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(rafId);
    };
  }, [phase, playSynthStep, stopAllMusic]);

  return (
    <div className="space-y-2.5">
      {/* Song Header & Volume Strip */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#C4B5FD] bg-[#F5F3FF] px-3 py-2 text-xs font-black">
        <span className="tabular-nums text-[#4F46E5]">Điểm: {score}</span>
        <span className="truncate text-[#DB2777]">
          {judge} · x{combo}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[#4F46E5] shadow-sm active:scale-95"
            aria-label={muted ? 'Bật nhạc' : 'Tắt nhạc'}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <span className="tabular-nums text-[#0284C7]">{timeLeft}s</span>
        </div>
      </div>

      {/* Selectable 4-Song Playlist when Ready or Done */}
      {phase !== 'playing' && (
        <div className="grid grid-cols-2 gap-1.5">
          {RHYTHM_SONGS.map((s) => {
            const active = s.id === selectedSongId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setSelectedSongId(s.id);
                }}
                className={`rounded-xl border-2 px-2.5 py-2 text-left transition active:scale-95 ${
                  active
                    ? 'border-[#6366F1] bg-[#EEF2FF] shadow-sm'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#C7D2FE]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-black text-[#0F172A]">{s.title}</span>
                  <span
                    style={{backgroundColor: s.accent}}
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black text-white"
                  >
                    {s.difficulty}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] font-bold text-[#475569]">
                  <span>{s.bpm} BPM</span>
                  <span className="text-[#4F46E5]">
                    +{s.baseReward}–{s.maxReward} CG
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Luminous Dance Stage with Live Beat Equalizer */}
      <div className="relative grid h-52 grid-cols-4 overflow-hidden rounded-3xl border-4 border-[#818CF8] bg-gradient-to-b from-[#1E1B4B] via-[#312E81] to-[#4338CA]">
        {/* Animated Equalizer Bars */}
        <div className="pointer-events-none absolute inset-x-3 bottom-0 flex h-24 items-end justify-between gap-1.5 opacity-35">
          {eqHeights.map((h, i) => (
            <div
              key={i}
              style={{
                height: `${h}%`,
                backgroundColor: LANE_COLORS[i % 4],
              }}
              className="flex-1 rounded-t-md transition-[height] duration-150"
            />
          ))}
        </div>

        {/* Now Playing Pill */}
        <div className="pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-black text-[#E0E7FF] backdrop-blur-sm">
          {phase === 'playing' ? audioSourceLabel : `${song.title} · ${song.bpm} BPM`}
        </div>

        {/* Target Receptor Hit Bar */}
        <div
          style={{top: '82%'}}
          className="pointer-events-none absolute inset-x-0 h-11 -translate-y-1/2 border-y-2 border-[#A5B4FC]/60 bg-white/15"
        />
        {([0, 1, 2, 3] as const).map((lane) => (
          <div
            key={lane}
            className={`relative border-r border-white/15 transition-colors last:border-r-0 ${
              litLane === lane ? 'bg-white/25' : ''
            }`}
          >
            {/* Receptor Ring */}
            <div
              style={{top: '82%', borderColor: LANE_COLORS[lane]}}
              className="pointer-events-none absolute left-1/2 flex h-10 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 bg-black/35 text-sm font-black text-white opacity-85"
            >
              {LANE_LABELS[lane]}
            </div>

            {notes
              .filter((n) => n.lane === lane)
              .map((n) => (
                <div
                  key={n.id}
                  style={{
                    top: `${n.y}%`,
                    backgroundColor: LANE_COLORS[lane],
                  }}
                  className="absolute left-1/2 flex h-10 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-white text-lg font-black text-white shadow-md"
                >
                  {LANE_LABELS[lane]}
                </div>
              ))}
          </div>
        ))}
      </div>

      {phase === 'ready' && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6366F1] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#4F46E5] active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Phát nhạc &amp; Nhảy: {song.title} (35s)</span>
        </button>
      )}

      {phase === 'playing' && (
        <div className="grid grid-cols-4 gap-2">
          {([0, 1, 2, 3] as const).map((lane) => (
            <button
              key={lane}
              type="button"
              onPointerDown={() => hitLane(lane)}
              style={{
                backgroundColor: LANE_COLORS[lane],
              }}
              className="flex h-12 items-center justify-center rounded-2xl border-2 border-white text-lg font-black text-white shadow-md transition active:scale-95"
            >
              {LANE_LABELS[lane]}
            </button>
          ))}
        </div>
      )}

      {phase === 'done' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#818CF8] bg-[#EEF2FF] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 shrink-0 text-[#F59E0B]" />
            <div>
              <div className="text-xs font-bold text-[#475569]">
                {song.title} · Điểm:{' '}
                <span className="font-black tabular-nums text-[#0F172A]">{score}</span>
              </div>
              <div className="text-sm font-black tabular-nums text-[#4F46E5]">
                Nhận +{rewarded} CoinGame
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={start}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#6366F1] px-4 py-2 text-xs font-black text-white whitespace-nowrap active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Nhảy lại</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. PC ESPORTS HTML MINI-GAMES (Bright High-Contrast Monitor UI)
// ============================================================================
const PcHtmlGames: React.FC<{onEarnCoins: (amt: number) => void}> = ({onEarnCoins}) => {
  const [selected, setSelected] = useState<'snake' | 'xo' | 'simon'>('snake');

  // --- Snake ---
  const GRID = 10;
  const [snakePhase, setSnakePhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [snakeBody, setSnakeBody] = useState<{x: number; y: number}[]>([
    {x: 4, y: 5},
    {x: 3, y: 5},
    {x: 2, y: 5},
  ]);
  const [apple, setApple] = useState<{x: number; y: number}>({x: 7, y: 5});
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeReward, setSnakeReward] = useState(0);
  const dirRef = useRef<{x: number; y: number}>({x: 1, y: 0});
  const bodyRef = useRef<{x: number; y: number}[]>([
    {x: 4, y: 5},
    {x: 3, y: 5},
    {x: 2, y: 5},
  ]);
  const appleRef = useRef<{x: number; y: number}>({x: 7, y: 5});
  const snakeScoreRef = useRef(0);
  const onEarnCoinsRef = useRef(onEarnCoins);
  onEarnCoinsRef.current = onEarnCoins;

  const startSnake = () => {
    soundFX.sparkle();
    const init = [
      {x: 4, y: 5},
      {x: 3, y: 5},
    ];
    bodyRef.current = init;
    dirRef.current = {x: 1, y: 0};
    appleRef.current = {x: 7, y: 5};
    snakeScoreRef.current = 0;
    setSnakeBody(init);
    setApple({x: 7, y: 5});
    setSnakeScore(0);
    setSnakeReward(0);
    setSnakePhase('playing');
  };

  useEffect(() => {
    if (selected !== 'snake' || snakePhase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w') && d.y !== 1) dirRef.current = {x: 0, y: -1};
      if ((e.key === 'ArrowDown' || e.key === 's') && d.y !== -1) dirRef.current = {x: 0, y: 1};
      if ((e.key === 'ArrowLeft' || e.key === 'a') && d.x !== 1) dirRef.current = {x: -1, y: 0};
      if ((e.key === 'ArrowRight' || e.key === 'd') && d.x !== -1) dirRef.current = {x: 1, y: 0};
    };
    window.addEventListener('keydown', onKey);
    const id = window.setInterval(() => {
      const head = bodyRef.current[0];
      const nx = head.x + dirRef.current.x;
      const ny = head.y + dirRef.current.y;
      const hitWall = nx < 0 || nx >= GRID || ny < 0 || ny >= GRID;
      const hitSelf = bodyRef.current.some((seg) => seg.x === nx && seg.y === ny);
      if (hitWall || hitSelf) {
        window.clearInterval(id);
        const xu = Math.min(8, 2 + Math.floor(snakeScoreRef.current / 2));
        setSnakeReward(xu);
        setSnakePhase('done');
        onEarnCoinsRef.current(xu);
        soundFX.tap();
        return;
      }
      const ate = nx === appleRef.current.x && ny === appleRef.current.y;
      const nextBody = [{x: nx, y: ny}, ...bodyRef.current];
      if (!ate) nextBody.pop();
      else {
        soundFX.sparkle();
        snakeScoreRef.current += 1;
        setSnakeScore(snakeScoreRef.current);
        let ax = Math.floor(Math.random() * GRID);
        let ay = Math.floor(Math.random() * GRID);
        let tries = 0;
        while (nextBody.some((s) => s.x === ax && s.y === ay) && tries < 25) {
          ax = Math.floor(Math.random() * GRID);
          ay = Math.floor(Math.random() * GRID);
          tries++;
        }
        appleRef.current = {x: ax, y: ay};
        setApple({x: ax, y: ay});
      }
      bodyRef.current = nextBody;
      setSnakeBody(nextBody);
    }, 240);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearInterval(id);
    };
  }, [selected, snakePhase]);

  // --- Tic-Tac-Toe XO ---
  const [board, setBoard] = useState<(null | 'X' | 'O')[]>(Array(9).fill(null));
  const [xoStatus, setXoStatus] = useState<string>('Lượt bạn (X)');
  const [xoDone, setXoDone] = useState(false);

  const checkWinner = (b: (null | 'X' | 'O')[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  };

  const playXoCell = (idx: number) => {
    if (xoDone || board[idx]) return;
    const next = [...board];
    next[idx] = 'X';
    soundFX.tap();
    const w1 = checkWinner(next);
    if (w1 === 'X') {
      setBoard(next);
      setXoDone(true);
      setXoStatus('Thắng rồi! +5 Xu');
      onEarnCoins(5);
      soundFX.sparkle();
      return;
    }
    const empty = next.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
    if (empty.length === 0) {
      setBoard(next);
      setXoDone(true);
      setXoStatus('Hòa! +2 Xu');
      onEarnCoins(2);
      return;
    }
    let botPick = empty[Math.floor(Math.random() * empty.length)];
    for (const i of empty) {
      const test = [...next];
      test[i] = 'O';
      if (checkWinner(test) === 'O') {
        botPick = i;
        break;
      }
    }
    if (next[botPick] === null) {
      for (const i of empty) {
        const test = [...next];
        test[i] = 'X';
        if (checkWinner(test) === 'X') {
          botPick = i;
          break;
        }
      }
    }
    next[botPick] = 'O';
    const w2 = checkWinner(next);
    setBoard(next);
    if (w2 === 'O') {
      setXoDone(true);
      setXoStatus('Máy thắng! +1 Xu an ủi');
      onEarnCoins(1);
    } else if (!next.includes(null)) {
      setXoDone(true);
      setXoStatus('Hòa! +2 Xu');
      onEarnCoins(2);
    }
  };

  const resetXo = () => {
    soundFX.tap();
    setBoard(Array(9).fill(null));
    setXoDone(false);
    setXoStatus('Lượt bạn (X)');
  };

  // --- Simon Memory ---
  const [simonSeq, setSimonSeq] = useState<number[]>([]);
  const [simonInputIdx, setSimonInputIdx] = useState(0);
  const [simonLit, setSimonLit] = useState<number | null>(null);
  const [simonPhase, setSimonPhase] = useState<'ready' | 'showing' | 'input' | 'done'>('ready');
  const [simonRound, setSimonRound] = useState(0);
  const [simonMsg, setSimonMsg] = useState('Nhấn Bắt đầu để xem chuỗi đèn!');

  const playSimonSequence = useCallback((seq: number[]) => {
    setSimonPhase('showing');
    seq.forEach((pad, step) => {
      window.setTimeout(() => {
        setSimonLit(pad);
        soundFX.tap();
      }, step * 520 + 200);
      window.setTimeout(() => {
        setSimonLit(null);
      }, step * 520 + 440);
    });
    window.setTimeout(() => {
      setSimonInputIdx(0);
      setSimonPhase('input');
      setSimonMsg('Lượt bạn bấm lại theo đúng thứ tự!');
    }, seq.length * 520 + 260);
  }, []);

  const startSimon = () => {
    const first = [Math.floor(Math.random() * 4)];
    setSimonSeq(first);
    setSimonRound(1);
    setSimonMsg('Ghi nhớ ánh đèn...');
    playSimonSequence(first);
  };

  const pressSimonPad = (pad: number) => {
    if (simonPhase !== 'input') return;
    setSimonLit(pad);
    window.setTimeout(() => setSimonLit(null), 180);
    if (simonSeq[simonInputIdx] !== pad) {
      soundFX.tap();
      const xu = simonRound >= 2 ? Math.min(8, simonRound * 2) : 1;
      onEarnCoins(xu);
      setSimonMsg(`Nhầm ở vòng ${simonRound}! Nhận +${xu} Xu.`);
      setSimonPhase('done');
      return;
    }
    soundFX.sparkle();
    const nextIdx = simonInputIdx + 1;
    if (nextIdx >= simonSeq.length) {
      if (simonRound >= 5) {
        onEarnCoins(9);
        setSimonMsg('Hoàn thành 5 vòng trí nhớ! +9 Xu!');
        setSimonPhase('done');
      } else {
        const nextRound = simonRound + 1;
        const nextSeq = [...simonSeq, Math.floor(Math.random() * 4)];
        setSimonRound(nextRound);
        setSimonSeq(nextSeq);
        setSimonMsg(`Chuẩn rồi! Vòng ${nextRound}...`);
        window.setTimeout(() => playSimonSequence(nextSeq), 420);
      }
    } else {
      setSimonInputIdx(nextIdx);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-1">
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            setSelected('snake');
          }}
          className={`rounded-xl py-1.5 text-xs font-black whitespace-nowrap transition ${
            selected === 'snake' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#065F46] hover:bg-white'
          }`}
        >
          Rắn Săn Mồi
        </button>
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            setSelected('xo');
          }}
          className={`rounded-xl py-1.5 text-xs font-black whitespace-nowrap transition ${
            selected === 'xo' ? 'bg-[#0EA5E9] text-white shadow-sm' : 'text-[#0369A1] hover:bg-white'
          }`}
        >
          Cờ Ca-rô XO
        </button>
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            setSelected('simon');
          }}
          className={`rounded-xl py-1.5 text-xs font-black whitespace-nowrap transition ${
            selected === 'simon' ? 'bg-[#8B5CF6] text-white shadow-sm' : 'text-[#5B21B6] hover:bg-white'
          }`}
        >
          Nhịp Đèn
        </button>
      </div>

      {selected === 'snake' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-xs font-black">
            <span className="tabular-nums text-[#059669]">Táo đã ăn: {snakeScore}</span>
            <span className="text-[#D97706]">Thưởng +2 đến +8 Xu</span>
          </div>

          <div className="mx-auto grid aspect-square w-full max-w-[228px] grid-cols-10 gap-0.5 rounded-2xl border-4 border-[#34D399] bg-[#DCFCE7] p-1.5 shadow-inner">
            {Array.from({length: GRID * GRID}).map((_, idx) => {
              const x = idx % GRID;
              const y = Math.floor(idx / GRID);
              const isHead = snakeBody[0]?.x === x && snakeBody[0]?.y === y;
              const isBody = snakeBody.some((s, i) => i > 0 && s.x === x && s.y === y);
              const isApple = apple.x === x && apple.y === y;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-center rounded-[4px] ${
                    isHead
                      ? 'bg-[#059669]'
                      : isBody
                        ? 'bg-[#10B981]'
                        : isApple
                          ? 'bg-[#FFE4E6]'
                          : (x + y) % 2 === 0
                            ? 'bg-white/75'
                            : 'bg-[#F0FDF4]'
                  }`}
                >
                  {isHead && <div className="h-2 w-2 rounded-full bg-white" />}
                  {isApple && <div className="h-3 w-3 rounded-full bg-[#EF4444] shadow-sm" />}
                </div>
              );
            })}
          </div>

          {snakePhase === 'ready' && (
            <button
              type="button"
              onClick={startSnake}
              className="w-full rounded-2xl bg-[#10B981] py-2.5 text-sm font-black text-white shadow-md active:scale-95"
            >
              Bắt đầu Rắn Săn Mồi
            </button>
          )}

          {snakePhase === 'done' && (
            <div className="flex items-center justify-between rounded-2xl border border-[#34D399] bg-[#ECFDF5] px-3.5 py-2">
              <span className="text-xs font-black text-[#065F46]">
                Kết thúc! Nhận +{snakeReward} Xu
              </span>
              <button
                type="button"
                onClick={startSnake}
                className="rounded-xl bg-[#10B981] px-4 py-1.5 text-xs font-black text-white"
              >
                Chơi lại
              </button>
            </div>
          )}

          {snakePhase === 'playing' && (
            <div className="mx-auto grid w-44 grid-cols-3 gap-1.5">
              <div />
              <button
                type="button"
                onClick={() => {
                  if (dirRef.current.y !== 1) dirRef.current = {x: 0, y: -1};
                }}
                className="flex h-10 items-center justify-center rounded-xl border border-[#34D399] bg-[#ECFDF5] text-[#059669] active:bg-[#A7F3D0]"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => {
                  if (dirRef.current.x !== 1) dirRef.current = {x: -1, y: 0};
                }}
                className="flex h-10 items-center justify-center rounded-xl border border-[#34D399] bg-[#ECFDF5] text-[#059669] active:bg-[#A7F3D0]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (dirRef.current.y !== -1) dirRef.current = {x: 0, y: 1};
                }}
                className="flex h-10 items-center justify-center rounded-xl border border-[#34D399] bg-[#ECFDF5] text-[#059669] active:bg-[#A7F3D0]"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (dirRef.current.x !== -1) dirRef.current = {x: 1, y: 0};
                }}
                className="flex h-10 items-center justify-center rounded-xl border border-[#34D399] bg-[#ECFDF5] text-[#059669] active:bg-[#A7F3D0]"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {selected === 'xo' && (
        <div className="space-y-3 text-center">
          <div className="text-xs font-black text-[#0369A1]">{xoStatus}</div>
          <div className="mx-auto grid w-56 grid-cols-3 gap-2 rounded-3xl border-4 border-[#38BDF8] bg-[#E0F2FE] p-2.5">
            {board.map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => playXoCell(i)}
                className="flex h-16 items-center justify-center rounded-2xl border-2 border-[#BAE6FD] bg-white text-2xl font-black shadow-sm transition active:scale-95"
              >
                <span className={cell === 'X' ? 'text-[#0284C7]' : 'text-[#EC4899]'}>{cell}</span>
              </button>
            ))}
          </div>
          {xoDone && (
            <button
              type="button"
              onClick={resetXo}
              className="rounded-xl bg-[#0EA5E9] px-5 py-2 text-xs font-black text-white shadow"
            >
              Ván mới
            </button>
          )}
        </div>
      )}

      {selected === 'simon' && (
        <div className="space-y-2.5 text-center">
          <div className="flex items-center justify-between px-1 text-xs font-black">
            <span className="tabular-nums text-[#6D28D9]">Vòng: {simonRound}/5</span>
            <span className="text-[#D97706]">Thưởng +1 đến +9 Xu</span>
          </div>
          <div className="text-xs font-bold text-[#334155]">{simonMsg}</div>
          <div className="mx-auto grid w-56 grid-cols-2 gap-2.5 rounded-3xl border-4 border-[#C4B5FD] bg-[#F5F3FF] p-3">
            {[
              {id: 0, label: 'Lam', bg: '#0EA5E9', lit: '#7DD3FC'},
              {id: 1, label: 'Hồng', bg: '#EC4899', lit: '#F9A8D4'},
              {id: 2, label: 'Lục', bg: '#10B981', lit: '#6EE7B7'},
              {id: 3, label: 'Vàng', bg: '#F59E0B', lit: '#FDE047'},
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pressSimonPad(p.id)}
                style={{
                  backgroundColor: simonLit === p.id ? p.lit : p.bg,
                  transform: simonLit === p.id ? 'scale(1.04)' : undefined,
                }}
                className="flex h-20 items-center justify-center rounded-2xl border-2 border-white text-xs font-black text-white shadow-md transition active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>
          {(simonPhase === 'ready' || simonPhase === 'done') && (
            <button
              type="button"
              onClick={startSimon}
              className="w-full rounded-2xl bg-[#8B5CF6] py-2.5 text-xs font-black text-white shadow active:scale-95"
            >
              {simonPhase === 'done' ? 'Chơi lại' : 'Bắt đầu'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DEDICATED GAME SCREEN WRAPPER (No bloated panel headers hiding gameplay!)
// ============================================================================
export const ArcadeMiniGameModal: React.FC<ArcadeMiniGameModalProps> = ({
  gameId,
  avatar,
  coins,
  coinGame,
  hasFreeClawToday,
  onUseFreeClawToday,
  onSpendCoins,
  onEarnCoinGame,
  onEarnCoins,
  onClose,
}) => {
  const meta = GAME_META[gameId];
  const isWideActionGame = gameId === 'parkour_climb' || gameId === 'obstacle_rush';

  const renderIcon = () => {
    if (gameId === 'whack_mole') return <Hammer className="h-4 w-4" />;
    if (gameId === 'catch_stars') return <Star className="h-4 w-4" />;
    if (gameId === 'claw_ball') return <Gift className="h-4 w-4" />;
    if (gameId === 'rhythm_dance') return <Music className="h-4 w-4" />;
    if (gameId === 'parkour_climb') return <Mountain className="h-4 w-4" />;
    if (gameId === 'obstacle_rush') return <Flag className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  if (isWideActionGame) {
    return (
      <div className="fixed inset-0 z-50 h-[100dvh] w-[100vw] overflow-hidden bg-[#0F172A]">
        {gameId === 'parkour_climb' && (
          <ParkourClimbGame
            avatar={avatar}
            coinGame={coinGame}
            onEarnCoinGame={onEarnCoinGame}
            onClose={onClose}
          />
        )}
        {gameId === 'obstacle_rush' && (
          <ObstacleRushGame
            avatar={avatar}
            coinGame={coinGame}
            onEarnCoinGame={onEarnCoinGame}
            onClose={onClose}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-2.5 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`anim-pop flex max-h-[94dvh] w-full max-w-[490px] flex-col overflow-hidden rounded-3xl border-4 ${meta.accentBorder} bg-white text-[#0F172A] shadow-2xl`}
      >
        {/* Slim Dedicated Game Cabinet Top Bar */}
        <div className={`flex shrink-0 items-center justify-between gap-2 px-3.5 py-2.5 text-white ${meta.headerBg}`}>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/25">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black">{meta.title}</div>
              <div className="text-[10px] font-bold text-white/90">{meta.badge}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs font-black">
            <span className="flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 tabular-nums">
              <Sparkles className="h-3.5 w-3.5 text-[#7DD3FC]" />
              <span>{coinGame}</span>
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 tabular-nums">
              <Coins className="h-3.5 w-3.5 text-[#FDE047]" />
              <span>{coins}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng trò chơi"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/25 text-white transition hover:bg-black/35 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Unobstructed Game Playfield */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-3.5">
          {gameId === 'whack_mole' && <WhackMoleGame onEarnCoinGame={onEarnCoinGame} />}
          {gameId === 'catch_stars' && <CatchStarsGame onEarnCoinGame={onEarnCoinGame} />}
          {gameId === 'claw_ball' && (
            <ClawBallGame
              coins={coins}
              hasFreeClawToday={hasFreeClawToday}
              onUseFreeClawToday={onUseFreeClawToday}
              onSpendCoins={onSpendCoins}
              onEarnCoinGame={onEarnCoinGame}
            />
          )}
          {gameId === 'rhythm_dance' && <RhythmDanceGame onEarnCoinGame={onEarnCoinGame} />}
          {gameId === 'pc_games' && <PcHtmlGames onEarnCoins={onEarnCoins} />}
        </div>

        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-1.5 text-center text-[10px] font-bold text-[#64748B]">
          Quy đổi cân bằng: 1 CoinGame = {COINGAME_TO_XU_RATE} Xu (tương đương câu cá &amp; bắt bọ)
        </div>
      </div>
    </div>
  );
};
