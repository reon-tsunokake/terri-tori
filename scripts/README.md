# データ移行スクリプト

## グループシステム移行

### 前提条件

1. Firebase Admin SDK の秘密鍵が必要です
   - Firebase Console > プロジェクト設定 > サービスアカウント
   - 「新しい秘密鍵の生成」をクリック
   - ダウンロードしたJSONファイルを `serviceAccountKey.json` としてプロジェクトルートに配置

2. Node.js がインストールされていること

3. 必要なパッケージのインストール:
   ```bash
   npm install firebase-admin
   ```

### 実行方法

```bash
# プロジェクトルートから実行
node scripts/migrateToGroupSystem.js
```

### 処理内容

1. **ステップ1**: 全ユーザーに `groupId` (1, 2, 3) を均等に割り当て
2. **ステップ2**: 全投稿に `groupId` を追加（userIdから取得）
3. **ステップ3**: `seasons/{seasonId}/regionTop` を `seasons/{seasonId}/groups/{groupId}/regionTop` に移行
4. **ステップ4**（オプション）: 旧パスのデータを削除

### 注意事項

- **バックアップ**: 実行前に必ずFirestoreのバックアップを取得してください
- **実行時間**: データ量によっては数時間かかる可能性があります
- **ログ**: 処理の進捗とエラーがコンソールに出力されます
- **エラー処理**: エラーが発生しても処理は継続されます（エラー件数が表示されます）

### テスト環境での確認

本番環境で実行する前に、必ずテスト環境で動作確認してください。

```bash
# テスト環境用の秘密鍵を使用
# serviceAccountKey.json をテスト環境のものに差し替えて実行
node scripts/migrateToGroupSystem.js
```

### ロールバック

問題が発生した場合:
1. 新パス `seasons/{seasonId}/groups/...` のデータを削除
2. users と posts の `groupId` フィールドは残しても問題ありません（アプリは動作します）
