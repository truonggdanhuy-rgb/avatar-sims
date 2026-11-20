import React, {useEffect, useState} from 'react';
import {ArrowUp, ChefHat, Clock, Cog, Coins, PackageCheck, Sparkles, X} from 'lucide-react';
import {
  DishCategory,
  getFarmItemCount,
  getFarmItemName,
  KITCHEN_LEVELS,
  KITCHEN_RECIPES,
  PROCESSED_LIST,
  RECIPE_LIST,
} from '../../data/farmCatalog';
import {
  CookingJob,
  FarmInventory,
  KitchenLevel,
  ProcessedId,
  RecipeId,
} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface FarmWorkshopModalProps {
  station: 'mill' | 'kitchen';
  coins: number;
  kitchenLevel: KitchenLevel;
  cookingQueue: CookingJob[];
  inventory: FarmInventory;
  onProcessItem: (id: ProcessedId) => void;
  onStartCook: (id: RecipeId) => void;
  onCollectDish: (jobId: string) => void;
  onUpgradeKitchen: () => void;
  onClose: () => void;
}

function formatCookSeconds(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}g${m}p` : `${h}g`;
  return `${m}p`;
}

function formatRemainingMs(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}g${m.toString().padStart(2, '0')}p`;
  if (m > 0) return `${m}p${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export const FarmWorkshopModal: React.FC<FarmWorkshopModalProps> = ({
  station,
  coins,
  kitchenLevel,
  cookingQueue,
  inventory,
  onProcessItem,
  onStartCook,
  onCollectDish,
  onUpgradeKitchen,
  onClose,
}) => {
  const [dishFilter, setDishFilter] = useState<'all' | DishCategory>('all');
  const [confirmKitchenUpgrade, setConfirmKitchenUpgrade] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setConfirmKitchenUpgrade(false);
  }, [kitchenLevel, station]);

  useEffect(() => {
    if (cookingQueue.length === 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cookingQueue.length]);

  const kInfo = KITCHEN_LEVELS[kitchenLevel];
  const nextKitchenLevel = (kitchenLevel < 3 ? kitchenLevel + 1 : null) as KitchenLevel | null;
  const nextKitchenInfo = nextKitchenLevel ? KITCHEN_LEVELS[nextKitchenLevel] : null;
  const kitchenUpgradeCost = kInfo.upgradeCostToNext;
  const slotsFull = cookingQueue.length >= kInfo.slots;

  const filteredRecipes =
    dishFilter === 'all'
      ? RECIPE_LIST
      : RECIPE_LIST.filter((r) => r.category === dishFilter);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border-[3px] border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {station === 'mill' ? (
              <Cog className="h-4 w-4 shrink-0 text-[#5A8759]" />
            ) : (
              <ChefHat className="h-4 w-4 shrink-0 text-[#C96B4B]" />
            )}
            <h2 className="font-display truncate text-sm font-bold text-[#4A3525]">
              {station === 'mill'
                ? 'Máy Ép & Cối Xay'
                : `${kInfo.name} (${cookingQueue.length}/${kInfo.slots})`}
            </h2>
            {station === 'kitchen' &&
              (kitchenUpgradeCost !== null && nextKitchenInfo ? (
                <button
                  type="button"
                  disabled={coins < kitchenUpgradeCost}
                  title={`Nâng lên Lv.${nextKitchenInfo.level} (${kitchenUpgradeCost} Xu) · ${nextKitchenInfo.description}`}
                  aria-label={`Nâng cấp nhà bếp lên Lv.${nextKitchenInfo.level} tốn ${kitchenUpgradeCost} Xu`}
                  onClick={() => {
                    soundFX.tap();
                    setConfirmKitchenUpgrade((prev) => !prev);
                  }}
                  className={`flex h-6 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-[10px] font-bold tabular-nums transition-transform active:scale-95 ${
                    coins >= kitchenUpgradeCost
                      ? 'bg-[#C96B4B] text-white shadow-xs'
                      : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                  }`}
                >
                  <ArrowUp className="h-3 w-3" />
                  <span>{kitchenUpgradeCost}</span>
                </button>
              ) : (
                <span className="shrink-0 rounded bg-[#E8D4AC] px-1.5 py-0.5 text-[10px] font-bold text-[#7A541C]">
                  Max
                </span>
              ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-[#DFC7A5] bg-[#FFF8EB] px-2 py-0.5 text-xs font-bold tabular-nums text-[#6F4E37]">
              <Coins className="h-3 w-3 text-amber-500" />
              <span>{coins}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label={station === 'mill' ? 'Đóng máy ép xay' : 'Đóng bếp nông trại'}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {station === 'kitchen' &&
          confirmKitchenUpgrade &&
          kitchenUpgradeCost !== null &&
          nextKitchenInfo && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#D8C5A8] bg-[#FFF6E5] px-3 py-1.5 text-[11px] text-[#4A3525]">
              <span className="font-semibold">
                Nâng Lv.{nextKitchenInfo.level} ({nextKitchenInfo.description}) ·{' '}
                <strong className="text-[#9A5B25]">{kitchenUpgradeCost} Xu</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setConfirmKitchenUpgrade(false);
                  }}
                  className="min-h-[26px] rounded-lg bg-[#EADBC6] px-2.5 text-[11px] font-semibold text-[#5B422E] active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={coins < kitchenUpgradeCost}
                  onClick={() => {
                    soundFX.sparkle();
                    onUpgradeKitchen();
                    setConfirmKitchenUpgrade(false);
                  }}
                  className="min-h-[26px] rounded-lg bg-[#C96B4B] px-2.5 text-[11px] font-bold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                >
                  Nâng ({kitchenUpgradeCost})
                </button>
              </div>
            </div>
          )}

        {station === 'kitchen' && (
          <div className="custom-scroll flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-1">
            <div className="flex items-center gap-1">
              {(
                [
                  {key: 'all', label: 'Tất cả'},
                  {key: 'drink', label: 'Nước'},
                  {key: 'bakery', label: 'Bánh'},
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
                  className={`min-h-[24px] shrink-0 rounded-md px-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    dishFilter === f.key
                      ? 'bg-[#6F4E37] text-amber-50'
                      : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-[#7A6048]">
              {kInfo.description}
            </span>
          </div>
        )}

        <div className="custom-scroll flex-1 space-y-2 overflow-y-auto p-2 text-[#4A3525] sm:p-2.5">
          {station === 'mill' ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {PROCESSED_LIST.map((proc) => {
                const owned = getFarmItemCount(inventory, 'processed', proc.id);
                const canCraft = proc.inputs.every(
                  (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                );

                return (
                  <div
                    key={proc.id}
                    className="flex flex-col justify-between gap-1 rounded-xl border border-[#E0CEB6] bg-white p-1.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex min-w-0 items-center gap-1">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                            style={{backgroundColor: proc.color}}
                          />
                          <span className="truncate text-[11px] font-bold text-[#4A3525]">
                            {proc.name}
                          </span>
                        </div>
                        <span className="shrink-0 text-[9px] font-bold tabular-nums text-[#7A6048]">
                          ×{owned}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-0.5 text-[9px]">
                        {proc.inputs.map((inp) => {
                          const have = getFarmItemCount(inventory, inp.kind, inp.id);
                          const ok = have >= inp.qty;
                          return (
                            <span
                              key={`${proc.id}_${inp.id}`}
                              className={`rounded px-1 py-0.5 font-semibold tabular-nums ${
                                ok
                                  ? 'bg-[#EEF7F0] text-[#3F7B4E]'
                                  : 'bg-[#FDF0F2] text-[#C2515E]'
                              }`}
                            >
                              {getFarmItemName(inp.kind, inp.id)} {have}/{inp.qty}
                            </span>
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
                      className={`flex min-h-[24px] w-full items-center justify-center gap-1 rounded-md px-2 text-[10px] font-bold transition-transform active:scale-95 ${
                        canCraft
                          ? 'bg-[#5A8759] text-white shadow-xs'
                          : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                      }`}
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Ép +1 ({proc.sellPrice}Xu)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {cookingQueue.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#DFC5A6] bg-[#FFF8EE] p-1.5 sm:grid-cols-3">
                  {cookingQueue.map((job) => {
                    const rec = KITCHEN_RECIPES[job.recipeId];
                    if (!rec) return null;
                    const remMs = Math.max(0, job.readyAt - now);
                    const isDone = remMs <= 0;
                    const pct = isDone
                      ? 100
                      : Math.min(
                          99,
                          Math.max(4, Math.round((1 - remMs / job.durationMs) * 100)),
                        );

                    return (
                      <div
                        key={job.id}
                        className="flex flex-col justify-between gap-1 rounded-lg border border-[#E5D3BA] bg-white p-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex min-w-0 items-center gap-1">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full border border-black/15"
                              style={{backgroundColor: rec.color}}
                            />
                            <span className="truncate text-[10px] font-bold text-[#4A3525]">
                              {rec.name}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 text-[9px] font-bold tabular-nums ${
                              isDone ? 'text-[#4B8A5B]' : 'text-[#C96B4B]'
                            }`}
                          >
                            {isDone ? 'Xong!' : formatRemainingMs(remMs)}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                          <div
                            className={`h-full rounded-full ${
                              isDone ? 'bg-[#5FA86B]' : 'bg-[#DF8A58]'
                            }`}
                            style={{width: `${pct}%`}}
                          />
                        </div>
                        {isDone && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.sparkle();
                              onCollectDish(job.id);
                            }}
                            className="flex min-h-[22px] w-full items-center justify-center gap-1 rounded bg-[#5FA86B] px-1.5 text-[10px] font-bold text-white active:scale-95"
                          >
                            <PackageCheck className="h-3 w-3" />
                            <span>Nhận +1</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {filteredRecipes.map((rec) => {
                  const owned = getFarmItemCount(inventory, 'dish', rec.id);
                  const hasInputs = rec.inputs.every(
                    (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                  );
                  const canCook = hasInputs && !slotsFull;
                  const effectiveCookSec = Math.round(rec.cookSeconds * kInfo.speedMultiplier);

                  return (
                    <div
                      key={rec.id}
                      className="flex flex-col justify-between gap-1 rounded-xl border border-[#E0CEB6] bg-white p-1.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex min-w-0 items-center gap-1">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                              style={{backgroundColor: rec.color}}
                            />
                            <span className="truncate text-[11px] font-bold text-[#4A3525]">
                              {rec.name}
                            </span>
                          </div>
                          <span className="shrink-0 text-[9px] font-bold tabular-nums text-[#7A6048]">
                            {rec.sellPrice}Xu·×{owned}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-0.5 text-[9px]">
                          {rec.inputs.map((inp) => {
                            const have = getFarmItemCount(inventory, inp.kind, inp.id);
                            const ok = have >= inp.qty;
                            return (
                              <span
                                key={`${rec.id}_${inp.id}`}
                                className={`rounded px-1 py-0.5 font-semibold tabular-nums ${
                                  ok
                                    ? 'bg-[#EEF7F0] text-[#3F7B4E]'
                                    : 'bg-[#FDF0F2] text-[#C2515E]'
                                }`}
                              >
                                {getFarmItemName(inp.kind, inp.id)} {have}/{inp.qty}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canCook}
                        onClick={() => {
                          soundFX.sparkle();
                          onStartCook(rec.id);
                        }}
                        className={`flex min-h-[24px] w-full items-center justify-center gap-1 rounded-md px-1.5 text-[10px] font-bold transition-transform active:scale-95 ${
                          canCook
                            ? 'bg-[#C96B4B] text-white shadow-xs'
                            : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        <span>
                          {slotsFull ? 'Bếp Đầy' : `Nấu (${formatCookSeconds(effectiveCookSec)})`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

