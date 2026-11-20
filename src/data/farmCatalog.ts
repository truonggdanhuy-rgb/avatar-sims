import {
  AnimalProduceId,
  AnimalType,
  CoopKind,
  CoopTroughs,
  CropType,
  FarmInventory,
  FarmItemKind,
  FarmOrder,
  FarmOrderRequirement,
  FarmSupplies,
  GardenPlotState,
  KitchenLevel,
  LivestockAnimalState,
  PlotLevel,
  PondFishSpecies,
  PondFishState,
  ProcessedId,
  RecipeId,
} from '../types/game';

export interface CropDefinition {
  id: CropType;
  name: string;
  seedPrice: number;
  growSeconds: number;
  rawSellPrice: number;
  color: string;
  accentColor: string;
  hint: string;
}

export const CROPS: Record<CropType, CropDefinition> = {
  wheat: {
    id: 'wheat',
    name: 'Lúa Mì',
    seedPrice: 6,
    growSeconds: 180, // 3 phút (min)
    rawSellPrice: 4, // 2 cây = 8 Xu (+2 Xu)
    color: '#E7B94B',
    accentColor: '#76A64E',
    hint: '3 phút · Xay Bột Mì hoặc nấu Cháo & Bánh',
  },
  scallion: {
    id: 'scallion',
    name: 'Hành Ngò',
    seedPrice: 6,
    growSeconds: 240, // 4 phút
    rawSellPrice: 4, // 2 cây = 8 Xu (+2 Xu)
    color: '#63B552',
    accentColor: '#F4F7EE',
    hint: '4 phút · Gia vị nấu Phở Thịt Lợn & món mặn',
  },
  rice: {
    id: 'rice',
    name: 'Lúa Gạo',
    seedPrice: 7,
    growSeconds: 300, // 5 phút
    rawSellPrice: 5, // 2 cây = 10 Xu (+3 Xu)
    color: '#D9C262',
    accentColor: '#67A34F',
    hint: '5 phút · Xay làm Bánh Phở nấu Phở Thịt Lợn',
  },
  carrot: {
    id: 'carrot',
    name: 'Cà Rốt',
    seedPrice: 8,
    growSeconds: 360, // 6 phút
    rawSellPrice: 6, // 2 cây = 12 Xu (+4 Xu)
    color: '#EF8432',
    accentColor: '#4E9A4E',
    hint: '6 phút · Nấu Súp Cà Rốt & Cà Rốt Sốt Mía',
  },
  corn: {
    id: 'corn',
    name: 'Ngô Ngọt',
    seedPrice: 10,
    growSeconds: 720, // 12 phút
    rawSellPrice: 8, // 2 cây = 16 Xu (+6 Xu)
    color: '#F2C94C',
    accentColor: '#5BA355',
    hint: '12 phút · Nấu Sữa Bắp & Thịt Heo Áp Chảo',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Dâu Tây',
    seedPrice: 14,
    growSeconds: 1200, // 20 phút
    rawSellPrice: 11, // 2 cây = 22 Xu (+8 Xu)
    color: '#E54E63',
    accentColor: '#4E9A4E',
    hint: '20 phút · Cô Mứt Dâu, Trà Dâu & Panna Cotta',
  },
  tomato: {
    id: 'tomato',
    name: 'Cà Chua',
    seedPrice: 18,
    growSeconds: 1800, // 30 phút
    rawSellPrice: 14, // 2 cây = 28 Xu (+10 Xu)
    color: '#DF483B',
    accentColor: '#4C924B',
    hint: '30 phút · Nấu Súp, Mì Ý & Trứng Chiên Phô Mai',
  },
  vanilla: {
    id: 'vanilla',
    name: 'Quả Vani',
    seedPrice: 24,
    growSeconds: 2400, // 40 phút
    rawSellPrice: 19, // 2 cây = 38 Xu (+14 Xu)
    color: '#6C4936',
    accentColor: '#F5E4A4',
    hint: '40 phút · Hương liệu làm Panna Cotta Dâu thơm béo',
  },
  lemon: {
    id: 'lemon',
    name: 'Chanh Vàng',
    seedPrice: 22,
    growSeconds: 2700, // 45 phút
    rawSellPrice: 17, // 2 cây = 34 Xu (+12 Xu)
    color: '#F7D44C',
    accentColor: '#569D4F',
    hint: '45 phút · Pha Trà Chanh & Bánh Tart Trứng',
  },
  sugarcane: {
    id: 'sugarcane',
    name: 'Mía Ngọt',
    seedPrice: 26,
    growSeconds: 3600, // 1 giờ
    rawSellPrice: 20, // 2 cây = 40 Xu (+14 Xu)
    color: '#76B856',
    accentColor: '#D6CC74',
    hint: '1 giờ · Ép Đường Nâu, Siro Mía & Nước Mía',
  },
  watermelon: {
    id: 'watermelon',
    name: 'Dưa Hấu',
    seedPrice: 34,
    growSeconds: 5400, // 1.5 giờ
    rawSellPrice: 26, // 2 cây = 52 Xu (+18 Xu)
    color: '#469C53',
    accentColor: '#EE5D6C',
    hint: '1.5 giờ · Ép Nước Dưa Hấu giá cao',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Bí Ngô',
    seedPrice: 42,
    growSeconds: 7200, // 2 giờ
    rawSellPrice: 33, // 2 cây = 66 Xu (+24 Xu)
    color: '#E57925',
    accentColor: '#4C8444',
    hint: '2 giờ · Làm Bánh Bí Ngô & Sinh Tố Bí Đỏ',
  },
  cacao: {
    id: 'cacao',
    name: 'Ca Cao',
    seedPrice: 55,
    growSeconds: 14400, // 4 giờ
    rawSellPrice: 46, // 2 cây = 92 Xu (+37 Xu)
    color: '#A5633C',
    accentColor: '#66A34F',
    hint: '4 giờ · Xay Bột Ca Cao pha Ca Cao Nóng & Brownie',
  },
  coffee: {
    id: 'coffee',
    name: 'Cà Phê',
    seedPrice: 60,
    growSeconds: 21600, // 6 giờ (qua đêm)
    rawSellPrice: 52, // 2 cây = 104 Xu (+44 Xu)
    color: '#7C4D34',
    accentColor: '#C83E4D',
    hint: '6 giờ (qua đêm) · Rang Xay pha Cà Phê Sữa siêu lời',
  },
};

