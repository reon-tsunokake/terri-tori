# Project Architecture Documentation

## フォルダー構造

このプロジェクトは関心の分離（Separation of Concerns）を重視した設計になっています。各層が明確な責任を持ち、保守性と拡張性を向上させています。

```
src/
├── app/                         # Next.js App Router - UIレイヤー
│   ├── globals.css             # グローバルスタイル（TailwindCSS v4）
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # ホームページ（マップビュー）
│   ├── login/
│   │   └── page.tsx            # ログインページ
│   ├── signup/
│   │   └── page.tsx            # サインアップページ
│   ├── profile/
│   │   └── page.tsx            # プロフィールページ
│   ├── post/
│   │   ├── page.tsx            # 投稿作成ページ
│   │   └── [id]/
│   │       └── page.tsx        # 投稿詳細ページ
│   ├── ranking/
│   │   └── page.tsx            # ランキングページ
│   └── search/
│       └── page.tsx            # 検索ページ
├── components/                  # 再利用可能なUIコンポーネント
│   ├── Forms/
│   │   └── PostForm.tsx        # 投稿フォーム
│   ├── layout/
│   │   ├── BottomNavigation.tsx    # ボトムナビゲーション
│   │   ├── CameraButton.tsx        # カメラボタン
│   │   ├── Header.tsx              # ヘッダー
│   │   ├── LocationDisplay.tsx     # 位置情報表示
│   │   └── SemiModal.tsx           # セミモーダル
│   ├── LikeButton/
│   │   └── LikeButton.tsx      # いいねボタン（再利用可能）
│   ├── map/
│   │   └── MapContainer.tsx    # 地図コンテナ
│   └── post/
│       └── [id]/
│           ├── PostDetailContent.tsx    # 投稿詳細コンテンツ
│           ├── PostDetailHeader.tsx     # 投稿詳細ヘッダー
│           └── PostDetailPage.tsx       # 投稿詳細ページ
├── contexts/                    # React Context - 状態管理レイヤー
│   ├── AuthContext.tsx         # 認証状態の管理
│   ├── LocationContext.tsx     # 位置情報の管理
│   └── SeasonPostContext.tsx   # シーズン投稿の管理
├── hooks/                       # カスタムフック
│   └── useToggleLike.ts        # いいね機能のビジネスロジック
├── lib/                         # ライブラリ設定
│   └── firebase.ts             # Firebase設定とインスタンス
├── services/                    # ビジネスロジックレイヤー
│   ├── authService.ts          # Firebase認証操作
│   ├── userService.ts          # Firestoreユーザー操作
│   ├── postService.ts          # 投稿CRUD操作
│   ├── likeService.ts          # いいね機能（Firestore操作）
│   └── mapService.ts           # 地図関連サービス
├── types/                       # 型定義レイヤー
│   ├── auth.ts                 # 認証関連の型定義
│   ├── firestore.ts            # Firestoreドキュメント構造の型定義
│   ├── map.ts                  # 地図関連の型定義
│   ├── post.ts                 # 投稿関連の型定義
│   └── jsx.d.ts                # JSX拡張型定義
└── utils/                       # ユーティリティレイヤー
    ├── validation.ts           # フォームバリデーション機能
    └── location.ts             # 位置情報ユーティリティ

functions/                       # Firebase Cloud Functions
├── src/
│   ├── index.ts                # エントリーポイント
│   ├── scheduledFunctions/
│   │   ├── updateDailyRanking.ts    # デイリーランキング更新
│   │   └── updateSeason.ts          # シーズン更新
│   ├── types/
│   │   ├── ranking.ts          # ランキング型定義
│   │   └── season.ts           # シーズン型定義
│   └── utils/
│       └── scoreCalculator.ts  # スコア計算ロジック
└── lib/                        # コンパイル済みJavaScript

public/
└── data/
    └── municipalities.geojson  # 市区町村データ
```

## アーキテクチャの原則

### 1. 関心の分離 (Separation of Concerns)

各レイヤーは独立した責任を持ちます：

- **UIレイヤー (`app/`)**：ユーザーインターフェースの表示とユーザーインタラクション
- **コンポーネントレイヤー (`components/`)**：再利用可能なUIコンポーネント
- **状態管理レイヤー (`contexts/`)**：アプリケーション状態の管理のみ
- **フックレイヤー (`hooks/`)**：ビジネスロジックのカプセル化
- **ビジネスロジックレイヤー (`services/`)**：Firebase操作とビジネスルール
- **型定義レイヤー (`types/`)**：TypeScriptの型安全性を提供
- **ユーティリティレイヤー (`utils/`)**：共通機能とヘルパー関数

### 2. 依存関係の方向

```
UI → Components → Hooks → Services → Lib → Firebase
UI → Context → Services
UI → Types
UI → Utils
Components → Hooks → Services
Components → Types
Services → Types
Utils → Types
```

