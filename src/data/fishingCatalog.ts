import {
  BoatId,
  BoatsState,
  FishDexRecord,
  FishRarity,
  FishSpeciesDefinition,
  FishSpeciesId,
  FishingRodState,
  RiverFishSpeciesId,
  SeaFishSpeciesId,
  WoodenBoatState,
} from '../types/game';

export const WOODEN_ROD_PRICE = 90;
export const WOODEN_ROD_MAX_DURABILITY = 25;
export const WOODEN_ROD_FULL_REPAIR_COST = 28;
export const WOODEN_BOAT_PRICE = 360;
export const DUCK_BOAT_PRICE = 560;
export const SWAN_PRINCESS_BOAT_PRICE = 780;
export const LOTUS_LANTERN_BOAT_PRICE = 940;
export const PIRATE_GALLEON_BOAT_PRICE = 1120;
export const SPEEDBOAT_RETRO_PRICE = 1320;

export interface BoatDefinition {
  id: BoatId;
  name: string;
  price: number;
  subtitle: string;
  description: string;
}

export const BOAT_CATALOG: Record<BoatId, BoatDefinition> = {
  wooden_boat: {
    id: 'wooden_boat',
    name: 'Thuyền Gỗ',
    price: WOODEN_BOAT_PRICE,
    subtitle: 'Thuyền gỗ sồi đóng mộng thủ công có đèn lồng mũi & bánh lái',
    description:
      'Thân gỗ sồi ván ghép chắc chắn với sàn nan, đèn mũi đồng ấm áp và mái chèo khắc vân gỗ cổ điển.',
  },
  duck_boat: {
    id: 'duck_boat',
    name: 'Thuyền Đạp Vịt',
    price: DUCK_BOAT_PRICE,
    subtitle: 'Vịt trắng thắt nơ thủy thủ có đôi cánh lớp và guồng nước xoay',
    description:
      'Mẫu thuyền đạp vịt công viên dễ thương với đôi cánh xếp lớp mềm mại, ghế đệm êm ái và guồng nước nhịp nhàng.',
  },
  swan_princess_boat: {
    id: 'swan_princess_boat',
    name: 'Thuyền Thiên Nga Hồng',
    price: SWAN_PRINCESS_BOAT_PRICE,
    subtitle: 'Thiên nga hồng ngọc đội vương miện hoàng gia & cánh lông nhiều tầng',
    description:
      'Đạp nước thanh lịch trên thân thiên nga hồng viền vàng hoàng gia, cánh xếp tầng lộng lẫy và guồng nước ánh kim.',
  },
  pirate_galleon_boat: {
    id: 'pirate_galleon_boat',
    name: 'Thuyền Hải Tặc Mini',
    price: PIRATE_GALLEON_BOAT_PRICE,
    subtitle: 'Chiến hạm 2 tầng boong gỗ gụ, buồm căng gió, kho báu & 4 đại bác đồng',
    description:
      'Tàu hải tặc chi tiết với khoang lái nâng cao, buồm sọc đón gió, cờ đầu lâu, rương kho báu vàng và 4 đại bác đồng.',
  },
  speedboat_retro: {
    id: 'speedboat_retro',
    name: 'Ca Nô Thể Thao Retro',
    price: SPEEDBOAT_RETRO_PRICE,
    subtitle: 'Ca nô du lịch ốp gỗ mahogany, 3 đồng hồ lái & động cơ chân vịt đồng',
    description:
      'Ca nô hạng sang thân hai tầng phối gỗ gụ, kính chắn gió viền chrome, bảng đồng hồ chi tiết, ghế da thể thao và sàn bơi đuôi.',
  },
  lotus_lantern_boat: {
    id: 'lotus_lantern_boat',
    name: 'Thuyền Hoa Sen Đêm Trăng',
    price: LOTUS_LANTERN_BOAT_PRICE,
    subtitle: 'Đài sen hai lớp cánh cong ôm thân ngọc bích & lồng đèn cung đình',
    description:
      'Con thuyền đài sen hai tầng cánh uốn cong mềm mại, nụ sen đầu mũi và lồng đèn lục giác tua rua phát sáng dịu dàng.',
  },
};

export const BOAT_IDS: BoatId[] = [
  'wooden_boat',
  'duck_boat',
  'swan_princess_boat',
  'pirate_galleon_boat',
  'speedboat_retro',
  'lotus_lantern_boat',
];

