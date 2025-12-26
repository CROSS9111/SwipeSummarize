
# Code Review Command

提示されたコードを包括的にレビューし、Clean Code原則に基づいて**即座にリファクタリング（修正）**します。

## 使用方法

```bash
/code-review [file-path] [-d|-p]
```

### 引数

- `[file-path]`: レビュー対象のファイルパス（必須）
- `-d`: 開発環境モード（DEBUGレベルのログも含む詳細レビュー）
- `-p`: 本番環境モード（INFO以上のログのみレビュー、パフォーマンス重視）
- 引数なし: 全レベルの包括的レビュー（デフォルト）

## コマンド概要

**役割**: コードの包括的なレビューと即座の修正実行

このコマンドは、提示されたコードを**7つの主要なカテゴリ**（FastAPI・Next.js特化ルールを含む）から包括的にレビューし、違反している箇所を**即座にリファクタリング（修正）**します。既存の `/refactor-suggest` コマンドが「提案→承認→実装」のワークフローを取るのに対し、このコマンドは**自動検出・自動修正**を前提としています。

環境引数（`-d` / `-p`）により、開発環境・本番環境それぞれに最適化されたレビューを実行できます。

### 既存コマンドとの使い分け

| コマンド              | ワークフロー           | 用途                                         |
| --------------------- | ---------------------- | -------------------------------------------- |
| `/refactor-suggest` | 提案ベース（承認待ち） | アーキテクチャレベルの大規模リファクタリング |
| `/code-review`      | 即座実行ベース         | コードレベルの実装品質向上、実践的な問題修正 |

## 参照ドキュメント

> 📋 **重要**: レビュー時は以下のドキュメントを参照してください。
>
> - **コーディング規約（目次）**: [coding-standards-index.md](../../docs/development/coding-standards-index.md) - 全体の指針
>   - [命名規則](../../docs/development/coding-standards-naming.md) - 命名規則全般
>   - [基本原則](../../docs/development/coding-standards-basics.md) - DRY、SRP、コメント品質
>   - [Backend規約](../../docs/development/coding-standards-backend.md) - FastAPI特化ルール
>   - [Frontend規約](../../docs/development/coding-standards-frontend.md) - Next.js特化ルール
>   - [エラー・ログ規約](../../docs/development/coding-standards-error.md) - HTTPステータス、リトライ戦略
>   - [セキュリティ規約](../../docs/development/coding-standards-security.md) - SQLインジェクション対策、機密情報管理
> - **バリデーションルール**: [validation-rules.md](../../docs/development/validation-rules.md) - 入力検証ルール
> - **テスト基準**: [testing-standards.md](../../docs/development/testing-standards.md) - テストケース作成ルール
> - **セキュリティ**: [security/README.md](../../docs/security/README.md) - セキュリティ実装ガイドライン
> - **サービス層設計**: [service_layer_design.md](../../docs/design/service_layer_design.md) - FastAPI/SQLAlchemy実装パターン、例外処理設計(Section 7)
> - **テスト仕様**: [testing/README.md](../../docs/testing/README.md) - テスト計画、品質基準

## レビュー観点

このコマンドは、以下の**7つの主要カテゴリ**に基づいてコードをレビューし、各ルールに違反している箇所を特定して即座に修正します。

### 1. 保守性・可読性 (Clean Code)

- 1.1. 命名規則を厳守
- 1.2. 曖昧な命名を具体化
- 1.3. 単一責任の原則を強制
- 1.4. コピペコードを排除 (DRY)
- 1.5. **ルーターの分割 (FastAPI)** ⭐ NEW

### 2. 堅牢性: エラーハンドリングとログ

- 2.1. try-catchの濫用を修正
- 2.2. HTTPレスポンス処理を厳密化
- 2.2.1. **カスタム例外クラスのマッピング (FastAPI)** ⭐ NEW
- 2.3. ログレベルを統一・修正
- 2.4. **Pydantic型安全の徹底 (FastAPI)** ⭐ NEW

### 3. セキュリティ

- 3.1. SQLインジェクションを根絶
- 3.2. 機密情報をコードから除去
- 3.3. **API Routesの責務分離 (Next.js)** ⭐ NEW

