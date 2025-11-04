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
[text](https://qiita.com/qulylean/items/0ad521885a04a5ebd202)

### 1. リポジトリのクローン
```bash
git clone https://github.com/g0325125-debug/terri-tori.git
cd terri-tori
```

### 2. 依存関係のインストール
```bash
npm install
```

## 開発手順
### 1. githubから最新バージョンをローカルに落とす
```bash
git pull origin main
```

### 2. 開発ブランチを作成
```bash
git checkout -b feature/new-branch
```

### 3. 開発&テスト
```bash
npm run dev
#localhost:3000にアクセス
```

### 4. githubにあげる
```bash
git add .
git commit -m "msg"
git push origin feature/new-branch
```

### 5. PR作成 & Merge
github上でGUI操作