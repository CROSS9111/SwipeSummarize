# 実装計画

## タスク概要

Next.js + FastAPI + Azure Redis による非同期ダウンロード処理システムの実装。認証機能を含む完全な非同期タスク管理システムを段階的に構築します。

## ステアリングドキュメント準拠

### structure.md準拠
- フロントエンド: `05.tips/01.非同期処理/frontend/`
- バックエンド: `05.tips/01.非同期処理/backend/`
- Next.js App Routerパターン使用

### tech.md準拠
- Next.js 15以上、TypeScript 5.0以上
- FastAPI（Python 3.11+）、Pydanticモデル
- Azure Redis（SSL接続）

## アトミックタスク要件

各タスクは以下の基準を満たします：
- **ファイルスコープ**: 1-3ファイルまで
- **時間**: 15-30分で完了可能
- **単一目的**: 1つのテスト可能な成果
- **明確なファイル指定**: 作成/修正するファイルを明記
- **完全な仕様**: 前のタスクへの依存を最小化

## Good vs Bad Task Examples

❌ **Bad Examples (非アトミック)**:
- "FastAPI基本構造とCORS設定と環境変数読み込み" → 複数の概念、時間超過
- "TaskListコンポーネントの続き" → 前タスクへの依存が不明確
- "UIの最終調整" → 曖昧、複数ファイル

✅ **Good Examples (アトミック)**:
- "backend/app/models.py にTask Pydanticモデル定義" → 1ファイル、明確な成果
- "backend/app/redis_client.py に get_task メソッド追加（既存: __init__, connect, set_task）" → 前の状態明記
- "frontend/components/ProgressBar.tsx 作成（props: progress、Tailwind使用）" → 具体的な実装内容

## タスク

### Phase 1: バックエンド基盤構築

- [ ] 1. Pydanticモデル定義
  - ファイル: `backend/app/models.py`
  - Task モデル作成: task_id (str), user_id (str), status (Literal["queued", "processing", "completed", "failed", "cancelled"]), progress (int, 0-100), created_at (datetime), updated_at (datetime), file_url (Optional[str]), error (Optional[dict])
  - CreateTaskResponse モデル: task_id (str), status (str)
  - TaskStatusResponse モデル: task (Task)
  - 目的: バックエンドの型定義基盤を確立
  - _要件: 1.1, 2.1_

- [ ] 2. FastAPIアプリケーション初期化
  - ファイル: `backend/app/main.py`
  - FastAPI()インスタンス作成、タイトル/説明設定
  - dotenvで環境変数読み込み
  - ヘルスチェックエンドポイント（GET /health → {"status": "ok"}）
  - 目的: FastAPI基本構造確立
  - _要件: 開発要件（コード構造）_

- [ ] 3. CORS設定追加
  - ファイル: `backend/app/main.py`（既存: FastAPIアプリ、ヘルスチェック）
  - CORSMiddleware追加: allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
  - 環境変数CORS_ORIGINSから読み込み（カンマ区切り）
  - 目的: フロントエンドからのアクセス許可
  - _活用: 01.auth/02.auth0_fastapi_sample/main.py のCORS設定_
  - _要件: 非機能要件（セキュリティ）_

- [ ] 4. 簡易認証ミドルウェア実装
  - ファイル: `backend/app/auth.py`
  - verify_api_key(api_key: str) → user_id 関数（環境変数API_KEYSからマッピング取得）
  - get_current_user(x_api_key: str = Header()) 依存関数（Depends使用、401エラー）
  - APIキーマッピング例: "dev-key-user1:user1,dev-key-user2:user2"
  - 目的: 簡易認証機能を実装
  - _活用: 01.auth/02.auth0_fastapi_sample/dependencies/security.py のパターン_
  - _要件: 非機能要件（セキュリティ - 認証）_

- [ ] 5. Redis接続クライアント基本構造
  - ファイル: `backend/app/redis_client.py`
  - RedisClient クラス: __init__(connection_string: str), connect() メソッド
  - redis.ConnectionPool 設定: max_connections=50, decode_responses=True, ssl=True, socket_timeout=5
  - 接続エラー時は ConnectionError 送出
  - 目的: Azure Redis接続基盤確立
  - _要件: 1.1, 非機能要件（信頼性）_

