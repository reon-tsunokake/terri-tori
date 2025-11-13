// 投稿フォームのデータ型
export interface PostFormData {
  imageFile: File | null;
  caption: string;
  regionId: string;
  latitude: number;
  longitude: number;
}

// 投稿フォームのエラー型
export interface PostFormErrors {
  imageFile?: string;
  caption?: string;
  regionId?: string;
  location?: string;
  general?: string;
}

// 投稿フォームの状態
export interface PostFormState {
  isSubmitting: boolean;
  errors: PostFormErrors;
  previewUrl: string | null;
}

// 地域選択肢
export interface RegionOption {
  id: string;
  name: string;
}
