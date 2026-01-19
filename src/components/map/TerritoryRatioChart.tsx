'use client';

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HiChartBar, HiChevronUp, HiChevronDown } from 'react-icons/hi2';

type AreaRef = {
    userId: string;
    displayName: string;
    photoUrl?: string;
    totalArea: number;
    ratio: number;
};

type Params = {
    seasonId: string;
    groupId: number;
    bottomOffset?: string; // e.g. "64px" to sit above bottom nav
};

/**
 * カラーパレット (Tailwind Colorsの近似値)
 * 順位（インデックス）に基づいて色を選択する
 */
const CHART_COLORS = [
    '#f43f5e', // rose-500
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#a855f7', // purple-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#10b981', // emerald-500
];

export default function TerritoryRatioChart({ seasonId, groupId, topOffset = '2rem' }: { seasonId: string; groupId: number; topOffset?: string }) {
    const [data, setData] = useState<AreaRef[]>([]);
    const [totalArea, setTotalArea] = useState<number>(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!seasonId || !groupId) return;

        const groupDocRef = doc(db, 'seasons', seasonId, 'groups', String(groupId));

        const unsubscribe = onSnapshot(groupDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const stats = docSnap.data().stats;
                if (stats && stats.areaDistribution) {
                    const sortedDist = (stats.areaDistribution as AreaRef[]).sort((a, b) => b.totalArea - a.totalArea);
                    setData(sortedDist);
                    setTotalArea(stats.totalGroupArea || 0);
                } else {
                    setData([]);
                    setTotalArea(0);
                }
            } else {
                setData([]);
                setTotalArea(0);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching area stats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [seasonId, groupId]);

    // 展開パネルの開閉 (データがある場合のみ)
    const toggleExpand = () => {
        if (data.length > 0 && totalArea > 0) {
            setIsExpanded(!isExpanded);
        }
    };

    const hasData = data.length > 0 && totalArea > 0;

    return (
        <div
            className={`fixed left-0 right-0 z-20 flex flex-col items-center transition-all duration-300 ease-out`}
            style={{
                top: topOffset,
            }}
        >
            {/* メインカードコンテナ (Unified Card - Top Anchor) */}
            <div
                onClick={toggleExpand}
                className={`w-full bg-white/95 backdrop-blur-md rounded-b-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-b border-rose-100 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${hasData ? 'cursor-pointer' : 'opacity-80'
                    }`}
            >
                {/* ヘッダータイトル (常に表示) */}
                <div className="px-4 py-2 border-b border-rose-50 flex justify-between items-center bg-white/40">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <HiChartBar className="text-rose-500" />
                        エリア獲得状況
                    </h3>
                    <span className="text-xs text-gray-500 font-mono">Total: {totalArea.toLocaleString()} km²</span>
                </div>

                {/* グラフバー (ヘッダーとして機能 - Top) */}
                <div className="w-full h-16 relative flex border-b border-rose-50">
                    {hasData ? (
                        <>
                            {data.map((item, index) => {
                                const isLarge = item.ratio > 15;   // Avatar + Name + %
                                const isMedium = item.ratio > 8;   // Avatar + %
                                const isSmall = item.ratio > 4;    // % only (< 4%は表示なし)

                                return (
                                    <div
                                        key={item.userId}
                                        className="h-full relative flex flex-col items-center justify-center overflow-hidden transition-all duration-500 group/bar"
                                        style={{
                                            width: `${item.ratio}%`,
                                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                        }}
                                    >
                                        {/* データ表示 */}
                                        <div className={`flex items-center justify-center animate-in fade-in zoom-in duration-500 scale-90 w-full ${isLarge ? 'flex-row gap-1.5' : 'flex-col gap-0.5'}`}>
                                            {/* Avatar (Medium以上) */}
                                            {(isMedium) && (
                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/40 shadow-sm overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                                                    {item.photoUrl ? (
                                                        <img
                                                            src={item.photoUrl}
                                                            alt={item.displayName}
                                                            className="w-full h-full object-cover opacity-90"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-white leading-none">
                                                            {item.displayName.slice(0, 1)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Text Info Container */}
                                            {(isSmall) && (
                                                <div className={`flex flex-col ${isLarge ? 'items-start text-left min-w-0 flex-1' : 'items-center text-center w-full'}`}>
                                                    {/* Name (Largeのみ) */}
                                                    {isLarge && (
                                                        <span className="text-white text-xs sm:text-sm font-bold drop-shadow-md whitespace-nowrap truncate w-full opacity-100 leading-tight block">
                                                            {item.displayName}
                                                        </span>
                                                    )}

                                                    {/* Percentage (Small以上なら表示) */}
                                                    <span className={`text-white font-bold drop-shadow-md opacity-100 leading-tight ${isLarge ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
                                                        {item.ratio.toFixed(0)}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="text-xs text-gray-400 font-medium animate-pulse">
                                データ集計中...
                            </span>
                        </div>
                    )}
                </div>

                {/* 詳細パネル (下方向へ展開) */}
                <div
                    className={`nav-content transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'max-h-80 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                        }`}
                >
                    <div className="px-4 pt-2 pb-1 space-y-3">

                        <div className="space-y-2 overflow-y-auto max-h-52 pr-1 custom-scrollbar">
                            {data.map((item, index) => (
                                <div key={item.userId} className="flex items-center justify-between text-sm group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div
                                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0"
                                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                            >
                                                {item.photoUrl ? (
                                                    <img src={item.photoUrl} alt={item.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white font-bold text-xs">{item.displayName.slice(0, 1)}</span>
                                                )}
                                            </div>
                                            <div
                                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                            >
                                                {index + 1}
                                            </div>
                                        </div>
                                        <span className="text-gray-700 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                                            {item.displayName}
                                        </span>
                                    </div>
                                    <div className="flex items-col gap-0.5 text-right">
                                        <span className="font-bold text-gray-800">{item.ratio.toFixed(1)}%</span>
                                        <span className="text-[10px] text-gray-400">{item.totalArea.toLocaleString()} km²</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 閉じるガイド (パネル内) */}
                        <div className="text-center text-[10px] text-gray-400 mt-2 font-medium opacity-80">
                            タップして閉じる
                        </div>
                    </div>
                </div>

                {/* ドラッグハンドル (Bottom - 常に表示) */}
                <div className="w-full flex justify-center pb-3 pt-1">
                    <div className="w-12 h-1.5 bg-gray-300/60 rounded-full" />
                </div>
            </div>
        </div>
    );
}
