import React, {useEffect, useState} from 'react';
import {ArrowUp, ChefHat, Clock, Cog, Coins, PackageCheck, Sparkles, X} from 'lucide-react';
import {
  DishCategory,
  getFarmItemCount,
  getFarmItemName,
  KITCHEN_LEVELS,
  KITCHEN_RECIPES,
  MILL_SLOTS,
  PROCESSED_ITEMS,
  PROCESSED_LIST,
  RECIPE_LIST,
} from '../../data/farmCatalog';
import {
  CookingJob,
  FarmInventory,
  KitchenLevel,
  MillJob,
  ProcessedId,
  RecipeId,
} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {FarmItemIcon} from '../FarmItemIcon';

interface FarmWorkshopModalProps {
  station: 'mill' | 'kitchen';
  coins: number;
  kitchenLevel: KitchenLevel;
  millQueue: MillJob[];
  cookingQueue: CookingJob[];
  inventory: FarmInventory;
  storageUsed: number;
  storageCapacity: number;
  storageFull?: boolean;
  onStartMill: (id: ProcessedId) => void;
  onCollectProcessed: (jobId: string) => void;
  onStartCook: (id: RecipeId) => void;
  onCollectDish: (jobId: string) => void;
  onUpgradeKitchen: () => void;
  onClose: () => void;
}

