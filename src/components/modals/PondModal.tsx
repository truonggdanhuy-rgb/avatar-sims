import React, {useEffect, useState} from 'react';
import {
  AlertTriangle,
  Coins,
  Fish,
  HeartPulse,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import {
  MAX_POND_FISH,
  POND_FISH_LIST,
  POND_FISH_SPECIES,
  SUPPLY_PRICES,
} from '../../data/farmCatalog';
import {FarmSupplies, PondFishSpecies, PondFishState} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface PondModalProps {
  coins: number;
  fishList: PondFishState[];
  supplies: FarmSupplies;
  onStockFish: (species: PondFishSpecies) => void;
  onFeedFish: (fishId: string) => void;
  onCureFish: (fishId: string) => void;
  onBoostFish: (fishId: string) => void;
  onHarvestFish: (fishId: string) => void;
  onBuySupply: (
    supply: 'fishFeed' | 'fishMedicine' | 'pondBooster',
    qty?: number,
  ) => void;
  onClose: () => void;
}

function formatLongTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}g ${m.toString().padStart(2, '0')}p`;
  if (m > 0) return `${m}p ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export const PondModal: React.FC<PondModalProps> = ({
  coins,
  fishList,
  supplies,
  onStockFish,
  onFeedFish,
  onCureFish,
  onBoostFish,
  onHarvestFish,
  onBuySupply,
  onClose,
}) => {
  const [tab, setTab] = useState<'pond' | 'hatchery' | 'supplies'>('pond');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const sickCount = fishList.filter((f) => f.sick).length;
  const readyCount = fishList.filter((f) => f.stage === 'ready').length;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-4 border-[#4A8AA8] bg-[#F5FAFD] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#CFE4EF] bg-[#E3F2FA] px-4 py-3">
          <div className="flex items-center gap-2">
            <Fish className="h-5 w-5 text-[#2F789B]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#224457]">
                Ao Nuôi Cá & Thủy Sản ({fishList.length}/{MAX_POND_FISH})
              </h2>
              <p className="text-[11px] text-[#4C7084]">
                Nuôi 24h / 48h thu lời cao · Nhớ cho ăn & trị bệnh kịp lúc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#DFC7A5] bg-[#FFF8EB] px-2.5 py-1 text-xs font-bold tabular-nums text-[#6F4E37]">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span>{coins} Xu</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng ao cá"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CBE3F0] text-[#224457] active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Supply quick strip */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#DCEBF3] bg-[#EDF6FB] px-4 py-2 text-xs text-[#2E5469]">
          <div className="flex flex-wrap items-center gap-3 font-semibold tabular-nums">
            <span>Cám cá: {supplies.fishFeed}</span>
            <span>Thuốc cá: {supplies.fishMedicine}</span>
            <span>Men tăng tốc: {supplies.pondBooster}</span>
          </div>
          {(sickCount > 0 || readyCount > 0) && (
            <div className="flex items-center gap-2 text-[11px] font-bold">
              {sickCount > 0 && (
                <span className="text-[#C74355]">{sickCount} con đang bệnh!</span>
              )}
              {readyCount > 0 && (
                <span className="text-[#2E8555]">{readyCount} con xuất bán được!</span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[#DCEBF3] bg-[#F5FAFD] px-4 py-2">
          {(
            [
              {key: 'pond', label: `Cá Trong Ao (${fishList.length})`},
              {key: 'hatchery', label: 'Thả Cá Giống (24h/48h)'},
              {key: 'supplies', label: 'Mua Thức Ăn & Thuốc'},
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                soundFX.tap();
                setTab(t.key);
              }}
              className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'bg-[#2F789B] text-white shadow-xs'
                  : 'bg-[#DFEEF6] text-[#2B5368] hover:bg-[#CEE3EE]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="custom-scroll flex-1 overflow-y-auto p-4 text-[#224457]">
          {tab === 'pond' && (
            <>
              {fishList.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#B7D5E6] bg-white p-6 text-center">
                  <Fish className="mb-2 h-8 w-8 text-[#599EC2]" />
                  <div className="text-sm font-bold text-[#224457]">Ao cá đang trống</div>
                  <div className="mt-1 text-xs text-[#54788C]">
                    Chuyển sang tab &quot;Thả Cá Giống&quot; để mua cá bột về nuôi thu lời lớn nhé!
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {fishList.map((fish) => {
                    const spec = POND_FISH_SPECIES[fish.species];
                    const progressPct =
                      fish.stage === 'ready'
                        ? 100
                        : Math.min(
                            99,
                            Math.max(
                              2,
                              Math.round(
                                (1 - fish.remainingMs / fish.totalDurationMs) * 100,
                              ),
                            ),
                          );
                    const hungerInt = Math.round(fish.hunger);

                    return (
                      <div
                        key={fish.id}
                        className={`flex flex-col justify-between gap-3 rounded-2xl border bg-white p-3.5 ${
                          fish.sick
                            ? 'border-[#E6939F] bg-[#FFF7F8]'
                            : fish.stage === 'ready'
                              ? 'border-[#89C89E] bg-[#F5FCF7]'
                              : 'border-[#CFE4EF]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                                style={{backgroundColor: spec.bodyColor}}
                              />
                              <div>
                                <div className="text-sm font-bold text-[#224457]">
                                  {spec.name}
                                </div>
                                <div className="text-[11px] text-[#567A8E]">
                                  Chu kỳ {spec.durationHours}h · Giá bán {spec.matureSellPrice} Xu
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-xs font-bold tabular-nums ${
                                fish.stage === 'ready'
                                  ? 'text-[#2E8555]'
                                  : fish.sick
                                    ? 'text-[#C74355]'
                                    : 'text-[#2F789B]'
                              }`}
                            >
                              {fish.stage === 'ready'
                                ? 'Đủ lớn!'
                                : fish.sick
                                  ? 'Tạm dừng'
                                  : formatLongTime(fish.remainingMs)}
                            </span>
                          </div>

                          {/* Growth bar */}
                          <div>
                            <div className="mb-1 flex justify-between text-[11px] text-[#54788C]">
                              <span>Trưởng thành</span>
                              <span className="font-bold tabular-nums">{progressPct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E3EFF6]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  fish.stage === 'ready' ? 'bg-[#4BA86E]' : 'bg-[#439AC2]'
                                }`}
                                style={{width: `${progressPct}%`}}
                              />
                            </div>
                          </div>

                          {/* Hunger bar */}
                          <div>
                            <div className="mb-1 flex justify-between text-[11px] text-[#54788C]">
                              <span>Độ no</span>
                              <span
                                className={`font-bold tabular-nums ${
                                  hungerInt <= 25 ? 'text-[#C74355]' : 'text-[#2E6B8A]'
                                }`}
                              >
                                {hungerInt}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE7DB]">
                              <div
                                className={`h-full rounded-full ${
                                  hungerInt <= 25 ? 'bg-[#D96B59]' : 'bg-[#E5A93C]'
                                }`}
                                style={{width: `${hungerInt}%`}}
                              />
                            </div>
                          </div>

                          {fish.sick && (
                            <div className="flex items-center gap-1.5 rounded-xl border border-[#EAB1B9] bg-[#FFEBEF] px-2.5 py-1.5 text-[11px] font-semibold text-[#A43245]">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                Cá bị nhiễm bệnh! Cần dùng 1 Thuốc Cá để tiếp tục lớn.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1.5">
                          {fish.stage === 'ready' ? (
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.sparkle();
                                onHarvestFish(fish.id);
                              }}
                              className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#45A168] px-3 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                            >
                              <PackageCheck className="h-4 w-4" />
                              <span>Xuất Bán Cá (+{spec.matureSellPrice} Xu)</span>
                            </button>
                          ) : (
                            <>
                              {fish.sick && (
                                <button
                                  type="button"
                                  disabled={supplies.fishMedicine <= 0 && coins < SUPPLY_PRICES.fishMedicine}
                                  onClick={() => {
                                    soundFX.sparkle();
                                    onCureFish(fish.id);
                                  }}
                                  className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#D95970] px-2.5 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E0D4D6] disabled:text-[#8E7A7D]"
                                >
                                  <HeartPulse className="h-3.5 w-3.5" />
                                  <span>
                                    {supplies.fishMedicine > 0
                                      ? 'Trị Bệnh (1 Thuốc)'
                                      : `Trị Bệnh (${SUPPLY_PRICES.fishMedicine} Xu)`}
                                  </span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={
                                  hungerInt >= 95 ||
                                  (supplies.fishFeed <= 0 && coins < SUPPLY_PRICES.fishFeed)
                                }
                                onClick={() => {
                                  soundFX.tap();
                                  onFeedFish(fish.id);
                                }}
                                className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#E09B3D] px-2.5 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E8E2D9] disabled:text-[#968A7C]"
                              >
                                <Utensils className="h-3.5 w-3.5" />
                                <span>
                                  {supplies.fishFeed > 0
                                    ? 'Cho Ăn (1 Cám)'
                                    : `Cho Ăn (${SUPPLY_PRICES.fishFeed} Xu)`}
                                </span>
                              </button>

                              <button
                                type="button"
                                disabled={
                                  fish.sick ||
                                  (supplies.pondBooster <= 0 && coins < SUPPLY_PRICES.pondBooster)
                                }
                                onClick={() => {
                                  soundFX.sparkle();
                                  onBoostFish(fish.id);
                                }}
                                className="flex min-h-[36px] items-center justify-center gap-1 rounded-xl bg-[#438EB5] px-2.5 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DDE7EE] disabled:text-[#7D919E]"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>
                                  {supplies.pondBooster > 0
                                    ? '-4 Giờ (1 Men)'
                                    : `-4 Giờ (${SUPPLY_PRICES.pondBooster} Xu)`}
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'hatchery' && (
            <div className="space-y-3">
              <div className="text-xs text-[#4C7084]">
                Mỗi lứa cá cần 24h hoặc 48h để trưởng thành và bán giá cao gấp 3–4 lần tiền giống. Ao chứa tối đa {MAX_POND_FISH} con.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {POND_FISH_LIST.map((spec) => {
                  const full = fishList.length >= MAX_POND_FISH;
                  const canBuy = !full && coins >= spec.fryPrice;
                  return (
                    <div
                      key={spec.species}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-[#CFE4EF] bg-white p-3.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                              style={{backgroundColor: spec.bodyColor}}
                            />
                            <span className="text-sm font-bold text-[#224457]">{spec.name}</span>
                          </div>
                          <span className="rounded-lg bg-[#E4F2F9] px-2 py-0.5 text-[11px] font-bold text-[#2A6F91]">
                            {spec.durationHours} Giờ
                          </span>
                        </div>
                        <div className="text-[11px] text-[#54788C]">{spec.description}</div>
                        <div className="pt-1 text-xs font-semibold text-[#2E8555]">
                          Giá xuất bán: {spec.matureSellPrice} Xu
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => {
                          soundFX.splash();
                          onStockFish(spec.species);
                          setTab('pond');
                        }}
                        className={`flex min-h-[38px] w-full items-center justify-center rounded-xl px-3 text-xs font-bold tabular-nums transition-transform active:scale-95 ${
                          canBuy
                            ? 'bg-[#2F789B] text-white shadow-xs'
                            : 'cursor-not-allowed bg-[#DFEAEF] text-[#7D94A1]'
                        }`}
                      >
                        {full ? 'Ao Đã Đầy' : `Thả Giống · ${spec.fryPrice} Xu`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'supplies' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  key: 'fishFeed' as const,
                  name: 'Cám Cá Vi Sinh',
                  price: SUPPLY_PRICES.fishFeed,
                  owned: supplies.fishFeed,
                  desc: 'Hồi +60% độ no và rút ngắn nhẹ thời gian lớn.',
                  btnCol: 'bg-[#E09B3D]',
                },
                {
                  key: 'fishMedicine' as const,
                  name: 'Thuốc Trị Bệnh Cá',
                  price: SUPPLY_PRICES.fishMedicine,
                  owned: supplies.fishMedicine,
                  desc: 'Chữa dứt điểm khi cá nhiễm bệnh nấm/đốm trắng.',
                  btnCol: 'bg-[#D95970]',
                },
                {
                  key: 'pondBooster' as const,
                  name: 'Men Vi Sinh (-4 Giờ)',
                  price: SUPPLY_PRICES.pondBooster,
                  owned: supplies.pondBooster,
                  desc: 'Kích thích cá khỏe phát triển nhanh hơn 4 tiếng.',
                  btnCol: 'bg-[#438EB5]',
                },
              ].map((sup) => (
                <div
                  key={sup.key}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[#CFE4EF] bg-white p-3.5"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-[#224457]">{sup.name}</div>
                    <div className="text-xs font-bold tabular-nums text-[#2F789B]">
                      Đang có: {sup.owned}
                    </div>
                    <div className="text-[11px] leading-snug text-[#54788C]">{sup.desc}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={coins < sup.price}
                      onClick={() => {
                        soundFX.sparkle();
                        onBuySupply(sup.key, 1);
                      }}
                      className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DFEAEF] disabled:text-[#7D94A1] ${sup.btnCol}`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>1 ({sup.price})</span>
                    </button>
                    <button
                      type="button"
                      disabled={coins < sup.price * 5}
                      onClick={() => {
                        soundFX.sparkle();
                        onBuySupply(sup.key, 5);
                      }}
                      className="flex min-h-[36px] items-center justify-center rounded-xl bg-[#224457] px-2.5 text-xs font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DFEAEF] disabled:text-[#7D94A1]"
                    >
                      ×5
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
