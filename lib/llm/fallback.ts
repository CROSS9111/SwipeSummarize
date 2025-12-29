// プロバイダーフォールバック機能
import { LLMClient } from "./client";
import { type LLMConfig, type SummaryResult } from "./types";
import { type ProviderId } from "./providers";
import { createClient } from "@/lib/supabase/server";

export interface FallbackConfig {
  primary: LLMConfig;
  fallbacks: LLMConfig[];
  maxRetries?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTime?: number;
}

interface ProviderHealth {
  failures: number;
  lastFailure?: Date;
  isCircuitOpen: boolean;
  successCount: number;
}

export class FallbackLLMClient {
  private configs: LLMConfig[];
  private currentIndex: number = 0;
  private health: Map<string, ProviderHealth> = new Map();
  private maxRetries: number;
  private retryDelay: number;
  private circuitBreakerThreshold: number;
  private circuitBreakerResetTime: number;

  constructor(config: FallbackConfig) {
    this.configs = [config.primary, ...config.fallbacks];
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.circuitBreakerThreshold = config.circuitBreakerThreshold || 5;
    this.circuitBreakerResetTime = config.circuitBreakerResetTime || 60000; // 1分

    // 各プロバイダーの健全性を初期化
    this.configs.forEach(conf => {
      const key = `${conf.provider}:${conf.model}`;
      this.health.set(key, {
        failures: 0,
        isCircuitOpen: false,
        successCount: 0,
      });
    });
  }

  async summarize(content: string, title?: string): Promise<SummaryResult> {
    let lastError: Error | null = null;
    const attemptedProviders: string[] = [];

    for (let attempt = 0; attempt < this.configs.length; attempt++) {
      const config = this.selectNextProvider();
      if (!config) {
        throw new Error("利用可能なプロバイダーがありません");
      }

      const key = `${config.provider}:${config.model}`;
      attemptedProviders.push(key);

      // サーキットブレーカーチェック
      if (this.isCircuitOpen(key)) {
        console.log(`Circuit breaker open for ${key}, skipping...`);
        continue;
      }

      try {
        console.log(`Attempting with provider: ${key}`);
        const client = new LLMClient(config);
        const result = await this.executeWithRetry(
          () => client.summarize(content, title),
          config
        );

        // 成功時の処理
        this.recordSuccess(key);
        await this.logFallbackUsage(config, attemptedProviders, true);

        return result;
      } catch (error) {
        console.error(`Provider ${key} failed:`, error);
        lastError = error as Error;

        // エラーの種類を判定
        const errorType = this.classifyError(error);
        this.recordFailure(key, errorType);

        // 致命的でないエラーの場合は続行
        if (errorType !== "fatal") {
          continue;
        }

        break;
      }
    }

    // すべてのプロバイダーで失敗
    await this.logFallbackUsage(
      this.configs[0],
      attemptedProviders,
      false,
      lastError?.message
    );

    throw lastError || new Error("すべてのプロバイダーで要約に失敗しました");
  }

  private async executeWithRetry(
    fn: () => Promise<SummaryResult>,
    config: LLMConfig
  ): Promise<SummaryResult> {
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.maxRetries; retry++) {
      try {
        if (retry > 0) {
          await this.delay(this.retryDelay * Math.pow(2, retry - 1)); // 指数バックオフ
        }
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.log(`Retry ${retry + 1}/${this.maxRetries} failed for ${config.provider}`);
      }
    }

    throw lastError;
  }

  private selectNextProvider(): LLMConfig | null {
    const availableConfigs = this.configs.filter(config => {
      const key = `${config.provider}:${config.model}`;
      return !this.isCircuitOpen(key);
    });

    if (availableConfigs.length === 0) {
      // すべてのサーキットブレーカーが開いている場合、最も古いものをリセット
      this.resetOldestCircuit();
      return this.configs[0];
    }

    // 失敗数が最も少ないプロバイダーを選択
    return availableConfigs.sort((a, b) => {
      const keyA = `${a.provider}:${a.model}`;
      const keyB = `${b.provider}:${b.model}`;
      const healthA = this.health.get(keyA)!;
      const healthB = this.health.get(keyB)!;
      return healthA.failures - healthB.failures;
    })[0];
  }

  private isCircuitOpen(key: string): boolean {
    const health = this.health.get(key);
    if (!health) return false;

    // サーキットブレーカーが開いている場合、リセット時間を確認
    if (health.isCircuitOpen) {
      if (health.lastFailure) {
        const timeSinceFailure = Date.now() - health.lastFailure.getTime();
        if (timeSinceFailure > this.circuitBreakerResetTime) {
          // リセット
          health.isCircuitOpen = false;
          health.failures = 0;
          health.successCount = 0;
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private recordSuccess(key: string): void {
    const health = this.health.get(key);
    if (!health) return;

    health.successCount++;
    // 連続成功で失敗カウントを減らす
    if (health.successCount > 3) {
      health.failures = Math.max(0, health.failures - 1);
      health.successCount = 0;
    }
  }

  private recordFailure(key: string, errorType: string): void {
    const health = this.health.get(key);
    if (!health) return;

    health.failures++;
    health.lastFailure = new Date();
    health.successCount = 0;

    // 閾値を超えたらサーキットブレーカーを開く
    if (health.failures >= this.circuitBreakerThreshold) {
      health.isCircuitOpen = true;
      console.log(`Circuit breaker opened for ${key}`);
    }
  }

  private classifyError(error: any): string {
    const message = error?.message?.toLowerCase() || "";

    if (message.includes("rate limit") || message.includes("429")) {
      return "rate_limit";
    }
    if (message.includes("timeout")) {
      return "timeout";
    }
    if (message.includes("unauthorized") || message.includes("401")) {
      return "auth";
    }
    if (message.includes("invalid") || message.includes("400")) {
      return "invalid_request";
    }

    return "unknown";
  }

  private resetOldestCircuit(): void {
    let oldestFailure: Date | null = null;
    let oldestKey: string | null = null;

    this.health.forEach((health, key) => {
      if (health.isCircuitOpen && health.lastFailure) {
        if (!oldestFailure || health.lastFailure < oldestFailure) {
          oldestFailure = health.lastFailure;
          oldestKey = key;
        }
      }
    });

    if (oldestKey) {
      const health = this.health.get(oldestKey)!;
      health.isCircuitOpen = false;
      health.failures = 0;
      console.log(`Force reset circuit breaker for ${oldestKey}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async logFallbackUsage(
    config: LLMConfig,
    attemptedProviders: string[],
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await (supabase as any).from("llm_fallback_logs").insert({
        primary_provider: this.configs[0].provider,
        primary_model: this.configs[0].model,
        used_provider: success ? config.provider : null,
        used_model: success ? config.model : null,
        attempted_providers: attemptedProviders,
        success,
        error_message: errorMessage,
        environment: config.environment,
      });
    } catch (error) {
      console.error("Failed to log fallback usage:", error);
    }
  }

  // プロバイダーの健全性状態を取得
  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    this.health.forEach((health, key) => {
      status[key] = {
        failures: health.failures,
        isCircuitOpen: health.isCircuitOpen,
        lastFailure: health.lastFailure?.toISOString(),
        successCount: health.successCount,
      };
    });
    return status;
  }

  // 手動でプロバイダーをリセット
  resetProvider(provider: ProviderId, model: string): void {
    const key = `${provider}:${model}`;
    const health = this.health.get(key);
    if (health) {
      health.failures = 0;
      health.isCircuitOpen = false;
      health.successCount = 0;
      health.lastFailure = undefined;
    }
  }
}