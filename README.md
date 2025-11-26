# 📸 Terri-Tori

リアル写真 × 陣地取りゲーム  
現実の位置情報と写真で、地図を奪い合うSNS型アプリ。

---

## 🎯 プロジェクト概要

**Terri-Tori**は、位置情報ベースの写真投稿SNSアプリケーションです。ユーザーは現在地で撮影した写真を投稿し、その地域の「テリトリー」を獲得します。いいね数に応じたランキングシステムにより、人気の投稿やエリアが可視化されます。

### 主な機能
- 📍 位置情報ベースの写真投稿
- 🗺️ Mapbox統合の地図表示
- ❤️ いいね機能（楽観的UI更新）
- 🏆 リアルタイムランキングシステム
- 🔐 Firebase認証（Email/Google）
- 📱 モバイルファーストデザイン

---

## 🧱 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フロントエンド** | Next.js 16.0.1 (App Router), React 19 |
| **スタイリング** | TailwindCSS v4 |
| **地図** | Mapbox GL JS |
| **バックエンド** | Firebase (Authentication, Firestore, Storage, Functions) |
| **言語** | TypeScript (strict mode) |
| **デプロイ** | Vercel |
| **開発ツール** | ESLint, Git |

---

## 🏗️ アーキテクチャ

このプロジェクトは**関心の分離（Separation of Concerns）**を重視した設計です。

```
UI層 (app/) 
  ↓
コンポーネント層 (components/)
  ↓
フック層 (hooks/) ← ビジネスロジック
  ↓
サービス層 (services/) ← Firestore操作
  ↓
Firebase
```

詳細は[ARCHITECTURE.md](./ARCHITECTURE.md)を参照してください。

---

## ⚙️ セットアップ手順

### 前提条件
- Node.js 18以上
- npm または yarn
- Firebaseプロジェクトへのアクセス権限

### 1. リポジトリのクローン
```bash
git clone https://github.com/reon-tsunokake/terri-tori.git
cd terri-tori
```

### 2. 依存関係のインストール
```bash
# パッケージのインストール
npm install

# Firebase CLIのインストール（グローバル）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトを選択
firebase use terri-tori
```

### 3. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成：

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=terri-tori.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=terri-tori
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=terri-tori.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 4. Firebase Storageの設定（初回のみ）

CORS設定を適用：

```bash
# Google Cloud SDKをインストール
# https://cloud.google.com/sdk/docs/install

# 認証
gcloud auth login
gcloud config set project terri-tori

# CORS設定を適用
gcloud storage buckets update gs://terri-tori.firebasestorage.app --cors-file=cors.json
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

---

## 🔄 開発ワークフロー

### 1. 最新のmainブランチを取得
```bash
git checkout main
git pull origin main
```

### 2. 機能ブランチを作成
```bash
# ブランチ命名規則
# feature/機能名    - 新機能
# fix/バグ名        - バグ修正
# docs/ドキュメント名 - ドキュメント更新

git checkout -b feature/your-feature-name
```

### 3. 開発とテスト
```bash
# 開発サーバー起動
npm run dev

# ビルドテスト（PRを出す前に必ず実行）
npm run build

# 型チェック
npx tsc --noEmit

# リント
npm run lint
```

### 4. コミットとプッシュ
```bash
git add .
git commit -m "feat: 機能の説明"
# または
git commit -m "fix: バグの修正内容"

git push origin feature/your-feature-name
```

### 5. Pull Request作成
- GitHubでPRを作成
- レビュー依頼を出す
- CIチェックが通ることを確認

### 6. マージとデプロイ
- レビュー承認後、mainブランチにマージ
- Vercelが自動デプロイ
- デプロイ完了を確認

---

## 🚀 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# リント実行
npm run lint

# Firebase Functions デプロイ
cd functions
npm run build
firebase deploy --only functions

# Firestore Rules デプロイ
firebase deploy --only firestore:rules

# Storage Rules デプロイ
firebase deploy --only storage
```

---

## ✨ 実装済み機能

