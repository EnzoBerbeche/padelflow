import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { club_id, email } = await req.json();
    
    if (!club_id || !email || typeof email !== 'string') {
      return NextResponse.json({ error: 'club_id and email are required' }, { status: 400 });
    }

    // Vérifier l'authentification
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Vérifier que l'user a le rôle "club" et gère ce club
    const role = user.user_metadata?.role;
    if (role !== 'club' && role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Only club users and admins can validate juge arbitres' }, { status: 403 });
    }

    // Vérifier que l'user gère ce club (sauf si admin)
    if (role !== 'admin') {
      const { data: managerCheck } = await supabase
        .from('club_managers')
        .select('id')
        .eq('club_id', club_id)
        .eq('user_id', user.id)
        .single();

      if (!managerCheck) {
        return NextResponse.json({ error: 'Unauthorized: You do not manage this club' }, { status: 403 });
      }
    }

    // Chercher l'user par email via l'API admin
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured for user lookup' }, { status: 500 });
    }

    const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
    const resp = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store',
    });

    let userId: string | null = null;
    if (resp.ok) {
      const payload = await resp.json();
      const users = Array.isArray(payload?.users) ? payload.users : (Array.isArray(payload) ? payload : []);
      const foundUser = users.find((u: any) => (u.email || '').toLowerCase() === String(email).toLowerCase());
      userId = foundUser?.id || null;
    }

    // Si l'user n'existe pas encore, on crée l'association avec user_id NULL
    // On pourra mettre à jour plus tard quand l'user sera créé

    // Créer l'association
    const { error: insertError } = await supabase
      .from('club_juge_arbitres')
      .insert({
        club_id,
        user_id: userId || null,
        validated_by: user.id,
        email: email.toLowerCase(),
      });

    if (insertError) {
      // Si l'association existe déjà, c'est OK
      if (insertError.code === '23505') {
        return NextResponse.json({ user_id: userId, message: 'Juge arbitre already validated' });
      }
      console.error('Error validating juge arbitre:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ user_id: userId, message: 'Juge arbitre validated successfully' });
  } catch (err: any) {
    console.error('Error in validate-juge-arbitre:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

