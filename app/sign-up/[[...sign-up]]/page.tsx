'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery) setEmail(fromQuery);
  }, [searchParams]);

  const signUpWithEmail = async () => {
    setLoading(true);
    setMessage(null);
    if (password !== confirmPassword) {
      setLoading(false);
      setMessage('Passwords do not match');
      return;
    }
    // Check duplicate email on server
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.exists) {
          setLoading(false);
          setMessage('An account with this email already exists. Please sign in.');
          return;
        }
      } else {
        console.warn('Email existence check returned non-OK');
      }
    } catch (e) {
      console.warn('Email existence check failed', e);
      // proceed to sign up and rely on Supabase error if duplicate
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard/tournaments`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          display_name: `${firstName || ''} ${lastName || ''}`.trim(),
        },
      }
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      // If email confirmations are enabled, user must confirm via email
      if (!data.session) {
        setMessage('Account created. Please check your email to confirm your address.');
      } else {
        router.replace('/dashboard/tournaments');
      }
    }
  };

  // OAuth disabled for now
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join PadelFlow
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to start managing tournaments
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button className="w-full" onClick={signUpWithEmail} disabled={loading || !email}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
            {message && <p className="text-sm text-gray-600">{message}</p>}
          </div>
          <div className="h-px bg-gray-200" />
        </div>
      </div>
    </div>
  );
} 