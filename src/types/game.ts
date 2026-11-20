export type ZoneId =
  | 'town'
  | 'home'
  | 'garden'
  | 'fishing'
  | 'arcade'
  | 'boutique';

export type TimeOfDay = 'morning' | 'sunset' | 'night';

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
  | 'boy_4';

export type HairFrontStyle = 'air_bangs' | 'side_sweep' | 'curtain' | 'neat_fringe';

export type EyeStyle = 'starry' | 'almond' | 'cheerful' | 'cozy' | 'squint' | 'wink';

export type ExpressionStyle = 'smile' | 'grin' | 'cat' | 'calm' | 'smirk' | 'bashful';

export type TopStyle =
  | 'sailor_blouse'
  | 'knit_sweater'
  | 'hoodie'
  | 'sundress'
  | 'cardigan_vest';

export type BottomStyle =
  | 'pleated_skirt'
  | 'denim_shorts'
  | 'wide_trousers'
  | 'midi_skirt';

export type ShoeStyle = 'sneakers' | 'mary_janes' | 'boots' | 'loafers';

export type HeadItemStyle =
  | 'none'
  | 'beret'
  | 'sunhat'
  | 'cap'
  | 'beanie'
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
  | 'jump'
  | 'sit'
  | 'sleep'
  | 'fish_cast'
  | 'fish_wait'
  | 'fish_pull';

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
  | 'succulent_shelf'
  | 'wall_tv'
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
  interactive?: 'wardrobe' | 'bed' | 'sofa';
}

export interface PlacedFurniture {
  instanceId: string;
  catalogId: string;
  x: number;
  z: number;
  y?: number;
  rotY: number;
}

export type ToolId = 'wooden_rod';

export interface FishingRodState {
  owned: boolean;
  equipped: boolean;
  durability: number;
  maxDurability: number;
}

export type FishWaterType = 'river' | 'sea';

export type FishRarity = 'common' | 'rare';

export type FishingPhase = 'idle' | 'casting' | 'waiting' | 'nibbling' | 'bite';

export type RiverFishSpeciesId =
  | 'tom_cang_xanh'
  | 'ca_loc'
  | 'ca_chep'
  | 'ca_com'
  | 'ca_chinh'
  | 'ca_la_han'
  | 'ca_lia_thia_3_duoi'
  | 'ca_heo_nuoc_ngot';

export interface FishSpeciesDefinition {
  id: RiverFishSpeciesId;
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
  speciesId: RiverFishSpeciesId;
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



