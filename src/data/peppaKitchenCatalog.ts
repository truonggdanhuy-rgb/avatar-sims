export type KitchenApplianceId = 'microwave' | 'mini_oven';

export type PeppaIngredientId =
  | 'noodle_pack'
  | 'fresh_egg'
  | 'cheese_slice'
  | 'sausage_link'
  | 'butter_block'
  | 'milk_carton'
  | 'popcorn_kernel'
  | 'flour_bag'
  | 'cacao_pack'
  | 'berry_jam_jar'
  | 'chicken_cutlet'
  | 'honey_jar';

export type PeppaRecipeId =
  | 'mw_cheese_noodle'
  | 'mw_honey_popcorn'
  | 'mw_garlic_toast'
  | 'mw_cacao_milk'
  | 'mw_sausage_egg_cup'
  | 'ov_sausage_pizza'
  | 'ov_butter_croissant'
  | 'ov_honey_chicken'
  | 'ov_berry_tart'
  | 'ov_choco_lava';

export interface PeppaIngredientDef {
  id: PeppaIngredientId;
  name: string;
  price: number;
  accentColor: string;
  description: string;
}

export interface PeppaRecipeRequirement {
  id: PeppaIngredientId;
  qty: number;
}

export interface PeppaRecipeDef {
  id: PeppaRecipeId;
  appliance: KitchenApplianceId;
  name: string;
  recipePrice: number;
  sellPrice: number;
  energyRestore: number;
  hungerRestore: number;
  moodRestore: number;
  accentColor: string;
  ingredients: PeppaRecipeRequirement[];
  steps: string[];
  description: string;
}

export const PEPPA_INGREDIENTS: Record<PeppaIngredientId, PeppaIngredientDef> = {
  noodle_pack: {
    id: 'noodle_pack',
    name: 'Mì Tươi Sợi Vàng',
    price: 8,
    accentColor: '#F5C443',
    description: 'Sợi mì dai thơm, chín nhanh chỉ với vài phút quay lò vi sóng.',
  },
  fresh_egg: {
    id: 'fresh_egg',
    name: 'Trứng Gà Tươi',
    price: 9,
    accentColor: '#FFD68A',
    description: 'Trứng gà nông trại lòng đỏ béo mịn, giàu dinh dưỡng.',
  },
  cheese_slice: {
    id: 'cheese_slice',
    name: 'Phô Mai Tan Chảy',
    price: 12,
    accentColor: '#FFCA4B',
    description: 'Lát phô mai mozzarella kéo sợi béo ngậy.',
  },
  sausage_link: {
    id: 'sausage_link',
    name: 'Xúc Xích Xông Khói',
    price: 14,
    accentColor: '#D95B43',
    description: 'Xúc xích thịt đậm đà hương khói, thơm lừng khi làm nóng.',
  },
  butter_block: {
    id: 'butter_block',
    name: 'Bơ Sữa Thơm Lừng',
    price: 11,
    accentColor: '#F9DF74',
    description: 'Bơ lạt nguyên chất giúp bánh và bắp rang dậy mùi quyến rũ.',
  },
  milk_carton: {
    id: 'milk_carton',
    name: 'Sữa Tươi Nguyên Chất',
    price: 10,
    accentColor: '#69B8EB',
    description: 'Hộp sữa tươi thanh trùng mát lành từ đồng cỏ Thị Trấn Mây.',
  },
  popcorn_kernel: {
    id: 'popcorn_kernel',
    name: 'Hạt Bắp Nổ Giòn',
    price: 8,
    accentColor: '#F2B84B',
    description: 'Hạt bắp vàng tuyển chọn nổ bung giòn rụm trong lò vi sóng.',
  },
  flour_bag: {
    id: 'flour_bag',
    name: 'Bột Mì Tinh Luyện',
    price: 10,
    accentColor: '#E8D6BA',
    description: 'Bột mì mịn trắng dùng làm đế pizza, croissant và bánh tart.',
  },
  cacao_pack: {
    id: 'cacao_pack',
    name: 'Bột Ca Cao Đậm Vị',
    price: 12,
    accentColor: '#7B4932',
    description: 'Bột ca cao nguyên chất thơm nồng, pha đồ uống hay nướng bánh đều ngon.',
  },
  berry_jam_jar: {
    id: 'berry_jam_jar',
    name: 'Mứt Dâu Rừng Ngọt',
    price: 14,
    accentColor: '#E64D73',
    description: 'Lọ mứt dâu tây chín mọng chua ngọt hài hòa.',
  },
  chicken_cutlet: {
    id: 'chicken_cutlet',
    name: 'Phi Lê Gà Tươi',
    price: 16,
    accentColor: '#F09D78',
    description: 'Thịt ức gà tươi mềm ngọt, cực hợp nướng mật ong vàng ươm.',
  },
  honey_jar: {
    id: 'honey_jar',
    name: 'Mật Ong Hoa Rừng',
    price: 13,
    accentColor: '#ECA033',
    description: 'Mật ong vàng óng thơm dịu tự nhiên, giúp hồi thể lực nhanh.',
  },
};

