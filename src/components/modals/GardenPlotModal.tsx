import React, {useEffect, useState} from 'react';
import {
  ArrowUp,
  Bug,
  Coins,
  Droplets,
  PackageCheck,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';
import {CROP_LIST, CROPS, PLOT_LEVELS, SUPPLY_PRICES} from '../../data/farmCatalog';
import {CropType, GardenPlotState, PlotLevel} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface GardenPlotModalProps {
  plot: GardenPlotState;
  coins: number;
  bugSprayCount: number;
  onPlant: (plotId: number, crop: CropType) => void;
  onWater: (plotId: number) => void;
  onSprayPest: (plotId: number) => void;
  onCancelCrop: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onUpgradePlot: (plotId: number) => void;
  onClose: () => void;
}

function formatDurationShort(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return m > 0 ? `${h}g ${m}p` : `${h}g`;
  if (m > 0) return s > 0 ? `${m}p ${s}s` : `${m}p`;
  return `${s}s`;
}

function formatRemaining(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}g ${m.toString().padStart(2, '0')}p`;
  if (m > 0) return `${m}p ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export const GardenPlotModal: React.FC<GardenPlotModalProps> = ({
  plot,
  coins,
  bugSprayCount,
  onPlant,
  onWater,
  onSprayPest,
  onCancelCrop,
  onHarvest,
  onUpgradePlot,
  onClose,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (plot.stage !== 'growing') return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [plot.stage]);

  const levelInfo = PLOT_LEVELS[plot.level];
  const nextLevel = (plot.level < 3 ? plot.level + 1 : null) as PlotLevel | null;
  const nextLevelInfo = nextLevel ? PLOT_LEVELS[nextLevel] : null;
  const upgradeCost = levelInfo.upgradeCostToNext;
  const cropInfo = plot.crop ? CROPS[plot.crop] : null;
  const canSpray = bugSprayCount > 0 || coins >= SUPPLY_PRICES.bugSpray;

  const remainingMs =
    plot.stage === 'growing' && plot.readyAt ? Math.max(0, plot.readyAt - now) : 0;
  const progressPct =
    plot.stage === 'growing' && plot.durationMs > 0
      ? Math.min(100, Math.max(4, Math.round((1 - remainingMs / plot.durationMs) * 100)))
      : plot.stage === 'ready'
        ? 100
        : 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#8C6239] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Sprout className="h-4 w-4 shrink-0 text-[#4B8A5B]" />
            <h2 className="font-display truncate text-sm font-bold text-[#4A3525] sm:text-base">
              Ô Đất #{plot.id} - {levelInfo.name}
            </h2>
            {upgradeCost !== null && nextLevelInfo ? (
              <button
                type="button"
                disabled={coins < upgradeCost}
                title={`Nâng lên Lv.${nextLevelInfo.level} (${upgradeCost} Xu) · ${nextLevelInfo.description}`}
                aria-label={`Nâng cấp ô đất lên Lv.${nextLevelInfo.level} tốn ${upgradeCost} Xu`}
                onClick={() => {
                  soundFX.sparkle();
                  onUpgradePlot(plot.id);
                }}
                className={`flex h-7 shrink-0 items-center gap-0.5 rounded-lg px-1.5 text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${
                  coins >= upgradeCost
                    ? 'bg-[#6BA383] text-white shadow-xs'
                    : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                }`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>{upgradeCost}</span>
              </button>
            ) : (
              <span className="shrink-0 rounded-md bg-[#E8D4AC] px-1.5 py-0.5 text-[10px] font-bold text-[#7A541C]">
                Max
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
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
              aria-label="Đóng ô đất"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex-1 space-y-4 overflow-y-auto p-4 text-[#4A3525]">
          {/* Stage: Empty -> Seed Picker */}
          {plot.stage === 'empty' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#6F4E37]">
                <span>Chọn hạt giống để gieo (+2 nông sản nếu không sâu)</span>
                <span className="text-[11px] font-semibold text-[#7A6048]">
                  Bình xịt sâu trong kho: {bugSprayCount}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CROP_LIST.map((crop) => {
                  const effectiveSeconds = Math.max(
                    5,
                    Math.round(crop.growSeconds * levelInfo.speedMultiplier),
                  );
                  const canAfford = coins >= crop.seedPrice;

                  return (
                    <div
                      key={crop.id}
                      className="flex flex-col justify-between gap-2 rounded-2xl border border-[#E0CEB6] bg-white p-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
                              style={{backgroundColor: crop.color}}
                            />
                            <span className="text-sm font-bold text-[#4A3525]">{crop.name}</span>
                          </div>
                          <span className="text-[11px] font-semibold tabular-nums text-[#7A6048]">
                            {formatDurationShort(effectiveSeconds)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] leading-snug text-[#7A6048]">
                          {crop.hint}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          soundFX.sparkle();
                          onPlant(plot.id, crop.id);
                        }}
                        className={`flex min-h-[38px] w-full items-center justify-center rounded-xl px-3 text-xs font-bold tabular-nums transition-transform active:scale-95 ${
                          canAfford
                            ? 'bg-[#6BA383] text-white shadow-xs'
                            : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                        }`}
                      >
                        Gieo hạt · {crop.seedPrice} Xu
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage: Growing (Mầm) */}
          {plot.stage === 'growing' && cropInfo && (
            <div className="space-y-3 rounded-2xl border border-[#E0CEB6] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-black/15"
                    style={{backgroundColor: cropInfo.color}}
                  />
                  <div>
                    <div className="text-sm font-bold text-[#4A3525]">
                      {cropInfo.name} · Giai đoạn Mầm
                    </div>
                    <div className="text-[11px] text-[#7A6048]">
                      {plot.watered
                        ? 'Đã tưới nước (đã giảm 20% thời gian)'
                        : 'Tưới nước để giảm 20% thời gian còn lại'}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums text-[#4B8A5B]">
                  {formatRemaining(remainingMs)}
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                <div
                  className="h-full rounded-full bg-[#6BA383] transition-all duration-300"
                  style={{width: `${progressPct}%`}}
                />
              </div>

              {plot.hasPest && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E8A3AD] bg-[#FFF1F3] p-2.5">
                  <div className="text-xs font-semibold text-[#9E3548]">
                    Cây đang có sâu! Cần xịt thuốc sâu ({SUPPLY_PRICES.bugSpray} Xu/cây) để giữ đủ 2 sản phẩm.
                  </div>
                  <button
                    type="button"
                    disabled={!canSpray}
                    onClick={() => {
                      soundFX.sparkle();
                      onSprayPest(plot.id);
                    }}
                    className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-[#D95970] px-3 text-xs font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                  >
                    <Bug className="h-3.5 w-3.5" />
                    <span>
                      {bugSprayCount > 0
                        ? 'Xịt Thuốc (1 Bình)'
                        : `Xịt Thuốc (${SUPPLY_PRICES.bugSpray} Xu)`}
                    </span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={plot.watered}
                  onClick={() => {
                    soundFX.splash();
                    onWater(plot.id);
                  }}
                  className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-transform active:scale-95 ${
                    plot.watered
                      ? 'cursor-not-allowed bg-[#E8EFEA] text-[#6B8A75]'
                      : 'bg-[#4E9ED9] text-white shadow-xs'
                  }`}
                >
                  <Droplets className="h-4 w-4" />
                  <span>{plot.watered ? 'Đã Tưới Nước' : 'Tưới Nước (-20% thời gian)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onCancelCrop(plot.id);
                  }}
                  className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#E5B8B8] bg-[#FFF3F3] px-3 text-xs font-bold text-[#B84A56] transition-transform active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hủy Cây (Không hoàn Xu)</span>
                </button>
              </div>
            </div>
          )}

          {/* Stage: Ready (Lớn - Xử lý sâu hoặc thu hoạch) */}
          {plot.stage === 'ready' && cropInfo && (
            <div className="space-y-3 rounded-2xl border border-[#C6DEC9] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-5 w-5 rounded-full border border-black/15"
                    style={{backgroundColor: cropInfo.color}}
                  />
                  <div>
                    <div className="text-sm font-bold text-[#4A3525]">
                      {cropInfo.name} · Đã Lớn Sẵn Sàng
                    </div>
                    <div className="text-xs text-[#6F4E37]">
                      {plot.hasPest
                        ? 'Cây đang bị sâu: thu ngay chỉ được 1 sản phẩm!'
                        : 'Cây khỏe mạnh: thu hoạch được 2 sản phẩm.'}
                    </div>
                  </div>
                </div>
              </div>

              {plot.hasPest && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E8A3AD] bg-[#FFF1F3] p-2.5">
                  <span className="text-xs font-semibold text-[#9E3548]">
                    Xịt bình thuốc sâu ({SUPPLY_PRICES.bugSpray} Xu) để nhận đủ 2 {cropInfo.name}!
                  </span>
                  <button
                    type="button"
                    disabled={!canSpray}
                    onClick={() => {
                      soundFX.sparkle();
                      onSprayPest(plot.id);
                    }}
                    className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-[#D95970] px-3 text-xs font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                  >
                    <Bug className="h-3.5 w-3.5" />
                    <span>
                      {bugSprayCount > 0
                        ? 'Xịt Thuốc (1 Bình)'
                        : `Xịt Thuốc (${SUPPLY_PRICES.bugSpray} Xu)`}
                    </span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  soundFX.sparkle();
                  onHarvest(plot.id);
                }}
                className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#6BA383] px-4 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
              >
                <PackageCheck className="h-4 w-4" />
                <span>
                  Thu Hoạch (+{plot.hasPest ? 1 : 2} {cropInfo.name})
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
