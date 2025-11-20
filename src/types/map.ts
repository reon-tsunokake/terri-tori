// --- 市町村ポリゴンの "properties" の型 ---
// GeoJSON 内の properties に最低限ほしい情報を定義します。
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from 'geojson';

export interface MunicipalityProperties {
  id: string;
  name: string;
  prefecture: string;
  currentTopPhotoId?: string | null;
  [key: string]: any;
}

// 1つの市町村フィーチャ
export type MunicipalityFeature =
  Feature<Polygon | MultiPolygon, MunicipalityProperties>;

// ★ FeatureCollection には「Geometry型」と「Properties型」を渡す！
export type MunicipalityCollection =
  FeatureCollection<Polygon | MultiPolygon, MunicipalityProperties>;
