import React, {useState} from 'react';
import {
  ArrowLeftRight,
  Box,
  Coins,
  Gamepad2,
  Gift,
  Monitor,
  Music,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {ArcadeHubSection, COINGAME_TO_XU_RATE} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface ArcadeHubModalProps {
  section: ArcadeHubSection;
  coins: number;
  coinGame: number;
  onSelectSection: (next: ArcadeHubSection) => void;
  onClose: () => void;
}

const UPCOMING_MACHINES = [
  {
    id: 'pc_arena',
    name: 'Dàn PC Esports Cyber',
    reward: '+2 đến +6 CoinGame / ván',
    note: 'Đấu phản xạ & combo bàn phím tốc độ cao',
    accent: 'border-[#38BDF8]/50 bg-[#0F1E33]',
  },
  {
    id: 'racing_sim',
    name: 'Khoang Đua Xe Sim Racing',
    reward: '+3 đến +7 CoinGame / chặng',
    note: 'Lách chướng ngại & giữ tốc độ đường đua Neon',
    accent: 'border-[#FB7185]/50 bg-[#271525]',
  },
  {
    id: 'rhythm_pad',
    name: 'Sàn Nhảy Rhythm Beat',
    reward: '+2 đến +5 CoinGame / bài',
    note: 'Bấm đúng nhịp mũi tên theo giai điệu',
    accent: 'border-[#A78BFA]/50 bg-[#1D1635]',
  },
  {
    id: 'hddoll_claw',
    name: 'Máy Gắp Hộp HDDOLL',
    reward: 'Quay mở hộp sưu tầm HDDOLL',
    note: 'Dùng CoinGame để săn búp bê hiếm giới hạn',
    accent: 'border-[#FBBF24]/50 bg-[#281F12]',
  },
];

const HDDOLL_SERIES_PREVIEW = [
  {
    id: 'sakura',
    name: 'HDDOLL Mây Hồng',
    rarity: 'Hiếm',
    color: 'from-[#F9A8D4] to-[#F472B6]',
  },
  {
    id: 'cyber',
    name: 'HDDOLL Cyber Neon',
    rarity: 'Cực Hiếm',
    color: 'from-[#67E8F9] to-[#6366F1]',
  },
  {
    id: 'golden',
    name: 'HDDOLL Hoàng Kim',
    rarity: 'Bí Ẩn',
    color: 'from-[#FDE68A] to-[#F59E0B]',
  },
];

export const ArcadeHubModal: React.FC<ArcadeHubModalProps> = ({
  section,
  coins,
  coinGame,
  onSelectSection,
  onClose,
}) => {
  const [previewCoinGame, setPreviewCoinGame] = useState(10);

  const tabs: {id: ArcadeHubSection; label: string}[] = [
    {id: 'overview', label: 'Tổng quan'},
    {id: 'blindbox', label: 'Blindbox HDDOLL'},
    {id: 'exchange', label: 'Đổi CoinGame'},
    {id: 'games', label: 'Máy Game'},
  ];

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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#38BDF8]/60 bg-[#0F172A] text-[#38BDF8]">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-wide text-white">
                Khu Game Cyber Mây
              </div>
              <div className="text-[11px] font-bold text-[#94A3B8]">
                Đơn vị thưởng mới: CoinGame · Tỷ giá 1 CoinGame = {COINGAME_TO_XU_RATE} Xu
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
              <div className="rounded-2xl border border-[#FBBF24]/45 bg-gradient-to-br from-[#231B38] to-[#141A33] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-black text-[#FDE68A]">
                      <Gift className="h-4 w-4 text-[#FBBF24]" />
                      <span>Quay Blindbox HDDOLL</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#CBD5E1]">
                      Dùng <strong className="text-[#38BDF8]">CoinGame</strong> kiếm từ máy game để
                      mở hộp sưu tầm búp bê <strong className="text-white">HDDOLL</strong> giới hạn.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-[#FBBF24]/50 bg-[#FBBF24]/15 px-2 py-0.5 text-[10px] font-black uppercase text-[#FDE68A]">
                    Coming Soon
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectSection('blindbox');
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FBBF24] py-2 text-xs font-black text-[#1E1405] transition active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Xem Tủ Blindbox HDDOLL</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectSection('exchange');
                  }}
                  className="rounded-2xl border border-[#38BDF8]/40 bg-[#16203E] p-3 text-left transition active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <ArrowLeftRight className="h-4 w-4 text-[#38BDF8]" />
                    <span className="text-[10px] font-black text-[#94A3B8]">Sắp mở</span>
                  </div>
                  <div className="mt-2 text-xs font-black text-white">Quy đổi 2 chiều</div>
                  <div className="mt-0.5 text-[11px] font-bold tabular-nums text-[#7DD3FC]">
                    1 CoinGame = {COINGAME_TO_XU_RATE} Xu
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectSection('games');
                  }}
                  className="rounded-2xl border border-[#A78BFA]/40 bg-[#1B1838] p-3 text-left transition active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <Monitor className="h-4 w-4 text-[#C4B5FD]" />
                    <span className="text-[10px] font-black text-[#94A3B8]">Sắp mở</span>
                  </div>
                  <div className="mt-2 text-xs font-black text-white">Trò chơi CoinGame</div>
                  <div className="mt-0.5 text-[11px] font-bold text-[#DDD6FE]">
                    4 máy gaming hiện đại
                  </div>
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0D1324] px-3.5 py-2.5 text-[11px] font-semibold leading-relaxed text-[#CBD5E1]">
                Hai máy cổ điển <strong className="text-white">Máy Bắt Sao</strong> và{' '}
                <strong className="text-white">Gắp Thú Bông</strong> ở cánh phải vẫn hoạt động
                ngay bây giờ để nhận Xu giải trí!
              </div>
            </>
          )}

          {section === 'blindbox' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-[#FBBF24]/50 bg-[#231B38] p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBBF24]/20 text-[#FBBF24]">
                    <Box className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Máy Quay Blindbox HDDOLL</div>
                    <div className="text-[11px] font-bold text-[#FDE68A]">
                      Dự kiến ~30–45 CoinGame / hộp · Coming Soon
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {HDDOLL_SERIES_PREVIEW.map((doll) => (
                  <div
                    key={doll.id}
                    className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#171F3A] p-2.5 text-center"
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${doll.color} text-[#0F172A] shadow-md`}
                    >
                      <Gift className="h-7 w-7" />
                    </div>
                    <div className="mt-2 text-[11px] font-black text-white">{doll.name}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-[#94A3B8]">{doll.rarity}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0D1324] p-3 text-xs font-semibold leading-relaxed text-[#CBD5E1]">
                Mỗi hộp <strong className="text-[#FDE68A]">HDDOLL</strong> mở ra ngẫu nhiên mô hình
                sưu tầm trưng bày tại Nhà Của Tôi hoặc phụ kiện đặc biệt. Giá mỗi lượt quay sẽ cân
                bằng với tỷ giá <strong className="text-[#38BDF8]">1 CoinGame = 10 Xu</strong> để
                người chơi cày mini-game hoặc đổi Xu đều công bằng.
              </div>

              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/15 bg-white/10 py-2.5 text-xs font-black text-[#94A3B8]"
              >
                Quay Blindbox HDDOLL (Coming Soon)
              </button>
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
                  Tỷ giá 1:10 giúp 1 ván game (~3–5 CoinGame = 30–50 Xu) ngang bằng thời gian câu
                  cá, giao hàng Joyboy hay nấu ăn, không gây lạm phát Xu khi mở khóa tính năng đổi
                  2 chiều ở bản cập nhật sau.
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

          {section === 'games' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#E2E8F0]">
                  <Trophy className="h-4 w-4 text-[#FBBF24]" />
                  <span>Các Máy Trò Chơi Đang Lắp Đặt</span>
                </div>
                <span className="text-[10px] font-black uppercase text-[#7DD3FC]">
                  Coming Soon
                </span>
              </div>

              {UPCOMING_MACHINES.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${m.accent}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                      {m.id === 'rhythm_pad' ? (
                        <Music className="h-3.5 w-3.5 text-[#C4B5FD]" />
                      ) : (
                        <Gamepad2 className="h-3.5 w-3.5 text-[#38BDF8]" />
                      )}
                      <span className="truncate">{m.name}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#CBD5E1]">{m.note}</div>
                    <div className="mt-1 text-[11px] font-black text-[#7DD3FC]">{m.reward}</div>
                  </div>
                  <span className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black text-[#CBD5E1]">
                    Sắp ra mắt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
