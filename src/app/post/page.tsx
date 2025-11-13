'use client';

import { useState } from 'react';
import PostForm from '@/components/Forms/PostForm';
import { useLocation } from '@/contexts/LocationContext';

export default function PostPage() {
  const [showPostForm, setShowPostForm] = useState(false);
  const { location } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">投稿</h1>
            {/* 位置情報表示 */}
            <div className="flex items-center gap-2 text-sm">
              {location.latitude !== null && location.longitude !== null ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="text-gray-700">
                    <span className="font-medium text-green-600">位置情報取得中</span>
                    <div className="text-xs text-gray-500">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 animate-pulse"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-500">位置情報を取得中...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!showPostForm ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-8">新しい投稿を作成しましょう</p>
            {/* プラスボタン */}
            <button
              onClick={() => setShowPostForm(true)}
              className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transition-all hover:scale-110"
              aria-label="新規投稿"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <PostForm
              initialLatitude={location.latitude}
              initialLongitude={location.longitude}
              onSuccess={() => {
                setShowPostForm(false);
                // 投稿成功メッセージを表示するなどの処理
                alert('投稿が完了しました！');
              }}
              onCancel={() => setShowPostForm(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
