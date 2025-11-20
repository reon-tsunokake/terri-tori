'use client';

import React from 'react'; // Reactをインポート
// import Link from 'next/link'; // プレビュー環境のため <a> に置換
import { HiCamera } from 'react-icons/hi2'; // プレビュー環境のためインラインSVGに置換

/**
 * 写真投稿用フローティングアクションボタン
 * BottomNavigationとは別に、地図画面の右下に表示される
 * * エラー修正: next/link, react-icons をプレビュー可能な形式に変更
 */
export default function CameraButton() {
  return (
    // <Link> を <a> に変更
    <a
      href="/post" // 写真撮影ページ (担当外) へのリンク
      onClick={(e) => e.preventDefault()} // プレビューでの画面遷移を防止
      className="fixed bottom-24 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 active:shadow-lg touch-manipulation"
      aria-label="写真を投稿する"
    >
      <HiCamera className="h-8 w-8" />
    </a>
  );
}
