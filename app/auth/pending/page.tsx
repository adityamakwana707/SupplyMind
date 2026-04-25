'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Clock, Mail, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function PendingApprovalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get email from session or localStorage
    const storedEmail = localStorage.getItem('pendingUserEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleSignOut = async () => {
    localStorage.removeItem('pendingUserEmail');

    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch (error) {
      console.error('Failed to clear server session cookie:', error);
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase sign out failed:', error);
    }

    router.replace('/auth/signin');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background px-4">
      <div className="max-w-md w-full bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-8 text-center shadow-2xl">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-yellow-400 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">Account Pending Approval</h1>
        
        <p className="text-muted-foreground mb-6">
          Your account registration is pending approval by an administrator.
        </p>

        {email && (
          <div className="mb-6 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-black/10 dark:border-white/10">
            <div className="flex items-center justify-center gap-2 text-foreground">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{email}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg backdrop-blur-sm">
            <p className="text-primary text-sm">
              ⏳ You will be able to log in once an administrator approves your account.
            </p>
          </div>

          <div className="p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-black/10 dark:border-white/10">
            <p className="text-foreground text-sm mb-2">What happens next?</p>
            <ul className="text-left text-sm text-muted-foreground space-y-1">
              <li>• An administrator will review your registration</li>
              <li>• You'll be assigned a role and warehouse access</li>
              <li>• You'll receive access to the system</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 hover:bg-accent text-foreground rounded-lg transition-colors backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4" />
              Back to Login
            </button>
            <Link
              href="/signup"
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-center"
            >
              Register Another
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

