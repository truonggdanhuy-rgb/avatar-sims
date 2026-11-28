import {getSupabaseConfig} from '../config/supabase';

export interface RememberedAccount {
  username: string;
  displayUsername: string;
  deviceId: string;
  deviceToken: string;
  accountId: string;
  playerName: string;
  coins: number;
  coinGame: number;
  hasCharacter: boolean;
  saveJson: Record<string, unknown> | null;
  updatedAt: string | null;
}

export type RpcActionResult<T = unknown> =
  | (T extends Record<string, unknown> ? {ok: true} & T : {ok: true})
  | {
      ok: false;
      code?: string;
      isConflict?: boolean;
      isAuthError?: boolean;
      message: string;
    };

const REQUEST_TIMEOUT_MS = 12000;
const IDB_NAME = 'thi_tran_may_account_db';
const IDB_STORE = 'kv';
const IDB_REMEMBERED_KEY = 'remembered_account_v2';
const IDB_DEVICE_ID_KEY = 'device_id_v2';
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function createRandomId(byteLen = 16): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(byteLen);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

// Unique per open browser tab/session (kept purely in JS memory)
const TAB_SESSION_ID = `sess_${createRandomId(12)}`;

let memoryDeviceId: string | null = null;
let memoryRemembered: RememberedAccount | null | undefined = undefined;

function openAuthDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openAuthDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openAuthDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openAuthDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (memoryDeviceId) return memoryDeviceId;
  const saved = await idbGet<string>(IDB_DEVICE_ID_KEY);
  if (typeof saved === 'string' && saved.trim().length >= 8) {
    memoryDeviceId = saved.trim();
    return memoryDeviceId;
  }
  const fresh = `dev_${createRandomId(16)}`;
  memoryDeviceId = fresh;
  await idbSet(IDB_DEVICE_ID_KEY, fresh);
  return fresh;
}

export function getTabSessionId(): string {
  return TAB_SESSION_ID;
}

export async function loadRememberedAccount(): Promise<RememberedAccount | null> {
  if (memoryRemembered !== undefined) return memoryRemembered;
  const stored = await idbGet<RememberedAccount>(IDB_REMEMBERED_KEY);
  if (
    stored &&
    typeof stored === 'object' &&
    typeof stored.username === 'string' &&
    typeof stored.deviceId === 'string' &&
    typeof stored.deviceToken === 'string'
  ) {
    memoryRemembered = stored;
    return stored;
  }
  memoryRemembered = null;
  return null;
}

export async function saveRememberedAccount(account: RememberedAccount): Promise<void> {
  memoryRemembered = account;
  await idbSet(IDB_REMEMBERED_KEY, account);
}

export async function clearRememberedAccount(): Promise<void> {
  memoryRemembered = null;
  await idbDelete(IDB_REMEMBERED_KEY);
}

function translateRpcError(rawMessage: string, status?: number, code?: string): string {
  const lower = rawMessage.toLowerCase();
  if (code === 'USERNAME_TAKEN') {
    return 'Tên tài khoản này đã có người sử dụng. Hãy chọn tên khác.';
  }
  if (code === 'INVALID_CREDENTIALS') {
    return 'Tên tài khoản hoặc mật khẩu chưa đúng.';
  }
  if (code === 'CONCURRENT_LOGIN') {
    return 'Tài khoản này đang có người đăng nhập chơi cùng lúc trên thiết bị khác!';
  }
  if (code === 'AUTH_INVALID') {
    return 'Phiên thiết bị đã hết hiệu lực. Vui lòng đăng nhập lại bằng mật khẩu.';
  }
  if (
    lower.includes('could not find the function') ||
    lower.includes('pgrst202') ||
    (lower.includes('function') && lower.includes('does not exist'))
  ) {
    return 'Máy chủ Supabase chưa chạy đoạn SQL tài khoản mới (ttm_*). Hãy chạy SQL mới trong Supabase SQL Editor.';
  }
  if (status === 429) {
    return 'Thao tác hơi nhanh, vui lòng đợi vài giây rồi thử lại.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('aborted')) {
    return 'Không kết nối được tới máy chủ Supabase. Hãy kiểm tra mạng của bạn.';
  }
  return rawMessage || 'Có lỗi xảy ra khi kết nối máy chủ.';
}

