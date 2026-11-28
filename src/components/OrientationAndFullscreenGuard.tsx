import React, {useEffect, useState} from 'react';
import {Maximize2, RotateCw, Smartphone} from 'lucide-react';

function detectNonDesktopTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk/i.test(ua);
  const isIpadDesktopMode = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  const hasTouch = navigator.maxTouchPoints > 0;
  const isCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return (isMobileUa || isIpadDesktopMode) && (hasTouch || isCoarsePointer);
}

async function enterFullscreenAndLandscape(): Promise<void> {
  if (typeof document === 'undefined') return;
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const docAny = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  const isAlreadyFullscreen = Boolean(
    document.fullscreenElement || docAny.webkitFullscreenElement,
  );

  if (!isAlreadyFullscreen) {
    try {
      if (typeof docEl.requestFullscreen === 'function') {
        await docEl.requestFullscreen();
      } else if (typeof docEl.webkitRequestFullscreen === 'function') {
        await docEl.webkitRequestFullscreen();
      }
    } catch {
      // Browsers like iOS Safari restrict programmatic fullscreen in tabs
    }
  }

  try {
    const orientationApi = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (orientationApi && typeof orientationApi.lock === 'function') {
      await orientationApi.lock('landscape');
    }
  } catch {
    // Ignore when orientation lock is unsupported outside standalone/fullscreen
  }
}

export const OrientationAndFullscreenGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < window.innerHeight;
  });
  const [isNonDesktop] = useState<boolean>(() => detectNonDesktopTouchDevice());

  useEffect(() => {
    const updateOrientation = () => {
      setIsPortrait(window.innerWidth < window.innerHeight);
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Auto-enter fullscreen on touch for all non-PC devices (phones / tablets)
  useEffect(() => {
    if (!isNonDesktop) return;
    let lastAttemptAt = 0;

    const handleFirstOrSubseqTouch = () => {
      const now = Date.now();
      if (now - lastAttemptAt < 1200) return;
      lastAttemptAt = now;
      void enterFullscreenAndLandscape();
    };

    document.addEventListener('pointerdown', handleFirstOrSubseqTouch, {
      capture: true,
      passive: true,
    });
    document.addEventListener('touchend', handleFirstOrSubseqTouch, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener('pointerdown', handleFirstOrSubseqTouch, {capture: true});
      document.removeEventListener('touchend', handleFirstOrSubseqTouch, {capture: true});
    };
  }, [isNonDesktop]);

  if (!isPortrait) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#182230]/96 px-6 text-center text-white backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Yêu cầu xoay ngang màn hình"
    >
      <div className="max-w-sm space-y-5">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-xl">
          <div className="relative flex items-center justify-center">
            <Smartphone className="h-12 w-12 -rotate-90 text-amber-300 transition-transform duration-700" />
            <RotateCw className="absolute -top-2 -right-2 h-6 w-6 animate-spin text-sky-300" style={{animationDuration: '3.2s'}} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">
            Vui Lòng Xoay Ngang Màn Hình
          </h2>
          <p className="text-sm font-medium leading-relaxed text-slate-300">
            Thị Trấn Mây hoạt động ở chế độ <span className="font-bold text-amber-300">màn hình ngang</span>. Hãy xoay ngang thiết bị (hoặc mở rộng khung hình ngang) để tiếp tục thao tác.
          </p>
        </div>

        {isNonDesktop && (
          <button
            type="button"
            onClick={() => {
              void enterFullscreenAndLandscape();
            }}
            className="mx-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Chạm Để Toàn Màn Hình Ngang</span>
          </button>
        )}
      </div>
    </div>
  );
};
