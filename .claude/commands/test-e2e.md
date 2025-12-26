# E2E Test Generate Command

Next.js（フロントエンド）とFastAPI（バックエンド）の連携を含む、E2Eテストコードを作成します。

## 使用方法

```bash
/test-e2e [scenario-description]
```

## コマンド概要

**言語**: TypeScript
**フレームワーク**: Playwright (または Cypress)
**対象**: Next.js (フロント) と FastAPI (バック) の連携
**役割**: エンドツーエンド（E2E）テストの生成

このコマンドは、実際のブラウザを起動し、ユーザー操作をシミュレートし、**デプロイされたNext.jsがデプロイされたFastAPI（とテスト用DB）と連携する**、システム全体の流れを検証するE2Eテストを生成します。

## E2Eテストの定義

E2Eテストは、以下の全体フローを検証します：

```
ブラウザ → Next.js (フロント) → FastAPI (バック) → テスト用DB
```

- **単体テスト**との違い: 単体テストは個別のクラス/関数を検証しますが、E2Eテストはシステム全体の動作を検証します。
- **結合テスト**との違い: 結合テストは一部のコンポーネント連携を検証しますが、E2Eテストは実際のブラウザ操作を含む完全なユーザーフローを検証します。

## 前提条件

E2Eテストを実行する前に、以下の環境が必要です：

1. **Next.jsのフロントエンド**が `http://localhost:3000` で実行中であること
2. **FastAPIのバックエンド**が `http://localhost:8000` で、**テスト用データベース**に接続された状態で実行中であること

**重要**: 本番DBは使用せず、必ずテスト専用DBを使用してください。

## 厳守すべきベストプラクティス

### 1. ブラックボックス・テスト

**テストはコードの内部実装を知らない「ブラックボックス」として扱います**。

- 実際のブラウザ（`page`）を操作
- ユーザーが見ているものだけを検証
- 内部の状態管理やAPIの詳細は知らない

**実装例**:

```typescript
// ❌ 悪い例: 内部実装に依存
expect(component.state.users).toHaveLength(5);

// ✅ 良い例: ユーザーが見ているものを検証
expect(page.locator('[data-testid="user-list"] li')).toHaveCount(5);
```

### 2. ユーザー中心のセレクタ

**`page.getByRole`、`page.getByLabel`、`page.getByText` を使用**して、ユーザーが認識できる方法で要素を選択します。

**推奨される選択方法の優先順位**:
1. `getByRole` - ARIAロールで選択（最も推奨）
2. `getByLabel` - ラベルで選択（フォーム要素向け）
3. `getByPlaceholder` - プレースホルダーで選択
4. `getByText` - テキストコンテンツで選択
5. `getByTestId` - data-testid で選択（最終手段）

**実装例**:

```typescript
// ✅ 推奨: ARIAロールで選択
await page.getByRole('button', { name: '送信' }).click();

// ✅ 推奨: ラベルで選択
await page.getByLabel('メールアドレス').fill('test@example.com');

// ✅ 許容: テキストで選択
await page.getByText('ログイン').click();

// ❌ 非推奨: CSSセレクタ
await page.locator('.submit-btn').click();
```

### 3. テストデータの隔離

**各テストが独立するように**、テスト開始前にテストデータを準備するか、テスト実行後にデータをクリーンアップします。

**方法1: APIを使ったデータ準備**

```typescript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  // テスト前にテストデータを準備
  await request.post('http://localhost:8000/api/staff', {
    data: {
      name: 'テストスタッフ',
      occupation: 'カメラマン',
      area: '東京'
    }
  });
});

test.afterEach(async ({ request }) => {
  // テスト後にデータをクリーンアップ
  const response = await request.get('http://localhost:8000/api/staff');
  const staff = await response.json();

  for (const s of staff) {
    await request.delete(`http://localhost:8000/api/staff/${s.id}`);
  }
});
```

**方法2: DBを直接クリーンアップ**

```typescript
import { test } from '@playwright/test';
import { pool } from './db'; // テスト用DB接続

