import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  PostDocument,
  RegionTopDocument,
  // SeasonRankDocument, // 一時的に未使用
} from "../types/ranking";

/**
 * 2時間ごとに実行されるスケジュール関数
 * 地域ごとのトップランカーを更新する
 */
export const updateDailyRanking = onSchedule(
  {
    schedule: "0 */2 * * *",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
  },
  async (event) => {
    logger.info("ランキング更新処理を開始します", {
      scheduleTime: event.scheduleTime,
    });

    const db = admin.firestore();

    try {
      // 現在のシーズンを取得
      const currentSeasonSnapshot = await db
        .collection("seasons")
        .where("isCurrent", "==", true)
        .limit(1)
        .get();

      if (currentSeasonSnapshot.empty) {
        logger.warn("現在のシーズンが見つかりません");
        return;
      }

      const currentSeasonId = currentSeasonSnapshot.docs[0].id;
      logger.info(`現在のシーズン: ${currentSeasonId}`);

      // トップランカー更新処理
      await updateTopRankers(db, currentSeasonId);

      // 全体ランキング更新処理（一時的に無効化）
      // await updateGlobalRanking(db, currentSeasonId);

      logger.info("ランキング更新処理が完了しました");
    } catch (error) {
      logger.error("ランキング更新処理でエラーが発生しました", { error });
      throw error;
    }
  }
);

/**
 * 地域ごとのトップランカーを更新
 * グループごとに各regionIdでlikesCountが最も多い投稿を取得し、regionTopに保存
 */
export async function updateTopRankers(
  db: admin.firestore.Firestore,
  seasonId: string
): Promise<void> {
  logger.info("トップランカー更新を開始します", { seasonId });

  // シーズンドキュメントからアクティブなグループIDを取得
  const seasonDoc = await db.collection("seasons").doc(seasonId).get();
  if (!seasonDoc.exists) {
    logger.warn(`シーズン ${seasonId} が見つかりません`);
    return;
  }

  const seasonData = seasonDoc.data();
  const groups = seasonData?.groups || [];

  if (groups.length === 0) {
    logger.warn(`シーズン ${seasonId} にアクティブなグループがありません`);
    return;
  }

  logger.info(`${groups.length}個のグループを処理します: [${groups.join(', ')}]`);

  // 各グループごとに並列処理
  await Promise.all(groups.map((groupId: number) =>
    updateTopRankersForGroup(db, seasonId, groupId)
  ));

  logger.info("トップランカー更新完了");
}

/**
 * 指定グループの地域ごとのトップランカーを更新
 */
async function updateTopRankersForGroup(
  db: admin.firestore.Firestore,
  seasonId: string,
  groupId: number
): Promise<void> {
  logger.info(`グループ ${groupId} のトップランカー更新を開始`, { seasonId, groupId });

  // 該当グループの投稿のみ取得
  const postsSnapshot = await db
    .collection("posts")
    .where("seasonId", "==", seasonId)
    .where("groupId", "==", groupId)
    .get();

  // regionIdを重複なく抽出
  const regionIds = new Set<string>();
  postsSnapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    const data = doc.data() as PostDocument;
    if (data.regionId) {
      regionIds.add(data.regionId);
    }
  });

  logger.info(`グループ ${groupId} の対象地域数: ${regionIds.size}`);

  // 新パス: seasons/{seasonId}/groups/{groupId}/regionTop
  const groupRef = db
    .collection("seasons")
    .doc(seasonId)
    .collection("groups")
    .doc(String(groupId));

  const regionTopRef = groupRef.collection("regionTop");

  // 獲得者リスト (regionId -> userId)
  const winners: { regionId: string; userId: string }[] = [];

  // 各地域ごとにトップ投稿を更新
  for (const regionId of regionIds) {
    try {
      // 該当地域・グループの投稿をlikesCount降順で取得（トップ1件）
      const topPostSnapshot = await db
        .collection("posts")
        .where("seasonId", "==", seasonId)
        .where("groupId", "==", groupId)
        .where("regionId", "==", regionId)
        .orderBy("likesCount", "desc")
        .limit(1)
        .get();

      if (topPostSnapshot.empty) {
        logger.warn(`グループ ${groupId} - 地域 ${regionId} に投稿が見つかりません`);
        continue;
      }

      const topPostDoc = topPostSnapshot.docs[0];
      const topPostData = topPostDoc.data() as PostDocument;

      // regionTopドキュメントを作成
      const regionTopData: RegionTopDocument = {
        postId: topPostDoc.id,
        userId: topPostData.userId,
        groupId: groupId, // groupId を追加
        regionId: topPostData.regionId,
        imageUrl: topPostData.imageUrl,
        likesCount: topPostData.likesCount,
        score: topPostData.score,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // regionTopに保存（上書き）
      await regionTopRef.doc(regionId).set(regionTopData);

      // 勝者を記録
      winners.push({
        regionId: regionId,
        userId: topPostData.userId,
      });

      logger.info(`グループ ${groupId} - 地域 ${regionId} のトップランカーを更新`, {
        postId: topPostDoc.id,
        likesCount: topPostData.likesCount,
      });
    } catch (error) {
      logger.error(`グループ ${groupId} - 地域 ${regionId} のトップランカー更新でエラー`, { error });
    }
  }

  // --- 面積比率の集計 ---
  try {
    if (winners.length > 0) {
      // 1. 地域の面積データを取得
      const regionIdsList = winners.map(w => w.regionId);
      // NOTE: regionIdsListが非常に多い場合は分割が必要だが、グループごとの制圧数は限られると想定
      const uniqueRegionIds = Array.from(new Set(regionIdsList));
      console.log(`Fetching areas for ${uniqueRegionIds.length} regions`);

      // FirestoreのgetAllは引数制限や挙動が環境（バージョン）に依存する場合があるため、
      // 確実性の高い Promise.all + get() に変更してデバッグ
      const regionRefs = uniqueRegionIds.map(rid => db.collection("regions").doc(rid));
      const regionDocs = await Promise.all(regionRefs.map(ref => ref.get()));

      const regionAreaMap = new Map<string, number>();
      regionDocs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          // areaフィールドが存在すると仮定
          regionAreaMap.set(doc.id, Number(data?.area) || 0);
        }
      });

      // 2. ユーザデータを取得 (displayName, photoUrl)
      const userIdsList = Array.from(new Set(winners.map(w => w.userId)));
      const userRefs = userIdsList.map(uid => db.collection("users").doc(uid));
      const userDocs = await Promise.all(userRefs.map(ref => ref.get()));

      const userInfoMap = new Map<string, { displayName: string; photoUrl?: string }>();
      userDocs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data();
          userInfoMap.set(doc.id, {
            displayName: data?.displayName || "Unknown User",
            photoUrl: data?.photoUrl,
          });
        }
      });

      // 3. 集計
      const userAreaMap = new Map<string, number>();
      let totalGroupArea = 0;

      for (const winner of winners) {
        const area = regionAreaMap.get(winner.regionId) || 0;
        if (area > 0) {
          const userTotal = userAreaMap.get(winner.userId) || 0;
          userAreaMap.set(winner.userId, userTotal + area);
          totalGroupArea += area;
        }
      }

      // 4. 比率計算と整形
      const areaDistribution = [];
      if (totalGroupArea > 0) {
        for (const [userId, area] of userAreaMap.entries()) {
          const ratio = (area / totalGroupArea) * 100;
          const userInfo = userInfoMap.get(userId);

          areaDistribution.push({
            userId,
            displayName: userInfo?.displayName || "Unknown User",
            photoUrl: userInfo?.photoUrl || null,
            totalArea: area,
            ratio: Number(ratio.toFixed(1)), // 小数点第1位まで
          });
        }

        // 面積順にソート (降順)
        areaDistribution.sort((a, b) => b.totalArea - a.totalArea);
      }

      // 5. 保存
      await groupRef.set({
        stats: {
          areaDistribution,
          totalGroupArea,
          updatedAt: admin.firestore.Timestamp.now(),
        }
      }, { merge: true });

      logger.info(`グループ ${groupId} の面積統計を更新完了`, { totalGroupArea });
    } else {
      // 誰も獲得していない場合 (リセット or 初期状態)
      await groupRef.set({
        stats: {
          areaDistribution: [],
          totalGroupArea: 0,
          updatedAt: admin.firestore.Timestamp.now(),
        }
      }, { merge: true });
    }
  } catch (error: any) {
    logger.error(`グループ ${groupId} の面積統計更新でエラー`, {
      message: error.message,
      stack: error.stack,
      raw: error
    });
  }

  logger.info(`グループ ${groupId} のトップランカー更新完了`);
}