function formatDurationShort(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return m > 0 ? `${h}g${m}p` : `${h}g`;
  if (m > 0) return `${m}p`;
  return `${s}s`;
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
  millQueue,
  cookingQueue,
  inventory,
  storageUsed,
  storageCapacity,
  storageFull = false,
  onStartMill,
  onCollectProcessed,
  onStartCook,
  onCollectDish,
  onUpgradeKitchen,
  onClose,
}) => {
  const [dishFilter, setDishFilter] = useState<'all' | DishCategory>('all');
  const [selectedProcessedId, setSelectedProcessedId] = useState<ProcessedId>(
    PROCESSED_LIST[0].id,
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<RecipeId>(RECIPE_LIST[0].id);
  const [confirmKitchenUpgrade, setConfirmKitchenUpgrade] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setConfirmKitchenUpgrade(false);
  }, [kitchenLevel, station]);

  const activeQueueLen = station === 'mill' ? millQueue.length : cookingQueue.length;
  useEffect(() => {
    if (activeQueueLen === 0) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 300);
    return () => window.clearInterval(id);
  }, [activeQueueLen]);

  const kInfo = KITCHEN_LEVELS[kitchenLevel];
  const nextKitchenLevel = (kitchenLevel < 3 ? kitchenLevel + 1 : null) as KitchenLevel | null;
  const nextKitchenInfo = nextKitchenLevel ? KITCHEN_LEVELS[nextKitchenLevel] : null;
  const kitchenUpgradeCost = kInfo.upgradeCostToNext;

  const totalSlots = station === 'mill' ? MILL_SLOTS : kInfo.slots;
  const slotsFull =
    station === 'mill'
      ? millQueue.length >= MILL_SLOTS
      : cookingQueue.length >= kInfo.slots;

  const filteredRecipes =
    dishFilter === 'all'
      ? RECIPE_LIST
      : RECIPE_LIST.filter((r) => r.category === dishFilter);

  useEffect(() => {
    if (station !== 'kitchen') return;
    if (!filteredRecipes.some((r) => r.id === selectedRecipeId) && filteredRecipes[0]) {
      setSelectedRecipeId(filteredRecipes[0].id);
    }
  }, [dishFilter, filteredRecipes, selectedRecipeId, station]);

  const selectedProc = PROCESSED_ITEMS[selectedProcessedId] ?? PROCESSED_LIST[0];
  const selectedRec = KITCHEN_RECIPES[selectedRecipeId] ?? RECIPE_LIST[0];

  const activeProcReady = millQueue.filter((j) => now >= j.readyAt);
  const activeCookReady = cookingQueue.filter((j) => now >= j.readyAt);
  const doneCount = station === 'mill' ? activeProcReady.length : activeCookReady.length;

  const handleCollectAllReady = () => {
    if (storageFull) return;
    if (station === 'mill') {
      const free = Math.max(0, storageCapacity - storageUsed);
      activeProcReady.slice(0, free).forEach((j) => onCollectProcessed(j.id));
    } else {
      const free = Math.max(0, storageCapacity - storageUsed);
      activeCookReady.slice(0, free).forEach((j) => onCollectDish(j.id));
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-1.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-[min(93dvh,630px)] max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-[3px] border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-3 py-1.5 sm:py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {station === 'mill' ? (
              <Cog className="h-4 w-4 shrink-0 text-[#5A8759]" />
            ) : (
              <ChefHat className="h-4 w-4 shrink-0 text-[#C96B4B]" />
            )}
            <h2 className="font-display truncate text-sm font-bold text-[#4A3525]">
              {station === 'mill'
                ? `Máy Ép & Xay (${millQueue.length}/${MILL_SLOTS})`
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
            <span
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                storageFull
                  ? 'border-[#E6A3AD] bg-[#FFF1F3] text-[#B84356]'
                  : 'border-[#DFC7A5] bg-[#FFF8EB] text-[#5B422E]'
              }`}
              title="Sức chứa Nhà Kho"
            >
              Kho {storageUsed}/{storageCapacity}
            </span>
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
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Kitchen Upgrade Confirmation Strip */}
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

        {/* Responsive 2-Column Body: Grid & Queue on Left, Detail Inspector on Right */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[540px]:flex-row">
          {/* LEFT COLUMN: Filter + Queue Slots + Scrollable Catalog Grid */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Filter Bar (Kitchen) / Info Strip (Mill) */}
            {station === 'kitchen' ? (
              <div className="custom-scroll flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-1.5">
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
                      className={`min-h-[26px] shrink-0 rounded-lg px-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                        dishFilter === f.key
                          ? 'bg-[#6F4E37] text-amber-50'
                          : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="hidden shrink-0 text-[10px] font-semibold text-[#7A6048] lg:inline">
                  {kInfo.description}
                </span>
              </div>
            ) : (
              <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-1.5 text-[11px] font-semibold text-[#5E7052]">
                <span>4 ô chế biến nhanh (12s–24s)</span>
                <span className="hidden sm:inline">Chọn món bên dưới</span>
              </div>
            )}

            {/* Compact Queue Slots Strip */}
            <div className="shrink-0 border-b border-[#E5D5BE] bg-[#FFF8EE] px-2.5 py-1.5 sm:px-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#6F4E37]">
                <span>
                  {station === 'mill'
                    ? `Hàng chờ xay ép (${millQueue.length}/${MILL_SLOTS})`
                    : `Bếp đang nấu (${cookingQueue.length}/${kInfo.slots})`}
                </span>
                {doneCount >= 2 && (
                  <button
                    type="button"
                    disabled={storageFull}
                    onClick={() => {
                      soundFX.sparkle();
                      handleCollectAllReady();
                    }}
                    className="flex items-center gap-1 rounded-md bg-[#5FA86B] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                  >
                    <PackageCheck className="h-3 w-3" />
                    <span>{storageFull ? 'Kho đầy' : `Nhận hết (${doneCount})`}</span>
                  </button>
                )}
              </div>

              <div
                className={`grid gap-1 ${
                  totalSlots <= 4 ? 'grid-cols-4' : 'grid-cols-5'
                }`}
              >
                {Array.from({length: totalSlots}, (_, slotIdx) => {
                  const slotHeight = totalSlots > 5 ? 'h-10' : 'h-11 sm:h-12';
                  if (station === 'mill') {
                    const job = millQueue[slotIdx];
                    if (!job) {
                      return (
                        <div
                          key={`empty_mill_${slotIdx}`}
                          className={`flex ${slotHeight} items-center justify-center rounded-lg border border-dashed border-[#DFC7A5] bg-[#FAF3E8]/60 text-[9px] font-medium text-[#A99681]`}
                        >
                          Ô {slotIdx + 1}
                        </div>
                      );
                    }
                    const proc = PROCESSED_ITEMS[job.processedId];
                    const remMs = Math.max(0, job.readyAt - now);
                    const isDone = remMs <= 0;
                    const pct = isDone
                      ? 100
                      : Math.min(99, Math.max(6, Math.round((1 - remMs / job.durationMs) * 100)));

                    return (
                      <button
                        key={job.id}
                        type="button"
                        disabled={!isDone || storageFull}
                        onClick={() => {
                          if (!isDone) return;
                          soundFX.sparkle();
                          onCollectProcessed(job.id);
                        }}
                        title={proc?.name}
                        className={`flex ${slotHeight} flex-col items-center justify-between rounded-lg border p-1 transition-transform ${
                          isDone
                            ? storageFull
                              ? 'border-[#E0B1B8] bg-[#FFF5F6] text-[#B84356]'
                              : 'border-[#5FA86B] bg-[#EEFAF1] shadow-xs active:scale-95'
                            : 'border-[#DFC7A5] bg-white'
                        }`}
                      >
                        <FarmItemIcon kind="processed" id={job.processedId} className="h-5 w-5" />
                        <div className="w-full space-y-0.5">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                            <div
                              className={`h-full rounded-full ${
                                isDone ? 'bg-[#5FA86B]' : 'bg-[#6BA383]'
                              }`}
                              style={{width: `${pct}%`}}
                            />
                          </div>
                          <div
                            className={`text-center text-[9px] leading-none font-bold tabular-nums ${
                              isDone
                                ? storageFull
                                  ? 'text-[#B84356]'
                                  : 'text-[#3F7B4E]'
                                : 'text-[#7A6048]'
                            }`}
                          >
                            {isDone ? (storageFull ? 'Đầy kho' : 'Nhận!') : formatRemainingMs(remMs)}
                          </div>
                        </div>
                      </button>
                    );
                  }

                  const job = cookingQueue[slotIdx];
                  if (!job) {
                    return (
                      <div
                        key={`empty_cook_${slotIdx}`}
                        className={`flex ${slotHeight} items-center justify-center rounded-lg border border-dashed border-[#DFC7A5] bg-[#FAF3E8]/60 text-[9px] font-medium text-[#A99681]`}
                      >
                        Ô {slotIdx + 1}
                      </div>
                    );
                  }
                  const rec = KITCHEN_RECIPES[job.recipeId];
                  const remMs = Math.max(0, job.readyAt - now);
                  const isDone = remMs <= 0;
                  const pct = isDone
                    ? 100
                    : Math.min(99, Math.max(5, Math.round((1 - remMs / job.durationMs) * 100)));

                  return (
                    <button
                      key={job.id}
                      type="button"
                      disabled={!isDone || storageFull}
                      onClick={() => {
                        if (!isDone) return;
                        soundFX.sparkle();
                        onCollectDish(job.id);
                      }}
                      title={rec?.name}
                      className={`flex ${slotHeight} flex-col items-center justify-between rounded-lg border p-1 transition-transform ${
                        isDone
                          ? storageFull
                            ? 'border-[#E0B1B8] bg-[#FFF5F6] text-[#B84356]'
                            : 'border-[#5FA86B] bg-[#EEFAF1] shadow-xs active:scale-95'
                          : 'border-[#DFC7A5] bg-white'
                      }`}
                    >
                      <FarmItemIcon kind="dish" id={job.recipeId} className="h-5 w-5" />
                      <div className="w-full space-y-0.5">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                          <div
                            className={`h-full rounded-full ${
                              isDone ? 'bg-[#5FA86B]' : 'bg-[#DF8A58]'
                            }`}
                            style={{width: `${pct}%`}}
                          />
                        </div>
                        <div
                          className={`text-center text-[9px] leading-none font-bold tabular-nums ${
                            isDone
                              ? storageFull
                                ? 'text-[#B84356]'
                                : 'text-[#3F7B4E]'
                              : 'text-[#C96B4B]'
                          }`}
                        >
                          {isDone ? (storageFull ? 'Đầy kho' : 'Nhận!') : formatRemainingMs(remMs)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Item Catalog Grid */}
            <div className="custom-scroll min-h-0 flex-1 overflow-y-auto p-2.5 text-[#4A3525]">
              {station === 'mill' ? (
                <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 lg:grid-cols-5">
                  {PROCESSED_LIST.map((proc) => {
                    const owned = getFarmItemCount(inventory, 'processed', proc.id);
                    const hasInputs = proc.inputs.every(
                      (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                    );
                    const isSelected = selectedProc.id === proc.id;

                    return (
                      <button
                        key={proc.id}
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setSelectedProcessedId(proc.id);
                        }}
                        className={`relative flex flex-col items-center justify-between gap-1 rounded-xl border p-2 text-center transition-all active:scale-95 ${
                          isSelected
                            ? 'border-2 border-[#5A8759] bg-[#F2FAF3] shadow-sm'
                            : hasInputs
                              ? 'border-[#C5DFC7] bg-white hover:border-[#8AB98D]'
                              : 'border-[#E6D6BE] bg-white/85 hover:opacity-100'
                        }`}
                      >
                        <span className="absolute top-1 right-1 rounded bg-[#F2E9DB] px-1 text-[9px] font-bold tabular-nums text-[#6F4E37]">
                          ×{owned}
                        </span>
                        {hasInputs && (
                          <span
                            className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-[#55A863]"
                            title="Đủ nguyên liệu"
                          />
                        )}
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-[#FAF4EA]">
                          <FarmItemIcon kind="processed" id={proc.id} className="h-8 w-8" />
                        </div>
                        <span className="line-clamp-2 w-full text-[10px] leading-tight font-bold text-[#4A3525]">
                          {proc.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 lg:grid-cols-5">
                  {filteredRecipes.map((rec) => {
                    const owned = getFarmItemCount(inventory, 'dish', rec.id);
                    const hasInputs = rec.inputs.every(
                      (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                    );
                    const isSelected = selectedRec.id === rec.id;

                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setSelectedRecipeId(rec.id);
                        }}
                        className={`relative flex flex-col items-center justify-between gap-1 rounded-xl border p-2 text-center transition-all active:scale-95 ${
                          isSelected
                            ? 'border-2 border-[#C96B4B] bg-[#FFF5EF] shadow-sm'
                            : hasInputs
                              ? 'border-[#C5DFC7] bg-white hover:border-[#E29A7E]'
                              : 'border-[#E6D6BE] bg-white/85 hover:opacity-100'
                        }`}
                      >
                        <span className="absolute top-1 right-1 rounded bg-[#F2E9DB] px-1 text-[9px] font-bold tabular-nums text-[#6F4E37]">
                          ×{owned}
                        </span>
                        {hasInputs && (
                          <span
                            className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-[#55A863]"
                            title="Đủ nguyên liệu"
                          />
                        )}
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-[#FAF4EA]">
                          <FarmItemIcon kind="dish" id={rec.id} className="h-8 w-8" />
                        </div>
                        <span className="line-clamp-2 w-full text-[10px] leading-tight font-bold text-[#4A3525]">
                          {rec.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (Landscape/Desktop) / BOTTOM BAR (Portrait): Recipe Inspector & Craft */}
          <div className="custom-scroll shrink-0 overflow-y-auto border-t-2 border-[#E2D0B6] bg-[#FFFDF9] p-2.5 text-[#4A3525] min-[540px]:flex min-[540px]:w-[255px] min-[540px]:flex-col min-[540px]:justify-between min-[540px]:border-t-0 min-[540px]:border-l-2 min-[540px]:p-3.5 md:w-[295px]">
            {station === 'mill'
              ? (() => {
                  const hasInputs = selectedProc.inputs.every(
                    (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                  );
                  const canStart = hasInputs && !slotsFull;
                  return (
                    <div className="flex h-full flex-col justify-between gap-2.5">
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2 min-[540px]:flex-col">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E5D5BE] bg-[#FAF3E8] min-[540px]:h-14 min-[540px]:w-14">
                              <FarmItemIcon
                                kind="processed"
                                id={selectedProc.id}
                                className="h-9 w-9 min-[540px]:h-10 min-[540px]:w-10"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-xs font-extrabold text-[#4A3525] sm:text-sm">
                                  {selectedProc.name}
                                </h3>
                                <span className="rounded bg-[#E9F3EC] px-1.5 py-0.5 text-[10px] font-bold text-[#3F7B4E]">
                                  {selectedProc.machineName}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums text-[#6F4E37]">
                                <span className="inline-flex items-center gap-1 text-[#4E7A5B]">
                                  <Clock className="h-3 w-3" />
                                  {selectedProc.processSeconds} giây
                                </span>
                                <span>·</span>
                                <span>Giá: {selectedProc.sellPrice} Xu</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!canStart}
                            onClick={() => {
                              soundFX.sparkle();
                              onStartMill(selectedProc.id);
                            }}
                            className={`flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-transform active:scale-95 min-[540px]:hidden ${
                              canStart
                                ? 'bg-[#5A8759] text-white shadow-sm'
                                : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>
                              {slotsFull
                                ? 'Đủ 4 ô'
                                : !hasInputs
                                  ? 'Thiếu NL'
                                  : `Ép (${selectedProc.processSeconds}s)`}
                            </span>
                          </button>
                        </div>

                        <p className="hidden text-[11px] leading-snug text-[#7A6048] min-[540px]:block">
                          {selectedProc.description}
                        </p>

                        <div className="space-y-1 border-t border-[#F0E4D2] pt-2">
                          <div className="text-[10px] font-bold text-[#7A6048]">
                            Công thức nguyên liệu:
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {selectedProc.inputs.map((inp) => {
                              const have = getFarmItemCount(inventory, inp.kind, inp.id);
                              const ok = have >= inp.qty;
                              return (
                                <span
                                  key={`det_${selectedProc.id}_${inp.id}`}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold tabular-nums ${
                                    ok
                                      ? 'border-[#CFE5D4] bg-[#EEF7F0] text-[#3B7249]'
                                      : 'border-[#F2C9CF] bg-[#FDF0F2] text-[#B84756]'
                                  }`}
                                >
                                  <FarmItemIcon kind={inp.kind} id={inp.id} className="h-4 w-4" />
                                  <span>
                                    {getFarmItemName(inp.kind, inp.id)} {have}/{inp.qty}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canStart}
                        onClick={() => {
                          soundFX.sparkle();
                          onStartMill(selectedProc.id);
                        }}
                        className={`hidden min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-transform active:scale-95 min-[540px]:flex ${
                          canStart
                            ? 'bg-[#5A8759] text-white shadow-sm'
                            : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                        }`}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>
                          {slotsFull
                            ? 'Đủ 4 ô đang chạy'
                            : !hasInputs
                              ? 'Chưa đủ nguyên liệu'
                              : `Bắt đầu ép (${selectedProc.processSeconds}s)`}
                        </span>
                      </button>
                    </div>
                  );
                })()
              : (() => {
                  const hasInputs = selectedRec.inputs.every(
                    (inp) => getFarmItemCount(inventory, inp.kind, inp.id) >= inp.qty,
                  );
                  const canStart = hasInputs && !slotsFull;
                  const effCookSec = Math.round(selectedRec.cookSeconds * kInfo.speedMultiplier);
                  return (
                    <div className="flex h-full flex-col justify-between gap-2.5">
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2 min-[540px]:flex-col">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E5D5BE] bg-[#FAF3E8] min-[540px]:h-14 min-[540px]:w-14">
                              <FarmItemIcon
                                kind="dish"
                                id={selectedRec.id}
                                className="h-9 w-9 min-[540px]:h-10 min-[540px]:w-10"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-xs font-extrabold text-[#4A3525] sm:text-sm">
                                  {selectedRec.name}
                                </h3>
                                <span className="rounded bg-[#FCECE4] px-1.5 py-0.5 text-[10px] font-bold text-[#B65B3B]">
                                  {selectedRec.categoryLabel}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums text-[#6F4E37]">
                                <span className="inline-flex items-center gap-1 text-[#C96B4B]">
                                  <Clock className="h-3 w-3" />
                                  {formatDurationShort(effCookSec)}
                                  {kInfo.speedMultiplier < 1 && (
                                    <span className="text-[9px] text-[#4B8A5B]">
                                      (gốc {formatDurationShort(selectedRec.cookSeconds)})
                                    </span>
                                  )}
                                </span>
                                <span>·</span>
                                <span>Giá: {selectedRec.sellPrice} Xu</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!canStart}
                            onClick={() => {
                              soundFX.sparkle();
                              onStartCook(selectedRec.id);
                            }}
                            className={`flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-transform active:scale-95 min-[540px]:hidden ${
                              canStart
                                ? 'bg-[#C96B4B] text-white shadow-sm'
                                : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                            }`}
                          >
                            <ChefHat className="h-3.5 w-3.5" />
                            <span>
                              {slotsFull
                                ? 'Bếp đầy'
                                : !hasInputs
                                  ? 'Thiếu NL'
                                  : `Nấu (${formatDurationShort(effCookSec)})`}
                            </span>
                          </button>
                        </div>

                        <p className="hidden text-[11px] leading-snug text-[#7A6048] min-[540px]:block">
                          {selectedRec.description}
                        </p>

                        <div className="space-y-1 border-t border-[#F0E4D2] pt-2">
                          <div className="text-[10px] font-bold text-[#7A6048]">
                            Nguyên liệu cần:
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {selectedRec.inputs.map((inp) => {
                              const have = getFarmItemCount(inventory, inp.kind, inp.id);
                              const ok = have >= inp.qty;
                              return (
                                <span
                                  key={`det_${selectedRec.id}_${inp.id}`}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold tabular-nums ${
                                    ok
                                      ? 'border-[#CFE5D4] bg-[#EEF7F0] text-[#3B7249]'
                                      : 'border-[#F2C9CF] bg-[#FDF0F2] text-[#B84756]'
                                  }`}
                                >
                                  <FarmItemIcon kind={inp.kind} id={inp.id} className="h-4 w-4" />
                                  <span>
                                    {getFarmItemName(inp.kind, inp.id)} {have}/{inp.qty}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canStart}
                        onClick={() => {
                          soundFX.sparkle();
                          onStartCook(selectedRec.id);
                        }}
                        className={`hidden min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-transform active:scale-95 min-[540px]:flex ${
                          canStart
                            ? 'bg-[#C96B4B] text-white shadow-sm'
                            : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                        }`}
                      >
                        <ChefHat className="h-4 w-4" />
                        <span>
                          {slotsFull
                            ? 'Bếp đã đầy ô'
                            : !hasInputs
                              ? 'Chưa đủ nguyên liệu'
                              : `Nấu ngay (${formatDurationShort(effCookSec)})`}
                        </span>
                      </button>
                    </div>
                  );
                })()}
          </div>
        </div>
      </div>
    </div>
  );
};
