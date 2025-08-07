'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to tournaments page immediately
    router.replace('/dashboard/tournaments');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to tournaments...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
} 