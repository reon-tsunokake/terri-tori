// src/components/map/MapContainer.tsx
'use client';

// ① Mapbox の UI 用 CSS
import 'mapbox-gl/dist/mapbox-gl.css';

import { useEffect, useRef } from 'react';
import mapboxgl, { Map } from 'mapbox-gl';

// ② .env.local のトークン
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

// ③ Props（Bから受け取るデータとイベント）
import type { MunicipalityCollection, MunicipalityProperties } from '@/types/map';

type Props = {
  geoJsonData?: MunicipalityCollection;                        // 描画データ
  onAreaClick?: (props: MunicipalityProperties) => void;       // クリック時
  selectedId?: string;                                         // 選択中のID
  regionTopDocs?: RegionTopDocument[];                         // 地域トップ投稿
};

import { RegionTopDocument } from '@/types/ranking';
import { generateClippedRegionImage } from '@/utils/imageUtils';



export default function MapContainer({
  geoJsonData,
  onAreaClick,
  selectedId,
  regionTopDocs,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  // ④ 地図の初期化（マウント時に1回）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      console.error('[Mapbox] Access token is missing. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local');
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [141.1527, 39.7036], // 盛岡あたり
      zoom: 6,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ⑤.5 GeoJSON が来たら描画（ソース・レイヤ追加 + 全体 fitBounds）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoJsonData) return;

    const SOURCE_ID = 'municipalities';
    const FILL_ID = 'municipalities-fill';
    const PHOTO_FILL_ID = 'municipalities-photo-fill'; // 写真用レイヤID
    const LINE_ID = 'municipalities-line';


    const ensureSourceAndLayers = () => {
      // 既存ソースがあればデータ更新だけ
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geoJsonData as any);
      } else {
        // ソース追加
        map.addSource(SOURCE_ID, { type: 'geojson', data: geoJsonData as any });

        // ベースの面レイヤ（薄い色）
        if (!map.getLayer(FILL_ID)) {
          map.addLayer({
            id: FILL_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': '#bfdbfe',      // 薄い水色
              'fill-opacity': 0.25,
            },
          });
        }

        // 写真用レイヤ (FILL_IDの上に重ねる) -> 個別のimage sourceで扱うためここでは定義しない



        // 輪郭線レイヤ
        if (!map.getLayer(LINE_ID)) {
          map.addLayer({
            id: LINE_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': '#1e3a8a',
              'line-width': 1.2,
            },
          });
        }
      }

      // 全体が入るように fitBounds
      const bounds = new mapboxgl.LngLatBounds();
      for (const f of geoJsonData.features) {
        const g = f.geometry;
        if (g.type === 'Polygon') {
          for (const ring of g.coordinates) {
            for (const [lng, lat] of ring) bounds.extend([lng, lat]);
          }
        } else if (g.type === 'MultiPolygon') {
          for (const poly of g.coordinates) {
            for (const ring of poly) {
              for (const [lng, lat] of ring) bounds.extend([lng, lat]);
            }
          }
        }
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 9, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) {
      ensureSourceAndLayers();
    } else {
      map.once('load', ensureSourceAndLayers);
    }

    return () => {
      map.off('load', ensureSourceAndLayers as any);
    };
  }, [geoJsonData]);

  // ⑤.6 クリックで属性を返す useEffect
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onAreaClick) return;

    const FILL_ID = 'municipalities-fill';
    const PHOTO_FILL_ID = 'municipalities-photo-fill';


    const handler = (e: mapboxgl.MapMouseEvent) => {
      // PHOTO_FILL_ID は削除されたので FILL_ID のみ対象にする
      const features = map.queryRenderedFeatures(e.point, { layers: [FILL_ID] }) as any[];
      const hit = features[0];

      if (!hit) return;

      const props = hit.properties as MunicipalityProperties;
      console.log('[Map] clicked feature props:', props);
      onAreaClick(props);

      // 🟦 ここから追加：クリックした市町村に即ズームする
      const g = hit.geometry as any;
      const bounds = new mapboxgl.LngLatBounds();

      if (g.type === 'Polygon') {
        for (const ring of g.coordinates as number[][][]) {
          for (const [lng, lat] of ring) bounds.extend([lng, lat]);
        }
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates as number[][][][]) {
          for (const ring of poly) {
            for (const [lng, lat] of ring) bounds.extend([lng, lat]);
          }
        }
      }

      if (!bounds.isEmpty()) {
        console.log('[Click Zoom] fitBounds');
        map.fitBounds(bounds, {
          padding: 20,
          maxZoom: 8,   // かなり寄るように
          duration: 1200,
        });
      }
    };

    const attach = () => {
      if (map.getLayer(FILL_ID)) {
        map.on('click', FILL_ID, handler);
      }
    };

    if (map.isStyleLoaded()) {
      attach();
    } else {
      map.once('load', attach);
    }

    return () => {
      map.off('click', FILL_ID, handler);
    };
  }, [onAreaClick]);

  // ⑤.7 選択中の市を濃くハイライトするレイヤ
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    console.log('[Zoom] selectedId:', selectedId);

    const SOURCE_ID = 'municipalities';
    const HIGHLIGHT_ID = 'municipality-highlight';
    const LINE_ID = 'municipalities-line';

    const updateHighlight = () => {
      if (!map.getSource(SOURCE_ID)) return;

      if (!selectedId) {
        if (map.getLayer(HIGHLIGHT_ID)) {
          map.removeLayer(HIGHLIGHT_ID);
        }
        return;
      }

      if (!map.getLayer(HIGHLIGHT_ID)) {
        map.addLayer(
          {
            id: HIGHLIGHT_ID,
            type: 'fill',
            source: SOURCE_ID,
            filter: ['==', ['get', 'id'], selectedId], // properties.id が selectedId のフィーチャだけ
            paint: {
              'fill-color': '#ff0000',  // 濃い赤
              'fill-opacity': 0.6,
            },
          },
          LINE_ID // 輪郭線レイヤの直前に挿入
        );
      } else {
        map.setFilter(HIGHLIGHT_ID, ['==', ['get', 'id'], selectedId]);
      }
    };

    if (map.isStyleLoaded()) {
      updateHighlight();
    } else {
      map.once('load', updateHighlight);
    }
  }, [selectedId]);

  // 🟦 クリックした市町村にズーム & センタリング
  useEffect(() => {
    console.log('[Zoom effect] selectedId / geoJsonData:', selectedId, !!geoJsonData);
    const map = mapRef.current;
    if (!map || !geoJsonData || !selectedId) return;

    const fitToSelected = () => {
      console.log('[Zoom] selectedId:', selectedId);

      // id でフィーチャを探す
      const feature = geoJsonData.features.find((f) => {
        const props = f.properties as any;
        return String(props?.id ?? '') === String(selectedId);
      });

      if (!feature) {
        console.warn('[Zoom] feature not found for id:', selectedId);
        return;
      }

      const g = feature.geometry as any;
      const bounds = new mapboxgl.LngLatBounds();

      if (g.type === 'Polygon') {
        for (const ring of g.coordinates as number[][][]) {
          for (const [lng, lat] of ring) bounds.extend([lng, lat]);
        }
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates as number[][][][]) {
          for (const ring of poly) {
            for (const [lng, lat] of ring) bounds.extend([lng, lat]);
          }
        }
      } else {
        console.warn('[Zoom] geometry type is not Polygon/MultiPolygon:', g.type);
        return;
      }

      if (!bounds.isEmpty()) {
        console.log('[Zoom] fitting bounds');
        map.fitBounds(bounds, {
          padding: 20,
          maxZoom: 20,
          duration: 1000,
        });
      } else {
        console.warn('[Zoom] bounds is empty for id:', selectedId);
      }
    };

    if (map.isStyleLoaded()) {
      fitToSelected();
    } else {
      map.once('load', fitToSelected);
    }
  }, [selectedId, geoJsonData]);

  // ⑤.8 ホバー時にポインタ形状を変える（わかりやすさ向上）


  // ⑤.8 ホバー時にポインタ形状を変える（わかりやすさ向上）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const FILL_ID = 'municipalities-fill';
    const PHOTO_FILL_ID = 'municipalities-photo-fill';

    const enter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('mouseenter', FILL_ID, enter);
    map.on('mouseleave', FILL_ID, leave);
    map.on('mouseenter', PHOTO_FILL_ID, enter);
    map.on('mouseleave', PHOTO_FILL_ID, leave);

    return () => {
      map.off('mouseenter', FILL_ID, enter);
      map.off('mouseleave', FILL_ID, leave);
      map.off('mouseenter', PHOTO_FILL_ID, enter);
      map.off('mouseleave', PHOTO_FILL_ID, leave);
    };
  }, []);

  // ⑦ 画像の読み込みとGeoJSONの更新 (image sourceを使用)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoJsonData || !regionTopDocs) return;

    // クリーンアップ用: 追加したレイヤとソースのIDを保持
    const addedIds: string[] = [];

    const updateMapImages = async () => {
      // 既存の画像レイヤ/ソースを削除 (再描画時)
      // Note: useEffectのクリーンアップ関数でも行うが、念のためここでもチェックしても良い
      // 今回はクリーンアップ関数に任せる

      for (const doc of regionTopDocs) {
        const feature = geoJsonData.features.find((f) => {
          const props = f.properties as MunicipalityProperties;
          return props.id === doc.regionId;
        });

        if (!feature) continue;

        // 画像生成 (切り抜き & 座標計算)
        const result = await generateClippedRegionImage(feature as any, doc.imageUrl);
        if (!result) continue;

        const sourceId = `img-source-${doc.regionId}`;
        const layerId = `img-layer-${doc.regionId}`;

        // 既に存在する場合はスキップ (あるいは更新？今回は追加のみ想定)
        if (map.getSource(sourceId)) continue;

        map.addSource(sourceId, {
          type: 'image',
          url: result.url,
          coordinates: result.coordinates,
        });

        // 塗りつぶしレイヤ(FILL_ID)の上に、輪郭線(LINE_ID)の下に表示したい
        // LINE_IDの前に挿入する
        const LINE_ID = 'municipalities-line';
        const beforeId = map.getLayer(LINE_ID) ? LINE_ID : undefined;

        map.addLayer(
          {
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 0.9,
              'raster-fade-duration': 0,
            },
          },
          beforeId
        );

        addedIds.push(doc.regionId);
      }
    };

    if (map.isStyleLoaded()) {
      updateMapImages();
    } else {
      map.once('load', updateMapImages);
    }

    return () => {
      // マップが破棄されている場合は処理しない
      if (!mapRef.current) return;

      // クリーンアップ: 追加したレイヤとソースを削除
      addedIds.forEach((id) => {
        const layerId = `img-layer-${id}`;
        const sourceId = `img-source-${id}`;
        try {
          if (map.getStyle() && map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getStyle() && map.getSource(sourceId)) map.removeSource(sourceId);
        } catch (e) {
          console.warn('[Map Cleanup] Failed to remove layer/source:', e);
        }
      });
    };
  }, [geoJsonData, regionTopDocs]);



  // ⑥ 地図コンテナ
  return <div ref={containerRef} className="h-screen w-full" />;
}
