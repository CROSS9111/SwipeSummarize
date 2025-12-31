# 設計書: タグ自動生成機能 (F-006)

## 1. 概要

### 1.1 機能ID
F-006

### 1.2 機能名
タグ自動生成機能

### 1.3 目的
記事の内容から関連するタグを自動生成し、記事の分類と検索性を向上させる

### 1.4 スコープ
- **含まれるもの**
  - LLMを使用したタグ生成ロジック
  - データベーススキーマの更新
  - API エンドポイントの修正
  - UI コンポーネントの更新

- **含まれないもの**
  - URL登録時の非同期処理化（別機能として扱う）
  - タグによる検索・フィルタリング機能
  - 手動でのタグ編集機能

## 2. 技術アーキテクチャ

### 2.1 システム構成図

```mermaid
graph TD
    A[Client] -->|URL取得要求| B[/api/urls/random]
    B --> C[Jina Reader API]
    C -->|記事コンテンツ| D[LLM Client]
    D -->|プロンプト実行| E[Google Gemini API]
    E -->|要約+タグ| D
    D --> F[Supabase DB]
    F -->|保存結果| B
    B -->|レスポンス| A
```

### 2.2 技術スタック
- **バックエンド**: Next.js API Routes
- **LLM**: Google Gemini API (gemini-1.5-flash)
- **データベース**: Supabase (PostgreSQL)
- **フロントエンド**: React + TypeScript + shadcn/ui

## 3. データベース設計

### 3.1 スキーマ変更

#### 既存テーブル: urls

```sql
-- 既存のカラムに追加
ALTER TABLE urls
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- インデックスの追加（将来の検索機能のため）
CREATE INDEX idx_urls_tags ON urls USING GIN(tags);
```

### 3.2 データモデル

```typescript
// types/index.ts の更新
export interface URLRecord {
  id: string;
  original_url: string;
  title: string;
  summary: string;
  tags: string[];  // 新規追加
  is_seen: boolean;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}
```

## 4. API設計

### 4.1 更新対象エンドポイント

#### GET /api/urls/random

**変更内容:**
- 要約生成時にタグも同時に生成
- レスポンスにtagsフィールドを追加

**レスポンス例:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "original_url": "https://example.com/article",
  "title": "Article Title",
  "summary": "Article summary...",
  "tags": ["React", "TypeScript", "Next.js", "Performance", "Tutorial"],
  "is_seen": false,
  "is_saved": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## 5. LLM統合設計

### 5.1 プロンプト設計

```typescript
const SUMMARY_AND_TAG_PROMPT = `
以下の記事を分析して、要約とタグを生成してください。

記事内容:
{content}

以下の形式でJSONを返してください：
{
  "summary": "記事の要約（200-300文字）",
  "tags": ["タグ1", "タグ2", ...] // 5-10個の単語タグ
}

タグ生成のルール：
1. 固有名詞（技術名、製品名、企業名など）を優先
2. 記事の主要トピックを表す一般名詞も含める
3. 単語のみ（フレーズは避ける）
4. 表記は統一する（例: "JavaScript"は常に"JavaScript"）
5. 記事の内容理解に重要なキーワードを優先度高く選定
`;
```

### 5.2 実装方法

```typescript
// lib/llmClient.ts の更新
interface SummaryAndTagsResponse {
  summary: string;
  tags: string[];
}

async function generateSummaryAndTags(
  content: string
): Promise<SummaryAndTagsResponse> {
  const prompt = SUMMARY_AND_TAG_PROMPT.replace('{content}', content);
  const response = await geminiModel.generateContent(prompt);
  return JSON.parse(response.text);
}
```

## 6. UI/UX設計

### 6.1 スワイプカード表示

```tsx
// components/ArticleCard.tsx の更新
<Card>
  <CardHeader>
    <h2>{title}</h2>
  </CardHeader>
  <CardContent>
    <p>{summary}</p>
    {/* タグ表示セクション追加 */}
    <div className="flex flex-wrap gap-2 mt-4">
      {tags.map((tag, index) => (
        <Badge key={index} variant="secondary">
          <Tag className="h-3 w-3 mr-1" />
          {tag}
        </Badge>
      ))}
    </div>
  </CardContent>
</Card>
```

### 6.2 保存済みページ表示

保存済みページ（/saved）でも同様にタグを表示

## 7. 実装計画

### 7.1 フェーズ分け

#### Phase 1: データベース準備
1. マイグレーションスクリプトの作成
2. 型定義の更新

#### Phase 2: バックエンド実装
1. LLMクライアントの更新
2. API エンドポイントの更新
3. データベース保存処理の更新

#### Phase 3: フロントエンド実装
1. ArticleCard コンポーネントの更新
2. 保存済みページの更新
3. スタイリング調整

### 7.2 実装優先順位
1. **高**: LLMプロンプト設計とテスト
2. **高**: データベーススキーマ更新
3. **中**: API実装
4. **低**: UI表示の実装

## 8. テスト戦略

### 8.1 単体テスト
- LLMレスポンスのパース処理
- タグの正規化処理
- データベース保存処理

### 8.2 統合テスト
- API エンドポイントの動作確認
- エラーハンドリングの確認

### 8.3 手動テスト項目
- [ ] 様々な記事でタグが適切に生成されることを確認
- [ ] 既存データへの影響がないことを確認
- [ ] UIでタグが正しく表示されることを確認

## 9. 移行戦略

### 9.1 既存データの扱い
- 既存のURLレコードのtagsカラムは空配列のまま維持
- 新規取得分からタグ生成を適用

### 9.2 後方互換性
- tagsフィールドがない場合も正常動作するようフロントエンドで考慮

## 10. 非機能要件

### 10.1 パフォーマンス
- LLM呼び出しは1回のAPI呼び出しで完結（要約とタグを同時生成）
- タグ生成による追加レイテンシ: 最大100ms程度

### 10.2 制限事項
- タグ数: 5-10個
- タグ長: 最大30文字/タグ
- タグ形式: 単語のみ（スペース無し）

## 11. セキュリティ考慮事項

- LLMレスポンスのサニタイゼーション
- SQLインジェクション対策（パラメータバインディング使用）
- XSS対策（Reactの自動エスケープに依存）

## 12. 将来の拡張性

### 12.1 考慮済みの将来機能
- タグによる検索・フィルタリング
- タグの手動編集
- タグのカテゴリ分類
- タグクラウド表示

### 12.2 設計上の配慮
- タグデータは配列形式で柔軟性を確保
- GINインデックスによる高速検索の準備
- タグ生成ロジックのモジュール化

## 13. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| LLMが不適切なタグを生成 | 中 | 低 | バリデーション実装、禁止ワードリスト |
| タグ生成でAPIコスト増加 | 低 | 中 | 要約と同時生成で最小化 |
| 既存データとの不整合 | 低 | 低 | 空配列デフォルト値で対応 |

## 14. 成功指標

- タグ生成成功率: 95%以上
- タグの適切性: ユーザーフィードバックで評価
- パフォーマンス影響: レスポンス時間増加100ms以内

## 15. 参考資料

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Supabase Array Column Documentation](https://supabase.com/docs/guides/database/arrays)
- [Next.js API Routes Best Practices](https://nextjs.org/docs/api-routes/introduction)