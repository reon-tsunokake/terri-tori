import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {PostDocument, RegionTopDocument} from "../types/ranking";
import {calculateScore} from "../utils/scoreCalculator";

/**
 * 毎日午前2時(JST)に実行されるスケジュール関数
 * 現シーズンの投稿スコアを更新し、地域ごとのトップランカーを更新する
 */
export const updateDailyRanking = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
  },
  async (event) => {
    logger.info("日次ランキング更新処理を開始します", {
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

      // <A> スコア更新処理
      await updatePostScores(db, currentSeasonId);

      // <B> トップランカー更新処理
      await updateTopRankers(db, currentSeasonId);

      logger.info("日次ランキング更新処理が完了しました");
    } catch (error) {
      logger.error("日次ランキング更新処理でエラーが発生しました", {error});
      throw error;
    }
  }
);

/**
 * <A> 現シーズンの全投稿のスコアを更新
 * likesCountをカウントし、scoreを更新する
 */
async function updatePostScores(
  db: admin.firestore.Firestore,
  seasonId: string
): Promise<void> {
  logger.info("投稿スコア更新を開始します", {seasonId});

  // 現シーズンの全投稿を取得
  const postsSnapshot = await db
    .collection("posts")
    .where("seasonId", "==", seasonId)
    .get();

  logger.info(`更新対象の投稿数: ${postsSnapshot.size}`);

  // バッチ処理用（Firestoreのバッチは最大500件）
  let batch = db.batch();
  let batchCount = 0;
  let updatedCount = 0;

  for (const postDoc of postsSnapshot.docs) {
    try {
      // likesサブコレクションをカウント
      const likesSnapshot = await postDoc.ref
        .collection("likes")
        .count()
        .get();
      const likesCount = likesSnapshot.data().count;

      // スコアを計算
      const score = calculateScore(likesCount);

      // バッチ更新
      batch.update(postDoc.ref, {
        likesCount: likesCount,
        score: score,
      });

      batchCount++;
      updatedCount++;

      // バッチが500件に達したらコミット
      if (batchCount >= 500) {
        await batch.commit();
        logger.info(`バッチコミット完了: ${updatedCount}件更新済み`);
        batch = db.batch();
        batchCount = 0;
      }
    } catch (error) {
      logger.error(`投稿 ${postDoc.id} のスコア更新でエラー`, {error});
    }
  }

  // 残りのバッチをコミット
  if (batchCount > 0) {
    await batch.commit();
  }

  logger.info(`投稿スコア更新完了: 合計 ${updatedCount}件`);
}

/**
 * <B> 地域ごとのトップランカーを更新
 * 各regionIdでスコアが最も高い投稿を取得し、regionTopに保存
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
      // 該当地域の投稿をスコア降順で取得（トップ1件）
      const topPostSnapshot = await db
        .collection("posts")
        .where("seasonId", "==", seasonId)
        .where("regionId", "==", regionId)
        .orderBy("score", "desc")
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
        score: topPostData.score,
      });
    } catch (error) {
      logger.error(`地域 ${regionId} のトップランカー更新でエラー`, {error});
    }
  }

  logger.info("トップランカー更新完了");
}
