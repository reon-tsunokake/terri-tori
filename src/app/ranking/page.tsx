'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext'; 
import BottomNavigation from '../../components/layout/BottomNavigation'; 

// ランキングページ（プレースホルダー）
export default function RankingPage() {
  const { user, loading } = useAuth(); 
  const router = useRouter();

  // 認証ガード
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login'); 
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div>読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-800">ランキングページ</h1>
      <p className="text-gray-600">このページは現在準備中です。</p>
      
      {/* 共通レイアウトの一部としてナビゲーションを表示 */}
      <BottomNavigation />
    </main>
  );
}
