import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { role } = await req.json();

    if (!role || !['player', 'juge_arbitre', 'admin', 'club'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

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

    // Get current user
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(userId);
    
    if (getUserError || !userData.user) {
      return NextResponse.json({ error: `Failed to get user: ${getUserError?.message || 'User not found'}` }, { status: 500 });
    }

    const currentMetadata = userData.user.user_metadata || {};

    // Update user metadata with new role
    const { data: updatedUserData, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...currentMetadata,
          role: role,
        },
      }
    );

    if (updateError || !updatedUserData.user) {
      return NextResponse.json({ error: `Failed to update user: ${updateError?.message || 'Update failed'}` }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: updatedUserData.user.id,
        email: updatedUserData.user.email,
        phone: updatedUserData.user.phone,
        role: updatedUserData.user.user_metadata?.role || 'player',
        created_at: updatedUserData.user.created_at,
        last_sign_in_at: updatedUserData.user.last_sign_in_at,
        email_confirmed_at: updatedUserData.user.email_confirmed_at,
      },
    });
  } catch (err: any) {
    console.error('Error updating user role:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

