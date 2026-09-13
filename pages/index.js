import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToken } from '../lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? '/sales' : '/login');
  }, [router]);

  return null;
}
