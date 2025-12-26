# Backend Integration Test Generate Command

FastAPIのAPIルーターに対する、バックエンド結合テストコードを作成します。

## 使用方法

```bash
/test-backend-integration [router-file-path]
```

## コマンド概要

**言語**: Python
**フレームワーク**: FastAPI, pytest
**役割**: バックエンド結合テスト（API → Service → Repository → DB）の生成

このコマンドは、FastAPIのAPIルーターに対して、TestClient を使用したバックエンド結合テストを生成します。**APIエンドポイントから実際のデータベースまでの縦の連携**を検証し、コンポーネント間の統合が正しく機能していることを確認します。

## 結合テストの定義

バックエンド結合テストは、以下の流れを検証します：

```
APIルーター → Service層 → Repository層 → テスト用DB
```

- **単体テスト**との違い: 単体テストは各レイヤーを個別にモックしてテストしますが、結合テストは実際のDB接続を含む複数のレイヤーが連携して動作することを検証します。
- **E2Eテスト**との違い: E2Eテストはブラウザ操作を含むフロントエンド〜バックエンド全体を検証しますが、バックエンド結合テストはバックエンドAPIの動作のみに集中します。

## 厳守すべきベストプラクティス

### 1. テスト用DBの使用（必須）

**本番DBとは完全に分離したテスト用DBを使用**してください。

**選択肢**:
- **インメモリSQLite**: 開発環境向け、高速、セットアップが簡単
- **テスト専用MySQLスキーマ**: 本番環境と同じDBエンジン、より本番に近い環境

**実装例**:

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base

# テスト用DB設定（インメモリSQLite）
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

# または、テスト専用MySQL
# SQLALCHEMY_TEST_DATABASE_URL = "mysql+pymysql://test_user:test_password@localhost/test_db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_TEST_DATABASE_URL else {}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    """
    テスト用DBのセットアップとクリーンアップ

    各テストの実行前にテーブルを作成し、実行後に削除することで、
    テスト間のデータ干渉を防ぎます。
    """
    # テーブル作成
    Base.metadata.create_all(bind=engine)

    yield

    # テスト後のクリーンアップ（テーブル削除）
    Base.metadata.drop_all(bind=engine)
```

### 2. 依存関係のオーバーライド（DI）

**FastAPIの `app.dependency_overrides` を使用**して、本番用のDBセッションをテスト用DBセッションに差し替えます。

**実装例**:

```python
# tests/conftest.py
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db

@pytest.fixture(scope="function")
def client(test_db):
    """
    テスト用クライアントの作成

    FastAPIの依存関係をオーバーライドして、
    テスト用DBセッションを注入します。
    """
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    # 依存関係をオーバーライド
    app.dependency_overrides[get_db] = override_get_db

    yield TestClient(app)

    # クリーンアップ
    app.dependency_overrides.clear()
```

### 3. テストごとのDBクリーンアップ

**各テストが独立するように**、テスト実行後にトランザクションをロールバックするか、テーブルをクリーンアップする処理を実装します。

**方法1: テーブルの削除・再作成**（上記の `test_db` fixture で実装済み）

**方法2: トランザクションのロールバック**（より高速）

```python
@pytest.fixture(scope="function")
def test_db():
    """
    トランザクションベースのクリーンアップ

    各テストをトランザクション内で実行し、
    テスト後にロールバックすることでデータをクリーンアップします。
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### 4. 外部APIのモック

**テスト用DBへの接続は実際に行いますが、外部のサードパーティAPIはモック化**します。

**モック対象の例**:
- 決済サービス（Stripe、PayPalなど）
- メール送信API（SendGrid、AWS SESなど）
- Azure Cognitive Search、Azure Blob Storage
- OpenAI API

**実装例**:

```python
# tests/conftest.py
from unittest.mock import Mock
import pytest

@pytest.fixture
def mock_azure_search():
    """Azure Cognitive Search のモック"""
    mock = Mock()
    mock.search.return_value = {
        "value": [
            {"id": "1", "name": "テストスタッフ1"},
            {"id": "2", "name": "テストスタッフ2"}
        ]
    }
    return mock

@pytest.fixture
def mock_email_service():
    """メール送信サービスのモック"""
    mock = Mock()
    mock.send_email.return_value = {"status": "sent"}
    return mock

@pytest.fixture
def client(test_db, mock_azure_search, mock_email_service):
    """
    テスト用クライアント（外部API依存関係をモックに差し替え）
    """
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    def override_get_azure_search():
        return mock_azure_search

    def override_get_email_service():
        return mock_email_service

    # 依存関係をオーバーライド
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_azure_search] = override_get_azure_search
    app.dependency_overrides[get_email_service] = override_get_email_service

    yield TestClient(app)

    app.dependency_overrides.clear()
```

