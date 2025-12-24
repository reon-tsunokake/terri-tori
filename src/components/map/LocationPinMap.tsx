'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

type Props = {
  latitude: number;
  longitude: number;
  locationName?: string;
};

/**
 * 投稿の位置情報をピンで表示する専用マップコンポーネント
 */
export default function LocationPinMap({ latitude, longitude, locationName }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      console.error('[LocationPinMap] Mapbox access token is missing');
      return;
    }

    // マップ初期化
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 14, // 詳細が見えるズームレベル
    });

    // ナビゲーションコントロール追加
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // ピン（マーカー）を追加
    const marker = new mapboxgl.Marker({ color: '#ef4444' }) // 赤色のピン
      .setLngLat([longitude, latitude])
      .addTo(map);

    // ポップアップを追加（オプション）
    if (locationName) {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(locationName);
      marker.setPopup(popup);
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // 位置が変更された場合にマーカーを更新
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    markerRef.current.setLngLat([longitude, latitude]);
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 14,
      duration: 1000,
    });
  }, [latitude, longitude]);

  return <div ref={containerRef} className="w-full h-full" />;
}
