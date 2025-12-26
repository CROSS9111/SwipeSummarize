# Spec Implement Command

`/spec` で作成された統合設計書 (`design.md`) を読み込み、定義されたタスクを順次実行して実装を進めるためのコマンドです。

## Usage

```bash
/spec-implement <feature-name> [task-id]
```

## 実装フローの特徴

### 設計書駆動実装 (Design-Driven Implementation)

- **Design.md が唯一の正解**: 常に `docs/specs/{feature-name}/design.md` を参照源とする
- **セクション自動マッピング**: タスクの種類に応じて、参照すべき設計セクション（API定義、バリデーションルール等）を自動特定する
- **タスク自動分解**: design.md の設計内容から実装タスクを自動提案・管理する

### コア原則

- **Atomic Implementation**: 1回の実行につき、1つのタスクのみを行う
- **TDD First**: 実装タスクの前に、対応するテストタスクの完了を推奨・確認する
- **Human-in-the-Loop**: コード生成後、必ずユーザーの承認を得てからファイルを保存/確定する
- **Strict Compliance**: `docs/development/` 配下のコーディング規約を厳守する

### 参照ドキュメント

> 📋 **実装時は以下を必ず参照してください**
>
> - **設計書**: `docs/specs/{feature-name}/design.md` (マスター)
> - **コーディング規約**: `docs/development/coding-standards-index.md`
> - **バリデーション**: `docs/development/validation-rules.md`
> - **型定義**: プロジェクトの既存型定義 (`backend/app/schemas/`, `frontend/types/`)

---

## 完全ワークフローシーケンス

**重要**: タスク実行時は以下のステップを順守してください。

### Step 1: コンテキストロード & タスク特定

1. **design.md の読み込み**:

   ```text
   docs/specs/{feature-name}/design.md
   ```

2. **タスクの特定**:

   - `task-id` 指定あり: そのタスクを選択
   - `task-id` 指定なし: 以下の優先順位でタスクを特定
     1. design.md 内に「実装タスク」セクションがあればそこから取得
     2. なければ設計内容（API設計、データモデル等）から自動分解して提案

3. **タスク状態の表示**:

   ```text
   📋 現在のタスク: [T-03] APIルーター実装
   状態: 🔄 実行中 (依存タスク T-01, T-02 完了済み)
   参照セクション: Section 2 (API), Section 4 (Logic)
   ```

### Step 2: 依存関係とTDDチェック

実装に入る前に、前提条件を確認します。

- **依存タスクチェック**: 前のタスク（例: Schema定義）が完了しているか？

- **TDDチェック**:

  - 実装タスク（例: Function実装）の場合、対応するテストタスクが完了しているか確認。
  - 未完了の場合、警告を表示。

  ```text
  ⚠️ **TDD Alert**: この実装に対応するテスト(T-05)がまだ作成されていません。
  推奨: 先に `/spec-implement {feature} T-05` を実行してテストを作成しますか？
  ```

### Step 3: コード生成 & 実装

指定されたタスクを実行します。

1. **関連セクションの抽出**:

   - Pydantic実装 → `Section 3: データモデル` を参照
   - API実装 → `Section 2: API設計` と `Section 4: 権限設計` を参照
   - UI実装 → `Section 7: フロントエンド設計` を参照

2. **コード生成**:

   - 既存コードのスタイル（インデント、命名規則）に合わせる
   - **重要**: `design.md` に記載された制約（文字数、必須チェック）をコードに反映させる

3. **ユーザー確認**:

   - 生成されたコードを提示し、適用して良いか確認する。

### Step 4: テスト実行 (Optional but Recommended)

環境が許す場合（ターミナルアクセスがある場合）、関連するテストを実行して品質を保証します。

```bash
# Backend
pytest backend/tests/unit/test_{feature}.py

# Frontend
npm run test -- {component}
```

### Step 5: ドキュメント更新

実装とテストが成功した場合、進捗を記録します。

1. **タスク完了の記録**:

   - design.md に「実装タスク」セクションがあれば更新
   - なければ「実装メモ」セクションに完了タスクを追記

   ```markdown
   ### 完了タスク
   - [x] T-03: APIルーター実装 (2024-12-01)
   ```

2. **次アクションの提案**:

   - 次のタスクを表示

---

## タスクタイプ別 参照ガイド

AIはタスクの内容に基づき、`design.md` の以下のセクションを重点的に読み込みます。

