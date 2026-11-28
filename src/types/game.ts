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

export type BoxHeadSkinId =
  | 'classic_carton'
  | 'cream_cube'
  | 'parcel_love'
  | 'tv_screen'
  | 'cat_box'
  | 'bunny_box'
  | 'frog_box'
  | 'panda_box'
  | 'student_milk'
  | 'witch_rune'
  | 'pompom_box'
  | 'hero_visor'
  | 'midautumn_lantern';

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
  | 'hero_wave'
  | 'witch_bob'
  | 'midautumn_buns'
  | 'midautumn_spiky'
  | 'student_braids';

export type HairFrontStyle = 'air_bangs' | 'side_sweep' | 'curtain' | 'neat_fringe';

export type EyeStyle =
  | 'bright'
  | 'gentle'
  | 'sparkle'
  | 'heroic'
  | 'cool'
  | 'happy_arc'
  | 'joy_xd'
  | 'wink'
  | 'box_dot'
  | 'box_pixel'
  | 'box_heart'
  | 'box_sleepy';

export type ExpressionStyle =
  | 'sweet_smile'
  | 'joy_open'
  | 'cat_w'
  | 'gentle_o'
  | 'confident'
  | 'pout'
  | 'box_zigzag'
  | 'box_blep'
  | 'box_triangle';

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
  | 'casual_shirt'
  | 'panda_pajama'
  | 'denim_overalls'
  | 'puffer_jacket'
  | 'coin_tunic'
  | 'ao_dai_lotus'
  | 'ao_dai_peach'
  | 'ao_dai_white'
  | 'ao_dai_nam'
  | 'lolita_dress'
  | 'trench_coat'
  | 'academy_blazer'
  | 'bomber_jacket'
  | 'turtleneck_sweater'
  | 'hawaii_shirt'
  | 'picnic_dress'
  | 'picnic_shirt'
  | 'vampire_prince_coat'
  | 'vampire_lady_dress'
  | 'goose_pinafore_dress'
  | 'goose_raglan_tee'
  | 'pompom_pajama_shirt'
  | 'pompom_sleep_dress'
  | 'witch_cat_dress'
  | 'midautumn_girl_top'
  | 'midautumn_boy_top';

export type BottomStyle =
  | 'pleated_skirt'
  | 'denim_shorts'
  | 'wide_trousers'
  | 'midi_skirt'
  | 'office_trousers'
  | 'office_skirt'
  | 'cargo_shorts'
  | 'sport_shorts'
  | 'a_line_skirt'
  | 'pajama_pants'
  | 'overalls_pants'
  | 'tunic_pants'
  | 'cloud_shorts'
  | 'silk_culottes'
  | 'tiered_lace_skirt'
  | 'cargo_pants'
  | 'plaid_skirt'
  | 'flare_jeans'
  | 'picnic_chinos'
  | 'vampire_slit_pants'
  | 'goose_puff_shorts'
  | 'pompom_pajama_pants'
  | 'witch_cat_skirt'
  | 'midautumn_bloomers'
  | 'midautumn_boy_pants';

export type ShoeStyle =
  | 'sneakers'
  | 'mary_janes'
  | 'boots'
  | 'loafers'
  | 'crocs_fish'
  | 'crocs_panda'
  | 'crocs_chick'
  | 'crocs_frog'
  | 'crocs_bunny'
  | 'crocs_dino'
  | 'platform_sneakers'
  | 'ribbon_heels'
  | 'rain_boots'
  | 'vampire_buckle_boots'
  | 'goose_slippers'
  | 'pompom_slippers'
  | 'witch_mary_janes'
  | 'midautumn_girl_boots'
  | 'midautumn_boy_boots'
  | 'student_mary_socks'
  | 'student_loafers';

