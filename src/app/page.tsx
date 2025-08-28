"use client";

import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Redirecionamento manual de backup caso o AuthProvider não funcione
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, router]);

  // Esta página nunca será renderizada na prática porque o AuthProvider
  // redirecionará automaticamente para /home (se autenticado) ou /login (se não autenticado)
  return null;
}