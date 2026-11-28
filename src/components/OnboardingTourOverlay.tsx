import React, {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, FastForward, Pause, Play, Sparkles, X} from 'lucide-react';
import {ZoneId} from '../types/game';
import {soundFX} from '../utils/sound';

export interface TourCameraTarget {
  zone: ZoneId;
  camPos: [number, number, number];
  lookAt: [number, number, number];
  annaPos: [number, number, number];
  annaRotY: number;
}

export interface GuidedTourStop extends TourCameraTarget {
  id: string;
  badge: string;
  title: string;
  speakerLine: string;
  tip: string;
  durationMs: number;
}

export const GUIDED_TOUR_STOPS: GuidedTourStop[] = [
  {
    id: 'plaza',
    zone: 'town',
    badge: '1/6 · Quảng Trường',
    title: 'Quảng Trường Mây & Anna',
    speakerLine:
      'Chào mừng bạn đến Thị Trấn Mây! Mình là Anna — hãy ngồi yên để màn hình tự tua nhanh một vòng khám phá toàn bộ thị trấn nhé!',
    tip: 'Bạn luôn có thể gặp Anna tại Quảng Trường để xem lại hướng dẫn.',
    camPos: [-0.8, 4.9, 12.2],
    lookAt: [-1.4, 1.05, 2.8],
    annaPos: [-3.25, 0.02, 3.7],
    annaRotY: 0.45,
    durationMs: 3600,
  },
  {
    id: 'house',
    zone: 'home',
    badge: '2/6 · Nhà Riêng',
    title: 'Nhà Riêng & Kệ Trưng Bày',
    speakerLine:
      'Đây là ngôi nhà riêng của bạn! Ghé Tiệm Nội Thất Bob sắm Kệ Doll, Bể Cá và Tủ Bọ-Bướm rồi chạm vào để trưng bày bộ sưu tập.',
    tip: 'Ngủ giường để hồi Năng Lượng và dùng Bếp nấu ăn hồi Độ No.',
    camPos: [2.2, 7.8, 9.2],
    lookAt: [-2.2, 0.95, -2.5],
    annaPos: [-1.6, 0, 2.2],
    annaRotY: 0.35,
    durationMs: 3800,
  },
  {
    id: 'garden',
    zone: 'garden',
    badge: '3/6 · Nông Trại',
    title: 'Nông Trại, Ao Cá & Chăn Nuôi',
    speakerLine:
      'Nông Trại Rộng Mở là nguồn kiếm Xu dồi dào nhất: trồng hoa màu, tưới giếng, nuôi gà bò, nuôi cá Koi 24h và giao Đơn Hàng Nông Trại!',
    tip: 'Lối tắt Điện Thoại giúp bạn dịch chuyển nhanh tới mọi khu vực.',
    camPos: [5.2, 11.4, 13.8],
    lookAt: [-1.2, 0.85, -1.8],
    annaPos: [1.1, 0, 4.8],
    annaRotY: -0.3,
    durationMs: 3800,
  },
  {
    id: 'fishing_bugs',
    zone: 'town',
    badge: '4/6 · Câu Cá & Bắt Bọ',
    title: 'Hồ Câu Cá, Bắt Bọ & Đảo Hoang',
    speakerLine:
      'Sắm Cần Câu và Vợt Bắt Bọ tại thị trấn để câu cá trên cầu gỗ, đi rón rén bắt bướm quanh bụi hoa, hoặc chèo thuyền ra Đảo Hoang!',
    tip: 'Cá và bọ bắt được có thể bán lấy Xu hoặc thả vào bể kính trong nhà.',
    camPos: [-3.5, 7.6, 46.8],
    lookAt: [-10.0, 1.0, 35.0],
    annaPos: [-10.2, 0.25, 39.2],
    annaRotY: 0.25,
    durationMs: 3800,
  },
  {
    id: 'mall_pets',
    zone: 'mall',
    badge: '5/6 · May Mall & Thú Cưng',
    title: 'May Mall, Thời Trang & Thú Cưng',
    speakerLine:
      'Ghé May Mall mua nguyên liệu bếp Peppa, đồ ăn vặt và xe đạp ở Tiệm Tủn; sang Shop Thú Cưng Ivan để nhận nuôi Pet đồng hành!',
    tip: 'Tiệm Thời Trang Tina có rất nhiều kiểu tóc, mũ, áo và phụ kiện xinh.',
    camPos: [2.2, 6.2, 11.6],
    lookAt: [0, 1.5, -2.5],
    annaPos: [0.3, 0.04, 4.8],
    annaRotY: 0.1,
    durationMs: 3800,
  },
  {
    id: 'arcade',
    zone: 'arcade',
    badge: '6/6 · Khu Game & HDDOLL',
    title: 'Khu Game Cyber Mây & Blindbox',
    speakerLine:
      'Chinh phục Parkour & Vượt Chướng Ngại Vật kiếm CoinGame đổi Thú Cưỡi Bay, và mở hộp Blindbox HDDOLL gấu bông ôm ngực siêu đáng yêu!',
    tip: 'Chuyến tham quan hoàn tất — chúc bạn có những giây phút thật vui ở Thị Trấn Mây!',
    camPos: [0.8, 6.4, 8.8],
    lookAt: [0, 1.75, -5.0],
    annaPos: [0.4, 0.04, 1.8],
    annaRotY: 0.2,
    durationMs: 4200,
  },
];

