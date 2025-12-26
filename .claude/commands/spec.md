
# Spec Command (統合版)

機能設計書を作成する仕様駆動開発ワークフローです。

## Usage

```bash
/spec <feature-name> [description]
```

## ワークフローの特徴

### 統合設計書アプローチ

- **1つの design.md** で全設計情報を管理（AIコンテキスト効率化）
- **機能ID連携**: `docs/functional_requirements.md` との紐付け（F-XXX形式）
- **テスト設計組み込み**: 表形式テストケースを設計書に含める
- **バリデーション・権限・状態遷移**: AI実装精度を向上
- **docs/への自動昇格**: `/documentation` コマンドで永続ドキュメントへ反映

### コア原則

- **構造化開発**: フェーズを順番に実行
- **ユーザー承認必須**: 各フェーズで明示的な承認を取得
- **インタラクティブ質問**: 要件を明確化するためユーザーに質問
- **サブエージェントレビュー**: AI検証で品質を担保
- **要件トレーサビリティ**: 全タスクが要件を参照

### 参照ドキュメント

> 📋 **設計時は以下のドキュメントを参照してください。**
>
> - **バリデーションルール**: [validation-rules.md](../../docs/development/validation-rules.md) - 入力検証ルール、制約定義
> - **テスト基準**: [testing-standards.md](../../docs/development/testing-standards.md) - テストケース作成ルール
> - **コーディング規約（目次）**: [coding-standards-index.md](../../docs/development/coding-standards-index.md) - 全体の指針
>   - [命名規則](../../docs/development/coding-standards-naming.md) - 命名規則全般
>   - [基本原則](../../docs/development/coding-standards-basics.md) - DRY、SRP、コメント品質
>   - [Backend規約](../../docs/development/coding-standards-backend.md) - FastAPI特化ルール
>   - [Frontend規約](../../docs/development/coding-standards-frontend.md) - Next.js特化ルール
>   - [エラー・ログ規約](../../docs/development/coding-standards-error.md) - HTTPステータス、リトライ戦略
>   - [セキュリティ規約](../../docs/development/coding-standards-security.md) - SQLインジェクション対策、機密情報管理
> - **セキュリティ**: [security/README.md](../../docs/security/README.md) - セキュリティ実装ガイドライン

---

## 完全ワークフローシーケンス

**重要**: この順序を厳守してください:

1. **Phase 1: 要件ヒアリング** - ユーザーへの質問で要件を明確化
2. **Phase 2: 設計書作成** - 統合 design.md を作成
3. **Phase 3: サブエージェントレビュー** - 設計の自動検証
4. **Phase 4: ユーザー承認** - 最終確認

---

## Phase 1: 要件ヒアリング (Interactive Clarification)

### 1.1 初期セットアップ

1. **ディレクトリ作成**:

   ```bash
   mkdir -p docs/specs/{feature-name}/
   ```
2. **既存コードベース分析**:

   - 類似機能のパターン調査
   - 再利用可能なコンポーネント特定
   - 統合ポイントの確認
3. **docs/ 参照**:

   - `docs/functional_requirements.md` で既存機能ID確認（最新はF-027、新規はF-028から）
   - `docs/document_management_list.md` で必要ドキュメント確認

### 1.2 ユーザーへの質問

以下のカテゴリで必要な情報を収集します:

```text
📋 確認事項 (Clarification Required)

以下の点について確認させてください:

1. **対象ユーザー・権限**
   - [ ] 全ユーザー
   - [ ] 特定ロール（Manager以上、Adminのみ等）
   - [ ] その他: ___

2. **データ範囲・アクセス制御**
   - [ ] 全データ閲覧可能
   - [ ] 自部署のみ
   - [ ] 自分が作成したもののみ
   - [ ] その他: ___

3. **入出力形式**
   - 入力: ___
   - 出力形式: [ ] JSON / [ ] CSV / [ ] Excel / [ ] その他: ___

4. **データ量・パフォーマンス要件**
   - 想定最大件数: ___
   - 応答時間要件: ___

5. **状態管理の必要性**
   - [ ] 不要（単純なCRUD）
   - [ ] 必要（ステータス遷移あり）
   - 状態: ___

6. **既存機能との関係**
   - 関連機能: ___
   - 影響範囲: ___

回答をお願いします:
```

### 1.3 質問カテゴリ一覧

