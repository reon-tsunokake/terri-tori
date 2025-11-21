/**
 * スコア計算ユーティリティ
 * 将来的には様々な要因（いいね数、コメント数、シェア数、投稿の新鮮度など）を
 * 組み合わせてスコアを計算する予定
 */

/**
 * 投稿のスコアを計算する
 * 現在の実装: score = likesCount
 * 
 * @param likesCount いいね数
 * @returns 計算されたスコア
 */
export function calculateScore(likesCount: number): number {
  // 現在はシンプルにいいね数をそのままスコアとする
  return likesCount;
}

/**
 * 将来的な拡張用の関数（コメントアウト）
 * 
 * @param likesCount いいね数
 * @param commentsCount コメント数
 * @param sharesCount シェア数
 * @param daysSincePosted 投稿からの経過日数
 * @returns 計算されたスコア
 */
/*
export function calculateAdvancedScore(
  likesCount: number,
  commentsCount: number,
  sharesCount: number,
  daysSincePosted: number
): number {
  // 例: 重み付けスコア計算
  const likeWeight = 1.0;
  const commentWeight = 2.0;
  const shareWeight = 3.0;
  const freshnessBonus = Math.max(0, 7 - daysSincePosted) * 0.1;

  const score =
    likesCount * likeWeight +
    commentsCount * commentWeight +
    sharesCount * shareWeight +
    freshnessBonus;

  return Math.round(score);
}
*/
