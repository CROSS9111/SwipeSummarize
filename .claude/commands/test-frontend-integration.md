# Frontend Integration Test Generate Command

Next.jsのページまたはコンポーネントに対する、フロントエンド結合テストコードを作成します。

## 使用方法

```bash
/test-frontend-integration [component-file-path]
```

## コマンド概要

**言語**: TypeScript (React)
**フレームワーク**: Next.js, Jest, React Testing Library (RTL), MSW (Mock Service Worker)
**役割**: フロントエンド結合テスト（複数コンポーネント連携）の生成

このコマンドは、Next.jsのページまたはコンポーネントに対して、MSW (Mock Service Worker) を使用したフロントエンド結合テストを生成します。**複数のコンポーネント（例: フォームとリスト表示）が連携して動作すること**を検証し、バックエンドAPIはモックします。

## 結合テストの定義

フロントエンド結合テストは、以下の流れを検証します：

```
ユーザー操作 → フォームコンポーネント → APIクライアント（モック） → 状態管理 → リスト表示コンポーネント
```

- **単体テスト**との違い: 単体テストは各コンポーネントを個別にテストしますが、結合テストは複数のコンポーネントが連携して動作することを検証します。
- **E2Eテスト**との違い: E2Eテストは実際のバックエンドAPIと通信しますが、フロントエンド結合テストはバックエンドをモック化し、フロントエンド内部の動作に集中します。

## 厳守すべきベストプラクティス

### 1. APIの完全なモック（MSW）

**MSW (Mock Service Worker) を導入**し、対象コンポーネントが通信するFastAPIのエンドポイントに対するモックハンドラを定義します。

**重要**: 実際のバックエンドには絶対に通信させないでください。

**セットアップ例**:

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// MSWサーバーのセットアップ
export const server = setupServer(...handlers);

// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // スタッフ一覧取得のモック
  rest.get('/api/staff', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, name: 'テストスタッフ1', occupation: 'カメラマン' },
        { id: 2, name: 'テストスタッフ2', occupation: '編集者' }
      ])
    );
  }),

  // スタッフ作成のモック
  rest.post('/api/staff', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        ...body
      })
    );
  }),

  // エラーレスポンスのモック
  rest.post('/api/staff/error', (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({ detail: 'バリデーションエラー' })
    );
  })
];

// tests/setup.ts
import { server } from './mocks/server';

// テスト開始前にMSWサーバーを起動
beforeAll(() => server.listen());

// 各テスト後にハンドラーをリセット
afterEach(() => server.resetHandlers());

// すべてのテスト終了後にサーバーをクローズ
afterAll(() => server.close());
```

**jest.config.js に追加**:

```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // その他の設定...
};
```

### 2. ユーザー操作のシミュレート（user-event）

**`@testing-library/user-event` を使用**して、実際のユーザー操作をシミュレートします。

**重要ポイント**:
- `render` でコンポーネントを描画した後、`userEvent.type()` や `userEvent.click()` でユーザー操作をシミュレート
- すべての操作は `await` を使用して非同期に実行

**実装例**:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StaffForm from '@/components/domains/staff/StaffForm';

test('フォームに入力できる', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<StaffForm />);

  // Act
  const nameInput = screen.getByLabelText('名前');
  await user.type(nameInput, '山田太郎');

  const occupationInput = screen.getByLabelText('職種');
  await user.type(occupationInput, 'カメラマン');

  // Assert
  expect(nameInput).toHaveValue('山田太郎');
  expect(occupationInput).toHaveValue('カメラマン');
});
```

### 3. 非同期なUI変更の待機

**フォーム送信後、API通信（モック）が発生するため、UIが更新されるのを待つ**必要があります。

**重要ポイント**:
- `screen.findByText()` などの非同期クエリを使用
- `waitFor()` でUI更新を待機
- `getBy...` は同期的なので、非同期処理後には使用しない

**実装例**:

