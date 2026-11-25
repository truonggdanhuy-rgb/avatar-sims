import {
  BbqFoodId,
  CheckInState,
  DailyQuestKey,
  DailyQuestProgress,
  JoyboyDeliveryOrder,
  JoyboyDeliveryState,
  JoyboyTargetNpcId,
} from '../types/game';

export const MAX_JOYBOY_DELIVERIES_PER_DAY = 2;

export function getTodayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CheckInRewardSpec {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  coins: number;
  foodReward?: {
    foodId: BbqFoodId;
    name: string;
    qty: number;
  };
  bonusFoodReward?: {
    foodId: BbqFoodId;
    name: string;
    qty: number;
  };
  highlight?: boolean;
}

/**
 * Cân bằng kinh tế 7 ngày:
 * - Ngày 1-6: Xu tăng dần (40 -> 110 Xu) + kèm đồ ăn/nước uống cầm tay hữu ích.
 * - Ngày 7: Thưởng lớn Xu (350 Xu) + combo món ăn BBQ & Cola để kỷ niệm đủ tuần!
 */
export const CHECK_IN_REWARDS: CheckInRewardSpec[] = [
  {
    day: 1,
    title: 'Ngày 1 · Chào Buổi Sáng',
    coins: 40,
    foodReward: {foodId: 'drink_water', name: 'Nước Suối Mát', qty: 2},
  },
  {
    day: 2,
    title: 'Ngày 2 · Dạo Chơi Thị Trấn',
    coins: 55,
    foodReward: {foodId: 'bbq_corn_sausage', name: 'Bắp & Xúc Xích Nướng', qty: 1},
  },
  {
    day: 3,
    title: 'Ngày 3 · Năng Lượng Ngọt Ngào',
    coins: 70,
    foodReward: {foodId: 'drink_strawberry_milk', name: 'Sữa Dâu Hộp', qty: 2},
  },
  {
    day: 4,
    title: 'Ngày 4 · Giữa Tuần Sôi Nổi',
    coins: 85,
    foodReward: {foodId: 'bbq_meat_skewer', name: 'Xiên Thịt Nướng BBQ', qty: 1},
  },
  {
    day: 5,
    title: 'Ngày 5 · Thư Giãn Matcha',
    coins: 100,
    foodReward: {foodId: 'drink_matcha_can', name: 'Trà Xanh Matcha', qty: 2},
  },
  {
    day: 6,
    title: 'Ngày 6 · Cuối Tuần Rộn Ràng',
    coins: 120,
    foodReward: {foodId: 'bbq_grilled_fish', name: 'Cá Nướng Lá Chuối', qty: 2},
  },
  {
    day: 7,
    title: 'Ngày 7 · Đại Tiệc Chủ Nhật',
    coins: 360,
    foodReward: {foodId: 'bbq_grilled_fish', name: 'Cá Nướng Lá Chuối', qty: 2},
    bonusFoodReward: {foodId: 'drink_cola', name: 'Cola Mát Lạnh', qty: 2},
    highlight: true,
  },
];

export function createInitialCheckInState(): CheckInState {
  return {
    completedDays: 0,
    lastClaimDate: null,
  };
}

export interface DailyQuestDef {
  key: DailyQuestKey;
  title: string;
  desc: string;
  rewardCoins: number;
  badgeColor: string;
  accentBg: string;
}

/**
 * 8 nhiệm vụ hằng ngày trải rộng khắp mọi tính năng trong Thị Trấn Mây
 * Tổng tối đa: 295 Xu / ngày (cân bằng tốt, đủ khích lệ khám phá hết bản đồ)
 */
