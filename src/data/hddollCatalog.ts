import {HandheldStyle, ShopItem} from '../types/game';

export type DollRarity = 'common' | 'special' | 'secret';

export type DollEffectTag = 'ear_sparkle' | 'ear_sparkle_hearts' | 'ear_wave_blink' | 'none';

export interface DollCatalogEntry {
  /** ID đồng bộ với HandheldStyle (dùng trong avatar.handheld) */
  handheldId: Exclude<
    HandheldStyle,
    | 'none'
    | 'milk_tea'
    | 'plush_bear'
    | 'flower_bouquet'
    | 'blue_rose_bouquet'
    | 'cupid_bow'
    | 'tote_bag'
    | 'mini_umbrella'
    | 'paper_lantern'
    | 'lotus_fan'
    | 'matcha_latte'
    | 'daisy_flower'
    | 'star_lantern'
    | 'rooster_lantern'
  >;
  /** ID lưu trong túi đồ / Tủ đồ (ownedIds) */
  shopItemId: string;
  /** Tên hiển thị — bạn có thể tự do đổi tên riêng sau này */
  name: string;
  /** Dòng / chủ đề cảm hứng */
  seriesTag: string;
  rarity: DollRarity;
  /** Tỉ lệ quay trúng (%) — tổng 10 con = 100% */
  dropRate: number;
  /** Màu chủ đạo của gấu bông */
  primaryColor: string;
  /** Màu phụ / tai / bụng / phụ kiện */
  accentColor: string;
  /** Hiệu ứng đặc biệt khi nhân vật ôm trên tay */
  effect: DollEffectTag;
  effectLabel: string;
  description: string;
}

/** Giá 1 lần quay Blindbox HDDOLL bằng Xu Thị Trấn */
export const BLINDBOX_SPIN_COST_XU = 320;

/** Tiền Xu hoàn lại khi quay trúng Doll đã sở hữu (để lượt quay luôn có giá trị) */
export const BLINDBOX_DUPLICATE_REFUND: Record<DollRarity, number> = {
  common: 260,
  special: 300,
  secret: 420,
};

export const HDDOLL_RARITY_META: Record<
  DollRarity,
  {
    label: string;
    totalRateLabel: string;
    badgeBg: string;
    badgeText: string;
    borderClass: string;
    glowClass: string;
  }
> = {
  common: {
    label: 'Thường',
    totalRateLabel: '72%',
    badgeBg: 'bg-[#334155]',
    badgeText: 'text-[#E2E8F0]',
    borderClass: 'border-white/15',
    glowClass: 'from-[#94A3B8]/25 to-[#64748B]/10',
  },
  special: {
    label: 'Đặc Biệt',
    totalRateLabel: '24%',
    badgeBg: 'bg-[#9333EA]',
    badgeText: 'text-[#FAF5FF]',
    borderClass: 'border-[#C084FC]/60',
    glowClass: 'from-[#F472B6]/30 to-[#A855F7]/20',
  },
  secret: {
    label: 'Secret Hiếm Nhất',
    totalRateLabel: '4%',
    badgeBg: 'bg-[#F59E0B]',
    badgeText: 'text-[#1E1B18]',
    borderClass: 'border-[#FDE047]/80',
    glowClass: 'from-[#FDE047]/35 to-[#38BDF8]/25',
  },
};

/**
 * BỘ SƯU TẬP 10 DOLL ĐẦU TIÊN — BLINDBOX HDDOLL
 * Bạn có thể chỉnh sửa trực tiếp tên (`name`), màu (`primaryColor`, `accentColor`),
 * hoặc tỉ lệ (`dropRate`) tại file này để cá nhân hóa cho riêng mình và bạn bè.
 */