async function callSupabaseRpc(
  fnName: string,
  params: Record<string, unknown>,
  keepalive = false,
): Promise<{ok: boolean; status: number; data: unknown}> {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    return {
      ok: false,
      status: 0,
      data: {message: 'Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'},
    };
  }

  const controller = new AbortController();
  const timer = keepalive
    ? null
    : window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${encodeURIComponent(fnName)}`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(params),
      keepalive,
      signal: keepalive ? undefined : controller.signal,
    });
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
    if (timer !== null) window.clearTimeout(timer);
  }
}

function extractRpcFailureMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  for (const k of ['message', 'msg', 'details', 'hint', 'error']) {
    if (typeof obj[k] === 'string' && obj[k].trim()) {
      return obj[k].trim();
    }
  }
  return '';
}

function normalizeUsernameInput(raw: string): string {
  return raw.trim();
}

export function validateUsernameAndPassword(
  rawUsername: string,
  password: string,
): string | null {
  const username = normalizeUsernameInput(rawUsername);
  if (!USERNAME_RE.test(username)) {
    return 'Tên tài khoản chỉ gồm 3–20 ký tự chữ không dấu, số hoặc dấu gạch dưới (_).';
  }
  if (password.length < 4 || password.length > 64) {
    return 'Mật khẩu cần từ 4 đến 64 ký tự.';
  }
  return null;
}

export async function registerAccount(
  rawUsername: string,
  password: string,
): Promise<RpcActionResult<{account: RememberedAccount}>> {
  const validationErr = validateUsernameAndPassword(rawUsername, password);
  if (validationErr) {
    return {ok: false, message: validationErr};
  }

  const cleanUsername = normalizeUsernameInput(rawUsername);
  const deviceId = await getOrCreateDeviceId();

  try {
    const res = await callSupabaseRpc('ttm_register_account', {
      p_username: cleanUsername,
      p_password: password,
      p_device_id: deviceId,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateRpcError(extractRpcFailureMessage(res.data), res.status),
      };
    }

    const body = res.data as Record<string, unknown> | null;
    if (!body || body.ok !== true) {
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return {
        ok: false,
        code,
        message: translateRpcError(
          typeof body?.message === 'string' ? body.message : '',
          res.status,
          code,
        ),
      };
    }

    const account: RememberedAccount = {
      username: String(body.username),
      displayUsername: String(body.displayUsername ?? cleanUsername),
      deviceId,
      deviceToken: String(body.deviceToken),
      accountId: String(body.accountId ?? 'MAY-NEW'),
      playerName: String(body.playerName ?? 'Mây Nhỏ'),
      coins: typeof body.coins === 'number' ? body.coins : 150,
      coinGame: typeof body.coinGame === 'number' ? body.coinGame : 0,
      hasCharacter: Boolean(body.hasCharacter),
      saveJson:
        body.saveJson && typeof body.saveJson === 'object' && !Array.isArray(body.saveJson)
          ? (body.saveJson as Record<string, unknown>)
          : null,
      updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : null,
    };

    await saveRememberedAccount(account);
    return {ok: true, account};
  } catch (err) {
    return {
      ok: false,
      message: translateRpcError(err instanceof Error ? err.message : 'Network error'),
    };
  }
}

export async function loginAccount(
  rawUsername: string,
  password: string,
): Promise<RpcActionResult<{account: RememberedAccount}>> {
  const validationErr = validateUsernameAndPassword(rawUsername, password);
  if (validationErr) {
    return {ok: false, message: validationErr};
  }

  const cleanUsername = normalizeUsernameInput(rawUsername);
  const deviceId = await getOrCreateDeviceId();

  try {
    const res = await callSupabaseRpc('ttm_login_account', {
      p_username: cleanUsername,
      p_password: password,
      p_device_id: deviceId,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateRpcError(extractRpcFailureMessage(res.data), res.status),
      };
    }

    const body = res.data as Record<string, unknown> | null;
    if (!body || body.ok !== true) {
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return {
        ok: false,
        code,
        message: translateRpcError(
          typeof body?.message === 'string' ? body.message : '',
          res.status,
          code,
        ),
      };
    }

    const account: RememberedAccount = {
      username: String(body.username),
      displayUsername: String(body.displayUsername ?? cleanUsername),
      deviceId,
      deviceToken: String(body.deviceToken),
      accountId: String(body.accountId ?? 'MAY-PLAYER'),
      playerName: String(body.playerName ?? 'Mây Nhỏ'),
      coins: typeof body.coins === 'number' ? body.coins : 150,
      coinGame: typeof body.coinGame === 'number' ? body.coinGame : 0,
      hasCharacter: Boolean(body.hasCharacter),
      saveJson:
        body.saveJson && typeof body.saveJson === 'object' && !Array.isArray(body.saveJson)
          ? (body.saveJson as Record<string, unknown>)
          : null,
      updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : null,
    };

    await saveRememberedAccount(account);
    return {ok: true, account};
  } catch (err) {
    return {
      ok: false,
      message: translateRpcError(err instanceof Error ? err.message : 'Network error'),
    };
  }
}

export async function fetchRememberedProfile(
  account: RememberedAccount,
): Promise<RpcActionResult<{account: RememberedAccount}>> {
  try {
    const res = await callSupabaseRpc('ttm_get_remembered_profile', {
      p_username: account.username,
      p_device_id: account.deviceId,
      p_device_token: account.deviceToken,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateRpcError(extractRpcFailureMessage(res.data), res.status),
      };
    }

    const body = res.data as Record<string, unknown> | null;
    if (!body || body.ok !== true) {
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return {
        ok: false,
        code,
        isAuthError: code === 'AUTH_INVALID',
        message: translateRpcError(
          typeof body?.message === 'string' ? body.message : '',
          res.status,
          code,
        ),
      };
    }

    const updated: RememberedAccount = {
      ...account,
      displayUsername: String(body.displayUsername ?? account.displayUsername),
      accountId: String(body.accountId ?? account.accountId),
      playerName: String(body.playerName ?? account.playerName),
      coins: typeof body.coins === 'number' ? body.coins : account.coins,
      coinGame: typeof body.coinGame === 'number' ? body.coinGame : account.coinGame,
      hasCharacter: Boolean(body.hasCharacter),
      saveJson:
        body.saveJson && typeof body.saveJson === 'object' && !Array.isArray(body.saveJson)
          ? (body.saveJson as Record<string, unknown>)
          : null,
      updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : account.updatedAt,
    };

    await saveRememberedAccount(updated);
    return {ok: true, account: updated};
  } catch (err) {
    return {
      ok: false,
      message: translateRpcError(err instanceof Error ? err.message : 'Network error'),
    };
  }
}

export async function claimPlaySession(
  account: RememberedAccount,
): Promise<RpcActionResult<{account: RememberedAccount}>> {
  try {
    const res = await callSupabaseRpc('ttm_claim_play_session', {
      p_username: account.username,
      p_device_id: account.deviceId,
      p_device_token: account.deviceToken,
      p_session_id: TAB_SESSION_ID,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateRpcError(extractRpcFailureMessage(res.data), res.status),
      };
    }

    const body = res.data as Record<string, unknown> | null;
    if (!body || body.ok !== true) {
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return {
        ok: false,
        code,
        isConflict: code === 'CONCURRENT_LOGIN',
        isAuthError: code === 'AUTH_INVALID',
        message: translateRpcError(
          typeof body?.message === 'string' ? body.message : '',
          res.status,
          code,
        ),
      };
    }

    const updated: RememberedAccount = {
      ...account,
      playerName: String(body.playerName ?? account.playerName),
      coins: typeof body.coins === 'number' ? body.coins : account.coins,
      coinGame: typeof body.coinGame === 'number' ? body.coinGame : account.coinGame,
      hasCharacter: Boolean(body.saveJson),
      saveJson:
        body.saveJson && typeof body.saveJson === 'object' && !Array.isArray(body.saveJson)
          ? (body.saveJson as Record<string, unknown>)
          : null,
      updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : account.updatedAt,
    };

    await saveRememberedAccount(updated);
    return {ok: true, account: updated};
  } catch (err) {
    return {
      ok: false,
      message: translateRpcError(err instanceof Error ? err.message : 'Network error'),
    };
  }
}

export async function heartbeatPlaySession(
  account: RememberedAccount,
): Promise<RpcActionResult> {
  try {
    const res = await callSupabaseRpc('ttm_heartbeat_session', {
      p_username: account.username,
      p_device_id: account.deviceId,
      p_device_token: account.deviceToken,
      p_session_id: TAB_SESSION_ID,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateRpcError(extractRpcFailureMessage(res.data), res.status),
      };
    }

    const body = res.data as Record<string, unknown> | null;
    if (!body || body.ok !== true) {
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return {
        ok: false,
        code,
        isConflict: code === 'CONCURRENT_LOGIN',
        isAuthError: code === 'AUTH_INVALID',
        message: translateRpcError(
          typeof body?.message === 'string' ? body.message : '',
          res.status,
          code,
        ),
      };
    }

    return {ok: true};
  } catch (err) {
    return {
      ok: false,
      message: translateRpcError(err instanceof Error ? err.message : 'Network error'),
    };
  }
}

export async function saveAccountToServer(
  account: RememberedAccount,
  payload: Record<string, unknown>,
): Promise<RpcActionResult<{updatedAt: string}>> {
  const avatar =
    payload.avatar && typeof payload.avatar === 'object'
      ? (payload.avatar as Record<string, unknown>)
      : {};
  const stats =
    payload.stats && typeof payload.stats === 'object'
      ? (payload.stats as Record<string, unknown>)
      : {};

  const playerName =
    typeof avatar.name === 'string' && avatar.name.trim()
      ? avatar.name.trim()
      : account.playerName;
  const coins =
    typeof stats.coins === 'number' && Number.isFinite(stats.coins)
      ? Math.max(0, Math.floor(stats.coins))
      : 0;
  const coinGame =
    typeof stats.coinGame === 'number' && Number.isFinite(stats.coinGame)
      ? Math.max(0, Math.floor(stats.coinGame))
      : 0;

  try {
    const res = await callSupabaseRpc('ttm_save_account_data', {
      p_username: account.username,
      p_device_id: account.deviceId,
      p_device_token: account.deviceToken,
      p_session_id: TAB_SESSION_ID,
      p_player_name: playerName,
      p_coins: coins,
      p_coin_game: coinGame,
      p_save_json: payload,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: translateRpcError(extractRpcFailureMessage(res.data), res.status),
      };
    }

    const body = res.data as Record<string, unknown> | null;
    if (!body || body.ok !== true) {
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return {
        ok: false,
        code,
        isConflict: code === 'CONCURRENT_LOGIN',
        isAuthError: code === 'AUTH_INVALID',
        message: translateRpcError(
          typeof body?.message === 'string' ? body.message : '',
          res.status,
          code,
        ),
      };
    }

    const updatedAt =
      typeof body.updatedAt === 'string' ? body.updatedAt : new Date().toISOString();

    await saveRememberedAccount({
      ...account,
      playerName,
      coins,
      coinGame,
      hasCharacter: true,
      saveJson: payload,
      updatedAt,
    });

    return {ok: true, updatedAt};
  } catch (err) {
    return {
      ok: false,
      message: translateRpcError(err instanceof Error ? err.message : 'Network error'),
    };
  }
}

export async function releasePlaySession(
  account: RememberedAccount | null,
  keepalive = false,
): Promise<void> {
  if (!account) return;
  try {
    await callSupabaseRpc(
      'ttm_release_play_session',
      {
        p_username: account.username,
        p_device_id: account.deviceId,
        p_device_token: account.deviceToken,
        p_session_id: TAB_SESSION_ID,
      },
      keepalive,
    );
  } catch {
    // ignore cleanup failures
  }
}
