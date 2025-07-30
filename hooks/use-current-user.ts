'use client';

import { useUser } from '@clerk/nextjs';

export function useCurrentUserId() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) {
    return null;
  }
  
  return user?.id || null;
} 