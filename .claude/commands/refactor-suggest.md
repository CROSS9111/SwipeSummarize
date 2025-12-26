# Refactor Suggest Command

対象コードの保守性・可読性・単体テスト容易性を向上させるための具体的なリファクタリング提案を行います。

## 使用方法
```
/refactor-suggest [file-path]
```

## コマンド概要
**役割**: コードの品質を向上させるための具体的なリファクタリング提案

このコマンドは、既存のコードに対して、保守性・可読性・テスト容易性を向上させるための具体的な改善提案を行います。単なる原則の指摘ではなく、「どのコードが」「なぜ問題か」「どのように修正すべきか」を、修正後のコード例と共に明確に提示します。

## 前提となるプロジェクト構造（基本形）

このコマンドは、以下のようなレイヤードアーキテクチャを基本形として想定しています：

```text
my_project/
├── app/
│   ├── main.py                      # FastAPIアプリケーション本体
│   ├── routers/
│   │   └── xxxx_router.py          # APIエンドポイント定義（Router層）
│   ├── services/
│   │   └── xxxx_service.py         # ビジネスロジック（Service層）
│   ├── repositories/
│   │   └── xxxx_repository.py      # データアクセス（Repository層）
│   ├── schemas/
│   │   └── xxxx_schema.py          # Pydanticスキーマ（リクエスト/レスポンス）
│   ├── models/
│   │   └── xxxx_model.py           # SQLAlchemyモデル（DBテーブル定義）
│   └── db/
│       └── session.py              # DB接続設定（get_db 等）
└── tests/
    ├── conftest.py                 # pytest設定（Fixture, TestClient, DBセットアップ）
    └── routers/
        └── test_xxxx_router.py     # Router層のテストコード
```

### レイヤーの責務

- **Router層** (`routers/`): HTTPリクエストの受け取りとレスポンスの返却
- **Service層** (`services/`): ビジネスロジックの実装
- **Repository層** (`repositories/`): データベースへのCRUD操作
- **Schema層** (`schemas/`): データのバリデーションとシリアライズ
- **Model層** (`models/`): データベーステーブルの定義

この基本形を理解した上で、プロジェクトの規模や複雑さに応じて適切な分割を提案します。

## 実行手順

### 1. 前提条件
- 対象ファイルのパスを指定
- ファイルの内容を読み込み
- プロジェクトの技術スタック・コーディング規約を理解
- **ステアリングドキュメントを読み込み**:
  ```bash
  # macOS/Linux:
  claude-code-spec-workflow get-content "/path/to/project/.claude/steering/tech.md"
  claude-code-spec-workflow get-content "/path/to/project/.claude/steering/structure.md"
  claude-code-spec-workflow get-content "/path/to/project/.claude/steering/code-style.md"
  ```

### 2. 分析観点

#### 2.1 依存関係の管理 (DI)
**問題の特定**:
- 外部依存（DB接続、APIクライアント、ファイルシステム、`datetime.now()`のようなシステム時間など）がクラス内部で直接インスタンス化（`new`）されている箇所
- ハードコードされた依存関係
- テスト時にモックを注入できない構造

**提案**:
- 依存関係をコードから切り離し、依存性の注入（DI）を用いて外部から（主にコンストラクタ経由で）受け取る形に修正
- テスト時にモックを注入できるようにする
- 具体的な修正コード例を提示

**出力例**:
```
❌ 問題のコード:
class UserService:
    def __init__(self):
        self.db = MySQLConnection()  # 直接インスタンス化
        self.current_time = datetime.now()  # システム時間に依存

    def create_user(self, name):
        user = User(name=name, created_at=self.current_time)
        self.db.save(user)

✅ 修正後のコード:
class UserService:
    def __init__(self, db_connection, time_provider):
        self.db = db_connection  # DI
        self.time_provider = time_provider  # DI

    def create_user(self, name):
        user = User(name=name, created_at=self.time_provider.now())
        self.db.save(user)

理由: 依存関係を外部から注入することで、テスト時にモックを使用可能になり、単体テストが容易になります。
```

#### 2.2 単一責任の原則 (SRP) と凝集度
**問題の特定**:
- 1つのクラスや関数が複数の異なる責務を持っている箇所
  - 例: 「ビジネスロジックの計算」と「DBへの保存」と「通知」を同時に実行
- 責務の境界が不明確
- 変更理由が複数存在するクラス/関数

**提案**:
- 責務ごとにクラスや関数を明確に分離
  - Service層: ビジネスロジック
  - Repository/Gateway層: データアクセス
  - Validatorクラス: 検証ロジック
  - Notifierクラス: 通知処理
- 各クラスの責務を明確に定義

