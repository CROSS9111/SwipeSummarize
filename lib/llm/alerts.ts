// LLMアラート通知システム
import { createClient } from "@/lib/supabase/server";

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  environment: "local" | "staging" | "production";
  type: AlertType;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  frequency: AlertFrequency;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertType =
  | "cost_threshold"
  | "error_rate"
  | "response_time"
  | "success_rate"
  | "token_usage"
  | "provider_failure"
  | "circuit_breaker"
  | "quota_exceeded";

export interface AlertCondition {
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  value: number;
  timeWindow: number; // minutes
  aggregation?: "avg" | "sum" | "max" | "min" | "count";
}

export interface AlertAction {
  type: "email" | "webhook" | "slack" | "discord" | "log";
  config: Record<string, any>;
}

export type AlertFrequency = "immediate" | "every_5min" | "every_15min" | "hourly" | "daily";

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details: Record<string, any>;
  environment: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: "active" | "resolved" | "acknowledged";
}

export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private lastCheck: Date = new Date();

  constructor() {
    // コンストラクタでは非同期処理を行わない
    // loadAlertRules()は必要時に明示的に呼び出す
  }

  // メイン監視ロジック（定期実行）
  async checkAlerts(): Promise<AlertEvent[]> {
    const triggeredAlerts: AlertEvent[] = [];

    try {
      await this.loadAlertRules();

      for (const rule of this.rules.values()) {
        if (!rule.isActive) continue;

        // 頻度チェック
        if (!this.shouldCheckRule(rule)) continue;

        const alertEvent = await this.evaluateRule(rule);
        if (alertEvent) {
          triggeredAlerts.push(alertEvent);
          await this.triggerAlert(alertEvent);
          await this.updateRuleLastTriggered(rule.id);
        }
      }
    } catch (error) {
      console.error("Alert check failed:", error);
    }

    this.lastCheck = new Date();
    return triggeredAlerts;
  }

  private async evaluateRule(rule: AlertRule): Promise<AlertEvent | null> {
    try {
      const metrics = await this.getMetrics(rule);

      for (const condition of rule.conditions) {
        const metricValue = metrics[condition.metric];

        if (!this.evaluateCondition(condition, metricValue)) {
          return null; // すべての条件が満たされる必要がある
        }
      }

      // アラート生成
      return {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        ruleName: rule.name,
        severity: this.calculateSeverity(rule, metrics),
        message: this.generateAlertMessage(rule, metrics),
        details: {
          metrics,
          conditions: rule.conditions,
          environment: rule.environment,
        },
        environment: rule.environment,
        triggeredAt: new Date(),
        status: "active",
      };
    } catch (error) {
      console.error(`Error evaluating rule ${rule.name}:`, error);
      return null;
    }
  }

  private async getMetrics(rule: AlertRule): Promise<Record<string, number>> {
    const supabase = await createClient();
    const metrics: Record<string, number> = {};

    // 時間窓の計算
    const timeWindow = Math.min(...rule.conditions.map(c => c.timeWindow));
    const startTime = new Date(Date.now() - timeWindow * 60 * 1000);

    try {
      // 基本的なメトリクスを取得
      const { data: usageData, error } = await (supabase as any)
        .from("llm_usage")
        .select("*")
        .eq("environment", rule.environment)
        .gte("created_at", startTime.toISOString());

      if (error) throw error;

      const records: any[] = usageData || [];

      // メトリクス計算
      metrics.total_requests = records.length;
      metrics.error_count = records.filter(r => r.status !== "success").length;
      metrics.success_count = records.filter(r => r.status === "success").length;
      metrics.error_rate = records.length > 0 ? (metrics.error_count / records.length) * 100 : 0;
      metrics.success_rate = records.length > 0 ? (metrics.success_count / records.length) * 100 : 100;

      if (records.length > 0) {
        metrics.avg_response_time = records
          .filter((r: any) => r.response_time_ms)
          .reduce((sum: number, r: any) => sum + (r.response_time_ms || 0), 0) / records.length;

        metrics.total_cost = records.reduce((sum: number, r: any) => sum + (r.estimated_cost || 0), 0);
        metrics.total_input_tokens = records.reduce((sum: number, r: any) => sum + (r.input_tokens || 0), 0);
        metrics.total_output_tokens = records.reduce((sum: number, r: any) => sum + (r.output_tokens || 0), 0);
        metrics.avg_cost_per_request = metrics.total_cost / records.length;

        // 最大・最小値
        const responseTimes = records.filter((r: any) => r.response_time_ms).map((r: any) => r.response_time_ms);
        if (responseTimes.length > 0) {
          metrics.max_response_time = Math.max(...responseTimes);
          metrics.min_response_time = Math.min(...responseTimes);
        }
      }

      // プロバイダー別メトリクス
      const providerStats = this.calculateProviderStats(records);
      Object.entries(providerStats).forEach(([provider, stats]) => {
        metrics[`${provider}_error_rate`] = stats.errorRate;
        metrics[`${provider}_request_count`] = stats.requestCount;
      });

    } catch (error) {
      console.error("Failed to get metrics:", error);
    }

    return metrics;
  }

  private calculateProviderStats(records: any[]): Record<string, any> {
    const stats: Record<string, any> = {};

    records.forEach((record: any) => {
      const provider = record.provider;
      if (!stats[provider]) {
        stats[provider] = { requestCount: 0, errorCount: 0, successCount: 0 };
      }

      stats[provider].requestCount++;
      if (record.status === "success") {
        stats[provider].successCount++;
      } else {
        stats[provider].errorCount++;
      }
    });

    // エラー率を計算
    Object.keys(stats).forEach(provider => {
      const stat = stats[provider];
      stat.errorRate = stat.requestCount > 0 ? (stat.errorCount / stat.requestCount) * 100 : 0;
    });

    return stats;
  }

  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case "gt": return value > condition.value;
      case "gte": return value >= condition.value;
      case "lt": return value < condition.value;
      case "lte": return value <= condition.value;
      case "eq": return value === condition.value;
      case "neq": return value !== condition.value;
      default: return false;
    }
  }

  private calculateSeverity(rule: AlertRule, metrics: Record<string, number>): "low" | "medium" | "high" | "critical" {
    // ルールタイプとメトリクス値に基づいて重要度を決定
    switch (rule.type) {
      case "cost_threshold":
        const costOverage = metrics.total_cost / rule.conditions[0].value;
        if (costOverage > 2) return "critical";
        if (costOverage > 1.5) return "high";
        if (costOverage > 1.2) return "medium";
        return "low";

      case "error_rate":
        const errorRate = metrics.error_rate;
        if (errorRate > 50) return "critical";
        if (errorRate > 25) return "high";
        if (errorRate > 10) return "medium";
        return "low";

      case "response_time":
        const responseTime = metrics.avg_response_time;
        if (responseTime > 10000) return "critical";
        if (responseTime > 5000) return "high";
        if (responseTime > 3000) return "medium";
        return "low";

      default:
        return "medium";
    }
  }

  private generateAlertMessage(rule: AlertRule, metrics: Record<string, number>): string {
    switch (rule.type) {
      case "cost_threshold":
        return `コスト閾値を超過しました: ¥${metrics.total_cost.toFixed(4)} (${rule.environment}環境)`;

      case "error_rate":
        return `エラー率が上昇しています: ${metrics.error_rate.toFixed(1)}% (${rule.environment}環境)`;

      case "response_time":
        return `応答時間が遅延しています: ${metrics.avg_response_time.toFixed(0)}ms (${rule.environment}環境)`;

      case "success_rate":
        return `成功率が低下しています: ${metrics.success_rate.toFixed(1)}% (${rule.environment}環境)`;

      case "provider_failure":
        const failingProviders = Object.keys(metrics)
          .filter(key => key.endsWith("_error_rate") && metrics[key] > 50)
          .map(key => key.replace("_error_rate", ""));
        return `プロバイダーで障害が発生しています: ${failingProviders.join(", ")} (${rule.environment}環境)`;

      default:
        return `アラートが発生しました: ${rule.name} (${rule.environment}環境)`;
    }
  }

  private shouldCheckRule(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return true;

    const now = new Date();
    const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();

    switch (rule.frequency) {
      case "immediate": return true;
      case "every_5min": return timeSinceLastTrigger >= 5 * 60 * 1000;
      case "every_15min": return timeSinceLastTrigger >= 15 * 60 * 1000;
      case "hourly": return timeSinceLastTrigger >= 60 * 60 * 1000;
      case "daily": return timeSinceLastTrigger >= 24 * 60 * 60 * 1000;
      default: return true;
    }
  }

  private async triggerAlert(alertEvent: AlertEvent): Promise<void> {
    try {
      // データベースにアラートイベントを記録
      await this.saveAlertEvent(alertEvent);

      // ルールに定義されたアクションを実行
      const rule = this.rules.get(alertEvent.ruleId);
      if (rule) {
        for (const action of rule.actions) {
          await this.executeAction(action, alertEvent);
        }
      }
    } catch (error) {
      console.error("Failed to trigger alert:", error);
    }
  }

  private async executeAction(action: AlertAction, alertEvent: AlertEvent): Promise<void> {
    try {
      switch (action.type) {
        case "email":
          await this.sendEmailAlert(action.config, alertEvent);
          break;

        case "webhook":
          await this.sendWebhookAlert(action.config, alertEvent);
          break;

        case "slack":
          await this.sendSlackAlert(action.config, alertEvent);
          break;

        case "discord":
          await this.sendDiscordAlert(action.config, alertEvent);
          break;

        case "log":
          console.warn(`ALERT: ${alertEvent.message}`, alertEvent.details);
          break;

        default:
          console.warn(`Unknown alert action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Failed to execute ${action.type} action:`, error);
    }
  }

  private async sendEmailAlert(config: any, alertEvent: AlertEvent): Promise<void> {
    // メール送信の実装（例：SendGrid、Resend等）
    console.log("Email alert would be sent:", {
      to: config.to,
      subject: `[${alertEvent.severity.toUpperCase()}] ${alertEvent.ruleName}`,
      body: alertEvent.message,
    });
  }

  private async sendWebhookAlert(config: any, alertEvent: AlertEvent): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body: JSON.stringify({
          alert: alertEvent,
          timestamp: alertEvent.triggeredAt.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Webhook alert failed:", error);
    }
  }

  private async sendSlackAlert(config: any, alertEvent: AlertEvent): Promise<void> {
    try {
      const payload = {
        text: `🚨 ${alertEvent.message}`,
        attachments: [
          {
            color: this.getSeverityColor(alertEvent.severity),
            fields: [
              {
                title: "環境",
                value: alertEvent.environment,
                short: true,
              },
              {
                title: "重要度",
                value: alertEvent.severity,
                short: true,
              },
              {
                title: "発生時刻",
                value: alertEvent.triggeredAt.toLocaleString("ja-JP"),
                short: false,
              },
            ],
          },
        ],
      };

      const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack alert failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Slack alert failed:", error);
    }
  }

  private async sendDiscordAlert(config: any, alertEvent: AlertEvent): Promise<void> {
    try {
      const payload = {
        content: `🚨 **${alertEvent.message}**`,
        embeds: [
          {
            title: alertEvent.ruleName,
            description: alertEvent.message,
            color: this.getSeverityColorDecimal(alertEvent.severity),
            fields: [
              {
                name: "環境",
                value: alertEvent.environment,
                inline: true,
              },
              {
                name: "重要度",
                value: alertEvent.severity,
                inline: true,
              },
              {
                name: "発生時刻",
                value: alertEvent.triggeredAt.toLocaleString("ja-JP"),
                inline: false,
              },
            ],
            timestamp: alertEvent.triggeredAt.toISOString(),
          },
        ],
      };

      const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord alert failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Discord alert failed:", error);
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical": return "danger";
      case "high": return "warning";
      case "medium": return "warning";
      case "low": return "good";
      default: return "warning";
    }
  }

  private getSeverityColorDecimal(severity: string): number {
    switch (severity) {
      case "critical": return 0xff0000; // 赤
      case "high": return 0xff8c00; // オレンジ
      case "medium": return 0xffff00; // 黄色
      case "low": return 0x00ff00; // 緑
      default: return 0xffff00; // 黄色
    }
  }

  private async loadAlertRules(): Promise<void> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("alert_rules")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      this.rules.clear();
      (data || []).forEach((rule: any) => {
        this.rules.set(rule.id, {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          environment: rule.environment,
          type: rule.type,
          conditions: rule.conditions,
          actions: rule.actions,
          isActive: rule.is_active,
          frequency: rule.frequency,
          lastTriggered: rule.last_triggered ? new Date(rule.last_triggered) : undefined,
          createdAt: new Date(rule.created_at),
          updatedAt: new Date(rule.updated_at),
        });
      });
    } catch (error) {
      console.error("Failed to load alert rules:", error);
    }
  }

  private async saveAlertEvent(alertEvent: AlertEvent): Promise<void> {
    try {
      const supabase = await createClient();
      await (supabase as any).from("alert_events").insert({
        rule_id: alertEvent.ruleId,
        rule_name: alertEvent.ruleName,
        severity: alertEvent.severity,
        message: alertEvent.message,
        details: alertEvent.details,
        environment: alertEvent.environment,
        triggered_at: alertEvent.triggeredAt.toISOString(),
        status: alertEvent.status,
      });
    } catch (error) {
      console.error("Failed to save alert event:", error);
    }
  }

  private async updateRuleLastTriggered(ruleId: string): Promise<void> {
    try {
      const supabase = await createClient();
      await (supabase as any)
        .from("alert_rules")
        .update({ last_triggered: new Date().toISOString() })
        .eq("id", ruleId);

      // ローカルキャッシュも更新
      const rule = this.rules.get(ruleId);
      if (rule) {
        rule.lastTriggered = new Date();
      }
    } catch (error) {
      console.error("Failed to update rule last triggered:", error);
    }
  }

  // アラートルールの管理
  async createRule(rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("alert_rules")
        .insert({
          name: rule.name,
          description: rule.description,
          environment: rule.environment,
          type: rule.type,
          conditions: rule.conditions,
          actions: rule.actions,
          is_active: rule.isActive,
          frequency: rule.frequency,
        })
        .select("id")
        .single();

      if (error) throw error;

      await this.loadAlertRules(); // キャッシュを更新
      return data.id;
    } catch (error) {
      console.error("Failed to create alert rule:", error);
      throw error;
    }
  }

  async getAlertEvents(environment?: string, limit: number = 100): Promise<AlertEvent[]> {
    try {
      const supabase = await createClient();
      let query = (supabase as any)
        .from("alert_events")
        .select("*")
        .order("triggered_at", { ascending: false })
        .limit(limit);

      if (environment) {
        query = query.eq("environment", environment);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((event: any) => ({
        id: event.id,
        ruleId: event.rule_id,
        ruleName: event.rule_name,
        severity: event.severity,
        message: event.message,
        details: event.details,
        environment: event.environment,
        triggeredAt: new Date(event.triggered_at),
        resolvedAt: event.resolved_at ? new Date(event.resolved_at) : undefined,
        status: event.status,
      }));
    } catch (error) {
      console.error("Failed to get alert events:", error);
      throw error;
    }
  }
}