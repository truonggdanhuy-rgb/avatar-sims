import {WOODEN_BOAT_PRICE} from './fishingCatalog';
import {MountDefinition, MountId, MountRank, OwnedMountsState} from '../types/game';

export const SKATEBOARD_CLASSIC_PRICE = WOODEN_BOAT_PRICE; // Ngang giá thuyền gỗ (220 Xu)
export const BICYCLE_CLASSIC_PRICE = 320;

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
};

export const MOUNT_LIST: MountDefinition[] = Object.values(MOUNT_CATALOG);

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