export type HeadItemStyle =
  | 'none'
  | 'beret'
  | 'sunhat'
  | 'cap'
  | 'beanie'
  | 'cc_beanie'
  | 'bucket_hat'
  | 'frog_bucket'
  | 'chick_hat'
  | 'cloud_bucket'
  | 'rainbow_cap'
  | 'angel_halo'
  | 'cat_ears'
  | 'flower_crown'
  | 'ribbon_bow'
  | 'non_la'
  | 'khan_dong'
  | 'bunny_beanie'
  | 'royal_crown'
  | 'headphone'
  | 'picnic_bonnet'
  | 'vampire_giant_bow'
  | 'sunflower_hat'
  | 'pompom_sleep_mask'
  | 'pompom_ear_hood'
  | 'witch_giant_bow'
  | 'hair_boy_messy'
  | 'hair_boy_spiky'
  | 'hair_boy_sidepart'
  | 'hair_boy_curtain_black'
  | 'hair_boy_fluffy'
  | 'hair_boy_layered'
  | 'hair_boy_wolf'
  | 'hair_boy_ash_violet'
  | 'hair_boy_comma'
  | 'hair_boy_curl'
  | 'hair_boy_flame'
  | 'hair_boy_buzz'
  | 'hair_boy_slick'
  | 'hair_girl_bob'
  | 'hair_girl_flower_pink'
  | 'hair_girl_twin_buns'
  | 'hair_girl_side_pony'
  | 'hair_girl_wavy_daisy'
  | 'hair_girl_straight_clip'
  | 'hair_girl_high_pony'
  | 'hair_girl_pink_wave'
  | 'hair_girl_lavender_flower'
  | 'hair_girl_twin_tails'
  | 'hair_girl_white_band'
  | 'hair_girl_twin_braids'
  | 'hair_girl_side_braid'
  | 'hair_girl_white_bow'
  | 'bunny_hood_hat'
  | 'hair_cat_ears_brown'
  | 'panda_hood_hat'
  | 'frog_hood_hat';

export type AccessoryStyle =
  | 'none'
  | 'glasses'
  | 'sunglasses'
  | 'scarf'
  | 'pearl_necklace'
  | 'star_glasses'
  | 'pearl_ribbon_choker'
  | 'camera_strap'
  | 'vampire_cross_earring';

export type BackpackStyle =
  | 'none'
  | 'fish_plush'
  | 'lamb_plush'
  | 'chick_plush'
  | 'bee_plush'
  | 'honey_bear'
  | 'carrot_basket'
  | 'angel_wings'
  | 'bunny_plush'
  | 'strawberry_bear'
  | 'astro_pack'
  | 'crystal_wings'
  | 'goose_cross_bag'
  | 'student_bag_gingham'
  | 'student_bag_brown'
  | 'student_bag_navy';

export type HandheldStyle =
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
  | 'doll_mimi_bunny'
  | 'doll_coco_bear'
  | 'doll_pepe_frog'
  | 'doll_boba_capy'
  | 'doll_lulu_sheep'
  | 'doll_pipi_duck'
  | 'doll_labu_mint'
  | 'doll_baby3_berry'
  | 'doll_luna_kuromi'
  | 'doll_secret_doraemon';

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
  | 'lotus_idle'
  | 'lotus_ride'
  | 'broom_idle'
  | 'broom_ride'
  | 'swim'
  | 'climb'
  | 'happy_jump';

export interface AvatarConfig {
  name: string;
  skinTone: string;
  boxHeadSkin: BoxHeadSkinId;
  boxHeadColor: string;
  hairBack?: HairBackStyle;
  hairFront?: HairFrontStyle;
  hairColor?: string;
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
  backpack?: BackpackStyle;
  backpackColor?: string;
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
  | 'backpacks'
  | 'shoes'
  | 'handheld';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  price: number;
  patch: Partial<AvatarConfig>;
  blindboxOnly?: boolean;
}

