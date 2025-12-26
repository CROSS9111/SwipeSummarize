---
description: コード変更に基づいてドキュメントの更新案を生成します。API仕様書や設計書の保守を自動化します。
---

# Document Update Command

指定されたソースコードの変更内容を分析し、対応するドキュメント（Markdown）の更新案を生成します。

## 実行方法

```bash
/doc-update [source_file] [target_doc]
```

- **source_file**: 変更されたソースコードのパス (例: `backend/app/routers/users.py`)
- **target_doc**: 更新対象のドキュメントパス (例: `docs/api/users.md`)

## 実行手順

1. **ソースコードの分析**:
   - `source_file` を読み込み、クラス、関数、APIエンドポイントの定義、Docstringを抽出します。
   - 以前のバージョンとの差分（もし分かれば）や、現在の実装ロジックを理解します。

2. **ドキュメントの分析**:
   - `target_doc` を読み込み、現在の記載内容を把握します。
   - どのセクションが `source_file` に対応しているか特定します。

3. **更新案の生成**:
   - コードの実装に合わせてドキュメントを書き換えます。
   - **APIの場合**: パラメータ、レスポンス、ステータスコード、認証要件の変更を反映します。
   - **DBモデルの場合**: カラム名、型、制約の変更をER図記述やテーブル定義表に反映します。
   - **注意**: 既存のフォーマット（見出しレベルや表の形式）を維持してください。

4. **出力**:
   - ドキュメントの更新後の全量、または変更箇所のdiffを表示します。

## 使用例

### API仕様書の更新
```bash
/doc-update backend/app/routers/items.py docs/api/items.md
```

### DB設計書の更新
```bash
/doc-update backend/app/models/user.py docs/design/detailed_design/database_design.md
```
