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

    // Map users to a simpler format
    const mappedUsers = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.user_metadata?.role || 'player',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
    }));

    return NextResponse.json({ users: mappedUsers });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

