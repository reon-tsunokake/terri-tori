'use client';

import React, { useState } from 'react';
import { HiCamera } from 'react-icons/hi2';
import PostForm from '@/components/Forms/PostForm';
import { useLocation } from '@/contexts/LocationContext';

/**
 * 写真投稿用フローティングアクションボタン
 * BottomNavigationとは別に、地図画面の右下に表示される
 */
export default function CameraButton() {
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  const { location } = useLocation();

  return (
    <>
      <button
        onClick={() => setIsPostFormOpen(true)}
        className="fixed bottom-24 right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 active:shadow-lg touch-manipulation"
        aria-label="写真を投稿する"
      >
        <HiCamera className="h-8 w-8" />
      </button>

      {/* PostFormモーダル */}
      {isPostFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <PostForm
              initialLatitude={location.latitude}
              initialLongitude={location.longitude}
              onSuccess={() => {
                setIsPostFormOpen(false);
              }}
              onCancel={() => setIsPostFormOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
