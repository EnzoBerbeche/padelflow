import { supabase, isValidEmail } from './client';

// Clubs API
export interface SupabaseClubRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  country_code: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  manager: string | null;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClubCourtRow {
  id: string;
  club_id: string;
  court_number: number;
  court_name: string | null;
  court_type: 'inside' | 'outside' | 'covered';
  created_at: string;
  updated_at: string;
}

export type AppClub = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  manager?: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
};

export type AppClubCourt = {
  id: string;
  club_id: string;
  court_number: number;
  court_name?: string;
  court_type: 'inside' | 'outside' | 'covered';
  created_at: string;
  updated_at: string;
};

export function mapClubRow(row: SupabaseClubRow): AppClub {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    address: row.address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    city: row.city ?? undefined,
    postal_code: row.postal_code ?? undefined,
    country: row.country ?? undefined,
    country_code: row.country_code ?? undefined,
    website: row.website ?? undefined,
    instagram: row.instagram ?? undefined,
    facebook: row.facebook ?? undefined,
    manager: row.manager ?? undefined,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapClubCourtRow(row: SupabaseClubCourtRow): AppClubCourt {
  return {
    id: row.id,
    club_id: row.club_id,
    court_number: row.court_number,
    court_name: row.court_name ?? undefined,
    court_type: row.court_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const clubCourtsAPI = {
  // List courts for a club
  listByClub: async (clubId: string): Promise<AppClubCourt[]> => {
    const { data, error } = await supabase
      .from('club_courts')
      .select('*')
      .eq('club_id', clubId)
      .order('court_number', { ascending: true });

    if (error) {
      console.error('Error fetching club courts:', error);
      return [];
    }
    return ((data as unknown as SupabaseClubCourtRow[]) || []).map(mapClubCourtRow);
  },

  // Create new court
  create: async (court: Omit<AppClubCourt, 'id' | 'created_at' | 'updated_at'>): Promise<AppClubCourt | null> => {
    const { data, error } = await supabase
      .from('club_courts')
      .insert({
        club_id: court.club_id,
        court_number: court.court_number,
        court_name: court.court_name || null,
        court_type: court.court_type,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating club court:', error);
      return null;
    }
    return mapClubCourtRow(data as unknown as SupabaseClubCourtRow);
  },

  // Update court
  update: async (id: string, updates: Partial<Omit<AppClubCourt, 'id' | 'club_id' | 'created_at' | 'updated_at'>>): Promise<AppClubCourt | null> => {
    const { data, error } = await supabase
      .from('club_courts')
      .update({
        court_number: updates.court_number,
        court_name: updates.court_name || null,
        court_type: updates.court_type,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating club court:', error);
      return null;
    }
    return mapClubCourtRow(data as unknown as SupabaseClubCourtRow);
  },

  // Delete court
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('club_courts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting club court:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};

// Club Management APIs

// Club Managers API - Association entre users "club" et les clubs qu'ils gerent
export interface ClubManagerRow {
  id: string;
  club_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const clubManagersAPI = {
  // Assigner un club a un user "club" (admin only)
  assign: async (clubId: string, userId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('club_managers')
      .insert({
        club_id: clubId,
        user_id: userId,
      });

    if (error) {
      console.error('Error assigning club to user:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  // Retirer un club d'un user "club" (admin only)
  unassign: async (clubId: string, userId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('club_managers')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unassigning club from user:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  // Lister les clubs geres par un user "club"
  listClubsForUser: async (userId: string): Promise<AppClub[]> => {
    const { data, error } = await supabase
      .from('club_managers')
      .select(`
        club_id,
        clubs (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching clubs for user:', error);
      return [];
    }

    return ((data || []) as Array<{ club_id: string; clubs: SupabaseClubRow | SupabaseClubRow[] }>)
      .map(item => {
        const club = Array.isArray(item.clubs) ? item.clubs[0] : item.clubs;
        return club ? mapClubRow(club) : null;
      })
      .filter(Boolean) as AppClub[];
  },

  // Lister les users "club" qui gerent un club (admin only)
  listUsersForClub: async (clubId: string): Promise<Array<{ user_id: string; email: string | null }>> => {
    const { data, error } = await supabase
      .from('club_managers')
      .select('user_id')
      .eq('club_id', clubId);

    if (error) {
      console.error('Error fetching users for club:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error hint:', error.hint);
      return [];
    }

    // Recuperer les emails via une requete separee si necessaire
    // Pour l'instant, on retourne juste les user_id, l'email sera recupere cote client
    return (data || []).map(item => ({
      user_id: item.user_id,
      email: null, // L'email sera recupere depuis la liste des users cote client
    }));
  },
};

// Club Juge Arbitres API - Association entre juges arbitres et les clubs
export interface ClubJugeArbitreRow {
  id: string;
  club_id: string;
  user_id: string;
  validated_by: string;
  validated_at: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export const clubJugeArbitresAPI = {
  // Valider un juge arbitre pour un club (user "club" or "admin" only)
  // Accepte directement un user_id et un email (recupere depuis la liste des juges arbitres)
  validate: async (clubId: string, userId: string, email: string): Promise<{ ok: boolean; error?: string }> => {
    // Validate email format
    if (!email || !isValidEmail(email)) {
      return { ok: false, error: 'Invalid email format' };
    }

    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;
    if (!currentUserId) {
      return { ok: false, error: 'Not authenticated' };
    }

    // Verifier que l'utilisateur actuel est admin ou gere ce club
    const role = userData.user?.user_metadata?.role;
    if (role !== 'admin') {
      if (role !== 'club') {
        return { ok: false, error: 'Unauthorized: Only club users and admins can validate juge arbitres' };
      }
      // Verifier que le user "club" gere ce club
      const { data: managerCheck } = await supabase
        .from('club_managers')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', currentUserId)
        .single();

      if (!managerCheck) {
        return { ok: false, error: 'Unauthorized: You do not manage this club' };
      }
    }

    // Inserer dans club_juge_arbitres
    const { error } = await supabase
      .from('club_juge_arbitres')
      .insert({
        club_id: clubId,
        user_id: userId,
        validated_by: currentUserId,
        email: email.toLowerCase(),
      });

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Juge arbitre already validated for this club' };
      }
      console.error('Error validating juge arbitre:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  // Retirer un juge arbitre d'un club (user "club" only)
  unvalidate: async (clubId: string, userId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('club_juge_arbitres')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unvalidating juge arbitre:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  // Lister les clubs associes a un juge arbitre
  listClubsForJugeArbitre: async (userId: string): Promise<AppClub[]> => {
    const { data, error } = await supabase
      .from('club_juge_arbitres')
      .select(`
        club_id,
        clubs (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching clubs for juge arbitre:', error);
      return [];
    }

    return ((data || []) as Array<{ club_id: string; clubs: SupabaseClubRow | SupabaseClubRow[] }>)
      .map(item => {
        const club = Array.isArray(item.clubs) ? item.clubs[0] : item.clubs;
        return club ? mapClubRow(club) : null;
      })
      .filter(Boolean) as AppClub[];
  },

  // Lister les juges arbitres valides pour un club (user "club" only)
  listJugeArbitresForClub: async (clubId: string): Promise<Array<{ user_id: string; email: string; validated_at: string }>> => {
    const { data, error } = await supabase
      .from('club_juge_arbitres')
      .select('user_id, email, validated_at')
      .eq('club_id', clubId)
      .order('validated_at', { ascending: false });

    if (error) {
      console.error('Error fetching juge arbitres for club:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error hint:', error.hint);
      return [];
    }

    return (data || []) as Array<{ user_id: string; email: string; validated_at: string }>;
  },
};

// Mise a jour de clubsAPI pour ajouter les nouvelles fonctions
export const clubsAPI = {
  // List current user's clubs
  listMy: async (): Promise<AppClub[]> => {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user?.id) {
      console.error('Error getting user:', authError);
      return [];
    }
    const userId = userData.user.id;

    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clubs:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }
    return ((data as unknown as SupabaseClubRow[]) || []).map(mapClubRow);
  },

  // List all clubs (admin only)
  listAll: async (): Promise<AppClub[]> => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all clubs:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error hint:', error.hint);
      return [];
    }
    return ((data as unknown as SupabaseClubRow[]) || []).map(mapClubRow);
  },

  // List clubs managed by current user (for users with role "club")
  listManagedByMe: async (): Promise<AppClub[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    return clubManagersAPI.listClubsForUser(userId);
  },

  // List clubs associated with current juge arbitre
  listAssociatedWithMe: async (): Promise<AppClub[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    return clubJugeArbitresAPI.listClubsForJugeArbitre(userId);
  },

  // Get by id (owner-only via RLS)
  getById: async (id: string): Promise<AppClub | null> => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching club by id:', error);
      return null;
    }
    return mapClubRow(data as unknown as SupabaseClubRow);
  },

  // Create new club (admin only)
  create: async (club: Omit<AppClub, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<AppClub | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    const { data, error } = await supabase
      .from('clubs')
      .insert({
        owner_id: userId,
        name: club.name,
        address: club.address,
        latitude: club.latitude || null,
        longitude: club.longitude || null,
        city: club.city || null,
        postal_code: club.postal_code || null,
        country: club.country || null,
        country_code: club.country_code || null,
        website: club.website || null,
        instagram: club.instagram || null,
        facebook: club.facebook || null,
        manager: club.manager || null,
        contact_email: club.contact_email,
        contact_phone: club.contact_phone,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating club:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('Table "clubs" does not exist. Please run the SQL schema script in Supabase.');
      }
      return null;
    }
    return mapClubRow(data as unknown as SupabaseClubRow);
  },

  // Update club (admin can update all, club users can update except name and address)
  update: async (id: string, updates: Partial<Omit<AppClub, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>): Promise<AppClub | null> => {
    // Only include club_id if it's explicitly provided (not undefined/null)
    const updatePayload: any = { ...updates };
    if (updatePayload.club_id === undefined || updatePayload.club_id === null) {
      delete updatePayload.club_id;
    }
    const { data, error } = await supabase
      .from('clubs')
      .update({
        name: updates.name,
        address: updates.address,
        latitude: updates.latitude || null,
        longitude: updates.longitude || null,
        city: updates.city || null,
        postal_code: updates.postal_code || null,
        country: updates.country || null,
        country_code: updates.country_code || null,
        website: updates.website || null,
        instagram: updates.instagram || null,
        facebook: updates.facebook || null,
        manager: updates.manager || null,
        contact_email: updates.contact_email,
        contact_phone: updates.contact_phone,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating club:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error hint:', error.hint);
      return null;
    }
    return mapClubRow(data as unknown as SupabaseClubRow);
  },

  // Delete club (admin only)
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting club:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};
