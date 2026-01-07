"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function CheckMigrationPage() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, message]);
  };

  const checkMigration = async () => {
    setChecking(true);
    setResults([]);

    try {
      addResult("=== データ移行状況チェック ===\n");

      // シーズン一覧を取得
      const seasonsRef = collection(db, "seasons");
      const seasonsSnapshot = await getDocs(seasonsRef);

      addResult(`シーズン数: ${seasonsSnapshot.size}件\n`);

      for (const seasonDoc of seasonsSnapshot.docs) {
        const seasonId = seasonDoc.id;
        addResult(`\n【シーズン: ${seasonId}】`);

        // 古いパスのregionTopをチェック
        const oldRegionTopRef = collection(db, `seasons/${seasonId}/regionTop`);
        const oldSnapshot = await getDocs(oldRegionTopRef);
        addResult(`  古いパス (regionTop): ${oldSnapshot.size}件`);

        if (oldSnapshot.size > 0) {
          addResult(`  ⚠️ 古いデータが残っています`);
          oldSnapshot.docs.slice(0, 3).forEach((doc) => {
            addResult(`     - ${doc.id}`);
          });
        }

        // 新しいパスのregionTopをチェック (グループ1, 2, 3)
        let totalNewDocs = 0;
        for (const groupId of [1, 2, 3]) {
          const newRegionTopRef = collection(
            db,
            `seasons/${seasonId}/groups/${groupId}/regionTop`
          );
          const newSnapshot = await getDocs(newRegionTopRef);
          totalNewDocs += newSnapshot.size;

          addResult(`  新しいパス (groups/${groupId}/regionTop): ${newSnapshot.size}件`);

          if (newSnapshot.size > 0) {
            // サンプルデータを表示
            const sampleDoc = newSnapshot.docs[0];
            const sampleData = sampleDoc.data();
            addResult(`     サンプル: regionId=${sampleDoc.id}, posts=${sampleData.posts?.length || 0}件`);
          }
        }

        addResult(`  合計: ${totalNewDocs}件の新しいregionTopドキュメント`);
      }

      // ユーザーのgroupId状況をチェック
      addResult("\n=== ユーザーのgroupId状況 ===");
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      const groupCounts = { 1: 0, 2: 0, 3: 0, none: 0 };
      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.groupId === 1 || data.groupId === 2 || data.groupId === 3) {
          groupCounts[data.groupId]++;
        } else {
          groupCounts.none++;
        }
      });

      addResult(`  グループ1: ${groupCounts[1]}人`);
      addResult(`  グループ2: ${groupCounts[2]}人`);
      addResult(`  グループ3: ${groupCounts[3]}人`);
      addResult(`  未割り当て: ${groupCounts.none}人`);

      // 投稿のgroupId状況をチェック
      addResult("\n=== 投稿のgroupId状況 ===");
      const postsRef = collection(db, "posts");
      const postsSnapshot = await getDocs(postsRef);

      const postGroupCounts = { 1: 0, 2: 0, 3: 0, none: 0 };
      postsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.groupId === 1 || data.groupId === 2 || data.groupId === 3) {
          postGroupCounts[data.groupId]++;
        } else {
          postGroupCounts.none++;
        }
      });

      addResult(`  グループ1: ${postGroupCounts[1]}件`);
      addResult(`  グループ2: ${postGroupCounts[2]}件`);
      addResult(`  グループ3: ${postGroupCounts[3]}件`);
      addResult(`  未割り当て: ${postGroupCounts.none}件`);

      addResult("\n=== チェック完了 ===");
    } catch (error) {
      console.error("Check error:", error);
      addResult(`\n❌ エラー: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">データ移行状況チェック</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={checkMigration}
            disabled={checking}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white ${
              checking
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {checking ? "チェック中..." : "移行状況をチェック"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">結果</h2>
            <div className="bg-black rounded p-4 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="text-green-400 text-sm font-mono mb-1 whitespace-pre-wrap">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
