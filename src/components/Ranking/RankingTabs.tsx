'use client';

import React, { useState } from 'react';

export type RankingTabType = 'likes' | 'experience';

interface RankingTabsProps {
  defaultTab?: RankingTabType;
  onTabChange?: (tab: RankingTabType) => void;
  children: (activeTab: RankingTabType) => React.ReactNode;
}

export default function RankingTabs({ defaultTab = 'likes', onTabChange, children }: RankingTabsProps) {
  const [activeTab, setActiveTab] = useState<RankingTabType>(defaultTab);

  const handleTabChange = (tab: RankingTabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="w-full">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => handleTabChange('likes')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'likes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          いいねランキング
        </button>
        <button
          onClick={() => handleTabChange('experience')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'experience'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          経験値ランキング
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="w-full">
        {children(activeTab)}
      </div>
    </div>
  );
}
