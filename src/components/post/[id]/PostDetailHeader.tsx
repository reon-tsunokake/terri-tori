'use client';

import React from 'react';

interface PostDetailHeaderProps {
  onBack?: () => void;
  title?: string;
}

export default function PostDetailHeader({ onBack, title = '投稿詳細' }: PostDetailHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white h-16 border-b border-gray-200 z-50 flex items-center px-4">
      <button onClick={handleBack} className="p-2 -ml-2 mr-2 text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <h1 className="text-lg font-bold text-gray-800">{title}</h1>
    </header>
  );
}

