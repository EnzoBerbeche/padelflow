import { createClient } from '@supabase/supabase-js';

// Read Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Validate required environment variables at startup
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please create a .env.local file with your Supabase credentials.'
  );
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Flag for checking configuration status
export const isConfigured = true;

// Sanitize input for ILIKE queries to prevent SQL injection
// Escapes special LIKE pattern characters: %, _, and \
export function sanitizeForLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
