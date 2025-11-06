"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import BottomNavigation from "../components/layout/BottomNavigation";

export default function Home() {
  const [likes, setLikes] = useState(0);
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 認証状態の確認が完了し、ユーザーがログインしていない場合はログイン画面に遷移
    if (!loading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </main>
    );
  }

  // ユーザーがログインしていない場合は何も表示しない（リダイレクト中）
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-rose-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-rose-100 p-4 sticky top-0 z-10">
        <div className="max-w-sm mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
            📸 Terri-tori
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 fade-in">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 bg-clip-text text-transparent leading-tight">
              現実の写真で、街を染めよう。
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-rose-400 to-pink-400 mx-auto rounded-full"></div>
          </div>
          
          {user ? (
            <div className="space-y-8 slide-up">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-rose-100">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                  ようこそ、<span className="font-semibold text-rose-600">{userProfile?.displayName || user.displayName || user.email?.split('@')[0]}</span>さん！<br />
                  あなたの投稿で街を彩りましょう。
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <button
                  onClick={() => setLikes(likes + 1)}
                  className="group px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-base font-semibold touch-manipulation"
                >
                  <span className="group-hover:scale-110 inline-block transition-transform duration-300">❤️</span> いいね！ ({likes})
                </button>
                
                <button className="group px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl hover:from-pink-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-base font-semibold touch-manipulation">
                  <span className="group-hover:scale-110 inline-block transition-transform duration-300">📷</span> 写真を投稿
                </button>
                
                <button className="group px-6 py-4 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-2xl hover:from-rose-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-base font-semibold touch-manipulation sm:col-span-2">
                  <span className="group-hover:scale-110 inline-block transition-transform duration-300">🗺️</span> 地図を見る
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 slide-up">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-rose-100">
                <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                  写真を投稿して、あなたの街を彩りませんか？<br />
                  まずはアカウントを作成して始めましょう。
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/signup"
                    className="px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
                  >
                    今すぐ始める
                  </Link>
                  <Link
                    href="/login"
                    className="px-10 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
                  >
                    ログイン
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation - ログイン時のみ表示 */}
      {user && <BottomNavigation />}
    </main>
  );
}
