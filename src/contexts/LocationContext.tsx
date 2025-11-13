'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 位置情報の型
interface Location {
  latitude: number | null;
  longitude: number | null;
}

// Context の型
interface LocationContextType {
  location: Location;
}

// 初期値
const initialLocation: LocationContextType = {
  location: { latitude: null, longitude: null },
};

// Context作成
const LocationContext = createContext<LocationContextType>(initialLocation);

// Provider コンポーネント
export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<Location>({ latitude: null, longitude: null });

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
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