**出力例**:
```
❌ 問題のコード:
class OrderProcessor:
    def process_order(self, order_data):
        # バリデーション
        if not order_data.get('email'):
            raise ValueError("Email required")

        # ビジネスロジック
        total = sum(item['price'] for item in order_data['items'])

        # DBへの保存
        db.save_order(order_data)

        # 通知
        send_email(order_data['email'], "Order confirmed")

✅ 修正後のコード:
class OrderValidator:
    def validate(self, order_data):
        if not order_data.get('email'):
            raise ValueError("Email required")

class OrderCalculator:
    def calculate_total(self, items):
        return sum(item['price'] for item in items)

class OrderRepository:
    def save(self, order):
        db.save_order(order)

class OrderNotifier:
    def notify(self, email, message):
        send_email(email, message)

class OrderService:
    def __init__(self, validator, calculator, repository, notifier):
        self.validator = validator
        self.calculator = calculator
        self.repository = repository
        self.notifier = notifier

    def process_order(self, order_data):
        self.validator.validate(order_data)
        total = self.calculator.calculate_total(order_data['items'])
        self.repository.save(order_data)
        self.notifier.notify(order_data['email'], "Order confirmed")

理由: 各クラスが単一の責務を持つことで、変更の影響範囲が限定され、テストも容易になります。
```

#### 2.3 副作用の分離 (純粋な関数)
**問題の特定**:
- 「計算ロジック」と「副作用」が混在している関数
  - 計算ロジック: 入力から出力を計算する部分
  - 副作用: DBへの書き込み、API呼び出し、グローバル変数の変更など
- 同じ入力でも異なる出力が返る可能性がある関数
- テスト時に副作用を制御できない関数

**提案**:
- ロジックを「純粋な関数」として切り出し
  - 純粋な関数: 副作用がなく、同じ入力には同じ出力が返る
- 副作用を伴う処理と分離
- テスト可能な構造に変更

**出力例**:
```
❌ 問題のコード:
def calculate_discount_and_save(user_id, amount):
    user = db.get_user(user_id)  # 副作用（DB読み込み）

    if user.is_premium:
        discount = amount * 0.2
    else:
        discount = amount * 0.1

    final_amount = amount - discount

    db.save_transaction(user_id, final_amount)  # 副作用（DB書き込み）

    return final_amount

✅ 修正後のコード:
# 純粋な関数（副作用なし）
def calculate_discount(amount, is_premium):
    discount_rate = 0.2 if is_premium else 0.1
    return amount * discount_rate

def calculate_final_amount(amount, discount):
    return amount - discount

# 副作用を伴う処理
class DiscountService:
    def __init__(self, user_repository, transaction_repository):
        self.user_repository = user_repository
        self.transaction_repository = transaction_repository

    def apply_discount_and_save(self, user_id, amount):
        user = self.user_repository.get_user(user_id)
        discount = calculate_discount(amount, user.is_premium)
        final_amount = calculate_final_amount(amount, discount)
        self.transaction_repository.save(user_id, final_amount)
        return final_amount

理由: 純粋な関数は単体テストが容易で、予測可能な動作を保証します。副作用を分離することで、テスト時にモックを使用できます。
```

#### 2.4 エラーハンドリング
**問題の特定**:
- 例外を安易に握りつぶしている箇所（`catch (Exception e) {}`のような）
- 抽象的すぎる例外（`Exception`）をスローしている箇所
- エラー情報が不足している箇所
- 適切なエラーハンドリングがない箇所

**提案**:
- ビジネスルールに基づいた具体的なカスタム例外を定義
  - 例: `UserNotFoundError`, `InsufficientStockError`, `ValidationError`
- 呼び出し元で適切に対応できるよう、例外を握りつぶさない
- エラーメッセージに十分な情報を含める

**出力例**:
```
❌ 問題のコード:
def get_user(user_id):
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise Exception("Error")  # 抽象的すぎる
        return user
    except Exception as e:
        pass  # 例外を握りつぶしている

✅ 修正後のコード:
# カスタム例外の定義
class UserNotFoundError(Exception):
    def __init__(self, user_id):
        self.user_id = user_id
        super().__init__(f"User with ID {user_id} not found")

class DatabaseConnectionError(Exception):
    def __init__(self, original_error):
        self.original_error = original_error
        super().__init__(f"Database connection failed: {original_error}")

# 修正後の関数
def get_user(user_id):
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise UserNotFoundError(user_id)
        return user
    except SQLAlchemyError as e:
        # 適切な例外に変換して再スロー
        raise DatabaseConnectionError(e)

理由: 具体的な例外を定義することで、呼び出し元で適切なエラーハンドリングが可能になります。例外を握りつぶさないことで、問題の追跡が容易になります。
```

#### 2.5 マジックナンバー / ハードコーディングの排除
**問題の特定**:
- コード内に直接埋め込まれた意味不明な数値（マジックナンバー）
- ハードコードされた文字列（URL、ファイルパス、設定値）
- 意味が不明確な定数

**提案**:
- 定数や設定ファイル（環境変数）として定義
- 意味の分かる名前で参照
- 設定の一元管理

**出力例**:
```
❌ 問題のコード:
def calculate_shipping(weight):
    if weight > 10:
        return weight * 500
    else:
        return weight * 300

def send_notification(user):
    api_url = "https://api.example.com/notify"
    requests.post(api_url, json={"user": user})

✅ 修正後のコード:
# 定数の定義
class ShippingConstants:
    HEAVY_WEIGHT_THRESHOLD_KG = 10
    HEAVY_RATE_PER_KG = 500
    STANDARD_RATE_PER_KG = 300

# 環境変数からの読み込み
class Config:
    NOTIFICATION_API_URL = os.getenv('NOTIFICATION_API_URL', 'https://api.example.com/notify')

# 修正後のコード
def calculate_shipping(weight):
    if weight > ShippingConstants.HEAVY_WEIGHT_THRESHOLD_KG:
        return weight * ShippingConstants.HEAVY_RATE_PER_KG
    else:
        return weight * ShippingConstants.STANDARD_RATE_PER_KG

def send_notification(user, config: Config):
    requests.post(config.NOTIFICATION_API_URL, json={"user": user})

理由: 定数に名前をつけることで、コードの意図が明確になります。環境変数を使用することで、環境ごとの設定変更が容易になります。
```