- [ ] 6. RedisClient にタスク保存機能追加
  - ファイル: `backend/app/redis_client.py`（既存: __init__, connect）
  - set_task(task_id: str, user_id: str, data: dict, ttl: int = 86400) メソッド
  - タスクキー: f"task:{task_id}"、JSON保存（json.dumps）
  - ユーザーインデックス: f"user:{user_id}:tasks" にタスクID追加（SADD）
  - 両方にTTL設定（EXPIRE）
  - 目的: タスクデータの永続化
  - _要件: 1.2, 3.5_

- [ ] 7. RedisClient にタスク取得機能追加
  - ファイル: `backend/app/redis_client.py`（既存: __init__, connect, set_task）
  - get_task(task_id: str) → Optional[dict] メソッド
  - GET f"task:{task_id}"、json.loads でデシリアライズ
  - 存在しない場合は None 返却
  - 目的: タスク詳細取得
  - _要件: 2.2_

- [ ] 8. RedisClient にユーザータスク一覧取得追加
  - ファイル: `backend/app/redis_client.py`（既存: __init__, connect, set_task, get_task）
  - get_user_tasks(user_id: str) → List[dict] メソッド
  - SMEMBERS f"user:{user_id}:tasks" でタスクID一覧取得
  - 各タスクIDに対してget_task呼び出し、Noneを除外
  - 目的: ユーザーのすべてのタスク取得
  - _要件: 3.2, 4.2_

- [ ] 9. RedisClient にアクティブタスクカウント追加
  - ファイル: `backend/app/redis_client.py`（既存: __init__, connect, set_task, get_task, get_user_tasks）
  - count_user_active_tasks(user_id: str) → int メソッド
  - get_user_tasks呼び出し、status が "processing" または "queued" のタスクをカウント
  - 目的: 同時タスク制限のチェック
  - _要件: 4.1, 4.4_

- [ ] 10. RedisClient に進捗・ステータス更新追加
  - ファイル: `backend/app/redis_client.py`（既存: __init__, connect, set_task, get_task, get_user_tasks, count_user_active_tasks）
  - update_progress(task_id: str, progress: int) メソッド（get_task → progress更新 → SET）
  - update_status(task_id: str, status: str) メソッド（get_task → status更新 → SET）
  - 両メソッドで updated_at を現在時刻に更新
  - 目的: タスク状態更新機能
  - _要件: 2.1, 2.4_

- [ ] 11. タスク作成エンドポイント実装
  - ファイル: `backend/app/main.py`（既存: FastAPIアプリ、CORS、ヘルスチェック）
  - POST /api/tasks/create エンドポイント
  - user_id = Depends(get_current_user)
  - count_user_active_tasks チェック（>= 10 なら HTTP 429）
  - UUID4 生成、Task オブジェクト作成（status=queued, progress=0）
  - set_task 呼び出し、CreateTaskResponse 返却
  - BackgroundTasks.add_task(process_download_task, task_id, redis_client) ※process_download_taskは後で実装
  - 目的: タスク作成API実装
  - _要件: 1.1, 1.2, 4.1, 4.4_

### Phase 2: バックグラウンド処理実装

- [ ] 12. バックグラウンドタスク処理関数基本構造
  - ファイル: `backend/app/tasks.py`
  - async def process_download_task(task_id: str, redis_client: RedisClient) 関数
  - try-except で全体をラップ
  - status=processing 更新、start_time 記録（time.time()）
  - except で status=failed 更新、エラー詳細保存（後で実装）
  - 目的: タスク処理の骨組み作成
  - _要件: 2.1_

- [ ] 13. タスク処理に進捗更新ループ追加
  - ファイル: `backend/app/tasks.py`（既存: process_download_task 基本構造）
  - for progress in range(0, 101, 2) ループ
  - redis_client.update_progress(task_id, progress)
  - asyncio.sleep(0.5) でシミュレーション
  - 目的: 段階的な進捗更新
  - _要件: 2.1, 2.4_

