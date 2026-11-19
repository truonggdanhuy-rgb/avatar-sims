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
  | 'boy_3';

export type HairFrontStyle = 'air_bangs' | 'side_sweep' | 'curtain' | 'neat_fringe';

export type EyeStyle = 'starry' | 'almond' | 'cheerful' | 'cozy';

export type ExpressionStyle = 'smile' | 'grin' | 'cat' | 'calm';

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
  | 'cat_ears'
  | 'flower_crown'
  | 'ribbon_bow';

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

export type AvatarPose = 'idle' | 'walk' | 'sit' | 'sleep';

export interface AvatarConfig {
  name: string;
  skinTone: string;
  hairBack: HairBackStyle;
  hairFront: HairFrontStyle;
  hairColor: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  expression: ExpressionStyle;
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

export type CropType = 'strawberry' | 'sunflower' | 'carrot';

export interface GardenPlotState {
  id: number;
  stage: 'empty' | 'planted' | 'watered' | 'ready';
  crop: CropType | null;
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

export type FurnitureCategory = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'wall' | 'decor';

export type FurnitureKind =
  | 'sofa'
  | 'armchair'
  | 'coffee_table'
  | 'tv_stand'
  | 'rug_round'
  | 'bed'
  | 'wardrobe'
  | 'nightstand'
  | 'bookshelf'
  | 'dining_table'
  | 'dining_chair'
  | 'fridge'
  | 'dish_cabinet'
  | 'floor_lamp'
  | 'potted_plant'
  | 'bathtub'
  | 'vanity_sink'
  | 'window_single'
  | 'window_double'
  | 'window_curtain'
  | 'wall_clock';

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
  interactive?: 'wardrobe' | 'bed' | 'sofa';
}

export interface PlacedFurniture {
  instanceId: string;
  catalogId: string;
  x: number;
  z: number;
  rotY: number;
}