## テストケース

### 1. 正常系テスト（2xx）

**POST / PUT でリクエストを送信し、HTTPステータスコード 200 や 201 が返ることを確認し、さらにテスト用DB内のデータが正しく作成・更新されていることをアサート**します。

**実装例**:

```python
# tests/integration/test_staff_router.py
import pytest
from fastapi.testclient import TestClient

class TestStaffRouterHappyPath:
    """スタッフルーターの正常系テスト"""

    def test_create_staff_success(self, client):
        """
        正常系: スタッフを新規作成できることを確認

        検証内容:
        1. POSTリクエストで201が返ること
        2. レスポンスに正しいデータが含まれること
        3. テスト用DBに実際にデータが保存されていること
        """
        # Arrange
        staff_data = {
            "name": "山田太郎",
            "occupation": "カメラマン",
            "area": "東京",
            "fee": 50000.0
        }

        # Act
        response = client.post("/staff", json=staff_data)

        # Assert - HTTPレスポンスの検証
        assert response.status_code == 201
        response_data = response.json()
        assert response_data["name"] == "山田太郎"
        assert response_data["occupation"] == "カメラマン"
        assert response_data["area"] == "東京"
        assert response_data["fee"] == 50000.0
        assert response_data["id"] is not None

        # Assert - DB内のデータを検証（重要！）
        staff_id = response_data["id"]
        get_response = client.get(f"/staff/{staff_id}")
        assert get_response.status_code == 200
        db_data = get_response.json()
        assert db_data["name"] == "山田太郎"
        assert db_data["occupation"] == "カメラマン"

    def test_update_staff_success(self, client):
        """
        正常系: スタッフ情報を更新できることを確認
        """
        # Arrange - 先にスタッフを作成
        create_response = client.post(
            "/staff",
            json={
                "name": "田中花子",
                "occupation": "編集者",
                "area": "大阪",
                "fee": 60000.0
            }
        )
        staff_id = create_response.json()["id"]

        # Act - 更新リクエスト
        update_data = {
            "name": "田中花子（更新後）",
            "fee": 70000.0
        }
        update_response = client.put(f"/staff/{staff_id}", json=update_data)

        # Assert
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "田中花子（更新後）"
        assert update_response.json()["fee"] == 70000.0

        # DB内のデータも更新されていることを確認
        get_response = client.get(f"/staff/{staff_id}")
        assert get_response.json()["name"] == "田中花子（更新後）"
        assert get_response.json()["fee"] == 70000.0

    def test_get_staff_list_success(self, client):
        """
        正常系: スタッフ一覧を取得できることを確認
        """
        # Arrange - テストデータを複数作成
        staff_list = [
            {"name": "A", "occupation": "カメラマン", "area": "東京"},
            {"name": "B", "occupation": "編集者", "area": "大阪"},
            {"name": "C", "occupation": "ディレクター", "area": "福岡"}
        ]

        for staff_data in staff_list:
            client.post("/staff", json=staff_data)

        # Act
        response = client.get("/staff")

        # Assert
        assert response.status_code == 200
        results = response.json()
        assert len(results) >= 3
        assert any(staff["name"] == "A" for staff in results)
        assert any(staff["name"] == "B" for staff in results)
        assert any(staff["name"] == "C" for staff in results)
```

### 2. クライアントエラー系テスト（4xx）

**バリデーションエラー（422）**: 不正なJSONを送信し、422 Unprocessable Entity が返ることを確認します。

**リソース不存在エラー（404）**: 存在しないIDに `client.get` を行い、404 Not Found が返ることを確認します。

**実装例**:

