import type { SavedRecord } from "@/types";

/**
 * 要約テキスト（Markdown JSON形式を含む）から要約本文とタグを抽出します
 */
export function parseSummaryData(item: Partial<SavedRecord>) {
  let summaryText = item.summary || "";
  let tags = Array.isArray(item.tags) ? [...item.tags] : [];

  if (!summaryText) {
    return { summaryText: "", tags };
  }

  // MarkdownのJSONブロックが含まれている場合
  if (summaryText.includes("```json")) {
    try {
      const jsonMatch = summaryText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.summary) summaryText = parsed.summary;
        if (Array.isArray(parsed.tags)) {
          // 既存のタグとマージして重複を排除
          tags = Array.from(new Set([...tags, ...parsed.tags]));
        }
      }
    } catch (e) {
      console.error("Failed to parse summary JSON block:", e);
    }
  }
  // 直接JSON形式で始まる場合
  else if (summaryText.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(summaryText);
      if (parsed.summary) summaryText = parsed.summary;
      if (Array.isArray(parsed.tags)) {
        tags = Array.from(new Set([...tags, ...parsed.tags]));
      }
    } catch (e) {
      // JSONでない場合はそのまま扱う
    }
  }

  return { summaryText, tags };
}
