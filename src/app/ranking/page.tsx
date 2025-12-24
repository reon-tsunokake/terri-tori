'use client';

// Prevent static prerendering for this page because it uses client-side
// navigation hooks and URL search params. Force dynamic rendering.
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
// 相対パスの修正: src/app/ranking/ から src/ は2階層上 (../../)
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import useRequireAuth from '@/hooks/useRequireAuth';
import Header from '../../components/layout/Header';
import BottomNavigation from '../../components/layout/BottomNavigation';
import { PostDocument, UserDocument } from '../../types/firestore';
import { getMunicipalityName } from '../../utils/location';
import { checkIfUserLiked } from '../../services/likeService';
import LikeButton from '../../components/LikeButton/LikeButton';

// 軽量データ（ソート・フィルタ用）
type LightPostData = {
  id: string;
  likesCount: number;
  regionId?: string;
  seasonId?: string;
  userId?: string;
  imageUrl?: string;
};

// ランキング表示用に型を拡張（詳細データ）
type RankingPostData = LightPostData & {
  locationName?: string; // 市区町村名
  author?: {
    displayName?: string;
    photoURL?: string;
    uid?: string;
  };
  isLiked?: boolean; // ログインユーザーがいいねしているか
  isDetailLoaded?: boolean; // 詳細データ読み込み済みフラグ
};