| フェーズ | 質問カテゴリ     | 質問例                                                 |
| -------- | ---------------- | ------------------------------------------------------ |
| 要件定義 | スコープ確認     | "この機能の対象ユーザーは誰ですか？"                   |
| 要件定義 | 優先度確認       | "必須機能とオプション機能を教えてください"             |
| API設計  | フォーマット     | "レスポンス形式はJSON以外も必要ですか？"               |
| 権限設計 | アクセス制御     | "データの閲覧範囲は全社/部署/個人どれですか？"         |
| DB設計   | データ保持       | "データの保持期間はありますか？"                       |
| テスト   | 境界値           | "想定される最大データ件数は？"                         |
| 技術制約 | ライブラリ・依存 | "既存のUIコンポーネントで流用したいものはありますか？" |
| 技術制約 | 外部サービス     | "利用する外部API・サービスはありますか？"              |

---

## Phase 2: 設計書作成

### 2.1 テンプレートの使用

統合設計書テンプレートを使用:

```bash
# テンプレート読み込み
cat .claude/templates/design-template-unified.md
```

### 2.2 design.md セクション構成

| Section                         | 内容                                       | 昇格先                                             |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| 1. 概要                         | 機能概要、ユーザーストーリー               | `docs/functional_requirements.md`                |
| 2. API設計                      | エンドポイント一覧、詳細仕様               | `docs/api/{feature}_apis.md`                     |
| 3. データモデル・バリデーション | フィールド、型、**制約ルール**       | `docs/api/{feature}_apis.md`                     |
| 4. ロジック・権限設計           | 認証、認可、**リソース所有権**       | `docs/design/service_layer_design.md`            |
| 5. データベース設計             | テーブル定義                               | `docs/database/schema/`                          |
| 6. 状態遷移                     | **Enum定義、遷移ルール**             | `docs/design/`                                   |
| 7. フロントエンド設計           | コンポーネント、状態管理                   | `docs/design/detailed_design/frontend/`          |
| 8. エラーハンドリング           | 例外クラス、エラーシナリオ                 | `docs/design/service_layer_design.md`            |
| 9. テストケース                 | **ユースケース統合版テスト表**       | `docs/testing/`                                  |
| 10. 複雑なフロー詳細 (Optional) | 複雑な分岐がある場合の詳細ユースケース記述 | `docs/design/detailed_design/`                   |
| 11. シーケンス図 (Optional)     | 非同期処理・外部連携時のみ                 | `docs/design/detailed_design/sequence_diagrams/` |
| 12. 実装メモ                    | 決定事項、注意点                           | (昇格なし)                                         |
| 13. 昇格チェックリスト          | 昇格先確認                                 | (昇格制御用)                                       |

### 2.3 重要セクションの詳細

#### Section 3: データモデル・バリデーション

```markdown
### 3.1 リクエストパラメータ詳細

| 項目名 | 型 | 必須 | 制約ルール | 備考 |
|--------|-----|------|-----------|------|
| title | string | ✅ | 1〜100文字 | 空文字不可 |
| email | string | ✅ | Email形式 | 重複不可（DBユニーク） |
| age | integer | - | 0以上 | 未設定時はnull |
| format | string | ✅ | Enum: csv, excel | 大文字小文字区別なし |
```

#### Section 4: ロジック・権限設計

```markdown
### 4.1 認証・認可

* **認証**: 必須 (Bearer Token / Auth0)
* **認可 (Role)**: `Manager` 以上

### 4.2 リソースアクセス制御

| 操作 | 権限ルール |
|------|-----------|
| 閲覧 | 自分の所属部署のデータのみ (`where department_id = user.department_id`) |
| 編集 | 作成者本人のみ |
| 削除 | Admin のみ |
```

#### Section 6: 状態遷移 (該当する場合のみ)

```markdown
### 6.1 ステータス定義 (Enum)

| 値 (Code) | 日本語名 | 説明 |
|-----------|---------|------|
| `DRAFT` | 下書き | 初期状態。編集可能。 |
| `PUBLISHED` | 公開中 | 一般ユーザー閲覧可。 |
| `ARCHIVED` | アーカイブ | 閲覧不可。論理削除扱い。 |

### 6.2 遷移ルール

| From | To | 可否 | 条件 |
|------|-----|------|------|
| DRAFT | PUBLISHED | ✅ | 必須項目入力済み |
| PUBLISHED | ARCHIVED | ✅ | Admin権限 |
| ARCHIVED | DRAFT | ❌ | 復元不可 |
```

#### Section 9: テストケース (ユースケース統合版)

> **重要**: 単なる入出力だけでなく、「ユーザーがどう操作するか（手順）」を明記してください。
> これにより、E2Eテスト（Playwright/Cypress）の自動生成が可能になります。
>
> 「検証すべき副作用」列は**必須項目**です。
> DBの変更、ログ出力、メール送信、外部API呼び出し、ファイル作成など、
> 副作用がある場合は必ず記載してください。副作用がない場合のみ「なし」と記載。

