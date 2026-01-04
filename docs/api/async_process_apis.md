# 非同期要約処理 API仕様書

**機能ID**: F-007-ASYNC-PROCESS
**最終更新**: 2026-01-04

---

## 概要

URL登録時の要約・タグ生成処理を非同期化し、ユーザー体験を向上させるAPI群。
Next.js 15.1+ の `after()` API を使用してバックグラウンドで処理を実行する。

---

## エンドポイント一覧

| Method | Path | Summary | 変更内容 |
|--------|------|---------|---------|
| POST | `/api/urls` | URL登録（非同期要約開始） | **変更**: 202 Accepted + after()で非同期処理 |
| GET | `/api/urls/random` | ランダム記事取得 | **変更**: 要約済みのみ対象 |
| GET | `/api/urls/waiting-list` | 待機リスト取得 | **変更**: ステータス情報追加 |
| POST | `/api/urls/[id]/retry` | 要約リトライ | **新規**: エラーURLの再処理 |

---

## API詳細

### POST /api/urls

URLを登録し、非同期で要約・タグ生成を開始する。

#### Request

```typescript
// Content-Type: application/json
interface CreateUrlRequest {
  url: string; // URL（必須、URL形式、http/https のみ）
}
```

#### Response

**成功時**: `202 Accepted`

```typescript
interface CreateUrlResponse {
  id: string;         // URL ID (UUID)
  url: string;        // 登録されたURL
  status: string;     // 'pending'
  created_at: string; // ISO 8601
  message: string;    // 「URLを登録しました。バックグラウンドで要約を生成中です。」
}
```

**エラー時**:

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| INVALID_URL | 400 | URLの形式が不正、またはSSRF対策でブロック |
| URL_ALREADY_EXISTS | 400 | 同一URLが既に登録済み |
| VALIDATION_ERROR | 400 | Zodバリデーションエラー |
| INTERNAL_ERROR | 500 | サーバーエラー |

#### SSRF保護

以下のURLはセキュリティ上ブロックされます:
- `localhost`, `127.0.0.1`, `0.0.0.0`
- プライベートIP: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- `file://`, `ftp://` などの非HTTP(S)プロトコル

---

### GET /api/urls/random

要約済み（status='completed'）のURLからランダムに1件取得する。

#### Response

**成功時**: `200 OK`

```typescript
interface RandomUrlResponse {
  id: string;
  url: string;
  title: string;
  summary: string;
  tags: string[];
  created_at: string;
}
```

**エラー時**:

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| NO_COMPLETED_URLS | 404 | 要約済みURLが存在しない（処理中件数を含むメッセージ） |
| FETCH_ERROR | 500 | データ取得エラー |

---

### GET /api/urls/waiting-list

ステータス別の件数と待機リストを取得する。

#### Query Parameters

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| page | number | 1 | ページ番号 |
| limit | number | 20 | 1ページあたりの件数（最大100） |

#### Response

**成功時**: `200 OK`

```typescript
interface WaitingListResponse {
  items: WaitingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  statusCounts: {
    pending: number;
    processing: number;
    completed: number;
    error: number;
  };
}

interface WaitingListItem {
  id: string;
  url: string;
  domain: string;          // URLから抽出されたドメイン
  status: UrlStatus;       // 'pending' | 'processing' | 'completed' | 'error'
  error_message?: string;  // エラー時のみ
  created_at: string;
}
```

---

### POST /api/urls/[id]/retry

エラーステータスのURLの要約処理をリトライする。

#### Path Parameters

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | string (UUID) | リトライ対象のURL ID |

#### Response

**成功時**: `202 Accepted`

```typescript
interface RetryResponse {
  id: string;
  status: string;   // 'pending'
  message: string;  // 「要約処理を再開しました」
}
```

**エラー時**:

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| URL_NOT_FOUND | 404 | 指定されたURLが存在しない |
| INVALID_STATUS | 400 | エラーステータス以外のURLはリトライ不可 |
| RETRY_FAILED | 500 | リトライ処理の開始に失敗 |

---

## 状態遷移

```
pending → processing → completed
              ↓
            error ←→ pending (retry)
```

| 状態 | 説明 |
|------|------|
| pending | 初期状態。非同期処理開始前 |
| processing | 要約生成中 |
| completed | 要約・タグ生成完了。ランダム取得対象 |
| error | 処理失敗。リトライ可能 |

---

## 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/api/urls/route.ts` | POST /api/urls |
| `app/api/urls/random/route.ts` | GET /api/urls/random |
| `app/api/urls/waiting-list/route.ts` | GET /api/urls/waiting-list |
| `app/api/urls/[id]/retry/route.ts` | POST /api/urls/[id]/retry |
| `lib/async-summarize.ts` | 非同期処理ユーティリティ |
| `lib/url-validator.ts` | URL検証・SSRF対策 |

---

## 関連ドキュメント

- [設計書](../specs/async-process/design.md)
- [機能要件](../functional_requirements.md#f-007-async-process-非同期要約処理)
- [DBスキーマ](../database/urls_schema.md)