```typescript
test('フォーム送信後に成功メッセージが表示される', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<StaffForm />);

  // Act
  await user.type(screen.getByLabelText('名前'), '山田太郎');
  await user.type(screen.getByLabelText('職種'), 'カメラマン');
  await user.click(screen.getByRole('button', { name: '登録' }));

  // Assert - 非同期でUIが更新されるのを待つ
  const successMessage = await screen.findByText('登録しました');
  expect(successMessage).toBeInTheDocument();
});
```

### 4. ユーザー中心のアサーション

**`screen.getByRole` や `screen.getByLabelText` を使用**して、ユーザーが認識できる要素を基準に操作・検証します。

**推奨される選択方法の優先順位**:
1. `getByRole` - ARIAロールで選択（最も推奨）
2. `getByLabelText` - ラベルで選択（フォーム要素向け）
3. `getByPlaceholderText` - プレースホルダーで選択
4. `getByText` - テキストコンテンツで選択
5. `getByTestId` - data-testid で選択（最終手段）

**実装例**:

```typescript
// ❌ 悪い例: CSSクラスやIDに依存
const button = container.querySelector('.submit-button');

// ✅ 良い例: ユーザーが認識できる方法で選択
const button = screen.getByRole('button', { name: '送信' });
const emailInput = screen.getByLabelText('メールアドレス');
const errorMessage = screen.getByText('エラーが発生しました');
```

## テストケース

### 1. 正常系テスト

**フォームに入力 → 送信 → 成功メッセージ表示**の流れを検証します。

**実装例**:

```typescript
// tests/integration/staff/StaffFormIntegration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/tests/mocks/server';
import { rest } from 'msw';
import StaffPage from '@/app/staff/page';

describe('StaffPage 結合テスト', () => {
  describe('正常系', () => {
    test('スタッフを新規作成できる', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<StaffPage />);

      // Act - フォームに入力
      await user.type(screen.getByLabelText('名前'), '山田太郎');
      await user.type(screen.getByLabelText('職種'), 'カメラマン');
      await user.type(screen.getByLabelText('エリア'), '東京');
      await user.type(screen.getByLabelText('料金'), '50000');

      // Act - 送信ボタンをクリック
      await user.click(screen.getByRole('button', { name: '登録' }));

      // Assert - 成功メッセージが表示される
      const successMessage = await screen.findByText('登録しました');
      expect(successMessage).toBeInTheDocument();

      // Assert - フォームがリセットされる
      expect(screen.getByLabelText('名前')).toHaveValue('');
    });

    test('スタッフ一覧が表示される', async () => {
      // Arrange
      render(<StaffPage />);

      // Act - ページ読み込み時にAPIが呼ばれる

      // Assert - スタッフが表示される
      const staff1 = await screen.findByText('テストスタッフ1');
      const staff2 = await screen.findByText('テストスタッフ2');

      expect(staff1).toBeInTheDocument();
      expect(staff2).toBeInTheDocument();
    });

    test('フォーム送信後にスタッフ一覧が更新される', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<StaffPage />);

      // 最初の状態を確認
      await screen.findByText('テストスタッフ1');

      // Act - スタッフを追加
      await user.type(screen.getByLabelText('名前'), '新規スタッフ');
      await user.type(screen.getByLabelText('職種'), 'ディレクター');
      await user.click(screen.getByRole('button', { name: '登録' }));

      // Assert - 新規スタッフがリストに追加される
      const newStaff = await screen.findByText('新規スタッフ');
      expect(newStaff).toBeInTheDocument();
    });
  });
});
```

### 2. エラー系テスト

**フォーム送信 → エラーレスポンス → エラーメッセージ表示**の流れを検証します。

**実装例**:

