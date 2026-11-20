import React, {useMemo} from 'react';
import {Coins, Lock, Unlock} from 'lucide-react';
import {INSECT_CATALOG, computeInsectSellPrice} from '../data/insectCatalog';
import {CaughtInsectItem} from '../types/game';
import {InsectIllustration} from './InsectIcons';

interface BugBasketPanelProps {
  insectBasket: CaughtInsectItem[];
  onToggleLock: (insectId: string) => void;
  onSellInsect: (insectId: string) => void;
  onSellAllUnlocked: () => void;
  compact?: boolean;
}

export function BugBasketPanel({
  insectBasket,
  onToggleLock,
  onSellInsect,
  onSellAllUnlocked,
  compact = false,
}: BugBasketPanelProps) {
  const unlockedInsects = useMemo(
    () => insectBasket.filter((b) => !b.locked),
    [insectBasket],
  );

  const lockedCount = insectBasket.length - unlockedInsects.length;

  const unlockedTotalValue = useMemo(
    () =>
      unlockedInsects.reduce(
        (sum, b) => sum + computeInsectSellPrice(b.speciesId, b.lengthMm),
        0,
      ),
    [unlockedInsects],
  );

  return (
    <div className="space-y-3">
      {/* Summary + Sell All Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF8EB] border-2 border-[#E7D8BE] rounded-2xl px-3.5 py-2.5">
        <div className="text-xs font-bold text-[#6A4E31]">
          <div>
            Đang giữ <span className="font-black text-[#3A2715]">{insectBasket.length}</span> con
            {lockedCount > 0 && (
              <span className="ml-1.5 text-[#B46326]">({lockedCount} đã khóa)</span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-[#8A7154]">
            Côn trùng đã khóa sẽ được bảo vệ khỏi Bán / Bán tất cả
          </div>
        </div>

        <button
          onClick={onSellAllUnlocked}
          disabled={unlockedInsects.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E89B35] hover:bg-[#D68924] disabled:opacity-45 disabled:hover:bg-[#E89B35] text-white text-xs font-black shadow-sm transition active:scale-95">
          <Coins className="w-3.5 h-3.5" />
          Bán tất cả ({unlockedInsects.length}) · +{unlockedTotalValue} Xu
        </button>
      </div>

      {/* Insect List */}
      {insectBasket.length === 0 ? (
        <div className="bg-[#F9F2E4] border border-[#E5D6BC] rounded-2xl p-6 text-center text-xs font-bold text-[#8B7254]">
          Bạn chưa bắt được côn trùng nào. Hãy mua Vợt Gỗ, bật Joystick và đi chậm rón rén gần các bụi hoa, gốc cây, tảng đá để bắt!
        </div>
      ) : (
        <div
          className={`space-y-2 overflow-y-auto pr-1 ${
            compact ? 'max-h-64' : 'max-h-[340px]'
          }`}>
          {insectBasket.map((item) => {
            const spec = INSECT_CATALOG[item.speciesId];
            if (!spec) return null;
            const price = computeInsectSellPrice(item.speciesId, item.lengthMm);
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
                        : 'bg-[#E9F6EC] border-[#C5E4CE]'
                    }`}>
                    <InsectIllustration speciesId={item.speciesId} className="w-10 h-10" />
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
                      <span>Kích thước: {item.lengthMm} mm</span>
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
                    onClick={() => onSellInsect(item.id)}
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
