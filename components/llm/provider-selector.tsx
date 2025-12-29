"use client";

import { useState } from "react";
import { PROVIDERS, type ProviderId } from "@/lib/llm/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ProviderSelectorProps {
  selectedProvider?: ProviderId;
  selectedModel?: string;
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (model: string) => void;
}

export function ProviderSelector({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
}: ProviderSelectorProps) {
  const selectedProviderInfo = PROVIDERS.find(p => p.id === selectedProvider);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "enterprise":
        return "bg-purple-500";
      case "standard":
        return "bg-blue-500";
      case "local":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "enterprise":
        return "エンタープライズ";
      case "standard":
        return "スタンダード";
      case "local":
        return "ローカル";
      default:
        return category;
    }
  };

  return (
    <div className="space-y-4">
      {/* プロバイダー選択 */}
      <div className="space-y-2">
        <Label htmlFor="provider">プロバイダー</Label>
        <Select value={selectedProvider} onValueChange={onProviderChange}>
          <SelectTrigger id="provider">
            <SelectValue placeholder="プロバイダーを選択" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex items-center gap-2">
                  <span>{provider.name}</span>
                  <Badge
                    variant="secondary"
                    className={`text-xs text-white ${getCategoryColor(provider.category)}`}
                  >
                    {getCategoryLabel(provider.category)}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* モデル選択 */}
      {selectedProviderInfo && (
        <div className="space-y-2">
          <Label htmlFor="model">モデル</Label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger id="model">
              <SelectValue placeholder="モデルを選択" />
            </SelectTrigger>
            <SelectContent>
              {selectedProviderInfo.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}