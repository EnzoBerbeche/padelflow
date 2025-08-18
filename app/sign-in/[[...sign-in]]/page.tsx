'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      router.replace('/dashboard/tournaments');
    }
  };

  const signInWith = async (provider: 'google' | 'github' | 'facebook') => {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/dashboard/tournaments` } });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to PadelFlow
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your tournaments
          </p>
        </div>
        <div className="space-y-4">
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
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/sign-in` });
                  setMessage(error ? error.message : 'Check your email to reset your password.');
                }}
              >
                Forgot password?
              </button>
            </div>
          </div>
          <div className="h-px bg-gray-200" />
          <Button className="w-full" onClick={() => signInWith('google')}>Continue with Google</Button>
          <Button variant="outline" className="w-full" onClick={() => signInWith('github')}>Continue with GitHub</Button>
        </div>
      </div>
    </div>
  );
} 