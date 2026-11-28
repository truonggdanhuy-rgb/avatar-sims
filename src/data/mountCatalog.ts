import {MountDefinition, MountId, MountRank, OwnedMountsState} from '../types/game';

export const SKATEBOARD_CLASSIC_PRICE = 360;
export const BICYCLE_CLASSIC_PRICE = 580;
export const WITCH_BROOM_PRICE = 2400;
export const LOTUS_UMBRELLA_COINGAME_PRICE = 360;
export const DONG_THAP_LOTUS_COINGAME_PRICE = 680;

export const MOUNT_RANK_META: Record<
  MountRank,
  {label: string; shortTag: string; badgeBg: string; badgeText: string; badgeBorder: string; hint: string}
> = {
  B: {
    label: 'Hạng B · Phổ Thông',
    shortTag: 'B',
    badgeBg: 'bg-[#E5F2FA]',
    badgeText: 'text-[#1D5E82]',
    badgeBorder: 'border-[#7DBCE0]',
    hint: 'Nhanh hơn đi bộ, gọn nhẹ dạo khắp thị trấn.',
  },
  A: {
    label: 'Hạng A · Cao Cấp',
    shortTag: 'A',
    badgeBg: 'bg-gradient-to-r from-[#A7F3D0] to-[#38BDF8]',
    badgeText: 'text-[#0B3B2E]',
    badgeBorder: 'border-[#10B981]',
    hint: 'Bay lướt nhanh bậc A, kèm hiệu ứng độc quyền.',
  },
  S: {
    label: 'Hạng S · Siêu Hiếm',
    shortTag: 'S',
    badgeBg: 'bg-gradient-to-r from-[#FFE596] to-[#FFAE52]',
    badgeText: 'text-[#5C2507]',
    badgeBorder: 'border-[#E68A1E]',
    hint: 'Tốc độ siêu nhanh (sắp mở khóa ở các bản cập nhật tới).',
  },
};

export const MOUNT_CATALOG: Record<MountId, MountDefinition> = {
  skateboard_classic: {
    id: 'skateboard_classic',
    kind: 'skateboard',
    rank: 'B',
    name: 'Ván Trượt Mây Cổ Điển',
    price: SKATEBOARD_CLASSIC_PRICE,
    currency: 'coins',
    speedMultiplier: 1.42,
    description:
      'Ván gỗ maple 7 lớp lướt êm mượt. Đứng yên tự bật mũi ván khoanh tay cực ngầu, trượt đường dài tự lấy đà cực chất.',
    palette: {
      primary: '#E85D4A',
      secondary: '#FFF3D9',
      accent: '#2DB5A3',
      trim: '#2B303A',
      wheelOrTire: '#FFD166',
    },
  },
  bicycle_classic: {
    id: 'bicycle_classic',
    kind: 'bicycle',
    rank: 'B',
    name: 'Xe Đạp Cổ Điển',
    price: BICYCLE_CLASSIC_PRICE,
    currency: 'coins',
    speedMultiplier: 1.62,
    description:
      'Xe đạp khung retro kèm giỏ mây và chuông bạc, ngồi đạp nhịp nhàng nhanh hơn đi bộ rõ rệt.',
    palette: {
      primary: '#3DA5B8',
      secondary: '#FFF6E8',
      accent: '#C97B44',
      trim: '#CBD5E1',
      wheelOrTire: '#2B303A',
    },
  },
  lotus_umbrella: {
    id: 'lotus_umbrella',
    kind: 'lotus_umbrella',
    rank: 'A',
    name: 'Lá Sen Che Mưa',
    price: 0,
    currency: 'coinGame',
    coinGamePrice: LOTUS_UMBRELLA_COINGAME_PRICE,
    speedMultiplier: 1.95,
    description:
      'Lá sen gân nổi cỡ lớn tạo hình sóng lượn tự nhiên có khe lá, kèm giọt sương mai, chú ếch xanh và mây đổ mưa bụi kèm gợn nước lung linh.',
    palette: {
      primary: '#2EA860',
      secondary: '#A7F3D0',
      accent: '#7CE352',
      trim: '#CBE4F5',
      wheelOrTire: '#60C5F1',
    },
  },
  dong_thap_lotus: {
    id: 'dong_thap_lotus',
    kind: 'dong_thap_lotus',
    rank: 'A',
    name: 'Sen Đồng Tháp',
    price: 0,
    currency: 'coinGame',
    coinGamePrice: DONG_THAP_LOTUS_COINGAME_PRICE,
    speedMultiplier: 2.15,
    description:
      'Đóa sen hồng Đồng Tháp đại đóa 4 tầng cánh bung tỏa rực rỡ trên cuống sen vươn dài, tỏa ánh sáng hồng dịu dàng cùng hào quang và cánh hoa bay lả tả.',
    palette: {
      primary: '#FF8AB8',
      secondary: '#FFF5F9',
      accent: '#54B956',
      trim: '#FFD55E',
      wheelOrTire: '#FFB4D2',
    },
  },
  witch_broom: {
    id: 'witch_broom',
    kind: 'witch_broom',
    rank: 'A',
    name: 'Chổi Phù Thủy Mèo Đen',
    price: WITCH_BROOM_PRICE,
    currency: 'coins',
    speedMultiplier: 1.98,
    description:
      'Chổi phù thủy bay lơ lửng tốc độ bậc A thắt nơ đỏ rực, treo túi trăng khuyết vàng kèm bé Mèo Đen đồng hành.',
    palette: {
      primary: '#5C3A21',
      secondary: '#D9A754',
      accent: '#DF2B32',
      trim: '#F8CE48',
      wheelOrTire: '#282233',
    },
  },
};

export const MOUNT_LIST: MountDefinition[] = Object.values(MOUNT_CATALOG);
export const TUN_SHOP_MOUNTS: MountDefinition[] = MOUNT_LIST.filter(
  (m) => m.currency !== 'coinGame',
);
export const COINGAME_SHOP_MOUNTS: MountDefinition[] = MOUNT_LIST.filter(
  (m) => m.currency === 'coinGame',
);

export function createInitialOwnedMounts(): OwnedMountsState {
  return {
    ownedIds: [],
    activeMountId: null,
    lastMountId: null,
  };
}

export function getMountDefinition(mountId: MountId | null | undefined): MountDefinition | null {
  if (!mountId) return null;
  return MOUNT_CATALOG[mountId] ?? null;
}
