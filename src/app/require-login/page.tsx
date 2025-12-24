
import Link from 'next/link';
import BottomNavigation from '@/components/layout/BottomNavigation';

export default function RequireLoginNotice() {
  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 px-4">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-rose-600 mb-4">ログインが必要です</h1>
          <p className="text-gray-700 mb-6">
            このページを利用するにはログインが必要です。
          </p>
          <Link
            href="/login"
            className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl px-6 py-3 transition-colors shadow"
          >
            ログイン画面へ
          </Link>
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
