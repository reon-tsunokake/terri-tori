'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

// Context の型
interface SeasonPostContextType {
  seasonIds: string[]; // ["2025-11", "2025-12", ...]
  currentSeasonId: string | null; // 現在のseasonId
  loading: boolean;
  error: string | null;
}

// 初期値
const initialSeasonPost: SeasonPostContextType = {
  seasonIds: [],
  currentSeasonId: null,
  loading: true,
  error: null,
};

// Context作成
const SeasonPostContext = createContext<SeasonPostContextType>(initialSeasonPost);

// Provider コンポーネント
export const SeasonPostProvider = ({ children }: { children: ReactNode }) => {
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
        
        const allSeasonIds: string[] = [];
        
        // 全てのseasonIdを取得
        seasonsSnapshot.forEach((seasonDoc) => {
          allSeasonIds.push(seasonDoc.id);
        });
        
        // seasonIdをソート（降順: 新しい順）
        allSeasonIds.sort((a, b) => b.localeCompare(a));
        
        setSeasonIds(allSeasonIds);
        // 最新のseasonIdを現在のseasonIdとして設定
        if (allSeasonIds.length > 0) {
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
    <SeasonPostContext.Provider value={{ seasonIds, currentSeasonId, loading, error }}>
      {children}
    </SeasonPostContext.Provider>
  );
};

// カスタムフック
export const useSeasonPost = () => useContext(SeasonPostContext);