### 認証機能
- ✅ メールアドレス/パスワード認証
- ✅ Googleアカウント認証
- ✅ ログイン・サインアップUI
- ✅ プロフィール管理

### 投稿機能
- ✅ 位置情報付き写真投稿
- ✅ Firebase Storageへの画像アップロード
- ✅ 投稿詳細表示
- ✅ 投稿一覧表示

### いいね機能
- ✅ いいねボタンコンポーネント（再利用可能）
- ✅ 楽観的UI更新
- ✅ エラーハンドリングとロールバック
- ✅ Firestoreサブコレクション管理

### ランキング機能
- ✅ いいね数ベースのランキング
- ✅ 地域フィルタリング
- ✅ シーズンフィルタリング
- ✅ リアルタイム更新

### 地図機能
- ✅ Mapbox統合
- ✅ 現在位置表示
- ✅ 市区町村データ表示
- ✅ インタラクティブマップ

### UI/UX
- ✅ モバイルファーストデザイン
- ✅ ボトムナビゲーション
- ✅ レスポンシブレイアウト
- ✅ ローディング状態表示

---

## 📁 プロジェクト構造

```
src/
├── app/                         # ページ（Next.js App Router）
│   ├── page.tsx                # ホーム（マップビュー）
│   ├── login/                  # ログイン
│   ├── signup/                 # サインアップ
│   ├── post/                   # 投稿作成・詳細
│   ├── ranking/                # ランキング
│   ├── search/                 # 検索
│   └── profile/                # プロフィール
├── components/                  # UIコンポーネント
│   ├── LikeButton/             # いいねボタン
│   ├── layout/                 # レイアウトコンポーネント
│   ├── map/                    # 地図コンポーネント
│   └── post/                   # 投稿コンポーネント
├── hooks/                       # カスタムフック
│   └── useToggleLike.ts        # いいね機能ロジック
├── services/                    # ビジネスロジック
│   ├── authService.ts          # 認証
│   ├── userService.ts          # ユーザー
│   ├── postService.ts          # 投稿
│   └── likeService.ts          # いいね
├── contexts/                    # React Context
├── types/                       # 型定義
└── utils/                       # ユーティリティ

functions/                       # Firebase Cloud Functions
├── src/
│   ├── scheduledFunctions/     # スケジュール実行
│   │   ├── updateDailyRanking.ts
│   │   └── updateSeason.ts
│   └── utils/
```

詳細な構造とアーキテクチャは[ARCHITECTURE.md](./ARCHITECTURE.md)を参照してください。

---

## 🔐 セキュリティ

### Firestore Rules
- 認証済みユーザーのみアクセス可能
- 投稿の作成・編集は本人のみ
- いいね機能は`likesCount`と`score`のみ更新可能

### Storage Rules
- 画像サイズ制限（10MB）
- 画像ファイル形式の検証
- アップロードは認証済みユーザーのみ

### CORS設定
- `localhost:3000`（開発環境）
- `terri-tori-azure.vercel.app`（本番環境）

---

## 🐛 トラブルシューティング

### CORSエラーが発生する場合

```bash
# Google Cloud SDKで再設定
gcloud storage buckets update gs://terri-tori.firebasestorage.app --cors-file=cors.json

# ブラウザのキャッシュをクリア
Ctrl + Shift + Delete
```

### ビルドエラーが発生する場合

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# Next.jsのキャッシュをクリア
rm -rf .next
npm run build
```

### Firebase接続エラーの場合

```bash
# .env.localファイルを確認
# 環境変数が正しく設定されているか確認

# Firebaseプロジェクトを確認
firebase projects:list
firebase use terri-tori
```

---

## 📚 関連ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 詳細なアーキテクチャ設計
- [Firebase Console](https://console.firebase.google.com/project/terri-tori)
- [Vercel Dashboard](https://vercel.com/)
- [Mapbox Documentation](https://docs.mapbox.com/)

---

## 👥 コントリビューター

- [@reon-tsunokake](https://github.com/reon-tsunokake)

---

## 📄 ライセンス

このプロジェクトは私的利用のため、ライセンスは設定していません。

