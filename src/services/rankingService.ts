import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RegionTopDocument } from '@/types/ranking';

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
}
