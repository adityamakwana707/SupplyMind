

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { getDashboardData } from '@/lib/services/dashboardService';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export default async function DashboardPage() {
  const session = await getServerSessionFirebase();

  if (!session) {
    redirect('/auth/signin?clear=1');
  }

  try {
    const dashboardData = await getDashboardData();
    return (
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Intelligence Dashboard...</div>}>
        <DashboardClient initialData={dashboardData} />
      </Suspense>
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    // Return empty data on error so page still loads
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardClient
          initialData={{
            totalSKUs: 0,
            lowStockCount: 0,
            pendingRequisitions: 0,
            pendingTransfers: 0,
            slowDeadStockCount: 0,
            stockoutEvents: 0,
            revenueAtRisk: 0,
            impactedOrdersCount: 0,
            vendorDiversificationIndex: 100,
          }}
        />
      </Suspense>
    );
  }
}

