'use client';

// Prevent static prerendering for this page
export const dynamic = 'force-dynamic';

import React from 'react';
import useRequireAuth from '@/hooks/useRequireAuth';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import RankingTabs from '@/components/Ranking/RankingTabs';
import LikeRanking from '@/components/Ranking/LikeRanking';
import ExperienceRanking from '@/components/Ranking/ExperienceRanking';

export default function RankingPage() {
  // 未ログインならリダイレクト
  useRequireAuth(true);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="pt-16 max-w-3xl mx-auto">
        <RankingTabs defaultTab="likes">
          {(activeTab) => (
            <>
              {activeTab === 'likes' && <LikeRanking />}
              {activeTab === 'experience' && <ExperienceRanking />}
            </>
          )}
        </RankingTabs>
      </main>

      <BottomNavigation />
    </div>
  );
}
