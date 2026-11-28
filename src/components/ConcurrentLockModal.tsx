import React, {useState} from 'react';
import {AlertTriangle, LogOut, RefreshCw, ShieldAlert} from 'lucide-react';
import {soundFX} from '../utils/sound';

interface ConcurrentLockModalProps {
  username: string;
  message?: string;
  onRetryClaim: () => Promise<{ok: boolean; message?: string}>;
  onSwitchAccount: () => Promise<void> | void;
}

export const ConcurrentLockModal: React.FC<ConcurrentLockModalProps> = ({
  username,
  message,
  onRetryClaim,
  onSwitchAccount,
}) => {
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(message ?? null);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Cảnh báo đăng nhập đồng thời"
    >
      <div className="anim-pop w-full max-w-lg rounded-3xl border border-rose-300/35 bg-[#1B2432] p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
              Có Người Đang Đăng Nhập Tài Khoản Này
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-300">
              Tài khoản <span className="font-bold text-amber-300">@{username}</span> đang được chơi cùng lúc trên thiết bị khác. Cả 2 máy đều tạm khóa để bảo vệ tiến trình không bị mất dữ liệu.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            {feedback ||
              'Hãy tắt game ở một thiết bị, đợi khoảng 15 giây rồi bấm "Thử Vào Lại" trên máy bạn muốn tiếp tục chơi.'}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={checking}
            onClick={async () => {
              soundFX.tap();
              setChecking(true);
              const res = await onRetryClaim();
              setChecking(false);
              if (!res.ok) {
                setFeedback(
                  res.message ||
                    'Thiết bị kia vẫn đang kết nối hoặc đang trong thời gian chờ 15 giây. Vui lòng thử lại sau ít giây.',
                );
              } else {
                soundFX.sparkle();
              }
            }}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Đang kiểm tra...' : 'Thử Vào Lại'}</span>
          </button>

          <button
            type="button"
            disabled={checking}
            onClick={() => {
              soundFX.tap();
              void onSwitchAccount();
            }}
            className="flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-slate-100 transition-colors hover:bg-white/15 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            <span>Đổi Tài Khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};
