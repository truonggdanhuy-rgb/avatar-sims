import React, {useEffect, useState} from 'react';
import {
  Cloud,
  CloudDownload,
  CloudOff,
  CloudUpload,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import {getSupabaseConfig} from '../../config/supabase';
import {
  CloudSaveRecord,
  SupabaseAuthSession,
  downloadSaveFromSupabase,
  signInWithSupabase,
  signOutFromSupabase,
  signUpWithSupabase,
} from '../../utils/supabaseSync';
import {soundFX} from '../../utils/sound';

interface SupabaseCloudPanelProps {
  mode: 'account' | 'restore';
  session: SupabaseAuthSession | null;
  autoSyncEnabled: boolean;
  lastCloudSyncAt: string | null;
  onSessionChange: (session: SupabaseAuthSession | null) => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onUploadNow?: () => Promise<{ok: boolean; updatedAt?: string; message: string}>;
  onRestorePayload: (payload: Record<string, unknown>) => Promise<{ok: boolean; message: string}>;
}

function formatIsoClock(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} · ${dd}/${mo}`;
}

export const SupabaseCloudPanel: React.FC<SupabaseCloudPanelProps> = ({
  mode,
  session,
  autoSyncEnabled,
  lastCloudSyncAt,
  onSessionChange,
  onToggleAutoSync,
  onUploadNow,
  onRestorePayload,
}) => {
  const config = getSupabaseConfig();
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busyAction, setBusyAction] = useState<
    null | 'auth' | 'upload' | 'download' | 'restore'
  >(null);
  const [statusMsg, setStatusMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [cloudRecord, setCloudRecord] = useState<CloudSaveRecord | null>(null);
  const [confirmRestoreCloud, setConfirmRestoreCloud] = useState(false);

  const handleFetchCloud = async (activeSession: SupabaseAuthSession, silentIfEmpty = false) => {
    setBusyAction('download');
    setConfirmRestoreCloud(false);
    const res = await downloadSaveFromSupabase(activeSession);
    setBusyAction(null);
    if (!res.ok) {
      if (res.sessionExpired) {
        onSessionChange(null);
        setCloudRecord(null);
      }
      setStatusMsg({ok: false, text: res.message});
      return;
    }
    onSessionChange(res.session);
    setCloudRecord(res.record);
    if (res.record || !silentIfEmpty) {
      setStatusMsg({ok: Boolean(res.record), text: res.message});
    }
  };

  useEffect(() => {
    if (mode === 'restore' && session && !cloudRecord && busyAction === null) {
      void handleFetchCloud(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session?.userId]);

  if (!config.isConfigured) {
    return (
      <div className="rounded-2xl border border-[#DFCBB0] bg-white p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#4A3525]">
            <CloudOff className="h-4 w-4 text-[#A2743B]" />
            <span>Liên Kết Đám Mây · Supabase</span>
          </div>
          <span className="rounded-md bg-[#F7EBDC] px-2 py-0.5 text-[9px] font-black text-[#8B5E2A]">
            Chưa cấu hình
          </span>
        </div>
        <p className="text-[10px] font-semibold leading-relaxed text-[#7A6048]">
          Để bật lưu tài khoản trực tuyến qua Supabase, hãy thêm <code className="rounded bg-[#F5ECE0] px-1 py-0.5 font-mono text-[#4A3525]">VITE_SUPABASE_URL</code> và <code className="rounded bg-[#F5ECE0] px-1 py-0.5 font-mono text-[#4A3525]">VITE_SUPABASE_ANON_KEY</code> vào môi trường build (hoặc <code className="rounded bg-[#F5ECE0] px-1 py-0.5 font-mono text-[#4A3525]">src/config/supabase.ts</code>) và tạo bảng <code className="rounded bg-[#F5ECE0] px-1 py-0.5 font-mono text-[#4A3525]">avatar_sims_saves</code>.
        </p>
        <p className="text-[10px] font-semibold text-[#3E6E54]">
          Trong lúc chờ cấu hình, tính năng lưu trình duyệt và mã TTM1- vẫn hoạt động đầy đủ.
        </p>
      </div>
    );
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.tap();
    setStatusMsg(null);

    if (authTab === 'signup') {
      if (password !== confirmPassword) {
        setStatusMsg({ok: false, text: 'Mật khẩu xác nhận không khớp.'});
        return;
      }
      setBusyAction('auth');
      const res = await signUpWithSupabase(email, password);
      setBusyAction(null);
      if (!res.ok) {
        setStatusMsg({ok: false, text: res.message});
        return;
      }
      soundFX.sparkle();
      setStatusMsg({ok: true, text: res.message});
      if (res.session) {
        onSessionChange(res.session);
        setPassword('');
        setConfirmPassword('');
        if (mode === 'restore') {
          await handleFetchCloud(res.session);
        }
      }
      return;
    }

    setBusyAction('auth');
    const res = await signInWithSupabase(email, password);
    setBusyAction(null);
    if (!res.ok) {
      setStatusMsg({ok: false, text: res.message});
      return;
    }
    soundFX.sparkle();
    onSessionChange(res.session);
    setPassword('');
    setStatusMsg({ok: true, text: res.message});
    await handleFetchCloud(res.session, mode === 'account');
  };

  return (
    <div className="rounded-2xl border border-[#DFCBB0] bg-white p-3.5 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-[#4A3525]">
          <Cloud className="h-4 w-4 text-[#0E8A6D]" />
          <span>Liên Kết Đám Mây · Supabase</span>
        </div>
        {session ? (
          <span className="rounded-md bg-[#DCF5EC] px-2 py-0.5 text-[9px] font-black text-[#0E745B]">
            Đã kết nối
          </span>
        ) : (
          <span className="rounded-md bg-[#EEF4FB] px-2 py-0.5 text-[9px] font-black text-[#2F6296]">
            Sẵn sàng
          </span>
        )}
      </div>

      {!session ? (
        <form onSubmit={handleAuthSubmit} className="space-y-2">
          <p className="text-[10px] font-semibold leading-relaxed text-[#7A6048]">
            {mode === 'restore'
              ? 'Đăng nhập tài khoản Supabase đã liên kết để tải nhân vật và tiến trình cũ về máy này.'
              : 'Liên kết Email để lưu tiến trình Thị Trấn Mây lên Supabase và đồng bộ sang máy khác.'}
          </p>

          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F4EAD9] p-1">
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setAuthTab('login');
                setStatusMsg(null);
              }}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-extrabold transition-colors ${
                authTab === 'login'
                  ? 'bg-white text-[#4A3525] shadow-2xs'
                  : 'text-[#7A6048]'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setAuthTab('signup');
                setStatusMsg(null);
              }}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-extrabold transition-colors ${
                authTab === 'signup'
                  ? 'bg-white text-[#4A3525] shadow-2xs'
                  : 'text-[#7A6048]'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Đăng ký</span>
            </button>
          </div>

          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (statusMsg) setStatusMsg(null);
            }}
            placeholder="Email của bạn (vd: may@gmail.com)"
            className="w-full rounded-xl border border-[#DECBB0] bg-[#FAF4EA] px-3 py-2 text-xs font-semibold text-[#3B2A1A] placeholder:text-[#9D856B] focus:border-[#0E8A6D] focus:outline-none"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={authTab === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (statusMsg) setStatusMsg(null);
              }}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              className="w-full rounded-xl border border-[#DECBB0] bg-[#FAF4EA] py-2 pr-9 pl-3 text-xs font-semibold text-[#3B2A1A] placeholder:text-[#9D856B] focus:border-[#0E8A6D] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute inset-y-0 right-2 flex items-center text-[#7A6048]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {authTab === 'signup' && (
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (statusMsg) setStatusMsg(null);
              }}
              placeholder="Nhập lại mật khẩu"
              className="w-full rounded-xl border border-[#DECBB0] bg-[#FAF4EA] px-3 py-2 text-xs font-semibold text-[#3B2A1A] placeholder:text-[#9D856B] focus:border-[#0E8A6D] focus:outline-none"
            />
          )}

          <button
            type="submit"
            disabled={busyAction !== null}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0E8A6D] px-3 py-2.5 text-xs font-black text-white shadow-xs transition-transform active:scale-95 disabled:opacity-60"
          >
            {busyAction === 'auth' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : authTab === 'login' ? (
              <>
                <LogIn className="h-3.5 w-3.5" />
                <span>Đăng nhập Supabase</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                <span>Đăng ký & Liên kết</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#BCE5D7] bg-[#EFFAF6] px-2.5 py-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-black text-[#125F4B]">
                {session.email}
              </div>
              {lastCloudSyncAt && (
                <div className="text-[9px] font-bold text-[#2F7C67] tabular-nums">
                  Đồng bộ gần nhất: {formatIsoClock(lastCloudSyncAt)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                soundFX.tap();
                const current = session;
                onSessionChange(null);
                setCloudRecord(null);
                setStatusMsg(null);
                await signOutFromSupabase(current);
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-extrabold text-[#6F4E37] shadow-2xs active:scale-95"
            >
              <LogOut className="h-3 w-3" />
              <span>Đăng xuất</span>
            </button>
          </div>

          {mode === 'account' && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-[#E5D5BE] bg-[#FAF4EA] px-2.5 py-2">
                <div>
                  <div className="text-[11px] font-extrabold text-[#4A3525]">
                    Tự động đồng bộ Cloud
                  </div>
                  <div className="text-[9px] font-semibold text-[#7A6048]">
                    Tự đẩy bản lưu lên Supabase sau mỗi 15 giây có thay đổi
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onToggleAutoSync(!autoSyncEnabled);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition-colors ${
                    autoSyncEnabled
                      ? 'bg-[#0E8A6D] text-white'
                      : 'bg-[#E4D4BE] text-[#6F4E37]'
                  }`}
                >
                  {autoSyncEnabled ? 'Đang Bật' : 'Đang Tắt'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busyAction !== null || !onUploadNow}
                  onClick={async () => {
                    if (!onUploadNow) return;
                    soundFX.tap();
                    setConfirmRestoreCloud(false);
                    setBusyAction('upload');
                    const res = await onUploadNow();
                    setBusyAction(null);
                    setStatusMsg({ok: res.ok, text: res.message});
                    if (res.ok) {
                      soundFX.sparkle();
                      await handleFetchCloud(session, true);
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0E8A6D] px-2.5 py-2 text-[11px] font-black text-white shadow-xs active:scale-95 disabled:opacity-60"
                >
                  <CloudUpload
                    className={`h-3.5 w-3.5 ${busyAction === 'upload' ? 'animate-pulse' : ''}`}
                  />
                  <span>{busyAction === 'upload' ? 'Đang lưu...' : 'Lưu lên Cloud'}</span>
                </button>

                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => {
                    soundFX.tap();
                    void handleFetchCloud(session, false);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#2F6296] px-2.5 py-2 text-[11px] font-black text-white shadow-xs active:scale-95 disabled:opacity-60"
                >
                  <CloudDownload
                    className={`h-3.5 w-3.5 ${busyAction === 'download' ? 'animate-pulse' : ''}`}
                  />
                  <span>{busyAction === 'download' ? 'Đang tải...' : 'Xem bản Cloud'}</span>
                </button>
              </div>
            </>
          )}

          {mode === 'restore' && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => {
                soundFX.tap();
                void handleFetchCloud(session, false);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#C6D9EC] bg-[#EFF6FC] px-3 py-2 text-[11px] font-extrabold text-[#2F6296] active:scale-95 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${busyAction === 'download' ? 'animate-spin' : ''}`}
              />
              <span>Kiểm tra lại bản lưu trên Supabase</span>
            </button>
          )}

          {cloudRecord && (
            <div className="rounded-xl border border-[#C6E4D1] bg-[#F1FAF4] p-2.5 space-y-2 text-[10px] font-bold text-[#246341]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black">
                  {cloudRecord.preview.playerName} ({cloudRecord.preview.accountId})
                </span>
                <span className="rounded bg-[#D6F0DF] px-1.5 py-0.5 text-[9px] font-black text-[#1E623D] tabular-nums">
                  {formatIsoClock(cloudRecord.updatedAt)}
                </span>
              </div>
              <div className="text-[#3B7353] tabular-nums">
                {cloudRecord.preview.coins.toLocaleString('vi-VN')} Xu ·{' '}
                {cloudRecord.preview.coinGame} CG · {cloudRecord.preview.ownedItemCount} món đồ ·{' '}
                {cloudRecord.preview.petCount} thú cưng
              </div>

              {mode === 'account' && !confirmRestoreCloud ? (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setConfirmRestoreCloud(true);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2F6296] px-2.5 py-2 text-[11px] font-black text-white active:scale-95"
                >
                  <CloudDownload className="h-3.5 w-3.5" />
                  <span>Tải bản Cloud này về máy</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  {mode === 'account' && (
                    <div className="text-[10px] font-bold text-[#A8382B]">
                      Dữ liệu hiện tại trên trình duyệt sẽ được thay thế bằng bản lưu Cloud này.
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {mode === 'account' && (
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreCloud(false)}
                        className="flex-1 rounded-lg bg-white px-2.5 py-2 text-[11px] font-extrabold text-[#5B422E]"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={async () => {
                        soundFX.tap();
                        setBusyAction('restore');
                        const res = await onRestorePayload(cloudRecord.saveJson);
                        setBusyAction(null);
                        setStatusMsg({ok: res.ok, text: res.message});
                        if (res.ok) soundFX.sparkle();
                      }}
                      className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg bg-[#2F6296] px-2.5 py-2 text-[11px] font-black text-white active:scale-95 disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${busyAction === 'restore' ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {busyAction === 'restore'
                          ? 'Đang khôi phục...'
                          : mode === 'restore'
                            ? 'Khôi Phục & Vào Thị Trấn Mây'
                            : 'Xác nhận tải về máy'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {statusMsg && (
        <p
          className={`rounded-xl px-2.5 py-2 text-[11px] font-semibold leading-relaxed ${
            statusMsg.ok
              ? 'bg-[#EAF8EE] text-[#2A6E40]'
              : 'bg-[#FDF0ED] text-[#A8382B]'
          }`}
        >
          {statusMsg.text}
        </p>
      )}
    </div>
  );
};
