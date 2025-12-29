"use client";

import { useState, useEffect } from "react";
import { TestInterface } from "@/components/admin/llm-test/test-interface";
import { TestResults } from "@/components/admin/llm-test/test-results";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TestResult {
  success: boolean;
  response?: string;
  processingTime: number;
  provider: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  error?: string;
  details?: any;
}

export default function TestChatPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [isDevelopment, setIsDevelopment] = useState(true);

  useEffect(() => {
    // 開発環境チェック（クライアント側）
    // 本番環境では、そもそもアクセスできないようにする
    if (process.env.NODE_ENV !== "development") {
      setIsDevelopment(false);
    }
  }, []);

  const handleTest = async (config: {
    provider?: string;
    model?: string;
    apiKey?: string;
    endpoint?: string;
    deploymentName?: string;
    apiVersion?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    projectId?: string;
    location?: string;
    maxTokens: number;
    temperature: number;
  }) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/llm-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        // APIエラー
        setResult({
          success: false,
          error: data.error || "テストの実行に失敗しました",
          details: data.details,
          processingTime: 0,
          provider: config.provider || "unknown",
          model: config.model || "unknown",
        });
      } else {
        setResult(data);
        if (data.success) {
          toast.success("テストが成功しました");
        } else {
          toast.error("テストが失敗しました");
        }
      }
    } catch (error) {
      // ネットワークエラーなど
      setResult({
        success: false,
        error: "ネットワークエラーが発生しました",
        details: error instanceof Error ? error.message : "不明なエラー",
        processingTime: 0,
        provider: config.provider || "unknown",
        model: config.model || "unknown",
      });
      toast.error("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!isDevelopment) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>アクセス制限</AlertTitle>
          <AlertDescription>
            この機能は開発環境でのみ利用可能です。
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/admin/llm">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              LLM管理画面に戻る
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/llm">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">LLMテストチャット</h1>
        </div>
        <p className="text-muted-foreground">
          開発者向けのLLMテストツール。各プロバイダーのモデルに固定プロンプトでテストリクエストを送信できます。
        </p>
      </div>

      {/* 開発環境インジケーター */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>開発環境専用機能</AlertTitle>
        <AlertDescription>
          このツールは開発環境でのみ動作します。入力された認証情報は一時的にメモリ上でのみ使用され、保存されません。
        </AlertDescription>
      </Alert>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 設定 */}
        <div>
          <TestInterface onTest={handleTest} loading={loading} />
        </div>

        {/* 右側: 結果 */}
        <div>
          <TestResults result={result} loading={loading} />
        </div>
      </div>

      {/* テストログ履歴（将来の拡張用） */}
      <div className="mt-12">
        <Alert>
          <AlertDescription>
            テスト結果は保存されません。必要に応じてコピーして保存してください。
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}