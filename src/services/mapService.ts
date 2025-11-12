// src/services/mapService.ts
import { FeatureCollection } from 'geojson'; // npm install @types/geojson --save-dev が必要かも

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
   * 指定エリアの詳細情報を取得します（暫定実装）
   * Map 連携が整うまでのスタブとして、最低限の形で返却します。
   */
  public static async getAreaDetails(areaId: string): Promise<{ name: string; description: string }> {
    // 将来的には API 呼び出しや別データソースに差し替え
    return Promise.resolve({
      name: String(areaId || '不明なエリア'),
      description: 'このエリアの詳細情報は現在準備中です。',
    });
  }
}