export const CROP_LIST: CropDefinition[] = [
  CROPS.wheat,
  CROPS.scallion,
  CROPS.rice,
  CROPS.carrot,
  CROPS.corn,
  CROPS.strawberry,
  CROPS.tomato,
  CROPS.vanilla,
  CROPS.lemon,
  CROPS.sugarcane,
  CROPS.watermelon,
  CROPS.pumpkin,
  CROPS.cacao,
  CROPS.coffee,
];

export interface PlotLevelInfo {
  level: PlotLevel;
  name: string;
  speedMultiplier: number;
  pestChance: number;
  upgradeCostToNext: number | null;
  frameColor: string;
  description: string;
}

export const PLOT_LEVELS: Record<PlotLevel, PlotLevelInfo> = {
  1: {
    level: 1,
    name: 'Đất Thường (Lv.1)',
    speedMultiplier: 1.0,
    pestChance: 0.25,
    upgradeCostToNext: 1150,
    frameColor: '#8D6240',
    description: 'Tỉ lệ sâu 25% · Tốc độ trồng chuẩn',
  },
  2: {
    level: 2,
    name: 'Đất Phù Sa (Lv.2)',
    speedMultiplier: 0.9,
    pestChance: 0.18,
    upgradeCostToNext: 2800,
    frameColor: '#8D6240',
    description: 'Giảm sâu còn 18% · Trồng nhanh hơn 10%',
  },
  3: {
    level: 3,
    name: 'Đất Dinh Dưỡng (Lv.3)',
    speedMultiplier: 0.78,
    pestChance: 0.1,
    upgradeCostToNext: null,
    frameColor: '#8D6240',
    description: 'Giảm sâu còn 10% · Trồng nhanh hơn 22%',
  },
};

// === CHĂN NUÔI 2 CHUỒNG RIÊNG: GIA CẦM (GÀ, VỊT) & GIA SÚC (LỢN, BÒ SỮA) ===
export const MAX_COOP_ANIMALS: Record<CoopKind, number> = {
  poultry: 8,
  cattle: 6,
};

export const POULTRY_GROW_MS = 2 * 3600 * 1000; // 2 giờ con non -> lớn
export const POULTRY_ACTIVE_MS = 72 * 3600 * 1000; // 3 ngày cho sản phẩm
export const CATTLE_GROW_MS = 4 * 3600 * 1000; // 4 giờ con non -> lớn
export const CATTLE_ACTIVE_MS = 96 * 3600 * 1000; // 4 ngày cho sản phẩm

export interface AnimalProduceDefinition {
  id: AnimalProduceId;
  name: string;
  sellPrice: number;
  color: string;
}

export const ANIMAL_PRODUCTS: Record<AnimalProduceId, AnimalProduceDefinition> = {
  chicken_egg: {
    id: 'chicken_egg',
    name: 'Trứng Gà',
    sellPrice: 10,
    color: '#F5DFB0',
  },
  duck_egg: {
    id: 'duck_egg',
    name: 'Trứng Vịt',
    sellPrice: 14,
    color: '#DDF2EB',
  },
  pork: {
    id: 'pork',
    name: 'Thịt Lợn',
    sellPrice: 24,
    color: '#EB8F8F',
  },
  milk: {
    id: 'milk',
    name: 'Sữa Tươi',
    sellPrice: 32,
    color: '#F7F9FC',
  },
};

export interface AnimalDefinition {
  type: AnimalType;
  coop: CoopKind;
  name: string;
  buyPrice: number;
  adultSellPrice: number; // Bán lúc lớn / hết đẻ vẫn lời hơn mua!
  growHours: 2 | 4;
  activeDays: 3 | 4;
  produceSeconds: number;
  produceId: AnimalProduceId;
  color: string;
  description: string;
}

export const ANIMALS: Record<AnimalType, AnimalDefinition> = {
  chicken: {
    type: 'chicken',
    coop: 'poultry',
    name: 'Gà',
    buyPrice: 40,
    adultSellPrice: 55, // Lời +15 Xu khi bán lúc lớn
    growHours: 2,
    activeDays: 3,
    produceSeconds: 1800, // 30 phút/lứa (2 Trứng Gà) — đủ nấu ăn, tránh dư thừa lạm phát
    produceId: 'chicken_egg',
    color: '#FFF4DC',
    description: '2h lớn · Đẻ 2 Trứng Gà/30p trong 3 ngày · Bán lúc lớn 55 Xu',
  },
  duck: {
    type: 'duck',
    coop: 'poultry',
    name: 'Vịt',
    buyPrice: 55,
    adultSellPrice: 75, // Lời +20 Xu khi bán lúc lớn
    growHours: 2,
    activeDays: 3,
    produceSeconds: 2400, // 40 phút/lứa (2 Trứng Vịt)
    produceId: 'duck_egg',
    color: '#EAEFEF',
    description: '2h lớn · Đẻ 2 Trứng Vịt/40p trong 3 ngày · Bán lúc lớn 75 Xu',
  },
  pig: {
    type: 'pig',
    coop: 'cattle',
    name: 'Lợn',
    buyPrice: 90,
    adultSellPrice: 125, // Lời +35 Xu khi bán lúc lớn
    growHours: 4,
    activeDays: 4,
    produceSeconds: 2700, // 45 phút/lứa (2 Thịt Lợn) — vừa vặn cho Phở, Cháo & Áp chảo
    produceId: 'pork',
    color: '#F7A8B8',
    description: '4h lớn · Thu 2 Thịt Lợn/45p trong 4 ngày · Bán lúc lớn 125 Xu',
  },
  cow: {
    type: 'cow',
    coop: 'cattle',
    name: 'Bò Sữa',
    buyPrice: 140,
    adultSellPrice: 195, // Lời +55 Xu khi bán lúc lớn
    growHours: 4,
    activeDays: 4,
    produceSeconds: 3600, // 60 phút/lứa (2 Sữa Tươi) — cân bằng Kem, Phô Mai & Panna Cotta
    produceId: 'milk',
    color: '#5B4639',
    description: '4h lớn · Vắt 2 Sữa Tươi/60p trong 4 ngày · Bán lúc lớn 195 Xu',
  },
};

export const ANIMAL_LIST: AnimalDefinition[] = [
  ANIMALS.chicken,
  ANIMALS.duck,
  ANIMALS.pig,
  ANIMALS.cow,
];

