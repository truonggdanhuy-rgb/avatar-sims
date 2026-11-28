export const STORAGE_KEY = 'thi_tran_may_save_v1';

export interface AccountSavePreview {
  accountId: string;
  playerName: string;
  level?: number;
  coins: number;
  coinGame: number;
  ownedItemCount: number;
  petCount: number;
  mountCount: number;
  createdAt: number;
  savedAt: number;
}

const CODE_PREFIX_COMPRESSED = 'TTM1-';
const CODE_PREFIX_RAW = 'TTM0-';

function computeChecksum32(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(-7).toUpperCase();
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64Url: string): Uint8Array {
  const normalized = b64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const outPromise = new Response(cs.readable).arrayBuffer();
    const writer = cs.writable.getWriter();
    const input = new Uint8Array(bytes.byteLength);
    input.set(bytes);
    void writer
      .write(input)
      .then(() => writer.close())
      .catch(() => {});
    const out = await Promise.race([
      outPromise.catch(() => null),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 400)),
    ]);
    return out ? new Uint8Array(out) : null;
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const outPromise = new Response(ds.readable).arrayBuffer();
    const writer = ds.writable.getWriter();
    const input = new Uint8Array(bytes.byteLength);
    input.set(bytes);
    void writer
      .write(input)
      .then(() => writer.close())
      .catch(() => {});
    const out = await Promise.race([
      outPromise.catch(() => null),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1000)),
    ]);
    return out ? new Uint8Array(out) : null;
  } catch {
    return null;
  }
}

export function encodeAccountTransferCodeSync(payload: Record<string, unknown>): string {
  const json = JSON.stringify({
    ...payload,
    characterCreated: true,
    codeVersion: 1,
  });
  const utf8 = new TextEncoder().encode(json);
  const checksum = computeChecksum32(utf8);
  return `${CODE_PREFIX_RAW}${bytesToBase64Url(utf8)}-${checksum}`;
}

export async function encodeAccountTransferCode(
  payload: Record<string, unknown>,
): Promise<string> {
  const json = JSON.stringify({
    ...payload,
    characterCreated: true,
    codeVersion: 1,
  });
  const utf8 = new TextEncoder().encode(json);
  const checksum = computeChecksum32(utf8);
  const compressed = await compressDeflateRaw(utf8);
  if (compressed && compressed.length > 0 && compressed.length < utf8.length) {
    return `${CODE_PREFIX_COMPRESSED}${bytesToBase64Url(compressed)}-${checksum}`;
  }
  return `${CODE_PREFIX_RAW}${bytesToBase64Url(utf8)}-${checksum}`;
}

export function extractSavePreview(
  payload: Record<string, unknown>,
): AccountSavePreview {
  const avatar =
    payload.avatar && typeof payload.avatar === 'object'
      ? (payload.avatar as Record<string, unknown>)
      : {};
  const stats =
    payload.stats && typeof payload.stats === 'object'
      ? (payload.stats as Record<string, unknown>)
      : {};
  const ownedIds = Array.isArray(payload.ownedIds) ? payload.ownedIds : [];
  const ownedPets = Array.isArray(payload.ownedPets) ? payload.ownedPets : [];
  const ownedMountsObj =
    payload.ownedMounts && typeof payload.ownedMounts === 'object'
      ? (payload.ownedMounts as Record<string, unknown>)
      : {};
  const ownedMountIds = Array.isArray(ownedMountsObj.ownedIds)
    ? ownedMountsObj.ownedIds
    : [];

  const playerLevelObj =
    payload.playerLevel && typeof payload.playerLevel === 'object'
      ? (payload.playerLevel as Record<string, unknown>)
      : {};

  return {
    accountId:
      typeof payload.accountId === 'string' && payload.accountId.trim()
        ? payload.accountId.trim()
        : 'MAY-PLAYER',
    playerName:
      typeof avatar.name === 'string' && avatar.name.trim()
        ? avatar.name.trim()
        : 'Mây Nhỏ',
    level:
      typeof playerLevelObj.level === 'number' && Number.isFinite(playerLevelObj.level)
        ? Math.max(1, Math.min(100, Math.floor(playerLevelObj.level)))
        : 1,
    coins:
      typeof stats.coins === 'number' && Number.isFinite(stats.coins)
        ? Math.max(0, Math.floor(stats.coins))
        : 0,
    coinGame:
      typeof stats.coinGame === 'number' && Number.isFinite(stats.coinGame)
        ? Math.max(0, Math.floor(stats.coinGame))
        : 0,
    ownedItemCount: ownedIds.length,
    petCount: ownedPets.length,
    mountCount: ownedMountIds.length,
    createdAt:
      typeof payload.accountCreatedAt === 'number' && payload.accountCreatedAt > 0
        ? payload.accountCreatedAt
        : Date.now(),
    savedAt:
      typeof payload.savedAt === 'number' && payload.savedAt > 0
        ? payload.savedAt
        : Date.now(),
  };
}

