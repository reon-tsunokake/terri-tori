import { Timestamp } from 'firebase/firestore';

// Firestoreのユーザードキュメント構造
export interface UserDocument {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  bio: string;
  location: string;
  isActive: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  level: number;
  experience: number;
  achievements: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ユーザードキュメント作成時のデータ
export interface CreateUserData {
  uid: string;
  displayName?: string;
  email: string | null;
  photoURL?: string | null;
}

// ユーザープロフィール更新データ
export interface UpdateUserProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  photoURL?: string | null;
}
