'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useCurrentUserId() {
  const { user, isLoaded } = useSupabaseUser();
  if (!isLoaded) return null;
  return user?.id ?? null;
}

export function useSupabaseUser(): { user: import('@supabase/supabase-js').User | null; isLoaded: boolean } {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isActive) return;
      setUser(data.user ?? null);
      setIsLoaded(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoaded(true);
    });

    return () => {
      isActive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoaded };
}

export function useSupabaseAuth(): { isLoaded: boolean; isSignedIn: boolean } {
  const { user, isLoaded } = useSupabaseUser();
  return { isLoaded, isSignedIn: Boolean(user) };
}