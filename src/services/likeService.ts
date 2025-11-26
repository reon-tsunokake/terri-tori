import {
  doc,
  getDoc,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PostLikeDocument } from '@/types/firestore';

// コレクション名
const POSTS_COLLECTION = 'posts';
const LIKES_SUBCOLLECTION = 'likes';

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
    const batch = writeBatch(db);

    if (isLiked) {
      // いいねを削除
      batch.delete(likeRef);
      batch.update(postRef, {
        likesCount: increment(-1),
        score: increment(-1),
      });
    } else {
      // いいねを追加
      const likeData: Omit<PostLikeDocument, 'createdAt'> & { createdAt: any } = {
        userId,
        createdAt: serverTimestamp(),
      };
      batch.set(likeRef, likeData);
      batch.update(postRef, {
        likesCount: increment(1),
        score: increment(1),
      });
    }

    await batch.commit();
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