### 4. パフォーマンス

- 4.1. N+1問題を解決
- 4.2. **非同期処理の適切な使用 (FastAPI)** ⭐ NEW
- 4.3. **BackgroundTasks の活用 (FastAPI)** ⭐ NEW
- 4.4. **レンダリング戦略の最適化 (Next.js App Router)** ⭐ NEW
- 4.5. **Next.js組み込みコンポーネントの活用** ⭐ NEW
- 4.6. **Dynamic Imports による遅延ロード (Next.js)** ⭐ NEW
- 4.7. **クライアントデータ取得の最適化 (Next.js)** ⭐ NEW

### 5. テスト容易性

- 5.1. 依存性を注入 (DI)

### 6. コメント品質

- 6.1. 自明なコメントを削除
- 6.2. コメントアウトされたコードを削除
- 6.3. 「なぜ」の説明コメントを維持・整理
- 6.4. 複雑なロジックに意図を明文化
- 6.5. ドキュメンテーションコメントを追加

### 7. フレームワーク・技術スタック別ベストプラクティス ⭐ NEW

- 7.1. **Next.js 14 App Router のベストプラクティス**
- 7.2. **React Hooks のベストプラクティス**
- 7.3. **TypeScript 型安全性のベストプラクティス**
- 7.4. **FastAPI のベストプラクティス**
- 7.5. **Python 型ヒントのベストプラクティス**
- 7.6. **セキュリティ強化（総合チェックリスト）**
- 7.7. **パフォーマンス最適化（総合チェックリスト）**

---

## 実行手順

### 1. 前提条件

- 対象ファイルのパスを指定
- ファイルの内容を読み込み
- プロジェクトの技術スタック（Python/TypeScript）を理解
- **ステアリングドキュメントを読み込み**:
  ```bash
  # macOS/Linux:
  claude-code-spec-workflow get-content "/path/to/project/.claude/steering/tech.md"
  claude-code-spec-workflow get-content "/path/to/project/.claude/steering/structure.md"
  claude-code-spec-workflow get-content "/path/to/project/.claude/steering/code-style.md"
  ```
- **既存のスキーマとモデルを必ず確認**（スキーマ/モデルの新規作成や変更を行う前に）:
  ```bash
  # 既存スキーマの確認（重複防止）
  mcp__serena__get_symbols_overview backend/app/schemas/staff.py
  mcp__serena__get_symbols_overview backend/app/schemas/location.py

  # 既存モデルの確認（重複防止）
  mcp__serena__get_symbols_overview backend/models/public_models.py
  mcp__serena__get_symbols_overview backend/models/personal_models.py
  ```

### 2. プロジェクト特性の理解

**このプロジェクトの構成**:

- Backend: Python (FastAPI + SQLAlchemy)
- Frontend: TypeScript (Next.js 14 + React)

**既存のスキーマとモデルの構造** ⚠️ 重要：

