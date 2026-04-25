import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

import { redirect } from 'next/navigation';

export default async function WarehouseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionFirebase();

  if (!session) {
    redirect('/auth/signin');
  }

  // Allow all authenticated users to view warehouse details (read-only for non-admins)
  // Role-based UI controls are handled in the page component

  // Sidebar is rendered by parent `app/settings/layout.tsx` to avoid duplicates.
  return children;
}

