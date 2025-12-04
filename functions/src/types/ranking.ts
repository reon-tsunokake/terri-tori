import * as admin from "firebase-admin";

/**
 * 地域トップドキュメント構造
 * seasons/{seasonId}/regionTop/{regionId}/ に保存される
 */
export interface RegionTopDocument {
  postId: string; // トップ投稿のID
  userId: string; // 投稿者のユーザーID
  regionId: string; // 地域ID
  imageUrl: string; // 投稿画像URL
  likesCount: number; // いいね数
  score: number; // スコア (現在はlikesCountと同じ)
  updatedAt: admin.firestore.Timestamp; // 更新日時
}

/**
 * 地域ごとのランキング情報
 */
export interface RegionRanking {
  regionId: string;
  topPost: RegionTopDocument | null;
}

/**
 * 投稿ドキュメント構造 (Cloud Functions用)
 */
export interface PostDocument {
  userId: string;
  regionId: string;
  seasonId: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  score: number;
  createdAt: admin.firestore.Timestamp;
  location: admin.firestore.GeoPoint;
}

/**
 * シーズンランクドキュメント構造
 * users/{userId}/seasonRanks/{seasonId} に保存される
 */
export interface SeasonRankDocument {
  seasonId: string; // シーズンID (例: "2025-12")
  rank: number; // 全体順位 (1, 2, 3...)
  allLikeCount: number; // 全投稿の合計いいね数
  updatedAt: admin.firestore.Timestamp; // 更新日時
}