上位レイヤーは下位レイヤーに依存しますが、逆は依存しません。

### 3. いいね機能の設計パターン（例）

```
LikeButton (UI)
   ↓ props: onClick
useToggleLike (Hook)
   ↓ 呼び出し
likeService (Service)
   ↓ Firestore操作
Firebase
```

**設計の利点**：
- UIとロジックが完全に分離
- 楽観的UI更新とエラーハンドリングをフックに集約
- 再利用可能で保守性が高い

## 各レイヤーの詳細

### UIレイヤー (`src/app/`)

**責任**：
- ユーザーインターフェースの描画
- ユーザーの入力処理
- ページルーティング

**特徴**：
- Next.js App Routerを使用
- TailwindCSS v4でスタイリング
- rose/pinkグラデーションテーマ
- モバイルファーストのレスポンシブデザイン

### コンポーネントレイヤー (`src/components/`)

**責任**：
- 再利用可能なUIコンポーネント
- レイアウトコンポーネント
- 共通のUI要素

**特徴**：
- React Iconsを使用したアイコン
- モバイル最適化されたナビゲーション
- タッチ操作に最適化

#### LikeButton/LikeButton.tsx
- 純粋なプレゼンテーションコンポーネント
- ハートアイコンとアニメーション
- propsでロジックを受け取る（onClick, isLiked, likesCount）
- 再利用可能な設計

#### layout/BottomNavigation.tsx
- 固定ボトムナビゲーション
- ホーム/検索/投稿/ランキング/プロフィール間の移動
- アクティブ状態の表示

#### layout/CameraButton.tsx
- 中央に配置されたカメラボタン
- モーダルトリガー

#### map/MapContainer.tsx
- Mapbox GL JSを使用した地図表示
- 位置情報の表示と管理

#### post/[id]/
- 投稿詳細の表示コンポーネント群
- ヘッダー、コンテンツ、ページの分離

### ライブラリ設定レイヤー (`src/lib/`)

**責任**：
- 外部ライブラリの設定と初期化
- 設定の中央管理
- インスタンスの提供

#### firebase.ts
- Firebase設定の中央管理
- 認証、Firestore、Storageのインスタンス提供
- アプリケーション全体で使用される設定

### 状態管理レイヤー (`src/contexts/`)

**責任**：
- アプリケーション全体の状態管理
- 認証状態の保持
- 位置情報の管理
- コンポーネント間のデータ共有

**設計原則**：
- ビジネスロジックは含まない
- サービス層を呼び出すのみ
- 状態の更新と提供に特化

#### AuthContext.tsx
認証状態の管理：
- ユーザー情報の保持
- ログイン/ログアウト状態
- サービス層との連携

#### LocationContext.tsx
位置情報の管理：
- 現在位置の取得と保持
- 地域情報の管理
- 位置ベースの機能サポート

#### SeasonPostContext.tsx
シーズン投稿の管理：
- 現在のシーズン情報
- シーズンベースの投稿管理

### カスタムフックレイヤー (`src/hooks/`)

**責任**：
- ビジネスロジックのカプセル化
- 状態管理とFirestore操作の橋渡し
- 楽観的UI更新とエラーハンドリング

**設計原則**：
- UIとデータアクセスを分離
- 再利用可能なロジック
- テスト可能な設計

#### useToggleLike.ts
いいね機能のビジネスロジック：
- いいね状態の管理（isLiked, likesCount）
- 楽観的UI更新
- エラー時のロールバック
- likeServiceの呼び出し
- 二重送信防止

**使用例**：
```typescript
const { isLiked, likesCount, isLoading, handleToggleLike } = useToggleLike({
  postId: post.id,
  initialIsLiked: false,
  initialLikesCount: post.likesCount || 0,
});
```

### ビジネスロジックレイヤー (`src/services/`)

**責任**：
- Firebaseとの通信
- ビジネスルールの実装
- データの検証と変換

**設計原則**：
- 純粋な関数またはクラスメソッドを使用
- 単一責任の原則
- エラーハンドリングを含む

#### authService.ts
Firebase Authenticationの操作を担当：
- サインイン・サインアップ
- Googleログイン
- ログアウト
- パスワードリセット

#### userService.ts
Firestoreのユーザードキュメント操作を担当：
- ユーザードキュメントの作成・取得・更新
- プロフィール管理
- フォロー・投稿数の管理

#### postService.ts
投稿のCRUD操作を担当：
- 投稿の作成・取得・更新・削除
- 画像のアップロード
- 投稿一覧の取得（フィルタリング）
- シーズンIDの生成

#### likeService.ts
いいね機能のFirestore操作を担当：
- いいねの追加/削除（batch操作）
- いいね状態の確認
- サブコレクション `posts/{postId}/likes/{userId}` の管理
- likesCountとscoreの更新

