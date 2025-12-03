// src/services/mapService.ts
import { FeatureCollection } from 'geojson'; // npm install @types/geojson --save-dev が必要かも
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export class MapService {
  /**
   * 市区町村のGeoJSONデータを取得します。
   */
  public static async getMunicipalitiesGeoJson(): Promise<FeatureCollection> {
    try {
      // 担当Aと合意したGeoJSONのパス
      const response = await fetch('/data/municipalities.geojson'); 
      if (!response.ok) {
        throw new Error('Failed to fetch GeoJSON');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching GeoJSON:', error);
      throw error;
    }
  }

  /**
   * 指定エリアの詳細情報を取得します
   * GeoJSON から市町村名を取得し、ランキング・検索ページへのリンクを返します
   * @param areaId - エリアID
   * @param currentSeasonId - 現在のシーズンID (オプション。渡されない場合は自動的に取得します)
   */
  public static async getAreaDetails(areaId: string, currentSeasonId?: string): Promise<{
    name: string;
    rankingLink: string;
    searchLink: string;
    currentSeasonId?: string;
  }> {
    try {
      const geoJson = await this.getMunicipalitiesGeoJson();
      
      // areaId に対応する市町村を探す
      const feature = geoJson.features.find((f: any) => {
        return String(f.properties?.id ?? '') === String(areaId);
      });

      // currentSeasonId が渡されていない場合は取得
      const seasonId = currentSeasonId || await this.getCurrentSeasonId();

      if (feature && feature.properties) {
        const name = feature.properties.name || String(areaId || '不明なエリア');
        return Promise.resolve({
          name,
          rankingLink: `/ranking?areaId=${encodeURIComponent(areaId)}&areaName=${encodeURIComponent(name)}`,
          searchLink: `/search?areaId=${encodeURIComponent(areaId)}&areaName=${encodeURIComponent(name)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
          currentSeasonId: seasonId,
        });
      }

      // フォールバック: areaId で返す
      return Promise.resolve({
        name: String(areaId || '不明なエリア'),
        rankingLink: `/ranking?areaId=${encodeURIComponent(areaId)}`,
        searchLink: `/search?areaId=${encodeURIComponent(areaId)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
        currentSeasonId: seasonId,
      });
    } catch (error) {
      console.error('Error fetching area details:', error);
      return Promise.resolve({
        name: String(areaId || '不明なエリア'),
        rankingLink: `/ranking?areaId=${encodeURIComponent(areaId)}`,
        searchLink: `/search?areaId=${encodeURIComponent(areaId)}`,
      });
    }
  }

  /**
   * 現在のシーズンIDを取得します
   * seasonsコレクションから isCurrent=true のドキュメントの seasonId を返します
   */
  public static async getCurrentSeasonId(): Promise<string | undefined> {
    try {
      const seasonsRef = collection(db, 'seasons');
      const querySnapshot = await getDocs(seasonsRef);
      
      // isCurrent=true のシーズンを探す
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.isCurrent === true) {
          const seasonId = data.seasonId;
          return seasonId ? String(seasonId) : undefined;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching current season:', error);
      return undefined;
    }
  }
}