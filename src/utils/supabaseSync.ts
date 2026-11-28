import {getSupabaseConfig} from '../config/supabase';
import {
  AccountSavePreview,
  encodeAccountTransferCode,
  extractSavePreview,
} from './accountSave';

export interface SupabaseAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix epoch ms
  userId: string;
  email: string;
}

export interface CloudSaveRecord {
  userId: string;
  email: string;
  accountId: string;
  playerName: string;
  coins: number;
  coinGame: number;
  saveCode: string;
  saveJson: Record<string, unknown>;
  updatedAt: string;
  preview: AccountSavePreview;
}

const REQUEST_TIMEOUT_MS = 12000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateSupabaseError(rawMessage: string, status?: number): string {
  const msg = rawMessage.toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư đến hoặc tắt "Confirm email" trong Supabase Auth.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Email này đã được đăng ký rồi. Hãy chuyển sang tab Đăng nhập.';
  }
  if (msg.includes('password should be at least')) {
    return 'Mật khẩu cần tối thiểu 6 ký tự.';
  }
  if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
    return 'Địa chỉ email không hợp lệ.';
  }
  if (msg.includes('rate limit') || status === 429) {
    return 'Bạn thao tác hơi nhanh. Vui lòng đợi vài giây rồi thử lại.';
  }
  if (msg.includes('relation') && msg.includes('avatar_sims_saves') && msg.includes('does not exist')) {
    return 'Chưa tạo bảng "avatar_sims_saves" trong Supabase SQL Editor. Hãy chạy đoạn SQL hướng dẫn trước.';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied') || status === 403) {
    return 'Phiên đăng nhập hết hạn hoặc chưa bật quyền RLS cho bảng avatar_sims_saves.';
  }
  if (status === 401 || msg.includes('jwt expired') || msg.includes('invalid jwt')) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('aborted')) {
    return 'Không kết nối được tới Supabase. Hãy kiểm tra mạng hoặc URL Supabase.';
  }
  return rawMessage || 'Đã có lỗi xảy ra khi kết nối Supabase.';
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<{ok: boolean; status: number; data: unknown}> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {...init, signal: controller.signal});
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = {message: text};
      }
    }
    return {ok: res.ok, status: res.status, data};
  } finally {
    window.clearTimeout(timer);
  }
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  for (const key of ['msg', 'message', 'error_description', 'error', 'hint']) {
    if (typeof obj[key] === 'string' && obj[key].trim()) {
      return obj[key].trim();
    }
  }
  return '';
}

function parseSessionResponse(
  data: unknown,
  fallbackEmail: string,
): SupabaseAuthSession | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const accessToken = typeof obj.access_token === 'string' ? obj.access_token : '';
  const refreshToken = typeof obj.refresh_token === 'string' ? obj.refresh_token : '';
  const expiresIn =
    typeof obj.expires_in === 'number' && obj.expires_in > 0 ? obj.expires_in : 3600;
  const userObj =
    obj.user && typeof obj.user === 'object'
      ? (obj.user as Record<string, unknown>)
      : null;
  const userId = userObj && typeof userObj.id === 'string' ? userObj.id : '';
  const email =
    userObj && typeof userObj.email === 'string' ? userObj.email : fallbackEmail;

  if (!accessToken || !userId || !UUID_RE.test(userId)) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userId,
    email,
  };
}

export async function signUpWithSupabase(
  rawEmail: string,
  password: string,
): Promise<
  | {ok: true; session: SupabaseAuthSession | null; needsEmailConfirm: boolean; message: string}
  | {ok: false; message: string}
