'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { validateProfileForm } from '../../utils/validation';
import BottomNavigation from '../../components/layout/BottomNavigation';

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile, loading, logout } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setBio(userProfile.bio);
      setLocation(userProfile.location);
    }
  }, [user, userProfile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // クライアントサイドバリデーション
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

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-6 px-3 pb-24">
      <div className="max-w-sm mx-auto fade-in">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
            プロフィール
          </h1>
          <div className="w-12 h-1 bg-gradient-to-r from-rose-400 to-pink-400 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* プロフィール情報カード */}
        {userProfile && (
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-6 mb-6 border border-rose-100">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">
                  {(userProfile.displayName || user?.displayName || user?.email)?.[0]?.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                {userProfile.displayName || user?.displayName || user?.email?.split('@')[0]}
              </h2>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>

            {/* フォロー関係の情報 */}
            <div className="flex justify-center space-x-8 mb-6 py-4 bg-rose-50 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-500">{userProfile.postCount}</div>
                <div className="text-sm text-gray-600">投稿</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">{userProfile.followerCount}</div>
                <div className="text-sm text-gray-600">フォロワー</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-400">{userProfile.followingCount}</div>
                <div className="text-sm text-gray-600">フォロー中</div>
              </div>
            </div>

            {/* ゲーミフィケーション情報 */}
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
              <h3 className="text-lg font-semibold text-amber-700 mb-3 text-center">🎮 プレイヤーステータス</h3>
              
              {/* レベルと経験値 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{userProfile.level || 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-amber-700">レベル {userProfile.level || 1}</div>
                    <div className="text-xs text-amber-600">{userProfile.experience || 0} XP</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-600">次のレベルまで</div>
                  <div className="text-sm font-medium text-amber-700">
                    {100 - ((userProfile.experience || 0) % 100)} XP
                  </div>
                </div>
              </div>

              {/* 経験値バー */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-amber-600 mb-1">
                  <span>経験値</span>
                  <span>{((userProfile.experience || 0) % 100)}/100</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-yellow-400 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${((userProfile.experience || 0) % 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* 実績 */}
              <div>
                <h4 className="text-sm font-medium text-amber-700 mb-2">🏆 実績 ({(userProfile.achievements || []).length})</h4>
                <div className="flex flex-wrap gap-2">
                  {(userProfile.achievements || []).length > 0 ? (
                    userProfile.achievements.map((achievement, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-gradient-to-r from-amber-200 to-yellow-200 text-amber-800 text-xs rounded-full font-medium"
                      >
                        {achievement}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-600 italic">まだ実績がありません</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 space-y-1">
              <p>登録日: {userProfile.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '不明'}</p>
              <p>最終更新: {userProfile.updatedAt?.toDate?.()?.toLocaleDateString('ja-JP') || '不明'}</p>
            </div>
          </div>
        )}

        {/* プロフィール編集フォーム */}

        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-6 sm:p-8 border border-rose-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={user.email || ''}
                disabled
                className="mt-1 block w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
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

        {/* ログアウトボタン */}
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-6 border border-rose-100">
          <button
            onClick={handleLogout}
            className="w-full py-4 px-4 text-base font-semibold bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
          >
            ログアウト
          </button>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}