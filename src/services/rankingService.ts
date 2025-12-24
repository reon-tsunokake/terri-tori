import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RegionTopDocument, UserRankingData } from '@/types/ranking';
import { UserDocument } from '@/types/firestore';

export class RankingService {
    /**
     * 指定されたシーズンの地域トップ投稿を取得します。
     * @param seasonId シーズンID (例: "2023-12")
     * @returns RegionTopDocumentの配列
     */
    public static async getRegionTopDocuments(seasonId: string): Promise<RegionTopDocument[]> {
        try {
            // seasons/{seasonId}/regionTop コレクションから全ドキュメントを取得
            const q = query(collection(db, 'seasons', seasonId, 'regionTop'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => doc.data() as RegionTopDocument);
        } catch (error) {
            console.error('Error fetching region top documents:', error);
            return [];
        }
    }

    /**
     * 経験値順でユーザーランキングを取得します。
     * @param limitCount 取得件数（デフォルト: 100）
     * @returns UserRankingDataの配列（順位付き）
     */
    public static async getUserRankingByExperience(limitCount: number = 100): Promise<UserRankingData[]> {
        try {
            // users コレクションから経験値順で取得
            const q = query(
                collection(db, 'users'),
                orderBy('experience', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);

            // 順位を付けてマッピング
            return snapshot.docs.map((doc, index) => {
                const userData = doc.data() as UserDocument;
                return {
                    uid: userData.uid,
                    displayName: userData.displayName || '匿名ユーザー',
                    photoURL: userData.photoURL || null,
                    level: userData.level || 1,
                    experience: userData.experience || 0,
                    rank: index + 1,
                };
            });
        } catch (error) {
            console.error('Error fetching user ranking by experience:', error);
            return [];
        }
    }
}