// === HỒ THỦY SINH (CÁ 12H · VỊT VÀNG 1 NGÀY · RÙA 2 NGÀY) ===
export const MAX_POND_FISH = 8;

export interface FishSpeciesDefinition {
  species: PondFishSpecies;
  name: string;
  durationHours: 12 | 24 | 48;
  fryPrice: number;
  matureSellPrice: number;
  bodyColor: string;
  accentColor: string;
  description: string;
}

export const POND_FISH_SPECIES: Record<PondFishSpecies, FishSpeciesDefinition> = {
  fish_12h: {
    species: 'fish_12h',
    name: 'Cá Chép Vàng',
    durationHours: 12,
    fryPrice: 45,
    matureSellPrice: 95,
    bodyColor: '#F39C3D',
    accentColor: '#FFE194',
    description: 'Lớn sau 12 giờ · Bơi khỏe, bán thu 95 Xu (lời +50 Xu)',
  },
  duck_24h: {
    species: 'duck_24h',
    name: 'Vịt Vàng',
    durationHours: 24,
    fryPrice: 85,
    matureSellPrice: 195,
    bodyColor: '#F7CF46',
    accentColor: '#F28B30',
    description: 'Xuất bán sau 1 ngày (24h) · Thu 195 Xu (lời +110 Xu)',
  },
  turtle_48h: {
    species: 'turtle_48h',
    name: 'Rùa Xanh',
    durationHours: 48,
    fryPrice: 150,
    matureSellPrice: 375,
    bodyColor: '#4E8C57',
    accentColor: '#85BD78',
    description: 'Xuất bán sau 2 ngày (48h) · Lời cao nhất 375 Xu (+225 Xu)',
  },
};

export const POND_FISH_LIST: FishSpeciesDefinition[] = [
  POND_FISH_SPECIES.fish_12h,
  POND_FISH_SPECIES.duck_24h,
  POND_FISH_SPECIES.turtle_48h,
];

export const SUPPLY_PRICES = {
  bugSpray: 2, // 2 Xu / xịt 1 cây
  animalFeed: 2, // 2 Xu / túi thức ăn vật nuôi
  animalMedicine: 6, // 6 Xu / liều chữa bệnh thú
  fishFeed: 5, // 5 Xu / túi thức ăn thủy sinh (3-4 con ăn / 1 túi)
  fishMedicine: 10, // 10 Xu / liều thuốc thủy sinh
};

export interface FarmIngredientCost {
  kind: 'crop' | 'animal_product' | 'processed';
  id: CropType | AnimalProduceId | ProcessedId;
  qty: number;
}

export const MILL_SLOTS = 4;

export interface ProcessedDefinition {
  id: ProcessedId;
  name: string;
  machineName: string;
  inputs: FarmIngredientCost[];
  processSeconds: number; // Thời gian xay/ép nhanh (12s–24s), đứng chờ thoải mái
  sellPrice: number; // Giá thống nhất khi bán lẻ & giao đơn
  color: string;
  description: string;
}