export const DAILY_QUEST_DEFS: DailyQuestDef[] = [
  {
    key: 'garden',
    title: 'Nhà Nông Chăm Chỉ',
    desc: 'Gieo hạt, tưới nước hoặc thu hoạch cây trồng tại Nông Trại',
    rewardCoins: 35,
    badgeColor: '#4E9A5A',
    accentBg: '#ECF7EE',
  },
  {
    key: 'livestock',
    title: 'Chủ Trại Vật Nuôi & Ao Cá',
    desc: 'Cho ăn, thu sản phẩm chuồng Gà/Vịt/Lợn/Bò hoặc Ao Thủy Sinh',
    rewardCoins: 35,
    badgeColor: '#C87636',
    accentBg: '#FFF4E6',
  },
  {
    key: 'fishing',
    title: 'Cần Thủ Thị Trấn',
    desc: 'Câu thành công ít nhất 1 con cá ở Sông, Hồ hoặc Biển Đảo Mây',
    rewardCoins: 40,
    badgeColor: '#2E7DA3',
    accentBg: '#E9F5FB',
  },
  {
    key: 'insects',
    title: 'Thợ Săn Côn Trùng',
    desc: 'Vung vợt bắt thành công 1 loài bướm hoặc bọ cánh cứng',
    rewardCoins: 35,
    badgeColor: '#5B9446',
    accentBg: '#EEF7E8',
  },
  {
    key: 'cooking',
    title: 'Đầu Bếp & Giao Đơn Hàng',
    desc: 'Xay nguyên liệu, nấu ăn tại Nhà/Nông Trại hoặc giao 1 Đơn Nông Trại',
    rewardCoins: 45,
    badgeColor: '#D46447',
    accentBg: '#FFF0EC',
  },
  {
    key: 'pet',
    title: 'Người Bạn Thú Cưng',
    desc: 'Cho thú cưng ăn, chơi đùa hoặc nhận nuôi thú cưng tại Cửa Hàng Pets',
    rewardCoins: 30,
    badgeColor: '#D97366',
    accentBg: '#FFF1F0',
  },
  {
    key: 'decor',
    title: 'Kiến Trúc Sư Sáng Tạo',
    desc: 'Mua hoặc đặt/sắp xếp 1 món Nội Thất Nhà hoặc Trang Trí Nông Trại',
    rewardCoins: 35,
    badgeColor: '#7D63A8',
    accentBg: '#F4EFFB',
  },
  {
    key: 'delivery',
    title: 'Shipper & Phong Cách',
    desc: 'Hoàn thành 1 đơn Giao Hàng cho Joyboy hoặc mua sắm tại Boutique Tina',
    rewardCoins: 40,
    badgeColor: '#2F82A6',
    accentBg: '#EBF7FC',
  },
];

export function createEmptyDailyQuestFlags(): Record<DailyQuestKey, boolean> {
  return {
    garden: false,
    livestock: false,
    fishing: false,
    insects: false,
    cooking: false,
    pet: false,
    decor: false,
    delivery: false,
  };
}

export function createEmptyDailyQuests(): DailyQuestProgress {
  return {
    date: getTodayDateKey(),
    tasks: createEmptyDailyQuestFlags(),
    claimed: createEmptyDailyQuestFlags(),
  };
}

export function normalizeDailyQuests(raw: unknown): DailyQuestProgress {
  const today = getTodayDateKey();
  const base = createEmptyDailyQuests();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = raw as Partial<DailyQuestProgress> & {
    tasks?: Record<string, boolean>;
    claimed?: Record<string, boolean>;
  };
  if (parsed.date !== today) return base;
  const tasks = createEmptyDailyQuestFlags();
  const claimed = createEmptyDailyQuestFlags();
  for (const def of DAILY_QUEST_DEFS) {
    tasks[def.key] = Boolean(parsed.tasks?.[def.key]);
    claimed[def.key] = Boolean(parsed.claimed?.[def.key]);
  }
  // Backward migrate old 'dressup' flag into 'delivery'
  if (parsed.tasks?.dressup) tasks.delivery = true;
  if (parsed.claimed?.dressup) claimed.delivery = true;
  return {date: today, tasks, claimed};
}

export interface JoyboyTargetSpec {
  id: JoyboyTargetNpcId;
  npcName: string;
  locationHint: string;
  parcels: string[];
  rewardCoins: number;
}

