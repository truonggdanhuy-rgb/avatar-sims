import React, {useEffect, useState} from 'react';
import {
  ArrowUp,
  Check,
  Clock,
  Droplets,
  Scissors,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';
import {CROP_LIST, CROPS, PLOT_LEVELS} from '../data/farmCatalog';
import {CropType, GardenPlotState, PlotLevel} from '../types/game';
import {soundFX} from '../utils/sound';
import {FarmItemIcon} from './FarmItemIcon';

interface PlotArcMenuProps {
  plot: GardenPlotState;
  screenX: number;
  screenY: number;
  coins: number;
  seeds: Partial<Record<CropType, number>>;
  bugSprayCount: number;
  waterCount: number;
  onPlant: (plotId: number, crop: CropType) => void;
  onWater: (plotId: number) => void;
  onSprayPest: (plotId: number) => void;
  onWeed: (plotId: number) => void;
  onCancelCrop: (plotId: number) => void;
  onUpgradePlot: (plotId: number) => void;
  onClose: () => void;
}

function formatRemainingTime(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}g${m.toString().padStart(2, '0')}p`;
  if (m > 0) return `${m}p${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

function formatShortGrowTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}p`;
  const h = Math.floor(mins / 60);
  const remM = mins % 60;
  return remM > 0 ? `${h}g${remM}` : `${h}g`;
}

const CaterpillarSvgIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
    <circle cx="6" cy="14.5" r="2.6" fill="#A6E87E" />
    <circle cx="9.8" cy="12.5" r="2.8" fill="#C2F59D" />
    <circle cx="13.6" cy="13.4" r="2.8" fill="#A6E87E" />
    <circle cx="17.6" cy="11.6" r="3.1" fill="#D5FFAF" />
    <circle cx="18.7" cy="10.8" r="0.7" fill="#2A3E20" />
    <path d="M18 8.8L19.6 6.8M16.4 9L15.8 6.8" stroke="#EAFCD9" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

interface ArcAction {
  key: string;
  title: string;
  bgClass: string;
  disabled?: boolean;
  badge?: string;
  badgeClass?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const PlotArcMenu: React.FC<PlotArcMenuProps> = ({
  plot,
  screenX,
  screenY,
  coins,
  seeds,
  bugSprayCount,
  waterCount,
  onPlant,
  onWater,
  onSprayPest,
  onWeed,
  onCancelCrop,
  onUpgradePlot,
  onClose,
}) => {
  const [seedFanOpen, setSeedFanOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setSeedFanOpen(false);
    setConfirmCancel(false);
    setUpgradeOpen(false);
    setConfirmUpgrade(false);
  }, [plot.id, plot.stage]);

  useEffect(() => {
    if (plot.stage !== 'growing') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [plot.stage, plot.readyAt]);

  const levelInfo = PLOT_LEVELS[plot.level];
  const nextLevel = (plot.level < 3 ? plot.level + 1 : null) as PlotLevel | null;
  const nextLevelInfo = nextLevel ? PLOT_LEVELS[nextLevel] : null;
  const upgradeCost = levelInfo.upgradeCostToNext;
  const canUpgrade = upgradeCost !== null && coins >= upgradeCost;

  const actions: ArcAction[] = [];

  if (plot.stage === 'empty') {
    actions.push({
      key: 'seed',
      title: plot.hasWeed ? 'Hãy dọn cỏ trước khi gieo hạt' : 'Chọn túi hạt giống',
      bgClass: seedFanOpen
        ? 'bg-[#3D7A54] text-white ring-2 ring-[#FFF5D6]'
        : 'bg-[#5FA86B] text-white',
      disabled: plot.hasWeed,
      icon: <Sprout className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setUpgradeOpen(false);
        setConfirmUpgrade(false);
        setSeedFanOpen((v) => !v);
      },
    });
    if (plot.hasWeed) {
      actions.push({
        key: 'weed',
        title: 'Dọn cỏ',
        bgClass: 'bg-[#73AA44] text-white',
        icon: <Scissors className="h-4 w-4" />,
        onClick: () => {
          soundFX.tap();
          onWeed(plot.id);
        },
      });
    }
    actions.push({
      key: 'upgrade',
      title: `Cấp đất Lv.${plot.level}${upgradeCost ? ` · Nâng (${upgradeCost} Xu)` : ' (Tối đa)'}`,
      bgClass: upgradeOpen
        ? 'bg-[#E59838] text-white ring-2 ring-[#FFF4D2]'
        : 'bg-[#4E8B64] text-white',
      icon: <ArrowUp className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setSeedFanOpen(false);
        setConfirmUpgrade(false);
        setUpgradeOpen((v) => !v);
      },
    });
  } else if (plot.stage === 'growing') {
    if (!plot.watered) {
      actions.push({
        key: 'water',
        title:
          waterCount > 0
            ? `Tưới nước (-20% thời gian · còn x${waterCount})`
            : 'Hết nước! Hãy lại Giếng thu nước',
        bgClass:
          waterCount > 0
            ? 'bg-[#4E9ED9] text-white'
            : 'bg-[#D6CFC5] text-[#8E8478]',
        disabled: waterCount <= 0,
        badge: `x${waterCount}`,
        badgeClass:
          waterCount > 0
            ? 'border-[#4E9ED9]/60 bg-[#F3FAFF]/95 text-[#216191]'
            : 'border-[#B8AFA3]/60 bg-[#F2EDE4]/95 text-[#7D7368]',
        icon: <Droplets className="h-4 w-4" />,
        onClick: () => {
          soundFX.splash();
          onWater(plot.id);
          onClose();
        },
      });
    }
    if (plot.hasPest) {
      actions.push({
        key: 'pest',
        title: bugSprayCount > 0 ? 'Bắt sâu (1 Bình xịt)' : 'Hết bình xịt sâu',
        bgClass:
          bugSprayCount > 0
            ? 'bg-[#D95970] text-white'
            : 'bg-[#D6CFC5] text-[#8E8478]',
        disabled: bugSprayCount <= 0,
        icon: <CaterpillarSvgIcon />,
        onClick: () => {
          soundFX.sparkle();
          onSprayPest(plot.id);
          onClose();
        },
      });
    }
    if (plot.hasWeed) {
      actions.push({
        key: 'weed',
        title: 'Dọn cỏ',
        bgClass: 'bg-[#73AA44] text-white',
        icon: <Scissors className="h-4 w-4" />,
        onClick: () => {
          soundFX.tap();
          onWeed(plot.id);
        },
      });
    }
    actions.push({
      key: 'upgrade',
      title: `Cấp đất Lv.${plot.level}${upgradeCost ? ` · Nâng (${upgradeCost} Xu)` : ' (Tối đa)'}`,
      bgClass: upgradeOpen
        ? 'bg-[#E59838] text-white ring-2 ring-[#FFF4D2]'
        : 'bg-[#4E8B64] text-white',
      icon: <ArrowUp className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setConfirmCancel(false);
        setConfirmUpgrade(false);
        setUpgradeOpen((v) => !v);
      },
    });
    actions.push({
      key: 'cancel',
      title: confirmCancel ? 'Xác nhận hủy cây' : 'Hủy cây',
      bgClass: confirmCancel
        ? 'bg-[#C93B4B] text-white ring-2 ring-[#FFE5E8]'
        : 'bg-[#FFF3F3] text-[#C93B4B] border border-[#E5B8B8]',
      icon: confirmCancel ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />,
      onClick: () => {
        if (!confirmCancel) {
          soundFX.tap();
          setUpgradeOpen(false);
          setConfirmUpgrade(false);
          setConfirmCancel(true);
        } else {
          soundFX.tap();
          onCancelCrop(plot.id);
          onClose();
        }
      },
    });
  } else if (plot.stage === 'ready' && plot.hasPest) {
    actions.push({
      key: 'pest',
      title: bugSprayCount > 0 ? 'Bắt sâu (1 Bình xịt)' : 'Hết bình xịt sâu',
      bgClass:
        bugSprayCount > 0
          ? 'bg-[#D95970] text-white'
          : 'bg-[#D6CFC5] text-[#8E8478]',
      disabled: bugSprayCount <= 0,
      icon: <CaterpillarSvgIcon />,
      onClick: () => {
        soundFX.sparkle();
        onSprayPest(plot.id);
        onClose();
      },
    });
    actions.push({
      key: 'upgrade',
      title: `Cấp đất Lv.${plot.level}${upgradeCost ? ` · Nâng (${upgradeCost} Xu)` : ' (Tối đa)'}`,
      bgClass: upgradeOpen
        ? 'bg-[#E59838] text-white ring-2 ring-[#FFF4D2]'
        : 'bg-[#4E8B64] text-white',
      icon: <ArrowUp className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setConfirmUpgrade(false);
        setUpgradeOpen((v) => !v);
      },
    });
  }

  // Arc placement for main action buttons (-155deg to -25deg)
  const mainRadius = 56;
  const innerSeedRadius = 104;
  const outerSeedRadius = 156;

  const innerSeeds = CROP_LIST.slice(0, 6);
  const outerSeeds = CROP_LIST.slice(6);

  const getArcPos = (idx: number, total: number, radius: number, spanDeg = 132) => {
    const startDeg = -90 - spanDeg / 2;
    const deg = total === 1 ? -90 : startDeg + (idx / (total - 1)) * spanDeg;
    const rad = (deg * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  };

  const activeCrop = plot.crop ? CROPS[plot.crop] : null;
  const remMs =
    plot.stage === 'growing' && plot.readyAt ? Math.max(0, plot.readyAt - now) : 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-label="Menu vòng cung ô đất"
    >
      <div
        className="pointer-events-auto absolute"
        style={{left: `${screenX}px`, top: `${screenY}px`}}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Center Close Pill Button */}
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onClose();
          }}
          aria-label="Đóng"
          title="Đóng"
          className="anim-pop flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#8C6239] bg-[#FFF8EB] text-[#4A3525] shadow-md transition-transform active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Primary Action Arc Buttons (Icon-Only + Optional xN Water Badge Below) */}
        {actions.map((act, idx) => {
          const pos = getArcPos(idx, actions.length, mainRadius, actions.length >= 4 ? 148 : 118);
          return (
            <div
              key={act.key}
              style={{left: `${pos.x}px`, top: `${pos.y}px`}}
              className="anim-pop absolute -translate-x-1/2 -translate-y-1/2"
            >
              <button
                type="button"
                disabled={act.disabled}
                onClick={act.onClick}
                aria-label={act.title}
                title={act.title}
                className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90 disabled:cursor-not-allowed ${act.bgClass}`}
              >
                {act.icon}
              </button>
              {act.badge && (
                <div
                  className={`pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded border px-1 py-px text-[9px] leading-none font-extrabold tracking-tight whitespace-nowrap shadow-2xs tabular-nums ${
                    act.badgeClass ?? 'border-[#8C6239]/40 bg-[#FFFDF8]/95 text-[#4A3525]'
                  }`}
                >
                  {act.badge}
                </div>
              )}
            </div>
          );
        })}

        {/* Seed Fan Arcs (Icon + compact time x qty badge underneath) */}
        {seedFanOpen && plot.stage === 'empty' && !plot.hasWeed && (
          <>
            {innerSeeds.map((crop, idx) => {
              const owned = seeds[crop.id] || 0;
              const pos = getArcPos(idx, innerSeeds.length, innerSeedRadius, 148);
              const badge = `${formatShortGrowTime(crop.growSeconds)} x${owned}`;
              return (
                <div
                  key={crop.id}
                  style={{left: `${pos.x}px`, top: `${pos.y}px`}}
                  className="anim-pop absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <button
                    type="button"
                    disabled={owned <= 0}
                    onClick={() => {
                      soundFX.sparkle();
                      onPlant(plot.id, crop.id);
                      onClose();
                    }}
                    aria-label={`${crop.name} (${badge})`}
                    title={`${crop.name} · ${formatShortGrowTime(crop.growSeconds)} · còn ${owned} hạt`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-md transition-transform active:scale-90 ${
                      owned > 0
                        ? 'border-[#55946B] bg-[#FFFDF8]'
                        : 'cursor-not-allowed border-[#C9C1B6] bg-[#EAE3D8]/85 opacity-55 grayscale'
                    }`}
                  >
                    <FarmItemIcon kind="crop" id={crop.id} className="h-5 w-5" />
                  </button>
                  <div
                    className={`pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded border px-1 py-px text-[9px] leading-none font-extrabold tracking-tight whitespace-nowrap shadow-2xs tabular-nums ${
                      owned > 0
                        ? 'border-[#55946B]/55 bg-[#FFFDF8]/95 text-[#2E593D]'
                        : 'border-[#B8AFA3]/55 bg-[#F2EDE4]/90 text-[#7D7368]'
                    }`}
                  >
                    {badge}
                  </div>
                </div>
              );
            })}
            {outerSeeds.map((crop, idx) => {
              const owned = seeds[crop.id] || 0;
              const pos = getArcPos(idx, outerSeeds.length, outerSeedRadius, 162);
              const badge = `${formatShortGrowTime(crop.growSeconds)} x${owned}`;
              return (
                <div
                  key={crop.id}
                  style={{left: `${pos.x}px`, top: `${pos.y}px`}}
                  className="anim-pop absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <button
                    type="button"
                    disabled={owned <= 0}
                    onClick={() => {
                      soundFX.sparkle();
                      onPlant(plot.id, crop.id);
                      onClose();
                    }}
                    aria-label={`${crop.name} (${badge})`}
                    title={`${crop.name} · ${formatShortGrowTime(crop.growSeconds)} · còn ${owned} hạt`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-md transition-transform active:scale-90 ${
                      owned > 0
                        ? 'border-[#55946B] bg-[#FFFDF8]'
                        : 'cursor-not-allowed border-[#C9C1B6] bg-[#EAE3D8]/85 opacity-55 grayscale'
                    }`}
                  >
                    <FarmItemIcon kind="crop" id={crop.id} className="h-5 w-5" />
                  </button>
                  <div
                    className={`pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded border px-1 py-px text-[9px] leading-none font-extrabold tracking-tight whitespace-nowrap shadow-2xs tabular-nums ${
                      owned > 0
                        ? 'border-[#55946B]/55 bg-[#FFFDF8]/95 text-[#2E593D]'
                        : 'border-[#B8AFA3]/55 bg-[#F2EDE4]/90 text-[#7D7368]'
                    }`}
                  >
                    {badge}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Compact Floating Info/Level Card BELOW Center (never overlaps icon arc!) */}
        {upgradeOpen ? (
          <div className="anim-pop absolute top-7 left-0 flex min-w-[215px] -translate-x-1/2 flex-col gap-1.5 rounded-xl border-2 border-[#8C6239] bg-[#FFF9EF] p-2.5 text-[#4A3525] shadow-xl">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span>{levelInfo.name}</span>
              <span className="rounded bg-[#E6EFE7] px-1.5 py-0.5 text-[10px] font-bold text-[#3F7B4E]">
                Lv.{plot.level}
              </span>
            </div>
            <div className="text-[10px] text-[#7A6048]">{levelInfo.description}</div>
            {upgradeCost !== null && nextLevelInfo ? (
              confirmUpgrade ? (
                <div className="space-y-1.5 border-t border-[#E6D6BE] pt-1.5">
                  <div className="text-[10px] font-semibold text-[#6F4E37]">
                    Lên Lv.{nextLevelInfo.level} ({nextLevelInfo.description}) tốn{' '}
                    <strong className="text-[#9A5B25]">{upgradeCost} Xu</strong>?
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setConfirmUpgrade(false);
                      }}
                      className="min-h-[26px] flex-1 rounded-lg bg-[#EADBC6] px-2 text-[11px] font-semibold text-[#5B422E] active:scale-95"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={!canUpgrade}
                      onClick={() => {
                        soundFX.sparkle();
                        onUpgradePlot(plot.id);
                        setConfirmUpgrade(false);
                        setUpgradeOpen(false);
                      }}
                      className="min-h-[26px] flex-1 rounded-lg bg-[#E09B3D] px-2 text-[11px] font-bold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canUpgrade}
                  onClick={() => {
                    soundFX.tap();
                    setConfirmUpgrade(true);
                  }}
                  className="flex min-h-[28px] w-full items-center justify-center gap-1 rounded-lg bg-[#4E8B64] px-2 text-[11px] font-bold text-white tabular-nums shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                >
                  <ArrowUp className="h-3 w-3" />
                  <span>
                    {canUpgrade
                      ? `Nâng Lv.${nextLevelInfo.level} (${upgradeCost} Xu)`
                      : `Cần ${upgradeCost} Xu (thiếu ${upgradeCost - coins})`}
                  </span>
                </button>
              )
            ) : (
              <div className="rounded-lg bg-[#E8D4AC]/60 px-2 py-1 text-center text-[10px] font-bold text-[#7A541C]">
                Đã đạt cấp tối đa (Lv.3)
              </div>
            )}
          </div>
        ) : activeCrop && (plot.stage === 'growing' || plot.stage === 'ready') ? (
          <div className="anim-pop absolute top-7 left-0 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-[#8C6239]/55 bg-[#FFF9EF]/95 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#4A3525] shadow-md">
            <FarmItemIcon kind="crop" id={activeCrop.id} className="h-4 w-4 shrink-0" />
            <span>{activeCrop.name}</span>
            <span className="text-[#9E8A75]">·</span>
            {plot.stage === 'growing' ? (
              <span className="inline-flex items-center gap-1 tabular-nums text-[#3E7A55]">
                <Clock className="h-3 w-3" />
                {formatRemainingTime(remMs)}
                {plot.hasPest && (
                  <span className="ml-0.5 rounded bg-[#FCE4E8] px-1 py-px text-[10px] font-bold text-[#C94B63]">
                    Có sâu!
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[#C94B63]">Bị sâu! Bắt sâu rồi thu</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

