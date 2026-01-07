"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";

export default function RebuildRegionTopPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState("");

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const rebuildRegionTop = async () => {
    if (!confirm("postsデータからregionTopを再構築しますか？")) {
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setProgress("開始中...");

    const startTime = Date.now();

    try {
      addLog("=== regionTopデータ再構築 ===");

      // 現在のシーズンを取得
      const seasonsRef = collection(db, "seasons");
      const seasonsSnapshot = await getDocs(seasonsRef);

      if (seasonsSnapshot.empty) {
        addLog("⚠️ シーズンデータがありません");
        return;
      }

      // 全投稿を取得
      addLog("\n投稿データを読み込み中...");
      const postsRef = collection(db, "posts");
      const postsSnapshot = await getDocs(postsRef);

      addLog(`取得した投稿数: ${postsSnapshot.size}件`);

      // シーズンごとに処理
      for (const seasonDoc of seasonsSnapshot.docs) {
        const seasonId = seasonDoc.id;
        const seasonData = seasonDoc.data();

        addLog(`\n【シーズン: ${seasonId}】を処理中...`);

        // このシーズンの投稿を取得
        const seasonPosts = postsSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((post: any) => post.seasonId === seasonId);

        addLog(`  このシーズンの投稿: ${seasonPosts.length}件`);

        // グループごとに処理
        for (const groupId of [1, 2, 3]) {
          addLog(`\n  グループ${groupId}を処理中...`);

          // 既存のregionTopドキュメントを全削除
          const existingRegionTopRef = collection(
            db,
            `seasons/${seasonId}/groups/${groupId}/regionTop`
          );
          const existingSnapshot = await getDocs(existingRegionTopRef);
          
          if (existingSnapshot.size > 0) {
            addLog(`    既存データ削除中: ${existingSnapshot.size}件`);
            for (const oldDoc of existingSnapshot.docs) {
              await deleteDoc(oldDoc.ref);
            }
            addLog(`    ✓ 既存データを削除しました`);
          }

          // このグループの投稿のみフィルタ
          const groupPosts = seasonPosts.filter((post: any) => post.groupId === groupId);
          addLog(`    グループ${groupId}の投稿: ${groupPosts.length}件`);

          // regionIdごとにグループ化
          const postsByRegion: Record<string, any[]> = {};

          groupPosts.forEach((post: any) => {
            if (post.regionId) {
              if (!postsByRegion[post.regionId]) {
                postsByRegion[post.regionId] = [];
              }
              postsByRegion[post.regionId].push(post);
            }
          });

          addLog(`    地域数: ${Object.keys(postsByRegion).length}件`);

          // 各地域のトップ1を保存
          let savedDocs = 0;
          for (const [regionId, posts] of Object.entries(postsByRegion)) {
            // likesCountでソートしてトップ1を取得
            const topPost = posts
              .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))[0];

            if (topPost) {
              // 1位の投稿をregionIdのドキュメントとして保存
              const regionTopRef = doc(
                db,
                `seasons/${seasonId}/groups/${groupId}/regionTop/${regionId}`
              );

              await setDoc(regionTopRef, {
                regionId,
                groupId,
                postId: topPost.id,
                userId: topPost.userId,
                imageUrl: topPost.imageUrl,
                caption: topPost.caption,
                likesCount: topPost.likesCount || 0,
                score: topPost.score || 0,
                location: topPost.location,
                createdAt: topPost.createdAt,
                seasonId: topPost.seasonId,
                updatedAt: new Date(),
              });

              savedDocs++;
            }
          }

          addLog(`    ✓ ${savedDocs}件の地域トップを保存しました`);
        }
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      setProgress("完了！");
      addLog("\n=== 再構築完了 ===");
      addLog(`所要時間: ${duration}秒`);

      alert("regionTopデータの再構築が完了しました！");
    } catch (error) {
      console.error("Rebuild error:", error);
      addLog(`❌ エラーが発生しました: ${error}`);
      setProgress("エラー発生");
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">regionTopデータ再構築</h1>

        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6">
          <h2 className="font-bold text-blue-800 mb-2">📋 実行内容</h2>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• 全投稿データから各地域のトップ1を抽出</li>
            <li>• グループごとに分けて保存</li>
            <li>• 新しいパス（seasons/&#123;seasonId&#125;/groups/&#123;groupId&#125;/regionTop/&#123;regionId&#125;）に保存</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={rebuildRegionTop}
            disabled={isRunning}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white ${
              isRunning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isRunning ? "再構築中..." : "regionTopを再構築"}
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
