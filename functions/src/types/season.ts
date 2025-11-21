import * as admin from "firebase-admin";

/**
 * Firestoreのシーズンドキュメント構造
 */
export interface SeasonDocument {
  seasonId: string; // YYYY-MM形式 (例: "2025-11")
  isCurrent: boolean; // 現在のシーズンかどうか
  startDate: admin.firestore.Timestamp; // シーズン開始日
  endDate: admin.firestore.Timestamp; // シーズン終了日
  createdAt: admin.firestore.Timestamp; // ドキュメント作成日時
}

/**
 * シーズンID生成
 * @param year 年
 * @param month 月 (1-12)
 * @returns YYYY-MM形式のシーズンID
 */
export function generateSeasonId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * 次のシーズンの年月を計算
 * @param currentYear 現在の年
 * @param currentMonth 現在の月 (1-12)
 * @returns 次のシーズンの年月
 */
export function getNextSeasonYearMonth(
  currentYear: number,
  currentMonth: number
): { year: number; month: number } {
  if (currentMonth === 12) {
    return { year: currentYear + 1, month: 1 };
  }
  return { year: currentYear, month: currentMonth + 1 };
}
