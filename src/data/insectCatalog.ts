import {
  BugNetState,
  InsectDexRecord,
  InsectHabitat,
  InsectRarity,
  InsectSpeciesDefinition,
  InsectSpeciesId,
} from '../types/game';

export const WOODEN_NET_PRICE = 100;
export const WOODEN_NET_MAX_DURABILITY = 25;
export const WOODEN_NET_FULL_REPAIR_COST = 25;

export const INSECT_HABITAT_LABELS: Record<InsectHabitat, string> = {
  flower: 'Cụm hoa',
  bush: 'Bụi rậm',
  tree: 'Thân cây',
  rock: 'Tảng đá',
  water_edge: 'Ven hồ',
};

export function createInitialBugNet(): BugNetState {
  return {
    owned: false,
    equipped: false,
    durability: WOODEN_NET_MAX_DURABILITY,
    maxDurability: WOODEN_NET_MAX_DURABILITY,
  };
}

export function getNetRepairCost(durability: number, maxDurability: number): number {
  const missing = Math.max(0, maxDurability - durability);
  if (missing <= 0) return 0;
  return Math.max(
    4,
    Math.ceil((missing / Math.max(1, maxDurability)) * WOODEN_NET_FULL_REPAIR_COST),
  );
}

/**
 * Xác suất hao mòn độ bền vợt cân bằng tương đương cần câu gỗ:
 * - Bắt trúng thường: ~36%
 * - Bắt trúng hiếm: ~52%
 * - Vung hụt: ~44%
 */
export function rollNetDurabilityLoss(
  outcome: 'catch' | 'miss',
  rarity: InsectRarity = 'common',
): number {
  const loseChance =
    outcome === 'miss' ? 0.44 : rarity === 'rare' ? 0.52 : 0.36;
  return Math.random() < loseChance ? 1 : 0;
}

