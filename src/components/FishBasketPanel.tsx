import React, {useMemo, useState} from 'react';
import {Coins, Lock, Unlock, Waves} from 'lucide-react';
import {ALL_FISH_CATALOG, computeFishSellPrice} from '../data/fishingCatalog';
import {CaughtFishItem, FishWaterType} from '../types/game';
import {FishIllustration} from './FishingIcons';

interface FishBasketPanelProps {
  fishBasket: CaughtFishItem[];
  onToggleLock: (fishId: string) => void;
  onSellFish: (fishId: string) => void;
  onSellAllUnlocked: (waterType?: FishWaterType) => void;
  compact?: boolean;
}

export function FishBasketPanel({
  fishBasket,
  onToggleLock,
  onSellFish,
  onSellAllUnlocked,
  compact = false,
}: FishBasketPanelProps) {
  const [waterTab, setWaterTab] = useState<FishWaterType>('river');

  const riverCount = useMemo(
    () => fishBasket.filter((f) => f.waterType === 'river').length,
    [fishBasket],
  );
  const seaCount = useMemo(
    () => fishBasket.filter((f) => f.waterType === 'sea').length,
    [fishBasket],
  );

  const activeFish = useMemo(
    () => fishBasket.filter((f) => f.waterType === waterTab),
    [fishBasket, waterTab],
  );

  const unlockedActiveFish = useMemo(
    () => activeFish.filter((f) => !f.locked),
    [activeFish],
  );

  const lockedCount = activeFish.length - unlockedActiveFish.length;

  const unlockedTotalValue = useMemo(
    () =>
      unlockedActiveFish.reduce(
        (sum, f) => sum + computeFishSellPrice(f.speciesId, f.weightKg),
        0,
      ),
    [unlockedActiveFish],
  );

  return (
    <div className="space-y-3">
      {/* 2 Sub-tabs: Cá Sông & Cá Biển */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#E9DEC8] p-1 rounded-2xl border border-[#DACAA9]">
        <button
          onClick={() => setWaterTab('river')}
          className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            waterTab === 'river'
              ? 'bg-[#3C95AD] text-white shadow-sm'
              : 'text-[#6A5138] hover:bg-[#F5EBDC]'
          }`}>
          <Waves className="w-3.5 h-3.5" />
          Cá Sông ({riverCount})
        </button>
        <button
          onClick={() => setWaterTab('sea')}
          className={`py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            waterTab === 'sea'
              ? 'bg-[#2C72A6] text-white shadow-sm'
              : 'text-[#6A5138] hover:bg-[#F5EBDC]'
          }`}>
          <Waves className="w-3.5 h-3.5" />
          Cá Biển ({seaCount})
        </button>
      </div>

      {/* Summary + Sell All Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF8EB] border-2 border-[#E7D8BE] rounded-2xl px-3.5 py-2.5">
        <div className="text-xs font-bold text-[#6A4E31]">
          <div>
            Đang giữ <span className="font-black text-[#3A2715]">{activeFish.length}</span> con
            {lockedCount > 0 && (
              <span className="ml-1.5 text-[#B46326]">({lockedCount} đã khóa)</span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-[#8A7154]">
            Sinh vật đã khóa sẽ được bảo vệ khỏi Bán / Bán tất cả
          </div>
        </div>

        <button
          onClick={() => onSellAllUnlocked(waterTab)}
          disabled={unlockedActiveFish.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E89B35] hover:bg-[#D68924] disabled:opacity-45 disabled:hover:bg-[#E89B35] text-white text-xs font-black shadow-sm transition active:scale-95">
          <Coins className="w-3.5 h-3.5" />
          Bán tất cả ({unlockedActiveFish.length}) · +{unlockedTotalValue} Xu
        </button>
      </div>

      {/* Fish List */}
      {activeFish.length === 0 ? (
        <div className="bg-[#F9F2E4] border border-[#E5D6BC] rounded-2xl p-6 text-center text-xs font-bold text-[#8B7254]">
          {waterTab === 'sea'
            ? 'Bạn chưa có sinh vật biển nào. Hãy lên Khinh Khí Cầu trên Đồi Bắc để ra Đảo và câu ở bãi biển hoặc bến thuyền!'
            : 'Bạn chưa có cá sông nào để bán. Hãy trang bị cần câu trong Túi Đồ và thả cần ở Hồ Câu hoặc Hồ Cá Nông Trại!'}
        </div>
      ) : (
        <div
          className={`space-y-2 overflow-y-auto pr-1 ${
            compact ? 'max-h-64' : 'max-h-[340px]'
          }`}>
          {activeFish.map((item) => {
            const spec = ALL_FISH_CATALOG[item.speciesId];
            if (!spec) return null;
            const price = computeFishSellPrice(item.speciesId, item.weightKg);
            const isRare = spec.rarity === 'rare';

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2.5 rounded-2xl p-2.5 border-2 transition ${
                  item.locked
                    ? 'bg-[#FFF3DC] border-[#E4B86B]'
                    : isRare
                      ? 'bg-[#FAF2FF] border-[#D9BCF2]'
                      : 'bg-[#FFFDF8] border-[#E8DBC5]'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      isRare
                        ? 'bg-[#F1DEFF] border-[#D9B4F6]'
                        : 'bg-[#E8F5FA] border-[#C5E3EE]'
                    }`}>
                    <FishIllustration speciesId={item.speciesId} className="w-10 h-10" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-[#3B2A1A] truncate">
                        {spec.name}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isRare
                            ? 'bg-[#8E44AD] text-white'
                            : 'bg-[#DDF0E4] text-[#2F6F49]'
                        }`}>
                        {isRare ? 'Hiếm' : 'Thường'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#6E563B] mt-0.5 flex items-center gap-2">
                      <span>Cân nặng: {item.weightKg.toFixed(2)} kg</span>
                      <span className="text-[#C47C1A] font-black">· {price} Xu</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onToggleLock(item.id)}
                    title={item.locked ? 'Gỡ khóa' : 'Khóa để không bị bán nhầm'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition active:scale-95 ${
                      item.locked
                        ? 'bg-[#D97D28] text-white border-[#B96215]'
                        : 'bg-[#F5EAD6] text-[#6B5135] border-[#DECAA6] hover:bg-[#EAD8BA]'
                    }`}>
                    {item.locked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Đã khóa
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        Khóa
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onSellFish(item.id)}
                    disabled={item.locked}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-[#439A6C] hover:bg-[#358059] disabled:opacity-35 disabled:hover:bg-[#439A6C] text-white transition active:scale-95">
                    Bán
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
