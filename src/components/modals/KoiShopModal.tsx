import React, {useState} from 'react';
import {Coins, ShoppingBag, X, CheckCircle2, Backpack, Fish} from 'lucide-react';
import {
  WOODEN_ROD_MAX_DURABILITY,
  WOODEN_ROD_PRICE,
} from '../../data/fishingCatalog';
import {CaughtFishItem, FishingRodState} from '../../types/game';
import {FishBasketPanel} from '../FishBasketPanel';
import {WoodenRodIcon} from '../FishingIcons';

interface KoiShopModalProps {
  coins: number;
  fishingRod: FishingRodState;
  fishBasket: CaughtFishItem[];
  onBuyRod: () => void;
  onToggleFishLock: (fishId: string) => void;
  onSellFish: (fishId: string) => void;
  onSellAllUnlocked: () => void;
  onOpenBagTools: () => void;
  onClose: () => void;
}

export function KoiShopModal({
  coins,
  fishingRod,
  fishBasket,
  onBuyRod,
  onToggleFishLock,
  onSellFish,
  onSellAllUnlocked,
  onOpenBagTools,
  onClose,
}: KoiShopModalProps) {
  const [tab, setTab] = useState<'shop' | 'sell'>('shop');
  const isBroken = fishingRod.owned && fishingRod.durability <= 0;
  const durPct = Math.round(
    (fishingRod.durability / Math.max(1, fishingRod.maxDurability)) * 100,
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="w-full max-w-lg bg-[#FFF8EB] rounded-3xl border-4 border-[#DFCA9F] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#3D95AC] to-[#57B3C5] text-white flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight">Sạp Câu Cá của Koi</h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-black">
              <Coins className="w-3.5 h-3.5 text-[#FFE57F]" />
              {coins} Xu
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-2">
          <button
            onClick={() => setTab('shop')}
            className={`flex-1 py-2 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              tab === 'shop'
                ? 'bg-[#3D95AC] text-white shadow-sm'
                : 'bg-[#EFE3CA] text-[#6D5337] hover:bg-[#E4D3B2]'
            }`}>
            <ShoppingBag className="w-3.5 h-3.5" />
            Cửa Hàng
          </button>
          <button
            onClick={() => setTab('sell')}
            className={`flex-1 py-2 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              tab === 'sell'
                ? 'bg-[#E28F33] text-white shadow-sm'
                : 'bg-[#EFE3CA] text-[#6D5337] hover:bg-[#E4D3B2]'
            }`}>
            <Fish className="w-3.5 h-3.5" />
            Bán Cá ({fishBasket.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          {tab === 'shop' ? (
            <>
              {/* Wooden Rod Card */}
              <div className="bg-[#FFFDF8] rounded-2xl border-2 border-[#E4D3B4] p-4 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#E8F5F8] border border-[#C2E2EB] flex items-center justify-center shrink-0">
                      <WoodenRodIcon className="w-11 h-11" />
                    </div>
                    <div>
                      <div className="text-base font-black text-[#3B2A1A]">Cần Câu Gỗ</div>
                      <div className="text-xs font-semibold text-[#6F583E]">
                        Độ bền tối đa: {WOODEN_ROD_MAX_DURABILITY}
                      </div>
                      <div className="text-[11px] font-bold text-[#3C95AD] mt-0.5">
                        Dùng được ở Hồ Câu Thị Trấn &amp; Hồ Cá Nông Trại
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#FFF2D2] border border-[#E7C878] text-xs font-black text-[#A86914] shrink-0">
                    {WOODEN_ROD_PRICE} Xu
                  </span>
                </div>

                {!fishingRod.owned ? (
                  <button
                    onClick={onBuyRod}
                    disabled={coins < WOODEN_ROD_PRICE}
                    className="w-full py-2.5 rounded-xl bg-[#3D95AC] hover:bg-[#317F94] disabled:opacity-45 text-white text-sm font-black transition active:scale-98 flex items-center justify-center gap-2">
                    <Coins className="w-4 h-4" />
                    Mua Cần Câu Gỗ ({WOODEN_ROD_PRICE} Xu)
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="inline-flex items-center gap-1 text-[#2E7D55]">
                        <CheckCircle2 className="w-4 h-4" />
                        Đã sở hữu (trong Túi &gt; Cần &amp; Vợt)
                      </span>
                      <span
                        className={
                          isBroken
                            ? 'text-[#D64545] font-black'
                            : durPct <= 30
                              ? 'text-[#C8741D] font-black'
                              : 'text-[#3B7C59]'
                        }>
                        Độ bền: {fishingRod.durability}/{fishingRod.maxDurability}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-[#EAE0CE] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isBroken
                            ? 'bg-[#E15252]'
                            : durPct <= 30
                              ? 'bg-[#EB9B38]'
                              : 'bg-[#48A878]'
                        }`}
                        style={{width: `${durPct}%`}}
                      />
                    </div>

                    <button
                      onClick={onOpenBagTools}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#EFE4CF] hover:bg-[#E3D3B4] text-[#4E3922] text-xs font-black transition flex items-center justify-center gap-1.5">
                      <Backpack className="w-3.5 h-3.5" />
                      Mở Túi &gt; Cần &amp; Vợt
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <FishBasketPanel
              fishBasket={fishBasket}
              onToggleLock={onToggleFishLock}
              onSellFish={onSellFish}
              onSellAllUnlocked={onSellAllUnlocked}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