test.afterEach(async () => {
  // テーブルをクリーンアップ
  await pool.query('DELETE FROM staff');
  await pool.query('DELETE FROM portfolio');
});
```

### 4. 非同期処理の待機（Auto-Waiting）

**Playwrightの自動待機機能を活用**します。

- `await page.getByRole(...).click()` - クリック可能になるまで自動で待機
- `await page.getByText(...).isVisible()` - 要素が表示されるまで自動で待機
- `page.waitForTimeout()` のような固定待機は避ける

**実装例**:

```typescript
// ❌ 悪い例: 固定時間待機
await page.click('button');
await page.waitForTimeout(3000); // 3秒待機

// ✅ 良い例: 自動待機
await page.getByRole('button', { name: '送信' }).click();
await expect(page.getByText('登録しました')).toBeVisible();
```

### 5. UIとDBのダブルチェック（推奨）

**ユーザー操作後、UIの期待結果を確認するだけでなく、テスト用DBに直接接続してデータが正しく永続化されたかもアサート**します。

**実装例**:

```typescript
test('スタッフを新規作成できる', async ({ page, request }) => {
  // Act - フォームに入力して送信
  await page.goto('http://localhost:3000/staff/new');
  await page.getByLabel('名前').fill('山田太郎');
  await page.getByLabel('職種').fill('カメラマン');
  await page.getByRole('button', { name: '登録' }).click();

  // Assert - UI確認
  await expect(page.getByText('登録しました')).toBeVisible();

  // Assert - DB確認（推奨）
  const response = await request.get('http://localhost:8000/api/staff');
  const staff = await response.json();
  const createdStaff = staff.find((s: any) => s.name === '山田太郎');

  expect(createdStaff).toBeDefined();
  expect(createdStaff.occupation).toBe('カメラマン');
});
```

## テストシナリオ例

### シナリオ1: ユーザー新規登録

**フロー**: 登録ページ → フォーム入力 → 送信 → ダッシュボードにリダイレクト

**実装例**:

```typescript
// tests/e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ユーザー新規登録', () => {
  test('正常に登録できる', async ({ page, request }) => {
    // Arrange: 登録ページにアクセス
    await page.goto('http://localhost:3000/register');

    // Act: フォームに入力
    await page.getByLabel('名前').fill('テストユーザー');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('SecurePass123!');

    // Act: 登録ボタンをクリック
    await page.getByRole('button', { name: '登録' }).click();

    // Assert (UI): ダッシュボードにリダイレクトされる
    await expect(page).toHaveURL('http://localhost:3000/dashboard');

    // Assert (UI): ようこそメッセージが表示される
    await expect(page.getByText('ようこそ、テストユーザーさん')).toBeVisible();

    // Assert (DB): DBにユーザーが保存されている
    const response = await request.get('http://localhost:8000/api/users');
    const users = await response.json();
    const createdUser = users.find((u: any) => u.email === 'test@example.com');

    expect(createdUser).toBeDefined();
    expect(createdUser.name).toBe('テストユーザー');
  });

  test('重複メールアドレスでエラーが表示される', async ({ page, request }) => {
    // Arrange: 既存ユーザーを作成
    await request.post('http://localhost:8000/api/users', {
      data: {
        name: '既存ユーザー',
        email: 'existing@example.com',
        password: 'password123'
      }
    });

    // Act: 同じメールアドレスで登録を試みる
    await page.goto('http://localhost:3000/register');
    await page.getByLabel('名前').fill('新規ユーザー');
    await page.getByLabel('メールアドレス').fill('existing@example.com');
    await page.getByLabel('パスワード').fill('password456');
    await page.getByRole('button', { name: '登録' }).click();

    // Assert: エラーメッセージが表示される
    await expect(page.getByText(/このメールアドレスは既に使用されています/i)).toBeVisible();

    // Assert: 登録ページのまま（リダイレクトされない）
    await expect(page).toHaveURL('http://localhost:3000/register');
  });
});
```

### シナリオ2: スタッフ検索

**フロー**: スタッフ一覧ページ → フィルタ選択 → 検索 → 結果表示

**実装例**:

```typescript
// tests/e2e/staff-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('スタッフ検索', () => {
  test.beforeEach(async ({ request }) => {
    // テストデータを準備
    const staffList = [
      { name: 'スタッフA', occupation: 'カメラマン', area: '東京', fee: 50000 },
      { name: 'スタッフB', occupation: '編集者', area: '大阪', fee: 60000 },
      { name: 'スタッフC', occupation: 'カメラマン', area: '大阪', fee: 70000 },
    ];

    for (const staff of staffList) {
      await request.post('http://localhost:8000/api/staff', { data: staff });
    }
  });

  test('職種フィルタで検索できる', async ({ page }) => {
    // Arrange
    await page.goto('http://localhost:3000/staff');

    // 最初は全スタッフが表示される
    await expect(page.getByText('スタッフA')).toBeVisible();
    await expect(page.getByText('スタッフB')).toBeVisible();
    await expect(page.getByText('スタッフC')).toBeVisible();

    // Act: 職種フィルタで「カメラマン」を選択
    await page.getByLabel('職種').selectOption('カメラマン');
    await page.getByRole('button', { name: '検索' }).click();

    // Assert: カメラマンのみ表示される
    await expect(page.getByText('スタッフA')).toBeVisible();
    await expect(page.getByText('スタッフC')).toBeVisible();
    await expect(page.getByText('スタッフB')).not.toBeVisible();
  });

  test('複数条件で検索できる', async ({ page }) => {
    // Arrange
    await page.goto('http://localhost:3000/staff');

    // Act: 職種=カメラマン、エリア=大阪で検索
    await page.getByLabel('職種').selectOption('カメラマン');
    await page.getByLabel('エリア').selectOption('大阪');
    await page.getByRole('button', { name: '検索' }).click();

    // Assert: スタッフCのみ表示される
    await expect(page.getByText('スタッフC')).toBeVisible();
    await expect(page.getByText('スタッフA')).not.toBeVisible();
    await expect(page.getByText('スタッフB')).not.toBeVisible();
  });
});
```

### シナリオ3: CRUD操作

**フロー**: 作成 → 詳細表示 → 編集 → 削除

**実装例**:

```typescript
// tests/e2e/staff-crud.spec.ts
import { test, expect } from '@playwright/test';

