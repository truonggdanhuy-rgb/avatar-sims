import {
  OwnedPetState,
  PetSpeciesDefinition,
  PetSpeciesId,
  PetSupplies,
  PetSupplyId,
} from '../types/game';

export const MAX_PET_INTIMACY = 10;

export const PET_CATALOG: Record<PetSpeciesId, PetSpeciesDefinition> = {
  brown_puppy: {
    id: 'brown_puppy',
    name: 'Cún Nâu',
    moveType: 'walk',
    price: 350,
    canHold: true,
    holdMode: 'arms',
    description:
      'Chú cún con bé bỏng lông nâu ấm áp, thích lon ton chạy theo bạn và luôn quẩy đuôi khi được bế trên tay.',
    primaryColor: '#B8723E',
    accentColor: '#FFF0D6',
  },
  blue_bird: {
    id: 'blue_bird',
    name: 'Chim Xanh',
    moveType: 'fly',
    price: 450,
    canHold: true,
    holdMode: 'shoulder',
    description:
      'Chú chim xanh nhỏ nhắn bay lượn êm ái bên trái bạn, thích bay lượn quanh người và vỗ cánh líu lo vui vẻ.',
    primaryColor: '#4BA8DF',
    accentColor: '#FFF5DA',
  },
};

export const PET_LIST: PetSpeciesDefinition[] = Object.values(PET_CATALOG);

export const PET_SUPPLY_META: Record<
  PetSupplyId,
  {
    id: PetSupplyId;
    name: string;
    price: number;
    description: string;
  }
> = {
  petFood: {
    id: 'petFood',
    name: 'Thức Ăn Thú Cưng',
    price: 3,
    description: 'Bữa ăn thơm ngon giúp bé cưng vui vẻ và tăng độ thân mật (+35 điểm).',
  },
  petMedicine: {
    id: 'petMedicine',
    name: 'Thuốc Chữa Bệnh Pet',
    price: 8,
    description: 'Dùng khi thú cưng bị ốm để chữa khỏi ngay và phục hồi sức khỏe (+40 điểm).',
  },
  intimacyTest: {
    id: 'intimacyTest',
    name: 'Test thân mật',
    price: 1,
    description: 'Thuốc thử nghiệm đặc biệt: tăng ngay +1 cấp thân mật cho thú cưng (tối đa Lv.10).',
  },
};

export const PET_SUPPLY_LIST = [
  PET_SUPPLY_META.petFood,
  PET_SUPPLY_META.petMedicine,
  PET_SUPPLY_META.intimacyTest,
];

export function createInitialPetSupplies(): PetSupplies {
  return {
    petFood: 2,
    petMedicine: 1,
    intimacyTest: 0,
  };
}

export function createOwnedPet(
  speciesId: PetSpeciesId,
  sequence = 1,
  now = Date.now(),
): OwnedPetState {
  const spec = PET_CATALOG[speciesId];
  return {
    id: `pet_${speciesId}_${now}_${sequence}`,
    speciesId,
    name: spec.name,
    intimacyLevel: 1,
    intimacyXp: 0,
    sick: false,
    lastTickAt: now,
    adoptedAt: now,
  };
}

export function getPetXpForNextLevel(level: number): number {
  if (level >= MAX_PET_INTIMACY) return 100;
  return 40 + (level - 1) * 15;
}

export function applyPetIntimacyXp(
  pet: OwnedPetState,
  gainedXp: number,
): OwnedPetState {
  if (pet.intimacyLevel >= MAX_PET_INTIMACY) {
    return {...pet, intimacyLevel: MAX_PET_INTIMACY, intimacyXp: 0};
  }
  let level = Math.max(1, pet.intimacyLevel);
  let xp = Math.max(0, pet.intimacyXp + gainedXp);
  while (level < MAX_PET_INTIMACY) {
    const req = getPetXpForNextLevel(level);
    if (xp < req) break;
    xp -= req;
    level += 1;
  }
  if (level >= MAX_PET_INTIMACY) {
    level = MAX_PET_INTIMACY;
    xp = 0;
  }
  return {
    ...pet,
    intimacyLevel: level,
    intimacyXp: xp,
  };
}

export function applyPetLevelStep(pet: OwnedPetState, levels = 1): OwnedPetState {
  const nextLevel = Math.min(MAX_PET_INTIMACY, Math.max(1, pet.intimacyLevel + levels));
  return {
    ...pet,
    intimacyLevel: nextLevel,
    intimacyXp: 0,
  };
}
