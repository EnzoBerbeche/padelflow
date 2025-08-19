import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Lazy create admin client to avoid instantiating at build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server not configured for email checks' }, { status: 500 });
    }
    // Call GoTrue Admin REST API directly to filter by email
    const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
    const resp = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store',
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `Admin request failed: ${resp.status} ${text}` }, { status: 500 });
    }
    const payload = await resp.json();
    const users = Array.isArray(payload?.users) ? payload.users : (Array.isArray(payload) ? payload : []);
    const exists = users.some((u: any) => (u.email || '').toLowerCase() === String(email).toLowerCase());
    return NextResponse.json({ exists });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}