#### 2.6 Serviceレイヤーの分割パターン

**問題の特定**:

- Serviceクラスが肥大化し、複数の異なるユースケースを処理している
  - 例: `UserService`に登録、更新、削除、パスワードリセット、退会処理などすべてのロジックが集約
- 単一のServiceファイルが数百行〜数千行に達している
- テスト時に不要な依存関係までモックする必要がある
- 「神クラス」（God Class）になっている

**レイヤードアーキテクチャーとビジネスロジック（servicesフォルダ）が長くなってきたら、それは次のリファクタリングのサインです。**

UserServiceのようなファイルに、ユーザー登録、プロフィール更新、パスワードリセット、退会処理...と全てのロジックを詰め込むと、そのファイル自体が「単一責任の原則」に違反し、テストしにくい巨大なファイル（神クラス）になってしまいます。

**提案**:

Serviceレイヤーをさらに分割します。ビジネスロジックの複雑さに応じて、2つの主要な分割パターンがあります。

##### パターン1: 汎用ロジックの分離 (Utils / Helpers)

もし長くなったロジックが、「ユーザー」といった特定のドメインに依存しない汎用的な処理（例: トークン生成、複雑なデータ変換、セキュリティ処理）であれば、それはServiceから切り離します。

**何を分離するか**:

- パスワードのハッシュ化、検証ロジック
- JWTトークンの生成、デコード
- 特定の形式（例: CSV）へのデータ変換

**どこに配置するか**:

- `app/core/security.py`
- `app/core/utils.py`

**メリット**:

- これらは「純粋な関数」としてテストできるため、単体テストが非常に容易になります
- Serviceは本質的なビジネスロジックに集中できます

**出力例**:

```python
❌ 問題のコード:
class UserService:
    def __init__(self, user_repository):
        self.user_repository = user_repository

    def register_user(self, email, password):
        # パスワードハッシュ化ロジックがServiceに混在
        import bcrypt
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

        user = User(email=email, password=hashed)
        self.user_repository.save(user)

    def verify_password(self, user, password):
        # パスワード検証ロジックもServiceに混在
        import bcrypt
        return bcrypt.checkpw(password.encode(), user.password)

✅ 修正後のコード:
# app/core/security.py - 汎用的なセキュリティ処理
class PasswordHasher:
    def hash(self, password: str) -> bytes:
        import bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    def verify(self, password: str, hashed: bytes) -> bool:
        import bcrypt
        return bcrypt.checkpw(password.encode(), hashed)

# app/services/user_service.py - ビジネスロジックに集中
class UserService:
    def __init__(self, user_repository, password_hasher: PasswordHasher):
        self.user_repository = user_repository
        self.password_hasher = password_hasher

    def register_user(self, email, password):
        hashed = self.password_hasher.hash(password)
        user = User(email=email, password=hashed)
        self.user_repository.save(user)

    def verify_password(self, user, password):
        return self.password_hasher.verify(password, user.password)

理由: 汎用的な処理を分離することで、PasswordHasherは純粋な関数として独立してテスト可能になります。UserServiceはビジネスロジックに集中でき、テストも容易になります。
```

##### パターン2: ユースケース（責務）ごとの分離 (推奨)

**これが本命です。**「ユーザー関連のロジック」といっても、実際には「ユーザー登録」「プロフィール更新」は独立した別の責務（ユースケース）です。

これをファイル単位で分離します。

**何を分離するか**:

- UserServiceが肥大化してきたら、その「責務」ごとにクラス（ファイル）を分割します

**どこに配置するか**:

- `app/services/` の下に、ドメイン（機能）ごとのフォルダを作成します

**フォルダ構造の具体例**:

```text
❌ 変更前 (肥大化しがち):
app/
└── services/
    ├── user_service.py  <-- 登録、更新、退会など全てここ（500行以上）
    └── item_service.py

✅ 変更後 (ユースケースごとに分離):
app/
└── services/
    ├── __init__.py
    │
    ├── user/  <-- 「ユーザー」ドメインのフォルダ
    │   ├── __init__.py
    │   ├── user_registration_service.py  # 責務: ユーザー登録
    │   ├── user_profile_service.py       # 責務: プロフィール管理
    │   └── user_withdrawal_service.py    # 責務: 退会処理
    │
    └── item/  <-- 「アイテム」ドメインのフォルダ
        ├── __init__.py
        ├── item_creation_service.py      # 責務: アイテム登録
        └── stock_management_service.py   # 責務: 在庫管理
```

**コード例**:

```python
❌ 問題のコード:
# app/services/user_service.py (500行以上の巨大なファイル)
class UserService:
    def __init__(
        self,
        user_repository,
        mail_service,
        notification_service,
        payment_service,
        storage_service
    ):
        # すべての依存関係を注入（テスト時に全部モックが必要）
        self.user_repository = user_repository
        self.mail_service = mail_service
        self.notification_service = notification_service
        self.payment_service = payment_service
        self.storage_service = storage_service

    def register_user(self, data):
        # ユーザー登録処理（メール送信が必要）
        user = self.user_repository.create(data)
        self.mail_service.send_welcome_email(user.email)
        return user

    def update_profile(self, user_id, data):
        # プロフィール更新（メール不要、ストレージが必要）
        user = self.user_repository.update(user_id, data)
        if 'avatar' in data:
            self.storage_service.upload(data['avatar'])
        return user

    def withdraw_user(self, user_id):
        # 退会処理（決済サービス、通知が必要）
        user = self.user_repository.get(user_id)
        self.payment_service.cancel_subscription(user_id)
        self.notification_service.send_withdrawal_notice(user)
        self.user_repository.delete(user_id)

    # ...他にも多数のメソッド

✅ 修正後のコード:
# app/services/user/user_registration_service.py
class UserRegistrationService:
    def __init__(
        self,
        user_repository,
        mail_service  # 登録はメール通知が必要
    ):
        self.user_repository = user_repository
        self.mail_service = mail_service

    def register(self, data):
        user = self.user_repository.create(data)
        self.mail_service.send_welcome_email(user.email)
        return user

# app/services/user/user_profile_service.py
class UserProfileService:
    def __init__(
        self,
        user_repository,
        storage_service  # プロフィール更新はストレージが必要
    ):
        self.user_repository = user_repository
        self.storage_service = storage_service

    def update_profile(self, user_id, data):
        user = self.user_repository.update(user_id, data)
        if 'avatar' in data:
            self.storage_service.upload(data['avatar'])
        return user

# app/services/user/user_withdrawal_service.py
class UserWithdrawalService:
    def __init__(
        self,
        user_repository,
        payment_service,
        notification_service  # 退会は決済と通知が必要
    ):
        self.user_repository = user_repository
        self.payment_service = payment_service
        self.notification_service = notification_service

    def withdraw(self, user_id):
        user = self.user_repository.get(user_id)
        self.payment_service.cancel_subscription(user_id)
        self.notification_service.send_withdrawal_notice(user)
        self.user_repository.delete(user_id)

理由: ユースケースごとに分割することで、各Serviceが必要な依存関係のみを持ちます。テスト時にモックするべき対象が明確になり、不要な依存関係を気にする必要がありません。
```

##### FastAPIでのDI活用例

FastAPIの`Depends`を使用することで、この構造の威力が最大化されます。

```python
# app/routers/user.py
from fastapi import APIRouter, Depends
from app.services.user.user_registration_service import UserRegistrationService
from app.services.user.user_profile_service import UserProfileService

router = APIRouter()

@router.post("/users")
def register_user(
    data: UserRegistrationData,
    service: UserRegistrationService = Depends()
):
    return service.register(data)

@router.put("/users/{user_id}/profile")
def update_profile(
    user_id: int,
    data: UserProfileData,
    service: UserProfileService = Depends()
):
    return service.update_profile(user_id, data)
```

##### テスト容易性のメリット

**UserRegistrationService のテスト**:

```python
def test_user_registration():
    # 必要な依存関係だけモック（2つのみ）
    mock_repository = Mock(UserRepository)
    mock_mail_service = Mock(MailService)

    service = UserRegistrationService(mock_repository, mock_mail_service)

    # テスト実行
    service.register({"email": "test@example.com"})

    # 検証
    mock_repository.create.assert_called_once()
    mock_mail_service.send_welcome_email.assert_called_once()
```

**UserProfileService のテスト**:

```python
def test_user_profile_update():
    # 必要な依存関係だけモック（2つのみ）
    # MailService のことを一切気にする必要がない！
    mock_repository = Mock(UserRepository)
    mock_storage_service = Mock(StorageService)

    service = UserProfileService(mock_repository, mock_storage_service)

    # テスト実行
    service.update_profile(1, {"name": "New Name"})

    # 検証
    mock_repository.update.assert_called_once()
```

**重要なポイント**:

- UserRegistrationServiceをテストする際は、`UserRepository`と`MailService`の2つをモックすれば良いことが明確です
- UserProfileServiceをテストする際は、`UserRepository`と`StorageService`だけモックすればよく、`MailService`のことを一切気にする必要がありません
- 各Serviceが持つ依存関係が最小限になり、テストの複雑さが大幅に軽減されます

このように、ロジックが長くなったら、より小さな「責務」に分割するという原則を適用し続けることで、コードベース全体をテストしやすく、見やすい状態に保つことができます。

#### 2.7 Router/Controller層の分割パターン

**問題の特定**:

- 単一のルーターファイルに大量のエンドポイントが集約されている
  - 例: `staff.py`に16個以上のエンドポイントが定義されている
- ルーターファイルが数百行〜数千行に達している
- 関連性の低いエンドポイントが同じファイルに混在している
- 責務の境界が不明確

**提案**:

FastAPIのルーターを機能やユースケースごとに分割します。

##### 分割の基準

**機能別分割（推奨）**:

- CRUD操作（Create, Read, Update, Delete）ごと
- ビジネス機能ごと（検索、レポート、管理など）
- アクセス権限レベルごと（公開API、認証済みAPI、管理者API）

