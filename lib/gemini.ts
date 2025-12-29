// 新しい統一LLMクライアントを使用
import { getDefaultLLMClient } from "./llm/client";

export async function summarizeContent(title: string, content: string): Promise<string> {
  try {
    const llmClient = await getDefaultLLMClient();
    const result = await llmClient.summarize(content, title);
    return result.summary;
  } catch (error) {
    console.error("LLM API error:", error);
    throw new Error("要約の生成に失敗しました。時間をおいてもう一度お試しください。");
  }
}