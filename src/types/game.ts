export type ZoneId =
  | 'town'
  | 'home'
  | 'garden'
  | 'fishing'
  | 'arcade'
  | 'boutique'
  | 'petshop'
  | 'mall'
  | 'island';

export type TimeOfDay = 'morning' | 'night';

export type HairBackStyle =
  | 'long_wave'
  | 'twin_tails'
  | 'bob_cut'
  | 'short_crop'
  | 'ponytail'
  | 'twin_buns'
  | 'boy_1'
  | 'boy_2'
  | 'boy_3'
  | 'boy_4'
  | 'hero_wave';

export type HairFrontStyle = 'air_bangs' | 'side_sweep' | 'curtain' | 'neat_fringe';

export type EyeStyle =
  | 'bright'
  | 'gentle'
  | 'sparkle'
  | 'heroic'
  | 'cool'
  | 'happy_arc'
  | 'joy_xd'
  | 'wink';

export type ExpressionStyle =
  | 'sweet_smile'
  | 'joy_open'
  | 'cat_w'
  | 'gentle_o'
  | 'confident'
  | 'pout';

export type TopStyle =
  | 'sailor_blouse'
  | 'knit_sweater'
  | 'hoodie'
  | 'sundress'
  | 'cardigan_vest'
  | 'office_male'
  | 'office_female'
  | 'varsity_jacket'
  | 'raglan_clover'
  | 'star_sweater'
  | 'ribbon_blouse'
  | 'pinafore_dress'
  | 'bunny_hoodie'
  | 'zip_parka'
  | 'safari_shirt'
  | 'sport_raglan'
  | 'casual_shirt';

export type BottomStyle =
  | 'pleated_skirt'
  | 'denim_shorts'
  | 'wide_trousers'
  | 'midi_skirt'
  | 'office_trousers'
  | 'office_skirt'
  | 'cargo_shorts'
  | 'sport_shorts'
  | 'a_line_skirt';

export type ShoeStyle = 'sneakers' | 'mary_janes' | 'boots' | 'loafers';

export type HeadItemStyle =
  | 'none'
  | 'beret'
  | 'sunhat'
  | 'cap'
  | 'beanie'
  | 'bucket_hat'
  | 'cat_ears'
  | 'flower_crown'
  | 'ribbon_bow'
  | 'hair_clip'
  | 'flower_pin';

export type AccessoryStyle =
  | 'none'
  | 'glasses'
  | 'sunglasses'
  | 'scarf'
  | 'pearl_necklace';

export type HandheldStyle =
  | 'none'
  | 'milk_tea'
  | 'plush_bear'
  | 'flower_bouquet'
  | 'tote_bag'
  | 'mini_umbrella';

export type AvatarPose =
  | 'idle'
  | 'walk'
  | 'creep'
  | 'jump'
  | 'sit'
  | 'bath'
  | 'sleep'
  | 'fish_cast'
  | 'fish_wait'
  | 'fish_pull'
  | 'net_swing'
  | 'play_pet'
  | 'parachute'
  | 'skate_idle'
  | 'skate_ride'
  | 'skate_push'
  | 'bike_idle'
  | 'bike_ride'
  | 'swim'
  | 'climb';

export interface AvatarConfig {
  name: string;
  skinTone: string;
  hairBack: HairBackStyle;
  hairFront: HairFrontStyle;
  hairColor: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  expression: ExpressionStyle;
  blush?: boolean;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoes: ShoeStyle;
  shoeColor: string;
  headItem: HeadItemStyle;
  headItemColor: string;
  accessory: AccessoryStyle;
  accessoryColor: string;
  handheld: HandheldStyle;
  handheldColor: string;
  mascotCostume?: 'peppa_pig';
}

export interface AvatarPreset {
  id: string;
  label: string;
  config: Omit<AvatarConfig, 'name'>;
}

export type ShopCategory =
  | 'tops'
  | 'bottoms'
  | 'hair'
  | 'face'
  | 'head'
  | 'accessories'
  | 'shoes'
  | 'handheld';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  price: number;
  patch: Partial<AvatarConfig>;
}

export type CropType =
  | 'wheat'
  | 'scallion'
  | 'rice'
  | 'carrot'
  | 'corn'
  | 'strawberry'
  | 'vanilla'
  | 'tomato'
  | 'lemon'
  | 'sugarcane'
  | 'watermelon'
  | 'pumpkin'
  | 'cacao'
  | 'coffee';

export type PlotStage = 'empty' | 'growing' | 'ready';

export type PlotLevel = 1 | 2 | 3;

export interface GardenPlotState {
  id: number;
  level: PlotLevel;
  stage: PlotStage;
  crop: CropType | null;
  watered: boolean;
  hasPest: boolean;
  hasWeed: boolean;
  pestRolled: boolean;
  plantedAt: number | null;
  readyAt: number | null;
  durationMs: number;
}

