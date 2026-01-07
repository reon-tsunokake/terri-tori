/**
 * データ移行スクリプト: グループシステム対応
 * 
 * 実行順序:
 * 1. users コレクションに groupId を割り当て
 * 2. posts コレクションに groupId を追加
 * 3. seasons/{seasonId}/regionTop を新パス seasons/{seasonId}/groups/{groupId}/regionTop に移行
 * 
 * 実行方法:
 * node scripts/migrateToGroupSystem.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Firebase Admin SDK の秘密鍵

// Firebase Admin SDK の初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const BATCH_SIZE = 500; // Firestoreのバッチ上限

/**
 * ステップ1: 全ユーザーに groupId (1, 2, 3) をランダムに割り当て
 */
async function assignGroupIds() {
  console.log('\n========================================');
  console.log('ステップ1: ユーザーに groupId を割り当て');
  console.log('========================================\n');

  const usersSnapshot = await db.collection('users').get();
  const groups = [1, 2, 3];
  
  console.log(`対象ユーザー数: ${usersSnapshot.size}`);
  
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    // ランダムに groupId を割り当て（均等分散）
    const groupId = groups[count % 3];
    batch.update(userDoc.ref, { groupId });
    
    count++;
    batchCount++;
    
    // バッチサイズに達したらコミット
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  ${count} / ${usersSnapshot.size} ユーザー処理完了`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ${count} / ${usersSnapshot.size} ユーザー処理完了`);
  }
  
  // グループごとの人数を表示
  const groupCounts = { 1: 0, 2: 0, 3: 0 };
  const updatedSnapshot = await db.collection('users').get();
  updatedSnapshot.docs.forEach(doc => {
    const groupId = doc.data().groupId;
    if (groupId) groupCounts[groupId]++;
  });
  
  console.log('\n✓ ユーザーの groupId 割り当て完了');
  console.log(`  グループ1: ${groupCounts[1]} 人`);
  console.log(`  グループ2: ${groupCounts[2]} 人`);
  console.log(`  グループ3: ${groupCounts[3]} 人`);
}

/**
 * ステップ2: 全投稿に groupId を追加（userIdから取得）
 */