export const JOYBOY_DELIVERY_TARGETS: JoyboyTargetSpec[] = [
  {
    id: 'koi',
    npcName: 'Koi (Sạp Cần & Vợt)',
    locationHint: 'Bờ Hồ Phía Nam Thị Trấn',
    parcels: ['Cuộn dây câu lụa xanh', 'Hộp phao cá chép may mắn', 'Bánh quy mật ong cho Koi'],
    rewardCoins: 55,
  },
  {
    id: 'ship',
    npcName: 'Ship (Sạp Thuyền)',
    locationHint: 'Bến Sông Khu Sinh Thái Phía Tây',
    parcels: ['La bàn đồng cổ điển', 'Sơn chống thấm gỗ sồi', 'Còi báo sương mù mini'],
    rewardCoins: 65,
  },
  {
    id: 'tina',
    npcName: 'Tina (Tiệm Thời Trang)',
    locationHint: 'Bên trong Cửa Hàng Thời Trang · Phía Tây Nam',
    parcels: ['Cuộn ruy-băng lụa hồng', 'Hộp khuy áo ngọc trai', 'Sách mẫu váy mùa xuân'],
    rewardCoins: 60,
  },
  {
    id: 'bob',
    npcName: 'Bob (Nội Thất)',
    locationHint: 'Bên trong Cửa Hàng Thời Trang & Nội Thất · Cánh Phải',
    parcels: ['Bộ cọ sơn tường pastel', 'Gói đinh vít đồng thau', 'Mẫu vải bọc sofa kem'],
    rewardCoins: 60,
  },
  {
    id: 'ivan',
    npcName: 'Ivan (Cửa Hàng Pets)',
    locationHint: 'Bên trong Cửa Hàng Pets · Phía Đông Nam',
    parcels: ['Túi hạt dinh dưỡng cá hồi', 'Chuông cổ xinh cho mèo', 'Vòng đồ chơi cho cún'],
    rewardCoins: 65,
  },
  {
    id: 'tun',
    npcName: 'Tun (Kumo Motors)',
    locationHint: 'Tầng 1 Trung Tâm Thương Mại May Mall',
    parcels: ['Bộ vòng bi ván trượt siêu mượt', 'Chuông xe đạp cổ điển', 'Bơm lốp mini sắc màu'],
    rewardCoins: 70,
  },
  {
    id: 'peppa',
    npcName: 'Peppa (Siêu Thị Mini)',
    locationHint: 'Tầng 1 May Mall · Cánh Phải',
    parcels: ['Hũ tiêu thơm hảo hạng', 'Gói giấy nến làm bánh', 'Hộp dâu tây sấy giòn'],
    rewardCoins: 70,
  },
  {
    id: 'cafe',
    npcName: 'Barista (Quán Cà Phê Mây)',
    locationHint: 'Tầng 1 May Mall · Cánh Trái',
    parcels: ['Túi hạt cà phê rang mộc', 'Siro caramel muối biển', 'Bộ ống hút tre xinh'],
    rewardCoins: 70,
  },
];

export function createInitialJoyboyDeliveryState(): JoyboyDeliveryState {
  return {
    date: getTodayDateKey(),
    completedCount: 0,
    activeOrder: null,
  };
}

export function normalizeJoyboyDeliveryState(raw: unknown): JoyboyDeliveryState {
  const today = getTodayDateKey();
  if (!raw || typeof raw !== 'object') return createInitialJoyboyDeliveryState();
  const parsed = raw as Partial<JoyboyDeliveryState>;
  if (parsed.date !== today) return createInitialJoyboyDeliveryState();
  return {
    date: today,
    completedCount:
      typeof parsed.completedCount === 'number'
        ? Math.max(0, Math.min(MAX_JOYBOY_DELIVERIES_PER_DAY, Math.floor(parsed.completedCount)))
        : 0,
    activeOrder: parsed.activeOrder ?? null,
  };
}

export function rollJoyboyDeliveryOrder(excludeNpcId?: JoyboyTargetNpcId): JoyboyDeliveryOrder {
  const pool = excludeNpcId
    ? JOYBOY_DELIVERY_TARGETS.filter((t) => t.id !== excludeNpcId)
    : JOYBOY_DELIVERY_TARGETS;
  const spec = pool[Math.floor(Math.random() * pool.length)] ?? JOYBOY_DELIVERY_TARGETS[0];
  const parcelName = spec.parcels[Math.floor(Math.random() * spec.parcels.length)];
  return {
    id: `joyboy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    targetNpcId: spec.id,
    targetNpcName: spec.npcName,
    locationHint: spec.locationHint,
    parcelName,
    rewardCoins: spec.rewardCoins,
    createdAt: Date.now(),
  };
}