```typescript
describe('エラー系', () => {
  test('バリデーションエラー時にエラーメッセージが表示される', async () => {
    // Arrange - MSWでエラーレスポンスを返すように設定
    server.use(
      rest.post('/api/staff', (req, res, ctx) => {
        return res(
          ctx.status(422),
          ctx.json({
            detail: [
              { msg: '名前は必須です', loc: ['body', 'name'] }
            ]
          })
        );
      })
    );

    const user = userEvent.setup();
    render(<StaffPage />);

    // Act - 不正なデータで送信
    // 名前を入力せずに送信
    await user.type(screen.getByLabelText('職種'), 'カメラマン');
    await user.click(screen.getByRole('button', { name: '登録' }));

    // Assert - エラーメッセージが表示される
    const errorMessage = await screen.findByText(/名前は必須です/i);
    expect(errorMessage).toBeInTheDocument();
  });

  test('サーバーエラー時にエラーメッセージが表示される', async () => {
    // Arrange - MSWで500エラーを返すように設定
    server.use(
      rest.post('/api/staff', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ detail: 'サーバーエラーが発生しました' })
        );
      })
    );

    const user = userEvent.setup();
    render(<StaffPage />);

    // Act
    await user.type(screen.getByLabelText('名前'), '山田太郎');
    await user.type(screen.getByLabelText('職種'), 'カメラマン');
    await user.click(screen.getByRole('button', { name: '登録' }));

    // Assert
    const errorMessage = await screen.findByText(/エラーが発生しました/i);
    expect(errorMessage).toBeInTheDocument();
  });

  test('ネットワークエラー時にエラーメッセージが表示される', async () => {
    // Arrange - MSWでネットワークエラーをシミュレート
    server.use(
      rest.post('/api/staff', (req, res) => {
        return res.networkError('Failed to connect');
      })
    );

    const user = userEvent.setup();
    render(<StaffPage />);

    // Act
    await user.type(screen.getByLabelText('名前'), '山田太郎');
    await user.type(screen.getByLabelText('職種'), 'カメラマン');
    await user.click(screen.getByRole('button', { name: '登録' }));

    // Assert
    const errorMessage = await screen.findByText(/通信エラーが発生しました/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
```

### 3. 複数コンポーネント連携テスト

**フィルタ → リスト更新**など、複数のコンポーネントが連携する動作を検証します。

**実装例**:

```typescript
describe('複数コンポーネント連携', () => {
  test('検索フィルタを変更するとリストが更新される', async () => {
    // Arrange
    server.use(
      rest.get('/api/staff', (req, res, ctx) => {
        const occupation = req.url.searchParams.get('occupation');

        if (occupation === 'カメラマン') {
          return res(
            ctx.json([
              { id: 1, name: 'スタッフA', occupation: 'カメラマン' }
            ])
          );
        }

        return res(
          ctx.json([
            { id: 1, name: 'スタッフA', occupation: 'カメラマン' },
            { id: 2, name: 'スタッフB', occupation: '編集者' }
          ])
        );
      })
    );

    const user = userEvent.setup();
    render(<StaffPage />);

    // 最初は全スタッフが表示される
    await screen.findByText('スタッフA');
    await screen.findByText('スタッフB');

    // Act - 職種フィルタを選択
    const occupationFilter = screen.getByLabelText('職種');
    await user.selectOptions(occupationFilter, 'カメラマン');

    // Assert - フィルタリング後は該当するスタッフのみ表示
    await waitFor(() => {
      expect(screen.getByText('スタッフA')).toBeInTheDocument();
      expect(screen.queryByText('スタッフB')).not.toBeInTheDocument();
    });
  });

  test('削除ボタンをクリックするとリストから削除される', async () => {
    // Arrange
    server.use(
      rest.delete('/api/staff/:id', (req, res, ctx) => {
        return res(ctx.status(200));
      }),
      rest.get('/api/staff', (req, res, ctx) => {
        // 削除後は1件だけ返す
        return res(
          ctx.json([
            { id: 2, name: 'テストスタッフ2', occupation: '編集者' }
          ])
        );
      })
    );

    const user = userEvent.setup();
    render(<StaffPage />);

    // 最初は2件表示される
    await screen.findByText('テストスタッフ1');
    await screen.findByText('テストスタッフ2');

    // Act - 削除ボタンをクリック
    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    await user.click(deleteButtons[0]);

    // 確認ダイアログで「はい」をクリック
    const confirmButton = await screen.findByRole('button', { name: 'はい' });
    await user.click(confirmButton);

    // Assert - リストから削除される
    await waitFor(() => {
      expect(screen.queryByText('テストスタッフ1')).not.toBeInTheDocument();
      expect(screen.getByText('テストスタッフ2')).toBeInTheDocument();
    });
  });
});
```

