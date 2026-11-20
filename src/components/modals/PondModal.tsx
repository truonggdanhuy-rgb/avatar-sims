import React, {useEffect, useState} from 'react';
import {
  Coins,
  Fish,
  HeartPulse,
  PackageCheck,
  Utensils,
  X,
} from 'lucide-react';
import {
  MAX_POND_FISH,
  POND_FISH_SPECIES,
} from '../../data/farmCatalog';
import {FarmSupplies, PondFishState} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface PondModalProps {
  coins: number;
  fishList: PondFishState[];
  supplies: FarmSupplies;
  nearPond: boolean;
  onScatterFeed: () => void;
  onCureFish: (fishId: string) => void;
  onHarvestFish: (fishId: string) => void;
  onStartFishing?: () => void;
  onClose: () => void;
}

function formatLongTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}n${h}g`;
  if (h > 0) return `${h}g${m.toString().padStart(2, '0')}p`;
  if (m > 0) return `${m}p${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export const PondModal: React.FC<PondModalProps> = ({
  coins,
  fishList,
  supplies,
  nearPond,
  onScatterFeed,
  onCureFish,
  onHarvestFish,
  onStartFishing,
  onClose,
}) => {
  const [confirmScatterFeed, setConfirmScatterFeed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hungryCount = fishList.filter((f) => f.stage === 'growing' && f.hunger < 95).length;
  const canScatterFeed = nearPond && supplies.fishFeed > 0 && hungryCount > 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-[3px] border-[#4A8AA8] bg-[#F5FAFD] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#CFE4EF] bg-[#E3F2FA] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Fish className="h-4 w-4 text-[#2F789B]" />
            <h2 className="font-display text-sm font-bold text-[#224457]">
              Hồ Thủy Sinh ({fishList.length}/{MAX_POND_FISH}) · Cám {supplies.fishFeed} · Thuốc{' '}
              {supplies.fishMedicine}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
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
              aria-label="Đóng hồ thủy sinh"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#CBE3F0] text-[#224457] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex-1 space-y-2 overflow-y-auto p-2.5 text-[#224457] sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#CFE4EF] bg-white px-2.5 py-1.5 text-xs">
            <span className="truncate font-semibold text-[#2E5469]">
              {!nearPond
                ? 'Đứng gần hồ để rải cám'
                : supplies.fishFeed <= 0
                  ? 'Hết cám thủy sinh'
                  : hungryCount === 0
                    ? 'Tất cả đang no'
                    : `${hungryCount} con đói (1 túi/3-4 con)`}
            </span>

            {confirmScatterFeed && canScatterFeed ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#2E5469]">
                  Rải 1 túi cám?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setConfirmScatterFeed(false);
                  }}
                  className="min-h-[26px] rounded-lg bg-[#DFEEF6] px-2 text-[11px] font-semibold text-[#2B5368] active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.splash();
                    onScatterFeed();
                    setConfirmScatterFeed(false);
                  }}
                  className="min-h-[26px] rounded-lg bg-[#E09B3D] px-2.5 text-[11px] font-bold text-white shadow-xs active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                {onStartFishing && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onStartFishing();
                    }}
                    className="flex min-h-[28px] shrink-0 items-center gap-1 rounded-lg bg-[#3C95AD] px-2.5 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95"
                  >
                    <Fish className="h-3 w-3" />
                    <span>Câu Cá Sông</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canScatterFeed}
                  onClick={() => {
                    soundFX.tap();
                    setConfirmScatterFeed(true);
                  }}
                  className="flex min-h-[28px] shrink-0 items-center gap-1 rounded-lg bg-[#E09B3D] px-2.5 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E8E2D9] disabled:text-[#968A7C]"
                >
                  <Utensils className="h-3 w-3" />
                  <span>Rải cám</span>
                </button>
              </div>
            )}
          </div>

          {fishList.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#B7D5E6] bg-white p-4 text-center text-xs text-[#54788C]">
              Hồ đang trống · Ghé Xe Bus Shop Nông Trại để mua Cá, Vịt Vàng hoặc Rùa nhé!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {fishList.map((fish) => {
                const spec = POND_FISH_SPECIES[fish.species] ?? POND_FISH_SPECIES.fish_12h;
                const progressPct =
                  fish.stage === 'ready'
                    ? 100
                    : Math.min(
                        99,
                        Math.max(
                          2,
                          Math.round((1 - fish.remainingMs / fish.totalDurationMs) * 100),
                        ),
                      );
                const hungerInt = Math.round(fish.hunger);

                return (
                  <div
                    key={fish.id}
                    className={`flex flex-col justify-between gap-2 rounded-xl border bg-white p-2.5 ${
                      fish.sick
                        ? 'border-[#E6939F] bg-[#FFF7F8]'
                        : fish.stage === 'ready'
                          ? 'border-[#89C89E] bg-[#F5FCF7]'
                          : 'border-[#CFE4EF]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                            style={{backgroundColor: spec.bodyColor}}
                          />
                          <span className="truncate text-xs font-bold text-[#224457]">
                            {spec.name}
                          </span>
                        </div>

                        <span
                          className={`shrink-0 text-[11px] font-bold tabular-nums ${
                            fish.stage === 'ready'
                              ? 'text-[#2E8555]'
                              : fish.sick
                                ? 'text-[#C74355]'
                                : 'text-[#2F789B]'
                          }`}
                        >
                          {fish.stage === 'ready'
                            ? `+${spec.matureSellPrice}Xu`
                            : fish.sick
                              ? 'Bệnh'
                              : formatLongTime(fish.remainingMs)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-[#54788C]">
                        <div>
                          <div className="mb-0.5 flex justify-between">
                            <span>Lớn</span>
                            <span className="font-bold tabular-nums">{progressPct}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#E3EFF6]">
                            <div
                              className={`h-full rounded-full ${
                                fish.stage === 'ready' ? 'bg-[#4BA86E]' : 'bg-[#439AC2]'
                              }`}
                              style={{width: `${progressPct}%`}}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 flex justify-between">
                            <span>Độ no</span>
                            <span
                              className={`font-bold tabular-nums ${
                                hungerInt <= 25 ? 'text-[#C74355]' : 'text-[#2E6B8A]'
                              }`}
                            >
                              {hungerInt}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#EFE7DB]">
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

                    {fish.stage === 'ready' ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.sparkle();
                          onHarvestFish(fish.id);
                        }}
                        className="flex min-h-[28px] w-full items-center justify-center gap-1 rounded-lg bg-[#45A168] px-2 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>Bán (+{spec.matureSellPrice} Xu)</span>
                      </button>
                    ) : fish.sick ? (
                      <button
                        type="button"
                        disabled={supplies.fishMedicine <= 0}
                        onClick={() => {
                          soundFX.sparkle();
                          onCureFish(fish.id);
                        }}
                        className="flex min-h-[28px] w-full items-center justify-center gap-1 rounded-lg bg-[#D95970] px-2 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E0D4D6] disabled:text-[#8E7A7D]"
                      >
                        <HeartPulse className="h-3 w-3" />
                        <span>
                          {supplies.fishMedicine > 0 ? 'Trị Bệnh (1 Thuốc)' : 'Hết thuốc'}
                        </span>
                      </button>
                    ) : null}
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

