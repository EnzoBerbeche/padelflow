import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users (paginated - we'll need to handle pagination if there are many users)
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: `Failed to fetch users: ${error.message}` }, { status: 500 });
    }

    // Filter users with role 'juge_arbitre' and map to a simpler format
    const jugeArbitres = (data.users || [])
      .filter((u) => u.user_metadata?.role === 'juge_arbitre')
      .map((u) => ({
        id: u.id,
        email: u.email || '',
        display_name: u.user_metadata?.display_name || null,
      }))
      .sort((a, b) => (a.email || '').localeCompare(b.email || ''));

    return NextResponse.json({ jugeArbitres });
  } catch (err: any) {
    console.error('Error fetching juge arbitres:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