async function addGroupIdToPosts() {
  console.log('\n========================================');
  console.log('ステップ2: 投稿に groupId を追加');
  console.log('========================================\n');

  const postsSnapshot = await db.collection('posts').get();
  console.log(`対象投稿数: ${postsSnapshot.size}`);
  
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;
  let errorCount = 0;
  
  for (const postDoc of postsSnapshot.docs) {
    try {
      const userId = postDoc.data().userId;
      
      if (!userId) {
        console.warn(`  ⚠ 投稿 ${postDoc.id} に userId がありません`);
        errorCount++;
        continue;
      }
      
      // ユーザーから groupId を取得
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.warn(`  ⚠ ユーザー ${userId} が見つかりません（投稿ID: ${postDoc.id}）`);
        errorCount++;
        continue;
      }
      
      const groupId = userDoc.data()?.groupId;
      
      if (!groupId) {
        console.warn(`  ⚠ ユーザー ${userId} に groupId がありません（投稿ID: ${postDoc.id}）`);
        errorCount++;
        continue;
      }
      
      batch.update(postDoc.ref, { groupId });
      count++;
      batchCount++;
      
      // バッチサイズに達したらコミット
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ${count} / ${postsSnapshot.size} 投稿処理完了`);
        batch = db.batch();
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ✗ 投稿 ${postDoc.id} の処理中にエラー:`, error.message);
      errorCount++;
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ${count} / ${postsSnapshot.size} 投稿処理完了`);
  }
  
  console.log('\n✓ 投稿の groupId 追加完了');
  console.log(`  成功: ${count} 件`);
  if (errorCount > 0) {
    console.log(`  エラー: ${errorCount} 件`);
  }
}

/**
 * ステップ3: regionTop を新パスに移行
 * 旧: seasons/{seasonId}/regionTop/{regionId}
 * 新: seasons/{seasonId}/groups/{groupId}/regionTop/{regionId}
 */
async function migrateRegionTop() {
  console.log('\n========================================');
  console.log('ステップ3: regionTop を新パスに移行');
  console.log('========================================\n');

  const seasonsSnapshot = await db.collection('seasons').get();
  console.log(`対象シーズン数: ${seasonsSnapshot.size}`);
  
  let totalMigrated = 0;
  let totalErrors = 0;
  
  for (const seasonDoc of seasonsSnapshot.docs) {
    const seasonId = seasonDoc.id;
    console.log(`\n  シーズン ${seasonId} を処理中...`);
    
    const regionTopSnapshot = await seasonDoc.ref
      .collection('regionTop')
      .get();
    
    if (regionTopSnapshot.empty) {
      console.log(`    (regionTop データなし)`);
      continue;
    }
    
    console.log(`    地域数: ${regionTopSnapshot.size}`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const regionDoc of regionTopSnapshot.docs) {
      try {
        const data = regionDoc.data();
        const postId = data.postId;
        
        if (!postId) {
          console.warn(`    ⚠ regionTop ${regionDoc.id} に postId がありません`);
          errors++;
          continue;
        }
        
        // 投稿から groupId を取得
        const postDoc = await db.collection('posts').doc(postId).get();
        
        if (!postDoc.exists) {
          console.warn(`    ⚠ 投稿 ${postId} が見つかりません（地域: ${regionDoc.id}）`);
          errors++;
          continue;
        }
        
        const groupId = postDoc.data()?.groupId;
        
        if (!groupId) {
          console.warn(`    ⚠ 投稿 ${postId} に groupId がありません（地域: ${regionDoc.id}）`);
          errors++;
          continue;
        }
        
        // 新パスに書き込み
        const newPath = seasonDoc.ref
          .collection('groups')
          .doc(String(groupId))
          .collection('regionTop')
          .doc(regionDoc.id);
        
        await newPath.set({
          ...data,
          groupId, // groupId を追加
        });
        
        migrated++;
      } catch (error) {
        console.error(`    ✗ 地域 ${regionDoc.id} の処理中にエラー:`, error.message);
        errors++;
      }
    }
    
    totalMigrated += migrated;
    totalErrors += errors;
    
    console.log(`    ✓ ${migrated} 地域を移行`);
    if (errors > 0) {
      console.log(`    ✗ ${errors} 件のエラー`);
    }
  }
  
  console.log('\n✓ regionTop の移行完了');
  console.log(`  成功: ${totalMigrated} 件`);
  if (totalErrors > 0) {
    console.log(`  エラー: ${totalErrors} 件`);
  }
}

/**
 * ステップ4（オプション）: 旧パスのデータを削除
 */
async function cleanupOldRegionTop() {
  console.log('\n========================================');
  console.log('ステップ4（オプション）: 旧パスのデータを削除');
  console.log('========================================\n');

  const answer = 'no'; // 手動で 'yes' に変更する必要がある
  
  if (answer !== 'yes') {
    console.log('スキップされました（削除する場合はコード内で answer を "yes" に変更してください）');
    return;
  }
  
  const seasonsSnapshot = await db.collection('seasons').get();
  let totalDeleted = 0;
  
  for (const seasonDoc of seasonsSnapshot.docs) {
    const seasonId = seasonDoc.id;
    const regionTopSnapshot = await seasonDoc.ref
      .collection('regionTop')
      .get();
    
    if (regionTopSnapshot.empty) continue;
    
    console.log(`  シーズン ${seasonId}: ${regionTopSnapshot.size} ドキュメントを削除中...`);
    
    let batch = db.batch();
    let count = 0;
    
    for (const doc of regionTopSnapshot.docs) {
      batch.delete(doc.ref);
      count++;
      totalDeleted++;
      
      if (count >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
  }
  
  console.log(`✓ ${totalDeleted} ドキュメントを削除しました`);
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('\n========================================');
  console.log('グループシステム移行スクリプト');
  console.log('========================================');
  console.log('開始時刻:', new Date().toISOString());
  
  const startTime = Date.now();
  
  try {
    // ステップ1: ユーザーに groupId 割り当て
    await assignGroupIds();
    
    // ステップ2: 投稿に groupId 追加
    await addGroupIdToPosts();
    
    // ステップ3: regionTop を新パスに移行
    await migrateRegionTop();
    
    // ステップ4: 旧パスのデータ削除（オプション）
    // await cleanupOldRegionTop();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n========================================');
    console.log('✅ 全移行処理が完了しました');
    console.log('========================================');
    console.log('終了時刻:', new Date().toISOString());
    console.log(`処理時間: ${duration} 分`);
    
  } catch (error) {
    console.error('\n❌ 移行処理中にエラーが発生しました:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('致命的なエラー:', error);
    process.exit(1);
  });
}

module.exports = {
  assignGroupIds,
  addGroupIdToPosts,
  migrateRegionTop,
  cleanupOldRegionTop
};