export const BOAT_LIST: BoatDefinition[] = BOAT_IDS.map((id) => BOAT_CATALOG[id]);

export function createInitialWoodenBoat(): WoodenBoatState {
  return {
    owned: false,
    purchasedAt: null,
  };
}

export function createInitialBoatsState(): BoatsState {
  return {
    ownedIds: [],
    activeBoatId: 'wooden_boat',
    purchasedAt: {},
  };
}

export interface FishRarityBehavior {
  label: string;
  shadowScale: number;
  biteWindowMs: number;
  nibbleMin: number;
  nibbleMax: number;
}

/**
 * Play Together-style per-rarity fish shadow & bite reaction tuning.
 */
export const FISH_RARITY_CONFIG: Record<FishRarity, FishRarityBehavior> = {
  common: {
    label: 'Thường',
    shadowScale: 0.68,
    biteWindowMs: 1450,
    nibbleMin: 1,
    nibbleMax: 4,
  },
  rare: {
    label: 'Hiếm',
    shadowScale: 1.24,
    biteWindowMs: 880,
    nibbleMin: 1,
    nibbleMax: 4,
  },
};

export const ROD_BOBBER_SPECS: Record<
  'wooden_rod',
  {shape: 'round'; primaryColor: string; bandColor: string; metalColor: string}
> = {
  wooden_rod: {
    shape: 'round',
    primaryColor: '#8B5228',
    bandColor: '#D6A168',
    metalColor: '#E0B450',
  },
};

export function createInitialFishingRod(): FishingRodState {
  return {
    owned: false,
    equipped: false,
    durability: WOODEN_ROD_MAX_DURABILITY,
    maxDurability: WOODEN_ROD_MAX_DURABILITY,
  };
}

export function getRodRepairCost(durability: number, maxDurability: number): number {
  const missing = Math.max(0, maxDurability - durability);
  if (missing <= 0) return 0;
  return Math.max(
    6,
    Math.ceil((missing / Math.max(1, maxDurability)) * WOODEN_ROD_FULL_REPAIR_COST),
  );
}

/**
 * Probabilistic durability loss so rods don't break every exact 25 casts/catches.
 * Catching common ~42%, rare ~58%, escaping ~65%.
 */
export function rollRodDurabilityLoss(
  outcome: 'catch' | 'escape',
  rarity: FishRarity = 'common',
): number {
  const loseChance =
    outcome === 'escape' ? 0.65 : rarity === 'rare' ? 0.58 : 0.42;
  return Math.random() < loseChance ? 1 : 0;
}

/**
 * Cá sông (tuyến khởi đầu ngay tại Thị Trấn):
 * - Thường: 4–9 Xu
 * - Hiếm: 11–26 Xu
 */
