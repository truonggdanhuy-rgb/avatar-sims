import {PlayerLevelState} from '../types/game';

export const MAX_PLAYER_LEVEL = 100;

export interface LevelMilestoneReward {
  level: 10 | 30 | 50;
  title: string;
  description: string;
  rewardCoins: number;
  rewardCoinGame: number;
  badgeColor: string;
  accentBg: string;
}

export const LEVEL_MILESTONE_REWARDS: LevelMilestoneReward[] = [
  {
    level: 10,
    title: 'Quà Cư Dân Mới · Cấp 10',
    description: 'Mốc khởi đầu rực rỡ tại Thị Trấn Mây',
    rewardCoins: 350,
    rewardCoinGame: 30,
    badgeColor: '#2E7D46',
    accentBg: '#EAF8EE',
  },
  {
    level: 30,
    title: 'Quà Công Dân Chăm Chỉ · Cấp 30',
    description: 'Phần thưởng dành cho cư dân dày dạn kinh nghiệm',
    rewardCoins: 1000,
    rewardCoinGame: 85,
    badgeColor: '#2563EB',
    accentBg: '#EFF6FF',
  },
  {
    level: 50,
    title: 'Quà Huyền Thoại · Cấp 50',
    description: 'Kho báu tri ân nửa chặng đường đỉnh cao',
    rewardCoins: 2800,
    rewardCoinGame: 220,
    badgeColor: '#C25912',
    accentBg: '#FFF4E6',
  },
];

export const LEVEL_EXP_GUIDE = [
  {
    id: 'farm_order',
    label: 'Giao hàng Nông Trại',
    expRange: '25 – 75 EXP',
  },
  {
    id: 'fishing',
    label: 'Câu cá (Sông & Biển)',
    expRange: '16 – 34 EXP (+10 loài mới)',
  },
  {
    id: 'insects',
    label: 'Bắt côn trùng',
    expRange: '14 – 30 EXP (+10 loài mới)',
  },
  {
    id: 'parkour',
    label: 'Hoàn thành ván Parkour 3D',
    expRange: '85 – 105 EXP',
  },
  {
    id: 'obstacle',
    label: 'Hoàn thành ván Vượt Ngại Vật 3D',
    expRange: '80 – 100 EXP',
  },
];

export function getExpForNextLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level)));
  if (clamped >= MAX_PLAYER_LEVEL) return 0;
  return Math.round(80 + (clamped - 1) * 32 + Math.pow(clamped - 1, 1.55) * 4.2);
}

export function createInitialPlayerLevel(): PlayerLevelState {
  return {
    level: 1,
    exp: 0,
    totalExp: 0,
    claimedMilestones: [],
  };
}

export function normalizePlayerLevel(raw: unknown): PlayerLevelState {
  const base = createInitialPlayerLevel();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = raw as Partial<PlayerLevelState>;
  const level =
    typeof parsed.level === 'number' && Number.isFinite(parsed.level)
      ? Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(parsed.level)))
      : 1;
  const maxForLvl = getExpForNextLevel(level);
  const exp =
    level >= MAX_PLAYER_LEVEL
      ? 0
      : typeof parsed.exp === 'number' && Number.isFinite(parsed.exp)
        ? Math.max(0, Math.min(Math.max(0, maxForLvl - 1), Math.floor(parsed.exp)))
        : 0;
  const totalExp =
    typeof parsed.totalExp === 'number' && Number.isFinite(parsed.totalExp)
      ? Math.max(0, Math.floor(parsed.totalExp))
      : 0;
  const claimedMilestones = Array.isArray(parsed.claimedMilestones)
    ? Array.from(
        new Set(
          parsed.claimedMilestones.filter(
            (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0,
          ),
        ),
      ).sort((a, b) => a - b)
    : [];
  return {level, exp, totalExp, claimedMilestones};
}

export function addPlayerExp(
  current: PlayerLevelState,
  gainAmount: number,
): {
  nextState: PlayerLevelState;
  gainedExp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
} {
  const cleanGain = Math.max(0, Math.round(gainAmount));
  if (cleanGain <= 0) {
    return {
      nextState: current,
      gainedExp: 0,
      leveledUp: false,
      oldLevel: current.level,
      newLevel: current.level,
    };
  }

  const oldLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL, current.level));
  if (oldLevel >= MAX_PLAYER_LEVEL) {
    return {
      nextState: {
        ...current,
        level: MAX_PLAYER_LEVEL,
        exp: 0,
        totalExp: current.totalExp + cleanGain,
      },
      gainedExp: cleanGain,
      leveledUp: false,
      oldLevel: MAX_PLAYER_LEVEL,
      newLevel: MAX_PLAYER_LEVEL,
    };
  }

  let level = oldLevel;
  let exp = current.exp + cleanGain;
  const totalExp = current.totalExp + cleanGain;

  while (level < MAX_PLAYER_LEVEL) {
    const req = getExpForNextLevel(level);
    if (req <= 0 || exp < req) break;
    exp -= req;
    level += 1;
  }

  if (level >= MAX_PLAYER_LEVEL) {
    level = MAX_PLAYER_LEVEL;
    exp = 0;
  }

  return {
    nextState: {
      ...current,
      level,
      exp,
      totalExp,
    },
    gainedExp: cleanGain,
    leveledUp: level > oldLevel,
    oldLevel,
    newLevel: level,
  };
}

export function computeFarmOrderExp(rewardCoins: number, reqCount: number): number {
  const base = 22 + Math.round(rewardCoins * 0.28) + Math.max(0, reqCount - 1) * 5;
  return Math.max(25, Math.min(75, base));
}

export function computeFishCatchExp(rarity: 'common' | 'rare', isFirstDiscovery: boolean): number {
  return (rarity === 'rare' ? 34 : 16) + (isFirstDiscovery ? 10 : 0);
}

export function computeInsectCatchExp(
  rarity: 'common' | 'rare',
  isFirstDiscovery: boolean,
): number {
  return (rarity === 'rare' ? 30 : 14) + (isFirstDiscovery ? 10 : 0);
}

export function computeArcadeWinExp(
  gameId: 'parkour_climb' | 'obstacle_rush',
  bonusUnits = 0,
): number {
  if (gameId === 'parkour_climb') {
    return Math.min(105, 85 + Math.max(0, Math.floor(bonusUnits)));
  }
  return Math.min(100, 80 + Math.max(0, Math.floor(bonusUnits)) * 3);
}

export function getClaimableMilestoneCount(state: PlayerLevelState): number {
  return LEVEL_MILESTONE_REWARDS.filter(
    (m) => state.level >= m.level && !state.claimedMilestones.includes(m.level),
  ).length;
}
