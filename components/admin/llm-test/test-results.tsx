"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Clock, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
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
  details?: unknown;
}

interface TestResultsProps {
  result: TestResult | null;
  loading: boolean;
}

export function TestResults({ result, loading }: TestResultsProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("コピーしました");
  };

  if (!result && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>テスト結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>テストを実行すると結果がここに表示されます</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>テスト実行中...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center text-muted-foreground">
              LLMにリクエストを送信しています...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result!.success ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              テスト成功
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-red-500" />
              テスト失敗
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* プロバイダー情報 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">プロバイダー:</span>
            <span className="font-medium">{result!.provider}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">モデル:</span>
            <span className="font-medium">{result!.model}</span>
          </div>
        </div>

        {/* 処理時間 */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">処理時間:</span>
          <span className="font-medium">{result!.processingTime}ms</span>
        </div>

        {/* トークン使用量 */}
        {result!.usage && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">入力トークン</p>
              <p className="font-medium">{result!.usage.inputTokens}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">出力トークン</p>
              <p className="font-medium">{result!.usage.outputTokens}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">合計トークン</p>
              <p className="font-medium">{result!.usage.totalTokens}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">推定コスト</p>
              <p className="font-medium">${result!.usage.estimatedCost.toFixed(6)}</p>
            </div>
          </div>
        )}

        {/* レスポンス表示 */}
        {result!.success && result!.response && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">レスポンス</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(result!.response!)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  コピー
                </Button>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {result!.response}
                </pre>
              </div>
            </div>
          </>
        )}

        {/* エラー表示 */}
        {!result!.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>{result!.error}</p>
              {result!.details !== null && result!.details !== undefined && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">詳細を表示</summary>
                  <pre className="mt-2 text-xs overflow-x-auto p-2 bg-background rounded">
                    {typeof result!.details === 'string'
                      ? result!.details
                      : result!.details !== null && result!.details !== undefined
                      ? JSON.stringify(result!.details, null, 2)
                      : "詳細情報なし"}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}