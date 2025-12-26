---
allowed-tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, TodoWrite, mcp__serena__write_memory, mcp__serena__read_memory, mcp__serena__list_memories, mcp__serena__delete_memory, mcp__serena__list_dir, mcp__serena__find_file, mcp__serena__search_for_pattern
description: ドキュメント管理コマンド - Claudeとの会話をドキュメント化・既存文書の参照と更新
---

# ドキュメント管理コマンド (/docs)

Claudeとの会話内容を自動的にドキュメント化し、既存の技術文書を効率的に管理するコマンドです。

## 基本コマンド

```bash
/docs save                     # 現在の会話を自動タイトルで保存
/docs save "タイトル"           # 指定タイトルで保存
/docs recall                   # 最近のドキュメント一覧
/docs recall "キーワード"       # キーワード検索
/docs recall filename.md       # 特定ファイル参照
/docs update filename.md       # 既存ファイルに追記
/docs merge file1 file2 "新規" # 複数ファイルを統合
```

## 実用例

### 1. 新機能実装の記録
```bash
# 実装前に関連ドキュメントを確認
/docs recall "認証"

# 実装作業...

# 作業内容を保存
/docs save "Auth0認証の実装"
```

### 2. 既存ドキュメントの更新
```bash
# 現在の内容を確認
/docs recall AZURE_AUTHENTICATION_SETUP.md

# 作業実施...

# 変更内容を既存ファイルに追記
/docs update AZURE_AUTHENTICATION_SETUP.md
```

### 3. 複数ドキュメントの統合
```bash
# 関連ドキュメントを統合して包括的なガイドを作成
/docs merge auth.md ssl.md deploy.md "完全セットアップガイド"
```

## 自動生成される内容

### saveコマンドで作成される項目
- **概要**: 実装・修正内容のサマリー
- **背景**: なぜその変更が必要だったか
- **変更内容**: 
  - 修正されたファイル一覧
  - 主要なコード変更
  - 設定の変更
- **手順**: 実施した作業の順序
- **注意点**: 今後気をつけるべきこと
- **関連情報**: 参照したドキュメントやリンク

### ファイル名の自動生成規則

```
docs/claude/YYYY-MM-DD_<主要トピック>_<アクション>.md
例: docs/claude/2025-01-13_FastAPI_マネージドID実装.md
```

既存ドキュメントの更新時は元の場所を維持：
- `docs/AZURE_AUTHENTICATION_SETUP.md` → 同じ場所で更新
- `README.md` → プロジェクトルートのまま更新

## 高度な使い方

### 検索とフィルタリング
```bash
# 日付で検索
/docs recall 2025-01

# 複数キーワード
/docs recall "Azure" "認証"

# 最近の5件
/docs recall --recent 5
```

### 部分一致検索
```bash
# ファイル名の一部で検索
/docs recall auth     # auth.md, authentication.md などがヒット
/docs update azure    # AZURE_AUTHENTICATION_SETUP.md を更新
```

### スマート更新
```bash
# 適切な場所に自動挿入
/docs update README.md
→ 変更内容に基づいて適切なセクションに追記

# 重複を避けて更新
/docs update setup.md
→ 既存の内容と重複しないように整理して追記
```

## ドキュメント構造

### 保存場所

すべてのドキュメントは `docs/` フォルダに保存されます：

- **docs/**: すべての技術文書とClaudeとの会話記録
- **docs/claude/**: Claudeとの会話履歴（自動生成）
- **docs/api/**: API関連ドキュメント
- **docs/setup/**: セットアップガイド
- **docs/troubleshooting/**: トラブルシューティング

※ プロジェクトルートのREADME.mdとCLAUDE.mdは例外として維持

### 自動整理機能
- 類似内容の統合
- 古い情報の更新通知
- 関連ドキュメントの相互リンク
- 目次の自動生成

## 実装時の動作

### saveコマンド
1. 現在の会話を分析
2. 実装内容・変更点を抽出
3. 適切なフォーマットで文書化
4. ファイル名を自動生成または指定名で保存

### recallコマンド
1. 指定された条件でドキュメントを検索
2. 関連度順に結果を表示
3. 要約または全文を表示

### updateコマンド
1. 既存ドキュメントを読み込み
2. 現在の会話内容を分析
3. 適切な場所に新情報を挿入
4. 重複や矛盾を自動調整

### mergeコマンド
1. 指定されたファイルを全て読み込み
2. 内容を論理的に整理・統合
3. 新しいドキュメントとして保存

## 便利な機能

### 自動サジェスト
- ファイル名の補完
- 関連ドキュメントの提案
- よく使うコマンドの履歴

### テンプレート
- API仕様書
- セットアップガイド
- トラブルシューティング
- 変更履歴

### 品質チェック
- リンク切れの検出
- 古い情報の警告
- フォーマットの統一

## 使用上の注意

- 機密情報は自動的にマスクされます
- 大きな変更は確認プロンプトが表示されます
- バックアップは自動的に作成されます

---

このコマンドを使用することで、プロジェクトの知識を体系的に蓄積し、チーム全体で共有できる高品質なドキュメントを維持できます。