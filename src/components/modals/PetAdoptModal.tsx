import React from 'react';
import {Coins, Feather, Footprints, Heart, Sparkles, X} from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#E5B88B] bg-[#FFF8EB] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#DF7E5C] to-[#EDA269] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-current" />
            <div>
              <h2 className="text-base font-black tracking-tight">Nhận Nuôi Thú Cưng</h2>
              <p className="text-[11px] font-semibold text-white/90">
                Chọn người bạn đồng hành đáng yêu của bạn
              </p>
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

        {/* Pet Cards */}
        <div className="space-y-3.5 overflow-y-auto p-4">
          {PET_LIST.map((spec) => {
            const ownedCount = ownedPets.filter((p) => p.speciesId === spec.id).length;
            const canAfford = coins >= spec.price;
            const isFly = spec.moveType === 'fly';

            return (
              <div
                key={spec.id}
                className="rounded-2xl border-2 border-[#E7D4B8] bg-white p-4 shadow-xs"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 ${
                      isFly
                        ? 'border-[#C5E5F8] bg-[#EFF8FE]'
                        : 'border-[#F2D5B8] bg-[#FFF5E8]'
                    }`}
                  >
                    <PetSpeciesIcon speciesId={spec.id} className="h-13 w-13" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <h3 className="text-base font-black text-[#4A3525]">{spec.name}</h3>
                      {ownedCount > 0 && (
                        <span className="rounded-lg bg-[#EAF7ED] px-2 py-0.5 text-[10px] font-black text-[#2D7544]">
                          Đã nuôi: {ownedCount}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                          isFly
                            ? 'bg-[#E5F4FD] text-[#226B9A]'
                            : 'bg-[#F8EBDC] text-[#8B5524]'
                        }`}
                      >
                        {isFly ? (
                          <Feather className="h-3 w-3" />
                        ) : (
                          <Footprints className="h-3 w-3" />
                        )}
                        {isFly ? 'Pet Bay (bên trái)' : 'Pet Đi Bộ'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#FDF0F5] px-2 py-0.5 text-[10px] font-extrabold text-[#A8385E]">
                        <Sparkles className="h-3 w-3" />
                        {spec.holdMode === 'fly_orbit' ? 'Bay quanh người' : 'Đi quanh người'}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed font-semibold text-[#7A6048]">
                      {spec.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-[#EFE3D0] pt-3">
                  <div className="inline-flex items-center gap-1 text-sm font-black text-[#B36B1B] tabular-nums">
                    <Coins className="h-4 w-4 text-[#E59D2C]" />
                    {spec.price} Xu
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      soundFX.sparkle();
                      onAdoptPet(spec.id);
                    }}
                    className="rounded-xl bg-[#DF7E5C] px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DDD5C9] disabled:text-[#8E8275]"
                  >
                    {canAfford ? `Mua ${spec.name}` : `Thiếu ${spec.price - coins} Xu`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
