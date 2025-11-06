# Project Architecture Documentation

## フォルダー構造

このプロジェクトは関心の分離（Separation of Concerns）を重視した設計になっています。各層が明確な責任を持ち、保守性と拡張性を向上させています。

```
src/
├── app/                    # Next.js App Router - UIレイヤー
│   ├── globals.css        # グローバルスタイル（TailwindCSS v4）
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   ├── login/
│   │   └── page.tsx       # ログインページ
│   ├── signup/
│   │   └── page.tsx       # サインアップページ
│   └── profile/
│       └── page.tsx       # プロフィール編集ページ
├── components/            # 再利用可能なUIコンポーネント
│   └── layout/
│       └── BottomNavigation.tsx  # ボトムナビゲーション
├── contexts/              # React Context - 状態管理レイヤー
│   └── AuthContext.tsx    # 認証状態の管理（ビジネスロジックは含まない）
├── lib/                   # ライブラリ設定
│   └── firebase.ts        # Firebase設定とインスタンス
├── services/              # ビジネスロジックレイヤー
│   ├── authService.ts     # Firebase認証操作
│   └── userService.ts     # Firestoreユーザー操作
├── types/                 # 型定義レイヤー
│   ├── auth.ts            # 認証関連の型定義
│   └── firestore.ts       # Firestoreドキュメント構造の型定義
└── utils/                 # ユーティリティレイヤー
    └── validation.ts      # フォームバリデーション機能
```

## アーキテクチャの原則

### 1. 関心の分離 (Separation of Concerns)

各レイヤーは独立した責任を持ちます：

- **UIレイヤー (`app/`)**：ユーザーインターフェースの表示とユーザーインタラクション
- **状態管理レイヤー (`contexts/`)**：アプリケーション状態の管理のみ
- **ビジネスロジックレイヤー (`services/`)**：Firebase操作とビジネスルール
- **型定義レイヤー (`types/`)**：TypeScriptの型安全性を提供
- **ユーティリティレイヤー (`utils/`)**：共通機能とヘルパー関数

### 2. 依存関係の方向

```
UI → Components → Context → Services → Lib → Firebase
UI → Types
UI → Utils
Components → Types
Services → Types
Utils → Types
```

上位レイヤーは下位レイヤーに依存しますが、逆は依存しません。

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

#### layout/BottomNavigation.tsx
- 固定ボトムナビゲーション
- ホーム/カメラ/プロフィール間の移動
- アクティブ状態の表示

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
- コンポーネント間のデータ共有

**設計原則**：
- ビジネスロジックは含まない
- サービス層を呼び出すのみ
- 状態の更新と提供に特化

#### AuthContext.tsx
```typescript
// ❌ 旧設計（ビジネスロジックを含む）
const signUp = async (email, password) => {
  const user = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', user.uid), userData);
}

// ✅ 新設計（状態管理のみ）
const signUp = async (data: SignUpData) => {
  await AuthService.signUp(data);
}
```

### ビジネスロジックレイヤー (`src/services/`)

**責任**：
- Firebaseとの通信
- ビジネスルールの実装
- データの検証と変換

**設計原則**：
- 静的クラスメソッドを使用
- 単一責任の原則
- エラーハンドリングを含む

#### AuthService.ts
Firebase Authenticationの操作を担当：
- サインイン・サインアップ
- Googleログイン
- ログアウト
- パスワードリセット

#### UserService.ts
Firestoreのユーザードキュメント操作を担当：
- ユーザードキュメントの作成・取得・更新
- プロフィール管理
- フォロー・投稿数の管理

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
- `AreaDocument`：エリアドキュメント

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

## データフロー

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

- **Frontend**: Next.js 16.0.1 (App Router)
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore  
- **Styling**: TailwindCSS v4
- **Icons**: React Icons
- **Type Safety**: TypeScript (strict mode)
- **Deployment**: Vercel

## 設計の利点

### 1. 保守性
- 各レイヤーが独立しているため、変更の影響範囲が限定的
- 責任が明確なため、バグの特定が容易

### 2. テスタビリティ
- サービス層が独立しているため、単体テストが作りやすい
- モックの作成が容易

### 3. 拡張性
- 新機能追加時も既存コードへの影響が最小限
- 新しいサービスやコンテキストの追加が容易

### 4. 型安全性
- TypeScriptの恩恵を最大限活用
- コンパイル時エラーでバグを早期発見

### 5. セキュリティ
- エラーメッセージの情報開示を最小限に抑制
- クライアントサイドバリデーションによる入力検証
- 適切な認証エラーハンドリング

## コーディング規約

### 命名規則
- **ファイル名**: camelCase（例：`authService.ts`）
- **クラス名**: PascalCase（例：`AuthService`）
- **関数名**: camelCase（例：`signIn`）
- **型名**: PascalCase（例：`UserDocument`）

### インポート順序
1. Reactライブラリ
2. サードパーティライブラリ
3. 内部モジュール（services, types, contexts）
4. 相対パス

### コメント
- 公開メソッドにはJSDocコメントを記述
- 複雑なビジネスロジックには説明コメントを追加

この設計により、スケーラブルで保守性の高いアプリケーションを構築できます。