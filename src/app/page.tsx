'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from '@/components/layout/BottomNavigation';
import CameraButton from '@/components/layout/CameraButton';
import LocationDisplay from '@/components/layout/LocationDisplay';
import SemiModal from '@/components/layout/SemiModal';
import { MapService } from '@/services/mapService';
import { FaTrophy, FaSearch } from 'react-icons/fa';
import type {
    MunicipalityCollection,
    MunicipalityProperties,
} from '@/types/map';
import { RankingService } from '@/services/rankingService';
import { RegionTopDocument } from '@/types/ranking';
import { useSeasonPost } from '@/contexts/SeasonPostContext';
import { HiChartBar, HiMagnifyingGlass } from 'react-icons/hi2';



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
    rankingLink?: string;
    searchLink?: string;
};

export default function Home() {
    const { user, userProfile, loading, logout } = useAuth();
    const router = useRouter();
    const { currentSeasonId } = useSeasonPost();

    const [likes, setLikes] = useState(0);

    const [geoJsonData, setGeoJsonData] = useState<MunicipalityCollection | null>(
        null,
    );
    const [geoError, setGeoError] = useState<string | null>(null);
    const [selectedMunicipality, setSelectedMunicipality] =
        useState<SelectedMunicipality | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [regionTopDocs, setRegionTopDocs] = useState<RegionTopDocument[]>([]);




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

    useEffect(() => {
        if (currentSeasonId) {
            RankingService.getRegionTopDocuments(currentSeasonId)
                .then(docs => setRegionTopDocs(docs))
                .catch(err => console.error('Failed to fetch ranking docs:', err));
        }
    }, [currentSeasonId]);


    const handleAreaClick = async (properties: MunicipalityProperties) => {
        const areaId = properties.id || properties.name || 'unknown';
        try {
            const areaDetails = await MapService.getAreaDetails(areaId);
            setSelectedMunicipality({
                ...properties,
                name: areaDetails.name || properties.name,
                rankingLink: areaDetails.rankingLink,
                searchLink: areaDetails.searchLink,
            });
        } catch (error) {
            console.error('Failed to get area details:', error);
            setSelectedMunicipality({
                ...properties,
                rankingLink: `/ranking?areaId=${encodeURIComponent(areaId)}`,
                searchLink: `/search?areaId=${encodeURIComponent(areaId)}`,
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

    if (loading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
                <div className="text-lg text-gray-600">読み込み中...</div>
            </main>
        );
    }

    const heroUserName =
        userProfile?.displayName ||
        user?.displayName ||
        user?.email?.split('@')[0] ||
        'Terri-toriユーザー';

    return (
        <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-rose-50 to-pink-50">
            <div className="relative flex-1">
                <DynamicMap
                    geoJsonData={geoJsonData ?? undefined}
                    onAreaClick={handleAreaClick}
                    selectedId={selectedMunicipality?.id}
                    regionTopDocs={regionTopDocs}
                />


                {/* 現在地表示 */}
                <LocationDisplay />

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

            <BottomNavigation />
            <CameraButton />

            <SemiModal
                isOpen={isModalOpen && !!selectedMunicipality}
                onClose={handleCloseModal}
                areaName={selectedMunicipality?.name ?? ''}
            >
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">
                            {selectedMunicipality?.prefecture} {selectedMunicipality?.name}
                        </h2>
                        <p className="text-xs text-gray-500">ID: {selectedMunicipality?.id}</p>
                    </div>

                    <div className="space-y-2">
                        {selectedMunicipality?.rankingLink && (
                            <Link
                                href={selectedMunicipality.rankingLink}
                                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:from-rose-600 hover:to-pink-600"
                            >
                                <HiChartBar className="text-white" aria-hidden />
                                <span>ランキングページへ</span>
                            </Link>
                        )}
                        {selectedMunicipality?.searchLink && (
                            <Link
                                href={selectedMunicipality.searchLink}
                                className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-rose-300 px-4 py-3 text-center text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                                <HiMagnifyingGlass className="text-rose-600" aria-hidden />
                                <span>検索ページへ</span>
                            </Link>
                        )}
                    </div>

                    <button
                        type="button"
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                        onClick={handleCloseModal}
                    >
                        地図に戻る
                    </button>
                </div>
            </SemiModal>
        </main>
    );
}
