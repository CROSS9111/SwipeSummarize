// A/Bテスト機能
import { LLMClient } from "./client";
import { type LLMConfig, type SummaryResult } from "./types";
import { createClient } from "@/lib/supabase/server";

export interface ABTestConfig {
  id: string;
  name: string;
  description?: string;
  environment: "local" | "staging" | "production";
  variants: ABTestVariant[];
  trafficSplit: Record<string, number>; // variant_id -> percentage
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  metrics: ABTestMetrics;
}

export interface ABTestVariant {
  id: string;
  name: string;
  config: LLMConfig;
  weight: number; // 0-100の重み
}

export interface ABTestMetrics {
  primaryMetric: "cost" | "quality" | "speed" | "success_rate";
  trackMetrics: string[];
  sampleSize: number;
  confidenceLevel: number; // 95%, 99% etc
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  content: string;
  title?: string;
  result: SummaryResult;
  userSegment?: string;
  sessionId?: string;
  timestamp: Date;
}

export class ABTestManager {
  private activeTests: Map<string, ABTestConfig> = new Map();

  constructor() {
    // コンストラクタでは非同期処理を行わない
    // loadActiveTests()は必要時に明示的に呼び出す
  }

  async summarize(content: string, title?: string, userSegment?: string, sessionId?: string): Promise<SummaryResult> {
    // 初回実行時にテストデータをロード
    if (this.activeTests.size === 0) {
      await this.loadActiveTests();
    }

    // アクティブなテストを確認
    const applicableTest = await this.findApplicableTest(userSegment);

    if (!applicableTest) {
      // A/Bテストが設定されていない場合は通常の処理
      return this.defaultSummarize(content, title);
    }

    // テスト参加者の割り当て
    const variant = this.assignVariant(applicableTest, sessionId);

    if (!variant) {
      return this.defaultSummarize(content, title);
    }

    try {
      // 選択されたバリアントで実行
      const client = new LLMClient(variant.config);
      const result = await client.summarize(content, title);

      // テスト結果を記録
      await this.recordTestResult({
        testId: applicableTest.id,
        variantId: variant.id,
        content,
        title,
        result,
        userSegment,
        sessionId,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      console.error(`A/B Test variant ${variant.id} failed:`, error);

      // バリアント失敗を記録
      await this.recordTestFailure(applicableTest.id, variant.id, error);

      // フォールバックとして通常処理
      return this.defaultSummarize(content, title);
    }
  }

  private async defaultSummarize(content: string, title?: string): Promise<SummaryResult> {
    // 既存のLLMクライアントを使用
    const { getDefaultLLMClient } = await import("./client");
    const client = await getDefaultLLMClient();
    return client.summarize(content, title);
  }

  private async findApplicableTest(userSegment?: string): Promise<ABTestConfig | null> {
    // 環境に応じたアクティブテストを取得
    const environment = process.env.NODE_ENV === "production" ? "production" : "local";

    for (const test of this.activeTests.values()) {
      if (test.environment !== environment) continue;
      if (!test.isActive) continue;

      const now = new Date();
      if (test.startDate > now) continue;
      if (test.endDate && test.endDate < now) continue;

      // ユーザーセグメント条件をチェック（将来の拡張用）
      return test;
    }

    return null;
  }

  private assignVariant(test: ABTestConfig, sessionId?: string): ABTestVariant | null {
    if (!test.variants.length) return null;

    // セッションIDベースの決定論的な割り当て
    const hash = sessionId ? this.hashString(sessionId) : Math.random();
    const normalizedHash = hash % 1; // 0-1の範囲に正規化

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight / 100;
      if (normalizedHash < cumulativeWeight) {
        return variant;
      }
    }

    // フォールバック：最初のバリアント
    return test.variants[0];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash) / Math.pow(2, 31); // 0-1の範囲に正規化
  }

  private async recordTestResult(result: ABTestResult): Promise<void> {
    try {
      const supabase = await createClient();
      await (supabase as any).from("ab_test_results").insert({
        test_id: result.testId,
        variant_id: result.variantId,
        content_hash: this.hashContent(result.content),
        title_hash: result.title ? this.hashContent(result.title) : null,
        summary_length: result.result.summary.length,
        input_tokens: result.result.usage.inputTokens,
        output_tokens: result.result.usage.outputTokens,
        total_tokens: result.result.usage.totalTokens,
        estimated_cost: result.result.usage.estimatedCost,
        processing_time: result.result.processingTime,
        provider: result.result.provider,
        model: result.result.model,
        user_segment: result.userSegment,
        session_id: result.sessionId,
        success: true,
        created_at: result.timestamp.toISOString(),
      });
    } catch (error) {
      console.error("Failed to record A/B test result:", error);
    }
  }