export async function decodeAccountTransferCode(
  rawCode: string,
): Promise<
  | {ok: true; payload: Record<string, unknown>; preview: AccountSavePreview}
  | {ok: false; message: string}
> {
  const cleaned = rawCode
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '');

  if (!cleaned) {
    return {ok: false, message: 'Vui lòng dán mã tài khoản trước khi khôi phục.'};
  }

  let isCompressed = false;
  let bodyWithChecksum = '';
  if (cleaned.startsWith(CODE_PREFIX_COMPRESSED)) {
    isCompressed = true;
    bodyWithChecksum = cleaned.slice(CODE_PREFIX_COMPRESSED.length);
  } else if (cleaned.startsWith(CODE_PREFIX_RAW)) {
    isCompressed = false;
    bodyWithChecksum = cleaned.slice(CODE_PREFIX_RAW.length);
  } else {
    return {
      ok: false,
      message: 'Mã không đúng định dạng (phải bắt đầu bằng TTM1- hoặc TTM0-).',
    };
  }

  const lastDash = bodyWithChecksum.lastIndexOf('-');
  if (lastDash <= 0) {
    return {
      ok: false,
      message: 'Mã tài khoản bị thiếu phần kiểm tra ở cuối. Hãy sao chép lại toàn bộ mã.',
    };
  }

  const encodedPart = bodyWithChecksum.slice(0, lastDash);
  const expectedChecksum = bodyWithChecksum.slice(lastDash + 1).toUpperCase();

  let rawBytes: Uint8Array;
  try {
    rawBytes = base64UrlToBytes(encodedPart);
  } catch {
    return {
      ok: false,
      message: 'Mã tài khoản bị lỗi ký tự. Hãy kiểm tra lại xem đã copy đủ chưa.',
    };
  }

  let utf8Bytes: Uint8Array;
  if (isCompressed) {
    const decompressed = await decompressDeflateRaw(rawBytes);
    if (!decompressed) {
      return {
        ok: false,
        message: 'Không thể giải nén mã này. Có thể mã bị cắt bớt hoặc trình duyệt chưa hỗ trợ.',
      };
    }
    utf8Bytes = decompressed;
  } else {
    utf8Bytes = rawBytes;
  }

  const actualChecksum = computeChecksum32(utf8Bytes);
  if (actualChecksum !== expectedChecksum) {
    return {
      ok: false,
      message: 'Mã tài khoản không khớp hoặc bị thiếu ký tự. Vui lòng sao chép lại đủ toàn bộ mã.',
    };
  }

  let parsed: unknown;
  try {
    const jsonStr = new TextDecoder().decode(utf8Bytes);
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      ok: false,
      message: 'Dữ liệu trong mã tài khoản không hợp lệ.',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {ok: false, message: 'Dữ liệu tài khoản không đúng cấu trúc.'};
  }

  const payload = parsed as Record<string, unknown>;
  if (!payload.avatar || typeof payload.avatar !== 'object') {
    return {ok: false, message: 'Không tìm thấy thông tin nhân vật trong mã này.'};
  }

  payload.characterCreated = true;
  return {
    ok: true,
    payload,
    preview: extractSavePreview(payload),
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
