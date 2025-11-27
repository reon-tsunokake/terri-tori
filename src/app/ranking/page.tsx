'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
// 相対パスの修正: src/app/ranking/ から src/ は2階層上 (../../)
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/layout/Header';
import BottomNavigation from '../../components/layout/BottomNavigation';
import { PostDocument, UserDocument } from '../../types/firestore';
import { getMunicipalityName, getPrefectureName } from '../../utils/location';
import { checkIfUserLiked } from '../../services/likeService';
import LikeButton from '../../components/LikeButton/LikeButton';

// ランキング表示用に型を拡張
type RankingPostData = Omit<PostDocument, 'location'> & {
  id: string;
  locationName?: string; // 市区町村名
  prefectureName?: string; // 都道府県名
  author?: {
    displayName?: string;
    photoURL?: string;
    uid?: string;
  };
  authorId?: string;
  isLiked?: boolean; // ログインユーザーがいいねしているか
}

export default function RankingPage() {
  const { user } = useAuth(); // 現在のログインユーザー
  const [posts, setPosts] = useState<RankingPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10); // 無限スクロール用

  // フィルター状態
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

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

  // --- データ取得 ---
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // 全件取得後にクライアントでソート・フィルタリング
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        // ユーザーデータのキャッシュ
        const userCache = new Map<string, UserDocument>();

        const fetchedPostsPromises = querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as PostDocument;

          // ユーザー情報の取得
          let authorData = { displayName: 'Unknown User', photoURL: '', uid: data.userId };
          if (data.userId) {
            if (userCache.has(data.userId)) {
              const cachedUser = userCache.get(data.userId);
              if (cachedUser) {
                authorData = {
                  displayName: cachedUser.displayName,
                  photoURL: cachedUser.photoURL || '',
                  uid: cachedUser.uid
                };
              }
            } else {
              try {
                const userDocRef = doc(db, 'users', data.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data() as UserDocument;
                  userCache.set(data.userId, userData);
                  authorData = {
                    displayName: userData.displayName,
                    photoURL: userData.photoURL || '',
                    uid: userData.uid
                  };
                }
              } catch (e) {
                console.error(`Error fetching user ${data.userId}:`, e);
              }
            }
          }

          // 場所情報の取得
          let locationName = 'Unknown Location';
          let prefectureName = '';
          if (data.regionId) {
            const municipality = await getMunicipalityName(data.regionId);
            const prefecture = await getPrefectureName(data.regionId);
            if (municipality) locationName = municipality;
            if (prefecture) prefectureName = prefecture;
          }

          // いいね状態の取得
          let isLiked = false;
          if (user) {
            try {
              isLiked = await checkIfUserLiked(docSnapshot.id, user.uid);
            } catch (e) {
              console.error(`Error checking like status for ${docSnapshot.id}:`, e);
            }
          }

          return {
            id: docSnapshot.id,
            ...data,
            likesCount: data.likesCount || 0,
            author: authorData,
            locationName,
            prefectureName,
            isLiked,
          } as RankingPostData;
        });

        const fetchedPosts = await Promise.all(fetchedPostsPromises);
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching ranking data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user]); // userが変わったら再取得（いいね状態更新のため）

  // --- いいねハンドラ ---
  const handleLike = async (postId: string, currentIsLiked: boolean) => {
    if (!user) {
      alert('いいねするにはログインが必要です');
      return;
    }

    // 楽観的UI更新
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !currentIsLiked,
          likesCount: currentIsLiked ? (post.likesCount - 1) : (post.likesCount + 1)
        };
      }
      return post;
    }));

    try {
      const { toggleLike } = await import('../../services/likeService');
      await toggleLike(postId, user.uid, currentIsLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      // エラー時は元に戻す
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: currentIsLiked,
            likesCount: currentIsLiked ? (post.likesCount + 1) : (post.likesCount - 1)
          };
        }
        return post;
      }));
      alert('いいねの更新に失敗しました');
    }
  };

  // --- フィルター選択肢の生成 ---
  const municipalityOptions = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => {
      if (p.locationName && p.locationName !== 'Unknown Location') {
        set.add(p.locationName);
      }
    });
    return Array.from(set).sort();
  }, [posts]);

  const seasonOptions = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => {
      if (p.seasonId) set.add(p.seasonId);
    });
    return Array.from(set).sort().reverse();
  }, [posts]);

  // --- ランキングデータの生成 ---
  const rankingData = useMemo(() => {
    let result = [...posts];

    // 1. 地域フィルタ
    if (selectedMunicipality !== 'all') {
      result = result.filter(p => p.locationName === selectedMunicipality);
    }

    // 2. シーズンフィルタ
    if (selectedSeason !== 'all') {
      result = result.filter(p => p.seasonId === selectedSeason);
    }

    // 3. いいね数で降順ソート
    result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));

    // 4. 上位100件に絞る
    return result.slice(0, 100);
  }, [posts, selectedMunicipality, selectedSeason]);

  // 表示するランキングデータ(無限スクロール用)
  const displayedRankingData = useMemo(() => {
    return rankingData.slice(0, displayCount);
  }, [rankingData, displayCount]);

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
              const isCurrentUser = user && (post.authorId === user.uid);
              const rank = index + 1;

              return (
                <div
                  key={post.id}
                  className={`
                    flex items-center bg-white rounded-xl p-3 shadow-sm border
                    transition-all duration-200
                    ${isCurrentUser ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-100' : 'border-gray-100 hover:border-gray-300'}
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

                  {/* 2. アイコン (ダミーリンク) */}
                  <a href="#" className="flex-shrink-0 mr-3 relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                      {post.author?.photoURL ? (
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
                  </a>

                  {/* 3. 名前 & 場所 */}
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {post.author?.displayName || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {post.locationName || "Unknown Location"}
                    </p>
                  </div>

                  {/* 4. いいね数 */}
                  <div className="flex-shrink-0 text-right mr-4">
                    <LikeButton
                      isLiked={!!post.isLiked}
                      likesCount={post.likesCount}
                      onClick={() => handleLike(post.id, !!post.isLiked)}
                      showCount={true}
                      className="justify-end"
                    />
                  </div>

                  {/* 5. 写真 (クリックで詳細へ) */}
                  <a href={`/post/${post.id}`} className="flex-shrink-0 block hover:opacity-80 transition-opacity">
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
                  </a>
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
