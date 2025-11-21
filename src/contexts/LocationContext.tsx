'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 位置情報の型
interface Location {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  prefecture: string | null;
  regionId: string | null;
}

// Context の型
interface LocationContextType {
  location: Location;
}

// 初期値
const initialLocation: LocationContextType = {
  location: { latitude: null, longitude: null, city: null, prefecture: null, regionId: null },
};

// Context作成
const LocationContext = createContext<LocationContextType>(initialLocation);

// Provider コンポーネント
export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<Location>({ latitude: null, longitude: null, city: null, prefecture: null, regionId: null });

  // 市区町村コードを取得する関数
  const getRegionIdFromCity = async (city: string, lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch('/data/municipalities.geojson');
      if (!response.ok) return null;
      
      const geojson = await response.json();
      
      // 市区町村名が一致するfeatureを探す
      const feature = geojson.features.find((f: any) => 
        f.properties.name === city || f.properties.N03_004 === city
      );
      
      if (feature && feature.properties.N03_007) {
        return feature.properties.N03_007; // 市区町村コード（例: "03202"）
      }
      
      return null;
    } catch (error) {
      console.error('市区町村コード取得エラー:', error);
      return null;
    }
  };

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
        
        // regionIdを市区町村コードとして取得（municipalities.geojsonから）
        let regionId = null;
        if (city) {
          // 実際のアプリではmapService等を使って市区町村コードを取得
          // ここでは簡易的に市区町村名から推測（本番環境では要修正）
          regionId = await getRegionIdFromCity(city, lat, lon);
        }
        
        setLocation({
          latitude: lat,
          longitude: lon,
          city: city,
          prefecture: prefecture,
          regionId: regionId,
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
