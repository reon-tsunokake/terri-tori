'use client';

import React, { useEffect, useState } from 'react';
import { PostDocument } from '../../../types/firestore';
import { getMunicipalityName, getPrefectureName } from '../../../utils/location';
import { checkIfUserLiked, toggleLike } from '../../../services/postService';
import { useAuth } from '../../../contexts/AuthContext';

interface PostDetailContentProps {
  post: PostDocument & { id: string };
}

export default function PostDetailContent({ post }: PostDetailContentProps) {
  const { user } = useAuth();
  const [locationName, setLocationName] = useState<string>('場所不明');
  const [prefectureName, setPrefectureName] = useState<string>('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);

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
        try {
          const liked = await checkIfUserLiked(post.id, user.uid);
          setIsLiked(liked);
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      }
    };
    checkLikeStatus();
  }, [user, post.id]);

  const handleLike = async () => {
    if (!user) {
      alert('いいねするにはログインが必要です');
      return;
    }

    // 楽観的UI更新
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

    try {
      await toggleLike(post.id, user.uid, isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      // エラー時は元に戻す
      setIsLiked(isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
      alert('いいねの更新に失敗しました');
    }
  };

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
          <button
            onClick={handleLike}
            className={`flex items-center transition-colors ${isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-1 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-medium mr-4">{likesCount} いいね</span>
          </button>

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
