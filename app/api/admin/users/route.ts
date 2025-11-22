import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization');

    // Create a client with the user's token to verify their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Verify the caller is authenticated and is an admin
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const callerRole = caller.user_metadata?.role;
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Create admin client for the actual operation
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

