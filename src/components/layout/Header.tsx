'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
// import Link from 'next/link'; // プレビュー環境のため <a> に置換

/**
 * ヘッダーコンポーネント
 * 以前の page.tsx から抽出したデザインを再利用
 * * エラー修正: next/link を <a> に変更
 */
export default function Header() {
  const pathname = usePathname();

  // 投稿詳細ページではヘッダーを非表示
  if (pathname?.startsWith('/post/')) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-lg border-b border-rose-100 z-10 h-14 sm:h-16 md:h-20">
      <div className="mx-auto max-w-screen-lg h-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        {/* ロゴをホームへのリンクにする (プレビューのため <a> を使用) */}
        <a
          href="/"
          onClick={(e) => e.preventDefault()} // プレビューでの画面遷移を防止
          className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent"
        >
           Terri-tori
        </a>
      </div>
    </header>
  );
}
