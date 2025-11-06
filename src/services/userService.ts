import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { 
  UserDocument, 
  CreateUserData, 
  UpdateUserProfileData 
} from '../types/firestore';

/**
 * ユーザーサービス
 * Firestoreのユーザードキュメントの操作を担当
 */
export class UserService {
  /**
   * ユーザードキュメントをFirestoreに作成
   */
  static async createUser(user: User, additionalData?: CreateUserData): Promise<UserDocument> {
    try {
      const userRef = doc(db, 'users', user.uid);
      console.log('Checking if user document exists:', user.uid);
      
      // 既存のドキュメントをチェック
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        const { displayName, email, photoURL } = user;
        const now = serverTimestamp();
        
        const userData: UserDocument = {
          uid: user.uid,
          displayName: additionalData?.displayName || displayName || email?.split('@')[0] || '匿名ユーザー',
          email,
          photoURL: additionalData?.photoURL || photoURL || null,
          bio: '',
          location: '',
          isActive: true,
          postCount: 0,
          followerCount: 0,
          followingCount: 0,
          level: 1,
          experience: 0,
          achievements: [],
          createdAt: now as any,
          updatedAt: now as any,
        };
        
        console.log('Creating user document with data:', userData);
        await setDoc(userRef, userData);
        console.log('User document created successfully in Firestore');
        return userData;
      } else {
        console.log('User document already exists, returning existing document');
        const existingData = userDoc.data() as UserDocument;
        return existingData;
      }
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  /**
   * ユーザードキュメントを取得
   */
  static async getUser(uid: string): Promise<UserDocument | null> {
    try {
      console.log('Fetching user document:', uid);
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserDocument;
        // 古いドキュメントの場合、新しいフィールドにデフォルト値を設定
        const completeUserData: UserDocument = {
          ...userData,
          level: userData.level ?? 1,
          experience: userData.experience ?? 0,
          achievements: userData.achievements ?? [],
        };
        console.log('User document retrieved successfully');
        return completeUserData;
      } else {
        console.log('User document does not exist');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user document:', error);
      throw error;
    }
  }

  /**
   * ユーザープロフィールを更新
   */
  static async updateUserProfile(uid: string, data: UpdateUserProfileData): Promise<UserDocument> {
    try {
      console.log('Updating user profile:', uid, data);
      const userRef = doc(db, 'users', uid);
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(userRef, updateData, { merge: true });
      console.log('User profile updated successfully');
      
      // 更新されたドキュメントを取得して返す
      const updatedDoc = await getDoc(userRef);
      if (updatedDoc.exists()) {
        return updatedDoc.data() as UserDocument;
      }
      
      throw new Error('Failed to retrieve updated user document');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * ユーザーの投稿数を更新
   */
  static async updatePostCount(uid: string, increment: number = 1): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data() as UserDocument;
        const newPostCount = Math.max(0, currentData.postCount + increment);
        
        await setDoc(userRef, {
          postCount: newPostCount,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        console.log(`Post count updated: ${currentData.postCount} -> ${newPostCount}`);
      }
    } catch (error) {
      console.error('Error updating post count:', error);
      throw error;
    }
  }

  /**
   * ユーザーのフォロワー数を更新
   */
  static async updateFollowerCount(uid: string, increment: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data() as UserDocument;
        const newFollowerCount = Math.max(0, currentData.followerCount + increment);
        
        await setDoc(userRef, {
          followerCount: newFollowerCount,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        console.log(`Follower count updated: ${currentData.followerCount} -> ${newFollowerCount}`);
      }
    } catch (error) {
      console.error('Error updating follower count:', error);
      throw error;
    }
  }

  /**
   * ユーザーのフォロー中数を更新
   */
  static async updateFollowingCount(uid: string, increment: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data() as UserDocument;
        const newFollowingCount = Math.max(0, currentData.followingCount + increment);
        
        await setDoc(userRef, {
          followingCount: newFollowingCount,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        console.log(`Following count updated: ${currentData.followingCount} -> ${newFollowingCount}`);
      }
    } catch (error) {
      console.error('Error updating following count:', error);
      throw error;
    }
  }

  /**
   * ユーザーアカウントを無効化
   */
  static async deactivateUser(uid: string): Promise<void> {
    try {
      console.log('Deactivating user account:', uid);
      const userRef = doc(db, 'users', uid);
      
      await setDoc(userRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      console.log('User account deactivated successfully');
    } catch (error) {
      console.error('Error deactivating user account:', error);
      throw error;
    }
  }

  /**
   * ユーザーの経験値を追加
   */
  static async addExperience(uid: string, points: number): Promise<void> {
    try {
      console.log('Adding experience points:', uid, points);
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data() as UserDocument;
        const newExperience = Math.max(0, (currentData.experience ?? 0) + points);
        
        // レベルアップ判定（100経験値で1レベルアップする例）
        const newLevel = Math.floor(newExperience / 100) + 1;
        
        await setDoc(userRef, {
          experience: newExperience,
          level: newLevel,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        console.log(`Experience updated: ${currentData.experience} -> ${newExperience}, Level: ${newLevel}`);
      }
    } catch (error) {
      console.error('Error adding experience:', error);
      throw error;
    }
  }

  /**
   * ユーザーに実績を追加
   */
  static async addAchievement(uid: string, achievement: string): Promise<void> {
    try {
      console.log('Adding achievement:', uid, achievement);
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data() as UserDocument;
        const currentAchievements = currentData.achievements ?? [];
        
        // 既に持っている実績でない場合のみ追加
        if (!currentAchievements.includes(achievement)) {
          const newAchievements = [...currentAchievements, achievement];
          
          await setDoc(userRef, {
            achievements: newAchievements,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          
          console.log(`Achievement added: ${achievement}`);
        } else {
          console.log(`Achievement already exists: ${achievement}`);
        }
      }
    } catch (error) {
      console.error('Error adding achievement:', error);
      throw error;
    }
  }
}