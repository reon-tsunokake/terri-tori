import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * ログインしていない場合は/loginにリダイレクトする認証フック
 * @param redirectIfGuest trueの場合、未ログイン時にリダイレクトする
 */
export default function useRequireAuth(redirectIfGuest: boolean = true) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && redirectIfGuest) {
      router.push('/require-login');
    }
  }, [user, loading, redirectIfGuest, router]);

  return { user, loading };
}