export type CoopKind = 'poultry' | 'cattle';

export type AnimalType = 'chicken' | 'duck' | 'pig' | 'cow';

export type AnimalProduceId = 'chicken_egg' | 'duck_egg' | 'pork' | 'milk';

export type AnimalLifecycleStage = 'baby' | 'adult' | 'retired';

export interface LivestockAnimalState {
  id: string;
  type: AnimalType;
  coop: CoopKind;
  name: string;
  stage: AnimalLifecycleStage;
  boughtAt: number;
  growRemainingMs: number;
  growDurationMs: number;
  activeRemainingMs: number; // 3 days poultry / 4 days cattle after reaching adult
  activeDurationMs: number;
  mealsRemaining: number; // Eats ~2 times across whole lifespan
  nextMealElapsedMs: number;
  hunger: number; // 0..100
  sick: boolean;
  hasProduce: boolean;
  produceRemainingMs: number;
  produceCycleMs: number;
  lastTickAt: number;
}

export interface CoopTroughs {
  poultry: number;
  cattle: number;
}

export type PondFishSpecies = 'fish_12h' | 'duck_24h' | 'turtle_48h';

export interface PondFishState {
  id: string;
  species: PondFishSpecies;
  stage: 'growing' | 'ready';
  stockedAt: number;
  remainingMs: number;
  totalDurationMs: number;
  hunger: number; // 0..100
  sick: boolean;
  lastCareCheckAt: number;
  lastTickAt: number;
}

export interface FarmSupplies {
  bugSpray: number; // 2 Xu / bình
  animalFeed: number; // 2 Xu / túi
  animalMedicine: number;
  fishFeed: number; // 5 Xu / túi (cho 3-4 con ăn)
  fishMedicine: number;
}

export interface WellWaterState {
  stored: number; // Nước đang tích trong giếng (0..50)
  lastTickAt: number; // Mốc thời gian cộng nước gần nhất
}

export type ProcessedId =
  | 'brown_sugar'
  | 'cane_syrup'
  | 'flour'
  | 'rice_noodle'
  | 'berry_jam'
  | 'roasted_coffee'
  | 'cacao_powder'
  | 'cheese'
  | 'fresh_cream';

export type RecipeId =
  | 'sugarcane_juice'
  | 'watermelon_juice'
  | 'watermelon_smoothie'
  | 'honey_lemonade'
  | 'strawberry_tea'
  | 'pumpkin_smoothie'
  | 'corn_milk'
  | 'hot_cacao'
  | 'milk_coffee'
  | 'vanilla_iced_coffee'
  | 'butter_bread'
  | 'strawberry_cake'
  | 'pumpkin_pie'
  | 'egg_tart'
  | 'duck_egg_flan'
  | 'vanilla_flan'
  | 'panna_cotta'
  | 'cacao_brownie'
  | 'berry_cheesecake'
  | 'carrot_soup'
  | 'tomato_pasta'
  | 'glazed_carrot'
  | 'pork_pho'
  | 'corn_fried_rice'
  | 'cheese_omelet'
  | 'salted_duck_porridge'
  | 'roasted_pork_corn';

export type FarmItemKind = 'crop' | 'animal_product' | 'processed' | 'dish';

export type KitchenLevel = 1 | 2 | 3;

export interface MillJob {
  id: string;
  processedId: ProcessedId;
  startedAt: number;
  readyAt: number;
  durationMs: number;
}

export interface CookingJob {
  id: string;
  recipeId: RecipeId;
  startedAt: number;
  readyAt: number;
  durationMs: number;
}

export interface FarmInventory {
  seeds: Partial<Record<CropType, number>>;
  crops: Partial<Record<CropType, number>>;
  animalProducts: Partial<Record<AnimalProduceId, number>>;
  processed: Partial<Record<ProcessedId, number>>;
  dishes: Partial<Record<RecipeId, number>>;
  supplies: FarmSupplies;
}

export interface FarmOrderRequirement {
  kind: FarmItemKind;
  id: string;
  qty: number;
}

export interface FarmOrder {
  id: string;
  customerName: string;
  title: string;
  requirements: FarmOrderRequirement[];
  rewardCoins: number;
}

export interface GameStats {
  coins: number;
  energy: number; // 0..100
  mood: number; // 0..100
  hunger: number; // 0..100 (satiety / độ no)
}

export type BbqFoodId =
  | 'bbq_meat_skewer'
  | 'bbq_grilled_fish'
  | 'bbq_corn_sausage'
  | 'drink_water'
  | 'drink_strawberry_milk'
  | 'drink_matcha_can'
  | 'drink_cola';

