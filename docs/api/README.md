# API仕様書一覧

SwipeSummarizeの全APIエンドポイント仕様書です。

## 目次

### コア機能API
- [LLM API](llm_apis.md) - LLM統合機能のAPI仕様
- [非同期要約処理API](async_process_apis.md) - URL登録・非同期要約処理のAPI仕様

### 管理機能API
- [LLM管理API](llm-admin-apis.md) - LLM設定・監視機能のAPI仕様
- [LLMテストチャットAPI](test_chat_apis.md) - 開発者向けLLMテスト機能のAPI仕様

## エンドポイント総数

**総エンドポイント数**: 7

| API | エンドポイント数 | 実装状況 |
|-----|----------------|----------|
| LLM API | 1 | ✅ 完了 |
| 非同期要約処理API | 4 | ✅ 完了 |
| LLM管理API | 1 | ✅ 完了 |
| LLMテストチャットAPI | 1 | ✅ 完了 |

## 最終更新

- 2026-01-04: 非同期要約処理API追加（F-007-ASYNC-PROCESS）
- 2024-12-30: LLMテストチャットAPI追加（F-005-TEST-CHAT）