**フォルダ構造の具体例**:

```text
❌ 変更前 (肥大化しがち):
app/
└── routers/
    ├── staff.py  <-- 16個のエンドポイント（800行以上）
    └── location.py

✅ 変更後 (機能ごとに分離):
app/
└── routers/
    ├── __init__.py
    │
    ├── staff/
    │   ├── __init__.py
    │   ├── staff_search.py       # GET /staff/search
    │   ├── staff_crud.py          # GET/POST/PUT/DELETE /staff
    │   ├── staff_portfolio.py     # /staff/{id}/portfolio
    │   └── staff_admin.py         # 管理者専用エンドポイント
    │
    └── location/
        ├── __init__.py
        ├── location_search.py
        └── location_crud.py
```

**コード例**:

```python
❌ 問題のコード:
# app/routers/staff.py (800行以上の巨大なファイル)
from fastapi import APIRouter, Depends

router = APIRouter()

# 検索エンドポイント
@router.get("/staff/search")
async def search_staff(...):
    pass

# CRUD エンドポイント
@router.post("/staff")
async def create_staff(...):
    pass

@router.get("/staff/{staff_id}")
async def get_staff(...):
    pass

@router.put("/staff/{staff_id}")
async def update_staff(...):
    pass

@router.delete("/staff/{staff_id}")
async def delete_staff(...):
    pass

# ポートフォリオ関連
@router.get("/staff/{staff_id}/portfolio")
async def get_portfolio(...):
    pass

@router.post("/staff/{staff_id}/portfolio")
async def add_portfolio(...):
    pass

# 管理者専用
@router.post("/staff/bulk-import")
async def bulk_import_staff(...):
    pass

# ...さらに8個のエンドポイント

✅ 修正後のコード:
# app/routers/staff/staff_search.py
from fastapi import APIRouter, Depends
from app.services.staff.staff_search_service import StaffSearchService

router = APIRouter(prefix="/staff", tags=["staff-search"])

@router.get("/search")
async def search_staff(
    service: StaffSearchService = Depends()
):
    # 検索ロジック
    pass

# app/routers/staff/staff_crud.py
from fastapi import APIRouter, Depends
from app.services.staff.staff_crud_service import StaffCrudService

router = APIRouter(prefix="/staff", tags=["staff-crud"])

@router.post("")
async def create_staff(
    service: StaffCrudService = Depends()
):
    pass

@router.get("/{staff_id}")
async def get_staff(
    staff_id: int,
    service: StaffCrudService = Depends()
):
    pass

@router.put("/{staff_id}")
async def update_staff(
    staff_id: int,
    service: StaffCrudService = Depends()
):
    pass

@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: int,
    service: StaffCrudService = Depends()
):
    pass

# app/routers/staff/__init__.py
from fastapi import APIRouter
from .staff_search import router as search_router
from .staff_crud import router as crud_router
from .staff_portfolio import router as portfolio_router
from .staff_admin import router as admin_router

router = APIRouter()
router.include_router(search_router)
router.include_router(crud_router)
router.include_router(portfolio_router)
router.include_router(admin_router)

# app/main.py
from app.routers.staff import router as staff_router

app.include_router(staff_router)

理由: エンドポイントを機能ごとに分割することで、各ルーターファイルが単一の責務を持ち、保守性が向上します。変更の影響範囲が限定され、テストも容易になります。
```

#### 2.8 Repository/CRUD層の分割パターン

**問題の特定**:

- 単一のRepositoryクラスに全てのデータアクセスロジックが集約されている
  - 例: `crud_staff.py`に検索、作成、更新、削除、集計など全てのクエリが混在
- Repositoryファイルが数百行〜数千行に達している
- 複雑なクエリと単純なCRUDが混在している
- テーブル結合が複雑化している

**提案**:

Repository層を責務ごとに分割します。

##### 分割の基準

**操作の複雑さによる分割**:

- 基本CRUD操作（Create, Read, Update, Delete）
- 複雑な検索・フィルタリング
- 集計・レポート生成
- バルク操作

**フォルダ構造の具体例**:

```text
❌ 変更前 (肥大化しがち):
app/
└── db/
    ├── crud_staff.py  <-- 全てのデータアクセスロジック（600行以上）
    └── crud_location.py

✅ 変更後 (責務ごとに分離):
app/
└── db/
    ├── __init__.py
    │
    ├── staff/
    │   ├── __init__.py
    │   ├── staff_repository.py         # 基本CRUD操作
    │   ├── staff_search_repository.py  # 検索・フィルタリング
    │   ├── staff_report_repository.py  # 集計・レポート
    │   └── staff_bulk_repository.py    # バルク操作
    │
    └── location/
        ├── __init__.py
        ├── location_repository.py
        └── location_search_repository.py
```

**コード例**:

