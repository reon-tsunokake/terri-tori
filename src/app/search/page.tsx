"use client";

// Prevent static prerendering for this page because it uses client-side
// navigation hooks (`useSearchParams`). Force dynamic rendering so Next
// won't attempt to prerender and will avoid the Suspense-with-CSR error.
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, collectionGroup } from 'firebase/firestore';
// パス解決エラー対策: プロジェクトルートまで戻って src から指定
import { db } from '../../../src/lib/firebase';
import Header from '../../../src/components/layout/Header';
import BottomNavigation from '../../../src/components/layout/BottomNavigation';
import { PostDocument, UserDocument } from '../../../src/types/firestore';
import { UserService } from '../../../src/services/userService';

import useRequireAuth from '@/hooks/useRequireAuth';

// 型定義の補完
type PostData = Omit<PostDocument, 'location'> & {
  id: string;
  location?: {
    municipality?: string;
    prefecture?: string;
    name?: string;
  };
  author?: UserDocument;
};

export default function SearchPage() {
  // 未ログインならリダイレクト
  useRequireAuth(true);
  // --- Query Parameters (read from window on client) ---
  // We avoid `useSearchParams` to prevent Next.js prerender issues.

  // --- State ---
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(18); // 表示する投稿数
  type Region = { id: string; name: string };
  const [regions, setRegions] = useState<Region[]>([]);
  const [seasonList, setSeasonList] = useState<string[]>([]);

  // Filters
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- Data Fetching ---
  useEffect(() => {
    // Read URL search params on client and set initial filters if present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const areaId = params.get('areaId');
      const seasonId = params.get('seasonId');
      if (areaId && areaId !== '') setSelectedMunicipality(decodeURIComponent(areaId));
      if (seasonId && seasonId !== '') setSelectedSeason(decodeURIComponent(seasonId));
    }
    const fetchPosts = async () => {
      try {
        // クエリ: 作成日時の降順で全件取得
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedPosts: PostData[] = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const postData = doc.data() as PostDocument;
            // 投稿者情報を取得
            let author: UserDocument | undefined;
            if (postData.userId) {
              try {
                author = await UserService.getUser(postData.userId) || undefined;
              } catch (error) {
                console.error(`Failed to fetch author for post ${doc.id}:`, error);
              }
            }
            return {
              id: doc.id,
              ...postData,
              author,
            } as PostData;
          })
        );

        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // --- Data Fetching for Regions ---
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const regionsSnapshot = await getDocs(collection(db, 'regions'));
        const list: Region[] = regionsSnapshot.docs
          .map(doc => {
            const data: any = doc.data();
            const name = typeof data.name === 'string' ? data.name : String(doc.id);
            return { id: doc.id, name };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setRegions(list);
      } catch (error) {
        console.error("Error fetching regions:", error);
      }
    };

    fetchRegions();
  }, []);

  // --- Derived Filter Options ---
  const municipalityOptions = useMemo(() => {
    return regions;
  }, [regions]);

  // --- Data Fetching for Seasons ---
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
        const ids = seasonsSnapshot.docs
          .map(doc => doc.data().seasonId)
          .filter((id): id is string => typeof id === 'string')
          .sort()
          .reverse();
        setSeasonList(ids);
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };

    fetchSeasons();
  }, []);

  const seasonOptions = useMemo(() => {
    return seasonList;
  }, [seasonList]);

  // --- Filtering Logic ---
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // 1. 地域フィルタ
    if (selectedMunicipality !== 'all') {
      result = result.filter(post => (post as any).regionId === selectedMunicipality);
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

  // --- Infinite Scroll ---
  useEffect(() => {
    const handleScroll = () => {
      // ページの底に近づいたら次の投稿を読み込む
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      // 底から100px以内に到達したら
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        // まだ表示していない投稿がある場合のみ増やす
        if (displayCount < filteredPosts.length) {
          setDisplayCount(prev => prev + 18);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayCount, filteredPosts.length]);

  // フィルター変更時に表示数をリセット
  useEffect(() => {
    setDisplayCount(18);
  }, [selectedMunicipality, selectedSeason, sortOrder]);

  // 表示する投稿（最初のN件のみ）
  const displayedPosts = useMemo(() => {
    return filteredPosts.slice(0, displayCount);
  }, [filteredPosts, displayCount]);

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
                <option key={m.id} value={m.id}>{m.name}</option>
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
              {displayedPosts.length > 0 ? (
                displayedPosts.map((post) => (
                <a href={`/post/${post.id}`} key={post.id} className="block group">
                  {/* カード全体 */}
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100">
                    {/* 画像エリア */}
                    <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
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
                    </div>
                    {/* 投稿者情報エリア */}
                    <div className="flex items-center gap-2 p-3 bg-white">
                      {post.author?.photoURL ? (
                        <img
                          src={post.author.photoURL}
                          alt={post.author.displayName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                          {post.author?.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-sm text-gray-800 font-medium truncate">
                        {post.author?.displayName || '読み込み中...'}
                      </span>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="col-span-2 sm:col-span-3 py-12 text-center text-gray-500 text-sm">
                条件に一致する投稿がありません
              </div>
            )}
            </div>

            {/* ローディングインジケーター */}
            {displayCount < filteredPosts.length && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
