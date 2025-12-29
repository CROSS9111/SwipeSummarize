# LLM運用・監視ガイド

## 概要

SwipeSummarizeアプリケーションで実装されたLLM高度機能の運用と監視に関する包括的なガイドです。フォールバック、A/Bテスト、バックアップ/リストア、アラート機能の適切な運用方法を説明します。

## 目次

1. [日常監視項目](#日常監視項目)
2. [フォールバック機能運用](#フォールバック機能運用)
3. [A/Bテスト運用](#abテスト運用)
4. [バックアップ/リストア運用](#バックアップリストア運用)
5. [アラート設定と管理](#アラート設定と管理)
6. [パフォーマンス監視](#パフォーマンス監視)
7. [コスト監視](#コスト監視)
8. [トラブルシューティング](#トラブルシューティング)
9. [定期メンテナンス](#定期メンテナンス)

---

## 日常監視項目

### 1. システム健全性チェック

#### 毎日実行すべき監視項目

**A. プロバイダー稼働状況**
```bash
# フォールバック統計確認
curl -s "/api/admin/llm-fallback?action=logs&limit=100" | jq '.stats'

# 確認項目:
# - successRate > 95%
# - fallbackUsageRate < 20%
# - 頻発するエラーパターンの有無
```

**B. A/Bテスト進捗**
```bash
# アクティブテスト一覧
curl -s "/api/admin/ab-tests?environment=production" | jq '.tests[]'

# 各テストの統計的有意性チェック
curl -s "/api/admin/ab-tests/{test-id}/analysis" | jq '.significance'
```

**C. アラート状況**
```bash
# 過去24時間のアラートイベント
curl -s "/api/admin/alerts/events?limit=50" | jq '.events[]'

# アクティブアラート数の確認
curl -s "/api/admin/alerts/events" | jq '.events[] | select(.status == "active") | length'
```

### 2. 主要メトリクス監視

#### システムパフォーマンス指標

| メトリクス | 目標値 | 警告閾値 | 緊急閾値 |
|-----------|--------|----------|----------|
| 成功率 | >98% | <95% | <90% |
| 平均応答時間 | <2秒 | >3秒 | >5秒 |
| フォールバック使用率 | <10% | >20% | >50% |
| エラー率 | <2% | >5% | >10% |
| 日次コスト | 予算内 | 予算の120% | 予算の150% |

#### 監視ダッシュボード例

```bash
#!/bin/bash
# daily-health-check.sh - 日次健全性チェックスクリプト

echo "=== SwipeSummarize LLM Health Check $(date) ==="

# 1. 基本統計
echo "## 基本統計（過去24時間）"
curl -s "/api/admin/llm-usage?hours=24" | jq '.stats | {
  totalRequests: .requestCount,
  successRate: .successRate,
  avgCost: .averageCost,
  avgResponseTime: .averageResponseTime
}'

# 2. プロバイダー別健全性
echo "## プロバイダー健全性"
curl -s "/api/admin/llm-fallback?action=health" | jq '.'

# 3. アクティブアラート
echo "## アクティブアラート"
curl -s "/api/admin/alerts/events?status=active" | jq '.events[] | {
  rule: .ruleName,
  severity: .severity,
  message: .message,
  triggeredAt: .triggeredAt
}'

echo "=== Health Check Complete ==="
```

---

## フォールバック機能運用

### 1. 設定管理

#### プロダクション推奨設定

```json
{
  "environment": "production",
  "primaryProvider": "google",
  "primaryModel": "gemini-1.5-flash",
  "fallbackProviders": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "priority": 1
    },
    {
      "provider": "anthropic",
      "model": "claude-3-haiku",
      "priority": 2
    }
  ],
  "maxRetries": 3,
  "retryDelay": 1000,
  "circuitBreakerThreshold": 5,
  "circuitBreakerResetTime": 60000
}
```

#### 設定チューニングガイド

**maxRetries (最大リトライ回数)**
- 低レイテンシが重要: 1-2回
- 高可用性が重要: 3-5回
- 注意: 高すぎると全体の応答時間が延びる

**circuitBreakerThreshold (サーキットブレーカー閾値)**
- 安定したサービス: 5回
- 不安定なサービス: 3回
- テスト環境: 10回

**circuitBreakerResetTime (リセット時間)**
- 一時的な障害想定: 60秒
- 長期障害想定: 300秒

### 2. 監視とアラート

#### 自動監視設定

```bash
# フォールバック使用率アラート設定
curl -X POST "/api/admin/alerts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高フォールバック使用率",
    "type": "provider_failure",
    "environment": "production",
    "conditions": [
      {
        "metric": "fallback_usage_rate",
        "operator": "gt",
        "value": 20,
        "timeWindow": 30
      }
    ],
    "actions": [
      {
        "type": "slack",
        "config": {
          "webhookUrl": "YOUR_WEBHOOK",
          "channel": "#ops-alerts"
        }
      }
    ],
    "frequency": "immediate"
  }'
```

#### 手動健全性チェック

```bash
# プロバイダー健全性状況確認
curl -s "/api/admin/llm-fallback?action=health" | jq '.providers'

# 特定プロバイダーの手動リセット
curl -X POST "/api/admin/llm-fallback/reset" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "model": "gemini-1.5-flash"
  }'
```

### 3. トラブルシューティング

#### よくある問題と対処法

**問題1: プライマリプロバイダーが復旧後もフォールバックが続く**
```bash
# 原因調査
curl -s "/api/admin/llm-fallback?action=logs&limit=20" | \
  jq '.logs[] | select(.primary_provider == "google") | .error_message'

# 対処法: 手動リセット
curl -X POST "/api/admin/llm-fallback/reset" \
  -d '{"provider":"google","model":"gemini-1.5-flash"}'
```

**問題2: サーキットブレーカーが頻繁に発火**
```bash
# 閾値を一時的に緩和
curl -X POST "/api/admin/llm-fallback" \
  -d '{
    "circuitBreakerThreshold": 10,
    "circuitBreakerResetTime": 30000
  }'
```

---

## A/Bテスト運用

### 1. テスト計画と設計

#### テスト設計のベストプラクティス

**A. サンプルサイズ計算**
```javascript
// 統計的有意性を得るための最小サンプルサイズ
function calculateSampleSize(baselineConversion, minimumDetectableEffect, alpha = 0.05, power = 0.8) {
  // 簡易計算式
  const z_alpha = 1.96; // 95%信頼区間
  const z_beta = 0.84;  // 80%検出力

  const p1 = baselineConversion;
  const p2 = p1 * (1 + minimumDetectableEffect);

  const n = Math.pow(z_alpha + z_beta, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / Math.pow(p1 - p2, 2);

  return Math.ceil(n);
}

// 例: ベースライン5%改善を検出するためのサンプル数
const sampleSize = calculateSampleSize(0.1, 0.05); // 約1,570サンプル
```

**B. テスト期間設定**
```javascript
// 必要なテスト期間計算
function calculateTestDuration(sampleSize, dailyTraffic) {
  const daysNeeded = Math.ceil(sampleSize * 2 / dailyTraffic); // 2グループ分
  const businessDaysNeeded = Math.ceil(daysNeeded / 0.7); // 週末考慮

  return {
    calendarDays: daysNeeded,
    businessDays: businessDaysNeeded,
    recommendedDuration: Math.max(businessDaysNeeded, 14) // 最低2週間
  };
}
```

#### 実際のテスト作成例

```bash
# コスト最適化A/Bテスト
curl -X POST "/api/admin/ab-tests" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "コスト最適化テスト Q1 2025",
    "description": "Gemini Flash vs GPT-4o Mini コスト効率比較",
    "environment": "production",
    "variants": [
      {
        "id": "control_gemini",
        "name": "Gemini 1.5 Flash (制御群)",
        "config": {
          "provider": "google",
          "model": "gemini-1.5-flash",
          "temperature": 0.7,
          "maxTokens": 1000
        },
        "weight": 50
      },
      {
        "id": "test_gpt4o_mini",
        "name": "GPT-4o Mini (テスト群)",
        "config": {
          "provider": "openai",
          "model": "gpt-4o-mini",
          "temperature": 0.7,
          "maxTokens": 1000
        },
        "weight": 50
      }
    ],
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z",
    "metrics": {
      "primaryMetric": "cost",
      "trackMetrics": ["cost", "speed", "success_rate"],
      "sampleSize": 2000,
      "confidenceLevel": 95
    }
  }'
```

### 2. テスト監視

#### 日次監視項目

```bash
#!/bin/bash
# ab-test-monitor.sh - A/Bテスト日次監視スクリプト

ACTIVE_TESTS=$(curl -s "/api/admin/ab-tests?environment=production" | jq -r '.tests[] | select(.is_active == true) | .id')

for TEST_ID in $ACTIVE_TESTS; do
    echo "=== Test ID: $TEST_ID ==="

    # 基本統計
    curl -s "/api/admin/ab-tests/$TEST_ID/analysis" | jq '{
      testName: .testName,
      sampleSize: .sampleSize,
      significance: .significance.isSignificant,
      pValue: .significance.pValue,
      recommendation: .recommendation
    }'

    # バリアント別詳細
    curl -s "/api/admin/ab-tests/$TEST_ID/analysis" | jq '.variantStats'

    echo ""
done
```

#### 早期停止判定

```bash
# 統計的有意性チェック
check_early_stopping() {
    local test_id=$1
    local analysis=$(curl -s "/api/admin/ab-tests/$test_id/analysis")

    local is_significant=$(echo $analysis | jq -r '.significance.isSignificant')
    local sample_size=$(echo $analysis | jq -r '.sampleSize')
    local target_size=$(echo $analysis | jq -r '.targetSampleSize')

    if [ "$is_significant" == "true" ] && [ "$sample_size" -gt $((target_size / 2)) ]; then
        echo "Early stopping candidate: $test_id"
        echo "Reason: Statistical significance achieved with sufficient sample size"
    fi
}
```

### 3. テスト分析と解釈

#### 統計的分析

```bash
# 詳細な分析レポート取得
curl -s "/api/admin/ab-tests/{test-id}/analysis" | jq '{
  summary: {
    testName: .testName,
    duration: (.dataCollectedAt | strptime("%Y-%m-%dT%H:%M:%SZ") | todateiso8601),
    totalSamples: .sampleSize,
    isSignificant: .significance.isSignificant,
    confidenceLevel: .significance.confidenceLevel,
    winner: (.recommendation | match("バリアント (\\w+)") | .captures[0].string)
  },
  variantComparison: .variantStats,
  recommendation: .recommendation
}'
```

#### 結果の解釈ガイド

**統計的有意性の判定**
- p値 < 0.05: 統計的に有意
- 信頼区間が0を含まない: 有意な差あり
- サンプルサイズが計画値の80%以上: 信頼性が高い

**実用的意味の判定**
- コスト差: >10%の改善で実用的意味あり
- 応答時間差: >20%の改善で実用的意味あり
- 成功率差: >2%の改善で実用的意味あり

---

## バックアップ/リストア運用

### 1. バックアップ戦略

#### 自動バックアップスケジュール

**週次バックアップ（推奨）**
```bash
#!/bin/bash
# weekly-backup.sh - 週次自動バックアップ

ENVIRONMENTS=("production" "staging")
DATE=$(date +%Y%m%d)

for ENV in "${ENVIRONMENTS[@]}"; do
    echo "Creating backup for $ENV environment..."

    BACKUP_ID=$(curl -s -X POST "/api/admin/backup" \
        -H "Content-Type: application/json" \
        -d '{
            "environment": "'$ENV'",
            "options": {
                "includeUsageData": true,
                "includeAbTests": true,
                "includeFallbackConfigs": true,
                "dateRange": {
                    "start": "'$(date -d '7 days ago' --iso-8601)'",
                    "end": "'$(date --iso-8601)'"
                }
            },
            "creator": "auto-backup-system",
            "description": "Weekly automated backup '$DATE'"
        }' | jq -r '.id')

    if [ "$BACKUP_ID" != "null" ]; then
        echo "Backup created: $BACKUP_ID"

        # バックアップの検証
        sleep 5
        BACKUP_STATUS=$(curl -s "/api/admin/backup/$BACKUP_ID" | jq -r '.backup.metadata.hash')
        echo "Backup hash: $BACKUP_STATUS"
    else
        echo "Failed to create backup for $ENV"
        exit 1
    fi
done
```

#### メンテナンス前バックアップ

```bash
# maintenance-backup.sh - メンテナンス前の完全バックアップ
create_maintenance_backup() {
    local description="Pre-maintenance backup $(date)"

    curl -X POST "/api/admin/backup" \
        -H "Content-Type: application/json" \
        -d '{
            "environment": "production",
            "options": {
                "includeUsageData": true,
                "includeAbTests": true,
                "includeFallbackConfigs": true,
                "dateRange": {
                    "start": "'$(date -d '30 days ago' --iso-8601)'",
                    "end": "'$(date --iso-8601)'"
                },
                "maxUsageRecords": 50000
            },
            "creator": "maintenance-admin",
            "description": "'$description'"
        }'
}
```

### 2. リストア運用

#### ドライラン検証

```bash
# リストア前のドライラン
perform_restore_dryrun() {
    local backup_id=$1

    echo "Performing dry-run restore for backup: $backup_id"

    local result=$(curl -s -X POST "/api/admin/backup/$backup_id/restore" \
        -H "Content-Type: application/json" \
        -d '{
            "options": {
                "dryRun": true,
                "validateBeforeRestore": true
            }
        }')

    echo $result | jq '{
        success: .success,
        validationResult: .report,
        warnings: .warnings
    }'
}
```

#### 段階的リストア

```bash
# 段階的リストア手順
staged_restore() {
    local backup_id=$1

    echo "Stage 1: Validation"
    perform_restore_dryrun $backup_id

    read -p "Continue with restore? (y/N): " confirmation
    if [ "$confirmation" != "y" ]; then
        echo "Restore cancelled"
        return 1
    fi

    echo "Stage 2: Actual restore"
    curl -X POST "/api/admin/backup/$backup_id/restore" \
        -H "Content-Type: application/json" \
        -d '{
            "options": {
                "overwriteExisting": false,
                "validateBeforeRestore": true,
                "dryRun": false
            }
        }'
}
```

---

## アラート設定と管理

### 1. 推奨アラートルール

#### 基本的なアラート設定

```bash
# 1. コスト閾値アラート
curl -X POST "/api/admin/alerts" -d '{
    "name": "日次コスト閾値超過",
    "type": "cost_threshold",
    "environment": "production",
    "conditions": [{
        "metric": "total_cost",
        "operator": "gt",
        "value": 50.0,
        "timeWindow": 1440,
        "aggregation": "sum"
    }],
    "actions": [{
        "type": "slack",
        "config": {"webhookUrl": "YOUR_WEBHOOK"}
    }],
    "frequency": "daily"
}'

# 2. エラー率アラート
curl -X POST "/api/admin/alerts" -d '{
    "name": "高エラー率アラート",
    "type": "error_rate",
    "environment": "production",
    "conditions": [{
        "metric": "error_rate",
        "operator": "gt",
        "value": 5.0,
        "timeWindow": 15,
        "aggregation": "avg"
    }],
    "actions": [{
        "type": "slack",
        "config": {"webhookUrl": "YOUR_WEBHOOK"}
    }],
    "frequency": "immediate"
}'

# 3. 応答時間アラート
curl -X POST "/api/admin/alerts" -d '{
    "name": "応答時間劣化アラート",
    "type": "response_time",
    "environment": "production",
    "conditions": [{
        "metric": "avg_response_time",
        "operator": "gt",
        "value": 3000,
        "timeWindow": 30,
        "aggregation": "avg"
    }],
    "actions": [{
        "type": "slack",
        "config": {"webhookUrl": "YOUR_WEBHOOK"}
    }],
    "frequency": "every_15min"
}'
```

### 2. アラート階層化

#### 重要度レベル別設定

**Critical (緊急)**
- サービス停止レベル
- 即座に対応が必要
- 複数チャネルに通知

```json
{
  "name": "サービス停止アラート",
  "severity": "critical",
  "conditions": [
    {"metric": "success_rate", "operator": "lt", "value": 50}
  ],
  "actions": [
    {"type": "slack", "config": {"channel": "#critical-alerts"}},
    {"type": "email", "config": {"to": ["oncall@company.com"]}},
    {"type": "webhook", "config": {"url": "https://pagerduty.com/webhook"}}
  ]
}
```

**High (高)**
- 性能劣化レベル
- 1時間以内に対応

**Medium (中)**
- 監視対象の異常値
- 営業時間内対応

**Low (低)**
- 情報提供レベル
- 日次レビューで確認

### 3. アラート疲労対策

#### 頻度制御

```bash
# アラートルールの頻度最適化
optimize_alert_frequency() {
    local rule_id=$1

    # 過去30日のアラート発火頻度を分析
    local fire_count=$(curl -s "/api/admin/alerts/events?rule_id=$rule_id" | \
        jq '[.events[] | select(.triggered_at | strptime("%Y-%m-%dT%H:%M:%SZ") > (now - 30*24*3600))] | length')

    if [ $fire_count -gt 50 ]; then
        echo "Rule $rule_id fires too frequently ($fire_count times in 30 days)"
        echo "Consider adjusting thresholds or frequency"
    fi
}
```

#### グループ化とサマリー

```bash
# 関連アラートのグループ化
create_alert_summary() {
    local timeframe="1 hour ago"

    curl -s "/api/admin/alerts/events?since=$timeframe" | jq '
        .events | group_by(.ruleName) | map({
            ruleName: .[0].ruleName,
            count: length,
            latestSeverity: (max_by(.severity) | .severity),
            environments: [.[].environment] | unique
        })
    '
}
```

---

## パフォーマンス監視

### 1. レスポンス時間監視

#### 詳細分析クエリ

```sql
-- プロバイダー別レスポンス時間分析
SELECT
    provider,
    model,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time
FROM llm_usage
WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND status = 'success'
GROUP BY provider, model, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, avg_response_time DESC;
```

#### 性能劣化の検出

```bash
# 性能劣化自動検出
detect_performance_degradation() {
    local current_avg=$(curl -s "/api/admin/llm-usage?hours=1" | jq '.stats.avgResponseTime')
    local baseline_avg=$(curl -s "/api/admin/llm-usage?hours=24" | jq '.stats.avgResponseTime')

    local degradation=$(echo "scale=2; ($current_avg - $baseline_avg) / $baseline_avg * 100" | bc)

    if (( $(echo "$degradation > 20" | bc -l) )); then
        echo "Performance degradation detected: ${degradation}% slower than 24h baseline"

        # 詳細調査用データ取得
        curl -s "/api/admin/llm-fallback?action=logs&limit=50" | \
            jq '.logs[] | select(.success == false) | .error_message'
    fi
}
```

### 2. スループット監視

#### リクエスト量分析

```bash
# 時間別リクエスト量分析
analyze_request_volume() {
    curl -s "/api/admin/llm-usage?hours=24&group_by=hour" | \
        jq '.stats[] | {
            hour: .hour,
            requests: .requestCount,
            avg_cost_per_request: .totalCost / .requestCount,
            success_rate: .successCount / .requestCount * 100
        }'
}
```

### 3. リソース使用率

#### トークン効率監視

```sql
-- トークン効率分析
SELECT
    provider,
    model,
    AVG(input_tokens) as avg_input_tokens,
    AVG(output_tokens) as avg_output_tokens,
    AVG(total_tokens) as avg_total_tokens,
    AVG(estimated_cost / total_tokens * 1000) as cost_per_1k_tokens,
    AVG(response_time_ms / total_tokens) as ms_per_token
FROM llm_usage
WHERE created_at >= NOW() - INTERVAL '7 days'
    AND status = 'success'
    AND total_tokens > 0
GROUP BY provider, model
ORDER BY cost_per_1k_tokens ASC;
```

---

## コスト監視

### 1. コスト分析ダッシュボード

#### 日次コストレポート

```bash
#!/bin/bash
# daily-cost-report.sh

echo "=== Daily LLM Cost Report $(date +%Y-%m-%d) ==="

# 今日のコスト
TODAY_COST=$(curl -s "/api/admin/llm-usage?date=$(date +%Y-%m-%d)" | jq '.stats.totalCost')
YESTERDAY_COST=$(curl -s "/api/admin/llm-usage?date=$(date -d yesterday +%Y-%m-%d)" | jq '.stats.totalCost')

echo "Today's cost: \$${TODAY_COST}"
echo "Yesterday's cost: \$${YESTERDAY_COST}"
echo "Change: $(echo "scale=2; ($TODAY_COST - $YESTERDAY_COST) / $YESTERDAY_COST * 100" | bc)%"

# プロバイダー別コスト
echo -e "\n## Provider Breakdown"
curl -s "/api/admin/llm-usage?date=$(date +%Y-%m-%d)&group_by=provider" | \
    jq -r '.stats[] | "\(.provider): $\(.totalCost) (\(.requestCount) requests)"'

# 異常な高コストリクエスト
echo -e "\n## High Cost Requests (>$0.10)"
curl -s "/api/admin/llm-usage?date=$(date +%Y-%m-%d)" | \
    jq '.requests[] | select(.estimatedCost > 0.10) | {
        cost: .estimatedCost,
        tokens: .totalTokens,
        provider: .provider,
        timestamp: .createdAt
    }'
```

### 2. 予算管理

#### 予算アラート設定

```bash
# 月次予算監視
setup_budget_alerts() {
    local monthly_budget=1000  # $1000/月の予算

    # 日次予算チェック（月予算の1/30）
    local daily_threshold=$(echo "scale=2; $monthly_budget / 30" | bc)

    curl -X POST "/api/admin/alerts" -d '{
        "name": "日次予算超過警告",
        "type": "cost_threshold",
        "conditions": [{
            "metric": "daily_cost",
            "operator": "gt",
            "value": '$daily_threshold',
            "timeWindow": 1440
        }],
        "frequency": "daily"
    }'

    # 週次予算チェック（月予算の25%）
    local weekly_threshold=$(echo "scale=2; $monthly_budget * 0.25" | bc)

    curl -X POST "/api/admin/alerts" -d '{
        "name": "週次予算超過警告",
        "type": "cost_threshold",
        "conditions": [{
            "metric": "weekly_cost",
            "operator": "gt",
            "value": '$weekly_threshold',
            "timeWindow": 10080
        }],
        "frequency": "weekly"
    }'
}
```

### 3. コスト最適化

#### 自動最適化推奨

```bash
# コスト最適化分析
analyze_cost_optimization() {
    echo "=== Cost Optimization Analysis ==="

    # プロバイダー別コスト効率
    curl -s "/api/admin/llm-usage?days=7" | jq '
        .stats | group_by(.provider) | map({
            provider: .[0].provider,
            total_cost: (map(.totalCost) | add),
            total_requests: (map(.requestCount) | add),
            avg_cost_per_request: ((map(.totalCost) | add) / (map(.requestCount) | add)),
            success_rate: ((map(.successCount) | add) / (map(.requestCount) | add) * 100)
        }) | sort_by(.avg_cost_per_request)
    '

    # A/Bテストが活用可能な場面を特定
    echo -e "\n## A/B Test Opportunities"
    echo "Consider testing providers with similar success rates but different costs"
}
```

---

## トラブルシューティング

### 1. 共通問題と解決法

#### 問題: フォールバック機能が動作しない

**症状**
- プライマリプロバイダー失敗時にエラーが返される
- フォールバック設定が反映されない

**調査手順**
```bash
# 1. フォールバック設定確認
curl -s "/api/admin/llm-fallback?environment=production" | jq '.config'

# 2. 最近のフォールバックログ確認
curl -s "/api/admin/llm-fallback?action=logs&limit=10" | jq '.logs'

# 3. プロバイダー健全性確認
curl -s "/api/admin/llm-fallback?action=health"
```

**解決方法**
```bash
# 設定の再適用
curl -X POST "/api/admin/llm-fallback" -d '{
    "environment": "production",
    "primaryProvider": "google",
    "fallbackProviders": [...]
}'

# サーキットブレーカーのリセット
curl -X POST "/api/admin/llm-fallback/reset" -d '{
    "provider": "google",
    "model": "gemini-1.5-flash"
}'
```

#### 問題: A/Bテストで偏ったトラフィック分割

**症状**
- 50:50の設定なのに70:30の分割になる
- 特定バリアントにトラフィックが集中

**調査手順**
```bash
# テスト設定確認
curl -s "/api/admin/ab-tests/{test-id}" | jq '.test.traffic_split'

# 実際の分割比確認
curl -s "/api/admin/ab-tests/{test-id}/analysis" | jq '.variantStats | to_entries | map({variant: .key, samples: .value.sampleSize})'
```

**解決方法**
```bash
# セッション割り当てロジックの確認
# ハッシュ関数の偏りがある可能性

# テスト設定の更新
curl -X PUT "/api/admin/ab-tests" -d '{
    "id": "test-id",
    "trafficSplit": {"variant_a": 50, "variant_b": 50}
}'
```

#### 問題: アラートが発火しない

**症状**
- 閾値を超えてもアラートが送信されない
- アラートルールがアクティブにならない

**調査手順**
```bash
# アラートルール確認
curl -s "/api/admin/alerts" | jq '.rules[] | select(.isActive == true)'

# 手動でアラートチェック実行
curl -X POST "/api/admin/alerts/check" | jq '.'

# 最近のアラートイベント確認
curl -s "/api/admin/alerts/events?limit=10" | jq '.events'
```

### 2. ログ分析

#### エラーパターン分析

```bash
# エラーメッセージの傾向分析
analyze_error_patterns() {
    curl -s "/api/admin/llm-fallback?action=logs&limit=500" | \
        jq '.logs[] | select(.success == false) | .error_message' | \
        sort | uniq -c | sort -nr
}

# プロバイダー別エラー率
analyze_provider_errors() {
    curl -s "/api/admin/llm-usage?days=1" | jq '
        .stats | group_by(.provider) | map({
            provider: .[0].provider,
            error_rate: (map(.errorCount) | add) / (map(.requestCount) | add) * 100,
            most_common_error: (map(.errors) | flatten | group_by(.) | max_by(length)[0])
        })
    '
}
```

### 3. 緊急時対応

#### サービス停止時の対応手順

```bash
#!/bin/bash
# emergency-response.sh

echo "=== EMERGENCY RESPONSE PROCEDURE ==="

# 1. 即座にフォールバックを最も安定したプロバイダーに変更
curl -X POST "/api/admin/llm-fallback" -d '{
    "environment": "production",
    "primaryProvider": "openai",
    "primaryModel": "gpt-4o-mini",
    "fallbackProviders": [],
    "maxRetries": 1,
    "circuitBreakerThreshold": 1
}'

# 2. すべてのA/Bテストを無効化
ACTIVE_TESTS=$(curl -s "/api/admin/ab-tests?environment=production" | jq -r '.tests[] | select(.is_active == true) | .id')
for TEST_ID in $ACTIVE_TESTS; do
    curl -X PUT "/api/admin/ab-tests" -d '{
        "id": "'$TEST_ID'",
        "isActive": false
    }'
done

# 3. 緊急アラートを送信
curl -X POST "/api/admin/alerts/events" -d '{
    "severity": "critical",
    "message": "Emergency procedure activated",
    "details": {"timestamp": "'$(date -Iseconds)'", "action": "manual_intervention"}
}'

echo "Emergency response completed"
```

---

## 定期メンテナンス

### 1. 週次メンテナンス

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Maintenance $(date) ==="

# 1. バックアップ作成
echo "Creating weekly backup..."
BACKUP_ID=$(create_weekly_backup)

# 2. 古いログのクリーンアップ
echo "Cleaning up old logs..."
cleanup_old_logs

# 3. A/Bテストレビュー
echo "Reviewing A/B tests..."
review_ab_tests

# 4. アラート設定最適化
echo "Optimizing alert rules..."
optimize_alert_rules

# 5. パフォーマンス分析
echo "Generating performance report..."
generate_weekly_performance_report

echo "Weekly maintenance completed"
```

### 2. 月次メンテナンス

```bash
#!/bin/bash
# monthly-maintenance.sh

# 1. コスト分析と予算レビュー
analyze_monthly_costs

# 2. プロバイダー契約レビュー
review_provider_contracts

# 3. セキュリティ設定確認
audit_security_settings

# 4. キャパシティプランニング
plan_capacity_requirements

# 5. バックアップの長期保存
archive_old_backups
```

### 3. 四半期メンテナンス

```bash
#!/bin/bash
# quarterly-maintenance.sh

# 1. 全体的なアーキテクチャレビュー
review_architecture

# 2. 新プロバイダー評価
evaluate_new_providers

# 3. SLA/SLOの見直し
review_sla_slo

# 4. 災害復旧テスト
test_disaster_recovery

# 5. 設定の包括的監査
audit_all_configurations
```

---

## 監視データ保持ポリシー

### データ保持期間

| データ種類 | 保持期間 | 理由 |
|-----------|---------|------|
| フォールバックログ | 90日 | トラブルシューティング用 |
| A/Bテスト結果 | 1年 | 長期トレンド分析用 |
| アラートイベント | 6ヶ月 | パターン分析用 |
| バックアップファイル | 1年 | 規制要件・災害復旧用 |
| 使用量データ | 2年 | コスト分析・プランニング用 |

### 自動削除設定

```sql
-- 古いデータの自動削除 (Supabaseクロンジョブで実行)
SELECT cron.schedule('cleanup-old-logs', '0 2 * * 0', $$
    DELETE FROM llm_fallback_logs WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM alert_events WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '180 days';
    DELETE FROM ab_test_results WHERE created_at < NOW() - INTERVAL '1 year';
$$);
```

---

このガイドを参考に、適切なLLMシステム監視と運用を実施してください。定期的な見直しと改善により、安定性とコスト効率を両立できます。