```python
class TestStaffRouterClientErrors:
    """スタッフルーターのクライアントエラーテスト"""

    def test_create_staff_with_missing_required_field_returns_422(self, client):
        """
        異常系: 必須フィールド欠落で422が返ることを確認
        """
        # Arrange - nameフィールドが欠落
        invalid_data = {
            "occupation": "カメラマン",
            "area": "東京"
            # "name" が欠落
        }

        # Act
        response = client.post("/staff", json=invalid_data)

        # Assert
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("name" in str(err).lower() for err in error_detail)

    def test_create_staff_with_invalid_email_format_returns_422(self, client):
        """
        異常系: メールアドレス形式不正で422が返ることを確認
        """
        # Arrange
        invalid_data = {
            "name": "テストユーザー",
            "email": "invalid-email-format",  # 不正な形式
            "occupation": "カメラマン"
        }

        # Act
        response = client.post("/staff", json=invalid_data)

        # Assert
        assert response.status_code == 422
        error_detail = response.json()["detail"]
        assert any("email" in str(err).lower() for err in error_detail)

    def test_get_staff_with_nonexistent_id_returns_404(self, client):
        """
        異常系: 存在しないIDで404が返ることを確認
        """
        # Act
        response = client.get("/staff/999999")

        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_update_staff_with_nonexistent_id_returns_404(self, client):
        """
        異常系: 存在しないIDの更新で404が返ることを確認
        """
        # Arrange
        update_data = {"name": "更新データ", "fee": 50000.0}

        # Act
        response = client.put("/staff/999999", json=update_data)

        # Assert
        assert response.status_code == 404

    def test_delete_staff_with_nonexistent_id_returns_404(self, client):
        """
        異常系: 存在しないIDの削除で404が返ることを確認
        """
        # Act
        response = client.delete("/staff/999999")

        # Assert
        assert response.status_code == 404
```

### 3. サーバーエラー系テスト（5xx）

外部API（モック）がエラーを返す場合の動作を検証します。

**実装例**:

```python
class TestStaffRouterServerErrors:
    """スタッフルーターのサーバーエラーテスト"""

    def test_search_staff_with_azure_search_error_returns_500(self, client, mock_azure_search):
        """
        異常系: Azure Cognitive Search がエラーを返す場合に500が返ることを確認
        """
        # Arrange - モックがエラーをスローするように設定
        from azure.core.exceptions import ServiceRequestError
        mock_azure_search.search.side_effect = ServiceRequestError("Azure Search unavailable")

        # Act
        response = client.get("/staff/search?query=テスト")

        # Assert
        assert response.status_code == 500
        assert "error" in response.json()["detail"].lower()

    def test_create_staff_with_email_service_error_returns_500(self, client, mock_email_service):
        """
        異常系: メール送信サービスがエラーを返す場合に500が返ることを確認
        """
        # Arrange
        mock_email_service.send_email.side_effect = Exception("Email service unavailable")

        staff_data = {
            "name": "山田太郎",
            "email": "test@example.com",
            "occupation": "カメラマン"
        }

        # Act
        response = client.post("/staff", json=staff_data)

        # Assert
        assert response.status_code == 500
```

### 4. 複数エンドポイント連携テスト

**作成 → 取得 → 更新 → 削除の一連のフローを検証**します。

**実装例**:

```python
class TestStaffRouterIntegration:
    """スタッフルーターの連携テスト"""

    def test_staff_full_lifecycle(self, client):
        """
        結合テスト: スタッフの作成→取得→更新→削除の全体フローを検証
        """
        # 1. 作成
        create_response = client.post(
            "/staff",
            json={
                "name": "佐藤一郎",
                "occupation": "ディレクター",
                "area": "大阪",
                "fee": 80000.0
            }
        )
        assert create_response.status_code == 201
        staff_id = create_response.json()["id"]

        # 2. 取得
        get_response = client.get(f"/staff/{staff_id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "佐藤一郎"

        # 3. 更新
        update_response = client.put(
            f"/staff/{staff_id}",
            json={"name": "佐藤一郎（更新）", "fee": 90000.0}
        )
        assert update_response.status_code == 200
        assert update_response.json()["fee"] == 90000.0

        # 4. 再取得（更新確認）
        get_updated_response = client.get(f"/staff/{staff_id}")
        assert get_updated_response.json()["name"] == "佐藤一郎（更新）"

        # 5. 削除
        delete_response = client.delete(f"/staff/{staff_id}")
        assert delete_response.status_code == 200

        # 6. 削除確認
        get_deleted_response = client.get(f"/staff/{staff_id}")
        assert get_deleted_response.status_code == 404

    def test_search_staff_with_filters(self, client):
        """
        結合テスト: スタッフ検索のフィルタリング機能を検証
        """
        # Arrange - テストデータを複数作成
        staff_data = [
            {"name": "A", "occupation": "カメラマン", "area": "東京", "fee": 50000},
            {"name": "B", "occupation": "編集者", "area": "大阪", "fee": 60000},
            {"name": "C", "occupation": "カメラマン", "area": "大阪", "fee": 70000},
            {"name": "D", "occupation": "ディレクター", "area": "東京", "fee": 80000},
        ]

        for data in staff_data:
            client.post("/staff", json=data)

        # Act - フィルタ検索（職種=カメラマン、エリア=大阪）
        response = client.get("/staff/search?occupation=カメラマン&area=大阪")

        # Assert
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["name"] == "C"
        assert results[0]["occupation"] == "カメラマン"
        assert results[0]["area"] == "大阪"
```

