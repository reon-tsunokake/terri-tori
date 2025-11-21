'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

// Seasonの型
interface Season {
  seasonId: string;
  isCurrent: boolean;
}

// Context の型
interface SeasonPostContextType {
  seasons: Season[]; // seasonの配列
  seasonIds: string[]; // ["2025-11", "2025-12", ...]
  currentSeasonId: string | null; // 現在のseasonId (isCurrent=trueのもの)
  loading: boolean;
  error: string | null;
}

// 初期値
const initialSeasonPost: SeasonPostContextType = {
  seasons: [],
  seasonIds: [],
  currentSeasonId: null,
  loading: true,
  error: null,
};

// Context作成
const SeasonPostContext = createContext<SeasonPostContextType>(initialSeasonPost);

// Provider コンポーネント
export const SeasonPostProvider = ({ children }: { children: ReactNode }) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonIds, setSeasonIds] = useState<string[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeasonIds = async () => {
      try {
        setLoading(true);
        const seasonsRef = collection(db, "seasons");
        const seasonsSnapshot = await getDocs(seasonsRef);
        
        const allSeasons: Season[] = [];
        const allSeasonIds: string[] = [];
        let currentId: string | null = null;
        
        // 全てのseasonデータを取得
        seasonsSnapshot.forEach((seasonDoc) => {
          const data = seasonDoc.data();
          const season: Season = {
            seasonId: seasonDoc.id,
            isCurrent: data.isCurrent || false,
          };
          
          allSeasons.push(season);
          allSeasonIds.push(seasonDoc.id);
          
          // isCurrent=trueのseasonを現在のseasonIdとして設定
          if (data.isCurrent === true) {
            currentId = seasonDoc.id;
          }
        });
        
        // seasonIdをソート（降順: 新しい順）
        allSeasonIds.sort((a, b) => b.localeCompare(a));
        allSeasons.sort((a, b) => b.seasonId.localeCompare(a.seasonId));
        
        setSeasons(allSeasons);
        setSeasonIds(allSeasonIds);
        
        // isCurrent=trueが見つからない場合は最新を使用
        if (currentId) {
          setCurrentSeasonId(currentId);
        } else if (allSeasonIds.length > 0) {
          setCurrentSeasonId(allSeasonIds[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error("seasonId取得エラー:", err);
        setError(err instanceof Error ? err.message : "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonIds();
  }, []);

  return (
    <SeasonPostContext.Provider value={{ seasons, seasonIds, currentSeasonId, loading, error }}>
      {children}
    </SeasonPostContext.Provider>
  );
};

// カスタムフック
export const useSeasonPost = () => useContext(SeasonPostContext);