export const PROCESSED_ITEMS: Record<ProcessedId, ProcessedDefinition> = {
  flour: {
    id: 'flour',
    name: 'Bột Mì Mịn',
    machineName: 'Cối Xay Bột',
    inputs: [{kind: 'crop', id: 'wheat', qty: 1}],
    processSeconds: 12,
    sellPrice: 7, // > Lúa Mì (4)
    color: '#F5EAD5',
    description: 'Xay từ Lúa Mì để làm Bánh Mì, Bánh Tart & Mì Ý',
  },
  rice_noodle: {
    id: 'rice_noodle',
    name: 'Bánh Phở Tươi',
    machineName: 'Cối Xay Bột',
    inputs: [{kind: 'crop', id: 'rice', qty: 2}],
    processSeconds: 15,
    sellPrice: 15, // > 2 Lúa Gạo (10)
    color: '#FAF6EE',
    description: 'Xay từ Lúa Gạo làm sợi Phở Thịt Lợn dai mềm',
  },
  brown_sugar: {
    id: 'brown_sugar',
    name: 'Đường Nâu Mía',
    machineName: 'Máy Ép Mía',
    inputs: [{kind: 'crop', id: 'sugarcane', qty: 1}],
    processSeconds: 14,
    sellPrice: 28, // > Mía (20)
    color: '#B67742',
    description: 'Vị ngọt thanh cho trà, cà phê, bánh & nước mía',
  },
  cane_syrup: {
    id: 'cane_syrup',
    name: 'Siro Mía Vàng',
    machineName: 'Máy Ép Mía',
    inputs: [{kind: 'crop', id: 'sugarcane', qty: 2}],
    processSeconds: 18,
    sellPrice: 56, // > 2 Mía (40)
    color: '#DF9B35',
    description: 'Siro cô đặc dùng pha Trà Dâu, Bánh Flan & Cà Rốt Mật',
  },
  berry_jam: {
    id: 'berry_jam',
    name: 'Mứt Dâu Tây',
    machineName: 'Nồi Cô Mứt',
    inputs: [
      {kind: 'crop', id: 'strawberry', qty: 2},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    processSeconds: 22,
    sellPrice: 68, // > 22 + 28 = 50
    color: '#CF465D',
    description: 'Mứt dâu thơm lừng cho Bánh Kem & Cheesecake',
  },
  cacao_powder: {
    id: 'cacao_powder',
    name: 'Bột Ca Cao Nguyên Chất',
    machineName: 'Cối Xay Ca Cao',
    inputs: [{kind: 'crop', id: 'cacao', qty: 2}],
    processSeconds: 24,
    sellPrice: 125, // > 2 Ca Cao (92)
    color: '#73442E',
    description: 'Nền cho Ca Cao Sữa Nóng & Bánh Brownie',
  },
  roasted_coffee: {
    id: 'roasted_coffee',
    name: 'Cà Phê Rang Xay',
    machineName: 'Cối Xay Rang',
    inputs: [{kind: 'crop', id: 'coffee', qty: 2}],
    processSeconds: 24,
    sellPrice: 140, // > 2 Cà Phê (104)
    color: '#5C3522',
    description: 'Hương cà phê rang đậm pha Cà Phê Sữa Nông Trại',
  },
  cheese: {
    id: 'cheese',
    name: 'Phô Mai Tươi',
    machineName: 'Máy Ủ Sữa',
    inputs: [{kind: 'animal_product', id: 'milk', qty: 1}],
    processSeconds: 18,
    sellPrice: 46, // > Sữa Tươi (32)
    color: '#FAD866',
    description: 'Ủ từ Sữa Tươi để làm Bánh Cheesecake & Trứng Chiên',
  },
  fresh_cream: {
    id: 'fresh_cream',
    name: 'Kem Sữa Tươi',
    machineName: 'Máy Đánh Kem',
    inputs: [
      {kind: 'animal_product', id: 'milk', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    processSeconds: 20,
    sellPrice: 74, // > 32 + 28 = 60
    color: '#FFFDF7',
    description: 'Kem sữa đánh bông mịn để làm Panna Cotta Dâu',
  },
};

export const PROCESSED_LIST: ProcessedDefinition[] = [
  PROCESSED_ITEMS.flour,
  PROCESSED_ITEMS.rice_noodle,
  PROCESSED_ITEMS.brown_sugar,
  PROCESSED_ITEMS.cane_syrup,
  PROCESSED_ITEMS.berry_jam,
  PROCESSED_ITEMS.cacao_powder,
  PROCESSED_ITEMS.roasted_coffee,
  PROCESSED_ITEMS.cheese,
  PROCESSED_ITEMS.fresh_cream,
];

export interface KitchenLevelInfo {
  level: KitchenLevel;
  name: string;
  speedMultiplier: number;
  slots: number;
  upgradeCostToNext: number | null;
  description: string;
}

export const KITCHEN_LEVELS: Record<KitchenLevel, KitchenLevelInfo> = {
  1: {
    level: 1,
    name: 'Bếp Nông Trại (Lv.1)',
    speedMultiplier: 1.0,
    slots: 5,
    upgradeCostToNext: 750,
    description: 'Tốc độ chuẩn · 5 ô nấu cùng lúc',
  },
  2: {
    level: 2,
    name: 'Bếp Gạch Đỏ (Lv.2)',
    speedMultiplier: 0.85,
    slots: 7,
    upgradeCostToNext: 1950,
    description: 'Giảm 15% thời gian · 7 ô nấu cùng lúc',
  },
  3: {
    level: 3,
    name: 'Bếp Hoàng Gia (Lv.3)',
    speedMultiplier: 0.7,
    slots: 10,
    upgradeCostToNext: null,
    description: 'Giảm 30% thời gian · 10 ô nấu (Tối đa)',
  },
};

export type DishCategory = 'drink' | 'bakery' | 'meal';

export interface RecipeDefinition {
  id: RecipeId;
  name: string;
  category: DishCategory;
  categoryLabel: string;
  inputs: FarmIngredientCost[];
  cookSeconds: number; // Tối thiểu 20 phút (1200s), tối đa 1 giờ (3600s)
  sellPrice: number; // Giá thống nhất, luôn lời rõ rệt so với bán thô nguyên liệu
  color: string;
  description: string;
}

export const KITCHEN_RECIPES: Record<RecipeId, RecipeDefinition> = {
  sugarcane_juice: {
    id: 'sugarcane_juice',
    name: 'Nước Mía Tắc Mát',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'sugarcane', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 1200, // 20 phút
    sellPrice: 65, // Nguyên liệu: 20 + 28 = 48 -> lời +17 Xu
    color: '#93CE66',
    description: 'Ly nước mía thơm mát giải nhiệt thị trấn',
  },
  watermelon_juice: {
    id: 'watermelon_juice',
    name: 'Nước Ép Dưa Hấu',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'watermelon', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 1500, // 25 phút
    sellPrice: 74, // 26 + 28 = 54
    color: '#F26474',
    description: 'Nước ép dưa hấu đỏ mát lạnh giải khát ngày nắng',
  },
  strawberry_tea: {
    id: 'strawberry_tea',
    name: 'Trà Dâu Siro Mía',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'strawberry', qty: 2},
      {kind: 'processed', id: 'cane_syrup', qty: 1},
    ],
    cookSeconds: 2100, // 35 phút
    sellPrice: 105, // 22 + 56 = 78
    color: '#EB6D83',
    description: 'Trà trái cây thanh ngọt kèm dâu tươi',
  },
  honey_lemonade: {
    id: 'honey_lemonade',
    name: 'Trà Chanh Siro Mía',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'lemon', qty: 2},
      {kind: 'processed', id: 'cane_syrup', qty: 1},
    ],
    cookSeconds: 2100, // 35 phút
    sellPrice: 120, // 34 + 56 = 90
    color: '#F6D55C',
    description: 'Vị chanh vàng tươi quyện siro mía thơm dịu',
  },
  pumpkin_smoothie: {
    id: 'pumpkin_smoothie',
    name: 'Sinh Tố Bí Đỏ Kem',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'pumpkin', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 1800, // 30 phút
    sellPrice: 84, // 33 + 28 = 61
    color: '#F29A3E',
    description: 'Thức uống béo mịn giàu dinh dưỡng',
  },
  corn_milk: {
    id: 'corn_milk',
    name: 'Sữa Bắp Béo Thơm',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'corn', qty: 2},
      {kind: 'animal_product', id: 'milk', qty: 1},
    ],
    cookSeconds: 1680, // 28 phút
    sellPrice: 72, // 16 + 36 = 52
    color: '#F5D66B',
    description: 'Kết hợp Ngô Ngọt & Sữa Tươi cực hút khách',
  },
  hot_cacao: {
    id: 'hot_cacao',
    name: 'Ca Cao Sữa Nóng',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'processed', id: 'cacao_powder', qty: 1},
      {kind: 'animal_product', id: 'milk', qty: 1},
    ],
    cookSeconds: 3300, // 55 phút
    sellPrice: 215, // 125 + 36 = 161
    color: '#7F4D37',
    description: 'Tách ca cao sữa ấm áp thơm lừng buổi sáng',
  },
  milk_coffee: {
    id: 'milk_coffee',
    name: 'Cà Phê Sữa Nông Trại',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'processed', id: 'roasted_coffee', qty: 1},
      {kind: 'animal_product', id: 'milk', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 3600, // 1 giờ (món cầu kỳ giá cao)
    sellPrice: 275, // 140 + 36 + 28 = 204
    color: '#8C583A',
    description: 'Đặc sản trứ danh từ Cà Phê Rang & Sữa Tươi',
  },
  butter_bread: {
    id: 'butter_bread',
    name: 'Bánh Mì Đường Nâu',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'flour', qty: 2},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 1320, // 22 phút
    sellPrice: 58, // 14 + 28 = 42
    color: '#DF9B56',
    description: 'Ổ bánh mì nướng giòn thơm mùi đường mía',
  },
  egg_tart: {
    id: 'egg_tart',
    name: 'Bánh Tart Trứng Chanh',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'flour', qty: 1},
      {kind: 'animal_product', id: 'chicken_egg', qty: 2},
      {kind: 'crop', id: 'lemon', qty: 1},
    ],
    cookSeconds: 1800, // 30 phút
    sellPrice: 68, // 7 + 24 + 17 = 48
    color: '#F7C95B',
    description: 'Tart trứng gà béo ngậy thoảng hương chanh vàng',
  },
  pumpkin_pie: {
    id: 'pumpkin_pie',
    name: 'Bánh Bí Ngô Nướng',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'flour', qty: 2},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
      {kind: 'crop', id: 'pumpkin', qty: 1},
    ],
    cookSeconds: 2400, // 40 phút
    sellPrice: 105, // 14 + 28 + 33 = 75
    color: '#E68335',
    description: 'Bánh tart bí ngô vàng ươm thơm bùi',
  },
  strawberry_cake: {
    id: 'strawberry_cake',
    name: 'Bánh Kem Dâu Tây',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'flour', qty: 1},
      {kind: 'processed', id: 'berry_jam', qty: 1},
      {kind: 'crop', id: 'strawberry', qty: 1},
    ],
    cookSeconds: 2400, // 40 phút
    sellPrice: 118, // 7 + 68 + 11 = 86
    color: '#F59BB0',
    description: 'Bánh bông lan phủ kem và mứt dâu đỏ',
  },
  duck_egg_flan: {
    id: 'duck_egg_flan',
    name: 'Bánh Flan Trứng Vịt',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'animal_product', id: 'duck_egg', qty: 2},
      {kind: 'animal_product', id: 'milk', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 2700, // 45 phút
    sellPrice: 120, // 28 + 32 + 28 = 88 -> lời +32
    color: '#F2C063',
    description: 'Bánh flan béo ngậy từ Trứng Vịt & caramel mía',
  },
  panna_cotta: {
    id: 'panna_cotta',
    name: 'Panna Cotta Dâu',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'fresh_cream', qty: 1},
      {kind: 'crop', id: 'strawberry', qty: 2},
      {kind: 'crop', id: 'vanilla', qty: 1},
    ],
    cookSeconds: 2400, // 40 phút
    sellPrice: 158, // 74 + 22 + 19 = 115 -> lời +43
    color: '#FCE7EA',
    description: 'Panna Cotta kem sữa vani phủ sốt dâu tây mịn mượt',
  },
  berry_cheesecake: {
    id: 'berry_cheesecake',
    name: 'Bánh Phô Mai Dâu Tây',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'cheese', qty: 1},
      {kind: 'processed', id: 'berry_jam', qty: 1},
      {kind: 'processed', id: 'flour', qty: 1},
    ],
    cookSeconds: 3000, // 50 phút
    sellPrice: 162, // 46 + 68 + 7 = 121
    color: '#F29BB5',
    description: 'Cheesecake béo mịn kèm mứt dâu thơm lừng',
  },
  cacao_brownie: {
    id: 'cacao_brownie',
    name: 'Bánh Brownie Ca Cao',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'processed', id: 'cacao_powder', qty: 1},
      {kind: 'processed', id: 'flour', qty: 2},
      {kind: 'animal_product', id: 'chicken_egg', qty: 2},
    ],
    cookSeconds: 3600, // 1 giờ (món khó)
    sellPrice: 210, // 125 + 14 + 20 = 159
    color: '#6E3F2C',
    description: 'Bánh sô-cô-la mềm ẩm đắt khách nhất tiệm bánh',
  },
  carrot_soup: {
    id: 'carrot_soup',
    name: 'Súp Cà Rốt Cà Chua',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'crop', id: 'carrot', qty: 2},
      {kind: 'crop', id: 'tomato', qty: 1},
    ],
    cookSeconds: 1200, // 20 phút
    sellPrice: 38, // 12 + 14 = 26
    color: '#E86A38',
    description: 'Tô súp nóng hổi sánh mịn rau củ vườn',
  },
  tomato_pasta: {
    id: 'tomato_pasta',
    name: 'Mì Ý Sốt Cà Chua',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'processed', id: 'flour', qty: 2},
      {kind: 'crop', id: 'tomato', qty: 2},
    ],
    cookSeconds: 1500, // 25 phút
    sellPrice: 60, // 14 + 28 = 42
    color: '#D94F3B',
    description: 'Đĩa mì sợi tươi trộn sốt cà chua đậm đà',
  },
  pork_pho: {
    id: 'pork_pho',
    name: 'Phở Thịt Lợn',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'processed', id: 'rice_noodle', qty: 1},
      {kind: 'animal_product', id: 'pork', qty: 1},
      {kind: 'crop', id: 'scallion', qty: 2},
    ],
    cookSeconds: 1680, // 28 phút
    sellPrice: 68, // 15 + 24 + 8 = 47 -> lời +21
    color: '#EBD3A5',
    description: 'Tô phở nóng hổi thịt lợn mềm kèm hành ngò thơm ngát',
  },
  glazed_carrot: {
    id: 'glazed_carrot',
    name: 'Cà Rốt Sốt Siro Mía',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'crop', id: 'carrot', qty: 2},
      {kind: 'processed', id: 'cane_syrup', qty: 1},
    ],
    cookSeconds: 1800, // 30 phút
    sellPrice: 92, // 12 + 56 = 68
    color: '#E67A28',
    description: 'Món áp chảo bóng bẩy chuẩn thực đơn nông trại',
  },
  salted_duck_porridge: {
    id: 'salted_duck_porridge',
    name: 'Cháo Trứng Vịt Thịt Băm',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'animal_product', id: 'duck_egg', qty: 2},
      {kind: 'animal_product', id: 'pork', qty: 1},
      {kind: 'crop', id: 'wheat', qty: 2},
    ],
    cookSeconds: 2220, // 37 phút
    sellPrice: 86, // 28 + 24 + 8 = 60
    color: '#E7C88B',
    description: 'Cháo dinh dưỡng ấm bụng từ trứng vịt & thịt lợn',
  },
  roasted_pork_corn: {
    id: 'roasted_pork_corn',
    name: 'Thịt Lợn Áp Chảo Ngô',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'animal_product', id: 'pork', qty: 2},
      {kind: 'crop', id: 'corn', qty: 2},
      {kind: 'crop', id: 'tomato', qty: 1},
    ],
    cookSeconds: 2700, // 45 phút
    sellPrice: 108, // 48 + 16 + 14 = 78
    color: '#C96352',
    description: 'Đĩa thịt lợn sạch nướng bắp ngọt thơm lừng',
  },
  cheese_omelet: {
    id: 'cheese_omelet',
    name: 'Trứng Chiên Phô Mai',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'animal_product', id: 'chicken_egg', qty: 2},
      {kind: 'processed', id: 'cheese', qty: 1},
      {kind: 'crop', id: 'tomato', qty: 1},
    ],
    cookSeconds: 3000, // 50 phút
    sellPrice: 112, // 20 + 46 + 14 = 80
    color: '#F5C44F',
    description: 'Trứng gà ta ốp phô mai kéo sợi kèm cà chua',
  },
  watermelon_smoothie: {
    id: 'watermelon_smoothie',
    name: 'Sinh Tố Dưa Hấu Sữa',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'crop', id: 'watermelon', qty: 2},
      {kind: 'animal_product', id: 'milk', qty: 1},
      {kind: 'processed', id: 'cane_syrup', qty: 1},
    ],
    cookSeconds: 2100, // 35 phút
    sellPrice: 188, // 52 + 32 + 56 = 140 -> lời +48 Xu
    color: '#F7798A',
    description: 'Dưa hấu xay mịn quyện sữa tươi & siro mía ngọt mát',
  },
  vanilla_iced_coffee: {
    id: 'vanilla_iced_coffee',
    name: 'Cà Phê Sữa Vani',
    category: 'drink',
    categoryLabel: 'Nước uống',
    inputs: [
      {kind: 'processed', id: 'roasted_coffee', qty: 1},
      {kind: 'animal_product', id: 'milk', qty: 1},
      {kind: 'crop', id: 'vanilla', qty: 1},
      {kind: 'processed', id: 'brown_sugar', qty: 1},
    ],
    cookSeconds: 3300, // 55 phút
    sellPrice: 295, // 140 + 32 + 19 + 28 = 219 -> lời +76 Xu
    color: '#A16842',
    description: 'Cà phê sữa béo ngậy thoảng hương vani tươi quyến rũ',
  },
  vanilla_flan: {
    id: 'vanilla_flan',
    name: 'Bánh Flan Vani Caramel',
    category: 'bakery',
    categoryLabel: 'Bánh ngọt',
    inputs: [
      {kind: 'animal_product', id: 'chicken_egg', qty: 2},
      {kind: 'animal_product', id: 'milk', qty: 1},
      {kind: 'crop', id: 'vanilla', qty: 1},
      {kind: 'processed', id: 'cane_syrup', qty: 1},
    ],
    cookSeconds: 2400, // 40 phút
    sellPrice: 172, // 20 + 32 + 19 + 56 = 127 -> lời +45 Xu
    color: '#F6CA65',
    description: 'Bánh flan trứng sữa mịn màng thơm lừng hương vani',
  },
  corn_fried_rice: {
    id: 'corn_fried_rice',
    name: 'Cơm Chiên Bắp Hành',
    category: 'meal',
    categoryLabel: 'Món ăn',
    inputs: [
      {kind: 'crop', id: 'rice', qty: 2},
      {kind: 'crop', id: 'corn', qty: 2},
      {kind: 'crop', id: 'scallion', qty: 2},
      {kind: 'animal_product', id: 'chicken_egg', qty: 1},
    ],
    cookSeconds: 1500, // 25 phút
    sellPrice: 66, // 10 + 16 + 8 + 10 = 44 -> lời +22 Xu
    color: '#F4CD5C',
    description: 'Hạt cơm vàng ươm rang cùng bắp ngọt, trứng gà & hành lá',
  },
};

