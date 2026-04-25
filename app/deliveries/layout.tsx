import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';

export default async function DeliveriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionFirebase();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <SidebarLayout>
      <div className="p-6">{children}</div>
    </SidebarLayout>
  );
}