export default function RankingPage() {
  const router = useRouter();
  // 未ログインならリダイレクト
  const { user } = useRequireAuth(true);
  
  // 軽量データ（全件）
  const [lightPosts, setLightPosts] = useState<LightPostData[]>([]);
  // 詳細データキャッシュ
  const [detailCache, setDetailCache] = useState<Map<string, Partial<RankingPostData>>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(10); // 無限スクロール用

  // フィルター状態
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  
  // 地域名キャッシュ（フィルター用）
  const [regionNameCache, setRegionNameCache] = useState<Map<string, string>>(new Map());

  // 初期フィルタ（マップの詳細から渡されたクエリを反映）
  useEffect(() => {
    const applyQueryFilters = async () => {
      // ウィンドウが定義されている場合のみクライアント側で実行
      if (typeof window === 'undefined') return;
      
      const params = new URLSearchParams(window.location.search);
      const areaId = params.get('areaId');
      const areaName = params.get('areaName');
      const seasonId = params.get('seasonId');

      if (areaName) {
        setSelectedMunicipality(decodeURIComponent(areaName));
      } else if (areaId) {
        // areaId が渡され、かつ地域名が未提供の場合は getMunicipalityName で取得を試みる
        try {
          const name = await getMunicipalityName(areaId);
          if (name) setSelectedMunicipality(name);
        } catch (e) {
          console.error('Failed to resolve areaId to name:', e);
        }
      }

      if (seasonId) {
        setSelectedSeason(decodeURIComponent(seasonId));
      }
    };

    applyQueryFilters();
    // マウント時のみ実行（URLの初期パラメータを反映）
  }, []);

  // 無限スクロールのハンドリング
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

      // ページの底に近づいたら追加読み込み
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setDisplayCount(prev => prev + 10);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // フィルター変更時にdisplayCountをリセット
  useEffect(() => {
    setDisplayCount(10);
  }, [selectedMunicipality, selectedSeason]);

  // --- 軽量データ取得（初回読み込み） ---
  useEffect(() => {
    const fetchLightPosts = async () => {
      try {
        // likesCount降順で取得（Firestoreでソート）
        const q = query(collection(db, 'posts'), orderBy('likesCount', 'desc'));
        const querySnapshot = await getDocs(q);

        const posts: LightPostData[] = querySnapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data() as PostDocument;
          return {
            id: docSnapshot.id,
            likesCount: data.likesCount || 0,
            regionId: data.regionId,
            seasonId: data.seasonId,
            userId: data.userId,
            imageUrl: data.imageUrl,
          };
        });

        setLightPosts(posts);
        
        // 地域名キャッシュを `regions` コレクションから取得（regions/{regionId}.name）
        try {
          const regionsSnapshot = await getDocs(collection(db, 'regions'));
          const newRegionCache = new Map<string, string>();
          regionsSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (data && data.name) {
              newRegionCache.set(docSnap.id, data.name);
            }
          });
          setRegionNameCache(newRegionCache);
        } catch (e) {
          console.error('Failed to fetch regions collection:', e);
          // フォールバック: 投稿から名前を解決
          const regionIds = [...new Set(posts.map(p => p.regionId).filter(Boolean))] as string[];
          const newRegionCache = new Map<string, string>();
          await Promise.all(
            regionIds.map(async (regionId) => {
              const name = await getMunicipalityName(regionId);
              if (name) newRegionCache.set(regionId, name);
            })
          );
          setRegionNameCache(newRegionCache);
        }
      } catch (error) {
        console.error("Error fetching ranking data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLightPosts();
  }, []); // 初回のみ実行

  // --- ランキングデータの生成（軽量データベース） ---
  const rankingData = useMemo(() => {
    let result = [...lightPosts];

    // 1. 地域フィルタ
    if (selectedMunicipality !== 'all') {
      result = result.filter(p => {
        const locationName = p.regionId ? regionNameCache.get(p.regionId) : undefined;
        return locationName === selectedMunicipality;
      });
    }

    // 2. シーズンフィルタ
    if (selectedSeason !== 'all') {
      result = result.filter(p => p.seasonId === selectedSeason);
    }

    // 3. いいね数で降順ソート（既にFirestoreでソート済みだが念のため）
    result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));

    // 4. 上位100件に絞る
    return result.slice(0, 100);
  }, [lightPosts, selectedMunicipality, selectedSeason, regionNameCache]);

  // --- 表示分の詳細データを遅延読み込み ---
  useEffect(() => {
    const fetchDetails = async () => {
      // フィルタ・ソート済みの表示対象IDを取得
      const displayedIds = rankingData.slice(0, displayCount).map(p => p.id);
      // まだ詳細がキャッシュされていないものを抽出
      const idsToFetch = displayedIds.filter(id => !detailCache.has(id));
      
      if (idsToFetch.length === 0) return;
      
      setDetailLoading(true);
      
      // ユーザーデータのキャッシュ
      const userCache = new Map<string, UserDocument>();
      const newDetails = new Map<string, Partial<RankingPostData>>();
      
      await Promise.all(
        idsToFetch.map(async (postId) => {
          const post = lightPosts.find(p => p.id === postId);
          if (!post) return;
          
          // ユーザー情報の取得
          let authorData = { displayName: 'Unknown User', photoURL: '', uid: post.userId };
          if (post.userId) {
            if (userCache.has(post.userId)) {
              const cachedUser = userCache.get(post.userId);
              if (cachedUser) {
                authorData = {
                  displayName: cachedUser.displayName,
                  photoURL: cachedUser.photoURL || '',
                  uid: cachedUser.uid
                };
              }
            } else {
              try {
                const userDocRef = doc(db, 'users', post.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data() as UserDocument;
                  userCache.set(post.userId, userData);
                  authorData = {
                    displayName: userData.displayName,
                    photoURL: userData.photoURL || '',
                    uid: userData.uid
                  };
                }
              } catch (e) {
                console.error(`Error fetching user ${post.userId}:`, e);
              }
            }
          }

          // 場所情報はキャッシュから取得
          const locationName = post.regionId ? regionNameCache.get(post.regionId) || 'Unknown Location' : 'Unknown Location';

          // いいね状態の取得
          let isLiked = false;
          if (user) {
            try {
              isLiked = await checkIfUserLiked(postId, user.uid);
            } catch (e) {
              console.error(`Error checking like status for ${postId}:`, e);
            }
          }

          newDetails.set(postId, {
            author: authorData,
            locationName,
            isLiked,
            isDetailLoaded: true,
          });
        })
      );
      
      setDetailCache(prev => {
        const updated = new Map(prev);
        newDetails.forEach((value, key) => updated.set(key, value));
        return updated;
      });
      setDetailLoading(false);
    };

    if (lightPosts.length > 0 && regionNameCache.size > 0) {
      fetchDetails();
    }
  }, [rankingData, displayCount, user, regionNameCache, detailCache, lightPosts]);

  // --- いいねハンドラ ---
  const handleLike = async (postId: string, currentIsLiked: boolean) => {
    if (!user) {
      alert('いいねするにはログインが必要です');
      return;
    }

    // 楽観的UI更新（軽量データを更新）
    setLightPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likesCount: currentIsLiked ? (post.likesCount - 1) : (post.likesCount + 1)
        };
      }
      return post;
    }));
    
    // 詳細キャッシュも更新
    setDetailCache(prev => {
      const updated = new Map(prev);
      const existing = updated.get(postId);
      if (existing) {
        updated.set(postId, { ...existing, isLiked: !currentIsLiked });
      }
      return updated;
    });

    try {
      const { toggleLike } = await import('../../services/likeService');
      await toggleLike(postId, user.uid, currentIsLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      // エラー時は元に戻す
      setLightPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likesCount: currentIsLiked ? (post.likesCount + 1) : (post.likesCount - 1)
          };
        }
        return post;
      }));
      setDetailCache(prev => {
        const updated = new Map(prev);
        const existing = updated.get(postId);
        if (existing) {
          updated.set(postId, { ...existing, isLiked: currentIsLiked });
        }
        return updated;
      });
      alert('いいねの更新に失敗しました');
    }
  };

  // --- フィルター選択肢の生成 ---
  const municipalityOptions = useMemo(() => {
    const set = new Set<string>();
    regionNameCache.forEach((name) => {
      if (name && name !== 'Unknown Location') {
        set.add(name);
      }
    });
    return Array.from(set).sort();
  }, [regionNameCache]);

  const seasonOptions = useMemo(() => {
    const set = new Set<string>();
    lightPosts.forEach(p => {
      if (p.seasonId) set.add(p.seasonId);
    });
    return Array.from(set).sort().reverse();
  }, [lightPosts]);

  // 表示するランキングデータ(無限スクロール用) - 詳細データと合成
  const displayedRankingData = useMemo((): RankingPostData[] => {
    return rankingData.slice(0, displayCount).map(post => {
      const detail = detailCache.get(post.id);
      const locationName = post.regionId ? regionNameCache.get(post.regionId) || 'Unknown Location' : 'Unknown Location';
      return {
        ...post,
        locationName,
        author: detail?.author,
        isLiked: detail?.isLiked,
        isDetailLoaded: detail?.isDetailLoaded || false,
      };
    });
  }, [rankingData, displayCount, detailCache, regionNameCache]);

  // 順位バッジのスタイル生成関数
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-400 text-white ring-2 ring-yellow-200 shadow-md"; // 1位
      case 1: return "bg-gray-300 text-gray-700 ring-2 ring-gray-100 shadow-md";   // 2位
      case 2: return "bg-orange-400 text-white ring-2 ring-orange-200 shadow-md";  // 3位
      default: return "bg-gray-100 text-gray-500 font-medium";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="pt-16 max-w-3xl mx-auto">
        {/* --- フィルターバー --- */}
        <div className="sticky top-16 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex space-x-2">
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
            >
              <option value="all">全ての地域</option>
              {municipalityOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
            >
              <option value="all">全ての期間</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- ランキングリスト --- */}
        <div className="px-2 py-4 space-y-2">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : rankingData.length > 0 ? (
            <>
            {displayedRankingData.map((post, index) => {
              const isCurrentUser = user && (post.userId === user.uid);
              const rank = index + 1;
              const isDetailLoaded = post.isDetailLoaded;

              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/post/${post.id}`)}
                  className={`
                    flex items-center bg-white rounded-xl p-3 shadow-sm border
                    transition-all duration-200 cursor-pointer
                    hover:shadow-md hover:scale-[1.01] active:scale-[0.99]
                    ${isCurrentUser ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-100 hover:bg-blue-100' : 'border-gray-100 hover:border-gray-400 hover:bg-gray-50'}
                  `}
                >
                  {/* 1. 順位 */}
                  <div className="flex-shrink-0 w-8 flex justify-center mr-3">
                    <span className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm
                      ${getRankStyle(index)}
                    `}>
                      {rank}
                    </span>
                  </div>

                  {/* 2. アイコン（プロフィールリンク） */}
                  <div 
                    className="flex-shrink-0 mr-3 relative cursor-pointer hover:opacity-80 hover:scale-105 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (post.author?.uid) {
                        router.push(`/profile/${post.author.uid}`);
                      }
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-200 ring-2 ring-transparent hover:ring-rose-300 transition-all">
                      {!isDetailLoaded ? (
                        <div className="w-full h-full animate-pulse bg-gray-300"></div>
                      ) : post.author?.photoURL ? (
                        <img
                          src={post.author.photoURL}
                          alt={post.author.displayName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // デフォルトアイコン
                        <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* 3. 名前 & 場所 */}
                  <div className="flex-1 min-w-0 mr-2">
                    {!isDetailLoaded ? (
                      <>
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {post.author?.displayName || "Unknown User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {post.locationName || "Unknown Location"}
                        </p>
                      </>
                    )}
                  </div>

                  {/* 4. いいね数 */}
                  <div className="flex-shrink-0 text-right mr-4" onClick={(e) => e.stopPropagation()}>
                    <LikeButton
                      isLiked={!!post.isLiked}
                      likesCount={post.likesCount}
                      onClick={() => handleLike(post.id, !!post.isLiked)}
                      showCount={true}
                      className="justify-end"
                    />
                  </div>

                  {/* 5. 写真 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt="Post thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">No img</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {displayedRankingData.length < rankingData.length && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            )}
            </>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <p>ランキングデータがありません</p>
              <p className="text-xs mt-1">条件を変更してみてください</p>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