export const RECIPE_LIST: RecipeDefinition[] = [
  KITCHEN_RECIPES.sugarcane_juice,
  KITCHEN_RECIPES.watermelon_juice,
  KITCHEN_RECIPES.watermelon_smoothie,
  KITCHEN_RECIPES.strawberry_tea,
  KITCHEN_RECIPES.honey_lemonade,
  KITCHEN_RECIPES.pumpkin_smoothie,
  KITCHEN_RECIPES.corn_milk,
  KITCHEN_RECIPES.hot_cacao,
  KITCHEN_RECIPES.milk_coffee,
  KITCHEN_RECIPES.vanilla_iced_coffee,
  KITCHEN_RECIPES.butter_bread,
  KITCHEN_RECIPES.egg_tart,
  KITCHEN_RECIPES.pumpkin_pie,
  KITCHEN_RECIPES.strawberry_cake,
  KITCHEN_RECIPES.duck_egg_flan,
  KITCHEN_RECIPES.vanilla_flan,
  KITCHEN_RECIPES.panna_cotta,
  KITCHEN_RECIPES.berry_cheesecake,
  KITCHEN_RECIPES.cacao_brownie,
  KITCHEN_RECIPES.carrot_soup,
  KITCHEN_RECIPES.tomato_pasta,
  KITCHEN_RECIPES.pork_pho,
  KITCHEN_RECIPES.corn_fried_rice,
  KITCHEN_RECIPES.glazed_carrot,
  KITCHEN_RECIPES.salted_duck_porridge,
  KITCHEN_RECIPES.roasted_pork_corn,
  KITCHEN_RECIPES.cheese_omelet,
];

