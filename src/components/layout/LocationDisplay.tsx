'use client';

import { HiLocationMarker } from 'react-icons/hi';
import { useLocation } from '@/contexts/LocationContext';

/**
 * 現在地を表示するコンポーネント
 * 地図画面の左上に位置情報を表示する
 */
export default function LocationDisplay() {
  const { location } = useLocation();

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      {location.latitude !== null && location.longitude !== null ? (
        <>
          <HiLocationMarker className="h-5 w-5 text-green-600" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">
              {location.prefecture && location.city
                ? `${location.prefecture}${location.city}`
                : location.city
                ? location.city
                : '位置情報取得済み'}
            </span>
            <span className="text-xs text-gray-500">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </span>
          </div>
        </>
      ) : (
        <>
          <HiLocationMarker className="h-5 w-5 text-gray-400 animate-pulse" />
          <span className="text-xs text-gray-500">位置情報を取得中...</span>
        </>
      )}
    </div>
  );
}
