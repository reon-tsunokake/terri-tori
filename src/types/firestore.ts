import { Timestamp, GeoPoint, FieldValue } from 'firebase/firestore';

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

// 投稿ドキュメント構造
export interface PostDocument {
  userId: string;
  regionId: string;
  seasonId: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  score: number;
  createdAt: Timestamp;
  location: GeoPoint;
}

// 投稿作成時のデータ
export interface CreatePostData {
  userId: string;
  regionId: string;
  seasonId: string;
  imageUrl: string;
  caption: string;
  location: GeoPoint;
}

// いいねサブコレクション構造
export interface PostLikeDocument {
  userId: string;
  createdAt: Timestamp;
}