export const PLOT_COUNT = 36;

export function createInitialPlots(now = Date.now()): GardenPlotState[] {
  return Array.from({length: PLOT_COUNT}, (_, index) => {
    const id = index + 1;
    if (id === 1) {
      return {
        id,
        level: 1,
        stage: 'ready',
        crop: 'wheat',
        watered: true,
        hasPest: false,
        hasWeed: false,
        pestRolled: true,
        plantedAt: now - 180000,
        readyAt: now,
        durationMs: 180000,
      };
    }
    if (id === 2) {
      return {
        id,
        level: 1,
        stage: 'ready',
        crop: 'corn',
        watered: true,
        hasPest: false,
        hasWeed: false,
        pestRolled: true,
        plantedAt: now - 720000,
        readyAt: now,
        durationMs: 720000,
      };
    }
    if (id === 19) {
      return {
        id,
        level: 1,
        stage: 'ready',
        crop: 'carrot',
        watered: true,
        hasPest: false,
        hasWeed: false,
        pestRolled: true,
        plantedAt: now - 360000,
        readyAt: now,
        durationMs: 360000,
      };
    }
    if (id === 20) {
      return {
        id,
        level: 1,
        stage: 'ready',
        crop: 'tomato',
        watered: true,
        hasPest: true, // 1 ô mẫu có sâu để người chơi thấy nút bắt sâu
        hasWeed: false,
        pestRolled: true,
        plantedAt: now - 1800000,
        readyAt: now,
        durationMs: 1800000,
      };
    }
    return {
      id,
      level: 1,
      stage: 'empty',
      crop: null,
      watered: false,
      hasPest: false,
      hasWeed: id === 3,
      pestRolled: false,
      plantedAt: null,
      readyAt: null,
      durationMs: 0,
    };
  });
}