export const INSECT_CATALOG: Record<InsectSpeciesId, InsectSpeciesDefinition> = {
  buom_trang: {
    id: 'buom_trang',
    name: 'Bướm Cải Trắng',
    rarity: 'common',
    habitat: 'flower',
    shapeKind: 'butterfly',
    minMm: 36,
    maxMm: 58,
    basePrice: 5,
    pricePerMm: 0.1,
    dropWeight: 18,
    primaryColor: '#3A3A40',
    accentColor: '#2E2E35',
    wingColor: '#FFFDF7',
    description: 'Đôi cánh trắng muốt điểm chấm đen thanh thoát, hay lượn quanh các khóm hoa.',
  },
  ong_mat_vang: {
    id: 'ong_mat_vang',
    name: 'Ong Mật Vàng',
    rarity: 'common',
    habitat: 'flower',
    shapeKind: 'bee',
    minMm: 13,
    maxMm: 22,
    basePrice: 6,
    pricePerMm: 0.25,
    dropWeight: 16,
    primaryColor: '#F5B82E',
    accentColor: '#3B2816',
    wingColor: '#E5F7FF',
    description: 'Chăm chỉ hút mật hoa suốt buổi sáng với đôi cánh rung tít.',
  },
  bo_rua_do: {
    id: 'bo_rua_do',
    name: 'Bọ Rùa Bảy Chấm',
    rarity: 'common',
    habitat: 'bush',
    shapeKind: 'ladybug',
    minMm: 7,
    maxMm: 14,
    basePrice: 6,
    pricePerMm: 0.35,
    dropWeight: 15,
    primaryColor: '#E84848',
    accentColor: '#252124',
    wingColor: '#F77E7E',
    description: 'Vỏ cánh đỏ rực điểm bảy chấm đen tròn xoe, hay bò trên lá bụi rậm.',
  },
  chau_chau_dong: {
    id: 'chau_chau_dong',
    name: 'Châu Chấu Đồng',
    rarity: 'common',
    habitat: 'bush',
    shapeKind: 'grasshopper',
    minMm: 28,
    maxMm: 54,
    basePrice: 5,
    pricePerMm: 0.12,
    dropWeight: 15,
    primaryColor: '#76C143',
    accentColor: '#B8DE58',
    wingColor: '#98D964',
    description: 'Đôi càng sau khỏe khoắn bật nhảy rất xa khi nghe tiếng bước chân mạnh.',
  },
  bo_xit_xanh: {
    id: 'bo_xit_xanh',
    name: 'Bọ Xít Xanh',
    rarity: 'common',
    habitat: 'bush',
    shapeKind: 'stinkbug',
    minMm: 12,
    maxMm: 21,
    basePrice: 6,
    pricePerMm: 0.22,
    dropWeight: 14,
    primaryColor: '#56A954',
    accentColor: '#C5D86D',
    wingColor: '#73C26E',
    description: 'Thân hình khiên lục giác màu lá non ẩn mình rất khéo trong lùm cây.',
  },
  chuon_chuon_ot: {
    id: 'chuon_chuon_ot',
    name: 'Chuồn Chuồn Ớt',
    rarity: 'common',
    habitat: 'water_edge',
    shapeKind: 'dragonfly',
    minMm: 35,
    maxMm: 62,
    basePrice: 6,
    pricePerMm: 0.11,
    dropWeight: 14,
    primaryColor: '#E94F37',
    accentColor: '#9E2A2B',
    wingColor: '#DCF3FF',
    description: 'Thân đỏ chói như trái ớt chín, hay đậu trên cỏ ven hồ.',
  },
  chuon_chuon_tre: {
    id: 'chuon_chuon_tre',
    name: 'Chuồn Chuồn Tre',
    rarity: 'common',
    habitat: 'water_edge',
    shapeKind: 'dragonfly',
    minMm: 46,
    maxMm: 78,
    basePrice: 6,
    pricePerMm: 0.1,
    dropWeight: 12,
    primaryColor: '#48A9A6',
    accentColor: '#E4DF82',
    wingColor: '#E8F7F6',
    description: 'Chao liệng nhẹ nhàng qua mặt nước và các bụi lau ven bờ.',
  },
  ve_sau: {
    id: 've_sau',
    name: 'Ve Sầu Mùa Hạ',
    rarity: 'common',
    habitat: 'tree',
    shapeKind: 'cicada',
    minMm: 26,
    maxMm: 45,
    basePrice: 6,
    pricePerMm: 0.15,
    dropWeight: 13,
    primaryColor: '#6D4C3D',
    accentColor: '#9D7B52',
    wingColor: '#DDF2EB',
    description: 'Bám chặt trên vỏ thân cây sồi, cất tiếng râm ran ngày nắng.',
  },
  buom_duoi_nhan: {
    id: 'buom_duoi_nhan',
    name: 'Bướm Đuôi Nhạn Vàng',
    rarity: 'common',
    habitat: 'flower',
    shapeKind: 'butterfly',
    minMm: 55,
    maxMm: 86,
    basePrice: 7,
    pricePerMm: 0.09,
    dropWeight: 11,
    primaryColor: '#2E2926',
    accentColor: '#E5583B',
    wingColor: '#FAD149',
    description: 'Cánh vàng rực viền đen có hai đuôi nhạn mềm mại rất bắt mắt.',
  },
  bo_ngua_xanh: {
    id: 'bo_ngua_xanh',
    name: 'Bọ Ngựa Xanh',
    rarity: 'common',
    habitat: 'bush',
    shapeKind: 'mantis',
    minMm: 48,
    maxMm: 82,
    basePrice: 7,
    pricePerMm: 0.09,
    dropWeight: 10,
    primaryColor: '#69B84B',
    accentColor: '#3D7A2A',
    wingColor: '#A1DB83',
    description: 'Giơ hai càng kiếm trước ngực bất động rình mồi giữa lùm hoa.',
  },
  dom_dom_dem: {
    id: 'dom_dom_dem',
    name: 'Đom Đóm Đêm',
    rarity: 'common',
    habitat: 'water_edge',
    shapeKind: 'firefly',
    minMm: 11,
    maxMm: 19,
    basePrice: 7,
    pricePerMm: 0.3,
    dropWeight: 11,
    primaryColor: '#3B3635',
    accentColor: '#F6E85F',
    wingColor: '#6E6866',
    description: 'Phát sáng dịu nhẹ vàng chanh mỗi khi chập choạng ven hồ.',
  },
  canh_cam_ngoc: {
    id: 'canh_cam_ngoc',
    name: 'Bọ Cánh Cam Ngọc',
    rarity: 'common',
    habitat: 'rock',
    shapeKind: 'beetle',
    minMm: 18,
    maxMm: 34,
    basePrice: 7,
    pricePerMm: 0.18,
    dropWeight: 11,
    primaryColor: '#1E9B77',
    accentColor: '#7BE3B6',
    wingColor: '#2EC492',
    description: 'Lớp vỏ ánh kim xanh ngọc lấp lánh dưới nắng khi phơi mình trên đá.',
  },
  buom_phuong_xanh: {
    id: 'buom_phuong_xanh',
    name: 'Bướm Phượng Xanh',
    rarity: 'rare',
    habitat: 'flower',
    shapeKind: 'butterfly',
    minMm: 72,
    maxMm: 112,
    basePrice: 15,
    pricePerMm: 0.11,
    dropWeight: 5.5,
    primaryColor: '#1D334A',
    accentColor: '#6EE7F8',
    wingColor: '#2CB3E8',
    description: 'Loài bướm quý mang sắc xanh biếc óng ánh như bầu trời Thị Trấn Mây.',
  },
  ngai_mat_trang: {
    id: 'ngai_mat_trang',
    name: 'Ngài Mặt Trăng',
    rarity: 'rare',
    habitat: 'tree',
    shapeKind: 'moth',
    minMm: 78,
    maxMm: 120,
    basePrice: 16,
    pricePerMm: 0.11,
    dropWeight: 4.5,
    primaryColor: '#8AD48B',
    accentColor: '#D67EA6',
    wingColor: '#BCEF9C',
    description: 'Đôi cánh xanh ngọc lục bảo có đốm mắt tròn và đuôi dài thanh tao.',
  },
  bo_te_giac: {
    id: 'bo_te_giac',
    name: 'Bọ Tê Giác',
    rarity: 'rare',
    habitat: 'tree',
    shapeKind: 'horned_beetle',
    minMm: 45,
    maxMm: 78,
    basePrice: 18,
    pricePerMm: 0.14,
    dropWeight: 4.2,
    primaryColor: '#5B3424',
    accentColor: '#8E5338',
    wingColor: '#482619',
    description: 'Chiếc sừng cong oai vệ trên đầu, thường bám trên những thân cây cổ thụ.',
  },
  bo_kep_kim: {
    id: 'bo_kep_kim',
    name: 'Bọ Kẹp Kìm Hoàng Kim',
    rarity: 'rare',
    habitat: 'rock',
    shapeKind: 'horned_beetle',
    minMm: 48,
    maxMm: 85,
    basePrice: 20,
    pricePerMm: 0.14,
    dropWeight: 3.4,
    primaryColor: '#8A5A1A',
    accentColor: '#E0AC3F',
    wingColor: '#6C4312',
    description: 'Đôi hàm kìm ánh đồng vàng uy nghi, rất nhạy cảm với tiếng động.',
  },
  buom_hoang_de: {
    id: 'buom_hoang_de',
    name: 'Bướm Hoàng Đế',
    rarity: 'rare',
    habitat: 'flower',
    shapeKind: 'butterfly',
    minMm: 90,
    maxMm: 136,
    basePrice: 23,
    pricePerMm: 0.1,
    dropWeight: 2.4,
    primaryColor: '#2E1E4F',
    accentColor: '#FFD166',
    wingColor: '#8E5CE8',
    description: 'Nữ hoàng sắc tím ánh kim hiếm gặp nhất vùng hoa cỏ thị trấn.',
  },
};