export const PEPPA_INGREDIENT_LIST: PeppaIngredientDef[] = Object.values(PEPPA_INGREDIENTS);

export const PEPPA_RECIPES: Record<PeppaRecipeId, PeppaRecipeDef> = {
  // === 5 MÓN LÒ VI SÓNG (MICROWAVE) ===
  mw_cheese_noodle: {
    id: 'mw_cheese_noodle',
    appliance: 'microwave',
    name: 'Mì Ly Phô Mai Trứng',
    recipePrice: 30,
    sellPrice: 46,
    energyRestore: 26,
    hungerRestore: 28,
    moodRestore: 4,
    accentColor: '#F5B841',
    ingredients: [
      {id: 'noodle_pack', qty: 1},
      {id: 'fresh_egg', qty: 1},
      {id: 'cheese_slice', qty: 1},
    ],
    steps: [
      'Cho mì tươi vào tô sứ cùng ít nước ấm.',
      'Đập trứng gà vào giữa, phủ kín lát phô mai lên mặt.',
      'Quay Lò Vi Sóng 2 phút 30 giây cho phô mai tan chảy béo ngậy.',
    ],
    description: 'Món mì nóng hổi béo thơm nhanh gọn, giúp phục hồi thể lực tức thì.',
  },
  mw_honey_popcorn: {
    id: 'mw_honey_popcorn',
    appliance: 'microwave',
    name: 'Bắp Rang Bơ Mật Ong',
    recipePrice: 25,
    sellPrice: 50,
    energyRestore: 22,
    hungerRestore: 24,
    moodRestore: 6,
    accentColor: '#F4A938',
    ingredients: [
      {id: 'popcorn_kernel', qty: 1},
      {id: 'butter_block', qty: 1},
      {id: 'honey_jar', qty: 1},
    ],
    steps: [
      'Trộn đều hạt bắp với bơ sữa đã đun mềm trong tô chịu nhiệt.',
      'Đậy nắp hở hơi, quay Lò Vi Sóng 3 phút đến khi tiếng nổ thưa dần.',
      'Rưới mật ong hoa rừng và xóc đều khi bắp còn nóng giòn.',
    ],
    description: 'Từng viên bắp nổ phồng bọc lớp bơ mật ong giòn tan ngọt lịm.',
  },
  mw_garlic_toast: {
    id: 'mw_garlic_toast',
    appliance: 'microwave',
    name: 'Bánh Mì Bơ Sữa Nóng',
    recipePrice: 28,
    sellPrice: 48,
    energyRestore: 25,
    hungerRestore: 26,
    moodRestore: 4,
    accentColor: '#E5B46A',
    ingredients: [
      {id: 'flour_bag', qty: 1},
      {id: 'butter_block', qty: 1},
      {id: 'milk_carton', qty: 1},
    ],
    steps: [
      'Nhào nhanh bột mì với sữa tươi thành ổ bánh nhỏ mềm.',
      'Phết dày bơ sữa lên mặt bánh rồi đặt lên đĩa xoay.',
      'Quay Lò Vi Sóng mức vừa trong 2 phút cho bánh nở xốp thơm lừng.',
    ],
    description: 'Ổ bánh mì mềm ẩm thấm đẫm bơ sữa ấm nóng cho buổi sáng tràn sức sống.',
  },
  mw_cacao_milk: {
    id: 'mw_cacao_milk',
    appliance: 'microwave',
    name: 'Sữa Ca Cao Mật Ong Nóng',
    recipePrice: 35,
    sellPrice: 55,
    energyRestore: 32,
    hungerRestore: 22,
    moodRestore: 7,
    accentColor: '#8B5138',
    ingredients: [
      {id: 'milk_carton', qty: 1},
      {id: 'cacao_pack', qty: 1},
      {id: 'honey_jar', qty: 1},
    ],
    steps: [
      'Khuấy tan bột ca cao cùng sữa tươi trong cốc gốm.',
      'Quay Lò Vi Sóng 90 giây cho sữa bốc khói ấm áp.',
      'Thêm mật ong hoa rừng đánh bọt mịn lên trên và thưởng thức.',
    ],
    description: 'Ly ca cao nóng thơm dịu nạp lại năng lượng và làm dịu tinh thần ngay lập tức.',
  },
  mw_sausage_egg_cup: {
    id: 'mw_sausage_egg_cup',
    appliance: 'microwave',
    name: 'Trứng Hấp Xúc Xích Phô Mai',
    recipePrice: 40,
    sellPrice: 58,
    energyRestore: 34,
    hungerRestore: 32,
    moodRestore: 5,
    accentColor: '#E36B50',
    ingredients: [
      {id: 'fresh_egg', qty: 1},
      {id: 'sausage_link', qty: 1},
      {id: 'cheese_slice', qty: 1},
    ],
    steps: [
      'Đánh bông trứng gà trong chén, thả lát xúc xích xông khói vào.',
      'Phủ lát phô mai lên mặt chén rồi bọc hở miệng.',
      'Quay Lò Vi Sóng 2 phút ở mức trung bình cho trứng chín mịn mướt.',
    ],
    description: 'Chén trứng hấp mềm mượt quyện xúc xích đậm vị, no lâu và giàu đạm.',
  },

  // === 5 MÓN LÒ NƯỚNG MINI ĐA NĂNG (MINI OVEN) ===
  ov_sausage_pizza: {
    id: 'ov_sausage_pizza',
    appliance: 'mini_oven',
    name: 'Pizza Xúc Xích Phô Mai',
    recipePrice: 55,
    sellPrice: 78,
    energyRestore: 45,
    hungerRestore: 48,
    moodRestore: 8,
    accentColor: '#E4523E',
    ingredients: [
      {id: 'flour_bag', qty: 1},
      {id: 'sausage_link', qty: 1},
      {id: 'cheese_slice', qty: 2},
    ],
    steps: [
      'Cán bột mì thành đế bánh mỏng tròn rồi xếp lên vỉ nướng.',
      'Rải kín 2 lớp phô mai kéo sợi và lát xúc xích xông khói.',
      'Nướng Lò Nướng Mini ở 200°C trong 10 phút đến khi viền vàng giòn.',
    ],
    description: 'Chiếc pizza nóng hổi giòn rụm viền bánh, kéo sợi phô mai siêu hấp dẫn.',
  },
  ov_butter_croissant: {
    id: 'ov_butter_croissant',
    appliance: 'mini_oven',
    name: 'Bánh Croissant Bơ Pháp',
    recipePrice: 45,
    sellPrice: 66,
    energyRestore: 36,
    hungerRestore: 38,
    moodRestore: 6,
    accentColor: '#DFA048',
    ingredients: [
      {id: 'flour_bag', qty: 1},
      {id: 'butter_block', qty: 2},
      {id: 'fresh_egg', qty: 1},
    ],
    steps: [
      'Cán bột mì nhiều lớp kẹp bơ lạnh rồi cuộn hình sừng bò.',
      'Quét lớp lòng đỏ trứng gà mỏng lên bề mặt bột.',
      'Nướng Lò Nướng Mini ở 185°C trong 12 phút cho vỏ nghìn lớp phồng vàng.',
    ],
    description: 'Bánh sừng bò giòn tan bên ngoài, thơm bơ tơi xốp từng lớp bên trong.',
  },
  ov_honey_chicken: {
    id: 'ov_honey_chicken',
    appliance: 'mini_oven',
    name: 'Gà Nướng Giòn Sốt Mật Ong',
    recipePrice: 60,
    sellPrice: 72,
    energyRestore: 48,
    hungerRestore: 44,
    moodRestore: 7,
    accentColor: '#D97B30',
    ingredients: [
      {id: 'chicken_cutlet', qty: 1},
      {id: 'honey_jar', qty: 1},
      {id: 'butter_block', qty: 1},
    ],
    steps: [
      'Ướp phi lê gà với bơ sữa tan chảy và nửa hũ mật ong hoa rừng.',
      'Đặt thịt gà lên khay nướng, phết thêm một lớp mật ong óng ả.',
      'Nướng Lò Nướng Mini ở 195°C trong 14 phút cho da xém vàng ngọt thịt.',
    ],
    description: 'Thịt gà mọng nước quyện lớp sốt mật ong caramel giúp hồi gần nửa thanh thể lực!',
  },
  ov_berry_tart: {
    id: 'ov_berry_tart',
    appliance: 'mini_oven',
    name: 'Bánh Tart Dâu Kem Trứng',
    recipePrice: 50,
    sellPrice: 70,
    energyRestore: 40,
    hungerRestore: 36,
    moodRestore: 9,
    accentColor: '#E55A84',
    ingredients: [
      {id: 'flour_bag', qty: 1},
      {id: 'fresh_egg', qty: 1},
      {id: 'milk_carton', qty: 1},
      {id: 'berry_jam_jar', qty: 1},
    ],
    steps: [
      'Ép bột mì thành đế tart nhỏ, đổ hỗn hợp trứng sữa mịn vào khuôn.',
      'Nướng Lò Nướng Mini ở 180°C trong 11 phút cho nhân kem se vàng.',
      'Phết mứt dâu rừng chua ngọt lên mặt bánh khi vừa lấy ra khỏi lò.',
    ],
    description: 'Đế bánh giòn bùi ôm trọn nhân kem trứng tan chảy cùng mứt dâu đỏ mọng.',
  },
  ov_choco_lava: {
    id: 'ov_choco_lava',
    appliance: 'mini_oven',
    name: 'Bánh Lava Sô-Cô-La Nướng',
    recipePrice: 55,
    sellPrice: 72,
    energyRestore: 44,
    hungerRestore: 34,
    moodRestore: 10,
    accentColor: '#6D3E2B',
    ingredients: [
      {id: 'flour_bag', qty: 1},
      {id: 'cacao_pack', qty: 1},
      {id: 'butter_block', qty: 1},
      {id: 'fresh_egg', qty: 1},
    ],
    steps: [
      'Trộn bơ tan, bột ca cao, trứng gà và bột mì thành hỗn hợp sánh mịn.',
      'Rót đầy khuôn nướng nhỏ chịu nhiệt đã quét sẵn lớp bơ mỏng.',
      'Nướng Lò Nướng Mini ở 200°C đúng 8 phút để lõi sô-cô-la bên trong còn tan chảy.',
    ],
    description: 'Xắn nhẹ lớp vỏ bánh mềm ấm để dòng sô-cô-la nóng sóng sánh tuôn trào!',
  },
};

export const PEPPA_RECIPE_LIST: PeppaRecipeDef[] = Object.values(PEPPA_RECIPES);

export function createInitialPeppaIngredients(): Partial<Record<PeppaIngredientId, number>> {
  return {};
}

export function createInitialPeppaDishes(): Partial<Record<PeppaRecipeId, number>> {
  return {};
}