- **backend/app/schemas/**
  - `staff.py`: 44種類のスタッフ関連スキーマ（Address, AgencyInfo, CreatorDetailResponse, ProfileRequest等）
  - `location.py`: 1種類のロケーション検索スキーマ
- **backend/models/**
  - `public_models.py`: 11種類のパブリックDBモデル（Agency, Product, MediaType等）
  - `personal_models.py`: 17種類のパーソナルDBモデル（Creator, Company, Address等）

**スキーマ/モデル追加時の原則**:

1. ⚠️ **新規作成前に必ず既存を確認** - 類似のスキーマ/モデルが既に存在していないか確認
2. 既存のスキーマを拡張・再利用できないか検討
3. 新規作成が必要な場合のみ、適切なファイルに追加（staff/location/public/personalの分類に従う）
4. 命名は既存パターンに従う（例：〜Response, 〜Request, 〜Info等）

**適用する命名規則**:

- Backend (Python): `snake_case` (変数・関数)、`PascalCase` (クラス)、`UPPER_CASE` (定数)
- Frontend (TypeScript): `camelCase` (変数・関数)、`PascalCase` (コンポーネント・型)、`UPPER_CASE` (定数)
- Database: `snake_case` (テーブル・カラム名)
- API URL: `kebab-case` (エンドポイント)

### 3. 環境別レビューモード

#### デフォルトモード（引数なし）

- 全カテゴリの包括的レビュー
- 全ログレベル（DEBUG〜CRITICAL）をチェック
- 最も厳格な品質基準を適用

#### 開発環境モード (`-d`)

- **ログレビュー**: DEBUGレベルのログも含めて詳細にレビュー
- **重点項目**:
  - デバッグ情報の適切な配置
  - 開発時のトレーサビリティ向上
  - print文の排除とlogger.debug()への置き換え
  - 詳細なエラートレース
- **用途**: ローカル開発、デバッグ、問題調査時

#### 本番環境モード (`-p`)

- **ログレビュー**: INFO以上のログのみをチェック（DEBUG/TRACEは無視）
- **重点項目**:
  - パフォーマンス最適化（N+1問題、非同期処理）
  - セキュリティ強化（機密情報の除去、インジェクション対策）
  - 本番運用に必要な監視ログの配置
  - エラーハンドリングの堅牢性
- **用途**: 本番デプロイ前、パフォーマンスチューニング時

---

## レビューチェックリスト

> **重要**: レビュー実行時は、以下のチェックリストを**上から順に1項目ずつ確認**してください。
> チェック済みの項目は ☑ に変更し、抜け漏れを防ぎます。

### チェックリスト 1. 保守性・可読性 (Clean Code)

| #  | チェック項目                             | 参照                                                                                          |
| -- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| ☐ | 1.1 命名規則を厳守（言語・レイヤー別）   | [coding-standards-naming.md](../../docs/development/coding-standards-naming.md#命名規則一覧)     |
| ☐ | 1.2 曖昧な命名を具体化                   | [coding-standards-naming.md](../../docs/development/coding-standards-naming.md#曖昧な命名の回避) |
| ☐ | 1.3 単一責任の原則（1ファイル500行以内） | [coding-standards-basics.md](../../docs/development/coding-standards-basics.md#単一責任の原則)   |
| ☐ | 1.4 コピペコードを排除 (DRY)             | [coding-standards-basics.md](../../docs/development/coding-standards-basics.md#dry原則)          |
| ☐ | 1.5 ルーターの分割 (FastAPI)             | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#ルーター分割)   |

### チェックリスト 2. 堅牢性: エラーハンドリングとログ

| #  | チェック項目                         | 参照                                                                                                        |
| -- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| ☐ | 2.1 try-catchの濫用を修正            | [coding-standards-error.md](../../docs/development/coding-standards-error.md#エラーハンドリング規約)           |
| ☐ | 2.2 HTTPレスポンス処理を厳密化       | [coding-standards-error.md](../../docs/development/coding-standards-error.md#httpレスポンス処理とリトライ戦略) |
| ☐ | 2.3 カスタム例外クラスのマッピング   | [service_layer_design.md §7](../../docs/design/service_layer_design.md#7-例外処理設計)                        |
| ☐ | 2.4 ログレベルを統一・修正           | [coding-standards-error.md](../../docs/development/coding-standards-error.md#ログ設定の実装例)                 |
| ☐ | 2.5 Pydantic型安全の徹底             | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#pydantic型安全)               |
| ☐ | 2.6 フィールド別バリデーションルール | [validation-rules.md](../../docs/development/validation-rules.md#フィールド別バリデーション)                   |
| ☐ | 2.7 エラーレスポンス形式の統一       | [validation-rules.md §エラーレスポンス](../../docs/development/validation-rules.md#エラーレスポンス形式)      |

### チェックリスト 3. セキュリティ

| #  | チェック項目                       | 参照                                                                                                     |
| -- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ☐ | 3.1 SQLインジェクションを根絶      | [coding-standards-security.md](../../docs/development/coding-standards-security.md#sqlインジェクション対策) |
| ☐ | 3.2 機密情報をコードから除去       | [coding-standards-security.md](../../docs/development/coding-standards-security.md#機密情報管理)            |
| ☐ | 3.3 API Routesの責務分離 (Next.js) | [coding-standards-security.md](../../docs/development/coding-standards-security.md#api-routesの責務分離)    |

### チェックリスト 4. パフォーマンス

| #  | チェック項目                           | 参照                                                                                                          |
| -- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| ☐ | 4.1 N+1問題を解決                      | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#n1問題の回避)                   |
| ☐ | 4.2 非同期処理の適切な使用             | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#非同期処理)                     |
| ☐ | 4.3 BackgroundTasksの活用              | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#backgroundtasks)                |
| ☐ | 4.4 レンダリング戦略の最適化 (Next.js) | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#server-components優先)        |
| ☐ | 4.5 Next.js組み込みコンポーネント活用  | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#nextjs組み込みコンポーネント) |
| ☐ | 4.6 Dynamic Importsによる遅延ロード    | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#dynamic-imports)              |
| ☐ | 4.7 クライアントデータ取得の最適化     | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#クライアントデータ取得)       |

### チェックリスト 5. テスト容易性・設計原則

| #  | チェック項目                       | 参照                                                                                                    |
| -- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ☐ | 5.1 依存性注入 (DI) パターンの適用 | [coding-standards-security.md](../../docs/development/coding-standards-security.md#アーキテクチャ設計原則) |
| ☐ | 5.2 テストケース作成ルール準拠     | [testing-standards.md](../../docs/development/testing-standards.md#テストケース作成ルール)                 |

### チェックリスト 6. コメント品質

| #  | チェック項目                         | 参照                                                                                                |
| -- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| ☐ | 6.1 自明なコメントを削除             | [coding-standards-basics.md](../../docs/development/coding-standards-basics.md#コメント品質詳細ルール) |
| ☐ | 6.2 コメントアウトされたコードを削除 | 同上                                                                                                |
| ☐ | 6.3 「なぜ」の説明コメントを維持     | 同上                                                                                                |
| ☐ | 6.4 複雑なロジックに意図を明文化     | 同上                                                                                                |

### チェックリスト 7. フレームワーク・技術スタック別ベストプラクティス

| #  | チェック項目                                 | 参照                                                                                                           |
| -- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ☐ | 7.1 Next.js 14 App Router ベストプラクティス | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#nextjs特化ルール)              |
| ☐ | 7.2 React Hooks のベストプラクティス         | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#react-hooksベストプラクティス) |
| ☐ | 7.3 TypeScript 型安全性のベストプラクティス  | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#型安全性typescript)            |
| ☐ | 7.4 FastAPI のベストプラクティス             | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#fastapi特化ルール)               |
| ☐ | 7.5 Python 型ヒントのベストプラクティス      | [coding-standards-backend.md](../../docs/development/coding-standards-backend.md#型安全性python)                  |
| ☐ | 7.6 セキュリティ強化（総合チェック）         | [security/README.md](../../docs/security/README.md)                                                               |
| ☐ | 7.7 パフォーマンス最適化（総合チェック）     | [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md#パフォーマンス規約)            |

---

## レビュー完了チェック

レビュー完了時に以下を確認:

- [ ] 上記全チェック項目を確認済み
- [ ] 発見した問題を修正済み
- [ ] 修正内容をユーザーに報告済み

---

## 詳細リファレンス

詳細なルールとコード例は以下のドキュメントを参照してください：

| ドキュメント                                                                     | 内容                               |
| -------------------------------------------------------------------------------- | ---------------------------------- |
| [coding-standards-index.md](../../docs/development/coding-standards-index.md)       | コーディング規約目次、全体の指針   |
| [coding-standards-naming.md](../../docs/development/coding-standards-naming.md)     | 命名規則全般                       |
| [coding-standards-basics.md](../../docs/development/coding-standards-basics.md)     | DRY、SRP、コメント品質             |
| [coding-standards-backend.md](../../docs/development/coding-standards-backend.md)   | FastAPI特化ルール                  |
| [coding-standards-frontend.md](../../docs/development/coding-standards-frontend.md) | Next.js特化ルール                  |
| [coding-standards-error.md](../../docs/development/coding-standards-error.md)       | エラーハンドリング、HTTPステータス |
| [coding-standards-security.md](../../docs/development/coding-standards-security.md) | セキュリティ、アーキテクチャ原則   |
| [validation-rules.md](../../docs/development/validation-rules.md)                   | 入力検証、エラーレスポンス         |
| [testing-standards.md](../../docs/development/testing-standards.md)                 | テストケース作成、DI、カバレッジ   |
| [service_layer_design.md](../../docs/design/service_layer_design.md)                | 例外処理、サービス層パターン       |
| [security/README.md](../../docs/security/README.md)                                 | セキュリティ実装ガイドライン       |

---

## 実行ワークフロー

### 1. コマンドライン引数のパース

コマンド実行時に引数を解析し、レビューモードを決定します。

```bash
# デフォルトモード（全レベル包括レビュー）
/code-review path/to/file.py

# 開発環境モード（DEBUGレベル含む詳細レビュー）
/code-review path/to/file.py -d

# 本番環境モード（INFO以上のみ、パフォーマンス重視）
/code-review path/to/file.py -p
```

**引数パース処理**:

1. コマンドライン引数から `-d` または `-p` フラグの有無を確認
2. フラグに応じて以下のレビュー設定を適用：
   - `-d` (開発): DEBUG レベルのログも詳細レビュー
   - `-p` (本番): INFO 以上のログのみレビュー、パフォーマンス最適化を優先
   - 引数なし（デフォルト）: 全レベルの包括的レビュー

### 2. ファイル読み込み

指定されたファイルパスからソースコードを読み込みます。

```bash
# ファイル読み込み例
path/to/file.py
```

### 2.5. チェックリストのタスク化 ⭐ NEW

**[重要]** レビューの精度を高めるため、レビュー開始前に必ず `TodoWrite` ツールを使用してチェックリストをタスク化します。

#### タスク化の手順

1. **対象ファイルの技術スタックを特定**（Python/TypeScript）
2. **レビューモードに応じたチェックリストを生成**（デフォルト/開発/本番）
3. **TodoWrite ツールでタスクリストを作成**
4. **各チェック項目を順番に実行し、完了したら `completed` に変更**

#### チェックリスト例（デフォルトモード - Python/FastAPI ファイルの場合）

```typescript
// TodoWrite ツールで以下のようなタスクリストを作成
[
  { content: "【前提】既存スキーマの確認（backend/app/schemas/）", status: "pending", activeForm: "既存スキーマを確認中" },
  { content: "【前提】既存モデルの確認（backend/models/）", status: "pending", activeForm: "既存モデルを確認中" },
  { content: "【1.1】命名規則の確認（snake_case/PascalCase）", status: "pending", activeForm: "命名規則を確認中" },
  { content: "【1.2】曖昧な命名の検出と修正", status: "pending", activeForm: "曖昧な命名を検出・修正中" },
  { content: "【1.3】単一責任の原則違反の検出", status: "pending", activeForm: "単一責任違反を検出中" },
  { content: "【1.4】コピペコード（DRY違反）の検出", status: "pending", activeForm: "コピペコードを検出中" },
  { content: "【1.5】FastAPI: ルーター分割の確認", status: "pending", activeForm: "ルーター分割を確認中" },
  { content: "【2.1】try-catch濫用の検出", status: "pending", activeForm: "try-catch濫用を検出中" },
  { content: "【2.2】HTTPレスポンス処理の厳密化", status: "pending", activeForm: "HTTPレスポンス処理を確認中" },
  { content: "【2.3】ログレベルの統一・修正", status: "pending", activeForm: "ログレベルを確認中" },
  { content: "【2.4】FastAPI: Pydantic型安全の徹底", status: "pending", activeForm: "Pydantic型安全を確認中" },
  { content: "【3.1】SQLインジェクション対策の確認", status: "pending", activeForm: "SQLインジェクション対策を確認中" },
  { content: "【3.2】機密情報のハードコーディング検出", status: "pending", activeForm: "機密情報のハードコーディングを検出中" },
  { content: "【4.1】N+1問題の検出", status: "pending", activeForm: "N+1問題を検出中" },
  { content: "【4.2】FastAPI: 非同期処理の適切な使用", status: "pending", activeForm: "非同期処理を確認中" },
  { content: "【4.3】FastAPI: BackgroundTasksの活用", status: "pending", activeForm: "BackgroundTasksの活用を確認中" },
  { content: "【5.1】依存性注入（DI）の確認", status: "pending", activeForm: "依存性注入を確認中" },
  { content: "【6.1】自明なコメントの削除", status: "pending", activeForm: "自明なコメントを削除中" },
  { content: "【6.2】コメントアウトされたコードの削除", status: "pending", activeForm: "コメントアウトコードを削除中" },
  { content: "【6.3】「なぜ」の説明コメントの整理", status: "pending", activeForm: "説明コメントを整理中" },
  { content: "【6.4】複雑なロジックの意図明文化", status: "pending", activeForm: "複雑なロジックの意図を明文化中" },
  { content: "【6.5】ドキュメンテーションコメントの追加", status: "pending", activeForm: "ドキュメンテーションコメントを追加中" },
  { content: "【7.4】FastAPI: ベストプラクティスの適用", status: "pending", activeForm: "FastAPIベストプラクティスを確認中" },
  { content: "【7.5】Python: 型ヒントのベストプラクティス", status: "pending", activeForm: "Python型ヒントを確認中" },
  { content: "【7.6】セキュリティ強化（総合チェック）", status: "pending", activeForm: "セキュリティを総合チェック中" },
  { content: "【7.7】パフォーマンス最適化（総合チェック）", status: "pending", activeForm: "パフォーマンスを総合チェック中" }
]
```

#### チェックリスト例（デフォルトモード - TypeScript/Next.js ファイルの場合）

```typescript
// TodoWrite ツールで以下のようなタスクリストを作成
[
  { content: "【1.1】命名規則の確認（camelCase/PascalCase）", status: "pending", activeForm: "命名規則を確認中" },
  { content: "【1.2】曖昧な命名の検出と修正", status: "pending", activeForm: "曖昧な命名を検出・修正中" },
  { content: "【1.3】単一責任の原則違反の検出", status: "pending", activeForm: "単一責任違反を検出中" },
  { content: "【1.4】コピペコード（DRY違反）の検出", status: "pending", activeForm: "コピペコードを検出中" },
  { content: "【2.1】try-catch濫用の検出", status: "pending", activeForm: "try-catch濫用を検出中" },
  { content: "【2.2】HTTPレスポンス処理の厳密化", status: "pending", activeForm: "HTTPレスポンス処理を確認中" },
  { content: "【2.3】ログレベルの統一・修正", status: "pending", activeForm: "ログレベルを確認中" },
  { content: "【3.2】機密情報のハードコーディング検出", status: "pending", activeForm: "機密情報のハードコーディングを検出中" },
  { content: "【3.3】Next.js: API Routesの責務分離", status: "pending", activeForm: "API Routesの責務分離を確認中" },
  { content: "【4.1】N+1問題の検出", status: "pending", activeForm: "N+1問題を検出中" },
  { content: "【4.4】Next.js: レンダリング戦略の最適化", status: "pending", activeForm: "レンダリング戦略を確認中" },
  { content: "【4.5】Next.js: 組み込みコンポーネントの活用", status: "pending", activeForm: "組み込みコンポーネントの活用を確認中" },
  { content: "【4.6】Next.js: Dynamic Importsによる遅延ロード", status: "pending", activeForm: "Dynamic Importsを確認中" },
  { content: "【4.7】Next.js: クライアントデータ取得の最適化", status: "pending", activeForm: "クライアントデータ取得を確認中" },
  { content: "【5.1】依存性注入（DI）の確認", status: "pending", activeForm: "依存性注入を確認中" },
  { content: "【6.1】自明なコメントの削除", status: "pending", activeForm: "自明なコメントを削除中" },
  { content: "【6.2】コメントアウトされたコードの削除", status: "pending", activeForm: "コメントアウトコードを削除中" },
  { content: "【6.3】「なぜ」の説明コメントの整理", status: "pending", activeForm: "説明コメントを整理中" },
  { content: "【6.4】複雑なロジックの意図明文化", status: "pending", activeForm: "複雑なロジックの意図を明文化中" },
  { content: "【6.5】ドキュメンテーションコメントの追加", status: "pending", activeForm: "ドキュメンテーションコメントを追加中" },
  { content: "【7.1】Next.js: App Routerベストプラクティス", status: "pending", activeForm: "App Routerベストプラクティスを確認中" },
  { content: "【7.2】React: Hooksベストプラクティス", status: "pending", activeForm: "React Hooksを確認中" },
  { content: "【7.3】TypeScript: 型安全性ベストプラクティス", status: "pending", activeForm: "TypeScript型安全性を確認中" },
  { content: "【7.6】セキュリティ強化（総合チェック）", status: "pending", activeForm: "セキュリティを総合チェック中" },
  { content: "【7.7】パフォーマンス最適化（総合チェック）", status: "pending", activeForm: "パフォーマンスを総合チェック中" }
]
```

#### 実行時の注意事項

1. **一つずつ順番にチェック**: タスクリストの順番に従って、一つずつ確実にチェックする
2. **完了後に即座にステータス更新**: 各チェックが完了したら、すぐに `status: "completed"` に変更する
3. **問題検出時の対応**: 問題を検出した場合は、即座に修正してからタスクを完了とする
4. **スキーマ/モデル追加時は特に注意**: （Pythonファイルの場合）【前提】タスクで既存のスキーマとモデルを確認し、重複を避ける
5. **進捗の可視化**: タスクリストにより、ユーザーがレビューの進捗を一目で確認できる

#### レビューモード別のタスクリスト調整

- **開発環境モード (`-d`)**: 全27項目（DEBUGレベルログの詳細チェックを含む）
- **本番環境モード (`-p`)**: セキュリティ（カテゴリ3）、パフォーマンス（カテゴリ4）、ベストプラクティス（カテゴリ7）を優先（約15項目）
- **デフォルトモード**: 全27項目を包括的にチェック

### 3. 環境別レビュー実行

引数に応じて、適切なレビュー戦略を実行します。

#### デフォルトモード（引数なし）

以下の**7つのカテゴリ**すべてを自動的にレビューします：

1. **保守性・可読性** - 命名規則、DRY、単一責任、ルーター分割（FastAPI）
2. **堅牢性** - エラーハンドリング、ログレベル（全レベル）、HTTPステータスコード処理、Pydantic型安全（FastAPI）
3. **セキュリティ** - SQLインジェクション、機密情報のハードコーディング、API Routes責務分離（Next.js）
4. **パフォーマンス** - N+1問題、非同期処理（FastAPI）、BackgroundTasks（FastAPI）、レンダリング最適化（Next.js）
5. **テスト容易性** - 依存性注入
6. **コメント品質** - 自明なコメント削除、ドキュメンテーション追加
7. **フレームワーク別ベストプラクティス** - Next.js, React, TypeScript, FastAPI, Python型ヒント、セキュリティ、パフォーマンス

#### 開発環境モード (`-d`)

**重点項目**:

- ✅ DEBUGレベルのログを含めた詳細なログレビュー
- ✅ print文の排除と logger.debug() への置き換え
- ✅ 開発時のトレーサビリティ向上
- ✅ 詳細なエラートレース
- ✅ デバッグ情報の適切な配置

**レビューカテゴリ**: 全7カテゴリ（DEBUGレベルログも含む）

#### 本番環境モード (`-p`)

**重点項目**:

- ✅ INFO以上のログのみをレビュー（DEBUG/TRACEは無視）
- ✅ パフォーマンス最適化（N+1問題、非同期処理、キャッシング）
- ✅ セキュリティ強化（機密情報の除去、インジェクション対策）
- ✅ 本番運用に必要な監視ログの配置
- ✅ エラーハンドリングの堅牢性

**レビューカテゴリ**: セキュリティ（カテゴリ3）、パフォーマンス（カテゴリ4）、フレームワーク別ベストプラクティス（カテゴリ7）を優先

### 4. 違反箇所を即座に修正

検出された問題を自動的に修正し、修正後のコードを提示します。

### 5. 修正サマリーの出力

レビュー完了後、以下の形式で修正サマリーを出力します。

```markdown
# コードレビュー実行結果

## 対象ファイル
- ファイルパス: path/to/file.py
- 実行日時: 2025-01-15 10:30:00
- **レビューモード**: デフォルトモード（全レベル包括レビュー）
  - または「開発環境モード (-d)」「本番環境モード (-p)」

## 検出・修正した問題

### 1. 保守性・可読性
- ✅ 命名規則違反: 3箇所修正（camelCase → snake_case）
- ✅ 曖昧な命名: 5箇所修正（data → activeUsers 等）
- ✅ 単一責任違反: 1関数を3つに分割
- ✅ コピペコード: 2箇所を共通関数化
- ✅ FastAPI: ルーター分割（main.pyから staff.py, products.py に分割）

### 2. 堅牢性
- ✅ try-catch濫用: 2箇所をif文に修正
- ✅ HTTPステータスコード処理: リトライロジックを追加
- ✅ print文: 8箇所をloggerに置き換え
- ✅ ログレベル統一: DEBUG 3箇所、INFO 5箇所、WARNING 2箇所に調整
- ✅ FastAPI: Pydantic response_model追加（5エンドポイント）

### 3. セキュリティ
- ✅ SQLインジェクション: 1箇所をプリペアドステートメントに修正
- ✅ APIキーのハードコーディング: 環境変数に移行
- ✅ Next.js: NEXT_PUBLIC_ 機密情報を API Routes に移行（3箇所）

### 4. パフォーマンス
- ✅ N+1問題: ループ内のクエリを一括取得に変更
- ✅ FastAPI: 非同期処理に変更（requests → httpx）
- ✅ FastAPI: BackgroundTasks活用（メール送信、通知）
- ✅ Next.js: Server Components に変更（2ページ）
- ✅ Next.js: Dynamic Imports 適用（地図ライブラリ）
- ✅ Next.js: SWR導入（3コンポーネント）

### 5. テスト容易性
- ✅ 依存性注入: 2クラスにDIを適用

### 6. コメント品質
- ✅ 自明なコメント削除: 10箇所削除
- ✅ コメントアウトされたコード削除: 5箇所削除
- ✅ 「なぜ」のコメント維持: 3箇所整理
- ✅ ドキュメンテーションコメント追加: 8関数/メソッド

### 7. フレームワーク別ベストプラクティス
- ✅ Next.js: メタデータ最適化（2ページ）
- ✅ React: useEffect依存配列修正（4箇所）
- ✅ TypeScript: any型排除（6箇所）
- ✅ FastAPI: 依存性注入パターン適用（認証、DB接続）
- ✅ Python: 型ヒント追加（15関数）
- ✅ 複雑なロジックの意図明文化: 2箇所追加
- ✅ ドキュメンテーションコメント追加: 5関数に追加

## 修正前後の比較

[修正前後のdiffを表示]

## 次のステップ

1. 修正内容を確認してください
2. 単体テストを実行してください（`pytest` または `npm test`）
3. 問題がなければコミットしてください
```

---

## 重要なルール

1. **自動検出・自動修正**: ユーザーの承認を待たず、検出した問題を即座に修正します
2. **包括的レビュー**: **7つすべてのカテゴリ**を必ずレビューします（保守性、堅牢性、セキュリティ、パフォーマンス、テスト容易性、コメント品質、**フレームワーク別ベストプラクティス**）
3. **プロジェクト特性への配慮**: Python/TypeScript混在プロジェクトの命名規則を適切に適用します
4. **詳細なレポート**: 修正内容を明確に記録します
5. **既存コマンドとの使い分け**: アーキテクチャレベルの大規模リファクタリングは `/refactor-suggest` を使用してください

---

## 次のステップ

修正完了後、以下のコマンドで単体テストを実行することを推奨します：

```bash
# Backend
/test-generate path/to/file.py

# Frontend
/test-generate path/to/file.tsx
```

---

## 参考資料

- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [FastAPI Dependency Injection](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
