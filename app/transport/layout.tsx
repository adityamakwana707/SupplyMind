import SidebarLayout from '@/components/SidebarLayout';

export default function TransportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout>
      {children}
    </SidebarLayout>
  );
}
