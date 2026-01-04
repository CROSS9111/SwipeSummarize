# after() API シーケンス図

## 1. URL登録〜バックグラウンド要約フロー

```mermaid
sequenceDiagram
    autonumber
    participant User as ユーザー
    participant Client as フロントエンド
    participant API as API Route<br/>(POST /api/urls)
    participant DB as Supabase
    participant BG as after()内処理
    participant Jina as Jina Reader API
    participant LLM as Gemini API

    User->>Client: URL入力・送信
    Client->>API: POST /api/urls {url}

    Note over API: URLバリデーション<br/>SSRF対策チェック

    API->>DB: INSERT (status: 'pending')
    DB-->>API: URL ID返却

    Note over API: after() に処理を登録

    API-->>Client: 202 Accepted<br/>{id, status: 'pending'}
    Client-->>User: 「登録しました」表示

    Note over API,BG: レスポンス返却後に実行開始

    rect rgb(240, 248, 255)
        Note over BG: バックグラウンド処理開始
        BG->>DB: UPDATE status='processing'
        BG->>Jina: 記事コンテンツ取得
        Jina-->>BG: title, content
        BG->>LLM: 要約・タグ生成
        LLM-->>BG: summary, tags
        BG->>DB: UPDATE (title, summary, tags)<br/>status='completed'
    end
```

## 2. エラー発生時のフロー

```mermaid
sequenceDiagram
    autonumber
    participant BG as after()内処理
    participant DB as Supabase
    participant Jina as Jina Reader API
    participant LLM as Gemini API

    Note over BG: バックグラウンド処理開始

    BG->>DB: UPDATE status='processing'

    loop リトライ (最大3回)
        BG->>Jina: 記事コンテンツ取得
        alt 成功
            Jina-->>BG: title, content
            BG->>LLM: 要約・タグ生成
            LLM-->>BG: summary, tags
            BG->>DB: UPDATE status='completed'
            Note over BG: 処理完了
        else 失敗
            Jina--xBG: エラー
            Note over BG: 1秒 → 2秒 → 3秒 待機<br/>(指数バックオフ)
        end
    end

    BG->>DB: UPDATE status='error'<br/>error_message保存
```

## 3. リトライAPIフロー

```mermaid
sequenceDiagram
    autonumber
    participant User as ユーザー
    participant Client as フロントエンド
    participant API as API Route<br/>(POST /api/urls/[id]/retry)
    participant DB as Supabase
    participant BG as after()内処理

    User->>Client: リトライボタンクリック
    Client->>API: POST /api/urls/{id}/retry

    API->>DB: SELECT (status確認)
    DB-->>API: status='error'

    alt status が 'error' の場合
        API->>DB: UPDATE status='pending'
        Note over API: after() に処理を登録
        API-->>Client: 202 Accepted
        Client-->>User: 「再処理開始」表示

        Note over BG: 通常の要約処理を再実行
    else status が 'error' 以外
        API-->>Client: 400 Bad Request
        Client-->>User: 「リトライ不可」表示
    end
```

## 4. ステータス遷移図

```mermaid
stateDiagram-v2
    [*] --> pending: URL登録
    pending --> processing: after()開始
    processing --> completed: 要約成功
    processing --> error: 3回リトライ失敗
    error --> pending: リトライAPI呼び出し
    completed --> [*]
```

## 使い方

### Mermaid Live Editorで画像化

1. [Mermaid Live Editor](https://mermaid.live/) にアクセス
2. 上記のコードブロック内容をペースト
3. PNG/SVG でエクスポート
4. note記事に画像として挿入

### VS Code プレビュー

Mermaid対応の拡張機能（例: Markdown Preview Mermaid Support）をインストールすると、VS Code内でプレビュー可能です。
