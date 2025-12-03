'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiHome, HiChartBar, HiMagnifyingGlass, HiUser } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ボトムナビゲーションコンポーネント
 * 仕様変更: [ホーム, ランキング, 検索, プロフィール] の4項目に変更
 * 「投稿」ボタンは削除され、CameraButton.tsxとして分離
 */
export default function BottomNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  // プロフィールページへのリンク（ログイン済みなら自分のプロフィール、未ログインならログインページ）
  const profileHref = user ? `/profile/${user.uid}` : '/login';
  // プロフィールタブのアクティブ判定
  const isProfileActive = pathname.startsWith('/profile');

  const navItems = [
    {
      href: '/',
      icon: HiHome,
      label: 'ホーム',
      isActive: pathname === '/'
    },
    {
      href: '/ranking',
      icon: HiChartBar,
      label: 'ランキング',
      isActive: pathname === '/ranking'
    },
    {
      href: '/search',
      icon: HiMagnifyingGlass,
      label: '検索',
      isActive: pathname === '/search'
    },
    {
      href: profileHref,
      icon: HiUser,
      label: 'プロフィール',
      isActive: isProfileActive
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-rose-100 z-10">
      <div className="max-w-sm mx-auto px-4 py-2 sm:py-3">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-xl transition-all duration-300 touch-manipulation ${
                  item.isActive
                    ? 'text-rose-500 bg-rose-50'
                    : 'text-gray-500 hover:text-rose-400 hover:bg-rose-25 active:scale-95'
                }`}
              >
                <IconComponent 
                  className={`w-6 h-6 transition-transform duration-300 ${
                    item.isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`} 
                />
                <span className={`text-xs font-medium transition-colors duration-300 ${
                  item.isActive ? 'text-rose-600' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/95"></div>
    </nav>
  );
}
