"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PROVIDERS } from "@/lib/llm/providers";
import { Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TestConfig {
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
}

interface TestInterfaceProps {
  onTest: (config: TestConfig) => void;
  loading: boolean;
}

export function TestInterface({ onTest, loading }: TestInterfaceProps) {
  const [config, setConfig] = useState<TestConfig>({
    maxTokens: 1000,
    temperature: 0.7,
  });

  const selectedProvider = PROVIDERS.find(p => p.id === config.provider);

  const handleFieldChange = (field: keyof TestConfig, value: string | number | undefined) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTest = () => {
    if (!config.provider || !config.model) {
      toast.error("プロバイダーとモデルを選択してください");
      return;
    }

    onTest(config);
  };

  const getRequiredFields = () => {
    switch (config.provider) {
      case "openai":
      case "anthropic":
      case "google":
        return ["apiKey"];
      case "azure-openai":
        return ["apiKey", "endpoint", "deploymentName", "apiVersion"];
      case "aws-bedrock":
        return ["region", "accessKeyId", "secretAccessKey"];
      case "vertex-ai":
        return ["projectId", "location"];
      case "ollama":
        return [];
      default:
        return [];
    }
  };

  const isConfigValid = () => {
    if (!config.provider || !config.model) return false;

    const requiredFields = getRequiredFields();
    return requiredFields.every(field => config[field as keyof TestConfig]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLMテスト設定</CardTitle>
        <CardDescription>
          プロバイダーとモデルを選択して、APIキーなどの認証情報を入力してください。
          <br />
          テストプロンプト: "Hello! Please introduce yourself and explain your capabilities in 2-3 sentences."
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* プロバイダー選択 */}
        <div className="space-y-2">
          <Label>プロバイダー</Label>
          <Select
            value={config.provider}
            onValueChange={value => {
              handleFieldChange("provider", value);
              handleFieldChange("model", undefined); // プロバイダー変更時にモデルをリセット
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="プロバイダーを選択" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* モデル選択 */}
        {selectedProvider && (
          <div className="space-y-2">
            <Label>モデル</Label>
            <Select
              value={config.model}
              onValueChange={value => handleFieldChange("model", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="モデルを選択" />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* プロバイダー別の設定フィールド */}
        {config.provider && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              認証情報（テスト実行時のみ使用、保存されません）
            </h3>

            {/* OpenAI, Anthropic, Google */}
            {(config.provider === "openai" ||
              config.provider === "anthropic" ||
              config.provider === "google") && (
              <div className="space-y-2">
                <Label>APIキー *</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={config.apiKey || ""}
                  onChange={e => handleFieldChange("apiKey", e.target.value)}
                />
              </div>
            )}

            {/* Azure OpenAI */}
            {config.provider === "azure-openai" && (
              <>
                <div className="space-y-2">
                  <Label>APIキー *</Label>
                  <Input
                    type="password"
                    placeholder="APIキーを入力"
                    value={config.apiKey || ""}
                    onChange={e => handleFieldChange("apiKey", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>エンドポイント *</Label>
                  <Input
                    placeholder="https://your-resource.openai.azure.com/"
                    value={config.endpoint || ""}
                    onChange={e => handleFieldChange("endpoint", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>デプロイメント名 *</Label>
                  <Input
                    placeholder="gpt-4-deployment"
                    value={config.deploymentName || ""}
                    onChange={e => handleFieldChange("deploymentName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>APIバージョン *</Label>
                  <Input
                    placeholder="2024-02-01"
                    value={config.apiVersion || ""}
                    onChange={e => handleFieldChange("apiVersion", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* AWS Bedrock */}
            {config.provider === "aws-bedrock" && (
              <>
                <div className="space-y-2">
                  <Label>リージョン *</Label>
                  <Input
                    placeholder="us-east-1"
                    value={config.region || ""}
                    onChange={e => handleFieldChange("region", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>アクセスキーID *</Label>
                  <Input
                    type="password"
                    placeholder="AKIA..."
                    value={config.accessKeyId || ""}
                    onChange={e => handleFieldChange("accessKeyId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>シークレットアクセスキー *</Label>
                  <Input
                    type="password"
                    placeholder="シークレットアクセスキー"
                    value={config.secretAccessKey || ""}
                    onChange={e => handleFieldChange("secretAccessKey", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Vertex AI */}
            {config.provider === "vertex-ai" && (
              <>
                <div className="space-y-2">
                  <Label>プロジェクトID *</Label>
                  <Input
                    placeholder="your-project-id"
                    value={config.projectId || ""}
                    onChange={e => handleFieldChange("projectId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ロケーション *</Label>
                  <Input
                    placeholder="us-central1"
                    value={config.location || ""}
                    onChange={e => handleFieldChange("location", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Ollama */}
            {config.provider === "ollama" && (
              <div className="space-y-2">
                <Label>エンドポイント（オプション）</Label>
                <Input
                  placeholder="http://localhost:11434"
                  value={config.endpoint || ""}
                  onChange={e => handleFieldChange("endpoint", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  デフォルトではlocalhostの11434ポートに接続します
                </p>
              </div>
            )}
          </div>
        )}

        {/* 詳細設定 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>最大トークン数: {config.maxTokens}</Label>
            <Slider
              value={[config.maxTokens]}
              onValueChange={([value]) => handleFieldChange("maxTokens", value)}
              min={100}
              max={4000}
              step={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Temperature: {config.temperature}</Label>
            <Slider
              value={[config.temperature]}
              onValueChange={([value]) => handleFieldChange("temperature", value)}
              min={0}
              max={2}
              step={0.1}
            />
          </div>
        </div>

        {/* テスト実行ボタン */}
        <Button
          onClick={handleTest}
          disabled={loading || !isConfigValid()}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              テスト実行中...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              テスト実行
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}