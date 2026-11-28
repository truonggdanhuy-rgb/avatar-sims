/**
 * Cấu hình kết nối Supabase cho Thị Trấn Mây.
 *
 * Cách 1 (Khuyên dùng với GitHub Actions):
 *   Thêm 2 biến VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào
 *   GitHub Repository Settings -> Secrets and variables -> Actions -> Variables,
 *   rồi truyền vào bước `npm run build` trong .github/workflows/deploy.yml.
 *
 * Cách 2 (Khi kéo thả thư mục src lên GitHub trực tiếp):
 *   Có thể điền Project URL và Publishable / Anon key công khai vào 2 hằng số
 *   SUPABASE_FALLBACK_URL và SUPABASE_FALLBACK_ANON_KEY bên dưới (chỉ dùng anon key,
 *   tuyệt đối KHÔNG điền service_role secret key vào frontend).
 */

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

const SUPABASE_FALLBACK_URL = '';
const SUPABASE_FALLBACK_ANON_KEY = '';

const RAW_ENV_URL =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  typeof import.meta.env.VITE_SUPABASE_URL === 'string'
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : '';

const RAW_ENV_ANON_KEY =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : '';

function sanitizeSupabaseUrl(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const isHttps = parsed.protocol === 'https:';
    const isLocalHttp =
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

export function getSupabaseConfig(): SupabasePublicConfig {
  const url = sanitizeSupabaseUrl(RAW_ENV_URL || SUPABASE_FALLBACK_URL.trim());
  const anonKey = RAW_ENV_ANON_KEY || SUPABASE_FALLBACK_ANON_KEY.trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}
