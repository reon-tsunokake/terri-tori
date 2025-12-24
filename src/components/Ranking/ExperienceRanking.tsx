'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaTrophy, FaMedal, FaStar } from 'react-icons/fa';
import { GiTwoCoins } from 'react-icons/gi';
import { RankingService } from '@/services/rankingService';
import { UserRankingData } from '@/types/ranking';

export default function ExperienceRanking() {
  const router = useRouter();
  const [rankingData, setRankingData] = useState<UserRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);

  // 初期データ取得
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const data = await RankingService.getUserRankingByExperience(100);
        setRankingData(data);
      } catch (error) {
        console.error('Error fetching experience ranking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  // 無限スクロール
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setDisplayCount((prev) => Math.min(prev + 10, rankingData.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [rankingData.length]);

  // ユーザープロフィールへ遷移
  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

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
    return "bg-gradient-to-r from-white via-blue-50/30 to-white border border-indigo-100 shadow-lg";
  };

  // レベルに応じたバッジデザイン
  const getLevelBadgeStyle = (level: number) => {
    if (level >= 1000) {
      return {
        container: "relative group",
        glow: "absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-full blur-lg opacity-90 group-hover:opacity-100 transition-opacity animate-pulse",
        badge: "relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-4 py-2 rounded-full text-sm font-black shadow-2xl ring-4 ring-purple-300",
        text: "drop-shadow-[0_2px_8px_rgba(168,85,247,0.8)]"
      };
    }
    if (level >= 500) {
      return {
        container: "relative group",
        glow: "absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full blur-md opacity-80 group-hover:opacity-100 transition-opacity",
        badge: "relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl ring-2 ring-indigo-300",
        text: "drop-shadow-[0_2px_6px_rgba(99,102,241,0.7)]"
      };
    }
    if (level >= 300) {
      return {
        container: "relative group",
        glow: "absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity",
        badge: "relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl ring-2 ring-blue-300",
        text: "drop-shadow-md"
      };
    }
    if (level >= 100) {
      return {
        container: "relative group",
        glow: "absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-md opacity-70 group-hover:opacity-90 transition-opacity",
        badge: "relative bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg ring-1 ring-emerald-300",
        text: "drop-shadow-md"
      };
    }
    if (level >= 80) {
      return {
        container: "relative group",
        glow: "absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-sm opacity-60 group-hover:opacity-80 transition-opacity",
        badge: "relative bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg",
        text: "drop-shadow"
      };
    }
    if (level >= 50) {
      return {
        container: "relative",
        glow: "absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-sm opacity-50",
        badge: "relative bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md",
        text: "drop-shadow"
      };
    }
    if (level >= 30) {
      return {
        container: "relative",
        glow: "absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full blur-sm opacity-40",
        badge: "relative bg-gradient-to-r from-yellow-400 to-amber-400 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md",
        text: ""
      };
    }
    if (level >= 10) {
      return {
        container: "relative",
        glow: "",
        badge: "bg-gradient-to-r from-lime-400 to-green-400 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow",
        text: ""
      };
    }
    // レベル10未満
    return {
      container: "relative",
      glow: "",
      badge: "bg-gradient-to-r from-gray-400 to-slate-400 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow",
      text: ""
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (rankingData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        ランキングデータがありません
      </div>
    );
  }

  return (
    <div className="px-2 space-y-3 pb-24">
      {rankingData.slice(0, displayCount).map((user, index) => {
        const rank = index + 1;
        const isTopThree = index < 3;

        return (
          <div
            key={user.uid}
            onClick={() => handleUserClick(user.uid)}
            className={`
              flex items-center rounded-2xl p-4 transition-all duration-300 cursor-pointer
              hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]
              ${getCardStyle(index)}
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

            {/* ユーザーアイコン */}
            <div className="flex-shrink-0 mr-4 relative">
              <div className={`w-12 h-12 rounded-full overflow-hidden border-3 ${
                isTopThree ? 'ring-4 ring-offset-2' : 'ring-2'
              } ${
                index === 0 ? 'ring-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/50' :
                index === 1 ? 'ring-gray-400 border-gray-300 shadow-lg shadow-gray-400/50' :
                index === 2 ? 'ring-orange-400 border-orange-300 shadow-lg shadow-orange-400/50' :
                'ring-indigo-200 border-indigo-200'
              }`}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* ユーザー情報 */}
            <div className="flex-1 min-w-0 mr-3">
              <p className={`text-base font-bold truncate ${
                isTopThree ? 'text-transparent bg-clip-text bg-gradient-to-r' : 'text-gray-900'
              } ${
                index === 0 ? 'from-yellow-600 via-amber-600 to-yellow-700' :
                index === 1 ? 'from-gray-600 via-slate-600 to-gray-700' :
                index === 2 ? 'from-orange-600 via-red-600 to-orange-700' : ''
              }`}>
                {user.displayName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <GiTwoCoins className="text-amber-500 text-sm" />
                <p className="text-xs font-semibold text-indigo-600 truncate">
                  {user.experience.toLocaleString()} EXP
                </p>
              </div>
            </div>

            {/* レベルバッジ */}
            <div className="flex-shrink-0">
              {(() => {
                const levelStyle = getLevelBadgeStyle(user.level);
                return (
                  <div className={levelStyle.container}>
                    {levelStyle.glow && <div className={levelStyle.glow}></div>}
                    <div className={levelStyle.badge}>
                      <span className={levelStyle.text}>Lv.{user.level}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })}

      {/* もっと読み込む表示 */}
      {displayCount < rankingData.length && (
        <div className="text-center py-4 text-gray-500 text-sm">
          スクロールして続きを表示...
        </div>
      )}
    </div>
  );
}
