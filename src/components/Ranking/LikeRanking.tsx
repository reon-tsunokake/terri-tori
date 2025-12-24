'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PostDocument, UserDocument } from '@/types/firestore';
import { getMunicipalityName } from '@/utils/location';
import { checkIfUserLiked } from '@/services/likeService';
import LikeButton from '@/components/LikeButton/LikeButton';

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
  locationName?: string;
  author?: {
    displayName?: string;
    photoURL?: string;
    uid?: string;
  };
  isLiked?: boolean;
  isDetailLoaded?: boolean;
};

export default function LikeRanking() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [lightPosts, setLightPosts] = useState<LightPostData[]>([]);
  const [detailCache, setDetailCache] = useState<Map<string, Partial<RankingPostData>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [regionNameCache, setRegionNameCache] = useState<Map<string, string>>(new Map());

  // 初期フィルタ（マップの詳細から渡されたクエリを反映）
  useEffect(() => {
    const applyQueryFilters = async () => {
      if (typeof window === 'undefined') return;
      
      const params = new URLSearchParams(window.location.search);
      const areaId = params.get('areaId');
      const areaName = params.get('areaName');
      const seasonId = params.get('seasonId');

      if (areaName) {
        setSelectedMunicipality(decodeURIComponent(areaName));
      } else if (areaId) {
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
  }, []);

  // 無限スクロール
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

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

  // 軽量データ取得
  useEffect(() => {
    const fetchLightPosts = async () => {
      try {
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
  }, []);

  // ランキングデータの生成
  const rankingData = useMemo(() => {
    let result = [...lightPosts];

    if (selectedMunicipality !== 'all') {
      result = result.filter(p => {
        const locationName = p.regionId ? regionNameCache.get(p.regionId) : undefined;
        return locationName === selectedMunicipality;
      });
    }

    if (selectedSeason !== 'all') {
      result = result.filter(p => p.seasonId === selectedSeason);
    }

    result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    return result.slice(0, 100);
  }, [lightPosts, selectedMunicipality, selectedSeason, regionNameCache]);

  // 表示分の詳細データを遅延読み込み
  useEffect(() => {
    const fetchDetails = async () => {
      const displayedIds = rankingData.slice(0, displayCount).map(p => p.id);
      const idsToFetch = displayedIds.filter(id => !detailCache.has(id));
      
      if (idsToFetch.length === 0) return;
      
      setDetailLoading(true);
      
      const userCache = new Map<string, UserDocument>();
      const newDetails = new Map<string, Partial<RankingPostData>>();
      
      await Promise.all(
        idsToFetch.map(async (postId) => {
          const post = lightPosts.find(p => p.id === postId);
          if (!post) return;
          
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

          const locationName = post.regionId ? regionNameCache.get(post.regionId) || 'Unknown Location' : 'Unknown Location';

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

  // いいねハンドラ
  const handleLike = async (postId: string, currentIsLiked: boolean) => {
    if (!user) {
      alert('いいねするにはログインが必要です');
      return;
    }

    setLightPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likesCount: currentIsLiked ? (post.likesCount - 1) : (post.likesCount + 1)
        };
      }
      return post;
    }));
    
    setDetailCache(prev => {
      const updated = new Map(prev);
      const existing = updated.get(postId);
      if (existing) {
        updated.set(postId, { ...existing, isLiked: !currentIsLiked });
      }
      return updated;
    });

    try {
      const { toggleLike } = await import('@/services/likeService');
      await toggleLike(postId, user.uid, currentIsLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
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

  // フィルター選択肢の生成
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

  // 表示するランキングデータ
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

  // 順位スタイル（豪華版）
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-white ring-4 ring-yellow-200 shadow-xl shadow-yellow-500/50 animate-pulse";
      case 1: return "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 text-white ring-4 ring-gray-200 shadow-xl shadow-gray-400/50";
      case 2: return "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 text-white ring-4 ring-orange-200 shadow-xl shadow-orange-400/50";
      default: return "bg-gradient-to-br from-blue-50 to-indigo-50 text-gray-700 font-medium border border-indigo-100";
    }
  };

  // カードのグラデーション背景
  const getCardStyle = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-2 border-yellow-300 shadow-xl shadow-yellow-500/20";
    if (index === 1) return "bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-2 border-gray-300 shadow-xl shadow-gray-400/20";
    if (index === 2) return "bg-gradient-to-r from-orange-50 via-red-50 to-orange-50 border-2 border-orange-300 shadow-xl shadow-orange-400/20";
    return "bg-gradient-to-r from-white via-rose-50/30 to-white border border-rose-100 shadow-lg";
  };

  return (
    <div className="w-full">
      {/* フィルターバー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm mb-4">
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

      {/* ランキングリスト */}
      <div className="px-2 space-y-2 pb-24">
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

              const isTopThree = index < 3;

              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/post/${post.id}`)}
                  className={`
                    flex items-center rounded-2xl p-4 transition-all duration-300 cursor-pointer
                    hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]
                    ${isCurrentUser ? 'bg-gradient-to-r from-blue-100 via-indigo-50 to-blue-100 border-2 border-blue-400 ring-2 ring-blue-200 shadow-xl shadow-blue-500/20' : getCardStyle(index)}
                    ${isTopThree ? 'transform hover:-translate-y-1' : ''}
                  `}
                >
                  {/* 順位 */}
                  <div className="flex-shrink-0 w-10 flex justify-center mr-4">
                    <span className={`
                      w-10 h-10 flex items-center justify-center rounded-full text-base font-bold
                      ${getRankStyle(index)}
                    `}>
                      {rank}
                    </span>
                  </div>

                  {/* アイコン */}
                  <div 
                    className="flex-shrink-0 mr-4 relative cursor-pointer hover:opacity-90 hover:scale-110 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (post.author?.uid) {
                        router.push(`/profile/${post.author.uid}`);
                      }
                    }}
                  >
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-3 ${
                      isTopThree ? 'ring-4 ring-offset-2' : 'ring-2'
                    } ${
                      index === 0 ? 'ring-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/50' :
                      index === 1 ? 'ring-gray-400 border-gray-300 shadow-lg shadow-gray-400/50' :
                      index === 2 ? 'ring-orange-400 border-orange-300 shadow-lg shadow-orange-400/50' :
                      'ring-rose-200 border-rose-200 hover:ring-rose-400 transition-all'
                    }`}>
                      {!isDetailLoaded ? (
                        <div className="w-full h-full animate-pulse bg-gray-300"></div>
                      ) : post.author?.photoURL ? (
                        <img
                          src={post.author.photoURL}
                          alt={post.author.displayName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* 名前 & 場所 */}
                  <div className="flex-1 min-w-0 mr-3">
                    {!isDetailLoaded ? (
                      <>
                        <div className="h-5 w-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mb-1"></div>
                        <div className="h-4 w-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
                      </>
                    ) : (
                      <>
                        <p className={`text-base font-bold truncate ${
                          isTopThree ? 'text-transparent bg-clip-text bg-gradient-to-r' : 'text-gray-900'
                        } ${
                          index === 0 ? 'from-yellow-600 via-amber-600 to-yellow-700' :
                          index === 1 ? 'from-gray-600 via-slate-600 to-gray-700' :
                          index === 2 ? 'from-orange-600 via-red-600 to-orange-700' : ''
                        }`}>
                          {post.author?.displayName || "Unknown User"}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <FaMapMarkerAlt className="text-rose-500 text-xs" />
                          <p className="text-xs font-medium text-gray-600 truncate">
                            {post.locationName || "Unknown Location"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* いいね数 */}
                  <div className="flex-shrink-0 text-right mr-4" onClick={(e) => e.stopPropagation()}>
                    <LikeButton
                      isLiked={!!post.isLiked}
                      likesCount={post.likesCount}
                      onClick={() => handleLike(post.id, !!post.isLiked)}
                      showCount={true}
                      className="justify-end"
                    />
                  </div>

                  {/* 写真 */}
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
    </div>
  );
}
