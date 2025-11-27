'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import BottomNavigation from '../../layout/BottomNavigation';
import { PostDocument } from '../../../types/firestore';
import PostDetailContent from './PostDetailContent';
import PostDetailHeader from './PostDetailHeader';

export default function PostDetailPage() {
  const [postId, setPostId] = useState<string | null>(null);
  const [post, setPost] = useState<(PostDocument & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  // ID取得とデータフェッチング
  useEffect(() => {
    // next/navigationの代わりにwindow.locationからIDを取得
    // URL形式: /post/12345 想定
    if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      const idFromUrl = pathSegments[pathSegments.length - 1];
      setPostId(idFromUrl);
    }
  }, []);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as PostDocument & { id: string });
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error getting document:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // 戻るボタンのハンドラ
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-500 mb-4">投稿が見つかりませんでした。</p>
        <button 
          onClick={handleBack}
          className="text-blue-500 hover:underline"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <main>
        <PostDetailContent post={post} onBack={handleBack} />
      </main>
      <BottomNavigation />
    </div>
  );
}

