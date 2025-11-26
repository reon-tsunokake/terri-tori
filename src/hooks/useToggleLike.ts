import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toggleLike, checkIfUserLiked } from '@/services/likeService';

interface UseToggleLikeProps {
  postId: string;
  initialIsLiked: boolean;
  initialLikesCount: number;
}

interface UseToggleLikeReturn {
  isLiked: boolean;
  likesCount: number;
  isLoading: boolean;
  handleToggleLike: () => Promise<void>;
}

/**
 * いいね機能のカスタムフック
 * 
 * 楽観的UI更新とエラーハンドリングを含む、
 * いいねのトグル機能を提供します。
 */
export function useToggleLike({
  postId,
  initialIsLiked,
  initialLikesCount,
}: UseToggleLikeProps): UseToggleLikeReturn {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleLike = useCallback(async () => {
    if (!user) {
      alert('いいねするにはログインが必要です');
      return;
    }

    if (isLoading) {
      return; // 二重送信防止
    }

    // 楽観的UI更新
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;
    const newIsLiked = !isLiked;

    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    setIsLoading(true);

    try {
      await toggleLike(postId, user.uid, previousIsLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // エラー時はロールバック
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      
      alert('いいねの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user, postId, isLiked, likesCount, isLoading]);

  return {
    isLiked,
    likesCount,
    isLoading,
    handleToggleLike,
  };
}

/**
 * いいね状態をチェックするためのヘルパーフック
 */
export async function fetchLikeStatus(
  postId: string,
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false;
  
  try {
    return await checkIfUserLiked(postId, userId);
  } catch (error) {
    console.error('Error fetching like status:', error);
    return false;
  }
}
