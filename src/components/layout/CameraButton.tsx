'use client';

import React from 'react'; // Reactをインポート
// import Link from 'next/link'; // プレビュー環境のため <a> に置換
// import { HiCamera } from 'react-icons/hi2'; // プレビュー環境のためインラインSVGに置換

/**
 * HiCamera アイコンのインラインSVG
 */
const HiCamera = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574v9.574c0 1.067.75 1.994 1.802 2.169a47.865 47.865 0 0 0 1.134.175 2.31 2.31 0 0 1 1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316a2.31 2.31 0 0 1-1.64 1.055 47.865 47.865 0 0 0-1.134-.175C2.999 21.413 2.25 20.486 2.25 19.421v-9.574c0-1.067.75-1.994 1.802-2.169a47.865 47.865 0 0 0 1.134-.175 2.31 2.31 0 0 1 1.64-1.055l.822 1.316a2.192 2.192 0 0 0 1.736 1.039 48.774 48.774 0 0 0 5.232 0 2.192 2.192 0 0 0 1.736-1.039l.821-1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
  </svg>
);


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
