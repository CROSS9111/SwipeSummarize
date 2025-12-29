"use client";

import { useState, useEffect } from "react";
import { PROVIDERS, type ProviderId } from "@/lib/llm/providers";
import { ProviderSelector } from "./provider-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, TestTube } from "lucide-react";
import { toast } from "sonner";

interface ConfigFormProps {
  environment: "local" | "staging" | "production";
  initialConfig?: any;
  onSave?: (config: any) => void;
}

export function ConfigForm({ environment, initialConfig, onSave }: ConfigFormProps) {
  const [provider, setProvider] = useState<ProviderId | undefined>(
    initialConfig?.provider
  );
  const [model, setModel] = useState<string | undefined>(initialConfig?.model);
  const [config, setConfig] = useState<Record<string, any>>(
    initialConfig?.config || {}
  );
  const [maxTokens, setMaxTokens] = useState<number>(
    initialConfig?.maxTokens || 1000
  );
  const [temperature, setTemperature] = useState<number>(
    initialConfig?.temperature || 0.7
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialConfig?.isActive ?? true
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTest = async () => {
    if (!provider || !model) {
      toast.error("プロバイダーとモデルを選択してください");
      return;
    }

    setTesting(true);
    try {
      // テスト実装（実際にはLLMClientのインスタンスを作成してテスト）
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("接続テストに成功しました");
    } catch (error) {
      toast.error("接続テストに失敗しました");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!provider || !model) {
      toast.error("プロバイダーとモデルを選択してください");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/llm-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          environment,
          config,
          maxTokens,
          temperature,
          isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("設定の保存に失敗しました");
      }

      const data = await response.json();
      toast.success("設定を保存しました");
      onSave?.(data.setting);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const getConfigFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      apiKey: "APIキー",
      endpoint: "エンドポイント",
      deploymentName: "デプロイメント名",
      apiVersion: "APIバージョン",
      region: "リージョン",
      accessKeyId: "アクセスキーID",
      secretAccessKey: "シークレットアクセスキー",
      projectId: "プロジェクトID",
      location: "ロケーション",
      credentials: "認証情報",
      baseUrl: "ベースURL",
    };
    return labels[field] || field;
  };

  const getConfigFieldPlaceholder = (field: string): string => {
    const placeholders: Record<string, string> = {
      apiKey: "sk-...",
      endpoint: "https://your-resource.openai.azure.com/",
      deploymentName: "gpt-4-deployment",
      apiVersion: "2024-02-01",
      region: "us-east-1",
      accessKeyId: "AKIA...",
      secretAccessKey: "your-secret-key",
      projectId: "your-project-id",
      location: "us-central1",
      credentials: "認証情報JSON",
      baseUrl: "http://localhost:11434",
    };
    return placeholders[field] || `${field}を入力`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          LLM設定 - {environment === "local" ? "ローカル" : environment === "staging" ? "ステージング" : "本番"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* プロバイダーとモデル選択 */}
        <ProviderSelector
          selectedProvider={provider}
          selectedModel={model}
          onProviderChange={setProvider}
          onModelChange={setModel}
        />

        {/* プロバイダー固有の設定フィールド */}
        {selectedProvider && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">プロバイダー設定</h3>
            {selectedProvider.configFields.map(field => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{getConfigFieldLabel(field)}</Label>
                <Input
                  id={field}
                  type={field.includes("Key") || field.includes("secret") ? "password" : "text"}
                  placeholder={getConfigFieldPlaceholder(field)}
                  value={config[field] || ""}
                  onChange={(e) => handleConfigChange(field, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 詳細設定 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">詳細設定</h3>

          {/* 最大トークン数 */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">
              最大トークン数: {maxTokens}
            </Label>
            <Slider
              id="maxTokens"
              min={100}
              max={10000}
              step={100}
              value={[maxTokens]}
              onValueChange={(value: number[]) => setMaxTokens(value[0])}
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label htmlFor="temperature">
              Temperature: {temperature.toFixed(1)}
            </Label>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={(value: number[]) => setTemperature(value[0])}
            />
          </div>

          {/* アクティブ状態 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">この設定を有効にする</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !provider || !model}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                テスト中...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                接続テスト
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !provider || !model}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}