  private async recordTestFailure(testId: string, variantId: string, error: any): Promise<void> {
    try {
      const supabase = await createClient();
      await (supabase as any).from("ab_test_results").insert({
        test_id: testId,
        variant_id: variantId,
        success: false,
        error_message: error instanceof Error ? error.message : String(error),
        created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error("Failed to record A/B test failure:", dbError);
    }
  }

  private hashContent(content: string): string {
    // 簡単なハッシュ関数（プライバシー保護のため）
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async loadActiveTests(): Promise<void> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("ab_tests")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", new Date().toISOString())
        .or("end_date.is.null,end_date.gte." + new Date().toISOString());

      if (error) {
        console.error("Failed to load active A/B tests:", error);
        return;
      }

      this.activeTests.clear();
      (data || []).forEach((test: any) => {
        this.activeTests.set(test.id, this.parseTestConfig(test));
      });
    } catch (error) {
      console.error("Failed to load A/B tests:", error);
    }
  }

  private parseTestConfig(testData: any): ABTestConfig {
    return {
      id: testData.id,
      name: testData.name,
      description: testData.description,
      environment: testData.environment,
      variants: testData.variants || [],
      trafficSplit: testData.traffic_split || {},
      startDate: new Date(testData.start_date),
      endDate: testData.end_date ? new Date(testData.end_date) : undefined,
      isActive: testData.is_active,
      metrics: testData.metrics || {
        primaryMetric: "cost",
        trackMetrics: ["cost", "speed", "success_rate"],
        sampleSize: 1000,
        confidenceLevel: 95,
      },
    };
  }

  // テスト結果の分析
  async analyzeTest(testId: string): Promise<ABTestAnalysis> {
    try {
      const supabase = await createClient();

      // テスト結果を取得
      const { data: results, error } = await (supabase as any)
        .from("ab_test_results")
        .select("*")
        .eq("test_id", testId)
        .eq("success", true);

      if (error) throw error;

      // バリアント別に集計
      const variantStats = this.calculateVariantStats(results || []);

      // 統計的有意性を計算
      const significance = this.calculateStatisticalSignificance(variantStats);

      return {
        testId,
        variantStats,
        significance,
        recommendation: this.generateRecommendation(variantStats, significance),
        sampleSize: results?.length || 0,
        dataCollectedAt: new Date(),
      };
    } catch (error) {
      console.error("Failed to analyze A/B test:", error);
      throw error;
    }
  }

  private calculateVariantStats(results: any[]): Record<string, VariantStats> {
    const stats: Record<string, VariantStats> = {};

    results.forEach(result => {
      const variantId = result.variant_id;
      if (!stats[variantId]) {
        stats[variantId] = {
          variantId,
          sampleSize: 0,
          totalCost: 0,
          avgCost: 0,
          totalProcessingTime: 0,
          avgProcessingTime: 0,
          totalTokens: 0,
          avgTokens: 0,
          successRate: 0,
        };
      }

      const stat = stats[variantId];
      stat.sampleSize++;
      stat.totalCost += result.estimated_cost || 0;
      stat.totalProcessingTime += result.processing_time || 0;
      stat.totalTokens += result.total_tokens || 0;
    });

    // 平均値を計算
    Object.values(stats).forEach(stat => {
      if (stat.sampleSize > 0) {
        stat.avgCost = stat.totalCost / stat.sampleSize;
        stat.avgProcessingTime = stat.totalProcessingTime / stat.sampleSize;
        stat.avgTokens = stat.totalTokens / stat.sampleSize;
        stat.successRate = 100; // 成功したものだけを集計しているため
      }
    });

    return stats;
  }

  private calculateStatisticalSignificance(
    variantStats: Record<string, VariantStats>
  ): StatisticalSignificance {
    // 簡単な統計的有意性の計算（実際の実装では適切な統計テストを使用）
    const variants = Object.values(variantStats);
    if (variants.length < 2) {
      return { isSignificant: false, pValue: 1, confidenceLevel: 0 };
    }

    const [control, treatment] = variants;

    // 平均コストの差を比較（簡単な例）
    const costDifference = Math.abs(control.avgCost - treatment.avgCost);
    const pooledStdError = Math.sqrt(
      (Math.pow(control.avgCost * 0.1, 2) / control.sampleSize) +
      (Math.pow(treatment.avgCost * 0.1, 2) / treatment.sampleSize)
    );

    const tStatistic = costDifference / pooledStdError;
    const pValue = this.calculatePValue(tStatistic);

    return {
      isSignificant: pValue < 0.05,
      pValue,
      confidenceLevel: (1 - pValue) * 100,
    };
  }

  private calculatePValue(tStatistic: number): number {
    // 簡単なp値計算（実際の実装では適切な統計ライブラリを使用）
    return Math.exp(-0.5 * Math.pow(tStatistic, 2)) / Math.sqrt(2 * Math.PI);
  }

  private generateRecommendation(
    variantStats: Record<string, VariantStats>,
    significance: StatisticalSignificance
  ): string {
    if (!significance.isSignificant) {
      return "統計的に有意な差は見られませんでした。より多くのサンプルが必要です。";
    }

    const variants = Object.values(variantStats);
    const bestVariant = variants.reduce((best, current) =>
      current.avgCost < best.avgCost ? current : best
    );

    const costSaving = variants.reduce((max, v) => Math.max(max, v.avgCost), 0) - bestVariant.avgCost;
    const savingPercentage = (costSaving / variants[0].avgCost) * 100;

    return `バリアント ${bestVariant.variantId} が最も優秀です。約${savingPercentage.toFixed(1)}%のコスト削減が期待できます。`;
  }

  // テストの作成
  async createTest(config: Omit<ABTestConfig, "id">): Promise<string> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("ab_tests")
        .insert({
          name: config.name,
          description: config.description,
          environment: config.environment,
          variants: config.variants,
          traffic_split: config.trafficSplit,
          start_date: config.startDate.toISOString(),
          end_date: config.endDate?.toISOString(),
          is_active: config.isActive,
          metrics: config.metrics,
        })
        .select("id")
        .single();

      if (error) throw error;

      await this.loadActiveTests(); // キャッシュを更新
      return data.id;
    } catch (error) {
      console.error("Failed to create A/B test:", error);
      throw error;
    }
  }
}

export interface VariantStats {
  variantId: string;
  sampleSize: number;
  totalCost: number;
  avgCost: number;
  totalProcessingTime: number;
  avgProcessingTime: number;
  totalTokens: number;
  avgTokens: number;
  successRate: number;
}

export interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;
}

export interface ABTestAnalysis {
  testId: string;
  variantStats: Record<string, VariantStats>;
  significance: StatisticalSignificance;
  recommendation: string;
  sampleSize: number;
  dataCollectedAt: Date;
}