import React, {useEffect, useRef, useState} from 'react';
import {
  ArrowLeftRight,
  Box,
  Check,
  Coins,
  Crown,
  Flag,
  Gamepad2,
  Gift,
  Hammer,
  Heart,
  Monitor,
  Mountain,
  Music,
  Play,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import {
  BLINDBOX_SPIN_COST_XU,
  DollCatalogEntry,
  HDDOLL_CATALOG,
  HDDOLL_RARITY_META,
} from '../../data/hddollCatalog';
import {
  ArcadeGameId,
  ArcadeHubSection,
  COINGAME_TO_XU_RATE,
  HandheldStyle,
} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {DollSvgIcon} from '../DollSvgIcon';

export interface BlindboxSpinResult {
  doll: DollCatalogEntry;
  isDuplicate: boolean;
  refundXu: number;
}

interface ArcadeHubModalProps {
  section: ArcadeHubSection;
  coins: number;
  coinGame: number;
  ownedIds: string[];
  currentHandheld: HandheldStyle;
  onSelectSection: (next: ArcadeHubSection) => void;
  onOpenArcadeGame: (gameId: ArcadeGameId) => void;
  onOpenCoinGameShop: () => void;
  onSpinBlindbox: () => BlindboxSpinResult | null;
  onEquipDoll: (doll: DollCatalogEntry) => void;
  onClose: () => void;
}

interface MachineItem {
  id: ArcadeGameId | 'racing_sim';
  name: string;
  reward: string;
  note: string;
  accent: string;
  playable: boolean;
  gameId?: ArcadeGameId;
}

const ARCADE_MACHINES: MachineItem[] = [
  {
    id: 'parkour_climb',
    name: 'Parkour Phiêu Lưu 3D (1 Map Lớn)',
    reward: '+12 đến +18 CoinGame / ván (~2 Phút)',
    note: 'Nhân vật 3D của bạn leo thang dây, đu dây Zipline, nhảy nấm bật, tránh gió xoáy, cầu mục & đĩa sét!',
    accent: 'border-[#38BDF8]/65 bg-[#0F273B]',
    playable: true,
    gameId: 'parkour_climb',
  },
  {
    id: 'obstacle_rush',
    name: 'Vượt Chướng Ngại Vật 3D (1000m)',
    reward: '+10 đến +19 CoinGame / ván (~2 Phút)',
    note: 'Đấu trường 3D: né đá lăn, búa tạ, quạt xoay, sàn kính nứt, băng chuyền, đĩa xoay & mưa axit!',
    accent: 'border-[#FB923C]/65 bg-[#2F1A12]',
    playable: true,
    gameId: 'obstacle_rush',
  },
  {
    id: 'whack_mole',
    name: 'Đập Chuột Vui Nhộn',
    reward: '+1 đến +3 CoinGame / ván (30s)',
    note: 'Đập Chuột Lam & Chuột Vàng, tránh Bom Đỏ, giữ Combo!',
    accent: 'border-[#F472B6]/55 bg-[#2A1438]',
    playable: true,
    gameId: 'whack_mole',
  },
  {
    id: 'catch_stars',
    name: 'Hứng Sao Bầu Trời',
    reward: '+1 đến +3 CoinGame / ván (30s)',
    note: 'Di chuyển giỏ mây hứng Sao Lam/Vàng & né Thiên Thạch',
    accent: 'border-[#FBBF24]/55 bg-[#281F12]',
    playable: true,
    gameId: 'catch_stars',
  },
  {
    id: 'claw_ball',
    name: 'Máy Gắp Bóng ?',
    reward: '0 đến +5 CoinGame (15 Xu/lượt · Free 1/ngày)',
    note: 'Gạt cần điều khiển càng gắp bóng ? thả vào cửa nhận quà!',
    accent: 'border-[#38BDF8]/55 bg-[#0F233A]',
    playable: true,
    gameId: 'claw_ball',
  },
  {
    id: 'rhythm_dance',
    name: 'Sàn Nhảy Rhythm (4 Bài Nhạc)',
    reward: '+1 đến +5 CoinGame / bài (35s)',
    note: 'Chọn 4 bản nhạc sôi động & bấm chuẩn nhịp ← ↓ ↑ → theo beat!',
    accent: 'border-[#A78BFA]/55 bg-[#1D1635]',
    playable: true,
    gameId: 'rhythm_dance',
  },
  {
    id: 'pc_games',
    name: 'Dàn PC Esports (Game HTML)',
    reward: '+1 đến +9 Xu / ván',
    note: '3 game HTML nhẹ: Rắn Săn Mồi, Cờ XO, Đoán Nhịp Đèn',
    accent: 'border-[#34D399]/55 bg-[#0E2623]',
    playable: true,
    gameId: 'pc_games',
  },
  {
    id: 'racing_sim',
    name: 'Khoang Đua Xe Sim Racing',
    reward: 'Coming Soon',
    note: 'Đang lắp đặt đường đua Neon tốc độ cao',
    accent: 'border-white/15 bg-[#151A30]',
    playable: false,
  },
];

export const ArcadeHubModal: React.FC<ArcadeHubModalProps> = ({
  section,
  coins,
  coinGame,
  ownedIds,
  currentHandheld,
  onSelectSection,
  onOpenArcadeGame,
  onOpenCoinGameShop,
  onSpinBlindbox,
  onEquipDoll,
  onClose,
}) => {
  const [previewCoinGame, setPreviewCoinGame] = useState(10);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [spinResult, setSpinResult] = useState<BlindboxSpinResult | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) {
        window.clearTimeout(spinTimerRef.current);
      }
    };
  }, []);

  const ownedDollsCount = HDDOLL_CATALOG.filter((d) =>
    ownedIds.includes(d.shopItemId),
  ).length;
  const canAffordSpin = coins >= BLINDBOX_SPIN_COST_XU;

  const handleSpinClick = () => {
    if (isOpeningBox || !canAffordSpin) {
      soundFX.tap();
      return;
    }
    soundFX.tap();
    setSpinResult(null);
    setIsOpeningBox(true);
    spinTimerRef.current = window.setTimeout(() => {
      spinTimerRef.current = null;
      const res = onSpinBlindbox();
      setIsOpeningBox(false);
      if (res) {
        soundFX.sparkle();
        setSpinResult(res);
      }
    }, 680);
  };

  const tabs: {id: ArcadeHubSection; label: string}[] = [
    {id: 'overview', label: 'Tổng quan'},
    {id: 'games', label: 'Máy Game'},
    {id: 'blindbox', label: 'Blindbox HDDOLL'},
    {id: 'exchange', label: 'Đổi CoinGame'},
  ];

  const renderMachineIcon = (id: MachineItem['id']) => {
    if (id === 'parkour_climb') return <Mountain className="h-4 w-4 text-[#38BDF8]" />;
    if (id === 'obstacle_rush') return <Flag className="h-4 w-4 text-[#FB923C]" />;
    if (id === 'whack_mole') return <Hammer className="h-4 w-4 text-[#F472B6]" />;
    if (id === 'catch_stars') return <Star className="h-4 w-4 text-[#FDE047]" />;
    if (id === 'claw_ball') return <Gift className="h-4 w-4 text-[#38BDF8]" />;
    if (id === 'rhythm_dance') return <Music className="h-4 w-4 text-[#C4B5FD]" />;
    if (id === 'pc_games') return <Monitor className="h-4 w-4 text-[#34D399]" />;
    return <Gamepad2 className="h-4 w-4 text-[#94A3B8]" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060814]/75 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-[#38BDF8]/65 bg-[#11162B] text-[#F1F5F9] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#18203D] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#38BDF8]/60 bg-[#0F172A] text-[#38BDF8]">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-wide text-white">
                Khu Game Cyber Mây
              </div>
              <div className="text-[11px] font-bold text-[#94A3B8]">
                1 CoinGame = {COINGAME_TO_XU_RATE} Xu · Quay Blindbox bằng Xu Thị Trấn
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng bảng Khu Game"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Currency Strip */}
        <div className="grid grid-cols-2 gap-2 border-b border-white/10 bg-[#141A33] px-4 py-2.5">
          <div className="flex items-center justify-between rounded-2xl border border-[#38BDF8]/35 bg-[#0D1426] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#BAE6FD]">
              <Gamepad2 className="h-4 w-4 text-[#38BDF8]" />
              <span>CoinGame</span>
            </span>
            <span className="text-sm font-black tabular-nums text-[#38BDF8]">{coinGame}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#FBBF24]/35 bg-[#1B1726] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#FDE68A]">
              <Coins className="h-4 w-4 text-[#FBBF24]" />
              <span>Xu Thị Trấn</span>
            </span>
            <span className="text-sm font-black tabular-nums text-[#FBBF24]">{coins}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 border-b border-white/10 bg-[#0F1426] px-3 py-2">
          {tabs.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onSelectSection(tab.id);
                }}
                className={`rounded-xl px-2 py-1.5 text-[11px] font-extrabold transition active:scale-95 ${
                  active
                    ? 'bg-[#38BDF8] text-[#081226] shadow-sm'
                    : 'bg-white/5 text-[#CBD5E1] hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {section === 'overview' && (
            <>
              <div className="rounded-2xl border border-[#34D399]/55 bg-[#0B2A2B] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-black text-[#6EE7B7]">
                      <ShoppingBag className="h-4 w-4 text-[#34D399]" />
                      <span>Shop CoinGame Premium Đã Mở!</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#CCFBF1]">
                      Chinh phục các trò chơi để tích lũy CoinGame săn bộ sưu tập bay{' '}
                      <strong className="text-white">Lá Sen Che Mưa</strong> và{' '}
                      <strong className="text-[#F9A8D4]">Sen Đồng Tháp (Hạng A)</strong>!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onOpenCoinGameShop();
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#34D399] py-2 text-xs font-black text-[#04241C] transition active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Mở Shop CoinGame Premium</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectSection('games');
                  }}
                  className="rounded-2xl border border-[#A78BFA]/45 bg-[#1B1838] p-3 text-left transition active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <Monitor className="h-4 w-4 text-[#C4B5FD]" />
                    <span className="text-[10px] font-black text-[#34D399]">Đang mở</span>
                  </div>
                  <div className="mt-2 text-xs font-black text-white">7 Trò Chơi Đã Mở</div>
                  <div className="mt-0.5 text-[11px] font-bold text-[#DDD6FE]">
                    Parkour · Vượt chướng ngại vật · Đập chuột · Nhảy
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectSection('blindbox');
                  }}
                  className="rounded-2xl border border-[#F472B6]/55 bg-[#2A1838] p-3 text-left transition active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <Gift className="h-4 w-4 text-[#F9A8D4]" />
                    <span className="text-[10px] font-black text-[#34D399]">
                      Mới · {ownedDollsCount}/10
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-black text-white">Blindbox HDDOLL</div>
                  <div className="mt-0.5 text-[11px] font-bold text-[#FBCFE8]">
                    Săn 10 gấu bông ôm ngực & Secret Doraemon
                  </div>
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0D1324] px-3.5 py-2.5 text-[11px] font-semibold leading-relaxed text-[#CBD5E1]">
                Chạm trực tiếp từng máy trong Khu Game hoặc chọn tab{' '}
                <strong className="text-white">Blindbox HDDOLL</strong> để quay gấu bông ôm
                ngực siêu ấm áp!
              </div>
            </>
          )}

          {section === 'games' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#E2E8F0]">
                  <Trophy className="h-4 w-4 text-[#FBBF24]" />
                  <span>Chọn Trò Chơi Trong Khu Game</span>
                </div>
                <span className="text-[10px] font-black text-[#34D399]">7 máy hoạt động</span>
              </div>

              {ARCADE_MACHINES.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${m.accent}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                      {renderMachineIcon(m.id)}
                      <span className="truncate">{m.name}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#CBD5E1]">{m.note}</div>
                    <div className="mt-1 text-[11px] font-black text-[#7DD3FC]">{m.reward}</div>
                  </div>
                  {m.playable && m.gameId ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        onOpenArcadeGame(m.gameId!);
                      }}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-[#38BDF8] px-3 py-1.5 text-[11px] font-black text-[#081226] transition active:scale-95"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Chơi</span>
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black text-[#CBD5E1]">
                      Sắp mở
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {section === 'blindbox' && (
            <div className="space-y-3">
              {/* Banner */}
              <div className="rounded-2xl border border-[#F472B6]/55 bg-gradient-to-br from-[#2B173D] via-[#1C1838] to-[#13203C] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F9A8D4]/50 bg-[#F472B6]/20 text-[#F9A8D4]">
                      <Box className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-black text-white">
                        <span>Blindbox HDDOLL</span>
                        <span className="rounded-md bg-[#F472B6]/25 px-1.5 py-0.5 text-[9.5px] font-black text-[#FBCFE8]">
                          CẦM TAY
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#FDE68A]">
                        {BLINDBOX_SPIN_COST_XU} Xu / hộp · Chắc chắn trúng 1 Doll!
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-[#0D1326] px-2.5 py-1.5 text-right">
                    <div className="text-[9.5px] font-bold text-[#94A3B8]">Bộ sưu tập</div>
                    <div className="text-xs font-black tabular-nums text-[#F9A8D4]">
                      {ownedDollsCount} / {HDDOLL_CATALOG.length}
                    </div>
                  </div>
                </div>

                {/* Drop Rate Summary */}
                <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-xl border border-white/10 bg-[#0D1326]/80 px-2 py-1">
                    <div className="text-[10px] font-bold text-[#CBD5E1]">6 Thường</div>
                    <div className="text-[11px] font-black text-white">72%</div>
                  </div>
                  <div className="rounded-xl border border-[#C084FC]/40 bg-[#23143A]/85 px-2 py-1">
                    <div className="text-[10px] font-bold text-[#E9D5FF]">3 Đặc Biệt</div>
                    <div className="text-[11px] font-black text-[#F0ABFC]">24%</div>
                  </div>
                  <div className="rounded-xl border border-[#FDE047]/55 bg-[#2A200D]/85 px-2 py-1">
                    <div className="text-[10px] font-bold text-[#FEF08A]">Secret Doraemon</div>
                    <div className="text-[11px] font-black text-[#FDE047]">4%</div>
                  </div>
                </div>

                {/* Opening / Reveal Box */}
                {isOpeningBox && (
                  <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-[#FDE047]/50 bg-[#0D1326]/90 py-5 text-center">
                    <div className="flex h-14 w-14 animate-bounce items-center justify-center rounded-2xl border-2 border-[#FDE047] bg-gradient-to-br from-[#F472B6] to-[#A855F7] text-white shadow-lg">
                      <Gift className="h-7 w-7" />
                    </div>
                    <div className="mt-2.5 text-xs font-black text-[#FDE68A]">
                      Đang khui hộp Blindbox HDDOLL...
                    </div>
                  </div>
                )}

                {!isOpeningBox && spinResult && (() => {
                  const {doll, isDuplicate, refundXu} = spinResult;
                  const meta = HDDOLL_RARITY_META[doll.rarity];
                  const isEquipped = currentHandheld === doll.handheldId;
                  return (
                    <div
                      className={`mt-3 rounded-2xl border-2 bg-gradient-to-br ${meta.glowClass} ${meta.borderClass} p-3`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-[#FFFDF8] shadow-md">
                          <DollSvgIcon style={doll.handheldId} size={74} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-black ${meta.badgeBg} ${meta.badgeText}`}
                            >
                              {doll.rarity === 'secret' && (
                                <Crown className="mr-0.5 inline h-2.5 w-2.5" />
                              )}
                              {meta.label}
                            </span>
                            <span className="text-[10px] font-bold text-[#E2E8F0]">
                              {doll.seriesTag}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-black text-white">{doll.name}</div>
                          <div className="mt-0.5 text-[11px] font-bold text-[#FDE68A]">
                            Hiệu ứng: {doll.effectLabel}
                          </div>
                          {isDuplicate ? (
                            <div className="mt-1 text-[10.5px] font-bold text-[#6EE7B7]">
                              Đã có trong tủ · Hoàn lại +{refundXu} Xu may mắn!
                            </div>
                          ) : (
                            <div className="mt-1 text-[10.5px] font-bold text-[#FBCFE8]">
                              Đã mở khóa vào Tủ Đồ → Cầm tay!
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.sparkle();
                          onEquipDoll(doll);
                        }}
                        className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition active:scale-95 ${
                          isEquipped
                            ? 'border border-[#34D399]/60 bg-[#0B2A2B] text-[#6EE7B7]'
                            : 'bg-[#F472B6] text-[#1D0B18] shadow-sm'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Đang Ôm Bé {doll.name}</span>
                          </>
                        ) : (
                          <>
                            <Heart className="h-4 w-4 fill-current" />
                            <span>Ôm Doll Ngay</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}

                {/* Spin CTA */}
                <button
                  type="button"
                  disabled={!canAffordSpin || isOpeningBox}
                  onClick={handleSpinClick}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-black transition active:scale-95 ${
                    canAffordSpin && !isOpeningBox
                      ? 'bg-gradient-to-r from-[#F472B6] via-[#EC4899] to-[#F59E0B] text-white shadow-lg'
                      : 'cursor-not-allowed border border-white/15 bg-white/10 text-[#94A3B8]'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isOpeningBox
                      ? 'Đang mở hộp...'
                      : canAffordSpin
                        ? `Quay Blindbox HDDOLL · ${BLINDBOX_SPIN_COST_XU} Xu`
                        : `Cần ${BLINDBOX_SPIN_COST_XU} Xu (Thiếu ${BLINDBOX_SPIN_COST_XU - coins} Xu)`}
                  </span>
                </button>
              </div>

              {/* 10 Dolls Collection Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-black text-[#E2E8F0]">
                    10 Doll Đầu Tiên · Chạm Bé Đã Có Để Ôm
                  </span>
                  <span className="text-[10px] font-bold text-[#94A3B8]">
                    Mục Cầm tay trong Tủ Đồ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {HDDOLL_CATALOG.map((doll) => {
                    const owned = ownedIds.includes(doll.shopItemId);
                    const equipped = currentHandheld === doll.handheldId;
                    const meta = HDDOLL_RARITY_META[doll.rarity];
                    return (
                      <div
                        key={doll.handheldId}
                        className={`flex flex-col justify-between rounded-2xl border p-2.5 transition ${
                          equipped
                            ? 'border-[#34D399] bg-[#0E2B2A]'
                            : owned
                              ? `${meta.borderClass} bg-[#1A213F]`
                              : 'border-white/10 bg-[#141A33]/75'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${
                              owned
                                ? 'border-white/25 bg-[#FFFDF8]'
                                : 'border-white/10 bg-[#1D2545] opacity-65 saturate-50'
                            }`}
                          >
                            <DollSvgIcon style={doll.handheldId} size={52} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-black ${meta.badgeBg} ${meta.badgeText}`}
                              >
                                {doll.rarity === 'secret'
                                  ? 'SECRET'
                                  : doll.rarity === 'special'
                                    ? 'ĐẶC BIỆT'
                                    : 'THƯỜNG'}
                              </span>
                              <span className="text-[9.5px] font-black tabular-nums text-[#94A3B8]">
                                {doll.dropRate}%
                              </span>
                            </div>
                            <div className="mt-1 truncate text-xs font-black text-white">
                              {doll.name}
                            </div>
                            <div className="text-[10px] font-semibold leading-tight text-[#CBD5E1]">
                              {doll.effectLabel}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          {owned ? (
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.sparkle();
                                onEquipDoll(doll);
                              }}
                              className={`flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-black transition active:scale-95 ${
                                equipped
                                  ? 'bg-[#34D399] text-[#04241C]'
                                  : 'bg-white/15 text-white hover:bg-white/25'
                              }`}
                            >
                              {equipped ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Đang ôm</span>
                                </>
                              ) : (
                                <>
                                  <Heart className="h-3 w-3" />
                                  <span>Ôm ngay</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="rounded-xl border border-white/10 bg-black/20 py-1.5 text-center text-[10.5px] font-bold text-[#94A3B8]">
                              Chưa mở khóa
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {section === 'exchange' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#38BDF8]/45 bg-[#15203E] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-white">
                    <ArrowLeftRight className="h-4 w-4 text-[#38BDF8]" />
                    <span>Tỷ Giá Cân Bằng Chính Thức</span>
                  </div>
                  <span className="rounded-lg bg-[#38BDF8]/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#7DD3FC]">
                    Coming Soon
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-[#38BDF8]/30 bg-[#0C1427] p-2.5">
                    <div className="text-[10px] font-bold text-[#94A3B8]">Đổi sang Xu</div>
                    <div className="mt-1 text-sm font-black tabular-nums text-[#38BDF8]">
                      1 CoinGame = {COINGAME_TO_XU_RATE} Xu
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#FBBF24]/30 bg-[#1B1726] p-2.5">
                    <div className="text-[10px] font-bold text-[#94A3B8]">Đổi sang CoinGame</div>
                    <div className="mt-1 text-sm font-black tabular-nums text-[#FBBF24]">
                      {COINGAME_TO_XU_RATE} Xu = 1 CoinGame
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0D1324] p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#CBD5E1]">
                  <span>Mô phỏng quy đổi thử:</span>
                  <span className="tabular-nums text-[#38BDF8]">
                    {previewCoinGame} CoinGame ⇄ {previewCoinGame * COINGAME_TO_XU_RATE} Xu
                  </span>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setPreviewCoinGame(amt);
                      }}
                      className={`flex-1 rounded-xl py-1.5 text-xs font-black tabular-nums transition active:scale-95 ${
                        previewCoinGame === amt
                          ? 'bg-[#38BDF8] text-[#081226]'
                          : 'bg-white/10 text-[#CBD5E1]'
                      }`}
                    >
                      {amt} CG
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] font-semibold leading-relaxed text-[#94A3B8]">
                  Tỷ giá 1:10 giúp 1 ván game (~1–3 CoinGame = 10–30 Xu) ngang bằng thời gian câu
                  cá, bắt bọ, giao hàng Joyboy hay nấu ăn, không gây lạm phát Xu khi mở khóa tính
                  năng đổi 2 chiều ở bản cập nhật sau.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/15 bg-white/10 py-2.5 text-xs font-black text-[#94A3B8]"
              >
                Chức Năng Đổi Xu ⇄ CoinGame (Coming Soon)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
