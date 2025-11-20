'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 位置情報の型
interface Location {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  prefecture: string | null;
}

// Context の型
interface LocationContextType {
  location: Location;
}

// 初期値
const initialLocation: LocationContextType = {
  location: { latitude: null, longitude: null, city: null, prefecture: null },
};

// Context作成
const LocationContext = createContext<LocationContextType>(initialLocation);

// Provider コンポーネント
export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<Location>({ latitude: null, longitude: null, city: null, prefecture: null });

  // 逆ジオコーディング関数
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&language=ja`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        
        let city = null;
        let prefecture = null;
        
        // context配列から情報を抽出
        if (feature.context) {
          for (const ctx of feature.context) {
            if (ctx.id.startsWith('place.')) {
              city = ctx.text;
            } else if (ctx.id.startsWith('region.')) {
              prefecture = ctx.text;
            }
          }
        }
        
        // featureのplace_typeがplaceの場合、feature自体が市区町村
        if (feature.place_type && feature.place_type.includes('place')) {
          city = feature.text;
        }
        
        return {
          city: city,
          prefecture: prefecture,
        };
      }
      
      return { city: null, prefecture: null };
    } catch (error) {
      console.error('逆ジオコーディングエラー:', error);
      return { city: null, prefecture: null };
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // 市区町村名と都道府県名を取得
        const { city, prefecture } = await reverseGeocode(lat, lon);
        
        setLocation({
          latitude: lat,
          longitude: lon,
          city: city,
          prefecture: prefecture,
        });
      },
      (error) => {
        console.error("Error getting location:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return <LocationContext.Provider value={{ location }}>{children}</LocationContext.Provider>;
};

// カスタムフック
export const useLocation = () => useContext(LocationContext);
