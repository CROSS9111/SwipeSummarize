/**
 * URL Validator - SSRF対策を含むURL検証ユーティリティ
 * Feature: F-007-ASYNC-PROCESS
 */

// ブロックするホスト
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
];

// ブロックするIPレンジ（プライベートIP）
const BLOCKED_IP_PATTERNS = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16
  /^169\.254\./,                    // Link-local
  /^fc00:/i,                        // IPv6 Unique local
  /^fe80:/i,                        // IPv6 Link-local
];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * URLの形式とセキュリティを検証
 */
export function validateUrl(urlString: string): UrlValidationResult {
  // 空チェック
  if (!urlString || urlString.trim() === '') {
    return { isValid: false, error: 'URLが空です' };
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { isValid: false, error: 'URLの形式が不正です' };
  }

  // プロトコルチェック（http/httpsのみ許可）
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { isValid: false, error: 'http または https のURLのみ許可されています' };
  }

  // ホスト名チェック
  const hostname = url.hostname.toLowerCase();

  // ブロックリストチェック
  if (BLOCKED_HOSTS.includes(hostname)) {
    return { isValid: false, error: '内部アドレスへのアクセスは許可されていません' };
  }

  // プライベートIPチェック
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { isValid: false, error: 'プライベートIPへのアクセスは許可されていません' };
    }
  }

  // 空のホスト名チェック
  if (!hostname || hostname === '') {
    return { isValid: false, error: 'ホスト名が指定されていません' };
  }

  return { isValid: true };
}

/**
 * ドメイン名を抽出
 */
export function extractDomain(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return 'unknown';
  }
}
