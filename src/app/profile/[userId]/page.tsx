'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import useRequireAuth from '@/hooks/useRequireAuth';
import { validateProfileForm } from '../../../utils/validation';
import BottomNavigation from '../../../components/layout/BottomNavigation';
import { getPosts } from '@/services/postService';
import { UserService } from '@/services/userService';
import { getExperienceForLevel, calculateLevel } from '@/utils/experience';
import type { PostDocument, UserDocument } from '@/types/firestore';
import { FaCamera, FaHeart, FaTrophy, FaStar, FaArrowLeft } from 'react-icons/fa';
import { HiLocationMarker } from 'react-icons/hi';
import { MdPerson, MdBarChart, MdPhotoLibrary } from 'react-icons/md';

// 自分のプロフィール: 'personal' | 'status' | 'posts' | 'likes'
// 他人のプロフィール: 'status' | 'posts'
type TabType = 'personal' | 'status' | 'posts' | 'likes';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  // 未ログインならリダイレクト
  const { user: currentUser, loading: authLoading } = useRequireAuth(true);
  const { userProfile: currentUserProfile, updateUserProfile, logout } = useAuth();
  const userId = params.userId as string;

  // 自分のプロフィールかどうか
  const isOwnProfile = currentUser?.uid === userId;

  // プロフィール対象ユーザー
  const [profileUser, setProfileUser] = useState<UserDocument | null>(null);
  const [userPosts, setUserPosts] = useState<Array<PostDocument & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [error, setError] = useState<string | null>(null);

  // 自分のプロフィール編集用
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // いいねした投稿（自分のプロフィールのみ）
  const [likedPosts, setLikedPosts] = useState<Array<PostDocument & { id: string }>>([]);
  const [likedPostsLoading, setLikedPostsLoading] = useState(false);

  // ユーザー情報を取得（リアルタイムリスナー付き）
  useEffect(() => {
    if (!userId || authLoading) return;

    setLoading(true);

    // Firestoreのリアルタイムリスナーを設定
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as UserDocument;
          setProfileUser(userData);
          
          // 自分のプロフィールの場合は編集フォームも更新
          if (isOwnProfile) {
            setDisplayName(userData.displayName || '');
            setBio(userData.bio || '');
            setLocation(userData.location || '');
          }
        } else {
          setError('ユーザーが見つかりませんでした');
        }
        setLoading(false);
      },
      (error) => {
        console.error('ユーザー取得エラー:', error);
        setError('ユーザー情報の取得に失敗しました');
        setLoading(false);
      }
    );

    // クリーンアップ
    return () => unsubscribe();
  }, [userId, isOwnProfile, authLoading]);

  // 投稿を取得
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) return;

      try {
        setPostsLoading(true);
        const posts = await getPosts({
          userId: userId,
          orderByField: 'createdAt',
        });
        setUserPosts(posts);
      } catch (error) {
        console.error('投稿取得エラー:', error);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchUserPosts();
  }, [userId]);

  // いいねした投稿を取得（自分のプロフィール && likesタブのみ）
  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (!isOwnProfile || !currentUser || activeTab !== 'likes') return;
      
      try {
        setLikedPostsLoading(true);
        const posts = await UserService.getUserLikedPosts(currentUser.uid);
        setLikedPosts(posts);
      } catch (error) {
        console.error('プロフィール: いいね投稿取得エラー:', error);
      } finally {
        setLikedPostsLoading(false);
      }
    };

    fetchLikedPosts();
  }, [isOwnProfile, currentUser, activeTab]);

  // 統計情報を計算
  const totalLikes = userPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);

  // プロフィール更新ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const validationResults = validateProfileForm(displayName, bio, '', location);
    const firstError = validationResults.find(result => !result.isValid);
    
    if (firstError) {
      setMessage(firstError.message || 'フォームの入力内容を確認してください。');
      return;
    }

    setIsUpdating(true);

    try {
      await updateUserProfile({
        displayName,
        bio,
        location,
      });
      setMessage('プロフィールを更新しました！');
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage('プロフィールの更新に失敗しました。');
    } finally {
      setIsUpdating(false);
    }
  };

  // ログアウトハンドラ
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // アバター画像変更ハンドラ
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      setMessage('画像ファイルを選択してください');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('ファイルサイズは5MB以下にしてください');
      return;
    }

    setIsUploadingAvatar(true);
    setMessage('');

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      await UserService.uploadAvatarImage(file, currentUser.uid);
      setMessage('アバター画像を更新しました！');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Avatar upload error:', error);
      setMessage('アバター画像のアップロードに失敗しました');
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ローディング
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  // エラー or ユーザー未発見
  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-6 px-3 pb-24">
        <div className="max-w-sm mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-rose-500 transition-colors mb-4"
          >
            <FaArrowLeft className="mr-2" />
            <span>戻る</span>
          </button>
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-rose-100 p-8 text-center">
            <p className="text-gray-600 mb-4">{error || 'ユーザーが見つかりませんでした'}</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // 未ログインで自分のプロフィールにアクセス（リダイレクト）
  if (isOwnProfile && !currentUser) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-6 px-3 pb-24">
      <div className="max-w-sm mx-auto fade-in">
        {/* 他人のプロフィールの場合のみ戻るボタン */}
        {!isOwnProfile && (
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-rose-500 transition-colors mb-4"
          >
            <FaArrowLeft className="mr-2" />
            <span>戻る</span>
          </button>
        )}

        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
            プロフィール
          </h1>
          <div className="w-12 h-1 bg-gradient-to-r from-rose-400 to-pink-400 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* メインカード */}
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-rose-100 overflow-hidden mb-6">
          {/* プロフィール情報 */}
          <div className="p-6 border-b border-rose-100">
            <div className="text-center mb-6">
              <div className="relative w-20 h-20 mx-auto mb-4">
                {/* アバター表示 */}
                {avatarPreview ? (
                  <img 
                    src={avatarPreview}
                    alt="新しいアバター"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : profileUser.photoURL ? (
                  <Image
                    src={profileUser.photoURL}
                    alt={profileUser.displayName || 'User'}
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {(profileUser.displayName)?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                
                {/* 編集ボタン（自分のプロフィールのみ） */}
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors duration-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </label>
                )}
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                {profileUser.displayName || '名前未設定'}
              </h2>
              {isOwnProfile && currentUser?.email && (
                <p className="text-gray-600 text-sm">{currentUser.email}</p>
              )}
              {profileUser.location && (
                <p className="text-gray-600 text-sm flex items-center justify-center mt-1">
                  <HiLocationMarker className="mr-1 text-rose-400" />
                  {profileUser.location}
                </p>
              )}
              {profileUser.bio && (
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                  {profileUser.bio}
                </p>
              )}
            </div>

            {/* 統計情報 */}
            <div className="flex justify-center space-x-8 py-4 bg-rose-50 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-500">{userPosts.length}</div>
                <div className="text-sm text-gray-600">投稿</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">{totalLikes}</div>
                <div className="text-sm text-gray-600">いいね</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-400">{profileUser.followingCount || 0}</div>
                <div className="text-sm text-gray-600">フォロー数</div>
              </div>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div className="flex border-b border-rose-100">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${
                activeTab === 'posts'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                  : 'text-gray-600 hover:bg-rose-50'
              }`}
            >
              <MdPhotoLibrary className="text-xl" />
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${
                activeTab === 'status'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                  : 'text-gray-600 hover:bg-rose-50'
              }`}
            >
              <MdBarChart className="text-xl" />
            </button>
            {/* 自分のプロフィールのみ: いいねタブ */}
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('likes')}
                className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${
                  activeTab === 'likes'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'text-gray-600 hover:bg-rose-50'
                }`}
              >
                <FaHeart className="text-xl" />
              </button>
            )}
            {/* 自分のプロフィールのみ: 個人情報編集タブ */}
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${
                  activeTab === 'personal'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'text-gray-600 hover:bg-rose-50'
                }`}
              >
                <MdPerson className="text-xl" />
              </button>
            )}
          </div>

          {/* タブコンテンツ */}
          <div className="p-6 sm:p-8">
            {/* 投稿タブ */}
            {activeTab === 'posts' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <MdPhotoLibrary className="text-rose-500" /> {isOwnProfile ? 'マイ投稿' : '投稿した写真'}
                  </h3>
                  <span className="text-sm text-gray-500 bg-rose-50 px-3 py-1 rounded-full">{userPosts.length}件</span>
                </div>

                {postsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div>
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {userPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity group"
                      >
                        {post.imageUrl ? (
                          <Image
                            src={post.imageUrl}
                            alt={post.caption}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="(max-width: 640px) 33vw, 150px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100">
                            <FaCamera className="text-rose-300 text-3xl" />
                          </div>
                        )}
                        
                        {/* ホバー時のオーバーレイ */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-medium flex items-center">
                            <FaHeart className="mr-1" />
                            {post.likesCount || 0}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaCamera className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>まだ投稿がありません</p>
                    {isOwnProfile && (
                      <Link
                        href="/"
                        className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg text-sm font-medium"
                      >
                        最初の投稿をする
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ステータスタブ */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <FaTrophy className="text-yellow-500" />
                  {isOwnProfile ? 'プレイヤーステータス' : 'ステータス'}
                </h3>
              
                {/* レベル＆経験値 */}
                {(() => {
                  const currentExp = profileUser.experience || 0;
                  const currentLevel = profileUser.level || calculateLevel(currentExp);
                  const currentLevelExp = getExperienceForLevel(currentLevel);
                  const nextLevelExp = getExperienceForLevel(currentLevel + 1);
                  const expInCurrentLevel = currentExp - currentLevelExp;
                  const expNeededForNextLevel = nextLevelExp - currentLevelExp;
                  const expToNextLevel = nextLevelExp - currentExp;
                  const progressPercent = expNeededForNextLevel > 0 
                    ? Math.min(100, Math.floor((expInCurrentLevel / expNeededForNextLevel) * 100))
                    : 100;

                  return (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-2xl">{currentLevel}</span>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-amber-700">レベル {currentLevel}</div>
                            <div className="text-sm text-amber-600">{currentExp} XP</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-amber-600">次のレベルまで</div>
                          <div className="text-lg font-bold text-amber-700">
                            {expToNextLevel} XP
                          </div>
                        </div>
                      </div>

                      {/* 経験値バー */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-amber-600 mb-1">
                          <span>経験値</span>
                          <span>{expInCurrentLevel}/{expNeededForNextLevel}</span>
                        </div>
                        <div className="w-full bg-amber-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-amber-400 to-yellow-400 h-3 rounded-full transition-all duration-500 shadow-sm"
                            style={{
                              width: `${progressPercent}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 獲得した実績 */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaTrophy className="text-amber-500" /> 獲得した実績
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(profileUser.achievements || []).length > 0 ? (
                      profileUser.achievements.map((achievement, index) => (
                        <span 
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-amber-200 to-yellow-200 text-amber-800 text-sm rounded-full font-medium shadow-sm"
                        >
                          <FaStar className="inline mr-1 text-amber-600" />
                          {achievement}
                        </span>
                      ))
                    ) : (
                      <div className="w-full text-center py-8 text-gray-500">
                        <FaStar className="text-4xl mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">まだ実績がありません</p>
                        {isOwnProfile && (
                          <p className="text-xs mt-1">投稿を続けて実績をアンロックしよう！</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* いいねタブ（自分のプロフィールのみ） */}
            {activeTab === 'likes' && isOwnProfile && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <FaHeart className="text-rose-500" /> いいね
                  </h3>
                  <span className="text-sm text-gray-500 bg-rose-50 px-3 py-1 rounded-full">{likedPosts.length}件</span>
                </div>

                {likedPostsLoading ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-3"></div>
                    <p className="text-sm">読み込み中...</p>
                  </div>
                ) : likedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {likedPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity group"
                      >
                        {post.imageUrl ? (
                          <Image
                            src={post.imageUrl}
                            alt={post.caption}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 33vw, 150px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100">
                            <FaCamera className="text-rose-300 text-3xl" />
                          </div>
                        )}
                        
                        {/* ホバー時のオーバーレイ */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-center text-xs">
                            <div className="flex items-center justify-center gap-3">
                              <span className="flex items-center gap-1">
                                <FaHeart className="text-red-400" /> {post.likesCount || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaHeart className="text-6xl mb-4 mx-auto text-rose-300" />
                    <p className="text-gray-500 mb-4">まだいいねした投稿がありません</p>
                    <Link
                      href="/ranking"
                      className="inline-block px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg text-sm font-medium"
                    >
                      投稿を探す
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 個人情報編集タブ（自分のプロフィールのみ） */}
            {activeTab === 'personal' && isOwnProfile && currentUser && (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <MdPerson className="text-rose-500" /> 個人情報編集
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={currentUser.email || ''}
                      disabled
                      className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-2 text-xs text-gray-500">メールアドレスは変更できません</p>
                  </div>

                  <div>
                    <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700 mb-2">
                      表示名
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-4 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900"
                      placeholder="表示名を入力"
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 mb-2">
                      自己紹介
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-4 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900 resize-none"
                      placeholder="自己紹介を入力"
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                      場所
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-4 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900"
                      placeholder="居住地を入力"
                    />
                  </div>

                  {message && (
                    <div className={`text-sm text-center p-3 rounded-md ${
                      message.includes('失敗') 
                        ? 'text-red-600 bg-red-50' 
                        : 'text-green-600 bg-green-50'
                    }`}>
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-4 px-4 text-base font-semibold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 focus:outline-none focus:ring-4 focus:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
                  >
                    {isUpdating ? '更新中...' : 'プロフィールを更新'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* ログアウトボタン（自分のプロフィールのみ） */}
          {isOwnProfile && (
            <div className="p-6 border-t border-rose-100">
              <button
                onClick={handleLogout}
                className="w-full py-4 px-4 text-base font-semibold bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
