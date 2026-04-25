'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        // In development, also show the console message
        if (process.env.NODE_ENV === 'development') {
          setMessage(data.message + ' Check the console for the reset link.');
        }
      } else {
        setError(data.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background px-4 py-8 flex items-center justify-center">
      <div className="max-w-lg mx-auto w-full">
        {/* Back Button */}
        <Link 
          href="/auth/signin" 
          className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Sign In</span>
        </Link>
        
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-primary/20 dark:border-primary/10 p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Forgot Password</h2>
          </div>

          {/* Logo inside form */}
          <div className="flex items-center justify-center mb-8">
            {mounted && (
              <img src={theme === 'dark' ? '/app_dark.png' : '/sm.png'} alt="StockMaster Logo" className="h-20 w-auto" />
            )}
            {!mounted && (
              <img src="/sm.png" alt="StockMaster Logo" className="h-20 w-auto" />
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className="p-3 bg-primary/10 border border-primary/50 rounded-lg text-primary text-sm">
              {message}
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-sm"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-colors duration-200"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          </form>
        </div>
      </div>
    </div>
  );
}