export const RIVER_FISH_CATALOG: Record<RiverFishSpeciesId, FishSpeciesDefinition> = {
  ca_com: {
    id: 'ca_com',
    name: 'Cá Cơm',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.05,
    maxKg: 0.25,
    basePrice: 3,
    pricePerKg: 5,
    dropWeight: 18,
    description: 'Nhỏ nhắn ánh bạc, hay bơi thành đàn gần bờ hồ nước ngọt.',
  },
  tom_cang_xanh: {
    id: 'tom_cang_xanh',
    name: 'Tôm Càng Xanh',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.15,
    maxKg: 0.65,
    basePrice: 4,
    pricePerKg: 4,
    dropWeight: 16,
    description: 'Đôi càng xanh ngọc khỏe khoắn, rất chuộng vùng bùn cát đáy sông.',
  },
  ca_ro_dong: {
    id: 'ca_ro_dong',
    name: 'Cá Rô Đồng',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.18,
    maxKg: 0.72,
    basePrice: 4,
    pricePerKg: 4,
    dropWeight: 15,
    description: 'Cá rô đồng vây gai khỏe khoắn ánh nâu đồng, quen thuộc dọc bờ lau sậy.',
  },
  ca_chep: {
    id: 'ca_chep',
    name: 'Cá Chép',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.6,
    maxKg: 2.8,
    basePrice: 4,
    pricePerKg: 1.3,
    dropWeight: 14,
    description: 'Thân tròn vảy vàng óng, quen thuộc dưới những tán lá sen xanh.',
  },
  ca_tre_vang: {
    id: 'ca_tre_vang',
    name: 'Cá Trê Vàng',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.45,
    maxKg: 2.1,
    basePrice: 4,
    pricePerKg: 1.6,
    dropWeight: 13,
    description: 'Thân trơn mượt ánh vàng nghệ với bộ râu dài đặc trưng vùng nước lặng.',
  },
  ca_loc: {
    id: 'ca_loc',
    name: 'Cá Lóc',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.5,
    maxKg: 2.4,
    basePrice: 5,
    pricePerKg: 1.3,
    dropWeight: 13,
    description: 'Săn mồi nhanh nhẹn ở vùng nước lặng có nhiều cỏ thủy sinh.',
  },
  ca_chinh: {
    id: 'ca_chinh',
    name: 'Cá Chình',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.7,
    maxKg: 3.0,
    basePrice: 5,
    pricePerKg: 1.4,
    dropWeight: 11,
    description: 'Thân dài trơn láng, thường ẩn mình dưới rễ cây và bờ đá.',
  },
  ca_lia_thia_3_duoi: {
    id: 'ca_lia_thia_3_duoi',
    name: 'Cá Lia Thia 3 Đuôi',
    waterType: 'river',
    rarity: 'rare',
    minKg: 0.08,
    maxKg: 0.38,
    basePrice: 10,
    pricePerKg: 12,
    dropWeight: 6.5,
    description: 'Hiếm gặp với bộ vây ba thùy thướt tha rực rỡ sắc màu.',
  },
  ca_la_han: {
    id: 'ca_la_han',
    name: 'Cá La Hán',
    waterType: 'river',
    rarity: 'rare',
    minKg: 0.5,
    maxKg: 2.2,
    basePrice: 11,
    pricePerKg: 2.8,
    dropWeight: 5.5,
    description: 'Chú cá quý mang chiếc gù tròn may mắn cùng hàng châu lấp lánh.',
  },
  ca_tai_tuong_do: {
    id: 'ca_tai_tuong_do',
    name: 'Cá Tai Tượng Đỏ',
    waterType: 'river',
    rarity: 'rare',
    minKg: 1.4,
    maxKg: 5.2,
    basePrice: 12,
    pricePerKg: 1.8,
    dropWeight: 4.5,
    description: 'Thân lớn màu ngà điểm vây cam đỏ rực rỡ, hay bơi gần ghềnh đá thác nước.',
  },
  ca_heo_nuoc_ngot: {
    id: 'ca_heo_nuoc_ngot',
    name: 'Cá Heo Nước Ngọt',
    waterType: 'river',
    rarity: 'rare',
    minKg: 1.2,
    maxKg: 4.2,
    basePrice: 13,
    pricePerKg: 2.0,
    dropWeight: 3.5,
    description: 'Loài cá sông quý hiếm có vây đỏ cam rực rỡ và sọc vằn đặc trưng.',
  },
  ca_rong_bac: {
    id: 'ca_rong_bac',
    name: 'Cá Rồng Bạc',
    waterType: 'river',
    rarity: 'rare',
    minKg: 1.8,
    maxKg: 6.5,
    basePrice: 14,
    pricePerKg: 1.8,
    dropWeight: 2.8,
    description: 'Huyền thoại sông nước với vảy bạc óng ánh cầu vồng và râu uy nghiêm.',
  },
  ca_tam_song: {
    id: 'ca_tam_song',
    name: 'Cá Tầm Sông',
    waterType: 'river',
    rarity: 'rare',
    minKg: 2.5,
    maxKg: 8.8,
    basePrice: 15,
    pricePerKg: 1.4,
    dropWeight: 2.2,
    description: 'Chú cá cổ đại mõm nhọn, hàng vây giáp sắc sảo sống nơi dòng chảy xiết.',
  },
};

/**
 * Sinh vật biển tại Đảo Mây (cao hơn cá sông ~1.5x–1.7x để thưởng cho chuyến đi đảo, cân bằng sau nông trại):
 * - Thường: 6–14 Xu
 * - Hiếm: 17–76 Xu
 */
