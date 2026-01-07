/**
 * クライアント側からのグループシステムデータ移行スクリプト
 * 
 * 実行前の準備:
 * 1. npm install firebase
 * 2. Firestore Rulesを一時的に緩和（移行後に戻す）
 * 3. Firebase認証でログイン
 * 
 * 実行方法:
 * node scripts/migrateToGroupSystemClient.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc, setDoc, deleteDoc, writeBatch, query, limit } = require('firebase/firestore');
const readline = require('readline');

// Firebase設定（.env.localから取得）
const firebaseConfig = {
  apiKey: "AIzaSyC4QMh4QjuMdLTsopu8TnwzBdkWqe0jaGU",
  authDomain: "terri-tori.firebaseapp.com",
  projectId: "terri-tori",
  storageBucket: "terri-tori.firebasestorage.app",
  messagingSenderId: "510593574023",
  appId: "1:510593574023:web:305306cda7e4d60531c422",
  measurementId: "G-GFG9F93F7P"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ユーザー入力を取得するヘルパー
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// グループをランダムに割り当てる関数
function assignRandomGroup() {
  return Math.floor(Math.random() * 3) + 1; // 1, 2, 3 のいずれか
}

// Step 1: 全ユーザーにgroupIdを割り当て
async function assignGroupIdsToUsers() {
  console.log('\n=== Step 1: ユーザーにgroupIdを割り当て ===');
  
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  console.log(`処理対象: ${snapshot.size}件のユーザー`);
  
  let processed = 0;
  const batch = writeBatch(db);
  let batchCount = 0;
  
  for (const docSnapshot of snapshot.docs) {
    const userData = docSnapshot.data();
    
    if (!userData.groupId) {
      const groupId = assignRandomGroup();
      batch.update(doc(db, 'users', docSnapshot.id), { groupId });
      batchCount++;
      
      // バッチは500件まで
      if (batchCount === 500) {
        await batch.commit();
        processed += batchCount;
        console.log(`${processed}件処理完了...`);
        batchCount = 0;
      }
    }
  }
  
  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
    processed += batchCount;
  }
  
  console.log(`✓ Step 1完了: ${processed}件のユーザーにgroupIdを割り当てました`);
}

// Step 2: 全投稿にgroupIdを追加
async function addGroupIdToPosts() {
  console.log('\n=== Step 2: 投稿にgroupIdを追加 ===');
  
  const postsRef = collection(db, 'posts');
  const snapshot = await getDocs(postsRef);
  
  console.log(`処理対象: ${snapshot.size}件の投稿`);
  
  let processed = 0;
  let skipped = 0;
  const batch = writeBatch(db);
  let batchCount = 0;
  
  for (const docSnapshot of snapshot.docs) {
    const postData = docSnapshot.data();
    
    if (!postData.groupId && postData.userId) {
      // ユーザードキュメントからgroupIdを取得
      const userDoc = await getDocs(query(collection(db, 'users'), limit(1)));
      const userSnapshot = userDoc.docs.find(d => d.id === postData.userId);
      
      if (userSnapshot) {
        const userData = userSnapshot.data();
        if (userData.groupId) {
          batch.update(doc(db, 'posts', docSnapshot.id), { groupId: userData.groupId });
          batchCount++;
          
          if (batchCount === 500) {
            await batch.commit();
            processed += batchCount;
            console.log(`${processed}件処理完了...`);
            batchCount = 0;
          }
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    processed += batchCount;
  }
  
  console.log(`✓ Step 2完了: ${processed}件の投稿にgroupIdを追加しました（スキップ: ${skipped}件）`);
}

// Step 3: regionTopドキュメントを新しいパスに移行
async function migrateRegionTopDocuments() {
  console.log('\n=== Step 3: regionTopドキュメントを移行 ===');
  
  const seasonsRef = collection(db, 'seasons');
  const seasonsSnapshot = await getDocs(seasonsRef);
  
  let totalMigrated = 0;
  
  for (const seasonDoc of seasonsSnapshot.docs) {
    const seasonId = seasonDoc.id;
    console.log(`\nシーズン ${seasonId} を処理中...`);
    
    const oldRegionTopRef = collection(db, `seasons/${seasonId}/regionTop`);
    const regionTopSnapshot = await getDocs(oldRegionTopRef);
    
    console.log(`  ${regionTopSnapshot.size}件のregionTopドキュメントを発見`);
    
    for (const regionDoc of regionTopSnapshot.docs) {
      const regionId = regionDoc.id;
      const regionData = regionDoc.data();
      
      // postsからgroupIdを取得
      if (regionData.posts && Array.isArray(regionData.posts)) {
        const groupPostMap = { 1: [], 2: [], 3: [] };
        
        for (const post of regionData.posts) {
          if (post.groupId) {
            groupPostMap[post.groupId].push(post);
          }
        }
        
        // 各グループ用の新しいドキュメントを作成
        for (const [groupId, posts] of Object.entries(groupPostMap)) {
          if (posts.length > 0) {
            const newDocRef = doc(db, `seasons/${seasonId}/groups/${groupId}/regionTop/${regionId}`);
            await setDoc(newDocRef, {
              regionId,
              groupId: Number(groupId),
              posts: posts.slice(0, 10), // 上位10件
              updatedAt: regionData.updatedAt || new Date()
            });
            totalMigrated++;
          }
        }
      }
    }
  }
  
  console.log(`✓ Step 3完了: ${totalMigrated}件のregionTopドキュメントを移行しました`);
}

// Step 4: 古いregionTopドキュメントをクリーンアップ
async function cleanupOldRegionTop() {
  console.log('\n=== Step 4: 古いregionTopドキュメントを削除 ===');
  
  const seasonsRef = collection(db, 'seasons');
  const seasonsSnapshot = await getDocs(seasonsRef);
  
  let totalDeleted = 0;
  
  for (const seasonDoc of seasonsSnapshot.docs) {
    const seasonId = seasonDoc.id;
    const oldRegionTopRef = collection(db, `seasons/${seasonId}/regionTop`);
    const regionTopSnapshot = await getDocs(oldRegionTopRef);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const regionDoc of regionTopSnapshot.docs) {
      batch.delete(doc(db, `seasons/${seasonId}/regionTop/${regionDoc.id}`));
      batchCount++;
      
      if (batchCount === 500) {
        await batch.commit();
        totalDeleted += batchCount;
        console.log(`${totalDeleted}件削除完了...`);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      totalDeleted += batchCount;
    }
  }
  
  console.log(`✓ Step 4完了: ${totalDeleted}件の古いドキュメントを削除しました`);
}

// メイン実行関数
async function main() {
  try {
    console.log('=== グループシステムへのデータ移行 (クライアント版) ===\n');
    
    // コマンドライン引数から認証情報を取得
    let email, password;
    
    if (process.argv[2] && process.argv[3]) {
      email = process.argv[2];
      password = process.argv[3];
      console.log(`認証情報: ${email}`);
    } else {
      // 対話式入力
      email = await question('Firebase認証のメールアドレス: ');
      password = await question('パスワード: ');
    }
    
    console.log('\nログイン中...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✓ ログイン成功');
    
    // 確認
    const confirm = await question('\n移行を開始しますか？ (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('移行をキャンセルしました');
      rl.close();
      process.exit(0);
    }
    
    const startTime = Date.now();
    
    // 各ステップを実行
    await assignGroupIdsToUsers();
    await addGroupIdToPosts();
    await migrateRegionTopDocuments();
    await cleanupOldRegionTop();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n=== 移行完了 ===');
    console.log(`所要時間: ${duration}秒`);
    console.log('\n次のステップ:');
    console.log('1. Firestore Rulesを元に戻す');
    console.log('2. Firestoreインデックスを作成');
    console.log('3. アプリケーションをデプロイ');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 実行
main();
