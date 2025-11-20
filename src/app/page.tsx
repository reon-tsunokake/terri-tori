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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import BottomNavigation from "../components/layout/BottomNavigation";
import dynamic from "next/dynamic"; // 追加
import { MapService } from "@/services/mapServise"; // 追加
import type { MunicipalityCollection, MunicipalityProperties } from "@/types/map"; // 追加

const DynamicMap = dynamic(() => import("@/components/map/MapContainer"), {
  ssr: false,
  loading: () => <p>地図を読み込んでいます...</p>,
});

export default function Home() {
  const { user, loading } = useAuth();
  const [likes, setLikes] = useState(0);
  const [showMap, setShowMap] = useState(false); // 追加
  const [geo, setGeo] = useState<MunicipalityCollection | undefined>(undefined); //追加
  const [selected, setSelected] = useState<MunicipalityProperties | null>(null); //追加
  const { user, userProfile, loading, logout } = useAuth();
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

  //GeoJSON を読み込む処理を追加
  //とりあえずキャスト
  useEffect(() => {
    MapService.getMunicipalitiesGeoJson()
      .then((data) => setGeo(data as unknown as MunicipalityCollection))
      .catch((e) => console.error("GeoJSON load error:", e));
  }, []);


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
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-rose-50 to-pink-50">
      {!showMap ? (
       <>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-rose-100 p-4 sticky top-0 z-10">
          <div className="max-w-sm mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
              📸 Terri-tori
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24 fade-in">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 bg-clip-text text-transparent leading-tight">
                現実の写真で、街を染めよう。
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-rose-400 to-pink-400 mx-auto rounded-full"></div>
            </div>
            
            {user ? (
              <div className="space-y-8 slide-up">
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-rose-100">
                  <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                    ようこそ、<span className="font-semibold text-rose-600">{userProfile?.displayName || user.displayName || user.email?.split('@')[0]}</span>さん！<br />
                    あなたの投稿で街を彩りましょう。
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <button
                    onClick={() => setLikes(likes + 1)}
                    className="group px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-base font-semibold touch-manipulation"
                  >
                    <span className="group-hover:scale-110 inline-block transition-transform duration-300">❤️</span> いいね！ ({likes})
                  </button>
                  
                  <button className="group px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl hover:from-pink-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-base font-semibold touch-manipulation">
                    <span className="group-hover:scale-110 inline-block transition-transform duration-300">📷</span> 写真を投稿
                  </button>
                  
                  <button onClick={() => setShowMap(true)} className="group px-6 py-4 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-2xl hover:from-rose-500 hover:to-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-base font-semibold touch-manipulation sm:col-span-2">
                    <span className="group-hover:scale-110 inline-block transition-transform duration-300">🗺️</span> 地図を見る
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 slide-up">
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-rose-100">
                  <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                    写真を投稿して、あなたの街を彩りませんか？<br />
                    まずはアカウントを作成して始めましょう。
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/signup"
                      className="px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
                    >
                      今すぐ始める
                    </Link>
                    <Link
                      href="/login"
                      className="px-10 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
                    >
                      ログイン
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom Navigation - ログイン時のみ表示 */}
        {user && <BottomNavigation />}
      </>
    ) : (
      <>
        {/* ===== 地図画面 ===== */}
        {/* ★ 追加：MapContainer を全画面表示 */}
        <div className="w-full h-screen">
          <DynamicMap
            geoJsonData={geo}
            onAreaClick={(p) => {
              console.log('[Parent] onAreaClick:', p);
              setSelected(p);
            }}
            selectedId={selected?.id}
          />

         {/* ローディング（geo がまだ undefined の間だけ出す） */}
          {!geo && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 rounded-xl px-3 py-1.5 text-sm shadow">
              境界データを読み込み中…
            </div>
          )}
          {/* クリック結果の表示パネル（selected がある時だけ） */}
          {selected && (
            <div className="absolute top-4 right-4 bg-white/95 rounded-xl px-4 py-2 shadow">
              <div className="text-sm font-semibold">
                {selected.prefecture} {selected.name}
              </div>
              <div className="text-xs text-gray-500">ID: {selected.id}</div>
            </div>
          )}
        {/* ★ 追加：戻るボタン（トップ画面に戻す） */}
        <button
          onClick={() => setShowMap(false)}
          className="absolute top-4 left-4 px-4 py-2 bg-white rounded shadow"
        >
          戻る
        </button>
      </div>
      </>
    )}
    </main>
  );
}
