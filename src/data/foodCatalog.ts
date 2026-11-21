import {BbqFoodDefinition, BbqFoodId, GameStats} from '../types/game';

export const BBQ_FOOD_LIST: BbqFoodDefinition[] = [
  {
    id: 'bbq_meat_skewer',
    name: 'Xiên Thịt Nướng BBQ',
    price: 17,
    hungerRestore: 25,
    holdable: true,
    kind: 'food',
    accentColor: '#C9562C',
    description: 'Thịt ba chỉ tẩm mật ong xiên que nướng cùng ớt chuông thơm lừng.',
  },
  {
    id: 'bbq_grilled_fish',
    name: 'Cá Nướng Lá Chuối',
    price: 20,
    hungerRestore: 30,
    holdable: true,
    kind: 'food',
    accentColor: '#4E8F4B',
    description: 'Cá sông tươi cuộn lá chuối nướng than hoa vàng giòn béo ngậy.',
  },
  {
    id: 'bbq_corn_sausage',
    name: 'Bắp & Xúc Xích Nướng',
    price: 14,
    hungerRestore: 20,
    holdable: true,
    kind: 'food',
    accentColor: '#E5A932',
    description: 'Bắp ngọt phết bơ kèm xúc xích nướng nóng hổi cầm tay cực tiện.',
  },
];

export const VENDING_DRINK_LIST: BbqFoodDefinition[] = [
  {
    id: 'drink_water',
    name: 'Nước Suối Mát',
    price: 5,
    hungerRestore: 7,
    holdable: true,
    kind: 'drink',
    accentColor: '#3BA3D6',
    description: 'Nước khoáng tinh khiết mát lạnh giúp giải khát tức thì.',
  },
  {
    id: 'drink_strawberry_milk',
    name: 'Sữa Dâu Hộp',
    price: 6,
    hungerRestore: 8,
    holdable: true,
    kind: 'drink',
    accentColor: '#E87398',
    description: 'Hộp sữa dâu ngọt dịu có ống hút xinh xắn cầm trên tay.',
  },
  {
    id: 'drink_matcha_can',
    name: 'Trà Xanh Matcha',
    price: 7,
    hungerRestore: 10,
    holdable: true,
    kind: 'drink',
    accentColor: '#56A463',
    description: 'Lon trà xanh matcha thanh mát ít đường tiếp thêm tỉnh táo.',
  },
  {
    id: 'drink_cola',
    name: 'Soda Cam Chanh',
    price: 8,
    hungerRestore: 11,
    holdable: true,
    kind: 'drink',
    accentColor: '#E46A2E',
    description: 'Lon soda có gas hương cam chanh sảng khoái trước sảnh Mall.',
  },
];

export const HANDHELD_CONSUMABLE_LIST: BbqFoodDefinition[] = [
  ...BBQ_FOOD_LIST,
  ...VENDING_DRINK_LIST,
];

export const BBQ_FOOD_CATALOG: Record<BbqFoodId, BbqFoodDefinition> = {
  bbq_meat_skewer: BBQ_FOOD_LIST[0],
  bbq_grilled_fish: BBQ_FOOD_LIST[1],
  bbq_corn_sausage: BBQ_FOOD_LIST[2],
  drink_water: VENDING_DRINK_LIST[0],
  drink_strawberry_milk: VENDING_DRINK_LIST[1],
  drink_matcha_can: VENDING_DRINK_LIST[2],
  drink_cola: VENDING_DRINK_LIST[3],
};

// Only warn and slow movement strictly when hunger drops below 5%
export const HUNGER_HUNGRY_THRESHOLD = 5;
export const HUNGER_NEAR_EMPTY_THRESHOLD = 5;
export const HUNGER_CRITICAL_THRESHOLD = 3;

export function createInitialBbqFoods(): Partial<Record<BbqFoodId, number>> {
  return {};
}

/**
 * Shared speed multiplier used for both walking and future mounts so hunger
 * slows the player consistently when hunger drops below 5%.
 */
export function getMovementSpeedMultiplier(stats: Pick<GameStats, 'hunger'>): number {
  const hunger = typeof stats.hunger === 'number' ? stats.hunger : 90;
  if (hunger < HUNGER_HUNGRY_THRESHOLD) {
    return hunger <= 0 ? 0.35 : 0.48;
  }
  return 1.0;
}