```markdown
### 9.1 ユースケース & テストシナリオ

| ID | シナリオ概要 | アクター | 前提条件 | 操作手順 / 入力データ | 期待される挙動 / レスポンス | 検証すべき副作用 |
|----|------------|---------|---------|---------------------|---------------------------|-----------------|
| UC-01 | [正常系] CSVエクスポート実行 | User | データあり | 1. エクスポートボタンを押下<br>2. ダイアログで "CSV" を選択<br>3. 実行ボタンを押下 | ・200 OK<br>・ダウンロードが開始されること | export_logsに履歴作成 |
| UC-02 | [異常系] 権限なしアクセス | Guest | - | 1. APIを直接コール<br>`POST /api/export` | ・401 Unauthorized<br>・ログイン画面へリダイレクト | なし |
| UC-03 | [異常系] 無効なフォーマット | User | - | 1. エクスポートボタンを押下<br>2. format="pdf" を指定 | ・400 Bad Request<br>・エラーメッセージ表示 | なし |
| UC-04 | [境界値] 最大件数データ | Admin | 1万件のレコード | 1. 一括エクスポートを実行 | ・200 OK<br>・タイムアウトしないこと(30秒以内) | Blobにファイル作成 |
```

### 2.4 機能ID採番

1. `docs/functional_requirements.md` を確認
2. 最新の機能ID (現在: F-027) を取得
3. 新規機能には F-028 以降を採番
4. design.md Section 1 に機能IDを記載

---

## Phase 3: サブエージェントレビュー

### 3.1 使用するサブエージェント

| エージェント                    | 役割                               | 実行タイミング |
| ------------------------------- | ---------------------------------- | -------------- |
| `spec-requirements-validator` | 要件の完全性・明確性チェック       | 要件定義後     |
| `spec-design-validator`       | 設計の技術的整合性チェック         | 設計書作成後   |
| `spec-task-validator`         | タスクの原子性・実装可能性チェック | タスク分解後   |

### 3.2 レビュー実行

設計書作成完了後、`spec-design-validator` を起動:

```text
Use the spec-design-validator agent to validate the design document for the {feature-name} specification.

**重要: ペルソナ切り替え指示**
あなたは今から設計者ではありません。「辛口のセキュリティ・アーキテクト」として振る舞ってください。
自分の作成したドキュメントを「他人が書いたもの」として批判的にレビューし、
以下の観点で意地悪な指摘を少なくとも2つ挙げてください：
1. エッジケース（極端な入力）の考慮漏れ
2. 既存機能（F-001〜F-027）との不整合
3. セキュリティリスク（認証・認可の抜け穴）
4. パフォーマンス問題（大量データ時の挙動）

**セキュリティチェック**:
> 📋 **参照**: `docs/security/README.md` を確認し、該当する項目をチェックしてください。
> 機能に応じて必要なセキュリティ対策が異なります。

主なチェック観点（該当する場合）:
- XSS対策: ユーザー入力のサニタイジングが設計されているか
- SQLインジェクション対策: バリデーションが定義されているか
- 認証・認可: 適切なロールベースアクセス制御があるか
- Cache-Control: 認証必須エンドポイントの場合、no-storeが設定されるか
- Blob Storage: ファイル操作がある場合、SASトークンの有効期限等が考慮されているか
- 入力バリデーション: 全フィールドに制約ルールがあるか
- ユースケース: ユーザーの操作手順が具体的に記述されているか（単なるAPI定義になっていないか）

The agent should:
1. Read the design document at docs/specs/{feature-name}/design.md
2. Validate technical soundness, architecture quality, and completeness
3. Check alignment with existing docs/ standards
4. Check security compliance with docs/security/README.md
5. Verify proper leverage of existing code and integration points
6. Rate the overall quality as PASS, NEEDS_IMPROVEMENT, or MAJOR_ISSUES

If validation fails, use the feedback to improve the design before presenting to the user.
```

### 3.3 判定基準

| 評価                        | 基準                                                       |
| --------------------------- | ---------------------------------------------------------- |
| **PASS**              | そのまま実装に入っても手戻りが発生しないレベル             |
| **NEEDS_IMPROVEMENT** | 仕様の曖昧さが残る、またはセキュリティリスクがある         |
| **MAJOR_ISSUES**      | docs/ の既存仕様と矛盾している、または重大な設計欠陥がある |

### 3.4 レビュー結果フォーマット

```text
📋 設計レビュー結果 (spec-design-validator)

評価: ✅ PASS (2件の推奨事項あり)

チェック結果:
  ✅ 構造: テンプレート準拠
  ✅ API設計: 命名規則OK、Pydantic定義あり
  ✅ バリデーション: 全フィールドに制約定義
  ✅ 権限設計: 認証・認可・リソース制御あり
  ✅ DB設計: スキーマ定義あり
  ✅ テストケース: 7カテゴリ網羅

推奨事項:
  💡 Section 6 (状態遷移): この機能では状態管理不要のため省略可
  💡 Section 10 (シーケンス図): 非同期処理があるため追加推奨

ユーザーへの確認待ち...
```