- [ ] 14. タスク処理にキャンセル検知追加
  - ファイル: `backend/app/tasks.py`（既存: process_download_task、進捗ループ）
  - ループ内20ステップごとに task = redis_client.get_task(task_id) で状態確認
  - task["status"] == "cancelled" なら return で処理中断
  - 目的: タスクキャンセル機能実装
  - _要件: 6.3_

- [ ] 15. タスク処理にタイムアウト機能追加
  - ファイル: `backend/app/tasks.py`（既存: process_download_task、進捗ループ、キャンセル検知）
  - ループ内でタイムアウトチェック: time.time() - start_time > 1800
  - タイムアウト時、redis_client.update_status(task_id, "timeout") → return
  - 目的: 長時間実行防止
  - _要件: 非機能要件（信頼性 - タスクタイムアウト）_

- [ ] 16. タスク完了時のファイル生成
  - ファイル: `backend/app/tasks.py`（既存: process_download_task、進捗ループ、キャンセル・タイムアウト検知）
  - ループ完了後、os.makedirs(f"/tmp/downloads/{task_id}", exist_ok=True)
  - f"/tmp/downloads/{task_id}/result.txt" にサンプルテキスト書き込み（タスクID、完了時刻）
  - file_url = f"/api/files/{task_id}" 設定
  - redis_client.update_status(task_id, "completed")、file_url更新
  - 目的: 完了ファイル生成
  - _要件: 5.1, 5.2_

- [ ] 17. タスク処理のエラーハンドリング強化
  - ファイル: `backend/app/tasks.py`（既存: process_download_task 完全版）
  - except ブロックで traceback.format_exc() 取得
  - error_detail = {"type": type(e).__name__, "message": str(e), "traceback": tb, "timestamp": datetime.now().isoformat()}
  - task = redis_client.get_task(task_id)、task["error"] = error_detail 設定
  - redis_client.update_status(task_id, "failed")
  - 目的: エラー情報の永続化
  - _要件: 2.6_

- [ ] 18. タスクステータス取得エンドポイント実装
  - ファイル: `backend/app/main.py`（既存: FastAPIアプリ、CORS、ヘルスチェック、タスク作成）
  - GET /api/tasks/{task_id}/status エンドポイント
  - user_id = Depends(get_current_user)
  - task = redis_client.get_task(task_id)、存在チェック（404）
  - task["user_id"] == user_id チェック（403）
  - TaskStatusResponse 返却
  - 目的: 進捗取得API実装
  - _要件: 2.2, 2.3_

- [ ] 19. ユーザータスク一覧取得エンドポイント実装
  - ファイル: `backend/app/main.py`（既存: 上記すべて）
  - GET /api/tasks/my-tasks エンドポイント
  - user_id = Depends(get_current_user)
  - tasks = redis_client.get_user_tasks(user_id)
  - List[Task] 返却
  - 目的: ユーザーのすべてのタスク取得
  - _要件: 3.2, 3.3_

### Phase 3: フロントエンド基本構築

- [ ] 20. Next.js 15プロジェクト初期化
  - ファイル: `frontend/package.json`, `frontend/next.config.ts`, `frontend/tsconfig.json`
  - npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
  - package.json で Next.js 15.1以上、React 19確認
  - 目的: Next.js基盤構築
  - _活用: 01.auth/01.auth0-sample の構成_
  - _要件: 開発要件（Next.js 15以上）_

- [ ] 21. Tailwind CSS設定調整
  - ファイル: `frontend/tailwind.config.ts`
  - ステータス色を theme.extend.colors に追加: taskQueued: '#3b82f6', taskProcessing: '#eab308', taskCompleted: '#22c55e', taskFailed: '#ef4444', taskCancelled: '#6b7280'
  - 目的: プロジェクト固有の色設定
  - _活用: 01.auth/01.auth0-sample のTailwind設定_
  - _要件: 非機能要件（ユーザビリティ - ステータス色分け）_

