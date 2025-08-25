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

    let didBackfill = false;
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoaded(true);

      // Backfill display_name once per mount if missing
      try {
        if (!didBackfill && currentUser) {
          const md: any = currentUser.user_metadata || {};
          const displayName: string | undefined = md.display_name;
          if (!displayName) {
            const given = (md.first_name || md.given_name || '').trim();
            const family = (md.last_name || md.family_name || '').trim();
            const name = (md.full_name || md.name || '').trim();
            const computed = `${given || ''} ${family || ''}`.trim() || name;
            if (computed) {
              didBackfill = true;
              // Preserve existing metadata including role
              const updatedMetadata = { 
                ...md, 
                display_name: computed 
              };
              await supabase.auth.updateUser({ data: updatedMetadata });
            }
          }
        }
      } catch {
        // noop
      }
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