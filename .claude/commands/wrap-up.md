---
description: 開発のひと段落（マイルストーン）において、品質チェック、整合性確認、リリース準備を一括で行います。
---

# Wrap-up Assistant (/wrap-up)

`/wrap-up` は、開発作業がひと段落した際（PR作成前やリリース前）に使用する「仕上げ」用コマンドです。
プロジェクト全体の整合性を確認し、品質を担保した状態で作業を完了させます。

## 実行方法

```bash
/wrap-up
```

オプション付き実行:

```bash
/wrap-up --spec {feature-name}  # 特定のSpecから昇格
/wrap-up --skip-tests           # テストスキップ（緊急時のみ）
```

## 実行プロセス

このコマンドは、以下のステップを標準フローとして実行します。

---

### Step 0. Spec検出 (自動)

**実行内容**:

1. `.claude/specs/` ディレクトリをスキャン
2. `Status: Implementation` または `Status: Review` の設計書を検出
3. 検出されたSpecを一覧表示

**出力例**:

```text
📋 検出されたSpec:
  1. staff-export (Status: Implementation, Updated: 2025-11-27)
  2. user-profile-edit (Status: Review, Updated: 2025-11-25)

昇格対象のSpecを選択してください [1/2/all/skip]: _
```

---

### Step 1. 影響範囲と整合性チェック (`/check-impact`)

- コード変更による影響範囲を分析します。
- ドキュメントの更新漏れがないか確認します。
- テストの不足がないか確認します。
- **Action**: 問題があれば、修正を促します（`/doc-update` 等の案内）。

---

### Step 2. コード品質チェック (`/code-review`)

- 静的解析レベルの問題や、プロジェクトのコーディング規約違反がないかチェックします。
- セキュリティリスクがないか確認します。

---

### Step 3. 結合テスト実行 (`/test-backend-integration`)

- （オプション）バックエンドの結合テストを実行し、システム全体の動作を確認します。

---

### Step 4. ドキュメント昇格 (Document Promotion)

**実行内容**:
選択されたSpecの `design.md` を解析し、`docs/` への昇格を実行します。

#### 4.1 昇格チェックリスト検証

設計書の「Section 10. 昇格チェックリスト」を読み込み、各項目を検証:

```text
📋 昇格チェックリスト検証 (staff-export)

必須項目:
  ✅ 機能要件 → docs/functional_requirements.md
     - 機能ID: F-028 (自動採番)
     - 機能名: スタッフCSVエクスポート

  ✅ API仕様 → docs/api/staff_export_apis.md
     - エンドポイント: 2件
     - フォーマット: OK

  ✅ API一覧更新 → docs/api/README.md
     - 総数: 29 → 31

条件付き項目:
  ✅ サービス層 → docs/design/service_layer_design.md
     - 新規Service: ExportService

  ✅ データベース → docs/database/schema/export_tasks.md
     - 新規テーブル: export_tasks

  ⬜ フロントエンド → (該当なし)

  ⬜ シーケンス図 → (該当なし)

検証項目:
  ✅ 全テストがパス
  ✅ コードレビュー完了
  ⚠️ セキュリティチェック: 未実施

続行しますか? [Y/n]: _
```

#### 4.2 昇格実行

ユーザー承認後、以下の処理を自動実行:

##### A. 機能要件追加 (`docs/functional_requirements.md`)

```markdown
<!-- 自動追記 -->
| F-028 | スタッフCSVエクスポート | スタッフ一覧をCSV形式でエクスポート | POST /api/v1/staff/export | frontend/src/app/staff/export | ✅ 実装済み | Azure Blob Storage, 非同期タスク |
```

##### B. API仕様書作成 (`docs/api/staff_export_apis.md`)

- design.md Section 2 の内容を抽出
- 既存API仕様書フォーマットに自動整形
- ヘッダー・フッター追加

##### C. API一覧更新 (`docs/api/README.md`)

- エンドポイント総数更新
- 新規APIへのリンク追加

##### D. サービス層追記 (`docs/design/service_layer_design.md`)

- design.md Section 3 の内容を適切なセクションに追記
- 目次更新

##### E. データベーススキーマ作成 (`docs/database/schema/export_tasks.md`)

- design.md Section 4 の内容を抽出
- 既存スキーマ文書フォーマットに整形

