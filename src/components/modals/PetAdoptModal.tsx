import React from 'react';
import {Coins, Heart, X} from 'lucide-react';
import {PET_LIST} from '../../data/petCatalog';
import {OwnedPetState, PetSpeciesId} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {PetSpeciesIcon} from '../PetIcons';

interface PetAdoptModalProps {
  coins: number;
  ownedPets: OwnedPetState[];
  onAdoptPet: (speciesId: PetSpeciesId) => void;
  onClose: () => void;
}

export const PetAdoptModal: React.FC<PetAdoptModalProps> = ({
  coins,
  ownedPets,
  onAdoptPet,
  onClose,
}) => {
  return (
    <div className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#E5B88B] bg-[#FFF8EB] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#DF7E5C] to-[#EDA269] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-current" />
            <div>
              <h2 className="text-base font-black tracking-tight">Nhận Nuôi Thú Cưng</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-black tabular-nums">
              <Coins className="h-3.5 w-3.5 text-[#FFE57F]" />
              {coins} Xu
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Clean Pet Cards Only — No Descriptions */}
        <div className="custom-scroll space-y-2.5 overflow-y-auto p-4">
          {PET_LIST.map((spec) => {
            const ownedCount = ownedPets.filter((p) => p.speciesId === spec.id).length;
            const canAfford = coins >= spec.price;

            return (
              <div
                key={spec.id}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#E7D4B8] bg-white p-3.5 shadow-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#EFE0C9] bg-[#FFF8EB]">
                    <PetSpeciesIcon speciesId={spec.id} className="h-12 w-12" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-black text-[#4A3525]">{spec.name}</h3>
                      {ownedCount > 0 && (
                        <span className="rounded-lg bg-[#EAF7ED] px-1.5 py-0.5 text-[10px] font-black text-[#2D7544]">
                          Đã nuôi: {ownedCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#B36B1B] tabular-nums">
                      <Coins className="h-3.5 w-3.5 text-[#E59D2C]" />
                      {spec.price} Xu
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => {
                    soundFX.sparkle();
                    onAdoptPet(spec.id);
                  }}
                  className="shrink-0 rounded-xl bg-[#DF7E5C] px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DDD5C9] disabled:text-[#8E8275]"
                >
                  {canAfford ? 'Nhận Nuôi' : `Thiếu ${spec.price - coins}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
