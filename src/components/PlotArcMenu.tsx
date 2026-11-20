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

const CropSvgIcon: React.FC<{crop: CropType}> = ({crop}) => {
  switch (crop) {
    case 'wheat':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 20V6" stroke="#B68324" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="9.5" cy="9" rx="2.2" ry="3.2" transform="rotate(-25 9.5 9)" fill="#E7B94B" />
          <ellipse cx="14.5" cy="9" rx="2.2" ry="3.2" transform="rotate(25 14.5 9)" fill="#E7B94B" />
          <ellipse cx="10" cy="13.5" rx="2" ry="2.8" transform="rotate(-25 10 13.5)" fill="#DDA734" />
          <ellipse cx="14" cy="13.5" rx="2" ry="2.8" transform="rotate(25 14 13.5)" fill="#DDA734" />
          <ellipse cx="12" cy="5" rx="1.8" ry="2.6" fill="#F2CA5E" />
        </svg>
      );
    case 'scallion':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <ellipse cx="12" cy="17.8" rx="2.8" ry="2.6" fill="#F6F1E6" />
          <path d="M11 16L9.5 6.5M12 16V4.5M13 16L15 6" stroke="#4D9C52" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 'rice':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 20C12 13 13 9 16 6" stroke="#629B4E" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19C10.5 14 9 10 7 7" stroke="#538A42" strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="15.8" cy="7.5" rx="2.1" ry="1.3" transform="rotate(25 15.8 7.5)" fill="#E8C95A" />
          <ellipse cx="14" cy="10.2" rx="2.1" ry="1.3" transform="rotate(20 14 10.2)" fill="#E2BE48" />
          <ellipse cx="7.4" cy="8.2" rx="2" ry="1.2" transform="rotate(-25 7.4 8.2)" fill="#E8C95A" />
        </svg>
      );
    case 'carrot':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 7C12 4.5 9.5 3.5 8 4M12 7C12 4.2 14.5 3.5 16 4M12 7V3" stroke="#4E9A4E" strokeWidth="2" strokeLinecap="round" />
          <path d="M8.5 8.5C8.5 7 15.5 7 15.5 8.5L13 19.5C12.7 20.6 11.3 20.6 11 19.5L8.5 8.5Z" fill="#EF8432" />
        </svg>
      );
    case 'corn':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <ellipse cx="12" cy="10.5" rx="3.8" ry="6.2" fill="#F2C94C" />
          <path d="M7.5 11.5C7.5 16.5 9.5 20 12 20C14.5 20 16.5 16.5 16.5 11.5C14.5 14 13 15.5 12 15.5C11 15.5 9.5 14 7.5 11.5Z" fill="#5BA355" />
        </svg>
      );
    case 'strawberry':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M8 7.5C8 5.8 16 5.8 16 7.5L13.6 18.2C13 20.2 11 20.2 10.4 18.2L8 7.5Z" fill="#E54E63" />
          <path d="M7.5 7L12 5L16.5 7L14 8.5L12 7.5L10 8.5L7.5 7Z" fill="#4E9A4E" />
          <circle cx="10.8" cy="11.5" r="0.7" fill="#FFE09C" />
          <circle cx="13.4" cy="12" r="0.7" fill="#FFE09C" />
          <circle cx="12" cy="15.2" r="0.7" fill="#FFE09C" />
        </svg>
      );
    case 'tomato':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="13" r="6.5" fill="#DF483B" />
          <path d="M9 7.5L12 5L15 7.5L12 9L9 7.5Z" fill="#4C924B" />
          <circle cx="10" cy="11" r="1.3" fill="#FF897E" opacity="0.65" />
        </svg>
      );
    case 'lemon':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <ellipse cx="12" cy="12.5" rx="6.6" ry="5.2" transform="rotate(-20 12 12.5)" fill="#F7D44C" />
          <path d="M15.5 6.5C17 5 19 5.5 19 7.2C17.2 8 15.8 7.6 15.5 6.5Z" fill="#569D4F" />
        </svg>
      );
    case 'vanilla':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M8.5 19.5C9.5 13 11 9.5 14.5 6.5" stroke="#5A3A24" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12.5 19.5C13.2 14.5 14.2 11 16.8 8.5" stroke="#6E472D" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="3" fill="#FFF2C6" stroke="#DFC068" strokeWidth="1" />
          <circle cx="12" cy="7.5" r="1" fill="#E6A935" />
        </svg>
      );
    case 'sugarcane':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M9 20L11 7M15 20L14 6" stroke="#76B856" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M8.5 14H12M13 13H16.5" stroke="#DCE49D" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11 7C9 5 7 5.5 6 7M14 6C16 4 18 4.5 19 6" stroke="#4C9A4E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'watermelon':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12.5" r="6.5" fill="#469C53" />
          <path d="M9 6.8C10 10.5 10 14.5 9 18.2M12 6C13 10.5 13 14.5 12 19M15 6.8C14 10.5 14 14.5 15 18.2" stroke="#1E5E2A" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'pumpkin':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 6.5C12 4.8 13.5 4 14.5 4.5" stroke="#4C8444" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="9" cy="13.5" rx="4.2" ry="5.5" fill="#DF6B1D" />
          <ellipse cx="15" cy="13.5" rx="4.2" ry="5.5" fill="#DF6B1D" />
          <ellipse cx="12" cy="13.5" rx="3.4" ry="5.8" fill="#F08332" />
        </svg>
      );
    case 'cacao':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <ellipse cx="12" cy="12.5" rx="5.2" ry="7.2" fill="#A5633C" />
          <path d="M12 5.5V19.5M9.5 7C8.5 10.5 8.5 14.5 9.5 18M14.5 7C15.5 10.5 15.5 14.5 14.5 18" stroke="#753E21" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'coffee':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="9.2" cy="13.5" r="3.8" fill="#C83E4D" />
          <circle cx="15" cy="14" r="3.6" fill="#B23240" />
          <path d="M12 10L12 6.5M12 7C14 5.5 16.5 6 17 7.5" stroke="#3B7B42" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

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
                    <CropSvgIcon crop={crop.id} />
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
                    <CropSvgIcon crop={crop.id} />
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
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
              style={{backgroundColor: activeCrop.color}}
            />
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