interface OnboardingTourOverlayProps {
  stepIndex: number;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
  onStepChange: (nextIndex: number) => void;
  onFinish: () => void;
}

export const OnboardingTourOverlay: React.FC<OnboardingTourOverlayProps> = ({
  stepIndex,
  autoPlay,
  onToggleAutoPlay,
  onStepChange,
  onFinish,
}) => {
  const stop = GUIDED_TOUR_STOPS[Math.max(0, Math.min(GUIDED_TOUR_STOPS.length - 1, stepIndex))];
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= GUIDED_TOUR_STOPS.length - 1;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    if (!autoPlay) return;
    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const pct = Math.min(100, (elapsed / stop.durationMs) * 100);
      setProgress(pct);
      if (elapsed >= stop.durationMs) {
        window.clearInterval(intervalId);
        if (isLast) {
          onFinish();
        } else {
          onStepChange(stepIndex + 1);
        }
      }
    }, 50);
    return () => window.clearInterval(intervalId);
  }, [stepIndex, autoPlay, stop.durationMs, isLast, onFinish, onStepChange]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:bottom-5">
      <div className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-3xl border-2 border-amber-300/80 bg-[#1B1628]/92 text-white shadow-2xl backdrop-blur-md">
        {/* Auto fast-forward progress bar */}
        <div className="h-1.5 w-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#38BDF8] via-[#F472B6] to-[#FBBF24] transition-[width] duration-75"
            style={{width: `${autoPlay ? progress : ((stepIndex + 1) / GUIDED_TOUR_STOPS.length) * 100}%`}}
          />
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/60 bg-gradient-to-br from-[#F472B6] to-[#38BDF8] text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-lg bg-amber-300 px-2 py-0.5 text-[10px] font-black text-stone-900">
                    Anna · Hướng Dẫn Viên
                  </span>
                  <span className="text-[11px] font-extrabold text-sky-300">{stop.badge}</span>
                </div>
                <div className="mt-0.5 truncate text-sm font-black text-white">{stop.title}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onFinish();
              }}
              className="flex h-8 shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 text-[11px] font-bold text-white/85 hover:bg-white/20 active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
              <span>Bỏ qua</span>
            </button>
          </div>

          <p className="mt-2.5 text-xs font-semibold leading-relaxed text-white/95 sm:text-[13px]">
            “{stop.speakerLine}”
          </p>
          <div className="mt-1.5 text-[11px] font-bold text-amber-200">
            Mẹo: {stop.tip}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onToggleAutoPlay();
                }}
                className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-black transition active:scale-95 ${
                  autoPlay
                    ? 'border-sky-300/60 bg-sky-400/20 text-sky-200'
                    : 'border-white/15 bg-white/10 text-white/80'
                }`}
              >
                {autoPlay ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <FastForward className="h-3.5 w-3.5" />
                    <span>Đang tua nhanh</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Tự động tua</span>
                  </>
                )}
              </button>

              <div className="hidden items-center gap-1 px-1 sm:flex">
                {GUIDED_TOUR_STOPS.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Đi tới bước ${idx + 1}`}
                    onClick={() => {
                      soundFX.tap();
                      onStepChange(idx);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      idx === stepIndex ? 'w-5 bg-amber-300' : 'w-2 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => {
                  soundFX.tap();
                  if (!isFirst) onStepChange(stepIndex - 1);
                }}
                className="flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 text-[11px] font-bold text-white disabled:opacity-40 active:scale-95"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Trước</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.sparkle();
                  if (isLast) {
                    onFinish();
                  } else {
                    onStepChange(stepIndex + 1);
                  }
                }}
                className="flex h-9 items-center gap-1 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F472B6] px-3.5 text-xs font-black text-stone-950 shadow-md active:scale-95"
              >
                <span>{isLast ? 'Bắt đầu chơi!' : 'Tiếp theo'}</span>
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
