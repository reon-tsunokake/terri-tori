import { User } from 'firebase/auth';
import { UserDocument } from './firestore';

// 認証状態の型
export interface AuthState {
  user: User | null;
  userProfile: UserDocument | null;
  loading: boolean;
}

// ログインデータ
export interface SignInData {
  email: string;
  password: string;
}

// 新規登録データ
export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

// 認証結果
export interface AuthResult {
  user: User;
  isNewUser?: boolean;
}

// 認証エラー
export interface AuthError {
  code: string;
  message: string;
}

// 認証コンテキストの型
export interface AuthContextType {
  user: User | null;
  userProfile: UserDocument | null;
  loading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserDocument>) => Promise<void>;
}

// Firebase Auth エラーコード
export type FirebaseAuthErrorCode = 
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/weak-password'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/too-many-requests'
  | 'auth/popup-closed-by-user'
  | 'auth/network-request-failed';