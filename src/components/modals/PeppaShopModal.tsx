import React, {useState} from 'react';
import {
  BookOpen,
  Check,
  Coins,
  Info,
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
import {PeppaDishIcon, PeppaIngredientIcon} from './PeppaFoodIcons';

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
  const [feedback, setFeedback] = useState<{ok: boolean; text: string} | null>(null);

  const visibleRecipes = PEPPA_RECIPE_LIST.filter((r) =>
    applianceFilter === 'all' ? true : r.appliance === applianceFilter,
  );

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border-4 border-[#DB6391] bg-[#FFF9FB] text-[#3A1E2B] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#F3CFD9] bg-gradient-to-r from-[#FFE2ED] via-[#FFF0F6] to-[#FFE2ED] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#E67BA5] bg-white shadow-xs">
              <PeppaPigBadgeIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#7E1840]">Siêu Thị Mini của Peppa</h2>
              <p className="text-[11px] font-bold text-[#8A4A62]">
                Nguyên liệu tươi sạch &amp; Công thức nấu ăn tại nhà
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#E5B87B] bg-[#FFF4DC] px-2.5 py-1 text-xs font-black text-[#8B5314] tabular-nums">
              <Coins className="h-3.5 w-3.5 text-[#D88B1C]" />
              <span>{coins.toLocaleString('vi-VN')} Xu</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F4CEDB] text-[#721F41] transition active:scale-95"
              aria-label="Đóng Siêu Thị Peppa"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Clear Pantry Info + Feedback */}
        <div className="shrink-0 border-b border-[#F5DAE5] bg-[#FFF1F7] px-4 py-2 text-[11px] font-bold">
          {feedback ? (
            <span
              className={`flex items-center gap-1.5 ${
                feedback.ok ? 'text-[#186A42]' : 'text-[#A62843]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{feedback.text}</span>
            </span>
          ) : (
            <span className="flex items-start gap-1.5 text-[#6D2542]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C94477]" />
              <span>
                Nguyên liệu mua xong sẽ tự cất vào <b>Kho Bếp</b> (không cầm trên tay) — về nhà bấm vào Lò Vi Sóng / Lò Nướng Mini sẽ tự có sẵn để nấu!
              </span>
            </span>
          )}
        </div>

        {/* Top Mode Tabs */}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-[#F5E0E8] bg-[#FCEAF1] px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('ingredients');
            }}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all ${
              tab === 'ingredients'
                ? 'bg-[#D63F76] text-white shadow-sm'
                : 'border border-[#EECAD7] bg-white text-[#6C344A] hover:bg-[#FFF8FB]'
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
                ? 'bg-[#D63F76] text-white shadow-sm'
                : 'border border-[#EECAD7] bg-white text-[#6C344A] hover:bg-[#FFF8FB]'
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
          <div className="flex shrink-0 items-center gap-1.5 border-b border-[#F3DAE4] bg-[#FFF5F9] px-4 py-2">
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
                    ? 'bg-[#7E1840] text-white'
                    : 'bg-[#F4DCE6] text-[#5F2B40] hover:bg-[#EBCAD8]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content List */}
        <div className="custom-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3.5 sm:p-4">
          {tab === 'ingredients'
            ? PEPPA_INGREDIENT_LIST.map((ing) => {
                const owned = ingredients[ing.id] ?? 0;
                const canBuy1 = coins >= ing.price;
                const canBuy5 = coins >= ing.price * 5;
                return (
                  <div
                    key={ing.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#EED0DC] bg-white p-3 shadow-xs transition hover:border-[#DF83A6]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-[#F2D9E3] bg-[#FFF5F9]">
                        <PeppaIngredientIcon id={ing.id} className="h-10 w-10" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-xs font-black text-[#3A1E2B]">{ing.name}</h3>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                              owned > 0
                                ? 'bg-[#E4F6EC] text-[#1C6C42]'
                                : 'bg-[#F6EDF1] text-[#7D5868]'
                            }`}
                          >
                            Kho Bếp: {owned}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-[#6B4A58]">
                          {ing.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button
                        type="button"
                        disabled={!canBuy1}
                        onClick={() => {
                          const ok = onBuyIngredient(ing.id, 1);
                          if (ok) {
                            soundFX.sparkle();
                            setFeedback({
                              ok: true,
                              text: `Đã mua 1x ${ing.name} vào Kho Bếp!`,
                            });
                          } else {
                            soundFX.tap();
                            setFeedback({
                              ok: false,
                              text: `Cần ${ing.price} Xu để mua ${ing.name}!`,
                            });
                          }
                        }}
                        className="min-w-[92px] rounded-xl bg-[#D63F76] px-2.5 py-1.5 text-[11px] font-black text-white shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300"
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
                            setFeedback({
                              ok: true,
                              text: `Đã mua 5x ${ing.name} vào Kho Bếp!`,
                            });
                          } else {
                            soundFX.tap();
                            setFeedback({
                              ok: false,
                              text: `Cần ${ing.price * 5} Xu để mua 5x ${ing.name}!`,
                            });
                          }
                        }}
                        className="min-w-[92px] rounded-lg border border-[#E59CB8] bg-[#FFF1F6] px-2 py-0.5 text-[10px] font-extrabold text-[#94214C] transition active:scale-95 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
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
                        ? 'border-[#B6E0C6] bg-[#F5FCF8]'
                        : 'border-[#EED0DC] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F0D9E2] bg-[#FFF7FA]">
                          <PeppaDishIcon id={rec.id} className="h-10 w-10" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-xs font-black text-[#3A1E2B]">{rec.name}</h3>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                rec.appliance === 'microwave'
                                  ? 'bg-[#E3F2FA] text-[#1C6182]'
                                  : 'bg-[#FFEFDC] text-[#9A4E13]'
                              }`}
                            >
                              {applianceLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#6B4A58]">
                            {rec.description}
                          </p>
                        </div>
                      </div>

                      {isUnlocked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#247D50] px-2.5 py-1.5 text-[11px] font-black text-white">
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
                              setFeedback({
                                ok: true,
                                text: `Đã mở khóa "${rec.name}"! Về nhà bấm vào ${applianceLabel} để nấu nhé.`,
                              });
                            } else {
                              soundFX.tap();
                              setFeedback({
                                ok: false,
                                text: `Cần ${rec.recipePrice} Xu để mua công thức này.`,
                              });
                            }
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#D63F76] px-3 py-1.5 text-[11px] font-black text-white shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300"
                        >
                          <Lock className="h-3 w-3" />
                          <span>{rec.recipePrice} Xu</span>
                        </button>
                      )}
                    </div>

                    {/* Visual Ingredients Required */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-dashed border-[#E6CFD9] pt-2 text-[10px] font-bold">
                      {rec.ingredients.map((req) => {
                        const ingDef = PEPPA_INGREDIENTS[req.id];
                        const have = ingredients[req.id] ?? 0;
                        return (
                          <span
                            key={req.id}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ${
                              have >= req.qty
                                ? 'bg-[#E5F6EC] text-[#1D6A42]'
                                : 'bg-[#F7ECF0] text-[#704356]'
                            }`}
                          >
                            <PeppaIngredientIcon id={req.id} className="h-4 w-4 shrink-0" />
                            <span>
                              {ingDef.name} x{req.qty} ({have})
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#E4F2FE] px-1.5 py-0.5 text-[#175B8A]">
                        <Zap className="h-3 w-3" />+{rec.energyRestore} Thể lực
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FFF2DD] px-1.5 py-0.5 text-[#9C5814]">
                        <Utensils className="h-3 w-3" />+{rec.hungerRestore} Độ no
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#F2ECFF] px-1.5 py-0.5 text-[#5D3F9E]">
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