- [ ] 22. TypeScript型定義作成
  - ファイル: `frontend/types/task.ts`
  - Task interface: task_id, user_id, status, progress, created_at, updated_at, file_url?, error?
  - CreateTaskResponse interface: task_id, status
  - TaskStatusResponse interface: task
  - 目的: フロントエンドの型安全性確保
  - _要件: 開発要件（TypeScript完全型付け）_

- [ ] 23. 認証ユーティリティ実装
  - ファイル: `frontend/lib/auth.ts`
  - setApiKey(apiKey: string): void → localStorage.setItem('api_key', apiKey)
  - getApiKey(): string | null → localStorage.getItem('api_key')
  - clearApiKey(): void → localStorage.removeItem('api_key')
  - isAuthenticated(): boolean → getApiKey() !== null
  - 目的: 認証情報管理
  - _要件: 3.4, 3.7_

- [ ] 24. APIクライアント基本構造作成
  - ファイル: `frontend/lib/api.ts`
  - API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  - getHeaders(): HeadersInit 関数（X-API-Key ヘッダー追加、getApiKey使用）
  - handleResponse(response: Response) 関数（401で認証エラー送出）
  - 目的: APIクライアント基盤
  - _要件: 1.2_

- [ ] 25. APIクライアントにタスク作成・取得関数追加
  - ファイル: `frontend/lib/api.ts`（既存: API_BASE_URL, getHeaders, handleResponse）
  - createTask(): Promise<CreateTaskResponse> → POST /api/tasks/create
  - getMyTasks(): Promise<Task[]> → GET /api/tasks/my-tasks
  - 両関数で fetch使用、getHeaders()呼び出し、handleResponse処理
  - 目的: タスク作成・一覧取得API
  - _要件: 1.2, 2.2, 3.2_

- [ ] 26. APIクライアントにステータス取得・キャンセル関数追加
  - ファイル: `frontend/lib/api.ts`（既存: 上記すべて）
  - getTaskStatus(taskId: string): Promise<TaskStatusResponse> → GET /api/tasks/{taskId}/status
  - cancelTask(taskId: string): Promise<void> → POST /api/tasks/{taskId}/cancel
  - 目的: ステータス取得・キャンセルAPI
  - _要件: 2.2, 6.1_

- [ ] 27. APIキー入力ページ作成
  - ファイル: `frontend/app/login/page.tsx`
  - useState でapiKey管理
  - input（type="text", placeholder="APIキーを入力"）
  - submitでsetApiKey呼び出し、router.push('/downloads')
  - 開発用: defaultValue="dev-key-user1"
  - 目的: 認証UI実装
  - _要件: 非機能要件（セキュリティ - 認証）_

- [ ] 28. メインレイアウト作成
  - ファイル: `frontend/app/layout.tsx`
  - 基本HTML構造、<html><body>{children}</body></html>
  - メタデータ: title="非同期ダウンロードサンプル"
  - Tailwind CSS globals.css読み込み
  - 目的: アプリケーション全体のレイアウト
  - _活用: 01.auth/01.auth0-sample/src/app/layout.tsx_
  - _要件: 開発要件（コード構造）_

- [ ] 29. ProgressBarコンポーネント作成
  - ファイル: `frontend/components/ProgressBar.tsx`
  - Props: progress (number, 0-100)
  - Tailwind: 外側div（bg-gray-200, h-4, rounded）、内側div（bg-blue-600, height 100%, width: ${progress}%）
  - パーセンテージテキスト表示
  - 目的: 進捗表示UI
  - _要件: 2.4_

- [ ] 30. TaskItemコンポーネント作成
  - ファイル: `frontend/components/TaskItem.tsx`
  - Props: task (Task), onCancel (function), onRefresh (function)
  - ステータス色分け表示（Tailwind: text-taskQueued等）
  - ProgressBarコンポーネント使用
  - キャンセルボタン（status === 'processing' || 'queued' のみ）
  - ダウンロードボタン（status === 'completed' のみ、file_url使用）
  - 目的: タスク個別表示UI
  - _要件: 2.4, 5.1, 6.1, 非機能要件（ユーザビリティ）_

