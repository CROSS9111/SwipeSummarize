---
description: コード変更の影響範囲を分析し、ドキュメントとテストの更新漏れをチェックします。デフォルトでdevブランチとの差分を確認します。
---

# Check Impact Command

コード変更による影響範囲を特定し、`docs/document_management_list.md` に基づいてドキュメントとテストの整合性をチェックします。

## 実行方法

```bash
/check-impact [base_ref]
```

- **base_ref** (オプション): 比較対象のブランチ名またはコミットハッシュ。
  - 省略時: `dev` ブランチ (origin/dev があればそちらを優先)
  - 例: `/check-impact` (devと比較)
  - 例: `/check-impact main` (mainと比較)
  - 例: `/check-impact HEAD~1` (直前のコミットと比較)

## 実行手順

### 1. 変更ファイルの特定

まず、以下のコマンドを実行して変更されたファイルの一覧を取得してください。
ユーザーが `base_ref` を指定しなかった場合は、`origin/dev` または `dev` を使用してください。

```bash
# 変更ファイル名の取得
git diff --name-only <base_ref>...HEAD
```

※ もし `...` で差分が出ない場合は `..` を試すか、単に `git status` (未コミットの場合) を確認してください。

### 2. 変更内容の分析

変更されたファイルの中身を確認し（`git diff <base_ref>...HEAD` や `view_file` を使用）、以下の点を分析してください：

1.  **機能的影響**: どのような機能が追加・変更・削除されたか？
2.  **依存関係**: データベーススキーマ、API定義、共通コンポーネントへの変更はあるか？

### 3. ドキュメント整合性チェック

`docs/document_management_list.md` を読み込み、変更内容に対応するドキュメントが更新されているか確認してください。

- **API変更** (backend/app/routers, frontend/src/app/api 等)
    - -> `api_specification_backend.md` / `api_specification_frontend.md`
- **DBスキーマ変更** (backend/app/models, migrations 等)
    - -> `er_diagram.drawio`, `database_design.md`
- **画面UI変更** (frontend/src/app/page.tsx, components 等)
    - -> `screen_transition.drawio`, `screen_list.md`, `component_design.md`
- **インフラ変更** (docker-compose.yml, azure/ 等)
    - -> `infrastructure_design.md`

**判定基準**:
- 機能変更があるのに、対応するドキュメントが「変更ファイル一覧」に含まれていない場合は「⚠️ 更新漏れの可能性」と判定。

### 4. テスト整合性チェック

変更されたコードに対応するテストコードが更新されているか確認してください。

- **Backend**: `backend/tests/` 配下の対応するテスト
- **Frontend**: `__tests__` ディレクトリや `*.test.tsx` ファイル

**判定基準**:
- ロジック変更があるのに、テストファイルの変更がない場合は「⚠️ テスト更新漏れの可能性」と判定。

## 出力形式

以下のフォーマットでレポートを出力してください。

```markdown
# 🔍 影響範囲分析レポート

**比較対象**: `<base_ref>`

## 1. 変更概要
- **変更ファイル数**: Xファイル
- **主な変更領域**: (例: ユーザー認証API, 決済画面)

## 2. ドキュメント整合性チェック
`docs/document_management_list.md` に基づく確認結果:

| 状態 | ドキュメント | 関連する変更 | 判定 |
| :--- | :--- | :--- | :--- |
| ✅ OK | API仕様書 | `routers/auth.py` | 更新されています |
| ⚠️ MISSING | **ER図** | `models/user.py` | スキーマ変更がありますが、ER図が更新されていません |
| - | 画面遷移図 | - | 影響なし |

## 3. テスト整合性チェック

| 状態 | コンポーネント | テストファイル | 判定 |
| :--- | :--- | :--- | :--- |
| ✅ OK | User Service | `tests/unit/test_user.py` | ロジック変更に合わせて修正済み |
| ⚠️ MISSING | **Auth API** | `tests/integration/test_auth.py` | API仕様変更がありますが、テストが更新されていません |

## 4. 推奨アクション
1. `docs/design/basic_design/er_diagram.drawio` を更新してください。
2. `backend/tests/integration/test_auth.py` に新しい認証フローのテストケースを追加してください。
```