export const HDDOLL_CATALOG: DollCatalogEntry[] = [
  // ================= 6 DOLL THƯỜNG (Tổng 72% -> 12% / con) =================
  {
    handheldId: 'doll_mimi_bunny',
    shopItemId: 'hand_doll_mimi_bunny',
    name: 'Mimi Bunny',
    seriesTag: 'BabyThree Tai Thỏ',
    rarity: 'common',
    dropRate: 12,
    primaryColor: '#F9B4CE',
    accentColor: '#FFF5F8',
    effect: 'none',
    effectLabel: 'Ôm lắc người êm ái',
    description: 'Bé thỏ bông BabyThree má phính đội mũ tai thỏ hồng kem cùng nơ cổ xinh xắn.',
  },
  {
    handheldId: 'doll_coco_bear',
    shopItemId: 'hand_doll_coco_bear',
    name: 'Coco Teddy',
    seriesTag: 'Gấu Bông Cổ Điển',
    rarity: 'common',
    dropRate: 12,
    primaryColor: '#C58B58',
    accentColor: '#FBEBD7',
    effect: 'none',
    effectLabel: 'Ôm lắc người êm ái',
    description: 'Chú gấu bông caramel lông xù mặc yếm kem mềm mại và nơ đỏ ấm áp.',
  },
  {
    handheldId: 'doll_pepe_frog',
    shopItemId: 'hand_doll_pepe_frog',
    name: 'Kero Froggy',
    seriesTag: 'Hoạt Hình Pastel',
    rarity: 'common',
    dropRate: 12,
    primaryColor: '#7AD06C',
    accentColor: '#F7FFE8',
    effect: 'none',
    effectLabel: 'Ôm lắc người êm ái',
    description: 'Chú ếch xanh mắt tròn xoe đội nón lá dâu nhỏ, má ửng hồng dễ thương.',
  },
  {
    handheldId: 'doll_boba_capy',
    shopItemId: 'hand_doll_boba_capy',
    name: 'Boba Capybara',
    seriesTag: 'Thú Bông Thư Giãn',
    rarity: 'common',
    dropRate: 12,
    primaryColor: '#B8845A',
    accentColor: '#FF9F38',
    effect: 'none',
    effectLabel: 'Ôm lắc người êm ái',
    description: 'Bé chuột lang nước mặt lim dim chill hết nấc, đội quả quýt vàng trên đầu.',
  },
  {
    handheldId: 'doll_lulu_sheep',
    shopItemId: 'hand_doll_lulu_sheep',
    name: 'Lulu Cloud',
    seriesTag: 'Mây Bông Mềm',
    rarity: 'common',
    dropRate: 12,
    primaryColor: '#FFF6EB',
    accentColor: '#F7A8BE',
    effect: 'none',
    effectLabel: 'Ôm lắc người êm ái',
    description: 'Bé cừu bông trắng muốt xoăn xù như kẹo bông gòn, đeo chuông nhỏ trước ngực.',
  },
  {
    handheldId: 'doll_pipi_duck',
    shopItemId: 'hand_doll_pipi_duck',
    name: 'Pipi Duck',
    seriesTag: 'Vịt Vàng Hoạt Hình',
    rarity: 'common',
    dropRate: 12,
    primaryColor: '#FDE047',
    accentColor: '#FB923C',
    effect: 'none',
    effectLabel: 'Ôm lắc người êm ái',
    description: 'Chú vịt con vàng rực má phính đội mũ nồi xanh ngọc, nhìn là muốn ôm ngay.',
  },

  // ================= 3 DOLL ĐẶC BIỆT (Tổng 24% -> 8% / con) =================
  {
    handheldId: 'doll_labu_mint',
    shopItemId: 'hand_doll_labu_mint',
    name: 'Labu Mint',
    seriesTag: 'Cảm hứng Labubu',
    rarity: 'special',
    dropRate: 8,
    primaryColor: '#7BE4C4',
    accentColor: '#FFF4E6',
    effect: 'ear_sparkle',
    effectLabel: 'Vẩy tai nhẹ · Mắt long lanh',
    description: 'Quái vật thỏ Labubu bạc hà nụ cười răng nhỏ tinh nghịch, tai dài vẩy nhẹ & mắt pha lê lấp lánh.',
  },
  {
    handheldId: 'doll_baby3_berry',
    shopItemId: 'hand_doll_baby3_berry',
    name: 'BabyThree Berry',
    seriesTag: 'Cảm hứng BabyThree',
    rarity: 'special',
    dropRate: 8,
    primaryColor: '#FF7FA9',
    accentColor: '#FFF0F5',
    effect: 'ear_sparkle_hearts',
    effectLabel: 'Vẩy tai · Mắt long lanh · Tim bay',
    description:
      'Phiên bản BabyThree dâu tây cao cấp với viền ren kem, nơ tai xinh, mắt sao long lanh và trái tim hồng nhẹ nhàng bay quanh.',
  },
  {
    handheldId: 'doll_luna_kuromi',
    shopItemId: 'hand_doll_luna_kuromi',
    name: 'Luna Bunny',
    seriesTag: 'Cảm hứng Hoạt Hình Tím',
    rarity: 'special',
    dropRate: 8,
    primaryColor: '#A78BFA',
    accentColor: '#241E38',
    effect: 'ear_sparkle',
    effectLabel: 'Vẩy tai nhẹ · Mắt long lanh',
    description:
      'Thỏ nhung tím huyền bí đội mũ hề tai dài vẩy nhẹ, ánh mắt pha lê tím lấp lánh.',
  },

  // ================= 1 DOLL SECRET HIẾM NHẤT (4%) =================
  // (Giữ nguyên mã ID slot Secret để tương thích dữ liệu người chơi đã quay trúng)
  {
    handheldId: 'doll_secret_doraemon',
    shopItemId: 'hand_doll_secret_doraemon',
    name: 'Cinnamo Angel',
    seriesTag: 'Secret Thiên Thần Mây',
    rarity: 'secret',
    dropRate: 4,
    primaryColor: '#EAF6FF',
    accentColor: '#7DD3FC',
    effect: 'ear_wave_blink',
    effectLabel: 'Lắc tai · Vẩy tay · Chớp mắt',
    description:
      'Cún thiên thần mây trắng đội vương miện vàng, cánh sao nhỏ & nơ xanh bầu trời — biết lắc đôi tai bông, chớp mắt và vẩy tay chào!',
  },
];

export const HDDOLL_SHOP_ITEMS: ShopItem[] = HDDOLL_CATALOG.map((doll) => ({
  id: doll.shopItemId,
  category: 'handheld',
  name: `${doll.name}${doll.rarity === 'secret' ? ' ★ Secret' : doll.rarity === 'special' ? ' ✦ Đặc Biệt' : ''}`,
  price: BLINDBOX_SPIN_COST_XU,
  patch: {
    handheld: doll.handheldId,
    handheldColor: doll.primaryColor,
  },
  blindboxOnly: true,
}));

export function getDollByHandheld(style?: HandheldStyle | null): DollCatalogEntry | undefined {
  if (!style) return undefined;
  return HDDOLL_CATALOG.find((d) => d.handheldId === style);
}

export function isDollHandheld(style?: HandheldStyle | null): boolean {
  return Boolean(getDollByHandheld(style));
}

export function rollBlindboxDoll(): DollCatalogEntry {
  const totalWeight = HDDOLL_CATALOG.reduce((sum, item) => sum + item.dropRate, 0);
  let cursor = Math.random() * totalWeight;
  for (const doll of HDDOLL_CATALOG) {
    cursor -= doll.dropRate;
    if (cursor <= 0) return doll;
  }
  return HDDOLL_CATALOG[0];
}