export const INSECT_LIST: InsectSpeciesDefinition[] = [
  INSECT_CATALOG.buom_trang,
  INSECT_CATALOG.ong_mat_vang,
  INSECT_CATALOG.bo_rua_do,
  INSECT_CATALOG.chau_chau_dong,
  INSECT_CATALOG.bo_xit_xanh,
  INSECT_CATALOG.chuon_chuon_ot,
  INSECT_CATALOG.chuon_chuon_tre,
  INSECT_CATALOG.ve_sau,
  INSECT_CATALOG.buom_duoi_nhan,
  INSECT_CATALOG.bo_ngua_xanh,
  INSECT_CATALOG.dom_dom_dem,
  INSECT_CATALOG.canh_cam_ngoc,
  INSECT_CATALOG.buom_phuong_xanh,
  INSECT_CATALOG.ngai_mat_trang,
  INSECT_CATALOG.bo_te_giac,
  INSECT_CATALOG.bo_kep_kim,
  INSECT_CATALOG.buom_hoang_de,
];

export function computeInsectSellPrice(speciesId: InsectSpeciesId, lengthMm: number): number {
  const spec = INSECT_CATALOG[speciesId];
  if (!spec) return 5;
  return Math.max(5, Math.round(spec.basePrice + lengthMm * spec.pricePerMm));
}

export function rollInsectLengthMm(species: InsectSpeciesDefinition): number {
  const u = (Math.random() + Math.random()) * 0.5;
  return Math.round(species.minMm + u * (species.maxMm - species.minMm));
}

export function pickRandomInsectSpecies(habitat?: InsectHabitat): InsectSpeciesDefinition {
  const pool = habitat
    ? INSECT_LIST.filter((s) => s.habitat === habitat)
    : INSECT_LIST;
  const list = pool.length > 0 ? pool : INSECT_LIST;
  const totalWeight = list.reduce((sum, s) => sum + s.dropWeight, 0);
  let r = Math.random() * totalWeight;
  for (const s of list) {
    r -= s.dropWeight;
    if (r <= 0) return s;
  }
  return list[0];
}

export function createInitialInsectDex(): Partial<Record<InsectSpeciesId, InsectDexRecord>> {
  return {};
}