test.describe('スタッフCRUD操作', () => {
  test('スタッフの作成→詳細→編集→削除の全フローが正常に動作する', async ({ page, request }) => {
    // 1. 作成
    await page.goto('http://localhost:3000/staff/new');
    await page.getByLabel('名前').fill('山田太郎');
    await page.getByLabel('職種').fill('カメラマン');
    await page.getByLabel('エリア').fill('東京');
    await page.getByLabel('料金').fill('50000');
    await page.getByRole('button', { name: '登録' }).click();

    // Assert: 成功メッセージ
    await expect(page.getByText('登録しました')).toBeVisible();

    // 2. 一覧表示
    await page.goto('http://localhost:3000/staff');
    await expect(page.getByText('山田太郎')).toBeVisible();

    // 3. 詳細表示
    await page.getByText('山田太郎').click();
    await expect(page.getByText('カメラマン')).toBeVisible();
    await expect(page.getByText('東京')).toBeVisible();
    await expect(page.getByText('50,000円')).toBeVisible();

    // 4. 編集
    await page.getByRole('button', { name: '編集' }).click();
    await page.getByLabel('料金').clear();
    await page.getByLabel('料金').fill('60000');
    await page.getByRole('button', { name: '保存' }).click();

    // Assert: 更新成功
    await expect(page.getByText('更新しました')).toBeVisible();
    await expect(page.getByText('60,000円')).toBeVisible();

    // 5. 削除
    await page.getByRole('button', { name: '削除' }).click();
    await page.getByRole('button', { name: '削除する' }).click(); // 確認ダイアログ

    // Assert: 削除成功
    await expect(page.getByText('削除しました')).toBeVisible();

    // Assert: 一覧から消えている
    await page.goto('http://localhost:3000/staff');
    await expect(page.getByText('山田太郎')).not.toBeVisible();

    // Assert (DB): DBからも削除されている
    const response = await request.get('http://localhost:8000/api/staff');
    const staff = await response.json();
    const deletedStaff = staff.find((s: any) => s.name === '山田太郎');
    expect(deletedStaff).toBeUndefined();
  });
});
```

### シナリオ4: 認証フロー

**フロー**: ログイン → 認証必須ページアクセス → ログアウト

**実装例**:

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('ログイン→認証ページアクセス→ログアウトが正常に動作する', async ({ page }) => {
    // 1. ログインページにアクセス
    await page.goto('http://localhost:3000/login');

    // 2. ログイン
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: 'ログイン' }).click();

    // Assert: ダッシュボードにリダイレクト
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.getByText('ようこそ')).toBeVisible();

    // 3. 認証必須ページにアクセス
    await page.goto('http://localhost:3000/staff/new');
    await expect(page.getByLabel('名前')).toBeVisible();

    // 4. ログアウト
    await page.getByRole('button', { name: 'ログアウト' }).click();

    // Assert: ログインページにリダイレクト
    await expect(page).toHaveURL('http://localhost:3000/login');

    // 5. ログアウト後に認証必須ページにアクセスを試みる
    await page.goto('http://localhost:3000/staff/new');

    // Assert: ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/);
  });
});
```

