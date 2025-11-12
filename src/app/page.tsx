'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/layout/BottomNavigation';
import CameraButton from '../components/layout/CameraButton';
import SemiModal from '../components/layout/SemiModal';
import { MapService } from '../services/mapService';

// TODO: 担当Aが作成する型定義をインポート
// import { MunicipalityProperties } from '../types/map';
type MunicipalityProperties = any; // 仮の型

// 地図コンポーネント（担当A）を動的インポート (SSR無効)
//const DynamicMap = dynamic(
//  () => import('../components/map/MapContainer'), // TODO: 担当Aのコンポーネントパスに修正
//  { 
//    ssr: false,
//    loading: () => (
//      <div className="flex-1 flex items-center justify-center bg-rose-50">
//        <p className="text-lg text-rose-500">地図を読み込んでいます...</p>
//      </div>
//    )
//  }
//);

// 一時的なプレースホルダー: Map コンポーネントが未実装でもビルドが通るようにする
function DynamicMap({ onAreaClick }: { onAreaClick: (properties: MunicipalityProperties) => void }) {
  return (
    <div
      className="flex-1 flex items-center justify-center bg-rose-50 cursor-pointer"
      onClick={() => onAreaClick({ id: 'demo', name: 'デモエリア' })}
    >
      <p className="text-lg text-rose-500">地図コンポーネント（準備中） - クリックでデモ表示</p>
    </div>
  );
}

/**
 * ホームページ (地図コンテナ)
 * 既存のダッシュボードから完全に書き換え
 */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // セミモーダルの状態管理
  const [selectedArea, setSelectedArea] = useState<MunicipalityProperties | null>(null);
  
  // GeoJSONデータの状態管理 (現在はMapContainer内部で読み込む想定)
  // const [geoJsonData, setGeoJsonData] = useState(null);

  useEffect(() => {
    // 認証状態の確認が完了し、ユーザーがログインしていない場合はログイン画面に遷移
    if (!loading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    }
    
    // TODO: ログイン済みの場合、GeoJSONデータをフェッチする (mapServiceを使用)
    // （現在は担当AのMapContainerが内部でフェッチすると仮定）
    // if (!loading && user && !geoJsonData) {
    //   MapService.getMunicipalitiesGeoJson().then(setGeoJsonData);
    // }

  }, [loading, user, router]);

  /**
   * 地図上のエリアがクリックされたときのハンドラ
   * @param properties 担当Aのコンポーネントから渡されるエリア情報
   */
  const handleAreaClick = async (properties: MunicipalityProperties) => {
    // 仮のプロパティからIDを推測（担当Aの仕様による）
    const areaId = properties.id || properties.name || 'unknown';

    try {
      // サービス層を経由して詳細データを取得
      const areaDetails = await MapService.getAreaDetails(areaId);
      setSelectedArea(areaDetails);
    } catch (error) {
      console.error('Failed to get area details:', error);
      // エラー時も仮の情報を表示
      setSelectedArea({
        name: properties.name || '情報取得エラー',
        description: 'エリアの詳細情報の取得に失敗しました。'
      });
    }
  };

  /**
   * セミモーダルを閉じるハンドラ
   */
  const handleCloseModal = () => {
    setSelectedArea(null);
  };

  if (loading || !user) {
    // 認証読み込み中または未認証（リダイレクト待ち）
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </main>
    );
  }

  // 認証済みユーザー
  return (
    <main className="flex min-h-screen flex-col bg-gray-100">
      
      {/* ヘッダーは「追加情報です...」PDFに基づき「当面不要」として削除
      */}

      {/* 地図コンテナ (担当A)
        flex-1 で残りの高さをすべて埋める
      */}
      <div className="flex-1 relative">
        <DynamicMap 
          // geoJsonData={geoJsonData} // 必要に応じてPropsを渡す
          onAreaClick={handleAreaClick} // クリックイベントをリッスン
        />
      </div>

      {/* UIコンポーネント (担当B)
        z-indexで地図の上に重ねて表示
      */}
      <BottomNavigation />
      <CameraButton />
      
      <SemiModal
        isOpen={!!selectedArea}
        onClose={handleCloseModal}
        areaName={selectedArea?.name ?? ''}
      >
        <div className="space-y-2">
          <p className="text-gray-700">
            {selectedArea?.description ?? '詳細情報は現在ありません。'}
          </p>
        </div>
      </SemiModal>
    </main>
  );
}
