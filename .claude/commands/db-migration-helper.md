---
description: DBモデルの変更を検知し、Alembicマイグレーションスクリプトを安全に生成します。
---

# DB Migration Helper Command

SQLAlchemyモデルの変更に基づいてマイグレーションスクリプトを生成し、危険な操作（カラム削除など）が含まれていないかチェックします。

## 実行方法

```bash
/db-migration-helper [message]
```

- **message**: マイグレーションの内容を表す短いメッセージ (例: "add_user_status_column")

## 実行手順

1. **現状確認**:
   - `backend` ディレクトリで `alembic` が利用可能か確認します。

2. **マイグレーション生成**:
   - 以下のコマンドを実行してマイグレーションファイルを生成します。
   ```bash
   cd backend
   alembic revision --autogenerate -m "[message]"
   ```

3. **安全性チェック**:
   - 生成されたマイグレーションファイル（`backend/migrations/versions/*.py` の最新）を読み込みます。
   - 以下のキーワードが含まれているか確認し、警告を出します。
     - `op.drop_table`
     - `op.drop_column`
     - `op.alter_column` (型変更や制約削除の場合)

4. **結果表示**:
   - 生成されたファイルパスと内容を表示します。
   - 警告がある場合は、「⚠️ 破壊的な変更が含まれています。内容を確認してください。」と強調表示します。

## 注意事項

- このコマンドはマイグレーションファイルの**生成のみ**を行います。DBへの適用（`alembic upgrade head`）は行いません。
- 生成されたファイルは必ず目視確認し、必要に応じて手動修正してください。
