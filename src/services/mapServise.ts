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
}
