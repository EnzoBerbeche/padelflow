'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signInWithPassword = async () => {
    setLoading(true);
    setMessage(null);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // If the user does not exist, send them to sign-up with email prefilled
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('not found')) {
        router.push(`/sign-up?email=${encodeURIComponent(email)}`);
        return;
      }
      setMessage(error.message);
      return;
    }
    if (data.session) {
      // Backfill display_name if missing
      const displayName = data.user?.user_metadata?.display_name as string | undefined;
      if (!displayName) {
        const given = (data.user?.user_metadata?.first_name || data.user?.user_metadata?.given_name || '').trim();
        const family = (data.user?.user_metadata?.last_name || data.user?.user_metadata?.family_name || '').trim();
        const name = (data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || '').trim();
        const computed = `${given || ''} ${family || ''}`.trim() || name;
        if (computed) {
          await supabase.auth.updateUser({ data: { display_name: computed } });
        }
      }
      router.replace('/dashboard/tournaments');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to PadelFlow</CardTitle>
          <CardDescription>Sign in to manage your tournaments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button className="w-full" onClick={signInWithPassword} disabled={loading || !email || !password}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <div className="flex justify-between text-sm">
              <Link href={`/sign-up?email=${encodeURIComponent(email || '')}`} className="text-primary">
                Create an account
              </Link>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900"
                onClick={async () => {
                  if (!email) { setMessage('Enter your email to reset your password.'); return; }
                  setMessage(null);
                  try {
                    const res = await fetch('/api/auth/check-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    });
                    if (res.ok) {
                      const json = await res.json();
                      if (!json?.exists) {
                        setMessage('No account found with this email. Please sign up.');
                        return;
                      }
                    }
                  } catch {
                    // If check fails, continue to call reset to avoid blocking
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
                  setMessage(error ? error.message : 'Check your email to reset your password.');
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="text-center text-base mt-2">
              <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium">Back to home</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 