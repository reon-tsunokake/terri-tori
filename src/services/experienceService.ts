import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExperienceResult, getExperienceDetails } from '@/utils/experience';
import { UserDocument } from '@/types/firestore';

// コレクション名
const USERS_COLLECTION = 'users';

/**
 * ユーザーの経験値詳細を取得する
 * @param userId ユーザーID
 * @returns 経験値の詳細情報
 */
export async function getUserExperience(userId: string): Promise<ExperienceResult> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as UserDocument;
      return getExperienceDetails(userData.experience ?? 0);
    }

    // ユーザーが存在しない場合はデフォルト値
    return getExperienceDetails(0);
  } catch (error) {
    console.error('Error getting user experience:', error);
    throw error;
  }
}
