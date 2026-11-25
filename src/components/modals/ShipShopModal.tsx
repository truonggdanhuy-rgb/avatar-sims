import React from 'react';
import {Anchor, Backpack, CheckCircle2, Coins, Ship, Waves, X} from 'lucide-react';
import {BOAT_LIST} from '../../data/fishingCatalog';
import {BoatId, BoatsState} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {BoatSkinIcon} from '../FishingIcons';

interface ShipShopModalProps {
  coins: number;
  boats: BoatsState;
  onBuyBoat: (boatId: BoatId) => void;
  onSelectBoat: (boatId: BoatId) => void;
  onOpenBagBoats: () => void;
  onClose: () => void;
}

export function ShipShopModal({
  coins,
  boats,
  onBuyBoat,
  onSelectBoat,
  onOpenBagBoats,
  onClose,
}: ShipShopModalProps) {
  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#DFCA9F] bg-[#FFF8EB] shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#287094] to-[#46A0C2] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-[#FFE57F]" />
            <h2 className="text-lg font-black tracking-tight">Sạp Thuyền của Ship</h2>
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
              aria-label="Đóng sạp thuyền"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="custom-scroll space-y-3 overflow-y-auto p-4">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#C6E1EE] bg-[#EDF7FB] px-3.5 py-2.5 text-xs font-bold text-[#225670]">
            <Ship className="h-4 w-4 shrink-0 text-[#2E82A8]" />
            <span>
              Ship chào bạn! Tất cả thuyền đều chèo &amp; đạp nước được ở Sông Khu Sinh Thái và Biển Đảo Mây, kiêm chỗ đứng câu cá.
            </span>
          </div>

          {BOAT_LIST.map((boat) => {
            const owned = boats.ownedIds.includes(boat.id);
            const isActive = owned && boats.activeBoatId === boat.id;
            const canAfford = coins >= boat.price;

            return (
              <div
                key={boat.id}
                className="space-y-2.5 rounded-2xl border-2 border-[#E4D3B4] bg-[#FFFDF8] p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#BFE0EE] bg-[#E8F5FA]">
                      <BoatSkinIcon boatId={boat.id} className="h-12 w-12" />
                    </div>
                    <div>
                      <div className="text-base font-black text-[#3B2A1A]">{boat.name}</div>
                      <div className="text-xs font-semibold text-[#6F583E]">{boat.subtitle}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#2B7C9E]">
                        <Waves className="h-3.5 w-3.5" />
                        Chèo sông Khu Sinh Thái &amp; Biển Đảo Mây
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#E7C878] bg-[#FFF2D2] px-2.5 py-1 text-xs font-black tabular-nums text-[#A86914]">
                    {boat.price} Xu
                  </span>
                </div>

                <div className="rounded-xl border border-[#ECE1CC] bg-[#FAF3E6] px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#5C452C]">
                  {boat.description}
                </div>

                {!owned ? (
                  <div className="space-y-1.5">
                    {!canAfford && (
                      <div className="rounded-xl bg-[#FDECEC] px-3 py-1.5 text-[11px] font-bold text-[#B63535]">
                        Bạn cần thêm {boat.price - coins} Xu để mua {boat.name}.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.sparkle();
                        onBuyBoat(boat.id);
                      }}
                      disabled={!canAfford}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F84A8] py-2.5 text-sm font-black text-white transition hover:bg-[#256D8C] active:scale-98 disabled:opacity-45"
                    >
                      <Coins className="h-4 w-4" />
                      Mua {boat.name} ({boat.price} Xu)
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#2E7D55]">
                      <CheckCircle2 className="h-4 w-4" />
                      {isActive ? 'Đang chọn sử dụng' : 'Đã sở hữu'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.tap();
                            onSelectBoat(boat.id);
                          }}
                          className="rounded-xl bg-[#2F84A8] px-3 py-2 text-xs font-black text-white transition hover:bg-[#256D8C] active:scale-95"
                        >
                          Chọn thuyền này
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          onOpenBagBoats();
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-[#EFE4CF] px-3 py-2 text-xs font-black text-[#4E3922] transition hover:bg-[#E3D3B4]"
                      >
                        <Backpack className="h-3.5 w-3.5" />
                        Túi &gt; Thuyền
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