## テストコードの構造

以下の構成でテストファイルを生成してください：

```python
"""
[対象ルーターファイル名] のバックエンド結合テストコード

このテストファイルは、[対象ルーターファイル名]に対する包括的なバックエンド結合テストを提供します。
以下のテストケースが含まれています：
- 正常系テスト（2xx）
- クライアントエラーテスト（4xx）
- サーバーエラーテスト（5xx）
- 複数エンドポイント連携テスト
"""

import pytest
from fastapi.testclient import TestClient

# ========================================
# 正常系テスト (2xx)
# ========================================

class TestStaffRouterHappyPath:
    """スタッフルーターの正常系テスト"""

    def test_create_staff_success(self, client):
        """正常系: スタッフを新規作成できることを確認"""
        # テストコード

    def test_update_staff_success(self, client):
        """正常系: スタッフ情報を更新できることを確認"""
        # テストコード

# ========================================
# クライアントエラー系テスト (4xx)
# ========================================

class TestStaffRouterClientErrors:
    """スタッフルーターのクライアントエラーテスト"""

    def test_create_staff_with_missing_field_returns_422(self, client):
        """異常系: 必須フィールド欠落で422が返ることを確認"""
        # テストコード

    def test_get_staff_with_nonexistent_id_returns_404(self, client):
        """異常系: 存在しないIDで404が返ることを確認"""
        # テストコード

# ========================================
# サーバーエラー系テスト (5xx)
# ========================================

class TestStaffRouterServerErrors:
    """スタッフルーターのサーバーエラーテスト"""

    def test_search_staff_with_azure_search_error_returns_500(self, client, mock_azure_search):
        """異常系: Azure Cognitive Search エラー時に500が返ることを確認"""
        # テストコード

# ========================================
# 複数エンドポイント連携テスト
# ========================================

class TestStaffRouterIntegration:
    """スタッフルーターの連携テスト"""

    def test_staff_full_lifecycle(self, client):
        """結合テスト: スタッフの作成→取得→更新→削除の全体フローを検証"""
        # テストコード
```

## カバレッジ目標

バックエンド結合テストのカバレッジ目標：

- **最低基準**: 主要なエンドポイントをカバー（70%以上）
- **推奨値**: 80%以上
- **目標値**: 90%以上

**測定コマンド**:

```bash
# バックエンド結合テストのみ実行
pytest tests/integration/ --cov=app --cov-report=html --cov-report=term
```

## 承認プロセス

- 完全なテストコードを提示
- **テストケースの網羅性を説明**: どのエンドポイント・シナリオがカバーされているか
- **モック戦略の説明**: 外部依存をどのようにモック化しているか
- **DB戦略の説明**: テスト用DBの設定とクリーンアップ方法
- 質問: "このバックエンド結合テストコードで問題ありませんか？テストファイルを作成してもよろしいでしょうか？"
- フィードバックを反映し、修正
- 明確な承認を得るまで繰り返す
- **重要**: 明確な承認なしにファイルを作成しない

## 重要なルール

- **絶対に**: ユーザーの明確な承認なしにテストファイルを作成しない
- 明確な肯定的回答のみ受け入れる: "はい"、"承認します"、"問題ありません"など
- フィードバックがあれば修正し、再度承認を求める
- 承認が得られるまで修正サイクルを継続

## 次のステップ

承認後、生成したバックエンド結合テストコードをプロジェクトに追加し、テストを実行して動作を確認します。
