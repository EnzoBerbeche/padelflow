'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/use-current-user';
import { useUserRole } from '@/hooks/use-user-role';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('player' | 'juge_arbitre' | 'admin')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useSupabaseAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect to sign-in
  }

  // If allowedRoles is specified, check if user has permission
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 