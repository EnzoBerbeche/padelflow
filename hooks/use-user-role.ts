import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'player' | 'juge_arbitre' | 'admin' | 'club';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleConfirmed, setRoleConfirmed] = useState(false);

  useEffect(() => {
    let isActive = true;

    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!isActive) return;

        if (user) {
          const userRole = user.user_metadata?.role as UserRole;

          if (userRole && userRole !== 'player') {
            setRole(userRole);
            setRoleConfirmed(true);
          } else if (!roleConfirmed) {
            setRole(userRole || 'player');
          }
        } else {
          if (isActive && !roleConfirmed) setRole(null);
        }
      } catch (error) {
        console.error('Error getting user role:', error);
        if (isActive && !roleConfirmed) setRole('player');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    getUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isActive) return;

        if (session?.user) {
          const userRole = session.user.user_metadata?.role as UserRole;

          if (userRole && userRole !== 'player') {
            setRole(userRole);
            setRoleConfirmed(true);
          } else if (!roleConfirmed) {
            setRole(userRole || 'player');
          }
        } else {
          if (isActive && !roleConfirmed) setRole(null);
        }

        if (isActive) setLoading(false);
      }
    );

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [roleConfirmed]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isJugeArbitre: role === 'juge_arbitre',
    isClub: role === 'club',
    isPlayer: role === 'player'
  };
}