> {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    return {ok: false, message: 'Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'};
  }

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return {ok: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.'};
  }
  if (password.length < 6) {
    return {ok: false, message: 'Mật khẩu cần tối thiểu 6 ký tự.'};
  }

  try {
    const res = await fetchWithTimeout(`${cfg.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({email, password}),
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateSupabaseError(extractErrorMessage(res.data), res.status),
      };
    }

    const session = parseSessionResponse(res.data, email);
    if (!session) {
      return {
        ok: true,
        session: null,
        needsEmailConfirm: true,
        message:
          'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản rồi đăng nhập lại.',
      };
    }

    return {
      ok: true,
      session,
      needsEmailConfirm: false,
      message: `Đã tạo tài khoản và liên kết với ${session.email}!`,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Network error';
    return {ok: false, message: translateSupabaseError(raw)};
  }
}

export async function signInWithSupabase(
  rawEmail: string,
  password: string,
): Promise<{ok: true; session: SupabaseAuthSession; message: string} | {ok: false; message: string}> {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    return {ok: false, message: 'Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'};
  }

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return {ok: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.'};
  }
  if (!password) {
    return {ok: false, message: 'Vui lòng nhập mật khẩu.'};
  }

  try {
    const res = await fetchWithTimeout(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({email, password}),
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateSupabaseError(extractErrorMessage(res.data), res.status),
      };
    }

    const session = parseSessionResponse(res.data, email);
    if (!session) {
      return {ok: false, message: 'Phản hồi đăng nhập không hợp lệ từ Supabase.'};
    }

    return {
      ok: true,
      session,
      message: `Đăng nhập thành công (${session.email})!`,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Network error';
    return {ok: false, message: translateSupabaseError(raw)};
  }
}

export async function refreshSupabaseSession(
  session: SupabaseAuthSession,
): Promise<SupabaseAuthSession | null> {
  if (session.expiresAt - Date.now() > 60_000) {
    return session;
  }
  if (!session.refreshToken) return null;

  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return null;

  try {
    const res = await fetchWithTimeout(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({refresh_token: session.refreshToken}),
    });
    if (!res.ok) return null;
    return parseSessionResponse(res.data, session.email);
  } catch {
    return null;
  }
}

export async function signOutFromSupabase(session: SupabaseAuthSession | null): Promise<void> {
  if (!session) return;
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return;

  try {
    await fetchWithTimeout(`${cfg.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
  } catch {
    // ignore logout network errors; caller clears in-memory session regardless
  }
}

export async function uploadSaveToSupabase(
  session: SupabaseAuthSession,
  payload: Record<string, unknown>,
): Promise<
  | {ok: true; session: SupabaseAuthSession; updatedAt: string; message: string}
  | {ok: false; sessionExpired?: boolean; message: string}
> {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    return {ok: false, message: 'Chưa cấu hình kết nối Supabase.'};
  }

  const activeSession = await refreshSupabaseSession(session);
  if (!activeSession) {
    return {
      ok: false,
      sessionExpired: true,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }

  const preview = extractSavePreview(payload);
  const saveCode = await encodeAccountTransferCode(payload);
  const updatedAt = new Date().toISOString();

  const row = {
    user_id: activeSession.userId,
    email: activeSession.email,
    account_id: preview.accountId,
    player_name: preview.playerName,
    coins: preview.coins,
    coin_game: preview.coinGame,
    save_code: saveCode,
    save_json: payload,
    updated_at: updatedAt,
  };

  try {
    const res = await fetchWithTimeout(`${cfg.url}/rest/v1/avatar_sims_saves?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${activeSession.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      return {
        ok: false,
        sessionExpired: res.status === 401,
        message: translateSupabaseError(extractErrorMessage(res.data), res.status),
      };
    }

    return {
      ok: true,
      session: activeSession,
      updatedAt,
      message: `Đã lưu tiến trình "${preview.playerName}" lên Supabase thành công!`,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Network error';
    return {ok: false, message: translateSupabaseError(raw)};
  }
}

export async function downloadSaveFromSupabase(
  session: SupabaseAuthSession,
): Promise<
  | {ok: true; session: SupabaseAuthSession; record: CloudSaveRecord | null; message: string}
  | {ok: false; sessionExpired?: boolean; message: string}
> {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    return {ok: false, message: 'Chưa cấu hình kết nối Supabase.'};
  }

  const activeSession = await refreshSupabaseSession(session);
  if (!activeSession || !UUID_RE.test(activeSession.userId)) {
    return {
      ok: false,
      sessionExpired: true,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }

  const query = `user_id=eq.${encodeURIComponent(activeSession.userId)}&select=user_id,email,account_id,player_name,coins,coin_game,save_code,save_json,updated_at&limit=1`;

  try {
    const res = await fetchWithTimeout(`${cfg.url}/rest/v1/avatar_sims_saves?${query}`, {
      method: 'GET',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${activeSession.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        sessionExpired: res.status === 401,
        message: translateSupabaseError(extractErrorMessage(res.data), res.status),
      };
    }

    if (!Array.isArray(res.data) || res.data.length === 0) {
      return {
        ok: true,
        session: activeSession,
        record: null,
        message: 'Tài khoản này chưa có bản lưu nào trên Supabase. Hãy bấm "Lưu lên Supabase" trước.',
      };
    }

    const raw = res.data[0] as Record<string, unknown>;
    const saveJson =
      raw.save_json && typeof raw.save_json === 'object' && !Array.isArray(raw.save_json)
        ? (raw.save_json as Record<string, unknown>)
        : null;

    if (!saveJson || !saveJson.avatar || typeof saveJson.avatar !== 'object') {
      return {
        ok: false,
        message: 'Bản lưu trên Supabase bị thiếu dữ liệu nhân vật.',
      };
    }

    const preview = extractSavePreview(saveJson);
    const record: CloudSaveRecord = {
      userId: typeof raw.user_id === 'string' ? raw.user_id : activeSession.userId,
      email: typeof raw.email === 'string' ? raw.email : activeSession.email,
      accountId: typeof raw.account_id === 'string' ? raw.account_id : preview.accountId,
      playerName: typeof raw.player_name === 'string' ? raw.player_name : preview.playerName,
      coins: typeof raw.coins === 'number' ? raw.coins : preview.coins,
      coinGame: typeof raw.coin_game === 'number' ? raw.coin_game : preview.coinGame,
      saveCode: typeof raw.save_code === 'string' ? raw.save_code : '',
      saveJson,
      updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : new Date().toISOString(),
      preview,
    };

    return {
      ok: true,
      session: activeSession,
      record,
      message: `Tìm thấy bản lưu của "${record.playerName}" trên Supabase!`,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Network error';
    return {ok: false, message: translateSupabaseError(raw)};
  }
}