export const SEA_FISH_CATALOG: Record<SeaFishSpeciesId, FishSpeciesDefinition> = {
  ca_he: {
    id: 'ca_he',
    name: 'Cá Hề',
    waterType: 'sea',
    rarity: 'common',
    minKg: 0.08,
    maxKg: 0.32,
    basePrice: 6,
    pricePerKg: 8,
    dropWeight: 16,
    description: 'Chú cá cam sọc trắng lanh lợi hay ẩn mình trong rạn hải quỳ ấm áp ven đảo.',
  },
  sua_bien: {
    id: 'sua_bien',
    name: 'Sứa Biển',
    waterType: 'sea',
    rarity: 'common',
    minKg: 0.25,
    maxKg: 1.4,
    basePrice: 6,
    pricePerKg: 2.4,
    dropWeight: 14,
    description: 'Chiếc dù hồng pha lê phát sáng dịu nhẹ, bồng bềnh theo nhịp sóng lam.',
  },
  sao_bien: {
    id: 'sao_bien',
    name: 'Sao Biển',
    waterType: 'sea',
    rarity: 'common',
    minKg: 0.12,
    maxKg: 0.55,
    basePrice: 6,
    pricePerKg: 5.5,
    dropWeight: 13,
    description: 'Ngôi sao năm cánh rực rỡ bám trên bãi cát nông và ghềnh san hô.',
  },
  ca_noc_gai: {
    id: 'ca_noc_gai',
    name: 'Cá Nóc Gai',
    waterType: 'sea',
    rarity: 'common',
    minKg: 0.35,
    maxKg: 1.6,
    basePrice: 7,
    pricePerKg: 2.8,
    dropWeight: 12,
    description: 'Thân tròn xoe đáng yêu, hay phồng má khi giật mình trước đầu cần.',
  },
  bach_tuoc: {
    id: 'bach_tuoc',
    name: 'Bạch Tuộc Nhỏ',
    waterType: 'sea',
    rarity: 'common',
    minKg: 0.5,
    maxKg: 2.5,
    basePrice: 8,
    pricePerKg: 2.2,
    dropWeight: 10,
    description: 'Chú bạch tuộc đỏ cam tinh nghịch với tám xúc tu mềm dẻo.',
  },
  ca_thu_xanh: {
    id: 'ca_thu_xanh',
    name: 'Cá Thu Xanh',
    waterType: 'sea',
    rarity: 'common',
    minKg: 0.9,
    maxKg: 3.6,
    basePrice: 9,
    pricePerKg: 1.6,
    dropWeight: 9,
    description: 'Bơi cực nhanh ngoài vùng biển xanh thẫm với lớp vảy ánh thép.',
  },
  ca_ngua: {
    id: 'ca_ngua',
    name: 'Cá Ngựa Vàng',
    waterType: 'sea',
    rarity: 'rare',
    minKg: 0.06,
    maxKg: 0.28,
    basePrice: 16,
    pricePerKg: 20,
    dropWeight: 6.5,
    description: 'Sinh vật biển nhỏ bé quý giá mang sắc vàng mật ong uốn đuôi mềm mại.',
  },
  tom_hum_do: {
    id: 'tom_hum_do',
    name: 'Tôm Hùm Đỏ',
    waterType: 'sea',
    rarity: 'rare',
    minKg: 0.8,
    maxKg: 3.4,
    basePrice: 17,
    pricePerKg: 3.5,
    dropWeight: 5.8,
    description: 'Càng lớn cứng cáp cùng lớp vỏ đỏ au sang trọng vùng rạn đá sâu.',
  },
  ca_duoi_dom: {
    id: 'ca_duoi_dom',
    name: 'Cá Đuối Đốm Xanh',
    waterType: 'sea',
    rarity: 'rare',
    minKg: 2.2,
    maxKg: 7.5,
    basePrice: 20,
    pricePerKg: 2.4,
    dropWeight: 4.8,
    description: 'Lướt êm ru như đôi cánh trên nền cát trắng với họa tiết đốm xanh ngọc.',
  },
  rua_bien: {
    id: 'rua_bien',
    name: 'Rùa Biển Xanh',
    waterType: 'sea',
    rarity: 'rare',
    minKg: 4.0,
    maxKg: 12.0,
    basePrice: 23,
    pricePerKg: 1.8,
    dropWeight: 3.8,
    description: 'Hiền hòa lướt sóng cùng chiếc mai ngọc bích hoa văn cổ điển.',
  },
  so_tai_tuong: {
    id: 'so_tai_tuong',
    name: 'Sò Tai Tượng Khổng Lồ',
    waterType: 'sea',
    rarity: 'rare',
    minKg: 6.0,
    maxKg: 22.0,
    basePrice: 26,
    pricePerKg: 1.4,
    dropWeight: 2.8,
    description: 'Báu vật đại dương với đôi vỏ gợn sóng khổng lồ ôm lấy lớp áo xanh lam rực.',
  },
  ca_voi_xanh: {
    id: 'ca_voi_xanh',
    name: 'Cá Voi Xanh',
    waterType: 'sea',
    rarity: 'rare',
    minKg: 14.0,
    maxKg: 42.0,
    basePrice: 36,
    pricePerKg: 1.0,
    dropWeight: 1.8,
    description: 'Chúa tể đại dương hiền lành kích cỡ phi thường, mang lại phần thưởng lớn nhất vùng biển.',
  },
};

