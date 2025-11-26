'use client';

import React, { useEffect, useState } from 'react';
import { PostDocument } from '../../../types/firestore';
import { getMunicipalityName, getPrefectureName } from '../../../utils/location';
import { fetchLikeStatus, useToggleLike } from '../../../hooks/useToggleLike';
import { useAuth } from '../../../contexts/AuthContext';
import LikeButton from '../../LikeButton/LikeButton';

interface PostDetailContentProps {
  post: PostDocument & { id: string };
}

export default function PostDetailContent({ post }: PostDetailContentProps) {
  const { user } = useAuth();
  const [locationName, setLocationName] = useState<string>('場所不明');
  const [prefectureName, setPrefectureName] = useState<string>('');
  const [initialIsLiked, setInitialIsLiked] = useState(false);
  const [isLoadingLikeStatus, setIsLoadingLikeStatus] = useState(true);

  const { isLiked, likesCount, isLoading, handleToggleLike } = useToggleLike({
    postId: post.id,
    initialIsLiked,
    initialLikesCount: post.likesCount || 0,
  });

  useEffect(() => {
    const fetchLocation = async () => {
      if (post.regionId) {
        const municipality = await getMunicipalityName(post.regionId);
        const prefecture = await getPrefectureName(post.regionId);
        if (municipality) setLocationName(municipality);
        if (prefecture) setPrefectureName(prefecture);
      }
    };
    fetchLocation();
  }, [post.regionId]);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (user && post.id) {
        const liked = await fetchLikeStatus(post.id, user.uid);
        setInitialIsLiked(liked);
      }
      setIsLoadingLikeStatus(false);
    };
    checkLikeStatus();
  }, [user, post.id]);

  return (
    <div className="bg-white">
      {/* 写真エリア */}
      <div className="relative w-full bg-gray-100">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt="Post detail"
            className="w-full h-auto max-h-[60vh] object-contain mx-auto"
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-400">No Image</div>
        )}
      </div>

      {/* 投稿情報エリア */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            {/* Location情報 */}
            <h2 className="text-xl font-bold text-gray-900">
              {locationName}
            </h2>
            <p className="text-sm text-gray-500">
              {prefectureName}
            </p>
          </div>
          {/* Season情報 */}
          <div className="text-right">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
              {post.seasonId || 'Season未設定'}
            </span>
          </div>
        </div>

        {/* いいね数などのメタデータ */}
        <div className="flex items-center text-gray-600 text-sm border-y border-gray-50 py-3">
          <LikeButton
            isLiked={isLiked}
            likesCount={likesCount}
            onClick={handleToggleLike}
            disabled={isLoading || isLoadingLikeStatus}
          />

          <span className="text-gray-400 text-xs ml-auto">
            {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}
          </span>
        </div>

        {/* コメント・キャプション */}
        <div className="pt-2">
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
            {post.caption || "コメントはありません"}
          </p>
        </div>
      </div>
    </div>
  );
}