### Phase 4: タスク管理UI実装

- [ ] 31. TaskListコンポーネント基本構造作成
  - ファイル: `frontend/components/TaskList.tsx`
  - Props: なし
  - useState: tasks (Task[])
  - TaskItem配列レンダリング（tasks.map）
  - 目的: タスクリスト表示基盤
  - _要件: 4.2_

- [ ] 32. TaskListに初回タスク取得追加
  - ファイル: `frontend/components/TaskList.tsx`（既存: 基本構造、useState）
  - useEffect（[]依存）: getMyTasks呼び出し、setTasks
  - エラーハンドリング（console.error）
  - 目的: マウント時のタスク読み込み
  - _要件: 3.2, 3.3_

- [ ] 33. TaskListにポーリング機能追加
  - ファイル: `frontend/components/TaskList.tsx`（既存: 基本構造、初回取得）
  - useEffect: setInterval（1500ms）でgetMyTasks呼び出し
  - アクティブタスク（processing/queued）がある場合のみポーリング
  - completed/failed/cancelledタスクはスキップ
  - cleanup: clearInterval
  - 目的: リアルタイム進捗更新
  - _要件: 2.2, 2.3_

- [ ] 34. TaskListにフィルタリング機能追加
  - ファイル: `frontend/components/TaskList.tsx`（既存: 上記すべて）
  - useState: filter ('all' | 'processing' | 'completed' | 'failed')
  - フィルターボタンUI（4つのボタン）
  - 表示タスク: filteredTasks = tasks.filter(...)
  - 目的: タスクのフィルタリング
  - _要件: 4.6_

- [ ] 35. TaskListにソート機能追加
  - ファイル: `frontend/components/TaskList.tsx`（既存: 上記すべて）
  - useState: sortOrder ('asc' | 'desc')
  - ソート切替ボタン
  - 表示タスク: sortedTasks = [...filteredTasks].sort((a, b) => ...)
  - デフォルト: 降順（新しい順）
  - 目的: タスクのソート
  - _要件: 4.5_

- [ ] 36. Downloads Pageメイン画面作成
  - ファイル: `frontend/app/downloads/page.tsx`
  - 'use client'
  - useEffect: isAuthenticated() チェック、未認証なら router.push('/login')
  - タスク作成ボタン（後で実装）
  - TaskListコンポーネント配置
  - 目的: メインアプリケーション画面
  - _活用: 01.auth/01.auth0-sample/src/app/dashboard/page.tsx_
  - _要件: 1.3, 3.2_

- [ ] 37. Downloads Pageにタスク作成機能追加
  - ファイル: `frontend/app/downloads/page.tsx`（既存: 認証チェック、TaskList配置）
  - handleCreateTask 関数: createTask API呼び出し
  - 成功時: TaskListを強制再読み込み（keyまたはrefresh関数）
  - エラーハンドリング: 10個制限（429）、認証エラー（401）
  - ボタンUI: "新しいダウンロードタスクを作成"
  - 目的: タスク作成UI完成
  - _要件: 1.3, 4.4_

### Phase 5: タスクキャンセルとダウンロード機能

- [ ] 38. タスクキャンセルエンドポイント実装
  - ファイル: `backend/app/main.py`（既存: 全エンドポイント）
  - POST /api/tasks/{task_id}/cancel エンドポイント
  - user_id = Depends(get_current_user)
  - task取得、所有者チェック（403）
  - redis_client.update_status(task_id, "cancelled")
  - {"message": "タスクをキャンセルしました"} 返却
  - 目的: タスクキャンセルAPI
  - _要件: 6.2_

- [ ] 39. フロントエンドキャンセル機能実装
  - ファイル: `frontend/components/TaskItem.tsx`（既存: 完全版）
  - キャンセルボタンonClick: cancelTask(task.task_id) 呼び出し
  - 成功時: onRefresh() コールバック実行
  - エラー時: アラート表示
  - 目的: キャンセルUI完成
  - _要件: 6.1, 6.4_

