import React, {useState} from 'react';
import {Coins, CupSoda, Hand, Sparkles, UtensilsCrossed, X} from 'lucide-react';
import {BBQ_FOOD_CATALOG, VENDING_DRINK_LIST} from '../../data/foodCatalog';
import {BbqFoodId} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {BbqFoodIcon} from './BbqGrillModal';

export const HandheldFoodIcon: React.FC<{foodId: BbqFoodId; className?: string}> = ({
  foodId,
  className = 'w-10 h-10',
}) => {
  if (
    foodId === 'bbq_meat_skewer' ||
    foodId === 'bbq_grilled_fish' ||
    foodId === 'bbq_corn_sausage'
  ) {
    return <BbqFoodIcon foodId={foodId} className={className} />;
  }
  if (foodId === 'drink_water') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <rect x="20" y="6" width="8" height="4.5" rx="1.5" fill="#2E7DAF" stroke="#1E435C" strokeWidth="1.5" />
        <path
          d="M19 11H29L32 16.5V39C32 40.6569 30.6569 42 29 42H19C17.3431 42 16 40.6569 16 39V16.5L19 11Z"
          fill="#CBEFFF"
          stroke="#2A6587"
          strokeWidth="1.8"
        />
        <rect x="16.5" y="21" width="15" height="9" fill="#52B5E5" />
        <path d="M18 25.5H30" stroke="#E5F8FF" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20 15V37" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }
  if (foodId === 'drink_strawberry_milk') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <path d="M28 15L32 7H35" stroke="#F45D89" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 16L24 11L33 16" fill="#FFD3E2" stroke="#9C3F5F" strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="15" y="16" width="18" height="25" rx="2.5" fill="#FFB5CE" stroke="#9C3F5F" strokeWidth="1.8" />
        <rect x="15" y="23" width="18" height="11" fill="#FFF7FA" />
        <circle cx="24" cy="28.5" r="4" fill="#F0517F" />
        <path d="M22.5 24.5L24 22.8L25.5 24.5" stroke="#4D9E52" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (foodId === 'drink_matcha_can') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <rect x="16" y="10" width="16" height="31" rx="4" fill="#6BB876" stroke="#285932" strokeWidth="1.8" />
        <ellipse cx="24" cy="11.5" rx="7.5" ry="2.2" fill="#DCE5EC" stroke="#4B5B66" strokeWidth="1.2" />
        <rect x="16.5" y="19" width="15" height="12" fill="#E9F7E4" />
        <circle cx="24" cy="25" r="4" fill="#3D8D4B" />
        <path d="M24 21C26 23 26 27 24 29C22 27 22 23 24 21Z" fill="#B8ED9B" />
      </svg>
    );
  }
  // drink_cola (Soda Cam Chanh)
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <rect x="16" y="10" width="16" height="31" rx="4" fill="#EB6B36" stroke="#6E2811" strokeWidth="1.8" />
      <ellipse cx="24" cy="11.5" rx="7.5" ry="2.2" fill="#E3EAEF" stroke="#535D66" strokeWidth="1.2" />
      <rect x="16.5" y="19" width="15" height="11" fill="#FFF4D8" />
      <circle cx="24" cy="24.5" r="3.8" fill="#F6B83B" stroke="#D96B27" strokeWidth="1.2" />
      <circle cx="21" cy="34" r="1.4" fill="#FFE8A3" />
      <circle cx="27" cy="15" r="1.3" fill="#FFE8A3" />
    </svg>
  );
};

interface VendingMachineModalProps {
  coins: number;
  hunger: number;
  bbqFoods: Partial<Record<BbqFoodId, number>>;
  onBuyDrink: (drinkId: BbqFoodId) => {ok: boolean; message: string};
  onOpenBagFood: () => void;
  onClose: () => void;
}

export const VendingMachineModal: React.FC<VendingMachineModalProps> = ({
  coins,
  hunger,
  bbqFoods,
  onBuyDrink,
  onOpenBagFood,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#2D6E96] bg-[#F5FAFE] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#236792] via-[#2F84B5] to-[#419FD1] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <CupSoda className="h-5 w-5 text-[#FFE57F]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Máy Bán Nước Tự Động</h2>
              <p className="text-[11px] font-bold text-sky-100">
                4 loại thức uống giá rẻ · Cầm tay &amp; uống hồi độ no
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
              aria-label="Đóng máy bán nước"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[#233D4D]">
          <div className="flex items-center justify-between rounded-2xl border border-[#CFE3F0] bg-white px-3.5 py-2.5 text-xs font-bold">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#2C7CA8]" />
              <span>Độ no hiện tại:</span>
              <span className="font-black text-[#226A93] tabular-nums">{Math.round(hunger)}%</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
                onOpenBagFood();
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-[#DFF0FA] px-2.5 py-1 text-[11px] font-black text-[#235F82] transition hover:bg-[#CBE4F4] active:scale-95"
            >
              <Hand className="h-3 w-3" />
              Mở Túi Thức Ăn
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {VENDING_DRINK_LIST.map((drink) => {
              const ownedCount = bbqFoods[drink.id] ?? 0;
              const canAfford = coins >= drink.price;
              const def = BBQ_FOOD_CATALOG[drink.id];
              return (
                <div
                  key={drink.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-[#D2E5F2] bg-white p-3 shadow-xs transition hover:border-[#5CA4CF]"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#DCEBF5] bg-[#F2F9FE]">
                        <HandheldFoodIcon foodId={drink.id} className="h-10 w-10" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-black text-[#1E3B4D]">
                          {def.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-extrabold">
                          <span className="rounded bg-[#E5F6EC] px-1.5 py-0.5 text-[#256D3F]">
                            +{drink.hungerRestore}% Độ no
                          </span>
                          <span className="rounded bg-[#FFF2D4] px-1.5 py-0.5 text-[#9C5C14] tabular-nums">
                            {drink.price} Xu
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-[#617E91]">
                      <span>Cầm tay 3D</span>
                      <span className="tabular-nums">
                        Trong túi: <strong className="text-[#233D4D]">{ownedCount}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      const res = onBuyDrink(drink.id);
                      if (res.ok) soundFX.sparkle();
                      else soundFX.tap();
                      setFeedback(res.message);
                    }}
                    className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl bg-[#2D82B2] py-2 text-xs font-black text-white shadow-xs transition hover:bg-[#236B94] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <CupSoda className="h-3.5 w-3.5" />
                    {canAfford ? `Mua (-${drink.price} Xu)` : `Cần ${drink.price} Xu`}
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
