import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { SignInData, SignUpData, AuthResult, AuthError } from '../types/auth';

/**
 * 認証サービス
 * Firebase Authenticationとの通信を担当
 */
export class AuthService {
  /**
   * メール・パスワードでログイン
   */
  static async signIn(data: SignInData): Promise<AuthResult> {
    try {
      console.log('Signing in user...', { email: data.email });
      const result = await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('User signed in successfully:', result.user.uid);
      
      return {
        user: result.user,
        isNewUser: false,
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * メール・パスワードで新規登録
   */
  static async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      console.log('Creating user account...', { email: data.email, displayName: data.displayName });
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      console.log('User account created successfully:', result.user.uid);
      
      // プロフィールの更新
      if (data.displayName && result.user) {
        console.log('Updating user profile...');
        await updateProfile(result.user, { displayName: data.displayName });
        console.log('User profile updated successfully');
      }
      
      return {
        user: result.user,
        isNewUser: true,
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        console.error('Email already in use:', data.email);
      }
      throw this.handleAuthError(error);
    }
  }

  /**
   * Googleアカウントでログイン
   */
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('Signing in with Google...');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign in successful:', result.user.uid);
      
      return {
        user: result.user,
        isNewUser: false, // Google認証では新規ユーザーかどうかの判定は別途必要
      };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * ログアウト
   */
  static async signOut(): Promise<void> {
    try {
      console.log('Signing out user...');
      await signOut(auth);
      console.log('User signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * 現在のユーザーを取得
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Firebase Authエラーを統一的に処理
   */
  private static handleAuthError(error: any): AuthError {
    return {
      code: error.code || 'auth/unknown-error',
      message: error.message || 'An unknown error occurred',
    };
  }

  /**
   * エラーコードを日本語メッセージに変換
   * セキュリティを考慮して詳細な情報は提供しない
   */
  static getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません。';
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上で入力してください。';
      case 'auth/too-many-requests':
        return '試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。';
      case 'auth/popup-closed-by-user':
        return 'ログインがキャンセルされました。';
      case 'auth/network-request-failed':
        return 'ネットワークエラーが発生しました。接続を確認してください。';
      // セキュリティ上、詳細な情報を提供しないエラー
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'メールアドレスまたはパスワードが正しくありません。';
      default:
        return '認証エラーが発生しました。もう一度お試しください。';
    }
  }
}