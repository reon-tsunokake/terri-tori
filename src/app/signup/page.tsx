'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignUpForm } from '../../utils/validation';
import { AuthService } from '../../services/authService';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // クライアントサイドバリデーション
    const validationResults = validateSignUpForm(email, password, confirmPassword, displayName);
    const firstError = validationResults.find(result => !result.isValid);
    
    if (firstError) {
      setError(firstError.message || 'フォームの入力内容を確認してください。');
      return;
    }

    setLoading(true);

    try {
      await signUp({ email, password, displayName });
      router.push('/');
    } catch (error: any) {
      setError(AuthService.getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error: any) {
      setError(AuthService.getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 py-6 px-3 sm:py-12 sm:px-6">
      <div className="max-w-sm w-full space-y-6 fade-in">
        <div className="text-center">
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
            📸 Terri-tori
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-600 font-medium">
            新しいアカウントを作成
          </p>
          <div className="w-12 h-1 bg-gradient-to-r from-rose-400 to-pink-400 mx-auto mt-2 rounded-full"></div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-rose-100">
          <form className="space-y-5" onSubmit={handleEmailSignUp}>
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700 mb-2">
                  表示名 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-4 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                  placeholder="表示名を入力"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  メールアドレス <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                  placeholder="メールアドレスを入力"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  パスワード <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 pr-14 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                    placeholder="パスワードを入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-rose-500 transition-colors duration-300"
                  >
                    {showPassword ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  パスワード確認 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-4 pr-14 text-base border-2 border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                    placeholder="パスワードを再入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-rose-500 transition-colors duration-300"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50/80 backdrop-blur-sm p-4 rounded-xl border border-red-200">
                {error}
                {error.includes('既に登録されています') && (
                  <div className="mt-2">
                    <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600 transition-colors duration-300">
                      ログインページに移動 →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 text-base font-semibold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 focus:outline-none focus:ring-4 focus:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
              >
                {loading ? 'アカウント作成中...' : 'アカウント作成'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rose-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">または</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full py-4 px-4 text-base font-semibold border-2 border-rose-200 text-gray-700 rounded-xl bg-white hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Googleでアカウント作成
              </button>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                既にアカウントをお持ちの方は{' '}
                <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600 transition-colors duration-300">
                  ログイン
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}