```python
❌ 問題のコード:
# app/db/crud_staff.py (600行以上の巨大なファイル)
from sqlalchemy.orm import Session
from app.models.staff import Staff

class StaffRepository:
    def __init__(self, db: Session):
        self.db = db

    # 基本CRUD
    def create(self, data):
        staff = Staff(**data)
        self.db.add(staff)
        self.db.commit()
        return staff

    def get_by_id(self, staff_id):
        return self.db.query(Staff).filter(Staff.id == staff_id).first()

    def update(self, staff_id, data):
        # 更新ロジック
        pass

    def delete(self, staff_id):
        # 削除ロジック
        pass

    # 複雑な検索
    def search_with_filters(self, filters):
        query = self.db.query(Staff)
        # 複雑なフィルタリングロジック（100行以上）
        pass

    def search_by_location_and_skill(self, location, skills):
        # さらに複雑な検索ロジック
        pass

    # 集計・レポート
    def get_statistics_by_area(self):
        # 集計ロジック（50行以上）
        pass

    def generate_monthly_report(self):
        # レポート生成ロジック
        pass

    # バルク操作
    def bulk_insert(self, data_list):
        # バルク挿入ロジック
        pass

    # ...さらに多数のメソッド

✅ 修正後のコード:
# app/db/staff/staff_repository.py - 基本CRUD操作のみ
from sqlalchemy.orm import Session
from app.models.staff import Staff

class StaffRepository:
    """スタッフの基本CRUD操作を提供するRepository"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: dict) -> Staff:
        """スタッフを新規作成"""
        staff = Staff(**data)
        self.db.add(staff)
        self.db.commit()
        self.db.refresh(staff)
        return staff

    def get_by_id(self, staff_id: int) -> Staff:
        """IDでスタッフを取得"""
        return self.db.query(Staff).filter(Staff.id == staff_id).first()

    def update(self, staff_id: int, data: dict) -> Staff:
        """スタッフ情報を更新"""
        staff = self.get_by_id(staff_id)
        for key, value in data.items():
            setattr(staff, key, value)
        self.db.commit()
        self.db.refresh(staff)
        return staff

    def delete(self, staff_id: int) -> bool:
        """スタッフを削除"""
        staff = self.get_by_id(staff_id)
        if staff:
            self.db.delete(staff)
            self.db.commit()
            return True
        return False

# app/db/staff/staff_search_repository.py - 検索専用
from sqlalchemy.orm import Session
from app.models.staff import Staff
from typing import List, Dict

class StaffSearchRepository:
    """スタッフの検索・フィルタリング機能を提供するRepository"""

    def __init__(self, db: Session):
        self.db = db

    def search_with_filters(self, filters: Dict) -> List[Staff]:
        """複雑なフィルタリング検索"""
        query = self.db.query(Staff)

        if "occupation" in filters:
            query = query.filter(Staff.occupation == filters["occupation"])

        if "area" in filters:
            query = query.filter(Staff.area == filters["area"])

        if "min_fee" in filters:
            query = query.filter(Staff.fee >= filters["min_fee"])

        # その他のフィルタリング条件
        return query.all()

    def search_by_location_and_skill(
        self, location: str, skills: List[str]
    ) -> List[Staff]:
        """位置とスキルによる検索"""
        # 複雑な検索ロジック
        pass

# app/db/staff/staff_report_repository.py - 集計・レポート専用
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.staff import Staff

class StaffReportRepository:
    """スタッフの集計・レポート機能を提供するRepository"""

    def __init__(self, db: Session):
        self.db = db

    def get_statistics_by_area(self) -> Dict:
        """エリア別の統計情報を取得"""
        result = (
            self.db.query(
                Staff.area,
                func.count(Staff.id).label("count"),
                func.avg(Staff.fee).label("avg_fee")
            )
            .group_by(Staff.area)
            .all()
        )
        return [{"area": r.area, "count": r.count, "avg_fee": r.avg_fee} for r in result]

    def generate_monthly_report(self) -> Dict:
        """月次レポートを生成"""
        # レポート生成ロジック
        pass

理由: 責務を分離することで、各Repositoryクラスが明確な目的を持ちます。基本CRUDと複雑な検索を分離することで、コードの見通しが良くなり、テストも容易になります。
```

#### 2.9 Model層の分割パターン

**問題の特定**:

- 単一のモデルファイルに大量のテーブル定義が混在している
- ドメインの異なるモデルが同じファイルに定義されている
- 関連モデル（リレーション）の整理が不十分
- モデルとビジネスロジックが混在している

**提案**:

Model層をドメインごとに分割し、DTOと分離します。

##### 分割の基準

**ドメインによる分割**:

- エンティティモデル（DBテーブル定義）
- DTOモデル（データ転送オブジェクト）
- レスポンスモデル（API応答用）

**フォルダ構造の具体例**:

```text
❌ 変更前 (混在している):
app/
└── models/
    ├── models.py  <-- 全てのモデル定義が混在（500行以上）
    └── schemas.py

✅ 変更後 (ドメインと目的で分離):
app/
└── models/
    ├── __init__.py
    │
    ├── entities/  # DBモデル（SQLAlchemy）
    │   ├── __init__.py
    │   ├── staff.py
    │   ├── location.py
    │   ├── portfolio.py
    │   └── base.py
    │
    ├── dto/  # データ転送オブジェクト（Pydantic）
    │   ├── __init__.py
    │   ├── staff_dto.py
    │   └── location_dto.py
    │
    └── responses/  # APIレスポンス用（Pydantic）
        ├── __init__.py
        ├── staff_response.py
        └── location_response.py
```

**コード例**:

