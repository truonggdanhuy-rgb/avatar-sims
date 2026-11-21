import React from 'react';
import {Coins, HeartHandshake, Sparkles, X} from 'lucide-react';
import {PET_SUPPLY_LIST} from '../../data/petCatalog';
import {PetSupplies, PetSupplyId} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {PetSupplyIcon} from '../PetIcons';

interface PetSupplyShopModalProps {
  coins: number;
  supplies: PetSupplies;
  onBuySupply: (supplyId: PetSupplyId, qty: number) => void;
  onClose: () => void;
}

export const PetSupplyShopModal: React.FC<PetSupplyShopModalProps> = ({
  coins,
  supplies,
  onBuySupply,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#8CCBB7] bg-[#FFF8EB] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#49A58D] to-[#68C3A9] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5" />
            <div>
              <h2 className="text-base font-black tracking-tight">Quầy Đồ Thú Cưng - Ivan</h2>
              <p className="text-[11px] font-semibold text-white/90">
                Thức ăn &amp; thuốc được cất gọn trong Túi &gt; Pets
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

        {/* Item List */}
        <div className="space-y-3 overflow-y-auto p-4">
          {PET_SUPPLY_LIST.map((item) => {
            const owned = supplies[item.id] ?? 0;
            const isTest = item.id === 'intimacyTest';
            const canBuy1 = coins >= item.price;
            const canBuy5 = coins >= item.price * 5;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-3.5 shadow-xs ${
                  isTest
                    ? 'border-[#E7A9CB] bg-[#FFF4FA]'
                    : 'border-[#E2D3B8] bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border ${
                      isTest
                        ? 'border-[#F2CBE0] bg-white'
                        : 'border-[#E9DBC3] bg-[#FFF8EC]'
                    }`}
                  >
                    <PetSupplyIcon supplyId={item.id} className="h-9 w-9" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-sm font-black text-[#4A3525]">
                        {isTest && <Sparkles className="h-3.5 w-3.5 text-[#D85A9E]" />}
                        {item.name}
                      </span>
                      <span className="shrink-0 rounded-lg bg-[#F3E9D8] px-2 py-0.5 text-[11px] font-black text-[#6B4E34] tabular-nums">
                        Đang có: x{owned}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed font-semibold text-[#7A6048]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EFE3D0] pt-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-[#B36B1B] tabular-nums">
                    <Coins className="h-3.5 w-3.5 text-[#E59D2C]" />
                    {item.price} Xu / món
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canBuy1}
                      onClick={() => {
                        soundFX.sparkle();
                        onBuySupply(item.id, 1);
                      }}
                      className="rounded-xl bg-[#49A58D] px-3 py-1.5 text-xs font-black text-white shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DDD5C9] disabled:text-[#8E8275]"
                    >
                      Mua +1 ({item.price} Xu)
                    </button>
                    <button
                      type="button"
                      disabled={!canBuy5}
                      onClick={() => {
                        soundFX.sparkle();
                        onBuySupply(item.id, 5);
                      }}
                      className="rounded-xl bg-[#E38B47] px-3 py-1.5 text-xs font-black text-white shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DDD5C9] disabled:text-[#8E8275]"
                    >
                      +5 ({item.price * 5} Xu)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
