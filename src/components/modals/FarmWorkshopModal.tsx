import React, {useState} from 'react';
import {ChefHat, Cog, Sparkles, X} from 'lucide-react';
import {
  DishCategory,
  getFarmItemCount,
  getFarmItemName,
  PROCESSED_LIST,
  RECIPE_LIST,
} from '../../data/farmCatalog';
import {FarmInventory, ProcessedId, RecipeId} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface FarmWorkshopModalProps {
  initialTab: 'mill' | 'kitchen';
  inventory: FarmInventory;
  onProcessItem: (id: ProcessedId) => void;
  onCookRecipe: (id: RecipeId) => void;
  onClose: () => void;
}

export const FarmWorkshopModal: React.FC<FarmWorkshopModalProps> = ({
  initialTab,
  inventory,
  onProcessItem,
  onCookRecipe,
  onClose,
}) => {
  const [tab, setTab] = useState<'mill' | 'kitchen'>(initialTab);
  const [dishFilter, setDishFilter] = useState<'all' | DishCategory>('all');

  const filteredRecipes =
    dishFilter === 'all'
      ? RECIPE_LIST
      : RECIPE_LIST.filter((r) => r.category === dishFilter);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex items-center gap-2">
            {tab === 'mill' ? (
              <Cog className="h-4 w-4 text-[#5A8759]" />
            ) : (
              <ChefHat className="h-4 w-4 text-[#C96B4B]" />
            )}
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              {tab === 'mill' ? 'Máy Ép Mía & Cối Xay' : 'Bếp Nông Trại'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng xưởng chế biến"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Station Switcher */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[#E5D5BE] bg-[#F6ECDC] px-4 py-2">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('mill');
            }}
            className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'mill'
                ? 'bg-[#5A8759] text-white shadow-xs'
                : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
            }`}
          >
            Máy Ép & Xay
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('kitchen');
            }}
            className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'kitchen'
                ? 'bg-[#C96B4B] text-white shadow-xs'
                : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
            }`}
          >
            Bếp Nông Trại
          </button>
        </div>

        {tab === 'kitchen' && (
          <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#FAF3E8] px-4 py-2">
            {(
              [
                {key: 'all', label: 'Tất cả'},
                {key: 'drink', label: 'Nước uống'},
                {key: 'bakery', label: 'Bánh ngọt'},
                {key: 'meal', label: 'Món ăn'},
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setDishFilter(f.key);
                }}
                className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  dishFilter === f.key
                    ? 'bg-[#6F4E37] text-amber-50'
                    : 'bg-[#EFE3D1] text-[#5B422E] hover:bg-[#E4D3BA]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="custom-scroll flex-1 overflow-y-auto p-4 text-[#4A3525]">
          {tab === 'mill' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PROCESSED_LIST.map((proc) => {
                const owned = getFarmItemCount(inventory, 'processed', proc.id);
                const canCraft = proc.inputs.every(
                  (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                );

                return (
                  <div
                    key={proc.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
                            style={{backgroundColor: proc.color}}
                          />
                          <span className="text-sm font-bold text-[#4A3525]">{proc.name}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-[#7A6048]">
                          Kho: {owned}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#7A6048]">
                        {proc.machineName} · {proc.description}
                      </div>

                      <div className="space-y-1 pt-1 text-xs">
                        {proc.inputs.map((inp) => {
                          const have = getFarmItemCount(inventory, inp.kind, inp.id);
                          const ok = have >= inp.qty;
                          return (
                            <div
                              key={`${proc.id}_${inp.id}`}
                              className="flex items-center justify-between"
                            >
                              <span className="text-[#5B422E]">
                                {getFarmItemName(inp.kind, inp.id)}
                              </span>
                              <span
                                className={`font-bold tabular-nums ${
                                  ok ? 'text-[#4B8A5B]' : 'text-[#C2515E]'
                                }`}
                              >
                                {have}/{inp.qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canCraft}
                      onClick={() => {
                        soundFX.sparkle();
                        onProcessItem(proc.id);
                      }}
                      className={`flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-transform active:scale-95 ${
                        canCraft
                          ? 'bg-[#5A8759] text-white shadow-xs'
                          : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Chế Biến +1</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredRecipes.map((rec) => {
                const owned = getFarmItemCount(inventory, 'dish', rec.id);
                const canCook = rec.inputs.every(
                  (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                );

                return (
                  <div
                    key={rec.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
                            style={{backgroundColor: rec.color}}
                          />
                          <span className="text-sm font-bold text-[#4A3525]">{rec.name}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-[#7A6048]">
                          Kho: {owned}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#7A6048]">
                        {rec.categoryLabel} · Đơn hàng ~{rec.orderValue} Xu
                      </div>

                      <div className="space-y-1 pt-1 text-xs">
                        {rec.inputs.map((inp) => {
                          const have = getFarmItemCount(inventory, inp.kind, inp.id);
                          const ok = have >= inp.qty;
                          return (
                            <div
                              key={`${rec.id}_${inp.id}`}
                              className="flex items-center justify-between"
                            >
                              <span className="text-[#5B422E]">
                                {getFarmItemName(inp.kind, inp.id)}
                              </span>
                              <span
                                className={`font-bold tabular-nums ${
                                  ok ? 'text-[#4B8A5B]' : 'text-[#C2515E]'
                                }`}
                              >
                                {have}/{inp.qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canCook}
                      onClick={() => {
                        soundFX.sparkle();
                        onCookRecipe(rec.id);
                      }}
                      className={`flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-transform active:scale-95 ${
                        canCook
                          ? 'bg-[#C96B4B] text-white shadow-xs'
                          : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                      }`}
                    >
                      <ChefHat className="h-3.5 w-3.5" />
                      <span>Nấu Món +1</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
