import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  FirestoreEvent,
  QueryDocumentSnapshot
} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

/**
 * 新規ユーザー登録時のトリガー
 * 現在のシーズンで最も人数の少ないグループに割り当てる
 */
export const onUserCreated = onDocumentCreated("users/{userId}", async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No data associated with the event");
    return;
  }

  const userId = event.params.userId;
  const db = admin.firestore();

  try {
    // 1. 現在のシーズンを取得
    const seasonsRef = db.collection("seasons");
    const currentSeasonSnapshot = await seasonsRef
      .where("isCurrent", "==", true)
      .limit(1)
      .get();

    if (currentSeasonSnapshot.empty) {
      logger.warn("現在のシーズンが存在しないため、グループ割り当てをスキップします");
      return;
    }

    const currentSeasonDoc = currentSeasonSnapshot.docs[0];
    const currentSeasonId = currentSeasonDoc.id;

    // 2. 現在のシーズンのグループをメンバー数昇順で取得
    // Firestore の orderBy で memberCount をソート
    const groupsRef = currentSeasonDoc.ref.collection("groups");
    const groupsSnapshot = await groupsRef
      .orderBy("memberCount", "asc")
      .limit(1)
      .get();

    let assignedGroupId = 1; // デフォルト

    if (!groupsSnapshot.empty) {
      // 最小メンバー数のグループを取得
      const targetGroupDoc = groupsSnapshot.docs[0];
      assignedGroupId = targetGroupDoc.data().groupId;

      // グループのメンバー数をアトミックにインクリメント
      await targetGroupDoc.ref.update({
        memberCount: admin.firestore.FieldValue.increment(1)
      });
      logger.info(`グループメンバー数を更新しました: Group ${assignedGroupId}`);
    } else {
      // グループがまだない場合（シーズン初期状態など）、グループ1を作成して割り当て
      // ※通常はupdateSeasonで作成されているはずだが、念のため
      logger.info("グループが見つかりません。新規グループ1を作成します。");
      assignedGroupId = 1;
      await groupsRef.doc("1").set({
        groupId: 1,
        seasonId: currentSeasonId,
        memberCount: 1,
        createdAt: admin.firestore.Timestamp.now(),
      });
    }

    // 3. ユーザーにgroupIdを設定
    await snapshot.ref.update({
      groupId: assignedGroupId,
      assignedSeasonId: currentSeasonId
    });

    logger.info(`新規ユーザー ${userId} をグループ ${assignedGroupId} に割り当てました (Season: ${currentSeasonId})`);

  } catch (error) {
    logger.error(`ユーザー ${userId} のグループ割り当てに失敗しました`, error);
  }
});
