import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  GeoPoint,
  increment,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import {
  PostDocument,
  CreatePostData,
  PostLikeDocument,
} from '@/types/firestore';

// コレクション名
const POSTS_COLLECTION = 'posts';
const LIKES_SUBCOLLECTION = 'likes';

/**
 * 投稿を作成
 */
export async function createPost(data: CreatePostData): Promise<string> {
  try {
    // 仮の投稿データを作成（imageUrlは後で更新）
    const postData: Omit<PostDocument, 'createdAt'> & { createdAt: any } = {
      userId: data.userId,
      regionId: data.regionId,
      seasonId: data.seasonId,
      imageUrl: '', // 一時的に空文字
      caption: data.caption,
      location: data.location,
      likesCount: 0,
      score: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, POSTS_COLLECTION), postData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * 投稿の画像URLを更新
 */
export async function updatePostImageUrl(
  postId: string,
  imageUrl: string
): Promise<void> {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, { imageUrl });
  } catch (error) {
    console.error('Error updating post image URL:', error);
    throw error;
  }
}

/**
 * 画像をFirebase Storageにアップロード
 */
export async function uploadPostImage(
  file: File,
  postId: string
): Promise<string> {
  try {
    const timestamp = Date.now();
    const filename = `posts/${postId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, filename);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * 投稿を取得
 */
export async function getPost(postId: string): Promise<PostDocument | null> {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as PostDocument;
    }
    return null;
  } catch (error) {
    console.error('Error getting post:', error);
    throw error;
  }
}

/**
 * 投稿一覧を取得
 */
export async function getPosts(options?: {
  regionId?: string;
  seasonId?: string;
  userId?: string;
  limitCount?: number;
  orderByField?: 'createdAt' | 'score' | 'likesCount';
}): Promise<Array<PostDocument & { id: string }>> {
  try {
    const constraints: QueryConstraint[] = [];

    if (options?.regionId) {
      constraints.push(where('regionId', '==', options.regionId));
    }
    if (options?.seasonId) {
      constraints.push(where('seasonId', '==', options.seasonId));
    }
    if (options?.userId) {
      constraints.push(where('userId', '==', options.userId));
    }

    // デフォルトは作成日時の降順
    const orderField = options?.orderByField || 'createdAt';
    constraints.push(orderBy(orderField, 'desc'));

    if (options?.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(collection(db, POSTS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PostDocument),
    }));
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
}

/**
 * いいねを追加/削除
 */
export async function toggleLike(
  postId: string,
  userId: string,
  isLiked: boolean
): Promise<void> {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const likeRef = doc(db, POSTS_COLLECTION, postId, LIKES_SUBCOLLECTION, userId);

    if (isLiked) {
      // いいねを削除
      await deleteDoc(likeRef);
      await updateDoc(postRef, {
        likesCount: increment(-1),
        score: increment(-1),
      });
    } else {
      // いいねを追加
      const likeData: Omit<PostLikeDocument, 'createdAt'> & { createdAt: any } = {
        userId,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, POSTS_COLLECTION, postId, LIKES_SUBCOLLECTION), likeData);
      await updateDoc(postRef, {
        likesCount: increment(1),
        score: increment(1),
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * ユーザーが投稿にいいねしているか確認
 */
export async function checkIfUserLiked(
  postId: string,
  userId: string
): Promise<boolean> {
  try {
    const likeRef = doc(db, POSTS_COLLECTION, postId, LIKES_SUBCOLLECTION, userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error('Error checking like status:', error);
    throw error;
  }
}

/**
 * 投稿を削除
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * 現在のシーズンIDを生成（YYYY-MM形式）
 */
export function getCurrentSeasonId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `season_${year}-${month}`;
}
