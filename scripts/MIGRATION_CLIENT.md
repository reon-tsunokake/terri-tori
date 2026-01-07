# クライアント側からのデータ移行手順

serviceAccountKey.jsonを使わずに、クライアントSDKから移行を実行します。

## 事前準備

### 1. 依存関係のインストール

```powershell
npm install firebase
```

### 2. Firestore Rulesの一時的な緩和

移行中のみ、Firestore Rulesを以下のように変更してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 一時的に全てのアクセスを許可（移行時のみ）
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

デプロイ：
```powershell
firebase deploy --only firestore:rules
```

⚠️ **重要**: 移行完了後、必ず元のルールに戻してください！

## 移行の実行

### 1. スクリプトの実行

```powershell
node scripts/migrateToGroupSystemClient.js
```

### 2. 認証情報の入力

プロンプトに従って以下を入力：
- Firebase認証のメールアドレス
- パスワード

### 3. 移行の確認

`yes` を入力して移行を開始します。

## 移行処理の内容

1. **ユーザーにgroupIdを割り当て**
   - 全ユーザーにランダムでグループ1, 2, 3を割り当て

2. **投稿にgroupIdを追加**
   - 各投稿に作成者のgroupIdを追加

3. **regionTopドキュメントの移行**
   - `seasons/{seasonId}/regionTop/{regionId}` から
   - `seasons/{seasonId}/groups/{groupId}/regionTop/{regionId}` へ移行

4. **古いドキュメントの削除**
   - 旧パスのregionTopドキュメントを削除

## 移行後の作業

### 1. Firestore Rulesを元に戻す

```powershell
firebase deploy --only firestore:rules
```

### 2. Firestoreインデックスの作成

Firebase Consoleで以下のインデックスを作成：

**postsコレクション:**
- groupId (ASC) → seasonId (ASC) → likesCount (DESC)
- groupId (ASC) → regionId (ASC) → seasonId (ASC) → likesCount (DESC)

**usersコレクション:**
- groupId (ASC) → experience (DESC)

または：
```powershell
firebase deploy --only firestore:indexes
```

### 3. アプリケーションのデプロイ

```powershell
# Cloud Functions
cd functions
npm run build
firebase deploy --only functions

# Next.jsアプリ
cd ..
npm run build
# Vercel等にデプロイ
```

## トラブルシューティング

### 権限エラーが発生する場合

- Firestore Rulesが正しく緩和されているか確認
- ログインしたユーザーが認証済みか確認

### タイムアウトが発生する場合

- データ量が多い場合、スクリプトを複数回実行
- 各ステップは既に処理済みのデータをスキップします

### 既存データの確認

移行前にバックアップを推奨：
```powershell
firebase firestore:export gs://terri-tori.appspot.com/backups/$(Get-Date -Format "yyyyMMdd")
```