export interface BbqFoodDefinition {
  id: BbqFoodId;
  name: string;
  price: number;
  hungerRestore: number;
  holdable: true;
  kind?: 'food' | 'drink';
  accentColor: string;
  description: string;
}

export interface DailyQuestProgress {
  date: string;
  tasks: {
    garden: boolean;
    fishing: boolean;
    dressup: boolean;
  };
  claimed: {
    garden: boolean;
    fishing: boolean;
    dressup: boolean;
  };
}

export type FurnitureCategory =
  | 'tet'
  | 'xmas'
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'bath'
  | 'wall'
  | 'decor'
  | 'paint';

export type FurnitureKind =
  | 'sofa'
  | 'armchair'
  | 'coffee_table'
  | 'tv_stand'
  | 'table_tv'
  | 'rug_round'
  | 'bed'
  | 'wardrobe'
  | 'nightstand'
  | 'bookshelf'
  | 'wooden_table'
  | 'wooden_chair'
  | 'dining_table'
  | 'dining_chair'
  | 'fridge'
  | 'dish_cabinet'
  | 'kitchen_l_counter'
  | 'floor_lamp'
  | 'table_lamp'
  | 'wall_lamp'
  | 'potted_plant'
  | 'plant_fiddle'
  | 'plant_snake'
  | 'flower_basket'
  | 'bathtub'
  | 'vanity_sink'
  | 'window_single'
  | 'window_double'
  | 'window_curtain'
  | 'wall_clock'
  | 'wall_calendar'
  | 'wall_calendar_tet'
  | 'tet_couplets'
  | 'tet_mai_pot'
  | 'tet_peach_pot'
  | 'tet_tea_table'
  | 'tet_chair'
  | 'tet_five_fruit_tray'
  | 'tet_banh_chung'
  | 'tet_lantern_lamp'
  | 'tet_rug_red'
  | 'tet_vase_blossom'
  | 'tet_flower_wreath'
  | 'tea_set_ceramic'
  | 'xmas_tree'
  | 'xmas_snowman'
  | 'xmas_wreath'
  | 'xmas_gift_boxes'
  | 'moon_lamp'
  | 'bonsai_zen'
  | 'vinyl_corner'
  | 'succulent_shelf'
  | 'wall_tv'
  | 'microwave'
  | 'mini_oven'
  | 'floor_paint'
  | 'wall_paint';

export type PaintPattern =
  | 'wood_plank'
  | 'checker_tile'
  | 'terrazzo'
  | 'matte_wainscot'
  | 'stripes'
  | 'polka_dot';

export interface PaintStyleSpec {
  target: 'floor' | 'wall';
  pattern: PaintPattern;
  primary: string;
  secondary: string;
  roughness?: number;
}

export interface FurnitureCatalogItem {
  id: string;
  kind: FurnitureKind;
  category: FurnitureCategory;
  name: string;
  price: number;
  color: string;
  accentColor?: string;
  halfW: number;
  halfD: number;
  walkable?: boolean;
  wallMount?: boolean;
  mountHeight?: number;
  surfaceHeight?: number;
  paintSpec?: PaintStyleSpec;
  interactive?: 'wardrobe' | 'bed' | 'sofa' | 'bathtub' | 'lamp' | 'microwave' | 'mini_oven';
}

export interface PlacedFurniture {
  instanceId: string;
  catalogId: string;
  x: number;
  z: number;
  y?: number;
  rotY: number;
}

export type ToolId = 'wooden_rod' | 'wooden_net';

export interface FishingRodState {
  owned: boolean;
  equipped: boolean;
  durability: number;
  maxDurability: number;
}

export interface BugNetState {
  owned: boolean;
  equipped: boolean;
  durability: number;
  maxDurability: number;
}

export interface WoodenBoatState {
  owned: boolean;
  purchasedAt: number | null;
}

export type FishWaterType = 'river' | 'sea';

export type FishRarity = 'common' | 'rare';

export type FishingPhase = 'idle' | 'casting' | 'waiting' | 'nibbling' | 'bite' | 'pulling';

export type RiverFishSpeciesId =
  | 'tom_cang_xanh'
  | 'ca_loc'
  | 'ca_chep'
  | 'ca_com'
  | 'ca_chinh'
  | 'ca_ro_dong'
  | 'ca_tre_vang'
  | 'ca_la_han'
  | 'ca_lia_thia_3_duoi'
  | 'ca_heo_nuoc_ngot'
  | 'ca_tai_tuong_do'
  | 'ca_rong_bac'
  | 'ca_tam_song';