**設計の意図**：
- `postService.ts`から分離し、単一責任の原則を適用
- いいね機能が独立してテスト・保守可能

#### mapService.ts
地図関連の操作を担当：
- Mapbox API連携
- 地図データの取得と変換

### 型定義レイヤー (`src/types/`)

**責任**：
- TypeScriptの型安全性を提供
- APIインターフェースの定義
- データ構造の明確化

#### auth.ts
認証関連の型定義：
- `SignInData`, `SignUpData`：API入力データ
- `AuthContextType`：Contextインターフェース
- Firebase認証エラーコードの型

#### firestore.ts
Firestoreドキュメント構造の型定義：
- `UserDocument`：ユーザードキュメント
- `PostDocument`：投稿ドキュメント
- `PostLikeDocument`：いいねドキュメント
- `SeasonDocument`：シーズンドキュメント
- `CreatePostData`：投稿作成データ

#### map.ts
地図関連の型定義：
- 地図データ構造
- 位置情報の型

#### post.ts
投稿関連の型定義：
- 投稿表示用の拡張型
- フィルタリングオプション

#### jsx.d.ts
JSX拡張型定義：
- カスタムJSX要素の型定義

### ユーティリティレイヤー (`src/utils/`)

**責任**：
- 共通機能の提供
- 再利用可能なヘルパー関数
- クライアントサイドバリデーション

**設計原則**：
- 純粋関数（副作用なし）
- 単一責任の原則
- 他のレイヤーに依存しない

#### validation.ts
フォームバリデーション機能：
- メールアドレス・パスワードの形式チェック
- セキュリティを考慮した検証ルール
- 各フォーム専用のバリデーション関数

#### location.ts
位置情報ユーティリティ：
- 市区町村名の取得
- 都道府県名の取得
- GeoJSONデータの処理
- 位置情報の変換とフォーマット

## Firebase Cloud Functions

**責任**：
- サーバーサイドのスケジュール処理
- ランキングの自動更新
- シーズンの自動更新

### scheduledFunctions/

#### updateDailyRanking.ts
デイリーランキングの更新：
- 毎日定時実行
- スコア計算とランキング生成
- Firestoreへの書き込み

#### updateSeason.ts
シーズンの更新：
- 月次で実行
- 新しいシーズンの作成
- 過去データの集計

### utils/scoreCalculator.ts
スコア計算ロジック：
- いいね数ベースのスコア算出
- ランキング用の重み付け計算

## データフロー

### いいね機能のフロー例（最新の設計）

1. **ユーザーがいいねボタンをクリック**
   ```typescript
   // components/LikeButton/LikeButton.tsx
   <LikeButton onClick={handleToggleLike} isLiked={isLiked} likesCount={likesCount} />
   ```

2. **カスタムフックが楽観的UI更新を実行**
   ```typescript
   // hooks/useToggleLike.ts
   const handleToggleLike = async () => {
     // 楽観的UI更新
     setIsLiked(!isLiked);
     setLikesCount(prev => !isLiked ? prev + 1 : prev - 1);
     
     try {
       await toggleLike(postId, user.uid, isLiked);
     } catch (error) {
       // エラー時はロールバック
       setIsLiked(isLiked);
       setLikesCount(previousLikesCount);
     }
   };
   ```

3. **likeServiceがFirestore batch操作を実行**
   ```typescript
   // services/likeService.ts
   export async function toggleLike(postId: string, userId: string, isLiked: boolean) {
     const batch = writeBatch(db);
     
     if (isLiked) {
       batch.delete(likeRef);
       batch.update(postRef, { likesCount: increment(-1) });
     } else {
       batch.set(likeRef, { userId, createdAt: serverTimestamp() });
       batch.update(postRef, { likesCount: increment(1) });
     }
     
     await batch.commit();
   }
   ```

### 認証フロー例

1. **ユーザーがログインボタンをクリック**
   ```typescript
   // app/login/page.tsx
   await signIn({ email, password });
   ```

2. **AuthContextが状態更新とサービス呼び出しを実行**
   ```typescript
   // contexts/AuthContext.tsx
   const signIn = async (data: SignInData) => {
     setLoading(true);
     await AuthService.signIn(data);
   };
   ```

3. **AuthServiceがFirebase認証を実行**
   ```typescript
   // services/authService.ts
   static async signIn(data: SignInData) {
     await signInWithEmailAndPassword(auth, data.email, data.password);
   }
   ```

4. **Firebase認証状態変更をAuthContextが検知**
   ```typescript
   // contexts/AuthContext.tsx
   onAuthStateChanged(auth, async (user) => {
     if (user) {
       const profile = await UserService.getUser(user.uid);
       setUserProfile(profile);
     }
   });
   ```

