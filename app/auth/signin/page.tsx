'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.location.search.includes('clear=1')) {
      fetch('/api/auth/session', { method: 'DELETE' }).then(() => {
        router.replace('/auth/signin');
        setError('Your login succeeded, but your user profile is missing from the database. Please contact an Administrator to assign your role.');
      });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!auth) throw new Error('Firebase Auth is not initialized');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Mint session cookie via new API route for middleware support
      const idToken = await userCredential.user.getIdToken();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError('Failed to establish session. Please try again.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid login credentials');
      } else {
        setError(err?.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background px-4 py-8 flex items-center justify-center">
      {/* Forms Container - Centered */}
      <div className="max-w-lg mx-auto w-full">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
        
        {/* Login Form - Active */}
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-primary/20 dark:border-primary/10 p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Login</h2>
          </div>

          {/* Logo inside form */}
          <div className="flex flex-col items-center justify-center mb-8 gap-2">
            {mounted && (
              <img src={theme === 'dark' ? '/app_dark.png' : '/sm.png'} alt="SupplyMind Logo" className="h-16 w-auto" />
            )}
            {!mounted && (
              <img src="/sm.png" alt="SupplyMind Logo" className="h-16 w-auto" />
            )}
            <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mt-2">SupplyMind Platform</h3>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm animate-in fade-in zoom-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Id
              </label>
              <input
                suppressHydrationWarning
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-background/50 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-sm transition-all"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                suppressHydrationWarning
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-background/50 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-sm transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="w-full py-3 bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:bg-muted disabled:opacity-70 disabled:cursor-not-allowed text-primary-foreground rounded-xl transition-all duration-300 font-bold flex items-center justify-center gap-2 transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : 'SIGN IN SECURELY'}
            </button>

            <div className="text-center text-xs text-muted-foreground pt-2">
              <a href="/auth/forgot-password" className="hover:text-primary transition-colors">
                Forget Password ?
              </a>
              {' | '}
              <a href="/signup" className="hover:text-primary transition-colors">
                Sign Up
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

