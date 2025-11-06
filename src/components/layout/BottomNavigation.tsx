'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiHome, HiCamera, HiUser } from 'react-icons/hi2';

/**
 * ボトムナビゲーションコンポーネント
 * ホーム、カメラ（投稿）、プロフィールの3つのナビゲーション項目を提供
 */
export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      icon: HiHome,
      label: 'ホーム',
      isActive: pathname === '/'
    },
    {
      href: '/post',
      icon: HiCamera,
      label: '投稿',
      isActive: pathname === '/post'
    },
    {
      href: '/profile',
      icon: HiUser,
      label: 'プロフィール',
      isActive: pathname === '/profile'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-rose-100 z-50">
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
      <div className="h-safe-area-inset-bottom bg-white/95"></div>
    </nav>
  );
}