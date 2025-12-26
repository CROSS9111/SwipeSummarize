## Git Commit Rules

### Commit Strategy

- **Atomic Commit**: 1タスク = 1コミット を厳守
- **Sync Commit**: コードと設計書（design.md）の進捗更新を必ずセットでコミット
- **Green Commit**: テストが失敗している状態ではコミットしない

### Commit Message Format

```text
[{feature-name}] {TaskID}: {タスク名} ({現在のタスク番号}/{総タスク数})

Changes:
- {変更内容1}
- {変更内容2}

Files:
- {変更ファイルパス1}
- {変更ファイルパス2}

Ref: docs/specs/{feature-name}/design.md
```

**例**:

```text
[staff-csv-export] T-03: APIルーター実装 (3/8)

Changes:
- CSVエクスポート用のAPIエンドポイントを追加
- Manager権限チェックを実装

Files:
- backend/app/routers/export.py
- backend/app/routers/__init__.py
- docs/specs/staff-csv-export/design.md

Ref: docs/specs/staff-csv-export/design.md
```

### Staging Rules

```bash
# 具体的なパスを指定（推奨）
git add <実装ファイル> docs/specs/{feature-name}/design.md

# git add -A は意図しないファイルを含むリスクがあるため、
# git status で確認後に実行すること
```

### Pre-Commit Checklist

1. 変更ファイルが意図したものか確認
2. design.md のタスクステータスを `✅` に更新
3. テストがパスしていることを確認
4. 不要なファイル（デバッグコード等）が含まれていないか確認
