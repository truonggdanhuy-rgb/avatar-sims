import {
  FishDexRecord,
  FishRarity,
  FishSpeciesDefinition,
  FishingRodState,
  RiverFishSpeciesId,
  ToolId,
  WoodenBoatState,
} from '../types/game';

export const WOODEN_ROD_PRICE = 75;
export const WOODEN_ROD_MAX_DURABILITY = 25;
export const WOODEN_ROD_FULL_REPAIR_COST = 22;
export const WOODEN_BOAT_PRICE = 220;

export function createInitialWoodenBoat(): WoodenBoatState {
  return {
    owned: false,
    purchasedAt: null,
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
 * Structured by rarity tier so future tiers (e.g. super_rare) plug in directly.
 */
export const FISH_RARITY_CONFIG: Record<FishRarity, FishRarityBehavior> = {
  common: {
    label: 'Cá thường',
    shadowScale: 0.68,
    biteWindowMs: 1450,
    nibbleMin: 1,
    nibbleMax: 4,
  },
  rare: {
    label: 'Cá hiếm',
    shadowScale: 1.24,
    biteWindowMs: 860,
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
 * Catching common fish ~42% chance, rare fish ~58% chance, fish escaping ~65% chance.
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
 * Cá sông (cân bằng ấm cúng cho gia đình):
 * - Cá thường: giá bán 5-12 Xu sau cân nặng
 * - Cá hiếm: giá bán 16-32 Xu
 */
export const RIVER_FISH_CATALOG: Record<RiverFishSpeciesId, FishSpeciesDefinition> = {
  ca_com: {
    id: 'ca_com',
    name: 'Cá Cơm',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.05,
    maxKg: 0.25,
    basePrice: 4,
    pricePerKg: 8,
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
    basePrice: 5,
    pricePerKg: 6,
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
    basePrice: 5,
    pricePerKg: 5.5,
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
    basePrice: 5,
    pricePerKg: 1.8,
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
    basePrice: 6,
    pricePerKg: 2.2,
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
    basePrice: 6,
    pricePerKg: 1.9,
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
    basePrice: 7,
    pricePerKg: 2.0,
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
    basePrice: 14,
    pricePerKg: 18,
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
    basePrice: 15,
    pricePerKg: 4.0,
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
    basePrice: 16,
    pricePerKg: 2.6,
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
    basePrice: 18,
    pricePerKg: 2.8,
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
    basePrice: 20,
    pricePerKg: 2.6,
    dropWeight: 2.8,
    description: 'Huyền thoại sông nước với vảy bạc óng ánh ánh cầu vồng và râu uy nghiêm.',
  },
  ca_tam_song: {
    id: 'ca_tam_song',
    name: 'Cá Tầm Sông',
    waterType: 'river',
    rarity: 'rare',
    minKg: 2.5,
    maxKg: 8.8,
    basePrice: 22,
    pricePerKg: 2.2,
    dropWeight: 2.2,
    description: 'Chú cá cổ đại mõm nhọn, hàng vây giáp sắc sảo sống nơi dòng chảy xiết.',
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

export function computeFishSellPrice(speciesId: RiverFishSpeciesId, weightKg: number): number {
  const spec = RIVER_FISH_CATALOG[speciesId];
  if (!spec) return 6;
  return Math.max(5, Math.round(spec.basePrice + weightKg * spec.pricePerKg));
}

export function rollRandomRiverFish(): {
  species: FishSpeciesDefinition;
  weightKg: number;
  sellPrice: number;
} {
  const totalWeight = RIVER_FISH_LIST.reduce((sum, f) => sum + f.dropWeight, 0);
  let r = Math.random() * totalWeight;
  let chosen = RIVER_FISH_LIST[0];
  for (const fish of RIVER_FISH_LIST) {
    r -= fish.dropWeight;
    if (r <= 0) {
      chosen = fish;
      break;
    }
  }

  // Biased slightly toward natural bell curve around mid-weight, with occasional trophy big fish
  const u = (Math.random() + Math.random()) * 0.5;
  const rawWeight = chosen.minKg + u * (chosen.maxKg - chosen.minKg);
  const weightKg = Number(rawWeight.toFixed(2));
  const sellPrice = computeFishSellPrice(chosen.id, weightKg);

  return {species: chosen, weightKg, sellPrice};
}

export function createInitialFishDex(): Partial<Record<RiverFishSpeciesId, FishDexRecord>> {
  return {};
}