export interface ShopSet {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  itemIds: string[];
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

export type ArcadeHubSection = 'overview' | 'blindbox' | 'games';

export type ArcadeGameId =
  | 'whack_mole'
  | 'catch_stars'
  | 'claw_ball'
  | 'rhythm_dance'
  | 'pc_games'
  | 'parkour_climb'
  | 'obstacle_rush';

export interface GameStats {
  coins: number;
  coinGame: number;
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

export type DailyQuestKey =
  | 'garden'
  | 'livestock'
  | 'fishing'
  | 'insects'
  | 'cooking'
  | 'pet'
  | 'decor'
  | 'delivery';

export interface DailyQuestProgress {
  date: string;
  tasks: Record<DailyQuestKey, boolean>;
  claimed: Record<DailyQuestKey, boolean>;
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
  | 'white_desk'
  | 'white_study_chair'
  | 'office_swivel_chair'
  | 'study_laptop'
  | 'desktop_pc_set'
  | 'wall_pinboard'
  | 'study_desk_lamp'
  | 'pen_holder'
  | 'art_supply_rack'
  | 'pencil_case'
  | 'book_stack'
  | 'open_book'
  | 'headphone_stand'
  | 'table_snack_tray'
  | 'cozy_fireplace'
  | 'fish_aquarium'
  | 'beanbag_chair'
  | 'cat_tree_tower'
  | 'wall_gallery_frames'
  | 'wall_mirror_arch'
  | 'plush_bear_giant'
  | 'coffee_maker_bar'
  | 'toast_toaster_set'
  | 'piano_keyboard'
  | 'record_shelf_cabinet'
  | 'terrace_swing_egg'
  | 'bed_pompompurin'
  | 'shelf_pompompurin'
  | 'stool_pompompurin'
  | 'pudding_flan_plate'
  | 'wall_lamp_pompompurin'
  | 'vampire_coffin_sofa'
  | 'candelabra_gothic'
  | 'picnic_gingham_set'
  | 'doll_shelf_small'
  | 'doll_shelf_large'
  | 'aquarium_small'
  | 'aquarium_large'
  | 'insect_display_small'
  | 'insect_display_large'
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

export type FurnitureDisplayKind = 'doll' | 'fish' | 'insect';

export interface FurnitureDisplayItem {
  slotIndex: number;
  kind: FurnitureDisplayKind;
  itemId: string;
  metric?: number;
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
  displayCapacity?: number;
  interactive?:
    | 'wardrobe'
    | 'bed'
    | 'sofa'
    | 'bathtub'
    | 'lamp'
    | 'microwave'
    | 'mini_oven'
    | 'doll_display'
    | 'aquarium_display'
    | 'insect_display';
}

export interface PlacedFurniture {
  instanceId: string;
  catalogId: string;
  x: number;
  z: number;
  y?: number;
  rotY: number;
  displayItems?: FurnitureDisplayItem[];
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

export type BoatId =
  | 'wooden_boat'
  | 'duck_boat'
  | 'swan_princess_boat'
  | 'pirate_galleon_boat'
  | 'speedboat_retro'
  | 'lotus_lantern_boat';

export interface WoodenBoatState {
  owned: boolean;
  purchasedAt: number | null;
}

export interface BoatsState {
  ownedIds: BoatId[];
  activeBoatId: BoatId;
  purchasedAt: Partial<Record<BoatId, number>>;
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
  | 'black_cat'
  | 'moonlight_cat'
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

export type MountRank = 'B' | 'A' | 'S';

export type MountKind =
  | 'skateboard'
  | 'bicycle'
  | 'lotus_umbrella'
  | 'dong_thap_lotus'
  | 'witch_broom';

export type MountId =
  | 'skateboard_classic'
  | 'bicycle_classic'
  | 'lotus_umbrella'
  | 'dong_thap_lotus'
  | 'witch_broom';

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
  currency?: 'coins' | 'coinGame';
  coinGamePrice?: number;
  speedMultiplier: number;
  description: string;
  palette: MountSkinPalette;
}

export interface OwnedMountsState {
  ownedIds: MountId[];
  activeMountId: MountId | null;
  lastMountId: MountId | null;
}

export interface CheckInState {
  completedDays: number; // 0..7 in current 7-day cycle
  lastClaimDate: string | null; // YYYY-MM-DD
}

export type FarmDecorCategory =
  | 'all'
  | 'fence'
  | 'garden'
  | 'landmark'
  | 'relax';

export type FarmDecorKind =
  | 'farm_fence_white'
  | 'farm_fence_ranch'
  | 'farm_hay_bale'
  | 'farm_scarecrow'
  | 'farm_flower_cart'
  | 'farm_garden_bench'
  | 'farm_lantern_post'
  | 'farm_signpost'
  | 'farm_sunflower_barrel'
  | 'farm_picnic_blanket'
  | 'farm_floral_arch'
  | 'farm_mini_windmill'
  | 'farm_stone_well'
  | 'farm_birdbath_fountain'
  | 'farm_wooden_pergola'
  | 'farm_pumpkin_patch'
  | 'farm_beehive_stand'
  | 'farm_watering_trough'
  | 'farm_duck_pond_mini'
  | 'farm_mailbox_cute'
  | 'farm_hammock_stand'
  | 'farm_tractor_decor';

export interface FarmDecorCatalogItem {
  id: string;
  kind: FarmDecorKind;
  category: Exclude<FarmDecorCategory, 'all'>;
  name: string;
  price: number;
  color: string;
  accentColor: string;
  halfW: number;
  halfD: number;
  walkable?: boolean;
  description: string;
}

export interface PlacedFarmDecor {
  instanceId: string;
  catalogId: string;
  x: number;
  z: number;
  rotY: number;
}

export type JoyboyTargetNpcId =
  | 'koi'
  | 'ship'
  | 'tina'
  | 'bob'
  | 'ivan'
  | 'tun'
  | 'peppa'
  | 'cafe';

export interface JoyboyDeliveryOrder {
  id: string;
  targetNpcId: JoyboyTargetNpcId;
  targetNpcName: string;
  locationHint: string;
  parcelName: string;
  rewardCoins: number;
  createdAt: number;
}

export interface JoyboyDeliveryState {
  date: string;
  completedCount: number; // max 2 / day
  activeOrder: JoyboyDeliveryOrder | null;
}

export type ActionId = 'happy';

export interface PlayerActionDefinition {
  id: ActionId;
  name: string;
  description: string;
  durationSec: number;
  accentColor: string;
  bgTint: string;
}

export interface PlayerActionsState {
  ownedIds: ActionId[];
  equippedSlots: (ActionId | null)[];
}

export interface PlayerLevelState {
  level: number; // 1..100
  exp: number; // current EXP within current level
  totalExp: number;
  claimedMilestones: number[]; // e.g. [10, 30, 50]
}

export interface OnlinePlayerMeta {
  id: string;
  accountId: string;
  username?: string | null;
  name: string;
  level: number;
  joinedAt: number;
  zone: ZoneId;
  avatar: AvatarConfig;
  activeMountId: MountId | null;
  equippedTool: ToolId | null;
  equippedFood: BbqFoodId | null;
  carriedPet: {speciesId: PetSpeciesId; sick: boolean} | null;
  companionPet: {
    id: string;
    speciesId: PetSpeciesId;
    name: string;
    sick: boolean;
    isMax: boolean;
  } | null;
  updatedAt: number;
}

export interface OnlinePlayerPosePacket {
  id: string;
  seq: number;
  t: number;
  zone: ZoneId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotY: number;
  rotX: number;
  pose: AvatarPose;
  poseProgress: number;
  speed: number;
  mallFloor: 1 | 2;
  boat?: {
    active: boolean;
    boatId: BoatId;
    x: number;
    z: number;
    rotY: number;
    moving?: boolean;
  } | null;
  pet?: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    moving: boolean;
    playKind: 'none' | 'jump' | 'circle';
  } | null;
}

export interface OnlinePlayerState {
  meta: OnlinePlayerMeta;
  pose: OnlinePlayerPosePacket | null;
  lastSeenAt: number;
}

export interface CoinGiftEvent {
  txId: string;
  fromPlayerId: string;
  fromAccountId: string;
  fromUsername?: string | null;
  fromName: string;
  toPlayerId: string;
  toAccountId?: string;
  toUsername?: string | null;
  toName: string;
  currency: 'coins' | 'coinGame';
  amount: number;
  sentAt: number;
}

