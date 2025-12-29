// LLM管理用のヘルパー関数
import { createClient } from "@/lib/supabase/server";
import type { LLMSettings, UsageRecord } from "./types";
import { PROVIDERS } from "./providers";

export interface CreateLLMSettingInput {
  provider: string;
  model: string;
  environment: 'local' | 'staging' | 'production';
  config: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
  isActive?: boolean;
}

export interface LLMUsageFilter {
  environment?: string;
  provider?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
  status?: 'success' | 'error' | 'rate_limited' | 'timeout';
}

// LLM設定の管理
export class LLMAdminService {
  // 環境別のアクティブ設定を取得
  static async getActiveSettings(): Promise<Record<string, LLMSettings | null>> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from('llm_settings')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Failed to fetch active LLM settings:', error);
        return { local: null, staging: null, production: null };
      }

      const settings = (data || []).reduce((acc: Record<string, LLMSettings>, setting: any) => {
        acc[setting.environment] = setting;
        return acc;
      }, {});

      return {
        local: settings.local || null,
        staging: settings.staging || null,
        production: settings.production || null,
      };
    } catch (error) {
      console.error('LLM admin service error:', error);
      return { local: null, staging: null, production: null };
    }
  }

  // 設定の検証
  static validateSettings(input: CreateLLMSettingInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // プロバイダーの検証
    const provider = PROVIDERS.find(p => p.id === input.provider);
    if (!provider) {
      errors.push(`不正なプロバイダー: ${input.provider}`);
    } else {
      // モデルの検証
      if (!(provider.models as readonly string[]).includes(input.model)) {
        errors.push(`プロバイダー ${input.provider} でサポートされていないモデル: ${input.model}`);
      }

      // 必須設定フィールドの検証
      const missingFields = provider.configFields.filter(field => {
        const value = input.config[field];
        return !value || (typeof value === 'string' && value.trim() === '');
      });

      if (missingFields.length > 0) {
        errors.push(`必須設定が不足しています: ${missingFields.join(', ')}`);
      }
    }

    // 数値パラメータの検証
    if (input.maxTokens !== undefined && (input.maxTokens <= 0 || input.maxTokens > 100000)) {
      errors.push('maxTokensは1〜100000の範囲で設定してください');
    }

    if (input.temperature !== undefined && (input.temperature < 0 || input.temperature > 2)) {
      errors.push('temperatureは0〜2の範囲で設定してください');
    }

    return { valid: errors.length === 0, errors };
  }

  // 使用量データの取得
  static async getUsageData(filter: LLMUsageFilter = {}): Promise<UsageRecord[]> {
    try {
      const supabase = await createClient();

      let query = (supabase as any)
        .from('llm_usage')
        .select('*');

      // フィルターの適用
      if (filter.environment) {
        query = query.eq('environment', filter.environment);
      }
      if (filter.provider) {
        query = query.eq('provider', filter.provider);
      }
      if (filter.model) {
        query = query.eq('model', filter.model);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate);
      }
      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) {
        console.error('Failed to fetch LLM usage data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('LLM admin service error:', error);
      return [];
    }
  }

  // コスト集計
  static async getCostSummary(
    environment: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalCost: number;
    totalRequests: number;
    successRate: number;
    byProvider: Record<string, { cost: number; requests: number }>;
  }> {
    try {
      const filter: LLMUsageFilter = { environment };
      if (startDate) filter.startDate = startDate;
      if (endDate) filter.endDate = endDate;

      const usageData = await this.getUsageData(filter);

      const totalCost = usageData.reduce((sum, record) => sum + (record.estimatedCost || 0), 0);
      const totalRequests = usageData.length;
      const successCount = usageData.filter(record => record.status === 'success').length;
      const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;

      const byProvider = usageData.reduce((acc, record) => {
        const provider = record.provider;
        if (!acc[provider]) {
          acc[provider] = { cost: 0, requests: 0 };
        }
        acc[provider].cost += record.estimatedCost || 0;
        acc[provider].requests += 1;
        return acc;
      }, {} as Record<string, { cost: number; requests: number }>);

      return {
        totalCost: Math.round(totalCost * 10000) / 10000,
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        byProvider,
      };
    } catch (error) {
      console.error('Failed to get cost summary:', error);
      return {
        totalCost: 0,
        totalRequests: 0,
        successRate: 0,
        byProvider: {},
      };
    }
  }

  // 設定のテスト
  static async testConfiguration(config: CreateLLMSettingInput): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
  }> {
    try {
      // 実際にはLLMClientのインスタンスを作成してテストリクエストを送信
      // ここでは簡単な検証のみ実装
      const validation = this.validateSettings(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      return {
        success: true,
        responseTime: 0, // 実際のテスト実装時に計測
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'テストに失敗しました'
      };
    }
  }
}