import {
  FishDexRecord,
  FishRarity,
  FishSpeciesDefinition,
  FishingRodState,
  RiverFishSpeciesId,
  ToolId,
} from '../types/game';

export const WOODEN_ROD_PRICE = 100;
export const WOODEN_ROD_MAX_DURABILITY = 25;
export const WOODEN_ROD_FULL_REPAIR_COST = 25;

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
    4,
    Math.ceil((missing / Math.max(1, maxDurability)) * WOODEN_ROD_FULL_REPAIR_COST),
  );
}

/**
 * Probabilistic durability loss so rods don't break every exact 25 casts/catches.
 * Catching common fish ~38% chance, rare fish ~55% chance, fish escaping ~62% chance.
 */
export function rollRodDurabilityLoss(
  outcome: 'catch' | 'escape',
  rarity: FishRarity = 'common',
): number {
  const loseChance =
    outcome === 'escape' ? 0.62 : rarity === 'rare' ? 0.55 : 0.38;
  return Math.random() < loseChance ? 1 : 0;
}

/**
 * Cá sông:
 * - Cá thường: Tôm càng xanh, Cá lóc, Cá chép, Cá cơm, Cá chình (~84% tổng tỷ lệ)
 * - Cá hiếm: Cá la hán, Cá lia thia 3 đuôi, Cá heo nước ngọt (~16% tổng tỷ lệ)
 * Giá được cân bằng theo trọng lượng & độ hiếm (trung bình ~12.1 Xu thô, trừ ~1 Xu khấu hao sửa cần)
 * giúp câu cá vui và có lời nhưng không gây lạm phát hay thay thế kinh tế Nông Trại & Bếp.
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
    pricePerKg: 12,
    dropWeight: 20,
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
    pricePerKg: 8,
    dropWeight: 18,
    description: 'Đôi càng xanh ngọc khỏe khoắn, rất chuộng vùng bùn cát đáy sông.',
  },
  ca_chep: {
    id: 'ca_chep',
    name: 'Cá Chép',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.6,
    maxKg: 2.8,
    basePrice: 5,
    pricePerKg: 2.5,
    dropWeight: 17,
    description: 'Thân tròn vảy vàng óng, quen thuộc dưới những tán lá sen xanh.',
  },
  ca_loc: {
    id: 'ca_loc',
    name: 'Cá Lóc',
    waterType: 'river',
    rarity: 'common',
    minKg: 0.5,
    maxKg: 2.4,
    basePrice: 6,
    pricePerKg: 2.8,
    dropWeight: 15,
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
    pricePerKg: 3.0,
    dropWeight: 14,
    description: 'Thân dài trơn láng, thường ẩn mình dưới rễ cây và bờ đá.',
  },
  ca_lia_thia_3_duoi: {
    id: 'ca_lia_thia_3_duoi',
    name: 'Cá Lia Thia 3 Đuôi',
    waterType: 'river',
    rarity: 'rare',
    minKg: 0.08,
    maxKg: 0.38,
    basePrice: 15,
    pricePerKg: 26,
    dropWeight: 7,
    description: 'Hiếm gặp với bộ vây ba thùy thướt tha rực rỡ sắc màu.',
  },
  ca_la_han: {
    id: 'ca_la_han',
    name: 'Cá La Hán',
    waterType: 'river',
    rarity: 'rare',
    minKg: 0.5,
    maxKg: 2.2,
    basePrice: 18,
    pricePerKg: 6.5,
    dropWeight: 5.5,
    description: 'Chú cá quý mang chiếc gù tròn may mắn cùng hàng châu lấp lánh.',
  },
  ca_heo_nuoc_ngot: {
    id: 'ca_heo_nuoc_ngot',
    name: 'Cá Heo Nước Ngọt',
    waterType: 'river',
    rarity: 'rare',
    minKg: 1.2,
    maxKg: 4.2,
    basePrice: 22,
    pricePerKg: 5.5,
    dropWeight: 3.5,
    description: 'Loài cá sông quý hiếm có vây đỏ cam rực rỡ và sọc vằn đặc trưng.',
  },
};

export const RIVER_FISH_LIST: FishSpeciesDefinition[] = [
  RIVER_FISH_CATALOG.tom_cang_xanh,
  RIVER_FISH_CATALOG.ca_loc,
  RIVER_FISH_CATALOG.ca_chep,
  RIVER_FISH_CATALOG.ca_com,
  RIVER_FISH_CATALOG.ca_chinh,
  RIVER_FISH_CATALOG.ca_lia_thia_3_duoi,
  RIVER_FISH_CATALOG.ca_la_han,
  RIVER_FISH_CATALOG.ca_heo_nuoc_ngot,
];

export function computeFishSellPrice(speciesId: RiverFishSpeciesId, weightKg: number): number {
  const spec = RIVER_FISH_CATALOG[speciesId];
  if (!spec) return 5;
  return Math.max(4, Math.round(spec.basePrice + weightKg * spec.pricePerKg));
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