export const WATER_CAN_MAX = 50;
export const WELL_WATER_MAX = 50;
export const WELL_WATER_INTERVAL_MS = 3 * 60 * 1000; // 3 phút sinh 1 nước (tích offline tối đa 50)
export const INITIAL_WATER_CAN = 10;
export const INITIAL_WELL_STORED = 8;

export const FARM_STORAGE_BASE_CAPACITY = 100;
export const FARM_STORAGE_STEP = 10;
export const WAREHOUSE_UPGRADE_COSTS = [
  200, // 100 -> 110
  350, // 110 -> 120
  500, // 120 -> 130
  700, // 130 -> 140
  900, // 140 -> 150
  1100, // 150 -> 160
  1300, // 160 -> 170
  1550, // 170 -> 180
  1850, // 180 -> 190
  2200, // 190 -> 200
  2600, // 200 -> 210
  3050, // 210 -> 220
  3550, // 220 -> 230
  4100, // 230 -> 240
] as const;
export const MAX_WAREHOUSE_LEVEL = WAREHOUSE_UPGRADE_COSTS.length + 1; // 100 -> 240 đơn vị lưu trữ

export function getFarmStorageCapacity(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_WAREHOUSE_LEVEL, Math.floor(level || 1)));
  return FARM_STORAGE_BASE_CAPACITY + (safeLevel - 1) * FARM_STORAGE_STEP;
}

export function getWarehouseUpgradeCost(level: number): number | null {
  if (level >= MAX_WAREHOUSE_LEVEL) return null;
  const safeLevel = Math.max(1, Math.floor(level || 1));
  return WAREHOUSE_UPGRADE_COSTS[safeLevel - 1] ?? null;
}

export const SUPPLY_META: Record<
  keyof FarmSupplies,
  {name: string; color: string; sellPrice: number}
> = {
  bugSpray: {name: 'Bình Xịt Sâu', color: '#D95970', sellPrice: 1},
  animalFeed: {name: 'Cám Vật Nuôi', color: '#E09B3D', sellPrice: 1},
  animalMedicine: {name: 'Thuốc Thú Y', color: '#C95168', sellPrice: 4},
  fishFeed: {name: 'Cám Thủy Sinh', color: '#2F789B', sellPrice: 3},
  fishMedicine: {name: 'Thuốc Thủy Sinh', color: '#4B8A5B', sellPrice: 6},
};

export function getFarmSeedSellPrice(crop: CropType): number {
  const seedPrice = CROPS[crop]?.seedPrice ?? 6;
  return Math.max(2, Math.floor(seedPrice * 0.6));
}

export function getFarmStorageUsed(inv: FarmInventory): number {
  let total = 0;
  for (const qty of Object.values(inv.seeds)) total += qty || 0;
  for (const qty of Object.values(inv.crops)) total += qty || 0;
  for (const qty of Object.values(inv.animalProducts)) total += qty || 0;
  for (const qty of Object.values(inv.processed)) total += qty || 0;
  for (const qty of Object.values(inv.dishes)) total += qty || 0;
  total +=
    (inv.supplies.bugSpray || 0) +
    (inv.supplies.animalFeed || 0) +
    (inv.supplies.animalMedicine || 0) +
    (inv.supplies.fishFeed || 0) +
    (inv.supplies.fishMedicine || 0);
  return total;
}

export function createInitialSupplies(): FarmSupplies {
  return {
    bugSpray: 2,
    animalFeed: 4,
    animalMedicine: 1,
    fishFeed: 2,
    fishMedicine: 1,
  };
}

export function createInitialFarmInventory(): FarmInventory {
  return {
    seeds: {wheat: 4, scallion: 2, rice: 2, carrot: 2, corn: 1},
    crops: {wheat: 2, carrot: 2},
    animalProducts: {chicken_egg: 2},
    processed: {},
    dishes: {},
    supplies: createInitialSupplies(),
  };
}

export function createAnimalInstance(
  type: AnimalType,
  indexLabel: number,
  now = Date.now(),
  startAsAdultReady = false,
): LivestockAnimalState {
  const def = ANIMALS[type];
  const growMs = def.growHours * 3600 * 1000;
  const activeMs = def.activeDays * 24 * 3600 * 1000;
  const prodMs = def.produceSeconds * 1000;
  return {
    id: `ani_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    coop: def.coop,
    name: `${def.name} #${indexLabel}`,
    stage: startAsAdultReady ? 'adult' : 'baby',
    boughtAt: now,
    growRemainingMs: startAsAdultReady ? 0 : growMs,
    growDurationMs: growMs,
    activeRemainingMs: activeMs,
    activeDurationMs: activeMs,
    mealsRemaining: 2,
    nextMealElapsedMs: startAsAdultReady
      ? Math.round(activeMs * 0.45)
      : Math.round((growMs + activeMs) * 0.35),
    hunger: 95,
    sick: false,
    hasProduce: startAsAdultReady,
    produceRemainingMs: startAsAdultReady ? 0 : prodMs,
    produceCycleMs: prodMs,
    lastTickAt: now,
  };
}

export function createInitialLivestock(now = Date.now()): LivestockAnimalState[] {
  return [
    createAnimalInstance('chicken', 1, now, true),
    createAnimalInstance('duck', 1, now, false),
    createAnimalInstance('pig', 1, now, false),
  ];
}

export function createInitialTroughs(): CoopTroughs {
  return {poultry: 2, cattle: 1};
}