| タスク種別 | 重点参照セクション | 実装のポイント |
|:---|:---|:---|
| **Schema / Type** | API設計（リクエスト/レスポンス定義）、サービス層設計 | バリデーションルール、必須/任意、Enum定義の完全一致 |
| **Service / Logic** | サービス層設計、エラーハンドリング | 認可チェック(`current_user`)、ビジネスロジック、トランザクション管理 |
| **API Router** | API設計、エラーハンドリング | パスパラメータ、ステータスコード、エラーレスポンス形式 |
| **Frontend UI** | フロントエンド設計、API設計（バリデーション） | コンポーネント分割、React Hook Form等のバリデーション連携 |
| **Test** | テスト戦略（テストケース一覧） | 正常系・異常系・境界値の網羅、Mock定義 |

---

## タスク分解・提案ロジック

design.md にタスク一覧がない場合、設計内容から以下の基準でタスクを自動分解・提案します。

### 推奨タスク粒度

| レイヤー | タスク例 | 時間目安 |
|:---|:---|:---|
| **Domain** | Pydanticスキーマ定義、Enum定義 | 10分 |
| **Infra** | DBモデル作成、Migrationファイル作成 | 15分 |
| **App/Service** | CRUDロジック実装（1メソッド単位推奨） | 20分 |
| **Interface** | APIエンドポイント実装（1パス単位） | 20分 |
| **UI** | コンポーネント実装（Presentational / Container 分離） | 30分 |
| **Test** | 単体テスト作成、結合テスト作成 | 20分 |

---

## Error Handling & Recovery

| 状況 | AIの対応 |
|:---|:---|
| **design.md 不在** | エラーを表示し、`/spec {feature}` の実行を促す |
| **設計記述不足** | 実装に必要な情報（例: 型、制約）が欠けている場合、ユーザーに質問し、`design.md` への追記を提案する |
| **テスト失敗** | 実装を修正するか、テストケース自体が誤っているか（仕様変更）を確認する |
| **コンフリクト** | 既存ファイルと競合する場合、差分を表示してユーザーに判断を仰ぐ |

---

## Example Usage

### Scenario 1: 次のタスクを自動実行

```bash
/spec-implement staff-csv-export
```

**AI Response:**

```text
📋 design.md を読み込みました。
現在の進捗:
- [x] T-01: Pydanticスキーマ定義
- [x] T-02: Service層実装 (CSV生成ロジック)

👉 次のタスク: **[T-03] APIルーター実装** (backend/app/routers/export.py)

このタスクを実行しますか？
参照: Section 2 (API設計), Section 4 (権限: Managerのみ)
```

### Scenario 2: テストファーストでの実行

```bash
/spec-implement staff-csv-export T-04
```

**AI Response:**

```text
📋 タスク選択: **[T-04] 単体テスト作成**

Design.md Section 9 (テストケース) に基づき、
`backend/tests/unit/test_export_service.py` を作成します。

以下のテストケースを実装します：
1. [UC-01] 正常系: 正しいCSVが生成されること
2. [UC-03] 異常系: 無効なフォーマット指定でエラーになること
```

---

## 完了基準 (Definition of Done)

タスクが完了とみなされる条件：

1. **コードが存在する**: 指定ファイルが作成・更新されている
2. **静的解析OK**: 構文エラーがない（Linter準拠）
3. **設計整合**: `design.md` の要件（型、制約）を満たしている
4. **テスト通過**: (可能な場合) 対応するテストがPassしている
5. **ドキュメント更新**: `design.md` のタスク状態が `✅` になっている

---

## 関連コマンド

| コマンド | 用途 |
|---------|------|
| `/spec` | 設計書 (design.md) の作成 |
| `/test-generate` | 単体テスト生成（design.md 参照可） |
| `/test-backend-integration` | バックエンド結合テスト生成（design.md 参照可） |
| `/test-frontend-integration` | フロントエンド結合テスト生成（design.md 参照可） |
| `/wrap-up` | 品質チェック・リリース準備 |
| `/documentation` | docs/ への昇格 |

---

## 重要なルール

- **1タスクずつ実行**: 複数タスクを一度に実行しない
- **ユーザー承認必須**: タスク実行前・完了後に必ず確認を取る
- **design.md を更新**: タスク完了時に進捗を記録する
- **TDD推奨**: 可能な限りテストを先に作成する
