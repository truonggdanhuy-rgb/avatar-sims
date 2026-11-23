export type MayCafeItemId =
  | 'cafe_milk_coffee'
  | 'cafe_latte_art'
  | 'cafe_peach_tea'
  | 'cafe_matcha_cream'
  | 'cafe_croissant_combo';

export interface MayCafeItemDef {
  id: MayCafeItemId;
  name: string;
  price: number;
  categoryLabel: string;
  energyRestore: number;
  hungerRestore: number;
  moodRestore: number;
  accentColor: string;
  description: string;
}

export const MAY_CAFE_ITEMS: Record<MayCafeItemId, MayCafeItemDef> = {
  cafe_milk_coffee: {
    id: 'cafe_milk_coffee',
    name: 'Cà Phê Sữa Đá Mây',
    price: 12,
    categoryLabel: 'Cà Phê Đá',
    energyRestore: 24,
    hungerRestore: 8,
    moodRestore: 4,
    accentColor: '#A86B3E',
    description: 'Cà phê phin đậm đà hòa sữa đặc mát lạnh, đánh thức tỉnh táo tức thì.',
  },
  cafe_latte_art: {
    id: 'cafe_latte_art',
    name: 'Latte Nghệ Thuật Ấm',
    price: 16,
    categoryLabel: 'Espresso Nóng',
    energyRestore: 30,
    hungerRestore: 14,
    moodRestore: 6,
    accentColor: '#C88D5A',
    description: 'Sữa tươi đánh bọt mịn vẽ hình trái tim trên nền espresso thơm dịu.',
  },
  cafe_peach_tea: {
    id: 'cafe_peach_tea',
    name: 'Trà Đào Cam Sả',
    price: 15,
    categoryLabel: 'Trà Trái Cây',
    energyRestore: 22,
    hungerRestore: 18,
    moodRestore: 6,
    accentColor: '#EE8A52',
    description: 'Trà ô long thanh mát cùng lát đào giòn ngọt và hương sả dịu nhẹ.',
  },
  cafe_matcha_cream: {
    id: 'cafe_matcha_cream',
    name: 'Matcha Latte Kem Cheese',
    price: 20,
    categoryLabel: 'Đặc Biệt',
    energyRestore: 36,
    hungerRestore: 20,
    moodRestore: 7,
    accentColor: '#69AC6C',
    description: 'Trà xanh Uji thơm béo phủ lớp kem cheese mằn mặn siêu cuốn.',
  },
  cafe_croissant_combo: {
    id: 'cafe_croissant_combo',
    name: 'Combo Croissant & Espresso',
    price: 28,
    categoryLabel: 'Combo Bánh & Cà Phê',
    energyRestore: 46,
    hungerRestore: 32,
    moodRestore: 9,
    accentColor: '#D6893F',
    description: 'Bánh sừng bò bơ Pháp nướng giòn rụm kèm tách espresso nạp đầy năng lượng!',
  },
};

export const MAY_CAFE_ITEM_LIST: MayCafeItemDef[] = Object.values(MAY_CAFE_ITEMS);