export function createInitialPondFish(now = Date.now()): PondFishState[] {
  const fishMs = POND_FISH_SPECIES.fish_12h.durationHours * 3600 * 1000;
  return [
    {
      id: 'fish_starter_carp',
      species: 'fish_12h',
      stage: 'growing',
      stockedAt: now - 3600 * 1000,
      remainingMs: fishMs - 3600 * 1000,
      totalDurationMs: fishMs,
      hunger: 88,
      sick: false,
      lastCareCheckAt: now,
      lastTickAt: now,
    },
  ];
}

export function getFarmItemCount(
  inv: FarmInventory,
  kind: FarmItemKind,
  id: string,
): number {
  if (kind === 'crop') return inv.crops[id as CropType] || 0;
  if (kind === 'animal_product') return inv.animalProducts[id as AnimalProduceId] || 0;
  if (kind === 'processed') return inv.processed[id as ProcessedId] || 0;
  return inv.dishes[id as RecipeId] || 0;
}

export function getFarmItemName(kind: FarmItemKind, id: string): string {
  if (kind === 'crop') return CROPS[id as CropType]?.name ?? id;
  if (kind === 'animal_product') return ANIMAL_PRODUCTS[id as AnimalProduceId]?.name ?? id;
  if (kind === 'processed') return PROCESSED_ITEMS[id as ProcessedId]?.name ?? id;
  return KITCHEN_RECIPES[id as RecipeId]?.name ?? id;
}

export function getFarmItemColor(kind: FarmItemKind, id: string): string {
  if (kind === 'crop') return CROPS[id as CropType]?.color ?? '#6EA85C';
  if (kind === 'animal_product') return ANIMAL_PRODUCTS[id as AnimalProduceId]?.color ?? '#F5DFB0';
  if (kind === 'processed') return PROCESSED_ITEMS[id as ProcessedId]?.color ?? '#D9A77A';
  return KITCHEN_RECIPES[id as RecipeId]?.color ?? '#E57A6B';
}

export function getFarmItemDirectSellPrice(kind: FarmItemKind, id: string): number {
  if (kind === 'crop') return CROPS[id as CropType]?.rawSellPrice ?? 4;
  if (kind === 'animal_product') return ANIMAL_PRODUCTS[id as AnimalProduceId]?.sellPrice ?? 12;
  if (kind === 'processed') return PROCESSED_ITEMS[id as ProcessedId]?.sellPrice ?? 7;
  return KITCHEN_RECIPES[id as RecipeId]?.sellPrice ?? 30;
}

const CUSTOMER_PROFILES = [
  {name: 'Tina', titles: ['Bữa trưa tiệm thời trang', 'Trà chiều ở Boutique']},
  {name: 'Bob', titles: ['Bữa tối xưởng mộc', 'Tiếp sức dựng nội thất']},
  {name: 'Bác Sĩ Gấu', titles: ['Thực đơn dinh dưỡng', 'Đơn nông sản sạch']},
  {name: 'Cô Mây', titles: ['Tiệc trà quảng trường', 'Bánh ngọt cuối tuần']},
  {name: 'Bếp Trưởng Tím', titles: ['Đặt hàng nông sản sạch', 'Combo bếp thị trấn']},
];

export function computeOrderExactReward(requirements: FarmOrderRequirement[]): number {
  let sum = 0;
  for (const req of requirements) {
    sum += getFarmItemDirectSellPrice(req.kind, req.id) * req.qty;
  }
  return sum;
}

export function createSingleFarmOrder(seedOffset = 0): FarmOrder {
  const profile =
    CUSTOMER_PROFILES[Math.floor((Math.random() * 100 + seedOffset) % CUSTOMER_PROFILES.length)];
  const title = profile.titles[Math.floor(Math.random() * profile.titles.length)];

  const mainRecipe = RECIPE_LIST[Math.floor(Math.random() * RECIPE_LIST.length)];
  const extraRoll = Math.random();

  const requirements: FarmOrderRequirement[] = [{kind: 'dish', id: mainRecipe.id, qty: 1}];
  if (extraRoll < 0.35) {
    const extraProc = PROCESSED_LIST[Math.floor(Math.random() * PROCESSED_LIST.length)];
    requirements.push({kind: 'processed', id: extraProc.id, qty: 1});
  } else if (extraRoll < 0.65) {
    const animalKeys: AnimalProduceId[] = ['chicken_egg', 'duck_egg', 'pork', 'milk'];
    const prodId = animalKeys[Math.floor(Math.random() * animalKeys.length)];
    requirements.push({kind: 'animal_product', id: prodId, qty: 1});
  } else {
    const extraCrop = CROP_LIST[Math.floor(Math.random() * CROP_LIST.length)];
    requirements.push({
      kind: 'crop',
      id: extraCrop.id,
      qty: extraCrop.id === 'wheat' || extraCrop.id === 'carrot' || extraCrop.id === 'corn' ? 2 : 1,
    });
  }

  return {
    id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    customerName: profile.name,
    title,
    requirements,
    rewardCoins: computeOrderExactReward(requirements),
  };
}

export function createInitialOrders(): FarmOrder[] {
  const o1Req: FarmOrderRequirement[] = [
    {kind: 'crop', id: 'wheat', qty: 2},
    {kind: 'crop', id: 'carrot', qty: 2},
  ];
  const o2Req: FarmOrderRequirement[] = [{kind: 'dish', id: 'carrot_soup', qty: 1}];
  const o3Req: FarmOrderRequirement[] = [
    {kind: 'dish', id: 'butter_bread', qty: 1},
    {kind: 'animal_product', id: 'chicken_egg', qty: 1},
  ];
  return [
    {
      id: 'ord_starter_1',
      customerName: 'Tina',
      title: 'Bữa sáng nhẹ ở Boutique',
      requirements: o1Req,
      rewardCoins: computeOrderExactReward(o1Req), // 8 + 12 = 20 Xu (đúng bằng giá món)
    },
    {
      id: 'ord_starter_2',
      customerName: 'Bob',
      title: 'Súp nóng tiếp sức xưởng mộc',
      requirements: o2Req,
      rewardCoins: computeOrderExactReward(o2Req), // 38 Xu
    },
    {
      id: 'ord_starter_3',
      customerName: 'Cô Mây',
      title: 'Combo bánh mì & trứng gà',
      requirements: o3Req,
      rewardCoins: computeOrderExactReward(o3Req), // 58 + 12 = 70 Xu
    },
  ];
}
