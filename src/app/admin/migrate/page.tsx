"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

export default function MigratePage() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState("");

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  // グループをランダムに割り当てる関数
  const assignRandomGroup = (): 1 | 2 | 3 => {
    return (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
  };

  // Step 1: 全ユーザーにgroupIdを割り当て
  const assignGroupIdsToUsers = async () => {
    addLog("=== Step 1: ユーザーにgroupIdを割り当て ===");
    setProgress("Step 1/4: ユーザー処理中...");

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    addLog(`処理対象: ${snapshot.size}件のユーザー`);

    let processed = 0;
    const batchSize = 500;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = snapshot.docs.slice(i, i + batchSize);

      for (const docSnapshot of chunk) {
        const userData = docSnapshot.data();

        if (!userData.groupId) {
          const groupId = assignRandomGroup();
          batch.update(doc(db, "users", docSnapshot.id), { groupId });
          processed++;
        }
      }

      await batch.commit();
      addLog(`${Math.min(i + batchSize, snapshot.size)}/${snapshot.size}件処理完了`);
    }

    addLog(`✓ Step 1完了: ${processed}件のユーザーにgroupIdを割り当てました`);
  };

  // Step 2: 全投稿にgroupIdを追加
  const addGroupIdToPosts = async () => {
    addLog("=== Step 2: 投稿にgroupIdを追加 ===");
    setProgress("Step 2/4: 投稿処理中...");

    const postsRef = collection(db, "posts");
    const postsSnapshot = await getDocs(postsRef);

    addLog(`処理対象: ${postsSnapshot.size}件の投稿`);

    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    const userGroupMap = new Map<string, number>();

    // ユーザーのgroupIdをマップに保存
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.groupId) {
        userGroupMap.set(doc.id, data.groupId);
      }
    });

    let processed = 0;
    let skipped = 0;
    const batchSize = 500;

    for (let i = 0; i < postsSnapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = postsSnapshot.docs.slice(i, i + batchSize);

      for (const docSnapshot of chunk) {
        const postData = docSnapshot.data();

        if (!postData.groupId && postData.userId) {
          const groupId = userGroupMap.get(postData.userId);

          if (groupId) {
            batch.update(doc(db, "posts", docSnapshot.id), { groupId });
            processed++;
          } else {
            skipped++;
          }
        }
      }

      await batch.commit();
      addLog(`${Math.min(i + batchSize, postsSnapshot.size)}/${postsSnapshot.size}件処理完了`);
    }

    addLog(`✓ Step 2完了: ${processed}件の投稿にgroupIdを追加（スキップ: ${skipped}件）`);
  };

  // Step 3: regionTopドキュメントを新しいパスに移行
  const migrateRegionTopDocuments = async () => {
    addLog("=== Step 3: regionTopドキュメントを移行 ===");
    setProgress("Step 3/4: ランキング移行中...");

    const seasonsRef = collection(db, "seasons");
    const seasonsSnapshot = await getDocs(seasonsRef);

    let totalMigrated = 0;

    for (const seasonDoc of seasonsSnapshot.docs) {
      const seasonId = seasonDoc.id;
      addLog(`シーズン ${seasonId} を処理中...`);

      const oldRegionTopRef = collection(db, `seasons/${seasonId}/regionTop`);
      const regionTopSnapshot = await getDocs(oldRegionTopRef);

      addLog(`  ${regionTopSnapshot.size}件のregionTopドキュメントを発見`);

      for (const regionDoc of regionTopSnapshot.docs) {
        const regionId = regionDoc.id;
        const regionData = regionDoc.data();

        // postsからgroupIdを取得
        if (regionData.posts && Array.isArray(regionData.posts)) {
          const groupPostMap: Record<1 | 2 | 3, any[]> = { 1: [], 2: [], 3: [] };

          for (const post of regionData.posts) {
            if (post.groupId && (post.groupId === 1 || post.groupId === 2 || post.groupId === 3)) {
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
                updatedAt: regionData.updatedAt || new Date(),
              });
              totalMigrated++;
            }
          }
        }
      }
    }

    addLog(`✓ Step 3完了: ${totalMigrated}件のregionTopドキュメントを移行しました`);
  };

  // Step 4: 古いregionTopドキュメントをクリーンアップ
  const cleanupOldRegionTop = async () => {
    addLog("=== Step 4: 古いregionTopドキュメントを削除 ===");
    setProgress("Step 4/4: クリーンアップ中...");

    const seasonsRef = collection(db, "seasons");
    const seasonsSnapshot = await getDocs(seasonsRef);

    let totalDeleted = 0;

    for (const seasonDoc of seasonsSnapshot.docs) {
      const seasonId = seasonDoc.id;
      const oldRegionTopRef = collection(db, `seasons/${seasonId}/regionTop`);
      const regionTopSnapshot = await getDocs(oldRegionTopRef);

      const batchSize = 500;

      for (let i = 0; i < regionTopSnapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = regionTopSnapshot.docs.slice(i, i + batchSize);

        for (const regionDoc of chunk) {
          batch.delete(doc(db, `seasons/${seasonId}/regionTop/${regionDoc.id}`));
          totalDeleted++;
        }

        await batch.commit();
        addLog(`${totalDeleted}件削除完了...`);
      }
    }

    addLog(`✓ Step 4完了: ${totalDeleted}件の古いドキュメントを削除しました`);
  };

  // 移行実行
  const handleMigrate = async () => {
    if (!user) {
      alert("ログインが必要です");
      return;
    }

    if (!confirm("データ移行を開始しますか？この処理は時間がかかる場合があります。")) {
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setProgress("開始中...");

    const startTime = Date.now();

    try {
      await assignGroupIdsToUsers();
      await addGroupIdToPosts();
      await migrateRegionTopDocuments();
      await cleanupOldRegionTop();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      setProgress("完了！");
      addLog("=== 移行完了 ===");
      addLog(`所要時間: ${duration}秒`);
      addLog("");
      addLog("次のステップ:");
      addLog("1. Firestore Rulesを元に戻す");
      addLog("2. Firestoreインデックスを作成");
      addLog("3. アプリケーションをデプロイ");

      alert("移行が完了しました！");
    } catch (error) {
      console.error("Migration error:", error);
      addLog(`❌ エラーが発生しました: ${error}`);
      setProgress("エラー発生");
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setIsRunning(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">ログインが必要です</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">グループシステム データ移行</h1>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <h2 className="font-bold text-yellow-800 mb-2">⚠️ 警告</h2>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• この操作は全データに影響します</li>
            <li>• 実行前にFirestore Rulesを緩和してください</li>
            <li>• 処理中はページを閉じないでください</li>
            <li>• バックアップを取得することを推奨します</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">移行ステップ</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>全ユーザーにgroupId（1, 2, 3）をランダム割り当て</li>
            <li>全投稿に作成者のgroupIdを追加</li>
            <li>regionTopドキュメントを新パス（groups配下）に移行</li>
            <li>古いregionTopドキュメントを削除</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleMigrate}
            disabled={isRunning}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white ${
              isRunning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isRunning ? "移行実行中..." : "移行を開始"}
          </button>

          {progress && (
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-blue-600">{progress}</p>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">実行ログ</h2>
            <div className="bg-black rounded p-4 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-green-400 text-sm font-mono mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