export const RIVER_FISH_LIST: FishSpeciesDefinition[] = [
  RIVER_FISH_CATALOG.tom_cang_xanh,
  RIVER_FISH_CATALOG.ca_loc,
  RIVER_FISH_CATALOG.ca_chep,
  RIVER_FISH_CATALOG.ca_com,
  RIVER_FISH_CATALOG.ca_chinh,
  RIVER_FISH_CATALOG.ca_ro_dong,
  RIVER_FISH_CATALOG.ca_tre_vang,
  RIVER_FISH_CATALOG.ca_lia_thia_3_duoi,
  RIVER_FISH_CATALOG.ca_la_han,
  RIVER_FISH_CATALOG.ca_tai_tuong_do,
  RIVER_FISH_CATALOG.ca_heo_nuoc_ngot,
  RIVER_FISH_CATALOG.ca_rong_bac,
  RIVER_FISH_CATALOG.ca_tam_song,
];

export const SEA_FISH_LIST: FishSpeciesDefinition[] = [
  SEA_FISH_CATALOG.ca_he,
  SEA_FISH_CATALOG.sua_bien,
  SEA_FISH_CATALOG.sao_bien,
  SEA_FISH_CATALOG.ca_noc_gai,
  SEA_FISH_CATALOG.bach_tuoc,
  SEA_FISH_CATALOG.ca_thu_xanh,
  SEA_FISH_CATALOG.ca_ngua,
  SEA_FISH_CATALOG.tom_hum_do,
  SEA_FISH_CATALOG.ca_duoi_dom,
  SEA_FISH_CATALOG.rua_bien,
  SEA_FISH_CATALOG.so_tai_tuong,
  SEA_FISH_CATALOG.ca_voi_xanh,
];

export const ALL_FISH_CATALOG: Record<FishSpeciesId, FishSpeciesDefinition> = {
  ...RIVER_FISH_CATALOG,
  ...SEA_FISH_CATALOG,
};

export const ALL_FISH_LIST: FishSpeciesDefinition[] = [
  ...RIVER_FISH_LIST,
  ...SEA_FISH_LIST,
];

export function computeFishSellPrice(speciesId: FishSpeciesId, weightKg: number): number {
  const spec = ALL_FISH_CATALOG[speciesId];
  if (!spec) return 6;
  return Math.max(5, Math.round(spec.basePrice + weightKg * spec.pricePerKg));
}

function rollFromFishList(list: FishSpeciesDefinition[]): {
  species: FishSpeciesDefinition;
  weightKg: number;
  sellPrice: number;
} {
  const totalWeight = list.reduce((sum, f) => sum + f.dropWeight, 0);
  let r = Math.random() * totalWeight;
  let chosen = list[0];
  for (const fish of list) {
    r -= fish.dropWeight;
    if (r <= 0) {
      chosen = fish;
      break;
    }
  }

  // Biased slightly toward natural bell curve around mid-weight, with occasional trophy big catch
  const u = (Math.random() + Math.random()) * 0.5;
  const rawWeight = chosen.minKg + u * (chosen.maxKg - chosen.minKg);
  const weightKg = Number(rawWeight.toFixed(2));
  const sellPrice = computeFishSellPrice(chosen.id, weightKg);

  return {species: chosen, weightKg, sellPrice};
}

export function rollRandomRiverFish(): {
  species: FishSpeciesDefinition;
  weightKg: number;
  sellPrice: number;
} {
  return rollFromFishList(RIVER_FISH_LIST);
}

export function rollRandomSeaFish(): {
  species: FishSpeciesDefinition;
  weightKg: number;
  sellPrice: number;
} {
  return rollFromFishList(SEA_FISH_LIST);
}

export function createInitialFishDex(): Partial<Record<FishSpeciesId, FishDexRecord>> {
  return {};
}