- [ ] 40. ファイルダウンロードエンドポイント実装
  - ファイル: `backend/app/main.py`（既存: 全エンドポイント）
  - GET /api/files/{task_id} エンドポイント
  - user_id = Depends(get_current_user)
  - task取得、所有者・completedステータスチェック
  - file_path = f"/tmp/downloads/{task_id}/result.txt"
  - FileResponse(file_path, filename=f"download_{task_id}.txt")
  - ファイル存在チェック（404）
  - 目的: ファイルダウンロードAPI
  - _要件: 5.2, 5.3, 5.4_

- [ ] 41. フロントエンドダウンロード機能実装
  - ファイル: `frontend/components/TaskItem.tsx`（既存: 完全版）
  - ダウンロードボタンonClick: fetch(/api/files/{task_id}, headers: getHeaders())
  - response.blob() → URL.createObjectURL → <a>タグでダウンロード
  - エラー時: アラート表示
  - 目的: ダウンロードUI完成
  - _要件: 5.2_

### Phase 6: エラーハンドリングと最終調整

- [ ] 42. Redis接続リトライロジック実装
  - ファイル: `backend/app/redis_client.py`（既存: 全メソッド）
  - connect() メソッド修正: for attempt in range(3) ループ
  - 失敗時: asyncio.sleep(2 ** attempt) で指数バックオフ（1秒、2秒、4秒）
  - 3回失敗後: ConnectionError 送出
  - 目的: 接続信頼性向上
  - _要件: 1.5, 非機能要件（信頼性）_

- [ ] 43. フロントエンドネットワークエラーハンドリング
  - ファイル: `frontend/components/TaskList.tsx`（既存: 完全版）
  - useState: isOffline (boolean)
  - ポーリング失敗時: setIsOffline(true)、指数バックオフリトライ
  - 成功時: setIsOffline(false)
  - UIにオフラインインジケーター表示（isOffline && <div>オフライン</div>）
  - 目的: ネットワーク切断対応
  - _要件: 2.7_

- [ ] 44. レート制限実装
  - ファイル: `backend/app/main.py`（既存: 全エンドポイント）
  - slowapi インポート: from slowapi import Limiter, _rate_limit_exceeded_handler
  - limiter = Limiter(key_func=get_remote_address)
  - app.state.limiter = limiter
  - @limiter.limit("10/minute") デコレーターを POST /api/tasks/create に追加
  - 目的: レート制限機能
  - _要件: 非機能要件（セキュリティ - レート制限）_

- [ ] 45. 環境変数サンプルファイル作成（バックエンド）
  - ファイル: `backend/.env.example`
  - REDIS_URL, API_KEYS, CORS_ORIGINS, RATE_LIMIT_PER_MINUTE, FILE_STORAGE_PATH, FILE_CLEANUP_HOURS, MAX_CONCURRENT_TASKS, TASK_TIMEOUT_SECONDS
  - 各変数にコメント追加
  - 目的: 環境設定ドキュメント
  - _要件: 開発要件（環境変数）_

- [ ] 46. 環境変数サンプルファイル作成（フロントエンド）
  - ファイル: `frontend/.env.local.example`
  - NEXT_PUBLIC_API_URL, NEXT_PUBLIC_POLL_INTERVAL_MS, NEXT_PUBLIC_DEFAULT_API_KEY
  - 各変数にコメント追加
  - 目的: 環境設定ドキュメント
  - _要件: 開発要件（環境変数）_

- [ ] 47. バックエンドrequirements.txt作成
  - ファイル: `backend/requirements.txt`
  - fastapi==0.109.0, uvicorn[standard]==0.27.0, redis==5.0.1, python-dotenv==1.0.0, slowapi==0.1.9, pydantic==2.5.3
  - 目的: 依存関係管理
  - _要件: 開発要件（依存関係）_

