import React, {useState} from 'react';
import {
  BookOpen,
  Check,
  ChefHat,
  Coins,
  Flame,
  Lock,
  ShoppingBasket,
  Sparkles,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import {
  KitchenApplianceId,
  PEPPA_INGREDIENT_LIST,
  PEPPA_INGREDIENTS,
  PEPPA_RECIPE_LIST,
  PeppaIngredientId,
  PeppaRecipeId,
} from '../../data/peppaKitchenCatalog';
import {soundFX} from '../../utils/sound';

interface PeppaShopModalProps {
  coins: number;
  ingredients: Partial<Record<PeppaIngredientId, number>>;
  unlockedRecipes: PeppaRecipeId[];
  onBuyIngredient: (id: PeppaIngredientId, qty: number) => boolean;
  onBuyRecipe: (id: PeppaRecipeId) => boolean;
  onClose: () => void;
}

const PeppaPigBadgeIcon: React.FC<{className?: string}> = ({className = 'h-7 w-7'}) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
    <ellipse cx="22" cy="14" rx="5.5" ry="9" transform="rotate(-12 22 14)" fill="#F99EC2" stroke="#9B325B" strokeWidth="2.5" />
    <ellipse cx="40" cy="14" rx="5.5" ry="9" transform="rotate(10 40 14)" fill="#F99EC2" stroke="#9B325B" strokeWidth="2.5" />
    <circle cx="32" cy="34" r="20" fill="#FFB3D1" stroke="#9B325B" strokeWidth="2.5" />
    <ellipse cx="46" cy="30" rx="11" ry="8" fill="#FFB3D1" stroke="#9B325B" strokeWidth="2.5" />
    <ellipse cx="52" cy="30" rx="5.5" ry="7.2" fill="#FFCCE1" stroke="#9B325B" strokeWidth="2.2" />
    <circle cx="50.5" cy="28.5" r="1.5" fill="#B8336A" />
    <circle cx="53.8" cy="30.5" r="1.5" fill="#B8336A" />
    <circle cx="24" cy="28" r="3.4" fill="#FFFFFF" stroke="#9B325B" strokeWidth="1.5" />
    <circle cx="24.5" cy="28" r="1.6" fill="#2A1F24" />
    <circle cx="33" cy="27" r="3.4" fill="#FFFFFF" stroke="#9B325B" strokeWidth="1.5" />
    <circle cx="33.5" cy="27" r="1.6" fill="#2A1F24" />
    <circle cx="21" cy="38" r="4.5" fill="#F26C97" opacity="0.7" />
    <path d="M25 42c3.5 3.5 9.5 3.5 13 0" stroke="#B8336A" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const PeppaShopModal: React.FC<PeppaShopModalProps> = ({
  coins,
  ingredients,
  unlockedRecipes,
  onBuyIngredient,
  onBuyRecipe,
  onClose,
}) => {
  const [tab, setTab] = useState<'ingredients' | 'recipes'>('ingredients');
  const [applianceFilter, setApplianceFilter] = useState<'all' | KitchenApplianceId>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleRecipes = PEPPA_RECIPE_LIST.filter((r) =>
    applianceFilter === 'all' ? true : r.appliance === applianceFilter,
  );

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#DF719B] bg-[#FFF8FB] text-[#4A2636] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#F5D3E1] bg-gradient-to-r from-[#FFE3EE] via-[#FFF1F6] to-[#FFE3EE] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#E986AC] bg-white shadow-xs">
              <PeppaPigBadgeIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#8B1E47]">Siêu Thị Mini của Peppa</h2>
              <p className="text-[11px] font-semibold text-[#9C5B73]">
                Nguyên liệu tươi ngon &amp; công thức nấu ăn hồi thể lực!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#ECC38C] bg-[#FFF4DC] px-2.5 py-1 text-xs font-extrabold text-[#945D18]">
              <Coins className="h-3.5 w-3.5 text-[#DF9422]" />
              <span>{coins.toLocaleString('vi-VN')} Xu</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6D5E2] text-[#7D2448] transition-transform active:scale-95"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Peppa Welcome Speech */}
        <div className="shrink-0 border-b border-[#F7DCE7] bg-[#FFF0F6] px-4 py-2 text-[11px] font-bold text-[#7F294D]">
          {feedback ? (
            <span className="flex items-center gap-1.5 text-[#1B7048]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{feedback}</span>
            </span>
          ) : (
            <span>
              Peppa: &quot;Xin chào! Mua công thức xong về nhà bấm vào Lò Vi Sóng hoặc Lò Nướng Mini để trổ tài nhé!&quot;
            </span>
          )}
        </div>

        {/* Top Mode Tabs */}
        <div className="grid shrink-0 grid-cols-2 gap-2 bg-[#FCECF2] px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('ingredients');
            }}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all ${
              tab === 'ingredients'
                ? 'bg-[#E24D82] text-white shadow-sm'
                : 'bg-white/80 text-[#7D435B] hover:bg-white'
            }`}
          >
            <ShoppingBasket className="h-4 w-4" />
            <span>Nguyên Liệu ({PEPPA_INGREDIENT_LIST.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('recipes');
            }}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all ${
              tab === 'recipes'
                ? 'bg-[#E24D82] text-white shadow-sm'
                : 'bg-white/80 text-[#7D435B] hover:bg-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>
              Công Thức ({unlockedRecipes.length}/{PEPPA_RECIPE_LIST.length})
            </span>
          </button>
        </div>

        {/* Subfilter for Recipes */}
        {tab === 'recipes' && (
          <div className="flex shrink-0 items-center gap-1.5 border-b border-[#F5DCE6] bg-[#FFF6F9] px-4 py-2">
            {(
              [
                ['all', 'Tất Cả'],
                ['microwave', 'Lò Vi Sóng'],
                ['mini_oven', 'Lò Nướng Mini'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setApplianceFilter(key);
                }}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
                  applianceFilter === key
                    ? 'bg-[#8B1E47] text-white'
                    : 'bg-[#F5E1EA] text-[#6E364D] hover:bg-[#EDD0DC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content List */}
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3.5 sm:p-4">
          {tab === 'ingredients'
            ? PEPPA_INGREDIENT_LIST.map((ing) => {
                const owned = ingredients[ing.id] ?? 0;
                const canBuy1 = coins >= ing.price;
                const canBuy5 = coins >= ing.price * 5;
                return (
                  <div
                    key={ing.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#F1D5E1] bg-white p-3 shadow-xs"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 text-sm font-black text-white shadow-inner"
                        style={{backgroundColor: ing.accentColor}}
                      >
                        {ing.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-xs font-black text-[#4A2636]">{ing.name}</h3>
                          {owned > 0 && (
                            <span className="rounded-md bg-[#E6F6EC] px-1.5 py-0.5 text-[10px] font-extrabold text-[#1F7048]">
                              Có {owned}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#7D5666]">
                          {ing.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        type="button"
                        disabled={!canBuy1}
                        onClick={() => {
                          const ok = onBuyIngredient(ing.id, 1);
                          if (ok) {
                            soundFX.sparkle();
                            setFeedback(`Đã mua 1x ${ing.name}!`);
                          } else {
                            soundFX.tap();
                            setFeedback(`Không đủ ${ing.price} Xu để mua ${ing.name}!`);
                          }
                        }}
                        className="rounded-xl bg-[#E24D82] px-2.5 py-1 text-[11px] font-black text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300"
                      >
                        Mua 1 · {ing.price} Xu
                      </button>
                      <button
                        type="button"
                        disabled={!canBuy5}
                        onClick={() => {
                          const ok = onBuyIngredient(ing.id, 5);
                          if (ok) {
                            soundFX.sparkle();
                            setFeedback(`Đã mua 5x ${ing.name}!`);
                          } else {
                            soundFX.tap();
                            setFeedback(`Cần ${ing.price * 5} Xu để mua 5x ${ing.name}!`);
                          }
                        }}
                        className="rounded-lg border border-[#E9A6BF] bg-[#FFF2F7] px-2 py-0.5 text-[10px] font-extrabold text-[#9E2753] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
                      >
                        Mua x5 · {ing.price * 5} Xu
                      </button>
                    </div>
                  </div>
                );
              })
            : visibleRecipes.map((rec) => {
                const isUnlocked = unlockedRecipes.includes(rec.id);
                const canAfford = coins >= rec.recipePrice;
                const applianceLabel =
                  rec.appliance === 'microwave' ? 'Lò Vi Sóng' : 'Lò Nướng Mini';

                return (
                  <div
                    key={rec.id}
                    className={`rounded-2xl border-2 p-3 shadow-xs ${
                      isUnlocked
                        ? 'border-[#BCE3CB] bg-[#F6FCF8]'
                        : 'border-[#F1D5E1] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div
                          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 text-white shadow-inner"
                          style={{backgroundColor: rec.accentColor}}
                        >
                          {rec.appliance === 'microwave' ? (
                            <ChefHat className="h-5 w-5" />
                          ) : (
                            <Flame className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-xs font-black text-[#4A2636]">{rec.name}</h3>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                rec.appliance === 'microwave'
                                  ? 'bg-[#E5F4FA] text-[#216785]'
                                  : 'bg-[#FFF0E0] text-[#A25317]'
                              }`}
                            >
                              {applianceLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#7D5666]">
                            {rec.description}
                          </p>
                        </div>
                      </div>

                      {isUnlocked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#278556] px-2.5 py-1 text-[11px] font-black text-white">
                          <Check className="h-3.5 w-3.5" />
                          <span>Đã sở hữu</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            const ok = onBuyRecipe(rec.id);
                            if (ok) {
                              soundFX.sparkle();
                              setFeedback(
                                `Đã mở khóa công thức "${rec.name}"! Xem chi tiết khi nấu tại nhà.`,
                              );
                            } else {
                              soundFX.tap();
                              setFeedback(`Cần ${rec.recipePrice} Xu để mua công thức này.`);
                            }
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#E24D82] px-2.5 py-1.5 text-[11px] font-black text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300"
                        >
                          <Lock className="h-3 w-3" />
                          <span>{rec.recipePrice} Xu</span>
                        </button>
                      )}
                    </div>

                    {/* Ingredients + Dish Stats */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-dashed border-[#E8D5DD] pt-2 text-[10px] font-bold">
                      {rec.ingredients.map((req) => {
                        const ingDef = PEPPA_INGREDIENTS[req.id];
                        const have = ingredients[req.id] ?? 0;
                        return (
                          <span
                            key={req.id}
                            className={`rounded-md px-1.5 py-0.5 ${
                              have >= req.qty
                                ? 'bg-[#E8F7EE] text-[#226B44]'
                                : 'bg-[#F5EBEF] text-[#784A5D]'
                            }`}
                          >
                            {ingDef.name} x{req.qty} ({have})
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#E8F4FF] px-1.5 py-0.5 text-[#1E6091]">
                        <Zap className="h-3 w-3" />+{rec.energyRestore} Thể lực
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FFF3DF] px-1.5 py-0.5 text-[#9C5B15]">
                        <Utensils className="h-3 w-3" />+{rec.hungerRestore} Độ no
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#F3EEFF] px-1.5 py-0.5 text-[#5D3F9E]">
                        Bán {rec.sellPrice} Xu
                      </span>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};