## テストコードの構造

以下の構成でテストファイルを生成してください：

```typescript
/**
 * [シナリオ名] のE2Eテストコード
 *
 * このテストファイルは、[シナリオ名]に対する包括的なE2Eテストを提供します。
 * 以下のテストケースが含まれています：
 * - 正常系フロー
 * - エラー系フロー
 * - UI検証
 * - DB検証
 */

import { test, expect } from '@playwright/test';

test.describe('[シナリオ名]', () => {
  // テストデータの準備
  test.beforeEach(async ({ request }) => {
    // テストデータをセットアップ
  });

  // テストデータのクリーンアップ
  test.afterEach(async ({ request }) => {
    // テストデータをクリーンアップ
  });

  test('正常系: [テストケース名]', async ({ page, request }) => {
    // Arrange: ページにアクセス

    // Act: ユーザー操作

    // Assert (UI): UI検証

    // Assert (DB): DB検証
  });

  test('異常系: [エラーケース名]', async ({ page }) => {
    // Arrange: ページにアクセス

    // Act: エラーを引き起こす操作

    // Assert: エラーメッセージ表示を確認
  });
});
```

## Playwright設定例

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: [
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd backend && uvicorn app.main:app --reload',
      url: 'http://localhost:8000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

## カバレッジ目標

E2Eテストのカバレッジ目標：

- **最低基準**: 主要なユーザーフローをカバー（60%以上）
- **推奨値**: 70%以上
- **目標値**: 80%以上

**実行コマンド**:

```bash
# E2Eテストを実行
npx playwright test

# ヘッドレスモードで実行
npx playwright test --headed

# 特定のブラウザで実行
npx playwright test --project=chromium

# デバッグモード
npx playwright test --debug
```

## 承認プロセス

- 完全なテストコードを提示
- **テストシナリオの説明**: どのユーザーフローを検証しているか
- **テストデータ戦略の説明**: テストデータの準備とクリーンアップ方法
- **UI・DB検証の説明**: UIとDBの両方をどのように検証しているか
- 質問: "このE2Eテストコードで問題ありませんか？テストファイルを作成してもよろしいでしょうか？"
- フィードバックを反映し、修正
- 明確な承認を得るまで繰り返す
- **重要**: 明確な承認なしにファイルを作成しない

## 重要なルール

- **絶対に**: ユーザーの明確な承認なしにテストファイルを作成しない
- 明確な肯定的回答のみ受け入れる: "はい"、"承認します"、"問題ありません"など
- フィードバックがあれば修正し、再度承認を求める
- 承認が得られるまで修正サイクルを継続

## 次のステップ

承認後、生成したE2Eテストコードをプロジェクトに追加し、テストを実行して動作を確認します。
