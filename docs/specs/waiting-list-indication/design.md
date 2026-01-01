# 設計書：waiting-list-indication

## 1. 概要

### 1.1 機能ID
**F-006**: Waiting List表示機能

### 1.2 機能概要
トップページ下部に、waiting list（未要約のURLリスト）を一覧表示する機能。要約生成は不要で、タイトル＋URLのシンプルなリストとして表示する。

### 1.3 ビジネス価値
- ユーザーが待機中の記事を一覧で把握できる
- 記事の優先順位を視覚的に確認可能
- ランダム選択前に全体像を把握できる

### 1.4 ユーザーストーリー
- ユーザーとして、待機中の記事リストを確認して、次に読まれる記事の候補を把握したい
- ユーザーとして、特定の記事を直接クリックして元記事を開きたい
- ユーザーとして、大量の待機記事がある場合でも、スムーズにスクロールして確認したい

## 2. API設計

### 2.1 エンドポイント一覧

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | /api/urls/waiting-list | Waiting list取得（ページネーション対応） | 不要 |

### 2.2 詳細仕様

#### GET /api/urls/waiting-list

**リクエストパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| page | number | - | ページ番号（デフォルト: 1） |
| limit | number | - | 取得件数（デフォルト: 20、最大: 50） |

**レスポンス**

```json
{
  "items": [
    {
      "id": "uuid-1234",
      "url": "https://example.com/article",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

**実装時変更**: `title`フィールドはDBスキーマ制約により削除されました。

**エラーレスポンス**

| ステータスコード | エラーコード | 説明 |
|-----------------|-------------|------|
| 400 | INVALID_PARAMS | 不正なパラメータ |
| 500 | INTERNAL_ERROR | サーバーエラー |

## 3. データモデル・バリデーション

### 3.1 リクエストパラメータ詳細

| 項目名 | 型 | 必須 | 制約ルール | 備考 |
|--------|-----|------|-----------|------|
| page | number | - | 1以上100以下の整数 | デフォルト: 1、上限でDoS対策 |
| limit | number | - | 1〜50の整数 | デフォルト: 20 |

### 3.2 レスポンスフィールド

| フィールド | 型 | 説明 | 備考 |
|-----------|-----|------|------|
| items[].id | string | URLのID | UUID形式 |
| items[].title | string | 記事タイトル | **実装時削除**: DBスキーマ制約により削除 |
| items[].url | string | 記事URL | 元記事のURL |
| items[].created_at | string | 追加日時 | ISO 8601形式 |
| pagination.hasMore | boolean | 次ページの有無 | 無限スクロール用 |

## 4. ロジック・権限設計

### 4.1 認証・認可
* **認証**: 不要（公開機能）
* **認可**: 不要
* **レート制限**: 1分間に10リクエストまで（DoS対策）

### 4.2 リソースアクセス制御
* 全ユーザーが全データを閲覧可能（現在は単一ユーザーアプリ）
* URLサニタイゼーション: XSS対策のため、URLは必ずエスケープ処理

### 4.3 パフォーマンス最適化
* **データベース**: `created_at` にインデックス設定済み
* **大量データ対策**: 1000件超の場合、仮想スクロール（react-window）を検討
* **キャッシュ**: 初期20件はSWRでキャッシュ、バックグラウンド更新

## 5. データベース設計

### 5.1 使用テーブル

既存の `urls` テーブルを使用：

```sql
-- 既存テーブル（変更なし）
CREATE TABLE urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    content TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}'
);
```

### 5.2 クエリ

```sql
-- **実装版**: Waiting list取得（全URLを表示）
SELECT id, url, created_at
FROM urls
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- **実装版**: 総件数取得（全URL）
SELECT COUNT(*) as total
FROM urls;
```

## 6. 状態遷移

この機能では状態管理は不要（単純な読み取り専用機能）

## 7. フロントエンド設計

### 7.1 コンポーネント構造

```
app/page.tsx（既存）
└── components/
    └── WaitingList.tsx（新規）
        ├── WaitingListItem.tsx（新規）
        └── LoadMoreButton.tsx（新規）