- [ ] 48. バックエンドREADME作成
  - ファイル: `backend/README.md`
  - セクション: 前提条件、インストール、環境変数設定、起動方法、APIエンドポイント一覧、Azure Redis設定方法
  - 目的: バックエンドドキュメント
  - _要件: 開発要件（ドキュメント）_

- [ ] 49. フロントエンドREADME作成
  - ファイル: `frontend/README.md`
  - セクション: 前提条件、インストール、環境変数設定、起動方法、開発用APIキー一覧
  - 目的: フロントエンドドキュメント
  - _要件: 開発要件（ドキュメント）_

- [ ] 50. エラーメッセージ日本語化（バックエンド）
  - ファイル: `backend/app/main.py`, `backend/app/auth.py`
  - すべてのHTTPExceptionのdetailを日本語に変更
  - 例: "Invalid API key" → "無効なAPIキーです"
  - 目的: ユーザビリティ向上
  - _要件: 非機能要件（ユーザビリティ）_

- [ ] 51. エラーメッセージ日本語化（フロントエンド）
  - ファイル: `frontend/lib/api.ts`
  - handleResponse内のエラーメッセージを日本語化
  - 401: "認証エラー: APIキーが無効です"
  - 429: "リクエスト制限: しばらく待ってから再試行してください"
  - 目的: ユーザビリティ向上
  - _要件: 非機能要件（ユーザビリティ）_

- [ ] 52. TaskListとTaskItemのレスポンシブデザイン調整
  - ファイル: `frontend/components/TaskList.tsx`, `frontend/components/TaskItem.tsx`
  - Tailwind: sm:, md:, lg: ブレークポイント使用
  - モバイル: スタック表示、デスクトップ: グリッド表示
  - 目的: モバイル対応
  - _要件: 非機能要件（ユーザビリティ - レスポンシブデザイン）_

- [ ] 53. Downloads Pageのレスポンシブデザイン調整
  - ファイル: `frontend/app/downloads/page.tsx`
  - コンテナ幅調整: max-w-7xl mx-auto px-4
  - ボタンサイズ: モバイルでfull-width
  - 目的: モバイル対応
  - _要件: 非機能要件（ユーザビリティ - レスポンシブデザイン）_

- [ ] 54. ARIAラベルとアクセシビリティ対応
  - ファイル: `frontend/components/ProgressBar.tsx`, `frontend/components/TaskItem.tsx`
  - ProgressBar: aria-label="タスク進捗", aria-valuenow={progress}, aria-valuemin="0", aria-valuemax="100"
  - ボタン: aria-label="タスクをキャンセル", "ファイルをダウンロード"
  - キーボードナビゲーション: tabIndex設定
  - 目的: アクセシビリティ向上
  - _要件: 非機能要件（ユーザビリティ - アクセシビリティ）_

## 実装順序の説明

### Phase 1（タスク1-11）: バックエンド基盤
認証、Redis接続、タスク作成APIを構築。バックエンドの基本機能を確立します。

### Phase 2（タスク12-19）: バックグラウンド処理
タスクの非同期実行、進捗更新、ステータス取得APIを実装。非同期処理の中核機能を完成させます。

### Phase 3（タスク20-30）: フロントエンド基盤
Next.jsプロジェクト、認証UI、基本コンポーネントを構築。フロントエンドの基本構造を確立します。

### Phase 4（タスク31-37）: タスク管理UI
タスクリスト表示、ポーリング、フィルタリング、ソート機能を実装。ユーザーが使用できる完全なUIを完成させます。

### Phase 5（タスク38-41）: 追加機能
キャンセル、ダウンロード機能を追加。すべての主要機能を完成させます。

### Phase 6（タスク42-54）: 品質向上
エラーハンドリング、レート制限、ドキュメント、アクセシビリティを強化。本番環境レベルの品質に引き上げます。

## 注意事項

- 各タスクは独立して実装可能（前の状態を明記）
- タスク完了後は必ず動作確認を行うこと
- エラーが発生した場合は、該当タスクを修正してから次へ進むこと
- 環境変数は必ず設定すること（Azure Redis接続情報が必要）
