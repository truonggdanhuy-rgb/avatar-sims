import {
  OwnedPetState,
  PetSpeciesDefinition,
  PetSpeciesId,
  PetSupplies,
  PetSupplyId,
} from '../types/game';

export const MAX_PET_INTIMACY = 10;
export const PET_FEED_HUNGER_THRESHOLD = 90;
export const PET_PLAY_HAPPINESS_THRESHOLD = 90;

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
      'Chú chim xanh nhỏ nhắn bay lượn êm ái bên trái bạn, thích bay lượn quanh người hoặc đáp xuống nhảy múa khi chơi đùa.',
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
    description: 'Cho bé ăn khi độ no giảm dưới 90%: phục hồi +35 độ no và tăng +1 thân mật.',
  },
  petMedicine: {
    id: 'petMedicine',
    name: 'Thuốc Chữa Bệnh Pet',
    price: 8,
    description: 'Dùng khi thú cưng bị ốm để chữa khỏi ngay và tăng +1 độ thân mật.',
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
    hunger: 75,
    happiness: 75,
    sick: false,
    lastTickAt: now,
    adoptedAt: now,
  };
}

export function getPetXpForNextLevel(level: number): number {
  if (level >= MAX_PET_INTIMACY) return 22;
  return 4 + (level - 1) * 2;
}

export function applyPetIntimacyXp(
  pet: OwnedPetState,
  gainedXp: number,
): OwnedPetState {
  if (gainedXp <= 0) return pet;
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

export const PET_HUNGER_DECAY_PER_HOUR = 20;
export const PET_HAPPINESS_DECAY_PER_HOUR = 24;

export function tickPetCareMeters(pet: OwnedPetState, dtMs: number): OwnedPetState {
  if (dtMs <= 0) return pet;
  const hours = dtMs / 3600000;
  const curHunger = typeof pet.hunger === 'number' ? pet.hunger : 75;
  const curHappy = typeof pet.happiness === 'number' ? pet.happiness : 75;
  const nextHunger = Math.max(0, curHunger - hours * PET_HUNGER_DECAY_PER_HOUR);
  const nextHappy = Math.max(0, curHappy - hours * PET_HAPPINESS_DECAY_PER_HOUR);
  if (nextHunger === curHunger && nextHappy === curHappy) return pet;
  return {
    ...pet,
    hunger: nextHunger,
    happiness: nextHappy,
  };
}

export function applyPetFeedCare(pet: OwnedPetState): {
  pet: OwnedPetState;
  ok: boolean;
  message: string;
} {
  const curHunger = typeof pet.hunger === 'number' ? pet.hunger : 75;
  if (curHunger >= PET_FEED_HUNGER_THRESHOLD) {
    return {
      pet,
      ok: false,
      message: `${pet.name} vẫn đang no (${Math.round(curHunger)}%), đợi bé đói dưới ${PET_FEED_HUNGER_THRESHOLD}% rồi hãy cho ăn nhé!`,
    };
  }
  const nextHunger = Math.min(100, curHunger + 35);
  const updated = applyPetIntimacyXp({...pet, hunger: nextHunger}, 1);
  return {
    pet: updated,
    ok: true,
    message: `Đã cho ${pet.name} ăn ngon (+35% Độ no, +1 thân mật)!`,
  };
}

export function applyPetPlayCare(pet: OwnedPetState): {
  pet: OwnedPetState;
  gainedXp: boolean;
  message: string;
} {
  const curHappy = typeof pet.happiness === 'number' ? pet.happiness : 75;
  if (curHappy >= PET_PLAY_HAPPINESS_THRESHOLD) {
    return {
      pet,
      gainedXp: false,
      message: `${pet.name} đang rất vui rồi (${Math.round(curHappy)}%), chờ thanh Vui vẻ giảm dưới ${PET_PLAY_HAPPINESS_THRESHOLD}% mới cộng thêm thân mật nhé!`,
    };
  }
  const nextHappy = Math.min(100, curHappy + 35);
  const updated = applyPetIntimacyXp({...pet, happiness: nextHappy}, 1);
  return {
    pet: updated,
    gainedXp: true,
    message: `Chơi đùa cùng ${pet.name}! (+35% Vui vẻ, +1 thân mật)`,
  };
}

export function applyPetCureCare(pet: OwnedPetState): OwnedPetState {
  return applyPetIntimacyXp({...pet, sick: false}, 1);
}

