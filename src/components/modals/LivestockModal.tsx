import React, {useEffect, useState} from 'react';
import {
  Coins,
  HeartPulse,
  PackageCheck,
  Utensils,
  Wheat,
  X,
} from 'lucide-react';
import {
  ANIMAL_PRODUCTS,
  ANIMALS,
  MAX_COOP_ANIMALS,
} from '../../data/farmCatalog';
import {
  CoopKind,
  CoopTroughs,
  FarmInventory,
  LivestockAnimalState,
} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface LivestockModalProps {
  coop: CoopKind;
  coins: number;
  animals: LivestockAnimalState[];
  troughs: CoopTroughs;
  inventory: FarmInventory;
  onFeedAnimal: (animalId: string) => void;
  onFillTrough: (coop: CoopKind) => void;
  onCureAnimal: (animalId: string) => void;
  onCollectProduce: (animalId: string) => void;
  onSellAnimal: (animalId: string) => void;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}n${h}g`;
  if (h > 0) return `${h}g${m}p`;
  if (m > 0) return `${m}p${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export const LivestockModal: React.FC<LivestockModalProps> = ({
  coop,
  coins,
  animals,
  troughs,
  inventory,
  onFeedAnimal,
  onFillTrough,
  onCureAnimal,
  onCollectProduce,
  onSellAnimal,
  onClose,
}) => {
  const [confirmFillTrough, setConfirmFillTrough] = useState(false);
  const [confirmFeedAnimalId, setConfirmFeedAnimalId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    setConfirmFillTrough(false);
    setConfirmFeedAnimalId(null);
  }, [coop]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const coopAnimals = animals.filter((a) => a.coop === coop);
  const troughQty = troughs[coop];
  const coopLabel = coop === 'poultry' ? 'Chuồng Gia Cầm' : 'Chuồng Gia Súc';

  const needed = Math.max(0, coopAnimals.length - troughQty);
  const inBag = inventory.supplies.animalFeed;
  const fillAmt = Math.min(needed, inBag);
  const canFill = needed > 0 && fillAmt > 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-[3px] border-[#9E6B40] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Wheat className="h-4 w-4 shrink-0 text-[#8A5B32]" />
            <h2 className="font-display truncate text-sm font-bold text-[#4A3525]">
              {coopLabel} ({coopAnimals.length}/{MAX_COOP_ANIMALS[coop]}) · Cám{' '}
              {inventory.supplies.animalFeed} · Thuốc {inventory.supplies.animalMedicine}
            </h2>
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
              aria-label={`Đóng ${coopLabel}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex-1 space-y-2 overflow-y-auto p-2.5 text-[#4A3525] sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFC7A5] bg-white px-2.5 py-1.5 text-xs">
            <span className="font-bold text-[#4A3525]">
              Máng ăn:{' '}
              <span
                className={`tabular-nums ${
                  needed === 0
                    ? 'text-[#4B8A5B]'
                    : troughQty > 0
                      ? 'text-[#C98A32]'
                      : 'text-[#C2515E]'
                }`}
              >
                {troughQty}/{coopAnimals.length}
              </span>
            </span>

            {confirmFillTrough && canFill ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#6F4E37]">
                  Dùng {fillAmt} túi cám?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setConfirmFillTrough(false);
                  }}
                  className="min-h-[26px] rounded-lg bg-[#EADBC6] px-2 text-[11px] font-semibold text-[#5B422E] active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.sparkle();
                    onFillTrough(coop);
                    setConfirmFillTrough(false);
                  }}
                  className="min-h-[26px] rounded-lg bg-[#E09B3D] px-2.5 text-[11px] font-bold text-white shadow-xs active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canFill}
                onClick={() => {
                  soundFX.tap();
                  setConfirmFeedAnimalId(null);
                  setConfirmFillTrough(true);
                }}
                className="flex min-h-[28px] items-center gap-1 rounded-lg bg-[#E09B3D] px-2.5 text-[11px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
              >
                <Utensils className="h-3 w-3" />
                <span>
                  {needed === 0
                    ? 'Đầy máng'
                    : fillAmt > 0
                      ? `Đổ máng (${fillAmt})`
                      : 'Hết cám'}
                </span>
              </button>
            )}
          </div>

          {coopAnimals.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#DFCCB0] bg-white p-4 text-center text-xs text-[#6F4E37]">
              {coopLabel} đang trống · Ghé Xe Bus Shop Nông Trại để mua giống nhé!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {coopAnimals.map((ani) => {
                const def = ANIMALS[ani.type];
                const prod = ANIMAL_PRODUCTS[def.produceId];
                const hungerInt = Math.round(ani.hunger);
                const isBaby = ani.stage === 'baby';
                const isRetired = ani.stage === 'retired';
                const pct = isBaby
                  ? Math.min(
                      99,
                      Math.max(
                        3,
                        Math.round((1 - ani.growRemainingMs / ani.growDurationMs) * 100),
                      ),
                    )
                  : ani.hasProduce || isRetired
                    ? 100
                    : Math.min(
                        99,
                        Math.max(
                          4,
                          Math.round((1 - ani.produceRemainingMs / ani.produceCycleMs) * 100),
                        ),
                      );
                const sellPrice = isBaby
                  ? Math.round(def.buyPrice * 0.7)
                  : def.adultSellPrice;
                const confirmingThisFeed = confirmFeedAnimalId === ani.id;

                return (
                  <div
                    key={ani.id}
                    className={`flex flex-col justify-between gap-2 rounded-xl border bg-white p-2.5 ${
                      ani.sick
                        ? 'border-[#E8A3AD] bg-[#FFF6F7]'
                        : ani.hasProduce
                          ? 'border-[#9AC99E] bg-[#F5FBF6]'
                          : isRetired
                            ? 'border-[#E6C79C] bg-[#FFF9EE]'
                            : 'border-[#E0CEB6]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                            style={{backgroundColor: def.color}}
                          />
                          <span className="truncate text-xs font-bold text-[#4A3525]">
                            {ani.name}
                          </span>
                          <span className="shrink-0 rounded bg-[#F2E5D2] px-1 py-0.5 text-[9px] font-semibold text-[#6F4E37]">
                            {isBaby ? 'Non' : isRetired ? 'Già' : 'Lớn'}
                          </span>
                        </div>

                        <span
                          className={`shrink-0 text-[11px] font-bold tabular-nums ${
                            ani.hasProduce
                              ? 'text-[#4B8A5B]'
                              : ani.sick
                                ? 'text-[#C2515E]'
                                : isRetired
                                  ? 'text-[#B2772F]'
                                  : 'text-[#8C5B32]'
                          }`}
                        >
                          {ani.hasProduce
                            ? 'Thu!'
                            : ani.sick
                              ? 'Bệnh'
                              : isBaby
                                ? formatDuration(ani.growRemainingMs)
                                : isRetired
                                  ? 'Bán'
                                  : formatDuration(ani.produceRemainingMs)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-[#7A6048]">
                        <div>
                          <div className="mb-0.5 flex justify-between">
                            <span>{isBaby ? 'Lớn' : prod.name}</span>
                            <span className="font-bold tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE4D3]">
                            <div
                              className={`h-full rounded-full ${
                                ani.hasProduce
                                  ? 'bg-[#5FA86B]'
                                  : isBaby
                                    ? 'bg-[#6BA383]'
                                    : isRetired
                                      ? 'bg-[#D99B58]'
                                      : 'bg-[#C9925D]'
                              }`}
                              style={{width: `${pct}%`}}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 flex justify-between">
                            <span>Độ no</span>
                            <span
                              className={`font-bold tabular-nums ${
                                hungerInt <= 25 ? 'text-[#C2515E]' : 'text-[#6F4E37]'
                              }`}
                            >
                              {hungerInt}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE4D3]">
                            <div
                              className={`h-full rounded-full ${
                                hungerInt <= 25 ? 'bg-[#D96B59]' : 'bg-[#E5A93C]'
                              }`}
                              style={{width: `${hungerInt}%`}}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {ani.hasProduce && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.sparkle();
                            onCollectProduce(ani.id);
                          }}
                          className="flex min-h-[28px] w-full items-center justify-center gap-1 rounded-lg bg-[#5FA86B] px-2 text-[11px] font-bold text-white transition-transform active:scale-95"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Thu +{ani.sick ? 1 : 2} {prod.name}</span>
                        </button>
                      )}

                      {ani.sick && (
                        <button
                          type="button"
                          disabled={inventory.supplies.animalMedicine <= 0}
                          onClick={() => {
                            soundFX.sparkle();
                            onCureAnimal(ani.id);
                          }}
                          className="flex min-h-[28px] flex-1 items-center justify-center gap-1 rounded-lg bg-[#D95970] px-2 text-[10px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                        >
                          <HeartPulse className="h-3 w-3" />
                          <span>Chữa</span>
                        </button>
                      )}

                      {confirmingThisFeed ? (
                        <div className="flex flex-1 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.tap();
                              setConfirmFeedAnimalId(null);
                            }}
                            className="min-h-[28px] rounded-lg bg-[#EADBC6] px-2 text-[10px] font-semibold text-[#5B422E] active:scale-95"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={inventory.supplies.animalFeed <= 0}
                            onClick={() => {
                              soundFX.sparkle();
                              onFeedAnimal(ani.id);
                              setConfirmFeedAnimalId(null);
                            }}
                            className="min-h-[28px] flex-1 rounded-lg bg-[#E09B3D] px-2 text-[10px] font-bold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                          >
                            Xác nhận (-1)
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={hungerInt >= 95 || inventory.supplies.animalFeed <= 0}
                          onClick={() => {
                            soundFX.tap();
                            setConfirmFillTrough(false);
                            setConfirmFeedAnimalId(ani.id);
                          }}
                          className="flex min-h-[28px] flex-1 items-center justify-center gap-1 rounded-lg bg-[#E09B3D] px-2 text-[10px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                        >
                          <Utensils className="h-3 w-3" />
                          <span>Cho ăn</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          soundFX.sparkle();
                          onSellAnimal(ani.id);
                        }}
                        className="flex min-h-[28px] items-center justify-center rounded-lg border border-[#DFCCB0] bg-[#FAF3E8] px-2 text-[10px] font-semibold text-[#6F4E37] transition-transform active:scale-95"
                      >
                        Bán {sellPrice}
                      </button>
                    </div>
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

