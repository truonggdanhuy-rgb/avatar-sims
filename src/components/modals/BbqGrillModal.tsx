import React, {useState} from 'react';
import {Coins, Flame, Hand, Sparkles, UtensilsCrossed, X} from 'lucide-react';
import {BBQ_FOOD_LIST} from '../../data/foodCatalog';
import {BbqFoodId} from '../../types/game';
import {soundFX} from '../../utils/sound';

export const BbqFoodIcon: React.FC<{foodId: BbqFoodId; className?: string}> = ({
  foodId,
  className = 'w-10 h-10',
}) => {
  if (foodId === 'bbq_meat_skewer') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <path d="M10 38L38 10" stroke="#C69760" strokeWidth="3" strokeLinecap="round" />
        <rect x="13" y="25" width="9" height="9" rx="3" transform="rotate(-45 17.5 29.5)" fill="#5DB249" stroke="#3F2817" strokeWidth="1.6" />
        <rect x="19" y="18" width="11" height="10" rx="3" transform="rotate(-45 24.5 23)" fill="#BD4D29" stroke="#3F2817" strokeWidth="1.6" />
        <path d="M21 21L26 26" stroke="#532314" strokeWidth="2" strokeLinecap="round" />
        <rect x="26" y="11" width="9" height="9" rx="3" transform="rotate(-45 30.5 15.5)" fill="#F3BA3D" stroke="#3F2817" strokeWidth="1.6" />
        <rect x="31" y="7" width="8" height="8" rx="3" transform="rotate(-45 35 11)" fill="#BD4D29" stroke="#3F2817" strokeWidth="1.6" />
      </svg>
    );
  }
  if (foodId === 'bbq_grilled_fish') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <ellipse cx="24" cy="27" rx="18" ry="11" fill="#5CA14E" stroke="#2D5A27" strokeWidth="2" />
        <path d="M12 25C16 17 28 17 34 25C28 33 16 33 12 25Z" fill="#DF8E3A" stroke="#4D2912" strokeWidth="1.8" />
        <path d="M34 25L41 19V31L34 25Z" fill="#D57D2C" stroke="#4D2912" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M19 21L21 28M24 20L26 28M29 21L30 27" stroke="#5D3117" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16.5" cy="24" r="1.5" fill="#3B2414" />
        <circle cx="29" cy="31" r="3.6" fill="#FAE063" stroke="#C59822" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path d="M21 30V42M28 30V42" stroke="#C69760" strokeWidth="2.8" strokeLinecap="round" />
      <rect x="14" y="10" width="11" height="21" rx="5.5" fill="#F5C93E" stroke="#5D3E12" strokeWidth="1.8" />
      <path d="M16 16H23M16 21H23M16 26H23" stroke="#D59A1B" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="25" y="11" width="9" height="20" rx="4.5" fill="#CA4C35" stroke="#4A1E13" strokeWidth="1.8" />
      <path d="M27 16L32 18M27 21L32 23M27 26L32 28" stroke="#522214" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

interface BbqGrillModalProps {
  coins: number;
  hunger: number;
  bbqFoods: Partial<Record<BbqFoodId, number>>;
  onCookFood: (foodId: BbqFoodId) => {ok: boolean; message: string};
  onOpenBagFood: () => void;
  onClose: () => void;
}

export const BbqGrillModal: React.FC<BbqGrillModalProps> = ({
  coins,
  hunger,
  bbqFoods,
  onCookFood,
  onOpenBagFood,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#8A5636] bg-[#FFF8EB] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#8E3C26] via-[#B44D2D] to-[#CE6735] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Flame className="h-5 w-5 text-[#FFE082]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Lò Nướng BBQ Cắm Trại</h2>
              <p className="text-[11px] font-bold text-amber-100">
                Chế biến đồ ăn cầm tay · Hồi +20% Độ no mỗi món
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
              aria-label="Đóng lò nướng BBQ"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[#3B2A1A]">
          <div className="flex items-center justify-between rounded-2xl border border-[#E7D4B6] bg-white px-3.5 py-2.5 text-xs font-bold">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#C9632B]" />
              <span>Độ no hiện tại:</span>
              <span className="font-black text-[#B8571D] tabular-nums">{Math.round(hunger)}%</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
                onOpenBagFood();
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-[#EFE1C8] px-2.5 py-1 text-[11px] font-black text-[#5C3F23] transition hover:bg-[#E5D1AF] active:scale-95"
            >
              <Hand className="h-3 w-3" />
              Mở Túi Thức Ăn
            </button>
          </div>

          <div className="space-y-2.5">
            {BBQ_FOOD_LIST.map((food) => {
              const ownedCount = bbqFoods[food.id] ?? 0;
              const canAfford = coins >= food.price;
              return (
                <div
                  key={food.id}
                  className="rounded-2xl border-2 border-[#E4D1B1] bg-white p-3.5 shadow-xs transition hover:border-[#D49F6A]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#EFE0C7] bg-[#FFF8ED]">
                      <BbqFoodIcon foodId={food.id} className="h-11 w-11" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-sm font-black text-[#3B2A1A]">{food.name}</span>
                        <span className="rounded-lg bg-[#FFF2D4] px-2 py-0.5 text-[11px] font-black text-[#9C5C14] tabular-nums">
                          {food.price} Xu
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#6E563F]">
                        {food.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                        <span className="rounded-md bg-[#E8F6EC] px-2 py-0.5 text-[#286F40]">
                          +{food.hungerRestore}% Độ no
                        </span>
                        <span className="rounded-md bg-[#EAF3FA] px-2 py-0.5 text-[#27608B]">
                          Cầm tay 3D
                        </span>
                        <span className="ml-auto text-[#7B6247] tabular-nums">
                          Trong túi: <strong className="text-[#4A3525]">{ownedCount}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      const res = onCookFood(food.id);
                      if (res.ok) soundFX.sparkle();
                      else soundFX.tap();
                      setFeedback(res.message);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#C9582A] py-2.5 text-xs font-black text-white shadow-xs transition hover:bg-[#B2491F] active:scale-98 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    {canAfford
                      ? `Nướng 1 phần (-${food.price} Xu)`
                      : `Chưa đủ ${food.price} Xu`}
                  </button>
                </div>
              );
            })}
          </div>

          {feedback && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#C6E4CD] bg-[#ECF8EF] px-3.5 py-2 text-xs font-bold text-[#25653B]">
              <Sparkles className="h-4 w-4 shrink-0 text-[#3B9A5C]" />
              <span>{feedback}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
