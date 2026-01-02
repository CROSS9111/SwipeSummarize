# Semantic Versioning Commit Rules

## Overview

このスキルは[Conventional Commits](https://www.conventionalcommits.org/)形式に従い、Semantic Versioning（SemVer）に対応したコミットメッセージを生成します。

## Commit Message Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Type Prefix（必須）

コミットメッセージの先頭に付与するtypeは、SemVerのバージョン変更に対応します：

### MAJOR（破壊的変更）- `x.0.0`
- `BREAKING CHANGE:` または type の後に `!` を付与
  - 例: `feat!: remove deprecated API endpoints`
  - 例: `refactor!: drop support for Node 14`

### MINOR（機能追加）- `0.x.0`
- `feat:` - 新機能の追加
  - 例: `feat: add user authentication`
  - 例: `feat(api): implement rate limiting`

### PATCH（バグ修正・軽微な変更）- `0.0.x`
- `fix:` - バグ修正
- `docs:` - ドキュメントのみの変更
- `style:` - コードの意味に影響しない変更（空白、フォーマットなど）
- `refactor:` - バグ修正や機能追加を含まないコードの変更
- `perf:` - パフォーマンス向上
- `test:` - テストの追加・修正
- `build:` - ビルドシステムや外部依存関係の変更
- `ci:` - CI設定ファイルやスクリプトの変更
- `chore:` - その他の変更（ソースやテストファイルの変更を含まない）

## Scope（オプション）

変更の影響範囲を示す：
- `feat(auth):` - 認証機能
- `fix(api):` - APIエンドポイント
- `docs(readme):` - READMEファイル
- `refactor(ui):` - UIコンポーネント

## Examples

### 新機能追加（MINOR）
```text
feat(saved): add tag filtering functionality

- Implement tag sidebar component
- Add API endpoint for fetching tags
- Support multi-select tag filtering
```

### バグ修正（PATCH）
```text
fix(api): correct null check in delete endpoint

The delete API was failing when the item ID was not found.
Added proper null check before deletion.

Fixes #123
```

### 破壊的変更（MAJOR）
```text
feat(api)!: restructure response format

BREAKING CHANGE: API responses now use camelCase instead of snake_case.
All API consumers need to update their parsing logic.
```

### リファクタリング（PATCH）
```text
refactor(hooks): simplify useFetch hook logic

Reduced complexity by extracting common patterns into utility functions.
No functional changes.
```

## Commit Message Rules

1. **Imperative mood**: "add" not "added", "fix" not "fixed"
2. **Lowercase**: type は必ず小文字
3. **No period**: description の末尾にピリオドを付けない
4. **50/72 rule**: 件名は50文字以内、本文は72文字で折り返し
5. **Blank line**: 件名と本文の間は空行

## Integration with Semantic Release

このコミット形式を使用すると、以下のツールで自動バージョニングが可能：
- [semantic-release](https://github.com/semantic-release/semantic-release)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [release-please](https://github.com/googleapis/release-please)

## Quick Reference

| Version Impact | Type | Example |
|---------------|------|---------|
| MAJOR (x.0.0) | `feat!:`, `fix!:`, `BREAKING CHANGE:` | Breaking API changes |
| MINOR (0.x.0) | `feat:` | New features |
| PATCH (0.0.x) | `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `chore:` | Bug fixes, docs |

## Usage

コミット作成時：
1. 変更の種類に応じた適切な type を選択
2. 影響範囲がある場合は scope を追加
3. 簡潔で明確な description を記述
4. 必要に応じて body と footer を追加
