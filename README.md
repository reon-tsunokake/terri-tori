# 📸 Terri-Tori
リアル写真 × 陣地取りゲーム  
現実の位置情報と写真で、地図を奪い合うSNS型アプリ。

---

## 🧱 技術スタック
| 項目 | 技術 |
|------|------|
| フロントエンド | Next.js 15 (App Router) |
| スタイリング | Tailwind CSS |
| バックエンド | Firebase (Auth, Firestore, Storage) |
| デプロイ | Vercel |
| 地図API | Mapbox|

---

## ⚙️ セットアップ手順（チーム用）
### 0. Node.jsの環境構築
[Node.jsのセットアップ手順](https://qiita.com/qulylean/items/0ad521885a04a5ebd202)

### 1. リポジトリのクローン
```bash
git clone https://github.com/reon-tsunokake/terri-tori.git
cd terri-tori
```

### 2. 依存関係のインストール
```bash
#ライブラリを一括ダウンロード
npm install

#firebase CLIをインストール
npm install -g firebase-tools
firebase login
firebase use --add
```

### 3. プロジェクトルートに.env.localファイルを作成
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

---

## 開発手順
### 1. リモートから最新バージョンをローカルに落とす
```bash
git checkout main       #mainブランチに戻る
git branch              #現在のブランチがmainであることを確認
git fetch origin        #リモートの変更を取得
git pull origin main    #ローカルに落とし、mainブランチを最新にする
```

### 2. 開発ブランチを作成
```bash
git checkout -b feature/new-feature     #新しいブランチを切る
git branch                              #現在のブランチがnew-featureであることを確認
```

### 3. 開発&テスト
```bash
npm run dev     #localhost:3000にアクセス(開発段階ではこれを使う)
npm run build   #コンパイルエラー等をチェック(githubにあげる前にやると良い)
npm run start   #基本使わない
```

### 4. リモートにプッシュ
```bash
git add .
git commit -m "msg"
git push origin feature/new-branch
```

### 5. Pull Request (PR)作成
- Github上でPRを作成し、レビュー依頼を出す

### 6. レビュー・マージ
- Github上で承認後、mainブランチにマージ
- Vercelが自動デプロイ

---

## 機能

### ログイン・新規登録機能
- [] ログイン・新規登録フォームUI
- [] ユーザデータ構造設計
- [] 実装
- [] 認証テスト

### 地図表示機能
- [] Mapbox画面、ズーム・移動UI
- [] 座標データ設計
- [] Mapbox導入 + 初期地図描画
- [] 初期地図・位置表示テスト

### 写真投稿・表示機能
- [] 投稿フォーム・表示UI
- [] 投稿データ設計
- [] 実装
- [] 投稿・表示テスト

### 陣地処理機能
- [] 地図上の写真切替
- [] 地図表示テスト

### ランキング処理機能
- [] ランキングUI
- [] ランキングロジック設計
- [] ランキングテスト


---

## フォルダー構造
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

