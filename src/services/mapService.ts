// src/services/mapService.ts
import { FeatureCollection } from 'geojson'; // npm install @types/geojson --save-dev が必要かも
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export class MapService {
  private static selectedGroupId?: string;

  /**
   * マップで選択中のグループIDを保存します
   */
  public static setSelectedGroupId(groupId?: string | number): void {
    this.selectedGroupId = groupId !== undefined ? String(groupId) : undefined;
  }

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
  public static async getAreaDetails(
    areaId: string,
    options?: { currentSeasonId?: string; userId?: string; groupId?: string | number }
  ): Promise<{
    name: string;
    rankingLink: string;
    searchLink: string;
    currentSeasonId?: string;
    groupId?: string;
  }> {
    try {
      const geoJson = await this.getMunicipalitiesGeoJson();
      
      // areaId に対応する市町村を探す
      const feature = geoJson.features.find((f: any) => {
        return String(f.properties?.id ?? '') === String(areaId);
      });

      // currentSeasonId が渡されていない場合は取得
      const seasonId = options?.currentSeasonId || await this.getCurrentSeasonId();
      const groupId =
        options?.groupId !== undefined
          ? String(options.groupId)
          : this.selectedGroupId ?? await this.getUserGroupId(options?.userId);

      if (feature && feature.properties) {
        const name = feature.properties.name || String(areaId || '不明なエリア');
        return Promise.resolve({
          name,
          rankingLink: `/ranking?areaId=${encodeURIComponent(areaId)}&areaName=${encodeURIComponent(name)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}${groupId ? `&groupId=${encodeURIComponent(groupId)}` : ''}`,
          searchLink: `/search?areaId=${encodeURIComponent(areaId)}&areaName=${encodeURIComponent(name)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
          currentSeasonId: seasonId,
          groupId,
        });
      }

      // フォールバック: areaId で返す
      return Promise.resolve({
        name: String(areaId || '不明なエリア'),
        rankingLink: `/ranking?areaId=${encodeURIComponent(areaId)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}${groupId ? `&groupId=${encodeURIComponent(groupId)}` : ''}`,
        searchLink: `/search?areaId=${encodeURIComponent(areaId)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
        currentSeasonId: seasonId,
        groupId,
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
   * ユーザーの所属グループIDを取得します
   */
  public static async getUserGroupId(userId?: string): Promise<string | undefined> {
    if (!userId) return undefined;

    try {
      const userRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const groupId = data.groupId;
        return groupId ? String(groupId) : undefined;
      }

      return undefined;
    } catch (error) {
      console.error('Error fetching user groupId:', error);
      return undefined;
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