```python
❌ 問題のコード:
# app/models/models.py (500行以上の巨大なファイル)
from sqlalchemy import Column, Integer, String
from pydantic import BaseModel

# DBモデル
class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    # ...他の多数のカラム

class Location(Base):
    __tablename__ = "location"
    # ...

class Portfolio(Base):
    # ...

# Pydanticモデル（DTO）も同じファイルに混在
class StaffCreate(BaseModel):
    name: str
    # ...

class StaffResponse(BaseModel):
    id: int
    name: str
    # ...

class LocationCreate(BaseModel):
    # ...

# ...さらに多数のモデル

✅ 修正後のコード:
# app/models/entities/base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# app/models/entities/staff.py
from sqlalchemy import Column, Integer, String, Text, Float
from sqlalchemy.orm import relationship
from .base import Base

class Staff(Base):
    """スタッフエンティティ（DBテーブル定義）"""
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    occupation = Column(String(100))
    area = Column(String(100))
    fee = Column(Float)
    bio = Column(Text)

    # リレーション
    portfolios = relationship("Portfolio", back_populates="staff")

# app/models/entities/portfolio.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Portfolio(Base):
    """ポートフォリオエンティティ"""
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"))
    title = Column(String(255))
    description = Column(Text)

    # リレーション
    staff = relationship("Staff", back_populates="portfolios")

# app/models/dto/staff_dto.py
from pydantic import BaseModel, Field
from typing import Optional

class StaffCreateDTO(BaseModel):
    """スタッフ作成用のDTO"""
    name: str = Field(..., min_length=1, max_length=255)
    occupation: Optional[str] = Field(None, max_length=100)
    area: Optional[str] = Field(None, max_length=100)
    fee: Optional[float] = Field(None, ge=0)
    bio: Optional[str] = None

class StaffUpdateDTO(BaseModel):
    """スタッフ更新用のDTO"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    occupation: Optional[str] = Field(None, max_length=100)
    area: Optional[str] = Field(None, max_length=100)
    fee: Optional[float] = Field(None, ge=0)
    bio: Optional[str] = None

# app/models/responses/staff_response.py
from pydantic import BaseModel
from typing import List, Optional

class PortfolioResponse(BaseModel):
    """ポートフォリオレスポンス"""
    id: int
    title: str
    description: Optional[str]

    class Config:
        from_attributes = True

class StaffResponse(BaseModel):
    """スタッフ詳細レスポンス"""
    id: int
    name: str
    occupation: Optional[str]
    area: Optional[str]
    fee: Optional[float]
    bio: Optional[str]
    portfolios: List[PortfolioResponse] = []

    class Config:
        from_attributes = True

理由: モデルを目的別（エンティティ、DTO、レスポンス）に分離することで、責務が明確になります。DBスキーマとAPI仕様を分離できるため、それぞれを独立して変更可能になります。
```

#### 2.10 Utils/Helpers層の適切な配置と分類

**問題の特定**:

- `utils/`フォルダに関連性の低い関数が無秩序に配置されている
- ビジネスロジックとユーティリティ関数の境界が不明確
- 特定のドメインに依存するコードがutilsに混在している
- テストしにくい構造になっている

**提案**:

ユーティリティ関数を目的と依存関係で分類し、適切に配置します。

##### 分類の基準

**純粋なユーティリティ（utils/）**:

- ドメインに依存しない汎用的な処理
- 純粋関数（副作用なし）
- プロジェクト横断的に使用される

**ドメイン固有のヘルパー（services内またはcore/）**:

- 特定のドメインに依存する処理
- ビジネスルールを含む処理

**フォルダ構造の具体例**:

```text
❌ 変更前 (無秩序):
app/
└── utils/
    ├── helpers.py  <-- 全ての関数が混在（400行以上）
    └── utils.py

✅ 変更後 (目的別に整理):
app/
├── utils/  # 純粋なユーティリティ（ドメイン非依存）
│   ├── __init__.py
│   ├── datetime_utils.py      # 日時操作
│   ├── string_utils.py        # 文字列操作
│   ├── file_utils.py          # ファイル操作
│   └── validation_utils.py    # 汎用バリデーション
│
└── core/  # ドメイン固有だが横断的な処理
    ├── __init__.py
    ├── security.py            # 認証・認可
    ├── encryption.py          # 暗号化
    └── email.py               # メール送信
```

**コード例**:

