import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  PostDocument,
  RegionTopDocument,
  SeasonRankDocument,
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

      // 全体ランキング更新処理
      await updateGlobalRanking(db, currentSeasonId);

      logger.info("ランキング更新処理が完了しました");
    } catch (error) {
      logger.error("ランキング更新処理でエラーが発生しました", {error});
      throw error;
    }
  }
);

/**
 * 地域ごとのトップランカーを更新
 * 各regionIdでlikesCountが最も多い投稿を取得し、regionTopに保存
 */
async function updateTopRankers(
  db: admin.firestore.Firestore,
  seasonId: string
): Promise<void> {
  logger.info("トップランカー更新を開始します", {seasonId});

  // 全regionIdを取得（投稿から）
  const postsSnapshot = await db
    .collection("posts")
    .where("seasonId", "==", seasonId)
    .get();

  // regionIdを重複なく抽出
  const regionIds = new Set<string>();
  postsSnapshot.docs.forEach((doc) => {
    const data = doc.data() as PostDocument;
    if (data.regionId) {
      regionIds.add(data.regionId);
    }
  });

  logger.info(`対象地域数: ${regionIds.size}`);

  const regionTopRef = db
    .collection("seasons")
    .doc(seasonId)
    .collection("regionTop");

  // 各地域ごとにトップ投稿を更新
  for (const regionId of regionIds) {
    try {
      // 該当地域の投稿をlikesCount降順で取得（トップ1件）
      const topPostSnapshot = await db
        .collection("posts")
        .where("seasonId", "==", seasonId)
        .where("regionId", "==", regionId)
        .orderBy("likesCount", "desc")
        .limit(1)
        .get();

      if (topPostSnapshot.empty) {
        logger.warn(`地域 ${regionId} に投稿が見つかりません`);
        continue;
      }

      const topPostDoc = topPostSnapshot.docs[0];
      const topPostData = topPostDoc.data() as PostDocument;

      // regionTopドキュメントを作成
      const regionTopData: RegionTopDocument = {
        postId: topPostDoc.id,
        userId: topPostData.userId,
        regionId: topPostData.regionId,
        imageUrl: topPostData.imageUrl,
        likesCount: topPostData.likesCount,
        score: topPostData.score,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // regionTopに保存（上書き）
      await regionTopRef.doc(regionId).set(regionTopData);

      logger.info(`地域 ${regionId} のトップランカーを更新`, {
        postId: topPostDoc.id,
        likesCount: topPostData.likesCount,
      });
    } catch (error) {
      logger.error(`地域 ${regionId} のトップランカー更新でエラー`, {error});
    }
  }

  logger.info("トップランカー更新完了");
}

/**
 * 全体ランキングを更新
 * 各ユーザーの今シーズン最高いいね投稿を基にランク付け
 */
async function updateGlobalRanking(
  db: admin.firestore.Firestore,
  seasonId: string
): Promise<void> {
  logger.info("全体ランキング更新を開始します", {seasonId});

  try {
    // 今シーズンの全投稿をlikesCount降順で取得
    const postsSnapshot = await db
      .collection("posts")
      .where("seasonId", "==", seasonId)
      .orderBy("likesCount", "desc")
      .get();

    logger.info(`対象投稿数: ${postsSnapshot.size}`);

    // ユーザーごとに全投稿のいいね数を合計
    const userTotalLikes = new Map<string, number>();

    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data() as PostDocument;
      const userId = data.userId;
      const currentTotal = userTotalLikes.get(userId) || 0;

      // 合計いいね数を加算
      userTotalLikes.set(userId, currentTotal + data.likesCount);
    });

    logger.info(`ランク対象ユーザー数: ${userTotalLikes.size}`);

    // ソートして順位付与
    const rankedUsers = Array.from(userTotalLikes.entries())
      .map(([userId, allLikeCount]) => ({userId, allLikeCount}))
      .sort((a, b) => b.allLikeCount - a.allLikeCount);

    // バッチ更新
    let batch = db.batch();
    let batchCount = 0;
    let updatedCount = 0;

    rankedUsers.forEach((user, index) => {
      const rank = index + 1;
      const seasonRankRef = db
        .collection("users")
        .doc(user.userId)
        .collection("seasonRanks")
        .doc(seasonId);

      const rankData: SeasonRankDocument = {
        seasonId: seasonId,
        rank: rank,
        allLikeCount: user.allLikeCount,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      batch.set(seasonRankRef, rankData);
      batchCount++;
      updatedCount++;

      // バッチが500件に達したらコミット
      if (batchCount >= 500) {
        batch.commit().then(() => {
          logger.info(`バッチコミット完了: ${updatedCount}件更新済み`);
        });
        batch = db.batch();
        batchCount = 0;
      }
    });

    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit();
    }

    logger.info(`全体ランキング更新完了: ${updatedCount}件`);
  } catch (error) {
    logger.error("全体ランキング更新でエラーが発生しました", {error});
    throw error;
  }
}