## 技術スタック

### フロントエンド
- **Framework**: Next.js 16.0.1 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS v4
- **Icons**: React Icons
- **Map**: Mapbox GL JS
- **Type Safety**: TypeScript (strict mode)

### バックエンド
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage (CORS設定済み)
- **Functions**: Firebase Cloud Functions (TypeScript)
- **Hosting**: Vercel (フロントエンド)

### 開発ツール
- **Package Manager**: npm
- **Linter**: ESLint
- **Version Control**: Git / GitHub

### セキュリティ
- **Firestore Rules**: 投稿・いいね・ユーザーデータの保護
- **Storage Rules**: 画像アップロードの制限（サイズ・形式）
- **CORS**: localhost:3000とVercelドメインを許可

## 設計の利点

### 1. 保守性
- 各レイヤーが独立しているため、変更の影響範囲が限定的
- 責任が明確なため、バグの特定が容易
- いいね機能のような独立した機能が分離され、保守しやすい

### 2. テスタビリティ
- サービス層が独立しているため、単体テストが作りやすい
- モックの作成が容易
- カスタムフックも独立してテスト可能

### 3. 拡張性
- 新機能追加時も既存コードへの影響が最小限
- 新しいサービスやコンテキストの追加が容易
- コンポーネントの再利用が容易

### 4. 型安全性
- TypeScriptの恩恵を最大限活用
- コンパイル時エラーでバグを早期発見
- 全レイヤーで型定義を共有

### 5. セキュリティ
- エラーメッセージの情報開示を最小限に抑制
- クライアントサイドバリデーションによる入力検証
- 適切な認証エラーハンドリング
- Firestore/Storage Rulesによるアクセス制御

### 6. パフォーマンス
- 楽観的UI更新によるレスポンス向上
- 適切なデータフェッチ戦略
- Cloud Functionsによるサーバーサイド処理の最適化

## 実装のベストプラクティス

### いいね機能の実装パターン

**UIコンポーネント（プレゼンテーション層）**
```typescript
// components/LikeButton/LikeButton.tsx
export default function LikeButton({ isLiked, likesCount, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}>
      <HeartIcon filled={isLiked} />
      <span>{likesCount} いいね</span>
    </button>
  );
}
```

**カスタムフック（ビジネスロジック層）**
```typescript
// hooks/useToggleLike.ts
export function useToggleLike({ postId, initialIsLiked, initialLikesCount }) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleLike = async () => {
    // 楽観的UI更新 + エラーハンドリング
    // likeServiceの呼び出し
  };

  return { isLiked, likesCount, isLoading, handleToggleLike };
}
```

**サービス（データアクセス層）**
```typescript
// services/likeService.ts
export async function toggleLike(postId: string, userId: string, isLiked: boolean) {
  // Firestore batch操作のみ
  // ビジネスロジックは含まない
}
```

**使用例**
```typescript
// 任意のコンポーネント
const { isLiked, likesCount, isLoading, handleToggleLike } = useToggleLike({
  postId: post.id,
  initialIsLiked: post.isLiked,
  initialLikesCount: post.likesCount,
});

<LikeButton
  isLiked={isLiked}
  likesCount={likesCount}
  onClick={handleToggleLike}
  disabled={isLoading}
/>
```

この設計により、**UIとロジックが完全に分離**され、**どこでも再利用可能**になります。

## コーディング規約

### 命名規則
- **ファイル名**: camelCase（例：`authService.ts`, `useToggleLike.ts`）
- **コンポーネントファイル**: PascalCase（例：`LikeButton.tsx`）
- **クラス名**: PascalCase（例：`AuthService`）
- **関数名**: camelCase（例：`signIn`, `handleToggleLike`）
- **型名**: PascalCase（例：`UserDocument`, `PostDocument`）
- **定数**: UPPER_SNAKE_CASE（例：`POSTS_COLLECTION`）

### ファイル構成
- **pages**: `app/[feature]/page.tsx`
- **components**: `components/[category]/ComponentName.tsx`
- **hooks**: `hooks/use[FeatureName].ts`
- **services**: `services/[feature]Service.ts`
- **types**: `types/[feature].ts`

### インポート順序
1. Reactライブラリ
2. サードパーティライブラリ
3. 内部モジュール（services, types, contexts, hooks）
4. コンポーネント
5. 相対パス
6. スタイル

### コメント
- 公開関数にはJSDocコメントを記述
- 複雑なビジネスロジックには説明コメントを追加
- TODOコメントは`// TODO:`形式で記述

### TypeScript
- `strict: true`を有効化
- 型推論を活用しつつ、必要な場所では明示的に型定義
- `any`の使用は最小限に
- インターフェースより型エイリアスを優先（柔軟性のため）

この設計により、スケーラブルで保守性の高いアプリケーションを構築できます。