---

## Phase 4: ユーザー承認

### 4.1 承認プロセス

1. レビュー結果と設計書をユーザーに提示
2. 明示的な承認を待つ ("yes", "approved", "looks good" 等)
3. フィードバックがあれば修正して再レビュー

### 4.2 承認後のアクション

```text
✅ 設計書が承認されました

次のステップ:
1. `/spec-implement {feature-name}` でタスクを順次実行（推奨）
   - design.md の設計内容からタスクを自動分解して実装
   - TDDファースト、Human-in-the-Loop で品質担保
2. または手動で実装:
   - design.md を参照しながらコーディング
   - テスト作成時は design.md を参照:
     - 単体テスト: `/test-generate [実装ファイル] docs/specs/{feature-name}/design.md`
     - 結合テスト: `/test-backend-integration [ルーター] docs/specs/{feature-name}/design.md`
     - UIテスト: `/test-frontend-integration [コンポーネント] docs/specs/{feature-name}/design.md`
3. 実装完了後、`/wrap-up` で品質チェック
4. `/documentation` でdocs/へ昇格
```

> 📋 **関連コマンド**: `/spec-implement` - 設計書駆動の実装を支援するコマンド

---

## 出力ファイル

```text
docs/specs/{feature-name}/
└── design.md          # 統合設計書（全情報を含む）
```

**注意**: 旧3ファイル構成（requirements.md, design.md, tasks.md）から、統合 design.md への移行により、AIのコンテキスト効率が向上します。

**保存場所**: `docs/specs/` 配下に保存することで、ドキュメントの一元管理が可能です。昇格後は `docs/specs/archive/` へ移動されます。

---

## 昇格フロー

design.md は開発中の一時的なドキュメントです。実装完了後:

1. `/wrap-up` で品質チェック
2. `/documentation {feature-name}` で docs/ へ昇格
3. 各セクションが対応する永続ドキュメントに転記

詳細は `/wrap-up` および `/documentation` コマンドを参照してください。

---

## Critical Workflow Rules

### Universal Rules

- **1つのSpecのみ同時に作成**
- **feature名はkebab-case**
- **既存コードベースの分析必須**
- **テンプレート構造を厳守**
- **ユーザー承認なしに次フェーズへ進まない**

### 質問・レビュー

- Phase 1 で必ずユーザーに質問して要件を明確化
- Phase 3 でサブエージェントレビューを実行
- レビュー結果が MAJOR_ISSUES の場合は修正必須

---

## Example Usage

```bash
/spec staff-csv-export "スタッフ一覧をCSV形式でエクスポートする機能"
```

### 実行例

```text
1. /spec staff-csv-export "CSVエクスポート機能"
   ↓
   Phase 1: 要件ヒアリング（ユーザー質問）
   - "エクスポート形式はCSV以外も必要ですか？"
   - "権限はどのロールまで許可しますか？"
   - "データ件数の上限はありますか？"
   ↓
   Phase 2: 設計書作成
   docs/specs/staff-csv-export/design.md 作成
   - 機能ID: F-028 自動採番
   - バリデーションルール定義
   - 権限設計定義
   - テストケース表含む
   ↓
   Phase 3: サブエージェントレビュー
   - spec-design-validator: 設計の整合性チェック
   - 問題があれば修正提案
   ↓
   Phase 4: ユーザー承認
   ↓
2. 実装 (design.md参照)
   - "Section 3のバリデーションルールでPydantic実装して"
   - "Section 4の権限設計で認可チェック実装して"
   ↓
3. /wrap-up (品質チェック)
   - 実行すべきコマンド: /documentation を案内
   ↓
4. /documentation staff-csv-export
   ↓
   docs/ へ自動昇格
   - docs/functional_requirements.md (F-028追加)
   - docs/api/staff_export_apis.md (新規)
   - docs/testing/staff/export/ (テストケース)
```

---

## Error Handling

| 状況                    | 対応                                                    |
| ----------------------- | ------------------------------------------------------- |
| 要件不明確              | Phase 1 で追加質問                                      |
| 設計が複雑すぎる        | 機能分割を提案                                          |
| レビューで MAJOR_ISSUES | 修正後に再レビュー                                      |
| テンプレート不明        | `.claude/templates/design-template-unified.md` を参照 |

---

## Success Criteria

- [X] Phase 1: ユーザーへの質問で要件明確化
- [X] Phase 2: 統合 design.md 作成（テンプレート準拠）
- [X] Phase 3: サブエージェントレビュー PASS
- [X] Phase 4: ユーザーの明示的承認
- [X] 機能ID (F-XXX) が採番済み
- [X] 全セクションに昇格先が明記
