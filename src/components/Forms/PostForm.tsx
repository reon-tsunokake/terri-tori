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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      // 少し遅延させてvideoRefが確実に利用可能になるようにする
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
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
            closeCamera();
          }
        }, 'image/jpeg', 0.9);
      }
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

      if (onSuccess) {
        onSuccess();
      }
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
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
      {isCameraOpen ? (
        // カメラ画面（全画面プレビュー）
        <div className="fixed inset-0 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* オーバーレイボタン */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
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
                  className="px-8 py-4 bg-gray-800/90 backdrop-blur-sm text-white rounded-full hover:bg-gray-700 active:scale-95 transition-all duration-200 shadow-2xl flex items-center gap-3"
                >
                  <MdCancel className="h-6 w-6" />
                  キャンセル
                </button>
              )}
            </div>
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
            <div className="mt-4 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={formState.previewUrl}
                alt="Preview"
                className="w-full aspect-video object-cover"
              />
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