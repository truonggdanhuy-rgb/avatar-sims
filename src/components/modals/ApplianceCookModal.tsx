import React, {useState} from 'react';
import {
  BookOpen,
  ChefHat,
  Coins,
  Flame,
  Lock,
  Sparkles,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import {
  KitchenApplianceId,
  PEPPA_INGREDIENTS,
  PEPPA_RECIPE_LIST,
  PeppaIngredientId,
  PeppaRecipeId,
} from '../../data/peppaKitchenCatalog';
import {soundFX} from '../../utils/sound';

interface ApplianceCookModalProps {
  appliance: KitchenApplianceId;
  coins: number;
  energy: number;
  hunger: number;
  ingredients: Partial<Record<PeppaIngredientId, number>>;
  unlockedRecipes: PeppaRecipeId[];
  dishes: Partial<Record<PeppaRecipeId, number>>;
  onCookDish: (recipeId: PeppaRecipeId) => {ok: boolean; message: string};
  onEatDish: (recipeId: PeppaRecipeId) => {ok: boolean; message: string};
  onSellDish: (recipeId: PeppaRecipeId) => {ok: boolean; message: string};
  onClose: () => void;
}

export const ApplianceCookModal: React.FC<ApplianceCookModalProps> = ({
  appliance,
  coins,
  energy,
  hunger,
  ingredients,
  unlockedRecipes,
  dishes,
  onCookDish,
  onEatDish,
  onSellDish,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const recipes = PEPPA_RECIPE_LIST.filter((r) => r.appliance === appliance);
  const isMicrowave = appliance === 'microwave';

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#5C8AA3] bg-[#F7FBFE] text-[#283B48] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#D5E6F0] bg-[#E5F2FA] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-xs ${
                isMicrowave ? 'bg-[#3D8BAE]' : 'bg-[#D97736]'
              }`}
            >
              {isMicrowave ? <ChefHat className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1E3B4D]">
                {isMicrowave ? 'Lò Vi Sóng Mây Tiện Lợi' : 'Lò Nướng Mini Đa Năng'}
              </h2>
              <p className="text-[11px] font-semibold text-[#54758A]">
                Chọn công thức đã mở khóa để nấu món ăn hồi thể lực!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#ECC38C] bg-[#FFF4DC] px-2 py-1 text-[11px] font-extrabold text-[#945D18]">
              <Coins className="h-3.5 w-3.5 text-[#DF9422]" />
              <span>{coins.toLocaleString('vi-VN')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D5E6F0] text-[#2C4E63] transition-transform active:scale-95"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E0EEF5] bg-[#EFF7FB] px-4 py-2 text-[11px] font-bold">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#E0F2FE] px-2 py-0.5 text-[#175B8A]">
              <Zap className="h-3.5 w-3.5" />
              Thể lực: {Math.round(energy)}/100
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFF1DC] px-2 py-0.5 text-[#9C5814]">
              <Utensils className="h-3.5 w-3.5" />
              Độ no: {Math.round(hunger)}/100
            </span>
          </div>
          {feedback && (
            <span className="flex items-center gap-1 text-[#1E7549]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{feedback}</span>
            </span>
          )}
        </div>

        {/* Recipes List */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4">
          {recipes.map((rec) => {
            const isUnlocked = unlockedRecipes.includes(rec.id);
            const dishCount = dishes[rec.id] ?? 0;
            const hasAllIngredients = rec.ingredients.every(
              (req) => (ingredients[req.id] ?? 0) >= req.qty,
            );

            return (
              <div
                key={rec.id}
                className={`rounded-2xl border-2 p-3.5 shadow-xs ${
                  isUnlocked
                    ? 'border-[#C8DFEC] bg-white'
                    : 'border-[#DCE6EC] bg-[#F1F5F8] opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-xs font-black text-[#1E3B4D]">{rec.name}</h3>
                      {dishCount > 0 && (
                        <span className="rounded-md bg-[#E6F7EE] px-1.5 py-0.5 text-[10px] font-extrabold text-[#1E7449]">
                          Trong túi: {dishCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#557182]">{rec.description}</p>
                  </div>

                  {!isUnlocked && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#E1E9EE] px-2.5 py-1 text-[10px] font-black text-[#58707F]">
                      <Lock className="h-3 w-3" />
                      <span>Chưa có công thức</span>
                    </span>
                  )}
                </div>

                {/* Dish Stats */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-[#E2F2FE] px-1.5 py-0.5 text-[#175B8A]">
                    <Zap className="h-3 w-3" />+{rec.energyRestore} Thể lực
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FFF2DD] px-1.5 py-0.5 text-[#9C5814]">
                    <Utensils className="h-3 w-3" />+{rec.hungerRestore} Độ no
                  </span>
                  <span className="rounded-md bg-[#F2ECFF] px-1.5 py-0.5 text-[#5D3F9E]">
                    Bán {rec.sellPrice} Xu
                  </span>
                </div>

                {isUnlocked ? (
                  <>
                    {/* Recipe Steps Instruction Box */}
                    <div className="mt-2.5 rounded-xl border border-[#DCEBF3] bg-[#F4FAFD] p-2.5">
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#2E6985]">
                        <BookOpen className="h-3 w-3" />
                        <span>Hướng dẫn công thức</span>
                      </div>
                      <ol className="list-inside list-decimal space-y-0.5 text-[11px] leading-snug text-[#395769]">
                        {rec.steps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Required Ingredients */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      {rec.ingredients.map((req) => {
                        const ing = PEPPA_INGREDIENTS[req.id];
                        const have = ingredients[req.id] ?? 0;
                        const ok = have >= req.qty;
                        return (
                          <span
                            key={req.id}
                            className={`rounded-md px-1.5 py-0.5 ${
                              ok
                                ? 'bg-[#E6F7EE] text-[#1D7047]'
                                : 'bg-[#FCEAEF] text-[#A82C4C]'
                            }`}
                          >
                            {ing.name}: {have}/{req.qty}
                          </span>
                        );
                      })}
                    </div>

                    {/* Cook / Eat / Sell Buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!hasAllIngredients}
                        onClick={() => {
                          const res = onCookDish(rec.id);
                          setFeedback(res.message);
                          if (res.ok) soundFX.sparkle();
                          else soundFX.tap();
                        }}
                        className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2A84A8] px-3 text-xs font-black text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300"
                      >
                        <ChefHat className="h-3.5 w-3.5" />
                        <span>{hasAllIngredients ? 'Nấu Ngay' : 'Thiếu Nguyên Liệu'}</span>
                      </button>

                      {dishCount > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const res = onEatDish(rec.id);
                              setFeedback(res.message);
                              if (res.ok) soundFX.sparkle();
                              else soundFX.tap();
                            }}
                            className="flex min-h-[36px] items-center justify-center gap-1 rounded-xl border border-[#A5D9BE] bg-[#E8F8F0] px-2.5 text-[11px] font-black text-[#1E7248] transition-transform active:scale-95"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Ăn</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const res = onSellDish(rec.id);
                              setFeedback(res.message);
                              if (res.ok) soundFX.sparkle();
                              else soundFX.tap();
                            }}
                            className="flex min-h-[36px] items-center justify-center gap-1 rounded-xl border border-[#ECC38C] bg-[#FFF4DC] px-2.5 text-[11px] font-black text-[#945D18] transition-transform active:scale-95"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            <span>Bán {rec.sellPrice}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-2.5 rounded-xl border border-dashed border-[#CBD8E0] bg-white/75 px-3 py-2 text-[11px] font-bold text-[#607988]">
                    Hãy ghé <span className="text-[#B8295E]">Siêu Thị Mini của Peppa</span> ở Tầng 1 Mây Mall để mua công thức này trước khi nấu nhé!
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
