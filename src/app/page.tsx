'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from '@/components/layout/BottomNavigation';
import CameraButton from '@/components/layout/CameraButton';
import SemiModal from '@/components/layout/SemiModal';
import { MapService } from '@/services/mapService';
import type {
  MunicipalityCollection,
  MunicipalityProperties,
} from '@/types/map';

const DynamicMap = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-rose-50">
      <p className="text-sm text-rose-500">地図を読み込んでいます...</p>
    </div>
  ),
});

type SelectedMunicipality = MunicipalityProperties & {
  description?: string;
};

export default function Home() {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();

  const [likes, setLikes] = useState(0);
  const [geoJsonData, setGeoJsonData] = useState<MunicipalityCollection | null>(
    null,
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] =
    useState<SelectedMunicipality | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    let isMounted = true;
    MapService.getMunicipalitiesGeoJson()
      .then((data) => {
        if (isMounted) {
          setGeoJsonData(data as MunicipalityCollection);
          setGeoError(null);
        }
      })
      .catch((error) => {
        console.error('GeoJSON load error:', error);
        if (isMounted) {
          setGeoError('境界データの読み込みに失敗しました。');
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAreaClick = async (properties: MunicipalityProperties) => {
    const areaId = properties.id || properties.name || 'unknown';
    try {
      const areaDetails = await MapService.getAreaDetails(areaId);
      setSelectedMunicipality({
        ...properties,
        name: areaDetails.name || properties.name,
        description: areaDetails.description,
      });
    } catch (error) {
      console.error('Failed to get area details:', error);
      setSelectedMunicipality({
        ...properties,
        description: 'エリアの詳細情報の取得に失敗しました。',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSemiModalButtonClick = () => {
    if (selectedMunicipality) {
      setIsModalOpen(true);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </main>
    );
  }

  const heroUserName =
    userProfile?.displayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Terri-toriユーザー';

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="relative flex-1">
        <DynamicMap
          geoJsonData={geoJsonData ?? undefined}
          onAreaClick={handleAreaClick}
          selectedId={selectedMunicipality?.id}
        />

        {!geoJsonData && !geoError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-2 text-sm text-gray-700 shadow">
            境界データを読み込み中…
          </div>
        )}

        {geoError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-semibold text-red-600 shadow">
            {geoError}
          </div>
        )}

        {selectedMunicipality && (
          <div className="absolute top-4 right-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-gray-800">
              {selectedMunicipality.prefecture} {selectedMunicipality.name}
            </p>
            <p className="text-xs text-gray-500">ID: {selectedMunicipality.id}</p>
          </div>
        )}
      </div>

      {user && <BottomNavigation />}
      <CameraButton />

      <SemiModal
        isOpen={isModalOpen && !!selectedMunicipality}
        onClose={handleCloseModal}
        areaName={selectedMunicipality?.name ?? ''}
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            {selectedMunicipality?.description ?? '詳細情報は現在ありません。'}
          </p>
          <button
            type="button"
            className="w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            onClick={handleSemiModalButtonClick}
          >
            地図に戻って別のエリアを選ぶ
          </button>
        </div>
      </SemiModal>
    </main>
  );
}
