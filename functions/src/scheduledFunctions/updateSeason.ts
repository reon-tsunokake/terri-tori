import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  SeasonDocument,
  generateSeasonId,
  getNextSeasonYearMonth,
} from "../types/season";
import { updateTopRankers } from "./updateDailyRanking";

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

        // シーズン終了直前に最終ランキング・面積比率を更新
        logger.info(`シーズン終了直前のランキング更新を実行: ${currentSeasonDoc.id}`);
        await updateTopRankers(db, currentSeasonDoc.id);

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
          groupId: number;
          likesCount: number;
        };
        const posts: PostData[] = postsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            regionId: data.regionId ?? "",
            userId: data.userId ?? "",
            groupId: data.groupId ?? 1,
            likesCount: typeof data.likesCount === "number" ? data.likesCount : 0,
          };
        });

        // 2. エリア(regionId)ごとにランキングを集計（グループ別）
        // ランキング経験値テーブル例（順位: 経験値）
        const rankExpTable = [100, 80, 60, 40, 20]; // 1位〜5位

        // 3. ユーザごとにエリアごとの投稿順位・いいね数を集計（グループ別）
        // { userId: { exp: number } }
        const userExpMap: { [userId: string]: number } = {};

        // グループごとにエリアを分ける
        const groupAreaPostMap: {
          [groupId: number]: { [regionId: string]: PostData[] }
        } = { 1: {}, 2: {}, 3: {} };

        posts.forEach(post => {
          const groupId = post.groupId;
          if (!groupAreaPostMap[groupId]) groupAreaPostMap[groupId] = {};
          if (!groupAreaPostMap[groupId][post.regionId]) {
            groupAreaPostMap[groupId][post.regionId] = [];
          }
          groupAreaPostMap[groupId][post.regionId].push(post);
        });

        // 各グループ・各エリアごとにランキング集計
        for (const [groupIdStr, areaPostMap] of Object.entries(groupAreaPostMap)) {
          const groupId = Number(groupIdStr);
          logger.info(`グループ ${groupId} の経験値計算を開始`);

          Object.entries(areaPostMap).forEach(([regionId, areaPosts]) => {
            // いいね数降順で並び替え（例：ランキング基準）
            areaPosts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
            areaPosts.forEach((post, idx) => {
              const userId = post.userId;
              const rankExp = rankExpTable[idx] || 0; // 6位以降は0
              const likeExp = (post.likesCount || 0) * 50;
              const totalExp = rankExp + likeExp;
              if (!userExpMap[userId]) userExpMap[userId] = 0;
              userExpMap[userId] += totalExp;
            });
          });

          logger.info(`グループ ${groupId} の経験値計算完了`);
        }

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
        groups: [], // グループ割り振り後に更新される
        startDate: startDate,
        endDate: endDate,
        createdAt: admin.firestore.Timestamp.now(),
      };

      await seasonsRef.doc(newSeasonId).set(newSeasonData);

      logger.info(`新しいシーズンを作成しました: ${newSeasonId}`, {
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
      });

      // --- ここからグルーピング処理 ---
      // 1. 全ユーザーを取得
      const usersSnapshot = await db.collection("users").get();
      const allUsers = usersSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ref: doc.ref,
      }));
      const totalUsers = allUsers.length;

      // アクティブなグループIDリスト
      let activeGroupIds: number[] = [];

      if (totalUsers > 0) {
        // 2. グループ数を計算 (ceil(総数 / 10))
        let numGroups = Math.ceil(totalUsers / 10);
        if (numGroups < 1) numGroups = 1;

        // アクティブなグループIDリストを生成 [1, 2, 3, ..., numGroups]
        activeGroupIds = Array.from({ length: numGroups }, (_, i) => i + 1);

        // 3. ユーザーをランダムにシャッフル (Fisher-Yates 簡易版)
        for (let i = totalUsers - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allUsers[i], allUsers[j]] = [allUsers[j], allUsers[i]];
        }

        // 4. グループ割り当てとBatch更新
        // FirestoreのBatchは最大500件までなので、分割して処理
        const BATCH_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < totalUsers; i += BATCH_SIZE) {
          chunks.push(allUsers.slice(i, i + BATCH_SIZE));
        }

        // グループごとの人数カウント（初期化）
        const groupMemberCounts = new Array(numGroups).fill(0);

        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach((user: { id: string; ref: admin.firestore.DocumentReference }) => {
            // 全てのグループに対して順番に1人ずつ割り当てる
            // allUsersは既にシャッフルされているので、単純にインデックス順でOK
            // ただし、chunk処理内ではなく全体インデックスを知る必要があるので、
            // userオブジェクトに割り当て済みgroupIdを持たせるか、
            // ここで再計算する。allUsersのインデックスを使えば良い。
            const globalIndex = allUsers.indexOf(user);
            const groupId = (globalIndex % numGroups) + 1; // 1, 2, 3...

            batch.update(user.ref, {
              groupId: groupId,
              assignedSeasonId: newSeasonId // どのシーズンのグループか追跡用（任意）
            });

            // カウントアップ (indexは groupId-1)
            groupMemberCounts[groupId - 1]++;
          });
          await batch.commit();
          logger.info(`Batch更新完了: ${chunk.length}ユーザーのグループを割り当てました`);
        }

        // 5. 新シーズンのグループドキュメントを作成
        // seasons/{seasonId}/groups/{groupId}
        const groupsBatch = db.batch();
        const groupsRef = seasonsRef.doc(newSeasonId).collection("groups");

        for (let i = 0; i < numGroups; i++) {
          const groupId = i + 1;
          const memberCount = groupMemberCounts[i];
          const groupDocRef = groupsRef.doc(String(groupId));

          groupsBatch.set(groupDocRef, {
            groupId: groupId,
            seasonId: newSeasonId,
            memberCount: memberCount,
            createdAt: admin.firestore.Timestamp.now(),
          });
        }
        await groupsBatch.commit();
        logger.info(`${numGroups}個のグループドキュメントを作成しました`);

        // 6. シーズンドキュメントのgroupsフィールドを更新
        await seasonsRef.doc(newSeasonId).update({
          groups: activeGroupIds
        });
        logger.info(`シーズンドキュメントのgroupsフィールドを更新しました: [${activeGroupIds.join(', ')}]`);

      } else {
        logger.info("ユーザーが存在しないため、グルーピングをスキップしました");
        // ユーザーがいない場合でも空の配列を設定
        await seasonsRef.doc(newSeasonId).update({
          groups: []
        });
      }
      // --- ここまでグルーピング処理 ---
    } catch (error) {
      logger.error("シーズン更新処理でエラーが発生しました", { error });
      throw error;
    }
  });