```python
❌ 問題のコード:
# app/utils/helpers.py (400行以上の巨大なファイル)
import hashlib
import jwt
from datetime import datetime
from typing import Optional

# 日時操作
def format_date(date):
    return date.strftime("%Y-%m-%d")

# 文字列操作
def truncate_string(s, length):
    return s[:length]

# セキュリティ（ドメイン依存）
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# JWT（ドメイン依存）
def create_jwt_token(user_id):
    return jwt.encode({"user_id": user_id}, "secret_key")

# ビジネスロジック（本来はServiceにあるべき）
def calculate_staff_fee(base_fee, experience_years):
    if experience_years > 10:
        return base_fee * 1.5
    return base_fee

# ファイル操作
def save_file(file, path):
    # ファイル保存ロジック
    pass

# ...さらに多数の関数

✅ 修正後のコード:
# app/utils/datetime_utils.py - 純粋な日時操作ユーティリティ
from datetime import datetime, timedelta
from typing import Optional

def format_date(date: datetime, format_str: str = "%Y-%m-%d") -> str:
    """日付を指定されたフォーマットで文字列化"""
    return date.strftime(format_str)

def parse_date(date_str: str, format_str: str = "%Y-%m-%d") -> Optional[datetime]:
    """文字列を日付にパース"""
    try:
        return datetime.strptime(date_str, format_str)
    except ValueError:
        return None

def add_days(date: datetime, days: int) -> datetime:
    """日付に日数を加算"""
    return date + timedelta(days=days)

# app/utils/string_utils.py - 純粋な文字列操作ユーティリティ
from typing import Optional

def truncate_string(s: str, length: int, suffix: str = "...") -> str:
    """文字列を指定長で切り詰め"""
    if len(s) <= length:
        return s
    return s[:length - len(suffix)] + suffix

def to_snake_case(s: str) -> str:
    """文字列をスネークケースに変換"""
    import re
    s = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', s)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s).lower()

# app/core/security.py - セキュリティ関連（ドメイン依存）
import hashlib
import jwt
from datetime import datetime, timedelta
from typing import Dict

class PasswordHasher:
    """パスワードハッシュ化クラス"""

    @staticmethod
    def hash(password: str) -> str:
        """パスワードをハッシュ化"""
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def verify(password: str, hashed: str) -> bool:
        """パスワードを検証"""
        return PasswordHasher.hash(password) == hashed

class JWTManager:
    """JWT管理クラス"""

    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm

    def create_token(self, user_id: int, expires_in_hours: int = 24) -> str:
        """JWTトークンを生成"""
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(hours=expires_in_hours)
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def decode_token(self, token: str) -> Dict:
        """JWTトークンをデコード"""
        return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

# app/services/staff/staff_fee_calculator.py - ビジネスロジック
class StaffFeeCalculator:
    """スタッフ料金計算サービス"""

    def calculate_fee(self, base_fee: float, experience_years: int) -> float:
        """経験年数に基づいて料金を計算"""
        if experience_years > 10:
            return base_fee * 1.5
        elif experience_years > 5:
            return base_fee * 1.2
        return base_fee

理由: 純粋なユーティリティとドメイン固有の処理を分離することで、依存関係が明確になります。純粋関数は単体テストが容易で、再利用性が高まります。ビジネスロジックをServiceに配置することで、責務が明確になります。
```

### 3. 分析レポートの作成

以下の形式でリファクタリング提案レポートを作成してください：

```markdown
# リファクタリング提案レポート

## 対象ファイル
- ファイルパス: [file-path]
- 作成日時: [datetime]

## エグゼクティブサマリー
- 重大な問題点: [件数]
- 中程度の問題点: [件数]
- 軽微な問題点: [件数]

## 詳細な提案

### 1. 依存関係の管理 (DI)

#### 問題箇所 1: [行番号] - [問題の概要]
- **問題のコード**: [該当コード]
- **問題点**: [なぜ問題か]
- **修正後のコード**: [具体的な修正例]
- **期待される効果**: [保守性・可読性・テスト容易性への影響]
- **優先度**: [高/中/低]

### 2. 単一責任の原則 (SRP)

[同様の形式で記載]

### 3. 副作用の分離

[同様の形式で記載]

### 4. エラーハンドリング

[同様の形式で記載]

### 5. マジックナンバー / ハードコーディング

[同様の形式で記載]

## 実装の優先順位

1. **高優先度**: [問題箇所のリスト]
2. **中優先度**: [問題箇所のリスト]
3. **低優先度**: [問題箇所のリスト]

## 推奨される実装順序

1. [ステップ1の説明]
2. [ステップ2の説明]
3. [ステップ3の説明]

## 追加の推奨事項

- [その他の改善提案]
```

### 4. 承認プロセス
- 完全な分析レポートを提示
- **既存のコーディング規約との整合性を確認**: プロジェクトの規約に従った提案であることを示す
- **リファクタリングの影響範囲を明示**: どのファイル・機能に影響するか
- 質問: "このリファクタリング提案で問題ありませんか？実装を開始してもよろしいでしょうか？"
- フィードバックを反映し、修正
- 明確な承認を得るまで繰り返す
- **重要**: 明確な承認なしに実装を開始しない

## 分析ガイドライン

### コード調査
- プロジェクト全体のコーディングパターンを理解
- 既存の類似コードを参照
- プロジェクトの技術スタックに適した提案を行う
- ステアリングドキュメント（tech.md, structure.md）に従う

### 問題の特定
- 具体的な行番号を指摘
- なぜ問題かを明確に説明
- 影響範囲を明示

### 解決策の提案
- 具体的な修正コード例を提示
- プロジェクトの既存パターンを尊重
- 段階的な実装が可能な提案を行う
- テスト戦略も含める

## 重要なルール
- **絶対に**: ユーザーの明確な承認なしに実装を開始しない
- 明確な肯定的回答のみ受け入れる: "はい"、"承認します"、"問題ありません"など
- フィードバックがあれば修正し、再度承認を求める
- 承認が得られるまで修正サイクルを継続

## 次のステップ
承認後、リファクタリングの実装を開始します。必要に応じて `/test-generate` コマンドでテストコードを先に生成することを推奨します。
