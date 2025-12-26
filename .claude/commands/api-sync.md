---
description: BackendのPydanticモデルやOpenAPI定義から、Frontend用のTypeScript型定義を生成・同期します。
---

# API Sync Command

Backend (FastAPI) と Frontend (Next.js/TypeScript) の型定義の整合性を保つためのコマンドです。
Backendの変更を検知し、Frontendの型定義ファイルを自動更新します。

## 実行方法

```bash
/api-sync [target]
```

- **target** (オプション): 同期対象の指定。
  - 省略時: プロジェクト全体の型定義をチェック・更新
  - `schema`: Pydanticスキーマのみ同期
  - `api`: APIクライアントコードのみ同期

## 実行手順

1. **OpenAPIスキーマの取得**:
   - Backendの `openapi.json` を生成または読み込みます。
   - `backend/app/main.py` からFastAPIアプリをロードしてスキーマを出力します。

2. **TypeScript型の生成**:
   - OpenAPIスキーマを基に、TypeScriptのインターフェース定義を生成します。
   - 出力先: `frontend/src/types/api/` (または適切な型定義ディレクトリ)

3. **差分確認と適用**:
   - 既存の型定義ファイルと比較し、変更がある場合のみ更新します。
   - 変更内容（追加されたフィールド、変更された型など）を表示します。

## 使用例

```bash
# 全体の同期
/api-sync

# 特定のモデル変更時
/api-sync schema
```
