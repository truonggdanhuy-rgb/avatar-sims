import React, {useState} from 'react';
import {
  Cross,
  Heart,
  HeartHandshake,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import {
  getPetXpForNextLevel,
  MAX_PET_INTIMACY,
  PET_CATALOG,
} from '../data/petCatalog';
import {OwnedPetState, PetSupplies} from '../types/game';
import {soundFX} from '../utils/sound';
import {BlingBlingBadge, PetSpeciesIcon} from './PetIcons';

interface PetArcMenuProps {
  pet: OwnedPetState;
  screenX: number;
  screenY: number;
  supplies: PetSupplies;
  onHoldPet: (petId: string) => void;
  onFeedPet: (petId: string) => void;
  onCurePet: (petId: string) => void;
  onPlayWithPet: (petId: string) => void;
  onClose: () => void;
}

export const PetArcMenu: React.FC<PetArcMenuProps> = ({
  pet,
  screenX,
  screenY,
  supplies,
  onHoldPet,
  onFeedPet,
  onCurePet,
  onPlayWithPet,
  onClose,
}) => {
  const [showIntimacyDetail, setShowIntimacyDetail] = useState(true);
  const spec = PET_CATALOG[pet.speciesId];
  const isMaxIntimacy = pet.intimacyLevel >= MAX_PET_INTIMACY;
  const reqXp = getPetXpForNextLevel(pet.intimacyLevel);
  const pct = isMaxIntimacy
    ? 100
    : Math.min(100, Math.round((pet.intimacyXp / Math.max(1, reqXp)) * 100));

  const mainRadius = 60;
  const getArcPos = (idx: number, total: number, radius: number, spanDeg = 148) => {
    const startDeg = -90 - spanDeg / 2;
    const deg = total === 1 ? -90 : startDeg + (idx / (total - 1)) * spanDeg;
    const rad = (deg * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  };

  const canFeedOrCure = pet.sick ? supplies.petMedicine > 0 : supplies.petFood > 0;

  const actions = [
    {
      key: 'intimacy',
      title: `Độ thân mật Lv.${pet.intimacyLevel}/${MAX_PET_INTIMACY}`,
      bgClass: showIntimacyDetail
        ? 'bg-[#E56B8A] text-white ring-2 ring-[#FFE5EC]'
        : 'bg-[#F17896] text-white',
      disabled: false,
      slash: false,
      badge: `Lv.${pet.intimacyLevel}`,
      badgeClass: 'border-[#E56B8A]/60 bg-[#FFF5F7]/95 text-[#A82C4C]',
      icon: <Heart className="h-4 w-4 fill-current" />,
      onClick: () => {
        soundFX.tap();
        setShowIntimacyDetail((v) => !v);
      },
    },
    {
      key: 'hold',
      title: !spec.canHold
        ? 'Thú cưng này không thể ôm'
        : spec.holdMode === 'shoulder'
          ? 'Bay lượn quanh người'
          : 'Ôm thú cưng',
      bgClass: !spec.canHold
        ? 'bg-[#DDD6CB] text-[#857A6E]'
        : 'bg-[#5FA86B] text-white',
      disabled: !spec.canHold,
      slash: !spec.canHold,
      badge: !spec.canHold
        ? 'Không'
        : spec.holdMode === 'shoulder'
          ? 'Bay quanh'
          : 'Ôm',
      badgeClass: !spec.canHold
        ? 'border-[#B8AFA3]/60 bg-[#F2EDE4]/95 text-[#7D7368]'
        : 'border-[#5FA86B]/60 bg-[#F2FBF4]/95 text-[#286335]',
      icon: <HeartHandshake className="h-4 w-4" />,
      onClick: () => {
        if (!spec.canHold) return;
        soundFX.sparkle();
        onHoldPet(pet.id);
        onClose();
      },
    },
    {
      key: 'care',
      title: pet.sick
        ? supplies.petMedicine > 0
          ? `Cho uống thuốc (còn x${supplies.petMedicine})`
          : 'Hết thuốc! Mua ở cửa hàng Ivan'
        : supplies.petFood > 0
          ? `Cho ăn (còn x${supplies.petFood})`
          : 'Hết thức ăn! Mua ở cửa hàng Ivan',
      bgClass: pet.sick
        ? canFeedOrCure
          ? 'bg-[#D94E67] text-white'
          : 'bg-[#D6CFC5] text-[#8E8478]'
        : canFeedOrCure
          ? 'bg-[#E89149] text-white'
          : 'bg-[#D6CFC5] text-[#8E8478]',
      disabled: !canFeedOrCure,
      slash: false,
      badge: pet.sick ? `Thuốc x${supplies.petMedicine}` : `Ăn x${supplies.petFood}`,
      badgeClass: pet.sick
        ? canFeedOrCure
          ? 'border-[#D94E67]/60 bg-[#FFF3F5]/95 text-[#A4253D]'
          : 'border-[#B8AFA3]/60 bg-[#F2EDE4]/95 text-[#7D7368]'
        : canFeedOrCure
          ? 'border-[#E89149]/60 bg-[#FFF8F0]/95 text-[#9B4D10]'
          : 'border-[#B8AFA3]/60 bg-[#F2EDE4]/95 text-[#7D7368]',
      icon: pet.sick ? <Cross className="h-4 w-4" /> : <Utensils className="h-4 w-4" />,
      onClick: () => {
        if (pet.sick) {
          soundFX.sparkle();
          onCurePet(pet.id);
        } else {
          soundFX.sparkle();
          onFeedPet(pet.id);
        }
      },
    },
    {
      key: 'play',
      title: 'Chơi đùa cùng thú cưng',
      bgClass: 'bg-[#4BA0D8] text-white',
      disabled: false,
      slash: false,
      badge: 'Chơi',
      badgeClass: 'border-[#4BA0D8]/60 bg-[#F2FAFF]/95 text-[#1B6494]',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => {
        soundFX.sparkle();
        onPlayWithPet(pet.id);
        onClose();
      },
    },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-label="Menu vòng cung thú cưng"
    >
      <div
        className="pointer-events-auto absolute"
        style={{left: `${screenX}px`, top: `${screenY}px`}}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Center Close Pill Button */}
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onClose();
          }}
          aria-label="Đóng"
          title="Đóng"
          className="anim-pop flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#8C6239] bg-[#FFF8EB] text-[#4A3525] shadow-md transition-transform active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Arc Buttons */}
        {actions.map((act, idx) => {
          const pos = getArcPos(idx, actions.length, mainRadius, 148);
          return (
            <div
              key={act.key}
              style={{left: `${pos.x}px`, top: `${pos.y}px`}}
              className="anim-pop absolute -translate-x-1/2 -translate-y-1/2"
            >
              <button
                type="button"
                disabled={act.disabled}
                onClick={act.onClick}
                aria-label={act.title}
                title={act.title}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90 disabled:cursor-not-allowed ${act.bgClass}`}
              >
                {act.icon}
                {act.slash && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute h-[2.5px] w-7 rotate-45 rounded-full bg-[#C93B4B]"
                  />
                )}
              </button>
              <div
                className={`pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded border px-1 py-px text-[9px] leading-none font-extrabold tracking-tight whitespace-nowrap shadow-2xs tabular-nums ${act.badgeClass}`}
              >
                {act.badge}
              </div>
            </div>
          );
        })}

        {/* Floating Intimacy & Pet Name Card below Center */}
        {showIntimacyDetail && (
          <div className="anim-pop absolute top-7 left-0 flex min-w-[186px] -translate-x-1/2 flex-col gap-1.5 rounded-xl border-2 border-[#8C6239]/80 bg-[#FFF9EF]/96 p-2.5 text-[#4A3525] shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <PetSpeciesIcon speciesId={pet.speciesId} className="h-5 w-5 shrink-0" />
                <span className="flex items-center gap-1 truncate text-xs font-black text-[#4A3525]">
                  {isMaxIntimacy && <BlingBlingBadge className="h-3.5 w-3.5" />}
                  <span className="truncate">{pet.name}</span>
                </span>
              </div>
              <span className="shrink-0 rounded bg-[#FDE7EE] px-1.5 py-0.5 text-[10px] font-black text-[#B83259]">
                Lv.{pet.intimacyLevel}/{MAX_PET_INTIMACY}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1DFC6]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F07898] to-[#FFAE52] transition-all"
                style={{width: `${pct}%`}}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-[#7A6048]">
              <span>
                {isMaxIntimacy
                  ? 'Thân mật tối đa!'
                  : `Thân mật: ${pet.intimacyXp}/${reqXp}`}
              </span>
              {pet.sick && (
                <span className="rounded bg-[#FCE4E8] px-1 py-px font-black text-[#C93B4B]">
                  Đang bệnh!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
