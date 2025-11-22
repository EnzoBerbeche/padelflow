import { supabase } from './client';

// Partners API
export interface PartnerRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  phone: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export type AppPartner = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  phone?: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export function mapPartnerRow(row: PartnerRow): AppPartner {
  return {
    id: row.id,
    user_id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    license_number: row.license_number,
    phone: row.phone ?? undefined,
    email: row.email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const partnersAPI = {
  // Get current user's partners
  getMyPartners: async (): Promise<AppPartner[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partners:', error);
      return [];
    }

    return (data || []).map(mapPartnerRow);
  },

  // Create a new partner
  create: async (partner: Omit<AppPartner, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<AppPartner | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('partners')
      .insert({
        user_id: userId,
        first_name: partner.first_name,
        last_name: partner.last_name,
        license_number: partner.license_number,
        phone: partner.phone || null,
        email: partner.email,
      })
      .select('*')
      .single();

    // If we have data, the insert succeeded even if there's an error
    if (data) {
      return mapPartnerRow(data as unknown as PartnerRow);
    }

    if (error) {
      // Extract error information directly
      const errorCode = (error as any).code;
      const errorMessage = (error as any).message;
      const errorDetails = (error as any).details;
      const errorHint = (error as any).hint;

      // Check if table doesn't exist
      if (errorCode === '42P01' || errorMessage?.includes('does not exist') || errorMessage?.includes('n\'existe pas')) {
        throw new Error('La table "partners" n\'existe pas. Veuillez executer le script SQL "scripts/create-partners-table.sql" dans Supabase.');
      }

      // If duplicate, try to update instead
      if (errorCode === '23505') { // Unique violation
        const { data: existing } = await supabase
          .from('partners')
          .select('*')
          .eq('user_id', userId)
          .eq('license_number', partner.license_number)
          .single();

        if (existing) {
          return await partnersAPI.update(existing.id, partner);
        }
      }

      // Build a more detailed error message
      const finalErrorMessage = errorMessage ||
                          errorDetails ||
                          errorHint ||
                          String(error) ||
                          `Erreur lors de la creation du partenaire (code: ${errorCode || 'unknown'})`;
      throw new Error(finalErrorMessage);
    }

    // Should not reach here, but just in case
    return null;
  },

  // Update a partner
  update: async (id: string, updates: Partial<AppPartner>): Promise<AppPartner | null> => {
    const { data, error } = await supabase
      .from('partners')
      .update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        license_number: updates.license_number,
        phone: updates.phone ?? null,
        email: updates.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating partner:', error);
      return null;
    }

    return mapPartnerRow(data as unknown as PartnerRow);
  },

  // Delete a partner
  delete: async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting partner:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};
