import { redirect } from 'next/navigation';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import SidebarLayout from '@/components/SidebarLayout';

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSessionFirebase();
  if (!session) redirect('/auth/signin');

  return (
    <SidebarLayout>
      <div className="p-6">{children}</div>
    </SidebarLayout>
  );
}

