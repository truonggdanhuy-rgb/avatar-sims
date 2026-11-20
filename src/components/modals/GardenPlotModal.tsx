import React, {useEffect, useState} from 'react';
import {
  ArrowUpCircle,
  Bug,
  Coins,
  Droplets,
  PackageCheck,
  Sprout,
  X,
} from 'lucide-react';
import {CROP_LIST, CROPS, PLOT_LEVELS} from '../../data/farmCatalog';
import {CropType, GardenPlotState, PlotLevel} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface GardenPlotModalProps {
  plot: GardenPlotState;
  coins: number;
  onPlant: (plotId: number, crop: CropType) => void;
  onWater: (plotId: number) => void;
  onCatchPest: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onUpgradePlot: (plotId: number) => void;
  onClose: () => void;
}

function formatRemaining(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

export const GardenPlotModal: React.FC<GardenPlotModalProps> = ({
  plot,
  coins,
  onPlant,
  onWater,
  onCatchPest,
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
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-[#4B8A5B]" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Ô Đất #{plot.id} · {levelInfo.name}
            </h2>
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
              aria-label="Đóng ô đất"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex-1 space-y-4 overflow-y-auto p-4 text-[#4A3525]">
          {/* Soil Upgrade Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DFCCB0] bg-[#FFF9EF] p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#4A3525]">{levelInfo.name}</div>
              <div className="mt-0.5 text-[11px] text-[#7A6048]">{levelInfo.description}</div>
            </div>

            {upgradeCost !== null && nextLevelInfo ? (
              <button
                type="button"
                disabled={coins < upgradeCost}
                onClick={() => {
                  soundFX.sparkle();
                  onUpgradePlot(plot.id);
                }}
                className={`flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums transition-transform active:scale-95 ${
                  coins >= upgradeCost
                    ? 'bg-[#6BA383] text-white shadow-xs'
                    : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" />
                <span>
                  Lên Lv.{nextLevelInfo.level} · {upgradeCost} Xu
                </span>
              </button>
            ) : (
              <span className="text-xs font-bold text-[#B8822E]">Đã đạt cấp tối đa</span>
            )}
          </div>

          {/* Stage: Empty -> Seed Picker */}
          {plot.stage === 'empty' && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-[#6F4E37]">
                Chọn hạt giống để gieo (Thu hoạch 2 nông sản nếu không bị sâu)
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
                            {effectiveSeconds}s
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
                    Cây đang có sâu! Bắt sâu để giữ đủ 2 sản phẩm khi thu hoạch.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.sparkle();
                      onCatchPest(plot.id);
                    }}
                    className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-[#D95970] px-3 text-xs font-bold text-white transition-transform active:scale-95"
                  >
                    <Bug className="h-3.5 w-3.5" />
                    <span>Bắt sâu</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
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
              </div>
            </div>
          )}

          {/* Stage: Ready (Lớn - Thu hoạch) */}
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
                        ? 'Cây đang bị sâu: thu hoạch ngay chỉ được 1 sản phẩm!'
                        : 'Cây khỏe mạnh: thu hoạch được 2 sản phẩm.'}
                    </div>
                  </div>
                </div>
              </div>

              {plot.hasPest && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E8A3AD] bg-[#FFF1F3] p-2.5">
                  <span className="text-xs font-semibold text-[#9E3548]">
                    Bắt sâu trước để nhận đủ 2 {cropInfo.name}!
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.sparkle();
                      onCatchPest(plot.id);
                    }}
                    className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-[#D95970] px-3 text-xs font-bold text-white transition-transform active:scale-95"
                  >
                    <Bug className="h-3.5 w-3.5" />
                    <span>Bắt sâu</span>
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
