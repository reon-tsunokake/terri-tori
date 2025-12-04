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

      let currentSeasonId: string | null = null;
      if (!currentSeasonSnapshot.empty) {
        const currentSeasonDoc = currentSeasonSnapshot.docs[0];
        currentSeasonId = currentSeasonDoc.id;
        await currentSeasonDoc.ref.update({ isCurrent: false });
        logger.info(`現在のシーズンを終了しました: ${currentSeasonId}`);
      } else {
        logger.warn("現在のシーズンが見つかりませんでした");
      }

      // --- ここから経験値付与処理 ---
      if (currentSeasonId) {
        // 1. 投稿コレクションから、currentSeasonIdの投稿を全取得
        const postsRef = db.collection("posts");
        const postsSnapshot = await postsRef.where("seasonId", "==", currentSeasonId).get();
        // 投稿データ型を明示
        type PostData = {
          id: string;
          regionId: string;
          userId: string;
          likesCount: number;
        };
        const posts: PostData[] = postsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            regionId: data.regionId ?? "",
            userId: data.userId ?? "",
            likesCount: typeof data.likesCount === "number" ? data.likesCount : 0,
          };
        });

        // 2. エリア(regionId)ごとにランキングを集計
        // ランキング経験値テーブル例（順位: 経験値）
        const rankExpTable = [100, 80, 60, 40, 20]; // 1位〜5位

        // 3. ユーザごとにエリアごとの投稿順位・いいね数を集計
        // { userId: { exp: number } }
        const userExpMap: { [userId: string]: number } = {};

        // エリアごとに分ける
        const areaPostMap: { [regionId: string]: any[] } = {};
        posts.forEach(post => {
          if (!areaPostMap[post.regionId]) areaPostMap[post.regionId] = [];
          areaPostMap[post.regionId].push(post);
        });

        // 各エリアごとにランキング集計
        Object.entries(areaPostMap).forEach(([regionId, areaPosts]) => {
          // いいね数降順で並び替え（例：ランキング基準）
          areaPosts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
          areaPosts.forEach((post, idx) => {
            const userId = post.userId;
            const rankExp = rankExpTable[idx] || 0; // 6位以降は0
            const likeExp = post.likesCount || 0;
            const totalExp = rankExp + likeExp;
            if (!userExpMap[userId]) userExpMap[userId] = 0;
            userExpMap[userId] += totalExp;
          });
        });

        // 4. Firestoreユーザドキュメントに経験値加算
        const userRef = db.collection("users");
        for (const [userId, exp] of Object.entries(userExpMap)) {
          // トランザクションで加算
          await db.runTransaction(async (t) => {
            const userDocRef = userRef.doc(userId);
            const userDoc = await t.get(userDocRef);
            const prevExp = userDoc.exists ? (userDoc.data()?.experience || 0) : 0;
            t.set(userDocRef, { experience: prevExp + exp }, { merge: true });
          });
          logger.info(`ユーザ ${userId} に ${exp} exp を付与しました`);
        }
      }
      // --- ここまで経験値付与処理 ---

      // 新しいシーズンを作成
      // JST (Asia/Tokyo) の現在日時を取得
      const jstNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
      );
      const currentYear = jstNow.getFullYear();
      const currentMonth = jstNow.getMonth() + 1; // 0-11 → 1-12

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
      // 終了日は次の月の1日の1ミリ秒前 (当月の最終瞬間)
      const endDate = admin.firestore.Timestamp.fromDate(
        new Date(nextYear, nextMonth - 1, 1, 0, 0, 0, -1)
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
