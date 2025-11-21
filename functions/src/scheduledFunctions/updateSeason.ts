import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  SeasonDocument,
  generateSeasonId,
  getNextSeasonYearMonth,
} from "../types/season";

/**
 * 毎月1日午前0時(JST)に実行されるスケジュール関数
 * 現在のシーズンを終了し、新しいシーズンを作成する
 */
export const updateSeasonScheduled = onSchedule(
  {
    schedule: "0 0 1 * *",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
  },
  async (event) => {
    logger.info("シーズン更新処理を開始します", { scheduleTime: event.scheduleTime });

    const db = admin.firestore();
    const seasonsRef = db.collection("seasons");

    try {
      // 現在のシーズンを取得 (isCurrent: true)
      const currentSeasonSnapshot = await seasonsRef
        .where("isCurrent", "==", true)
        .limit(1)
        .get();

      // 現在のシーズンが存在する場合、isCurrentをfalseに更新
      if (!currentSeasonSnapshot.empty) {
        const currentSeasonDoc = currentSeasonSnapshot.docs[0];
        const currentSeasonId = currentSeasonDoc.id;

        await currentSeasonDoc.ref.update({
          isCurrent: false,
        });

        logger.info(`現在のシーズンを終了しました: ${currentSeasonId}`);
      } else {
        logger.warn("現在のシーズンが見つかりませんでした");
      }

      // 新しいシーズンを作成
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 0-11 → 1-12

      // 新シーズンのIDと日付を計算
      const newSeasonId = generateSeasonId(currentYear, currentMonth);

      // 次のシーズンの年月を計算 (終了日用)
      const { year: nextYear, month: nextMonth } = getNextSeasonYearMonth(
        currentYear,
        currentMonth
      );

      // シーズンの開始日と終了日を設定
      const startDate = admin.firestore.Timestamp.fromDate(
        new Date(currentYear, currentMonth - 1, 1, 0, 0, 0)
      );
      const endDate = admin.firestore.Timestamp.fromDate(
        new Date(nextYear, nextMonth - 1, 1, 0, 0, 0)
      );

      // 新しいシーズンドキュメントを作成
      const newSeasonData: SeasonDocument = {
        seasonId: newSeasonId,
        isCurrent: true,
        startDate: startDate,
        endDate: endDate,
        createdAt: admin.firestore.Timestamp.now(),
      };

      await seasonsRef.doc(newSeasonId).set(newSeasonData);

      logger.info(`新しいシーズンを作成しました: ${newSeasonId}`, {
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
      });
    } catch (error) {
      logger.error("シーズン更新処理でエラーが発生しました", { error });
      throw error;
    }
  });
