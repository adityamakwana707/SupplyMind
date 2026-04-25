'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/components/AuthProvider';
interface Delivery {
  _id: string;
  deliveryNumber: string;
  warehouseId: any; // Source warehouse
  targetWarehouseId?: any; // Target warehouse
  customerName?: string;
  status: string;
  createdAt: string;
  createdBy: any;
}

type ViewType = 'all' | 'sent' | 'received';

export default function DeliveriesPage() {
  const { data: session } = useSession();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<ViewType>('all');

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'MANAGER'; // Only Managers can create deliveries
  const userId = (session?.user as any)?.id;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const managerWarehouseIds = primaryWarehouseId 
    ? [primaryWarehouseId, ...assignedWarehouses]
    : assignedWarehouses;

  useEffect(() => {
    fetchDeliveries();
  }, [search]);

  useEffect(() => {
    filterDeliveries();
  }, [viewType, allDeliveries, session]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const url = search
        ? `/api/deliveries?search=${encodeURIComponent(search)}`
        : '/api/deliveries';
      const res = await fetch(url);
      const data = await res.json();
      const dels = Array.isArray(data) ? data : [];
      setAllDeliveries(dels);
      setDeliveries(dels);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      setAllDeliveries([]);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDeliveries = () => {
    if (userRole !== 'MANAGER' || viewType === 'all') {
      setDeliveries(allDeliveries);
      return;
    }

    if (viewType === 'sent') {
      // Deliveries where this manager's warehouse is the source (warehouseId)
      const sent = allDeliveries.filter((del) => {
        const sourceWarehouseId = del.warehouseId?._id || del.warehouseId;
        const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
        
        const isFromMyWarehouse = managerWarehouseIds.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === sourceWarehouseIdStr;
        });
        
        return isFromMyWarehouse;
      });
      setDeliveries(sent);
    } else if (viewType === 'received') {
      // Deliveries where this manager's warehouse is the target (targetWarehouseId)
      const received = allDeliveries.filter((del) => {
        const targetWarehouseId = del.targetWarehouseId?._id || del.targetWarehouseId;
        if (!targetWarehouseId) return false;
        
        const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
        
        const isToMyWarehouse = managerWarehouseIds.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === targetWarehouseIdStr;
        });
        
        return isToMyWarehouse;
      });
      setDeliveries(received);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'READY':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'WAITING':
        return 'bg-muted/50 text-muted-foreground border-border';
      case 'REJECTED':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Deliveries</h1>
        {canCreate && (
          <Link
            href="/deliveries/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            New Delivery
          </Link>
        )}
      </div>

      {/* Tabs for Managers */}
      {userRole === 'MANAGER' && (
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setViewType('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewType('sent')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'sent'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sent ({allDeliveries.filter((del) => {
              const sourceWarehouseId = del.warehouseId?._id || del.warehouseId;
              const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
              return managerWarehouseIds.some((whId: any) => {
                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                return whIdStr === sourceWarehouseIdStr;
              });
            }).length})
          </button>
          <button
            onClick={() => setViewType('received')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'received'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Received ({allDeliveries.filter((del) => {
              const targetWarehouseId = del.targetWarehouseId?._id || del.targetWarehouseId;
              if (!targetWarehouseId) return false;
              const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
              return managerWarehouseIds.some((whId: any) => {
                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                return whIdStr === targetWarehouseIdStr;
              });
            }).length})
          </button>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deliveries by reference or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading deliveries...</div>
      ) : (
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  From Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  To (Warehouse / Customer)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {deliveries.map((delivery) => (
                <tr key={delivery._id} className="hover:bg-muted/30 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {delivery.deliveryNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {delivery.warehouseId?.name || delivery.warehouseId?.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {delivery.targetWarehouseId?.name || delivery.targetWarehouseId?.code || delivery.customerName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(delivery.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                        delivery.status
                      )}`}
                    >
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/deliveries/${delivery._id}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deliveries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No deliveries found</div>
          )}
        </div>
      )}
    </div>
  );
}