### 4. ローディング状態のテスト

**API通信中のローディング表示**を検証します。

**実装例**:

```typescript
describe('ローディング状態', () => {
  test('データ取得中はローディングインジケーターが表示される', async () => {
    // Arrange - MSWで遅延を追加
    server.use(
      rest.get('/api/staff', async (req, res, ctx) => {
        await ctx.delay(100); // 100ms遅延
        return res(
          ctx.json([
            { id: 1, name: 'テストスタッフ1', occupation: 'カメラマン' }
          ])
        );
      })
    );

    // Act
    render(<StaffPage />);

    // Assert - ローディング中はスピナーが表示される
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/読み込み中/i)).toBeInTheDocument();

    // Assert - データ取得後はスピナーが消える
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Assert - データが表示される
    expect(screen.getByText('テストスタッフ1')).toBeInTheDocument();
  });
});
```

## テストコードの構造

以下の構成でテストファイルを生成してください：

```typescript
/**
 * [対象コンポーネント名] のフロントエンド結合テストコード
 *
 * このテストファイルは、[対象コンポーネント名]に対する包括的なフロントエンド結合テストを提供します。
 * 以下のテストケースが含まれています：
 * - 正常系テスト
 * - エラー系テスト
 * - 複数コンポーネント連携テスト
 * - ローディング状態のテスト
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/tests/mocks/server';
import { rest } from 'msw';

// ========================================
// 正常系テスト
// ========================================

describe('StaffPage 結合テスト', () => {
  describe('正常系', () => {
    test('スタッフを新規作成できる', async () => {
      // テストコード
    });

    test('スタッフ一覧が表示される', async () => {
      // テストコード
    });
  });

  // ========================================
  // エラー系テスト
  // ========================================

  describe('エラー系', () => {
    test('バリデーションエラー時にエラーメッセージが表示される', async () => {
      // テストコード
    });

    test('サーバーエラー時にエラーメッセージが表示される', async () => {
      // テストコード
    });
  });

  // ========================================
  // 複数コンポーネント連携テスト
  // ========================================

  describe('複数コンポーネント連携', () => {
    test('検索フィルタを変更するとリストが更新される', async () => {
      // テストコード
    });
  });

  // ========================================
  // ローディング状態のテスト
  // ========================================

  describe('ローディング状態', () => {
    test('データ取得中はローディングインジケーターが表示される', async () => {
      // テストコード
    });
  });
});
```

## カバレッジ目標

フロントエンド結合テストのカバレッジ目標：

- **最低基準**: 主要なユーザーフローをカバー（70%以上）
- **推奨値**: 80%以上
- **目標値**: 90%以上

**測定コマンド**:

```bash
# フロントエンド結合テストのみ実行
npm test -- --coverage --testPathPattern=integration
```

## 承認プロセス

- 完全なテストコードを提示
- **テストケースの網羅性を説明**: どのユーザーフロー・シナリオがカバーされているか
- **モック戦略の説明**: APIエンドポイントをどのようにモック化しているか
- **コンポーネント連携の説明**: どのコンポーネント間の連携を検証しているか
- 質問: "このフロントエンド結合テストコードで問題ありませんか？テストファイルを作成してもよろしいでしょうか？"
- フィードバックを反映し、修正
- 明確な承認を得るまで繰り返す
- **重要**: 明確な承認なしにファイルを作成しない

## 重要なルール

- **絶対に**: ユーザーの明確な承認なしにテストファイルを作成しない
- 明確な肯定的回答のみ受け入れる: "はい"、"承認します"、"問題ありません"など
- フィードバックがあれば修正し、再度承認を求める
- 承認が得られるまで修正サイクルを継続

## 次のステップ

承認後、生成したフロントエンド結合テストコードをプロジェクトに追加し、テストを実行して動作を確認します。
