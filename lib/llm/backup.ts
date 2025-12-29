// LLM設定バックアップ/リストア機能
import { createClient } from "@/lib/supabase/server";
import { type LLMConfig } from "./types";

export interface BackupData {
  version: string;
  timestamp: Date;
  environment: string;
  data: {
    llmSettings: any[];
    fallbackConfigs: any[];
    abTests: any[];
    usageStats?: any[];
  };
  metadata: {
    creator: string;
    description?: string;
    dataSize: number;
    hash: string;
  };
}

export interface BackupOptions {
  includeUsageData?: boolean;
  includeAbTests?: boolean;
  includeFallbackConfigs?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  maxUsageRecords?: number;
}

export class LLMBackupManager {
  private readonly BACKUP_VERSION = "1.0.0";

  async createBackup(
    environment: string,
    options: BackupOptions = {},
    creator: string,
    description?: string
  ): Promise<BackupData> {
    const supabase = await createClient();

    try {
      // 基本設定データの取得
      const llmSettings = await this.getLLMSettings(supabase, environment);
      const fallbackConfigs = options.includeFallbackConfigs
        ? await this.getFallbackConfigs(supabase, environment)
        : [];
      const abTests = options.includeAbTests
        ? await this.getABTests(supabase, environment)
        : [];

      // 使用量データの取得（オプション）
      let usageStats: any[] = [];
      if (options.includeUsageData) {
        usageStats = await this.getUsageData(supabase, environment, options);
      }

      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date(),
        environment,
        data: {
          llmSettings,
          fallbackConfigs,
          abTests,
          usageStats: options.includeUsageData ? usageStats : undefined,
        },
        metadata: {
          creator,
          description,
          dataSize: this.calculateDataSize({
            llmSettings,
            fallbackConfigs,
            abTests,
            usageStats,
          }),
          hash: await this.generateHash({
            llmSettings,
            fallbackConfigs,
            abTests,
          }),
        },
      };

      // バックアップレコードをデータベースに保存
      await this.saveBackupRecord(supabase, backupData);

      return backupData;
    } catch (error) {
      console.error("Backup creation failed:", error);
      throw new Error(`バックアップの作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async restoreBackup(
    backupData: BackupData,
    options: {
      overwriteExisting?: boolean;
      validateBeforeRestore?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<{ success: boolean; report: RestoreReport }> {
    const report: RestoreReport = {
      llmSettings: { restored: 0, skipped: 0, errors: [] },
      fallbackConfigs: { restored: 0, skipped: 0, errors: [] },
      abTests: { restored: 0, skipped: 0, errors: [] },
      usageStats: { restored: 0, skipped: 0, errors: [] },
    };

    if (options.validateBeforeRestore) {
      const validation = await this.validateBackup(backupData);
      if (!validation.isValid) {
        throw new Error(`バックアップの検証に失敗しました: ${validation.errors.join(', ')}`);
      }
    }

    if (options.dryRun) {
      // ドライランの場合、検証のみ実行
      return { success: true, report };
    }

    const supabase = await createClient();

    try {
      // LLM設定の復元
      if (backupData.data.llmSettings.length > 0) {
        await this.restoreLLMSettings(
          supabase,
          backupData.data.llmSettings,
          backupData.environment,
          options.overwriteExisting || false,
          report.llmSettings
        );
      }

      // フォールバック設定の復元
      if (backupData.data.fallbackConfigs.length > 0) {
        await this.restoreFallbackConfigs(
          supabase,
          backupData.data.fallbackConfigs,
          backupData.environment,
          options.overwriteExisting || false,
          report.fallbackConfigs
        );
      }

      // A/Bテストの復元
      if (backupData.data.abTests.length > 0) {
        await this.restoreABTests(
          supabase,
          backupData.data.abTests,
          backupData.environment,
          options.overwriteExisting || false,
          report.abTests
        );
      }

      // 使用量データの復元（注意：大量データの場合）
      if (backupData.data.usageStats && backupData.data.usageStats.length > 0) {
        await this.restoreUsageStats(
          supabase,
          backupData.data.usageStats,
          report.usageStats
        );
      }

      // リストアレコードを保存
      await this.saveRestoreRecord(supabase, backupData, report);

      return { success: true, report };
    } catch (error) {
      console.error("Restore failed:", error);
      throw new Error(`リストアに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listBackups(environment?: string): Promise<BackupSummary[]> {
    const supabase = await createClient();

    try {
      let query = (supabase as any)
        .from('llm_backups')
        .select('id, environment, created_at, creator, description, data_size, status')
        .order('created_at', { ascending: false });

      if (environment) {
        query = query.eq('environment', environment);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((backup: any) => ({
        id: backup.id,
        environment: backup.environment,
        createdAt: new Date(backup.created_at),
        creator: backup.creator,
        description: backup.description,
        dataSize: backup.data_size,
        status: backup.status,
      }));
    } catch (error) {
      console.error("Failed to list backups:", error);
      throw new Error("バックアップ一覧の取得に失敗しました");
    }
  }

  async getBackup(backupId: string): Promise<BackupData | null> {
    const supabase = await createClient();

    try {
      const { data, error } = await (supabase as any)
        .from('llm_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        version: data.version,
        timestamp: new Date(data.created_at),
        environment: data.environment,
        data: data.backup_data,
        metadata: {
          creator: data.creator,
          description: data.description,
          dataSize: data.data_size,
          hash: data.hash,
        },
      };
    } catch (error) {
      console.error("Failed to get backup:", error);
      throw new Error("バックアップの取得に失敗しました");
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    const supabase = await createClient();

    try {
      const { error } = await (supabase as any)
        .from('llm_backups')
        .delete()
        .eq('id', backupId);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to delete backup:", error);
      throw new Error("バックアップの削除に失敗しました");
    }
  }

  private async getLLMSettings(supabase: any, environment: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('llm_settings')
      .select('*')
      .eq('environment', environment);

    if (error) throw error;
    return data || [];
  }

  private async getFallbackConfigs(supabase: any, environment: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('llm_fallback_configs')
      .select('*')
      .eq('environment', environment);

    if (error) throw error;
    return data || [];
  }

  private async getABTests(supabase: any, environment: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('environment', environment);

    if (error) throw error;
    return data || [];
  }

  private async getUsageData(
    supabase: any,
    environment: string,
    options: BackupOptions
  ): Promise<any[]> {
    let query = supabase
      .from('llm_usage')
      .select('*')
      .eq('environment', environment);

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.start.toISOString())
        .lte('created_at', options.dateRange.end.toISOString());
    }

    if (options.maxUsageRecords) {
      query = query.limit(options.maxUsageRecords);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private async generateHash(data: any): Promise<string> {
    const str = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(str);

    // Web Crypto APIを使用してハッシュを生成
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async saveBackupRecord(supabase: any, backupData: BackupData): Promise<void> {
    const { error } = await supabase
      .from('llm_backups')
      .insert({
        version: backupData.version,
        environment: backupData.environment,
        backup_data: backupData.data,
        creator: backupData.metadata.creator,
        description: backupData.metadata.description,
        data_size: backupData.metadata.dataSize,
        hash: backupData.metadata.hash,
        status: 'completed',
      });

    if (error) throw error;
  }

  private async validateBackup(backupData: BackupData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // バージョン互換性チェック
    if (backupData.version !== this.BACKUP_VERSION) {
      errors.push(`サポートされていないバックアップバージョン: ${backupData.version}`);
    }

    // データ構造チェック
    if (!backupData.data.llmSettings || !Array.isArray(backupData.data.llmSettings)) {
      errors.push("LLM設定データが無効です");
    }

    // ハッシュ整合性チェック
    try {
      const currentHash = await this.generateHash({
        llmSettings: backupData.data.llmSettings,
        fallbackConfigs: backupData.data.fallbackConfigs,
        abTests: backupData.data.abTests,
      });

      if (currentHash !== backupData.metadata.hash) {
        errors.push("データの整合性チェックに失敗しました");
      }
    } catch (error) {
      errors.push("ハッシュの計算に失敗しました");
    }

    return { isValid: errors.length === 0, errors };
  }

  private async restoreLLMSettings(
    supabase: any,
    settings: any[],
    environment: string,
    overwrite: boolean,
    report: RestoreItemReport
  ): Promise<void> {
    for (const setting of settings) {
      try {
        const { provider, model, config, max_tokens, temperature, is_active } = setting;

        if (overwrite) {
          // 既存設定を無効化してから新しい設定を挿入
          await supabase
            .from('llm_settings')
            .update({ is_active: false })
            .eq('environment', environment)
            .eq('provider', provider)
            .eq('model', model);
        }

        const { error } = await supabase
          .from('llm_settings')
          .insert({
            provider,
            model,
            environment,
            config,
            max_tokens,
            temperature,
            is_active: overwrite ? is_active : false, // 上書きでない場合は非アクティブで復元
          });

        if (error) {
          if (error.code === '23505') { // 重複エラー
            report.skipped++;
          } else {
            throw error;
          }
        } else {
          report.restored++;
        }
      } catch (error) {
        report.errors.push(`LLM設定復元エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async restoreFallbackConfigs(
    supabase: any,
    configs: any[],
    environment: string,
    overwrite: boolean,
    report: RestoreItemReport
  ): Promise<void> {
    // フォールバック設定の復元ロジック
    for (const config of configs) {
      try {
        if (overwrite) {
          await supabase
            .from('llm_fallback_configs')
            .update({ is_active: false })
            .eq('environment', environment);
        }

        const { error } = await supabase
          .from('llm_fallback_configs')
          .insert({ ...config, is_active: overwrite });

        if (error) {
          if (error.code === '23505') {
            report.skipped++;
          } else {
            throw error;
          }
        } else {
          report.restored++;
        }
      } catch (error) {
        report.errors.push(`フォールバック設定復元エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async restoreABTests(
    supabase: any,
    tests: any[],
    environment: string,
    overwrite: boolean,
    report: RestoreItemReport
  ): Promise<void> {
    // A/Bテストの復元ロジック
    for (const test of tests) {
      try {
        const { id, ...testData } = test;

        const { error } = await supabase
          .from('ab_tests')
          .insert({
            ...testData,
            is_active: false, // 安全のため非アクティブで復元
          });

        if (error) {
          if (error.code === '23505') {
            report.skipped++;
          } else {
            throw error;
          }
        } else {
          report.restored++;
        }
      } catch (error) {
        report.errors.push(`A/Bテスト復元エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async restoreUsageStats(
    supabase: any,
    stats: any[],
    report: RestoreItemReport
  ): Promise<void> {
    // 使用量統計の復元（バッチ処理）
    const batchSize = 100;
    for (let i = 0; i < stats.length; i += batchSize) {
      const batch = stats.slice(i, i + batchSize);

      try {
        const { error } = await supabase
          .from('llm_usage')
          .insert(batch);

        if (error) throw error;
        report.restored += batch.length;
      } catch (error) {
        report.errors.push(`使用量データ復元エラー (batch ${Math.floor(i / batchSize) + 1}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async saveRestoreRecord(
    supabase: any,
    backupData: BackupData,
    report: RestoreReport
  ): Promise<void> {
    const { error } = await supabase
      .from('llm_restore_logs')
      .insert({
        backup_version: backupData.version,
        backup_timestamp: backupData.timestamp.toISOString(),
        environment: backupData.environment,
        restore_report: report,
        status: 'completed',
      });

    if (error) {
      console.error("Failed to save restore record:", error);
    }
  }
}

export interface BackupSummary {
  id: string;
  environment: string;
  createdAt: Date;
  creator: string;
  description?: string;
  dataSize: number;
  status: string;
}

export interface RestoreReport {
  llmSettings: RestoreItemReport;
  fallbackConfigs: RestoreItemReport;
  abTests: RestoreItemReport;
  usageStats: RestoreItemReport;
}

export interface RestoreItemReport {
  restored: number;
  skipped: number;
  errors: string[];
}