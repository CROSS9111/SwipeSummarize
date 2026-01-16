/**
 * DOMPurify を動的にロードするサニタイズユーティリティ
 * バンドルサイズ最適化: 初回使用時のみロード
 */

type DOMPurifyType = typeof import("dompurify").default;

let cachedDOMPurify: DOMPurifyType | null = null;
let loadingPromise: Promise<DOMPurifyType> | null = null;

/**
 * DOMPurify を動的にロード（キャッシュ付き）
 */
async function loadDOMPurify(): Promise<DOMPurifyType> {
  if (cachedDOMPurify) {
    return cachedDOMPurify;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = import("dompurify").then((mod) => {
    cachedDOMPurify = mod.default;
    return cachedDOMPurify;
  });

  return loadingPromise;
}

/**
 * DOMPurify をプリロード（useEffect内で呼び出し推奨）
 */
export function preloadDOMPurify(): void {
  loadDOMPurify();
}

/**
 * 文字列をサニタイズ（非同期版）
 */
export async function sanitizeAsync(input: string): Promise<string> {
  const DOMPurify = await loadDOMPurify();
  return DOMPurify.sanitize(input);
}

/**
 * 文字列をサニタイズ（同期版 - プリロード済みの場合のみ使用）
 * プリロードされていない場合はそのまま返す
 */
export function sanitizeSync(input: string): string {
  if (cachedDOMPurify) {
    return cachedDOMPurify.sanitize(input);
  }
  // フォールバック: 基本的なHTMLエスケープ
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * DOMPurify がロード済みかどうか
 */
export function isDOMPurifyLoaded(): boolean {
  return cachedDOMPurify !== null;
}
