import { FeatureCollection, Feature, Geometry } from 'geojson';

interface MunicipalityProperties {
    N03_001: string; // 都道府県名
    N03_002: string;
    N03_003: string;
    N03_004: string; // 市区町村名
    N03_005: string;
    N03_007: string; // 行政区域コード (regionId)
    id: string;      // 行政区域コード (regionId)
    name: string;    // 市区町村名
    prefecture: string; // 都道府県名
}

let geoJsonCache: FeatureCollection<Geometry, MunicipalityProperties> | null = null;
let municipalityMap: Map<string, string> | null = null;

/**
 * GeoJSONデータを取得し、キャッシュする
 */
async function fetchGeoJson(): Promise<FeatureCollection<Geometry, MunicipalityProperties>> {
    if (geoJsonCache) {
        return geoJsonCache;
    }

    try {
        const response = await fetch('/data/municipalities.geojson');
        if (!response.ok) {
            throw new Error('Failed to fetch municipalities.geojson');
        }
        const data = await response.json();
        geoJsonCache = data as FeatureCollection<Geometry, MunicipalityProperties>;
        return geoJsonCache;
    } catch (error) {
        console.error('Error fetching GeoJSON:', error);
        throw error;
    }
}

/**
 * regionIdから市区町村名を取得する
 * @param regionId 行政区域コード
 * @returns 市区町村名 (見つからない場合はnull)
 */
export async function getMunicipalityName(regionId: string): Promise<string | null> {
    if (!regionId) return null;

    // マップが作成されていなければ作成
    if (!municipalityMap) {
        const geoJson = await fetchGeoJson();
        municipalityMap = new Map();

        geoJson.features.forEach((feature) => {
            if (feature.properties && feature.properties.id && feature.properties.name) {
                municipalityMap!.set(feature.properties.id, feature.properties.name);
            }
        });
    }

    return municipalityMap.get(regionId) || null;
}

/**
 * regionIdから都道府県名を取得する
 * @param regionId 行政区域コード
 * @returns 都道府県名 (見つからない場合はnull)
 */
export async function getPrefectureName(regionId: string): Promise<string | null> {
    if (!regionId) return null;

    // キャッシュがなければ取得（getMunicipalityNameでマップ作成済みならキャッシュはあるはずだが、念のため）
    if (!geoJsonCache) {
        await fetchGeoJson();
    }

    const feature = geoJsonCache?.features.find(f => f.properties.id === regionId);
    return feature?.properties.prefecture || null;
}
