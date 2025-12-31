import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { google } from "@ai-sdk/google";
import { vertex } from "@ai-sdk/google-vertex";
import { createAzure } from "@ai-sdk/azure";
import { xai } from "@ai-sdk/xai";
import type { LLMConfig, SummaryResult } from "./types";
import { calculateCost } from "./pricing";
import { createClient } from "@/lib/supabase/server";

export class LLMClient {
  private model: any;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.model = this.initializeModel(config);
  }

  private initializeModel(config: LLMConfig) {
    switch (config.provider) {
      case "azure-openai":
        const azure = createAzure({
          baseURL: config.endpoint,
          apiKey: config.apiKey,
          apiVersion: config.apiVersion,
        });
        return azure(config.deploymentName || config.model);

      case "openai":
        return openai(config.model);

      case "bedrock":
        return bedrock(config.model);

      case "anthropic":
        return anthropic(config.model);

      case "google":
        return google(config.model);

      case "vertex_ai":
        return vertex(config.model);

      case "xai":
        return xai(config.model);

      case "ollama":
        // Ollamaは将来の実装で対応
        throw new Error("Ollama provider is not yet implemented");

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async summarize(content: string, title?: string): Promise<SummaryResult> {
    const prompt = this.buildPrompt(content, title);
    const startTime = Date.now();

    try {
      const { text, usage } = await generateText({
        model: this.model,
        prompt: prompt,
        temperature: this.config.temperature || 0.7,
      });

      const processingTime = Date.now() - startTime;
      // Vercel AI SDKのusage オブジェクトの実際のプロパティを使用
      const inputTokens = (usage as any).promptTokens || 0;
      const outputTokens = (usage as any).completionTokens || 0;
      const totalTokens = usage.totalTokens || inputTokens + outputTokens;

      const estimatedCost = calculateCost(
        this.config.provider,
        this.config.model,
        inputTokens,
        outputTokens
      );

      const result: SummaryResult = {
        summary: text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost,
        },
        provider: this.config.provider,
        model: this.config.model,
        processingTime,
      };

      // 使用量をデータベースに記録
      await this.recordUsage(
        {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens
        },
        "success",
        processingTime
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`LLM Error (${this.config.provider}):`, error);

      // エラーを記録
      await this.recordUsage(
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        "error",
        processingTime,
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }

  async summarizeWithTags(content: string, title?: string): Promise<SummaryResult & { tags: string[] }> {
    const prompt = this.buildPromptWithTags(content, title);
    const startTime = Date.now();

    try {
      const { text, usage } = await generateText({
        model: this.model,
        prompt: prompt,
        temperature: this.config.temperature || 0.7,
      });

      const processingTime = Date.now() - startTime;
      const inputTokens = (usage as any).promptTokens || 0;
      const outputTokens = (usage as any).completionTokens || 0;
      const totalTokens = usage.totalTokens || inputTokens + outputTokens;

      // JSONレスポンスをパース
      let parsedResponse: { summary: string; tags: string[] };
      try {
        parsedResponse = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse LLM response as JSON:", text);
        // フォールバック: テキストをそのまま要約として使用し、タグは空配列
        parsedResponse = {
          summary: text,
          tags: []
        };
      }

      const estimatedCost = calculateCost(
        this.config.provider,
        this.config.model,
        inputTokens,
        outputTokens
      );

      const result = {
        summary: parsedResponse.summary,
        tags: parsedResponse.tags || [],
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost,
        },
        provider: this.config.provider,
        model: this.config.model,
        processingTime,
      };

      // 使用量をデータベースに記録
      await this.recordUsage(
        {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens
        },
        "success",
        processingTime
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`LLM Error (${this.config.provider}):`, error);

      // エラーを記録
      await this.recordUsage(
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        "error",
        processingTime,
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }

  private buildPrompt(content: string, title?: string): string {
    const titlePart = title ? `タイトル: ${title}\n\n` : "";

    return `以下の記事を日本語で3〜5文に要約してください。
重要なポイントを箇条書きではなく、自然な文章でまとめてください。

${titlePart}本文:
${content.slice(0, 10000)}`;
  }

  private buildPromptWithTags(content: string, title?: string): string {
    const titlePart = title ? `タイトル: ${title}\n\n` : "";

    return `以下の記事を分析して、要約とタグを生成してください。

${titlePart}本文:
${content.slice(0, 10000)}

以下の形式で**必ず有効なJSON形式**で返してください：
{
  "summary": "記事の要約を3〜5文の日本語で。重要なポイントを自然な文章でまとめてください。",
  "tags": ["タグ1", "タグ2", ...]
}

タグ生成のルール：
1. 5〜10個の単語タグを生成
2. 固有名詞（技術名、製品名、企業名、サービス名など）を優先的に抽出
3. 記事の主要トピックを表す一般名詞も含める
4. 単語のみ（フレーズやスペースを含む表現は避ける）
5. 表記は統一する（例: "JavaScript"は常に"JavaScript"、"GitHub"は常に"GitHub"）
6. 記事の内容理解に重要なキーワードを優先度高く選定
7. 日本語と英語を適切に使い分ける（技術用語は英語、一般概念は日本語）`;
  }

  private async recordUsage(
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    status: "success" | "error" | "rate_limited" | "timeout",
    responseTimeMs?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      const cost = calculateCost(
        this.config.provider,
        this.config.model,
        usage.promptTokens || 0,
        usage.completionTokens || 0
      );

      const { error: insertError } = await (supabase as any).from("llm_usage").insert({
        provider: this.config.provider,
        model: this.config.model,
        environment: this.config.environment,
        request_id: crypto.randomUUID(),
        input_tokens: usage.promptTokens || 0,
        output_tokens: usage.completionTokens || 0,
        estimated_cost: cost,
        status,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
      });

      if (insertError) {
        console.error("Failed to record LLM usage:", insertError);
      }
    } catch (dbError) {
      console.error("Failed to record LLM usage:", dbError);
      // データベースへの記録失敗は、メイン処理には影響しない
    }
  }
}

// デフォルトクライアント取得ヘルパー
export async function getDefaultLLMClient(): Promise<LLMClient> {
  const environment =
    process.env.NODE_ENV === "production" ? "production" as const :
    process.env.VERCEL_ENV === "production" ? "production" as const :
    process.env.VERCEL_ENV === "preview" ? "staging" as const :
    "local" as const;

  const config = await getLLMConfig(environment);
  return new LLMClient(config);
}

async function getLLMConfig(environment: "local" | "staging" | "production"): Promise<LLMConfig> {
  // ローカル開発時は環境変数を優先
  if (environment === "local" && process.env.LLM_PROVIDER) {
    return {
      provider: process.env.LLM_PROVIDER as any,
      model: process.env.LLM_MODEL || "gemini-2.0-flash-exp",
      apiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY,
      environment: "local",
      // Azure特有
      endpoint: process.env.AZURE_ENDPOINT,
      deploymentName: process.env.AZURE_DEPLOYMENT,
      apiVersion: process.env.AZURE_API_VERSION,
      // AWS特有
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  // Supabaseから設定を取得
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("llm_settings")
      .select("*")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();

    if (error) {
      console.warn("Failed to fetch LLM settings:", error);
    }

    if (data) {
      return {
        provider: data.provider as any,
        model: data.model,
        environment: data.environment as any,
        maxTokens: data.max_tokens,
        temperature: data.temperature,
        // configからAPIキーなどを取得（実際の実装では復号化が必要）
        ...data.config,
      };
    }
  } catch (error) {
    console.warn("Failed to fetch LLM settings:", error);
  }

  // デフォルト設定（後方互換性のためのGemini）
  return {
    provider: "google",
    model: "gemini-2.0-flash-exp",
    environment,
    apiKey: process.env.GEMINI_API_KEY,
  };
}