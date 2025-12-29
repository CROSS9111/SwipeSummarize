import { NextRequest, NextResponse } from "next/server";
import { LLMClient } from "@/lib/llm/client";
import { type LLMConfig } from "@/lib/llm/types";
import { type ProviderId } from "@/lib/llm/providers";

// 開発環境限定チェック
function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

// 固定テストプロンプト
const TEST_PROMPT = "Hello! Please introduce yourself and explain your capabilities in 2-3 sentences.";

export async function POST(request: NextRequest) {
  try {
    // 開発環境限定
    if (!isDevelopment()) {
      return NextResponse.json(
        { error: "This feature is only available in development" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      provider,
      model,
      apiKey,
      endpoint,
      deploymentName,
      apiVersion,
      region,
      accessKeyId,
      secretAccessKey,
      projectId,
      location,
      maxTokens = 1000,
      temperature = 0.7,
    } = body;

    // 必須パラメータチェック
    if (!provider || !model) {
      return NextResponse.json(
        { error: "プロバイダーとモデルは必須です" },
        { status: 400 }
      );
    }

    // LLM設定を構築
    const config: LLMConfig = {
      provider: provider as ProviderId,
      model,
      environment: "local", // テストは常にlocal環境扱い
      apiKey,
      endpoint,
      deploymentName,
      apiVersion,
      region,
      accessKeyId,
      secretAccessKey,
      projectId,
      location,
      maxTokens,
      temperature,
    };

    // プロバイダー別の必須フィールドチェック
    switch (provider) {
      case "openai":
      case "anthropic":
      case "google":
        if (!apiKey) {
          return NextResponse.json(
            { error: "APIキーが必要です" },
            { status: 400 }
          );
        }
        break;
      case "azure-openai":
        if (!apiKey || !endpoint || !deploymentName || !apiVersion) {
          return NextResponse.json(
            { error: "Azure OpenAIには APIキー、エンドポイント、デプロイメント名、APIバージョンが必要です" },
            { status: 400 }
          );
        }
        break;
      case "aws-bedrock":
        if (!region || !accessKeyId || !secretAccessKey) {
          return NextResponse.json(
            { error: "AWS Bedrockには リージョン、アクセスキーID、シークレットアクセスキーが必要です" },
            { status: 400 }
          );
        }
        break;
      case "vertex-ai":
        if (!projectId || !location) {
          return NextResponse.json(
            { error: "Vertex AIには プロジェクトIDとロケーションが必要です" },
            { status: 400 }
          );
        }
        break;
      case "ollama":
        // Ollamaはローカルなので追加設定不要
        break;
      default:
        return NextResponse.json(
          { error: "サポートされていないプロバイダーです" },
          { status: 400 }
        );
    }

    // テスト実行開始時間
    const startTime = Date.now();

    try {
      // LLMクライアントを初期化
      const client = new LLMClient(config);

      // テストプロンプトを実行（summarizeメソッドを流用）
      const result = await client.summarize(TEST_PROMPT, "Test Request");

      // 処理時間を計算
      const processingTime = Date.now() - startTime;

      // レスポンスを返す（DBには保存しない）
      return NextResponse.json({
        success: true,
        response: result.summary,
        processingTime,
        provider,
        model,
        usage: result.usage,
      });
    } catch (llmError) {
      // LLM実行エラーの詳細を返す
      const processingTime = Date.now() - startTime;

      return NextResponse.json({
        success: false,
        error: llmError instanceof Error ? llmError.message : "LLMの実行中にエラーが発生しました",
        processingTime,
        provider,
        model,
        details: llmError instanceof Error ? (llmError.cause || llmError.stack || null) : null,
      });
    }
  } catch (error) {
    console.error("LLM test API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
        details: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}

// OPTIONS リクエストの処理（CORS対応）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}