import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensureProfileExists(params: {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
}): Promise<{ ok: boolean; error?: string; profile?: Profile }> {
  const { userId, firstName, lastName, dateOfBirth, address, city, postalCode, country, phone } = params;
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  if (existing) {
    return { ok: true, profile: existing as unknown as Profile };
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth ?? null,
      address: address ?? null,
      city: city ?? null,
      postal_code: postalCode ?? null,
      country: country ?? null,
      phone: phone ?? null,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, profile: data as unknown as Profile };
}


