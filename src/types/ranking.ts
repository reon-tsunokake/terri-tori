import { Timestamp } from 'firebase/firestore';

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
    score: number; // スコア
    updatedAt: Timestamp; // 更新日時
}
