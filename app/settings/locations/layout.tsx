import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

import { redirect } from 'next/navigation';

export default async function LocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionFirebase();

  if (!session) {
    redirect('/auth/signin');
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== 'ADMIN') {
    redirect('/settings');
  }

  // Sidebar is rendered by parent `app/settings/layout.tsx` to avoid duplicates.
  return children;
}

