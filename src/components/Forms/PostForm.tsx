'use client';

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { GeoPoint } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSeasonPost } from '@/contexts/SeasonPostContext';
import { useLocation } from '@/contexts/LocationContext';
import {
  createPost,
  uploadPostImage,
  updatePostImageUrl,
  getCurrentSeasonId,
} from '@/services/postService';
import { CreatePostData } from '@/types/firestore';
import {
  PostFormData,
  PostFormErrors,
  PostFormState,
} from '@/types/post';
import { HiX } from 'react-icons/hi';
import { FaCamera } from 'react-icons/fa';
import { MdCancel } from 'react-icons/md';

interface PostFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

export default function PostForm({ onSuccess, onCancel, initialLatitude, initialLongitude }: PostFormProps) {
  const { user } = useAuth();
  const { currentSeasonId, loading: seasonLoading } = useSeasonPost();
  const { location } = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState<PostFormData>({
    imageFile: null,
    caption: '',
    regionId: '',
    latitude: initialLatitude || 0,
    longitude: initialLongitude || 0,
  });

  const [formState, setFormState] = useState<PostFormState>({
    isSubmitting: false,
    errors: {},
    previewUrl: null,
  });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 画面サイズの判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初期位置情報が変更されたときにformDataを更新
  useEffect(() => {
    if (initialLatitude !== null && initialLatitude !== undefined && 
        initialLongitude !== null && initialLongitude !== undefined) {
      setFormData((prev: PostFormData) => ({
        ...prev,
        latitude: initialLatitude,
        longitude: initialLongitude,
      }));
    }
  }, [initialLatitude, initialLongitude]);

  // locationから regionIdを自動設定
  useEffect(() => {
    if (location.regionId) {
      setFormData((prev: PostFormData) => ({
        ...prev,
        regionId: location.regionId || '',
      }));
    }
  }, [location.regionId]);

  // マウント時にカメラを自動起動
  useEffect(() => {
    openCamera();
  }, []);

  // カメラ起動
  const openCamera = async () => {
    try {
      // 端末の画面サイズに基づいてアスペクト比を決定
      const aspectRatio = isMobile ? 9 / 16 : 16 / 9; // スマホは縦長、PCは横長
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          aspectRatio: { ideal: aspectRatio },
          width: { ideal: isMobile ? 1080 : 1920 },
          height: { ideal: isMobile ? 1920 : 1080 }
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      // 少し遅延させてvideoRefが確実に利用可能になるようにする
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // play()の実行をPromiseとして扱い、エラーを適切に処理
          videoRef.current.play().catch((error) => {
            console.log('Video play was interrupted:', error);
            // 再度play()を試みる
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setFormState((prev: PostFormState) => ({
        ...prev,
        errors: { ...prev.errors, imageFile: 'カメラにアクセスできませんでした' },
      }));
    }
  };

  // カメラ停止
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // 写真撮影
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            setFormData((prev: PostFormData) => ({ ...prev, imageFile: file }));
            setFormState((prev: PostFormState) => ({
              ...prev,
              previewUrl: url,
              errors: { ...prev.errors, imageFile: undefined },
            }));
            // カメラは閉じずにプレビュー状態にする
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // 写真を確定してフォームに進む
  const confirmPhoto = () => {
    closeCamera();
  };

  // 再撮影
  const retakePhoto = () => {
    // プレビューURLをクリーンアップ
    if (formState.previewUrl) {
      URL.revokeObjectURL(formState.previewUrl);
    }
    // フォームの画像データをクリア
    setFormData((prev: PostFormData) => ({ ...prev, imageFile: null }));
    setFormState((prev: PostFormState) => ({
      ...prev,
      previewUrl: null,
      errors: { ...prev.errors, imageFile: undefined },
    }));
    // カメラが閉じている場合は再起動
    if (!isCameraOpen) {
      openCamera();
    }
  };

  // コンポーネントアンマウント時にカメラを停止
  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, []);

  // 入力変更ハンドラー
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: PostFormData) => ({ ...prev, [name]: value }));
    // エラーをクリア
    setFormState((prev: PostFormState) => ({
      ...prev,
      errors: { ...prev.errors, [name]: undefined },
    }));
  };

  // バリデーション
  const validate = (): boolean => {
    const errors: PostFormErrors = {};

    if (!formData.imageFile) {
      errors.imageFile = '画像を選択してください';
    }

    if (!formData.caption.trim()) {
      errors.caption = 'キャプションを入力してください';
    } else if (formData.caption.length > 500) {
      errors.caption = 'キャプションは500文字以内で入力してください';
    }

    if (formData.latitude === 0 && formData.longitude === 0) {
      errors.location = '位置情報を取得してください';
    }

    if (!formData.regionId) {
      errors.regionId = '地域情報を取得してください';
    }

    setFormState((prev: PostFormState) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  // 送信ハンドラー
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      setFormState((prev: PostFormState) => ({
        ...prev,
        errors: { general: 'ログインが必要です' },
      }));
      return;
    }

    if (!validate()) {
      return;
    }

    setFormState((prev: PostFormState) => ({ ...prev, isSubmitting: true }));

    try {
      // 1. 先に投稿ドキュメントを作成してpostIdを取得
      const postData: CreatePostData = {
        userId: user.uid,
        regionId: formData.regionId,
        seasonId: currentSeasonId || getCurrentSeasonId(), // SeasonPostContextから取得したseasonIdを使用
        imageUrl: '', // 一時的に空
        caption: formData.caption.trim(),
        location: new GeoPoint(formData.latitude, formData.longitude),
      };

      const postId = await createPost(postData);

      // 2. postIdを使って画像をStorageにアップロード
      const imageUrl = await uploadPostImage(formData.imageFile!, postId);

      // 3. 投稿のimageUrlを更新
      await updatePostImageUrl(postId, imageUrl);

      // 成功時の処理
      setFormData({
        imageFile: null,
        caption: '',
        regionId: '',
        latitude: 0,
        longitude: 0,
      });
      setFormState({
        isSubmitting: false,
        errors: {},
        previewUrl: null,
      });

      // 成功モーダルを表示
      setShowSuccessModal(true);

      // 2秒後に自動的に閉じる
      setTimeout(() => {
        setShowSuccessModal(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting post:', error);
      setFormState((prev: PostFormState) => ({
        ...prev,
        isSubmitting: false,
        errors: {
          general: '投稿に失敗しました。もう一度お試しください。',
        },
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-white to-rose-50 overflow-y-auto">
      {/* 投稿完了モーダル */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
            <h3 className="text-2xl font-bold text-gray-800 text-center">
              投稿が完了しました
            </h3>
          </div>
        </div>
      )}

      <div className="min-h-screen p-4 sm:p-6 md:p-8">
      {isCameraOpen ? (
        // カメラ画面（全画面プレビュー）
        <div className="fixed inset-0 bg-black flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${formState.previewUrl ? 'hidden' : ''}`}
            />
            {formState.previewUrl && (
              <img
                src={formState.previewUrl}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          
          {/* ボタンエリア */}
          <div className="p-6 bg-black">
            {!formState.previewUrl ? (
              // 撮影前のボタン
              <div className="flex gap-4 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 px-8 py-4 bg-white text-gray-900 rounded-full hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-2xl font-bold flex items-center justify-center gap-3 text-lg"
                >
                  <FaCamera className="h-6 w-6" />
                  撮影する
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      closeCamera();
                      onCancel();
                    }}
                    className="px-8 py-4 bg-gray-800 text-white rounded-full hover:bg-gray-700 active:scale-95 transition-all duration-200 shadow-2xl flex items-center gap-3"
                  >
                    <MdCancel className="h-6 w-6" />
                    キャンセル
                  </button>
                )}
              </div>
            ) : (
              // 撮影後のボタン
              <div className="flex gap-4 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={confirmPhoto}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 active:scale-95 transition-all duration-200 shadow-2xl font-bold flex items-center justify-center gap-3 text-lg"
                >
                  完了
                </button>
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="px-8 py-4 bg-gray-800 text-white rounded-full hover:bg-gray-700 active:scale-95 transition-all duration-200 shadow-2xl flex items-center gap-3 font-semibold"
                >
                  <FaCamera className="h-6 w-6" />
                  再撮影
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // 投稿フォーム
        <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
        新規投稿
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 撮影済み画像プレビュー */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            撮影した写真
          </label>
          {formState.previewUrl && (
            <div className="space-y-3">
              <div className="mt-4 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={formState.previewUrl}
                  alt="Preview"
                  className={`w-full object-cover ${isMobile ? 'aspect-[9/16]' : 'aspect-video'}`}
                />
              </div>
              <button
                type="button"
                onClick={retakePhoto}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 active:scale-95 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                <FaCamera className="h-5 w-5" />
                再撮影する
              </button>
            </div>
          )}
          {formState.errors.imageFile && (
            <p className="mt-1 text-sm text-red-600">
              {formState.errors.imageFile}
            </p>
          )}
        </div>

        {/* キャプション */}
        <div>
          <label
            htmlFor="caption"
            className="block text-sm font-bold text-gray-700 mb-3"
          >
            キャプション <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="caption"
            name="caption"
            value={formData.caption}
            onChange={handleInputChange}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-black"
            placeholder="この写真について説明してください..."
          />
          <div className="mt-1 flex justify-between">
            <div>
              {formState.errors.caption && (
                <p className="text-sm text-red-600">
                  {formState.errors.caption}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {formData.caption.length} / 500
            </p>
          </div>
        </div>

        {/* 位置情報 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            位置情報 <span className="text-rose-500">*</span>
          </label>
          <div className="p-4 bg-gradient-to-br from-rose-50/50 to-pink-50/50 backdrop-blur-sm rounded-xl border-2 border-rose-100 shadow-sm">
            {formData.latitude !== 0 && formData.longitude !== 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-green-600 font-semibold">✓ 位置情報取得済み</span>
                </div>
                <p className="text-sm text-gray-600">
                  緯度: {formData.latitude.toFixed(6)}, 経度:{' '}
                  {formData.longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                位置情報が取得されていません
              </p>
            )}
          </div>
          {formState.errors.location && (
            <p className="mt-1 text-sm text-red-600">
              {formState.errors.location}
            </p>
          )}
        </div>

        {/* 全体エラー */}
        {formState.errors.general && (
          <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-xl shadow-sm">
            <p className="text-sm text-rose-600 font-medium">{formState.errors.general}</p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-lg font-bold rounded-2xl hover:from-rose-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 shadow-xl touch-manipulation"
          >
            {formState.isSubmitting ? '投稿中...' : '投稿する'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={formState.isSubmitting}
              className="px-8 py-4 border-2 border-rose-300 text-rose-600 font-semibold rounded-2xl hover:bg-rose-50 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 active:scale-95 transition-all duration-200 shadow-lg"
            >
              キャンセル
            </button>
          )}
          </div>
        </form>
        </div>
      )}
      </div>
    </div>
  );
}