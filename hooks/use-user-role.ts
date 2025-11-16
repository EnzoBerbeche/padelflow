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
        
        console.log('🔍 useUserRole - getUserRole called');
        console.log('🔍 User:', user);
        console.log('🔍 User metadata:', user?.user_metadata);
        
        if (!isActive) return;
        
        if (user) {
          // Get role from user metadata
          const userRole = user.user_metadata?.role as UserRole;
          console.log('🔍 Extracted role:', userRole);
          
          // If we have a valid role, set it and mark as confirmed
          if (userRole && userRole !== 'player') {
            setRole(userRole);
            setRoleConfirmed(true);
            console.log('🔍 Role confirmed as:', userRole);
          } else if (!roleConfirmed) {
            // Only set default if we haven't confirmed a role yet
            setRole(userRole || 'player');
          }
        } else {
          console.log('🔍 No user found');
          if (isActive && !roleConfirmed) setRole(null);
        }
      } catch (error) {
        console.error('❌ Error getting user role:', error);
        if (isActive && !roleConfirmed) setRole('player'); // Default fallback
      } finally {
        if (isActive) setLoading(false);
      }
    };

    getUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 Auth state change:', event, session?.user?.id);
        
        if (!isActive) return;
        
        if (session?.user) {
          const userRole = session.user.user_metadata?.role as UserRole;
          console.log('🔍 Session user role:', userRole);
          
          // If we have a valid role, set it and mark as confirmed
          if (userRole && userRole !== 'player') {
            setRole(userRole);
            setRoleConfirmed(true);
            console.log('🔍 Role confirmed as:', userRole);
          } else if (!roleConfirmed) {
            // Only set default if we haven't confirmed a role yet
            setRole(userRole || 'player');
          }
        } else {
          console.log('🔍 No session user');
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

  console.log('🔍 useUserRole hook state:', { role, loading, roleConfirmed, isAdmin: role === 'admin' });

  return { 
    role, 
    loading, 
    isAdmin: role === 'admin', 
    isJugeArbitre: role === 'juge_arbitre',
    isClub: role === 'club',
    isPlayer: role === 'player' 
  };
}