export type SeaFishSpeciesId =
  | 'ca_he'
  | 'sua_bien'
  | 'sao_bien'
  | 'ca_noc_gai'
  | 'bach_tuoc'
  | 'ca_thu_xanh'
  | 'ca_ngua'
  | 'tom_hum_do'
  | 'ca_duoi_dom'
  | 'rua_bien'
  | 'so_tai_tuong'
  | 'ca_voi_xanh';

export type FishSpeciesId = RiverFishSpeciesId | SeaFishSpeciesId;

export interface FishSpeciesDefinition {
  id: FishSpeciesId;
  name: string;
  waterType: FishWaterType;
  rarity: FishRarity;
  minKg: number;
  maxKg: number;
  basePrice: number;
  pricePerKg: number;
  dropWeight: number;
  description: string;
}

export interface CaughtFishItem {
  id: string;
  speciesId: FishSpeciesId;
  waterType: FishWaterType;
  weightKg: number;
  sellPrice: number;
  locked: boolean;
  caughtAt: number;
}

export interface FishDexRecord {
  caughtCount: number;
  maxWeightKg: number;
}

export type InsectRarity = 'common' | 'rare';

export type InsectHabitat = 'flower' | 'bush' | 'tree' | 'rock' | 'water_edge';

export type InsectShapeKind =
  | 'butterfly'
  | 'moth'
  | 'beetle'
  | 'horned_beetle'
  | 'ladybug'
  | 'bee'
  | 'dragonfly'
  | 'cicada'
  | 'grasshopper'
  | 'mantis'
  | 'firefly'
  | 'stinkbug';

export type InsectSpeciesId =
  | 'buom_trang'
  | 'buom_phuong_xanh'
  | 'buom_duoi_nhan'
  | 'bo_rua_do'
  | 'ong_mat_vang'
  | 'chuon_chuon_ot'
  | 'chuon_chuon_tre'
  | 've_sau'
  | 've_sau_kim'
  | 'bo_vo_si_cay'
  | 'bo_sung_huou_nui'
  | 'ngai_vo_cay'
  | 'bo_xit_xanh'
  | 'chau_chau_dong'
  | 'bo_ngua_xanh'
  | 'dom_dom_dem'
  | 'canh_cam_ngoc'
  | 'bo_te_giac'
  | 'bo_kep_kim'
  | 'ngai_mat_trang'
  | 'buom_hoang_de';

export interface InsectSpeciesDefinition {
  id: InsectSpeciesId;
  name: string;
  rarity: InsectRarity;
  habitat: InsectHabitat;
  shapeKind: InsectShapeKind;
  minMm: number;
  maxMm: number;
  basePrice: number;
  pricePerMm: number;
  dropWeight: number;
  primaryColor: string;
  accentColor: string;
  wingColor: string;
  description: string;
}

export interface CaughtInsectItem {
  id: string;
  speciesId: InsectSpeciesId;
  lengthMm: number;
  sellPrice: number;
  locked: boolean;
  caughtAt: number;
}

export interface InsectDexRecord {
  caughtCount: number;
  maxLengthMm: number;
}

export type PetMoveType = 'walk' | 'fly';

export type PetHoldMode = 'walk_orbit' | 'fly_orbit';

export type PetSpeciesId =
  | 'brown_puppy'
  | 'blue_bird'
  | 'shiba_puppy'
  | 'chinese_cat'
  | 'mischievous_parrot';

export interface PetSpeciesDefinition {
  id: PetSpeciesId;
  name: string;
  moveType: PetMoveType;
  price: number;
  canHold: boolean;
  holdMode: PetHoldMode;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export interface OwnedPetState {
  id: string;
  speciesId: PetSpeciesId;
  name: string;
  intimacyLevel: number;
  intimacyXp: number;
  hunger: number; // 0..100 (100 = full, drops over time; feed only when hungry)
  happiness: number; // 0..100 (100 = joyful, drops over time; play boosts +1 intimacy only when reduced)
  sick: boolean;
  lastTickAt: number;
  adoptedAt: number;
}

export type PetSupplyId = 'petFood' | 'petMedicine' | 'intimacyTest';

export interface PetSupplies {
  petFood: number;
  petMedicine: number;
  intimacyTest: number;
}

export type MountRank = 'B' | 'S';

export type MountKind = 'skateboard' | 'bicycle';

export type MountId = 'skateboard_classic' | 'bicycle_classic';

export interface MountSkinPalette {
  primary: string;
  secondary: string;
  accent: string;
  trim: string;
  wheelOrTire: string;
}

export interface MountDefinition {
  id: MountId;
  kind: MountKind;
  rank: MountRank;
  name: string;
  price: number;
  speedMultiplier: number;
  description: string;
  palette: MountSkinPalette;
}

export interface OwnedMountsState {
  ownedIds: MountId[];
  activeMountId: MountId | null;
  lastMountId: MountId | null;
}