##### F. 相互参照追加

各昇格先ドキュメントに実装履歴を追記:

```markdown
**実装履歴**: Spec `.claude/specs/staff-export/` (2025-11-27)
```

design.md に昇格完了マークを追記します。

#### 4.3 昇格結果表示

```text
📋 ドキュメント昇格完了 (staff-export)

昇格されたドキュメント:
  ✅ docs/functional_requirements.md (F-028追加)
  ✅ docs/api/staff_export_apis.md (新規作成)
  ✅ docs/api/README.md (エンドポイント数更新: 29→31)
  ✅ docs/design/service_layer_design.md (ExportService追加)
  ✅ docs/database/schema/export_tasks.md (新規作成)

Spec Status更新:
  .claude/specs/staff-export/design.md
    Status: Implementation → Merged

次のステップ:
  1. 昇格されたドキュメントを確認してください
  2. 問題なければ Step 5 (リリース準備) に進みます
```

---

### Step 5. リリース準備 (`/release-draft`)

- ここまでの変更内容をまとめ、リリースノートのドラフトを作成します。
- 次のアクション（PR作成やデプロイ手順）をガイドします。

---

## 昇格ルール

### 昇格先マッピング

| design.md セクション | 昇格先 | 条件 |
|---------------------|--------|------|
| Section 1 (概要) | `docs/functional_requirements.md` | 常に |
| Section 2 (API設計) | `docs/api/{feature}_apis.md` | 新規API有り |
| Section 3 (サービス層) | `docs/design/service_layer_design.md` | 新規Service有り |
| Section 4 (データベース) | `docs/database/schema/{table}.md` | 新規テーブル有り |
| Section 5 (フロントエンド) | `docs/design/detailed_design/frontend/` | 新規コンポーネント有り |
| Section 6 (エラーハンドリング) | `docs/design/service_layer_design.md` | 新規例外有り |
| Section 7 (テスト) | `docs/testing/{category}/` | テストケース有り |
| Section 8 (シーケンス図) | `docs/design/detailed_design/sequence_diagrams/` | 図表有り |

### フォーマット変換ルール

**API仕様書変換**:

- design.md の簡易形式 → `docs/api/` の詳細形式
- Pydantic Model → JSON Schema形式も併記
- セキュリティ情報を表形式に変換

**サービス層変換**:

- クラス設計をdocstring付きで整形
- 依存関係図を追加
- 既存パターンへの参照リンク維持

---

## Spec ステータス管理

| Status | 説明 | 次のステータス |
|--------|------|--------------|
| Draft | 設計中 | Review |
| Review | レビュー中 | Implementation |
| Implementation | 実装中 | Merged |
| Merged | 昇格完了 | (アーカイブ対象) |

### アーカイブポリシー

`Status: Merged` のSpecは以下のタイミングでアーカイブ:

- 昇格完了から3ヶ月経過
- または手動で `/spec-archive {feature-name}` 実行

アーカイブ先: `.claude/specs/archive/{feature-name}-{date}/`

---

## 使用例

```bash
# 標準実行（全Spec対象）
/wrap-up

# 特定Specのみ昇格
/wrap-up --spec staff-export

# テストスキップ（緊急時のみ）
/wrap-up --skip-tests

# 昇格のみ実行（他のチェックスキップ）
/wrap-up --promotion-only
```

---

## トラブルシューティング

### 昇格が失敗する場合

#### エラー: 昇格チェックリストが未完了

```text
❌ 昇格チェックリスト検証失敗
   - API仕様: Section 2が空です
   - テスト: 全テストがパスしていません

解決方法:
  1. design.md Section 2 を記入してください
  2. pytest を実行してテストをパスさせてください
```

#### エラー: フォーマット変換失敗

```text
❌ フォーマット変換失敗
   - docs/api/staff_export_apis.md: Pydantic Modelの解析に失敗

解決方法:
  1. design.md Section 2.2 のPydantic Modelを確認してください
  2. 構文エラーがないか確認してください
```

### 昇格を取り消す場合

```bash
# 直前の昇格を取り消し
git checkout HEAD~1 -- docs/

# 特定ファイルのみ取り消し
git checkout HEAD~1 -- docs/api/staff_export_apis.md
```