// /**
//  * 全体ランキングを更新（一時的に無効化）
//  * 各ユーザーの今シーズン最高いいね投稿を基にランク付け
//  */
// async function updateGlobalRanking(
//   db: admin.firestore.Firestore,
//   seasonId: string
// ): Promise<void> {
//   logger.info("全体ランキング更新を開始します", {seasonId});

//   try {
//     // 今シーズンの全投稿をlikesCount降順で取得
//     const postsSnapshot = await db
//       .collection("posts")
//       .where("seasonId", "==", seasonId)
//       .orderBy("likesCount", "desc")
//       .get();

//     logger.info(`対象投稿数: ${postsSnapshot.size}`);

//     // ユーザーごとに全投稿のいいね数を合計
//     const userTotalLikes = new Map<string, number>();

//     postsSnapshot.docs.forEach((doc) => {
//       const data = doc.data() as PostDocument;
//       const userId = data.userId;
//       const currentTotal = userTotalLikes.get(userId) || 0;

//       // 合計いいね数を加算
//       userTotalLikes.set(userId, currentTotal + data.likesCount);
//     });

//     logger.info(`ランク対象ユーザー数: ${userTotalLikes.size}`);

//     // ソートして順位付与
//     const rankedUsers = Array.from(userTotalLikes.entries())
//       .map(([userId, allLikeCount]) => ({userId, allLikeCount}))
//       .sort((a, b) => b.allLikeCount - a.allLikeCount);

//     // バッチ更新
//     let batch = db.batch();
//     let batchCount = 0;
//     let updatedCount = 0;

//     rankedUsers.forEach((user, index) => {
//       const rank = index + 1;
//       const seasonRankRef = db
//         .collection("users")
//         .doc(user.userId)
//         .collection("seasonRanks")
//         .doc(seasonId);

//       const rankData: SeasonRankDocument = {
//         seasonId: seasonId,
//         rank: rank,
//         allLikeCount: user.allLikeCount,
//         updatedAt: admin.firestore.Timestamp.now(),
//       };

//       batch.set(seasonRankRef, rankData);
//       batchCount++;
//       updatedCount++;

//       // バッチが500件に達したらコミット
//       if (batchCount >= 500) {
//         batch.commit().then(() => {
//           logger.info(`バッチコミット完了: ${updatedCount}件更新済み`);
//         });
//         batch = db.batch();
//         batchCount = 0;
//       }
//     });

//     // 残りのバッチをコミット
//     if (batchCount > 0) {
//       await batch.commit();
//     }

//     logger.info(`全体ランキング更新完了: ${updatedCount}件`);
//   } catch (error) {
//     logger.error("全体ランキング更新でエラーが発生しました", {error});
//     throw error;
//   }
// }
