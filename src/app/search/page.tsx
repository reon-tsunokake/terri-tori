'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
// パス解決エラー対策: プロジェクトルートまで戻って src から指定
import { db } from '../../../src/lib/firebase';
import Header from '../../../src/components/layout/Header';
import BottomNavigation from '../../../src/components/layout/BottomNavigation';
import { PostDocument } from '../../../src/types/firestore';

// 型定義の補完
type PostData = Omit<PostDocument, 'location'> & {
  id: string;
  location?: {
    municipality?: string;
    prefecture?: string;
    name?: string;
  };
};

export default function SearchPage() {
  // --- State ---
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- Data Fetching ---
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // クエリ: 作成日時の降順で全件取得
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedPosts: PostData[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as PostData));

        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // --- Derived Filter Options ---
  const municipalityOptions = useMemo(() => {
    const municipalities = new Set<string>();
    posts.forEach(post => {
      if (post.location?.municipality) {
        municipalities.add(post.location.municipality);
      }
    });
    return Array.from(municipalities).sort();
  }, [posts]);

  const seasonOptions = useMemo(() => {
    const seasons = new Set<string>();
    posts.forEach(post => {
      if (post.seasonId) {
        seasons.add(post.seasonId);
      }
    });
    return Array.from(seasons).sort().reverse();
  }, [posts]);

  // --- Filtering Logic ---
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // 1. 地域フィルタ
    if (selectedMunicipality !== 'all') {
      result = result.filter(post => post.location?.municipality === selectedMunicipality);
    }

    // 2. シーズンフィルタ
    if (selectedSeason !== 'all') {
      result = result.filter(post => post.seasonId === selectedSeason);
    }

    // 3. 並び替え (いいね数)
    result.sort((a, b) => {
      const likesA = a.likesCount || 0;
      const likesB = b.likesCount || 0;
      return sortOrder === 'asc' ? likesA - likesB : likesB - likesA;
    });

    return result;
  }, [posts, selectedMunicipality, selectedSeason, sortOrder]);

  return (
    <div className="min-h-screen bg-white pb-20">
      <Header />
      
      <main className="pt-16">
        {/* --- Filter Bar --- */}
        <div className="sticky top-16 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {/* Region Filter */}
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="all">全ての地域</option>
              {municipalityOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Season Filter */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="all">全てのシーズン</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex justify-end items-center space-x-2 text-xs text-gray-500">
            <span>並び替え (いいね数):</span>
            <button
              onClick={() => setSortOrder('desc')}
              className={`px-3 py-1 rounded-full border ${sortOrder === 'desc' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}
            >
              多い順
            </button>
            <button
              onClick={() => setSortOrder('asc')}
              className={`px-3 py-1 rounded-full border ${sortOrder === 'asc' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}
            >
              少ない順
            </button>
          </div>
        </div>

        {/* --- Photo Grid --- */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <a href={`/post/${post.id}`} key={post.id} className="relative aspect-square w-full overflow-hidden bg-gray-100 group block">
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={`Post in ${post.location?.municipality || 'unknown location'}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300 text-xs">
                      No Image
                    </div>
                  )}
                  {post.seasonId && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium text-center truncate">
                        {post.seasonId}
                      </p>
                    </div>
                  )}
                </a>
              ))
            ) : (
              <div className="col-span-3 py-12 text-center text-gray-500 text-sm">
                条件に一致する投稿がありません
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