```

### 7.2 主要コンポーネント

#### WaitingList.tsx
- 待機リスト全体のコンテナ
- 無限スクロール制御
- データフェッチ管理

#### WaitingListItem.tsx
- 個別アイテムの表示
- クリックで新規タブで元記事を開く
- タイトル＋URLの表示

### 7.3 状態管理

```typescript
interface WaitingListState {
  items: WaitingItem[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  total: number;
  isInitialLoad: boolean;
}

interface WaitingItem {
  id: string;
  url: string;  // タイトルはDBスキーマ制約により削除
  created_at: string;
}

// パフォーマンス最適化：useRefパターン
interface RefState {
  isLoadingRef: React.MutableRefObject<boolean>;
  hasMoreRef: React.MutableRefObject<boolean>;
}
```

### 7.4 UI配置

```
┌────────────────────────────────────┐
│         [ヘッダー]                  │
│         [URL入力欄]                 │
│         [要約カード]                │
│         [アクションボタン]          │
├────────────────────────────────────┤
│    📄 Waiting List (45件)           │
├────────────────────────────────────┤
│ ▸ example.com                       │
│   https://example.com/article       │
├────────────────────────────────────┤
│ ▸ another-site.com                  │
│   https://another-site.com/news     │
├────────────────────────────────────┤
│          ...                        │
│    [さらに読み込む]                 │
└────────────────────────────────────┘
```

## 8. エラーハンドリング

### 8.1 エラーシナリオ

| シナリオ | エラーメッセージ | 対処 |
|---------|-----------------|------|
| API通信エラー | "リストの取得に失敗しました" | リトライボタン表示 |
| 空のリスト | "待機中の記事はありません" | 空状態UI表示 |
| ページネーションエラー | "追加の読み込みに失敗しました" | 再読み込みボタン |

## 9. テストケース

### 9.1 ユースケース & テストシナリオ

| ID | シナリオ概要 | アクター | 前提条件 | 操作手順 / 入力データ | 期待される挙動 / レスポンス | 検証すべき副作用 |
|----|------------|---------|---------|---------------------|---------------------------|-----------------|
| UC-01 | [正常系] リスト初期表示 | User | URLが20件以上存在 | 1. トップページアクセス | ・waiting list 20件表示<br>・「さらに読み込む」ボタン表示 | なし |
| UC-02 | [正常系] 追加読み込み | User | 21件以上のURL | 1. 「さらに読み込む」クリック | ・次の20件を追加表示<br>・スクロール位置維持 | なし |
| UC-03 | [正常系] 記事を開く | User | リスト表示中 | 1. アイテムをクリック | ・新規タブで元記事を開く | なし |
| UC-04 | [正常系] 空リスト | User | URLが0件 | 1. トップページアクセス | ・"待機中の記事はありません"表示 | なし |
| UC-05 | [境界値] 最終ページ | User | URLが35件 | 1. 初期表示（20件）<br>2. 追加読み込み（15件） | ・残り15件表示<br>・「さらに読み込む」非表示 | なし |
| UC-06 | [異常系] API通信エラー | User | - | 1. ネットワーク切断<br>2. ページアクセス | ・エラーメッセージ表示<br>・リトライボタン表示 | なし |
| UC-07 | [正常系] リアルタイム更新 | User | リスト表示中 | 1. 新規URL追加<br>2. ランダム要約で削除 | ・リスト自動更新<br>・件数の増減を反映 | なし |

## 10. 複雑なフロー詳細

### 10.1 無限スクロール実装

```typescript
// 無限スクロールのフロー
1. 初期ロード: GET /api/urls/waiting-list?page=1&limit=20
2. スクロール検知: Intersection Observer APIを使用
3. 追加ロード: hasMore=trueの場合、page++して次をフェッチ
4. マージ: 既存items配列に新規取得分を追加
5. 終了判定: hasMore=falseで「さらに読み込む」を非表示
```

### 10.2 リアルタイム同期

```typescript
// URL追加/削除時の同期
1. URL追加時:
   - UrlInput.onUrlAdded() → fetchRandomSummary()
   - WaitingList.refetch() で最新リスト取得
   - 楽観的UI: 即座にリストに追加表示、エラー時はロールバック

2. 要約生成（削除）時:
   - handleDiscard() or handleKeep() 実行
   - WaitingList.refetch() で自動更新
   - 削除アニメーション後にリスト再構築

3. 状態の一貫性保証:
   - useEffect()でURLsテーブル変更を監視
   - 要約カード表示中のIDはリストからグレーアウト
   - 同時操作の競合解決: タイムスタンプベースの楽観的ロック
```

## 11. シーケンス図

この機能は単純な読み取り専用のため、シーケンス図は省略

## 12. 実装メモ

### 12.1 実装順序
1. APIエンドポイント実装（/api/urls/waiting-list）
2. WaitingListコンポーネント作成
3. app/page.tsxへの統合
4. 無限スクロール実装
5. リアルタイム更新の連携

### 12.2 注意事項
- 既存のランダム要約機能は維持（メイン機能として残す）
- パフォーマンス考慮：大量URLでも高速表示
- モバイルUI考慮：タップしやすいリスト項目サイズ
- アクセシビリティ：キーボード操作対応

### 12.3 パフォーマンス最適化 (実装時追加)

実装中に発生したfetchエラー（無限ループ）を解決するため、以下の最適化を実装：

#### 問題
```typescript
// 問題のあったコード：循環依存により無限ループ
const fetchWaitingList = useCallback(async (pageNum: number, reset = false) => {
  if (!reset && (isLoading || !hasMore)) return;
  // ...
}, [hasMore, isLoading]); // この依存配列が問題
```

#### 解決策：useRefパターン
```typescript
// useRefを使用してstate更新による再レンダリングを回避
const isLoadingRef = useRef(false);
const hasMoreRef = useRef(true);

const fetchWaitingList = useCallback(async (pageNum: number, reset = false) => {
  if (!reset && (isLoadingRef.current || !hasMoreRef.current)) return;

  setIsLoading(true);
  isLoadingRef.current = true;

  try {
    // ... fetch logic
    setHasMore(data.pagination.hasMore);
    hasMoreRef.current = data.pagination.hasMore; // refを同期
  } finally {
    setIsLoading(false);
    isLoadingRef.current = false;
  }
}, []); // 空の依存配列で安定化

// ESLint警告を抑制（意図的な設計のため）
useEffect(() => {
  fetchWaitingList(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [refreshTrigger]);
```

#### 効果
- 無限ループエラー解消
- レンダリング回数削減によるパフォーマンス向上
- 安定したfetch関数参照の維持

### 12.4 将来の拡張性
- ドラッグ＆ドロップでの順序変更
- リストからの個別削除機能
- タグによるフィルタリング
- 検索機能

## 13. 昇格チェックリスト

- [x] 機能要件を`docs/functional_requirements.md`へ追加（F-006）
- [x] **実装完了**: WaitingListコンポーネント、API、UI統合
- [x] **パフォーマンス最適化**: useRefパターンによる無限ループ対策
- [ ] API仕様を`docs/api/waiting_list_apis.md`として作成
- [ ] テストケースを`docs/testing/waiting_list/`へ
- [x] 実装完了後、`/documentation`コマンドで永続化