'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/components/AuthProvider';
interface Requisition {
  _id: string;
  requisitionNumber: string;
  requestingWarehouseId: any;
  status: string;
  createdAt: string;
  createdBy: any;
}

type ViewType = 'all' | 'sent' | 'received';

export default function RequisitionsPage() {
  const { data: session } = useSession();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [allRequisitions, setAllRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('all');

  useEffect(() => {
    fetchRequisitions();
  }, []);

  useEffect(() => {
    filterRequisitions();
  }, [viewType, allRequisitions, session]);

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'MANAGER';
  const userId = (session?.user as any)?.id;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const managerWarehouseIds = primaryWarehouseId 
    ? [primaryWarehouseId, ...assignedWarehouses]
    : assignedWarehouses;

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requisitions');
      const data = await res.json();
      const reqs = Array.isArray(data) ? data : [];
      setAllRequisitions(reqs);
      setRequisitions(reqs);
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
      setAllRequisitions([]);
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequisitions = () => {
    if (userRole !== 'MANAGER' || viewType === 'all') {
      setRequisitions(allRequisitions);
      return;
    }

    if (viewType === 'sent') {
      // Requisitions created by this manager
      const sent = allRequisitions.filter((req) => {
        const createdById = req.createdBy?._id || req.createdBy;
        return createdById?.toString() === userId?.toString();
      });
      setRequisitions(sent);
    } else if (viewType === 'received') {
      // Requisitions where this manager can approve (not from their warehouse)
      const received = allRequisitions.filter((req) => {
        const requestingWarehouseId = req.requestingWarehouseId?._id || req.requestingWarehouseId;
        const requestingWarehouseIdStr = requestingWarehouseId?.toString ? requestingWarehouseId.toString() : String(requestingWarehouseId);
        
        // Received = requisitions NOT from this manager's warehouse (they can approve these)
        const isFromMyWarehouse = managerWarehouseIds.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === requestingWarehouseIdStr;
        });
        
        return !isFromMyWarehouse;
      });
      setRequisitions(received);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'REJECTED':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'SUBMITTED':
        return 'bg-muted/50 text-muted-foreground border-border';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Requisitions</h1>
        {canCreate && (
          <Link
            href="/requisitions/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            New Requisition
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
            Sent ({allRequisitions.filter((req) => {
              const createdById = req.createdBy?._id || req.createdBy;
              return createdById?.toString() === userId?.toString();
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
            Received ({allRequisitions.filter((req) => {
              const requestingWarehouseId = req.requestingWarehouseId?._id || req.requestingWarehouseId;
              const requestingWarehouseIdStr = requestingWarehouseId?.toString ? requestingWarehouseId.toString() : String(requestingWarehouseId);
              const isFromMyWarehouse = managerWarehouseIds.some((whId: any) => {
                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                return whIdStr === requestingWarehouseIdStr;
              });
              return !isFromMyWarehouse;
            }).length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading requisitions...</div>
      ) : (
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Requesting Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {requisitions.map((req) => (
                <tr key={req._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {req.requisitionNumber}
                      {(req.status === 'APPROVED' || req.status === 'REJECTED') && (
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(
                            req.status
                          )}`}
                        >
                          {req.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {req.requestingWarehouseId?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/requisitions/${req._id}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requisitions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No requisitions found</div>
          )}
        </div>
      )}
    </div>
  );
}

