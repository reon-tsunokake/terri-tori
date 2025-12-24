'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PostDocument, UserDocument } from '../../../types/firestore';
import { getMunicipalityName, getPrefectureName } from '../../../utils/location';
import { fetchLikeStatus, useToggleLike } from '../../../hooks/useToggleLike';
import { useAuth } from '../../../contexts/AuthContext';
import LikeButton from '../../LikeButton/LikeButton';
import { UserService } from '../../../services/userService';
import toast from 'react-hot-toast';
import { HiX } from 'react-icons/hi';

// 動的インポート（SSRを無効化）
const LocationPinMap = dynamic(() => import('../../map/LocationPinMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-600">地図を読み込んでいます...</p>
    </div>
  ),
});

interface PostDetailContentProps {
  post: PostDocument & { id: string };
  onBack?: () => void;
}

export default function PostDetailContent({ post, onBack }: PostDetailContentProps) {
  const { user } = useAuth();
  const [locationName, setLocationName] = useState<string>('場所不明');
  const [prefectureName, setPrefectureName] = useState<string>('');
  const [initialIsLiked, setInitialIsLiked] = useState(false);
  const [isLoadingLikeStatus, setIsLoadingLikeStatus] = useState(true);
  const [postAuthor, setPostAuthor] = useState<UserDocument | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);

  const { isLiked, likesCount, isLoading, handleToggleLike } = useToggleLike({
    postId: post.id,
    initialIsLiked,
    initialLikesCount: post.likesCount || 0,
  });

  // いいねが未押下→押下になったときトースト表示
  const [prevLiked, setPrevLiked] = useState(initialIsLiked);
  useEffect(() => {
    if (!prevLiked && isLiked) {
      toast.success('位置が確認できるようになりました');
    }
    setPrevLiked(isLiked);
  }, [isLiked, prevLiked]);

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

  useEffect(() => {
    const fetchPostAuthor = async () => {
      if (post.userId) {
        const author = await UserService.getUser(post.userId);
        setPostAuthor(author);
      }
    };
    fetchPostAuthor();
  }, [post.userId]);

  return (
    <div className="bg-black min-h-screen relative">
      {/* 写真エリア（画面いっぱい） */}
      <div 
        className="relative w-full h-screen cursor-pointer"
        onClick={() => setShowInfo(!showInfo)}
      >
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt="Post detail"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
        )}

        {/* オーバーレイ情報（写真の上） */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300 ${showInfo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* 左上：Season情報 */}
          <div className="absolute top-4 left-4">
            <span className="inline-block bg-blue-500/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
              {post.seasonId || 'Season未設定'}
            </span>
          </div>

          {/* 右上：閉じるボタン */}
          <div className="absolute top-4 right-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onBack) {
                  onBack();
                } else if (typeof window !== 'undefined') {
                  window.history.back();
                }
              }}
              className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors shadow-lg"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>

          {/* 左下：投稿情報エリア */}
          <div 
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* Location情報 */}
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                  {locationName}
                </h2>
                <p className="text-sm text-white/80 drop-shadow">
                  {prefectureName}
                </p>
              </div>

              {/* 投稿者情報といいねボタン */}
              <div className="flex items-center gap-4">
                {/* 投稿者情報 - プロフィールへのリンク */}
                <Link
                  href={`/profile/${post.userId}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {postAuthor?.photoURL ? (
                    <img
                      src={postAuthor.photoURL}
                      alt={postAuthor.displayName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white text-sm font-semibold border-2 border-white shadow-lg">
                      {postAuthor?.displayName?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="text-white font-semibold text-base drop-shadow-lg">
                    {postAuthor?.displayName || '読み込み中...'}
                  </span>
                </Link>

                {/* いいねボタン */}
                <LikeButton
                  isLiked={isLiked}
                  likesCount={likesCount}
                  onClick={handleToggleLike}
                  disabled={isLoading || isLoadingLikeStatus}
                />

                {/* 投稿日時 */}
                <span className="text-white/70 text-xs ml-auto drop-shadow">
                  {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : ''}
                </span>
              </div>

              {/* キャプション */}
              {post.caption && (
                <div className="pt-2">
                  <p className="text-white text-sm leading-relaxed drop-shadow line-clamp-3">
                    {post.caption}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    {/* 右下：いいね済みのときのみ「位置を確認する」ボタンを表示 */}
    {isLiked && post.location && (
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors duration-200"
        style={{ pointerEvents: 'auto' }}
        onClick={() => setShowMapModal(true)}
      >
        位置を確認する
      </button>
    )}

    {/* 地図モーダル */}
    {showMapModal && post.location && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
        <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden shadow-2xl">
          {/* 閉じるボタン */}
          <button
            onClick={() => setShowMapModal(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          >
            <HiX className="w-6 h-6 text-gray-700" />
          </button>
          
          {/* タイトル */}
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800">{locationName}</h3>
            <p className="text-sm text-gray-600">{prefectureName}</p>
          </div>

          {/* マップ */}
          <LocationPinMap
            latitude={post.location.latitude}
            longitude={post.location.longitude}
            locationName={locationName}
          />
        </div>
      </div>
    )}
  </div>
  );
}
