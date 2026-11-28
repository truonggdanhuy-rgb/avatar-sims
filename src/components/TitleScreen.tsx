import React, {useMemo, useState} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import titleSkyTownHero from '../assets/images/title_sky_town_hero_1795845459213.jpg';
import {getSupabaseConfig} from '../config/supabase';
import {DEFAULT_AVATAR} from '../data/avatarCatalog';
import {AvatarConfig} from '../types/game';
import {soundFX} from '../utils/sound';
import {
  RememberedAccount,
  clearRememberedAccount,
  loginAccount,
  registerAccount,
} from '../utils/supabaseSync';
import {AvatarPreview3D} from './AvatarPreview3D';

interface TitleScreenProps {
  rememberedAccount: RememberedAccount | null;
  isLoadingAccount: boolean;
  enteringError: string | null;
  isEnteringTown: boolean;
  onAccountChanged: (account: RememberedAccount | null) => void;
  onEnterTown: (account: RememberedAccount) => Promise<void>;
  onStartCharacterCreation: (account: RememberedAccount) => void;
}

function extractAvatarForPreview(account: RememberedAccount | null): AvatarConfig | null {
  if (!account || !account.hasCharacter || !account.saveJson) return null;
  const raw = account.saveJson.avatar;
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...DEFAULT_AVATAR,
    ...(raw as Partial<AvatarConfig>),
    name:
      typeof (raw as Partial<AvatarConfig>).name === 'string' &&
      (raw as Partial<AvatarConfig>).name!.trim()
        ? (raw as Partial<AvatarConfig>).name!.trim()
        : account.playerName,
  };
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  rememberedAccount,
  isLoadingAccount,
  enteringError,
  isEnteringTown,
  onAccountChanged,
  onEnterTown,
  onStartCharacterCreation,
}) => {
  const supabaseConfigured = getSupabaseConfig().isConfigured;
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const previewAvatar = useMemo(
    () => extractAvatarForPreview(rememberedAccount),
    [rememberedAccount],
  );

  const showingRememberedCard = Boolean(rememberedAccount) && !showAuthForm;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.tap();
    setAuthError(null);

    if (authTab === 'register') {
      if (password !== confirmPassword) {
        setAuthError('Mật khẩu nhập lại không khớp.');
        return;
      }
      setAuthBusy(true);
      const res = await registerAccount(username, password);
      setAuthBusy(false);
      if (!res.ok) {
        setAuthError(res.message);
        return;
      }
      soundFX.sparkle();
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setShowAuthForm(false);
      onAccountChanged(res.account);
      // Brand new player goes directly to character creation
      onStartCharacterCreation(res.account);
      return;
    }

    setAuthBusy(true);
    const res = await loginAccount(username, password);
    setAuthBusy(false);
    if (!res.ok) {
      setAuthError(res.message);
      return;
    }
    soundFX.sparkle();
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowAuthForm(false);
    onAccountChanged(res.account);
    if (!res.account.hasCharacter) {
      onStartCharacterCreation(res.account);
    }
  };

  return (
    <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-gradient-to-br from-[#64B5F6] via-[#BEE6FD] to-[#FFF3D1] select-none">
      {/* Bespoke Sky Island Key Art Backdrop */}
      {!imgFailed && (
        <img
          src={titleSkyTownHero}
          alt="Thị Trấn Mây - Đảo bay trên bầu trời"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right transition-opacity duration-500"
        />
      )}

      {/* Subtle atmospheric cloud & sunlit scrims for crisp left-side legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0E2236]/82 via-[#15314B]/48 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1B2B]/45 via-transparent to-[#0E2236]/20" />

      {/* Gentle drifting sunlit clouds */}
      <div className="anim-cloud pointer-events-none absolute top-6 left-[38%] h-14 w-44 rounded-full bg-white/15 blur-xl" />
      <div className="anim-cloud pointer-events-none absolute bottom-10 right-[18%] h-16 w-56 rounded-full bg-amber-100/20 blur-2xl" />

      {/* Main Content Layout (compact-friendly for mobile landscape & expansive on desktop) */}
      <div className="custom-scroll relative z-10 flex h-full w-full items-center overflow-y-auto px-5 py-4 sm:px-10 lg:px-16">
        <div className="flex w-full max-w-6xl items-center justify-between gap-6">
          {/* Left Column: Title Brand & Account Card */}
          <div className="w-full max-w-[430px] space-y-3 sm:space-y-4">
            {/* Editorial Kicker + Hero Title */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold tracking-[0.16em] text-amber-200 uppercase sm:text-xs">
                Cuộc Sống Thanh Bình Trên Mây
              </p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-5xl">
                Thị Trấn Mây
              </h1>
              <p className="hidden text-xs font-medium leading-relaxed text-sky-100/90 sm:block sm:text-sm">
                Xây nhà, trồng trọt, câu cá bờ hồ và chinh phục đường đua 3D cùng nhân vật của riêng bạn.
              </p>
            </div>

            {/* Interactive Card */}
            <div className="rounded-3xl border border-white/70 bg-[#FFFBF4]/95 p-4 text-[#3A2818] shadow-2xl backdrop-blur-md sm:p-5">
              {!supabaseConfigured ? (
                <div className="space-y-2 text-xs font-semibold text-[#7A5638]">
                  <div className="font-display text-sm font-bold text-[#3A2818]">
                    Chưa kết nối máy chủ Supabase
                  </div>
                  <p className="leading-relaxed">
                    Vui lòng cấu hình <code className="rounded bg-[#EFE2CE] px-1 py-0.5 font-mono">VITE_SUPABASE_URL</code> và <code className="rounded bg-[#EFE2CE] px-1 py-0.5 font-mono">VITE_SUPABASE_ANON_KEY</code> để sử dụng tài khoản trực tuyến.
                  </p>
                </div>
              ) : isLoadingAccount ? (
                <div className="flex items-center justify-center gap-2.5 py-6 text-xs font-bold text-[#6F4E37]">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#0E8A6D]" />
                  <span>Đang kiểm tra tài khoản đã ghi nhớ...</span>
                </div>
              ) : showingRememberedCard && rememberedAccount ? (
                <div className="space-y-3">
                  {/* Remembered Profile Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#DFCBB0] bg-[#EFE3D0] sm:h-20 sm:w-16">
                      {previewAvatar ? (
                        <AvatarPreview3D
                          avatar={previewAvatar}
                          showInspectorControls={false}
                          portraitFraming
                          className="pointer-events-none h-full w-full"
                        />
                      ) : (
                        <KeyRound className="h-6 w-6 text-[#8A6240]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="truncate font-display text-base font-extrabold text-[#2E1E12] sm:text-lg">
                        {rememberedAccount.hasCharacter
                          ? rememberedAccount.playerName
                          : rememberedAccount.displayUsername}
                      </div>
                      <div className="truncate text-xs font-bold text-[#0E7A60]">
                        @{rememberedAccount.displayUsername}
                      </div>
                      <div className="text-[11px] font-semibold text-[#7A6048] tabular-nums">
                        {rememberedAccount.hasCharacter ? (
                          <>
                            <span>{rememberedAccount.coins.toLocaleString('vi-VN')} Xu</span>
                            <span aria-hidden="true"> · </span>
                            <span>{rememberedAccount.coinGame.toLocaleString('vi-VN')} CoinGame</span>
                          </>
                        ) : (
                          <span>Tài khoản mới · Chưa tạo nhân vật</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {enteringError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{enteringError}</span>
                    </div>
                  )}

                  {/* Primary Action: Vào Thị Trấn */}
                  <button
                    type="button"
                    disabled={isEnteringTown}
                    onClick={() => {
                      soundFX.tap();
                      void onEnterTown(rememberedAccount);
                    }}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#0E8A6D] px-5 py-2.5 font-display text-sm font-extrabold text-white shadow-lg transition-transform hover:bg-[#0C785F] active:scale-[0.98] disabled:opacity-60 sm:py-3 sm:text-base"
                  >
                    {isEnteringTown ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Đang kết nối máy chủ...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {rememberedAccount.hasCharacter
                            ? 'Vào Thị Trấn'
                            : 'Tạo Nhân Vật & Vào Thị Trấn'}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Secondary Actions: Đổi tài khoản / Quên máy này */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      disabled={isEnteringTown}
                      onClick={() => {
                        soundFX.tap();
                        setAuthError(null);
                        setAuthTab('login');
                        setShowAuthForm(true);
                      }}
                      className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#DFCBB0] bg-[#F7EFE2] px-3 py-2 text-xs font-bold text-[#4A3525] transition-colors hover:bg-[#EFE2CE] active:scale-[0.98]"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Đổi tài khoản</span>
                    </button>

                    <button
                      type="button"
                      disabled={isEnteringTown}
                      onClick={async () => {
                        soundFX.tap();
                        await clearRememberedAccount();
                        onAccountChanged(null);
                      }}
                      title="Gỡ tài khoản đã nhớ khỏi thiết bị này"
                      className="flex min-h-[40px] items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-2 text-[11px] font-semibold text-[#8A6D53] transition-colors hover:bg-[#F3E8D8] hover:text-[#5B422E]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Gỡ nhớ</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-[#EFE4D3] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setAuthTab('register');
                          setAuthError(null);
                        }}
                        className={`flex min-h-[34px] items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
                          authTab === 'register'
                            ? 'bg-white text-[#3A2818] shadow-2xs'
                            : 'text-[#7A6048]'
                        }`}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Tạo tài khoản</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setAuthTab('login');
                          setAuthError(null);
                        }}
                        className={`flex min-h-[34px] items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
                          authTab === 'login'
                            ? 'bg-white text-[#3A2818] shadow-2xs'
                            : 'text-[#7A6048]'
                        }`}
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        <span>Đăng nhập</span>
                      </button>
                    </div>

                    {rememberedAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setShowAuthForm(false);
                          setAuthError(null);
                        }}
                        className="flex min-h-[36px] items-center gap-1 whitespace-nowrap rounded-xl border border-[#DFCBB0] bg-white px-2.5 py-1 text-xs font-bold text-[#5B422E]"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Quay lại</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      autoComplete="username"
                      maxLength={20}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Tên tài khoản (vd: huy_2003)"
                      className="h-10 w-full rounded-xl border border-[#DECBB0] bg-white px-3 text-xs font-semibold text-[#3A2818] placeholder:text-[#9D856B] focus:border-[#0E8A6D] focus:outline-none sm:text-sm"
                    />

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={authTab === 'login' ? 'current-password' : 'new-password'}
                        maxLength={64}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                        placeholder="Mật khẩu (tối thiểu 4 ký tự)"
                        className="h-10 w-full rounded-xl border border-[#DECBB0] bg-white py-2 pr-10 pl-3 text-xs font-semibold text-[#3A2818] placeholder:text-[#9D856B] focus:border-[#0E8A6D] focus:outline-none sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        className="absolute inset-y-0 right-2.5 flex items-center text-[#7A6048]"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {authTab === 'register' && (
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        maxLength={64}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                        placeholder="Nhập lại mật khẩu"
                        className="h-10 w-full rounded-xl border border-[#DECBB0] bg-white px-3 text-xs font-semibold text-[#3A2818] placeholder:text-[#9D856B] focus:border-[#0E8A6D] focus:outline-none sm:text-sm"
                      />
                    )}
                  </div>

                  {authTab === 'register' && (
                    <p className="text-[11px] font-semibold leading-snug text-[#8C5A24]">
                      Lưu ý: Tài khoản không liên kết email. Nếu quên mật khẩu sẽ mất tài khoản và không thể khôi phục.
                    </p>
                  )}

                  {authError && (
                    <div className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-800">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#0E8A6D] px-4 py-2.5 font-display text-sm font-extrabold text-white shadow-md transition-transform hover:bg-[#0C785F] active:scale-[0.98] disabled:opacity-60"
                  >
                    {authBusy ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : authTab === 'register' ? (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Tạo Tài Khoản & Tạo Nhân Vật</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        <span>Đăng Nhập Tài Khoản</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="hidden items-center gap-2 text-xs font-medium text-white/80 sm:flex">
              <span>Lưu tự động theo tài khoản</span>
              <span aria-hidden="true">·</span>
              <span>Chơi trên nhiều thiết bị</span>
            </div>
          </div>

          {/* Right side kept open so the floating sky-island artwork stays the visual focal point */}
          <div className="hidden flex-1 lg:block" />
        </div>
      </div>
    </div>
  );
};
