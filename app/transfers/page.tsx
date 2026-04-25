'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Eye, Package, CheckCircle, Truck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/components/AuthProvider';
interface Transfer {
  _id: string;
  transferNumber: string;
  sourceWarehouseId: any;
  targetWarehouseId: any;
  status: string;
  createdAt: string;
}

interface Delivery {
  _id: string;
  deliveryNumber: string;
  warehouseId: any;
  targetWarehouseId?: any;
  requisitionId?: any;
  status: string;
  createdAt: string;
  lines: any[];
}

type ViewType = 'transfers' | 'pending' | 'approved' | 'pending-transfers';

export default function TransfersPage() {
  const { data: session } = useSession();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [approvedDeliveries, setApprovedDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('transfers');

  const userRole = (session?.user as any)?.role;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  const canCreate = userRole === 'OPERATOR';

  // Calculate pending transfers count
  const pendingTransfersCount = transfers.filter((transfer) => {
    // Show DRAFT transfers where operator is from source warehouse (can dispatch)
    if (transfer.status === 'DRAFT') {
      const sourceWarehouseId = transfer.sourceWarehouseId?._id || transfer.sourceWarehouseId;
      if (!sourceWarehouseId) return false;
      const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
      return assignedWarehouses.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === sourceWarehouseIdStr;
      });
    }
    // Show IN_TRANSIT transfers where operator is from target warehouse (can receive)
    if (transfer.status === 'IN_TRANSIT') {
      const targetWarehouseId = transfer.targetWarehouseId?._id || transfer.targetWarehouseId;
      if (!targetWarehouseId) return false;
      const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
      return assignedWarehouses.some((whId: any) => {
        const whIdStr = whId?.toString ? whId.toString() : String(whId);
        return whIdStr === targetWarehouseIdStr;
      });
    }
    return false;
  }).length;

  useEffect(() => {
    fetchTransfers();
    if (userRole === 'OPERATOR') {
      fetchDeliveries();
    }
  }, [session]);

  const fetchTransfers = async () => {
    try {
      // Always fetch all transfers - the API will filter based on operator's warehouses
      const res = await fetch('/api/transfers');
      const data = await res.json();
      const fetchedTransfers = Array.isArray(data) ? data : [];
      setTransfers(fetchedTransfers);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async () => {
    try {
      // Fetch WAITING deliveries (pending approval)
      const waitingRes = await fetch('/api/deliveries?status=WAITING');
      const waitingData = await waitingRes.json();
      const waiting = Array.isArray(waitingData) ? waitingData : [];
      
      // Fetch READY deliveries (approved, waiting for dispatch)
      const readyRes = await fetch('/api/deliveries?status=READY');
      const readyData = await readyRes.json();
      const ready = Array.isArray(readyData) ? readyData : [];
      
      // Fetch all transfers to check which deliveries already have transfers
      const transfersRes = await fetch('/api/transfers');
      const transfersData = await transfersRes.json();
      const allTransfers = Array.isArray(transfersData) ? transfersData : [];
      
      // Get list of delivery IDs that already have transfers
      const deliveriesWithTransfers = new Set(
        allTransfers
          .filter((t: any) => t.deliveryId)
          .map((t: any) => {
            const deliveryId = (t.deliveryId as any)?._id || t.deliveryId;
            return deliveryId?.toString ? deliveryId.toString() : String(deliveryId);
          })
      );
      
      // Filter deliveries where operator's warehouse is the source warehouse
      const filteredPending = waiting.filter((del: Delivery) => {
        if (!del.warehouseId || !del.requisitionId) return false;
        const sourceWarehouseId = (del.warehouseId as any)?._id || del.warehouseId;
        const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
        return assignedWarehouses.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === sourceWarehouseIdStr;
        });
      });
      
      // Filter approved deliveries: must be from operator's warehouse AND not already have a transfer
      const filteredApproved = ready.filter((del: Delivery) => {
        if (!del.warehouseId || !del.requisitionId) return false;
        
        // Check if delivery already has a transfer
        const deliveryId = (del._id as any)?.toString ? (del._id as any).toString() : String(del._id);
        if (deliveriesWithTransfers.has(deliveryId)) {
          return false; // Exclude deliveries that already have transfers
        }
        
        // Check if delivery is from operator's warehouse
        const sourceWarehouseId = (del.warehouseId as any)?._id || del.warehouseId;
        const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
        return assignedWarehouses.some((whId: any) => {
          const whIdStr = whId?.toString ? whId.toString() : String(whId);
          return whIdStr === sourceWarehouseIdStr;
        });
      });
      
      setPendingDeliveries(filteredPending);
      setApprovedDeliveries(filteredApproved);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      setPendingDeliveries([]);
      setApprovedDeliveries([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-primary/20 text-primary border-primary/50';
      case 'IN_TRANSIT':
        return 'bg-muted text-muted-foreground border-muted-foreground/50';
      case 'DRAFT':
        return 'bg-muted text-muted-foreground border-muted-foreground/50';
      case 'READY':
        return 'bg-primary/20 text-primary border-primary/50';
      case 'WAITING':
        return 'bg-muted text-muted-foreground border-muted-foreground/50';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/50';
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to mark this transfer as received? This will increment stock at your warehouse and complete the transfer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept transfer');
      }

      // Refresh transfers list
      await fetchTransfers();
      if (userRole === 'OPERATOR') {
        await fetchDeliveries();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to accept transfer');
    }
  };

  const handleDispatchTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to dispatch this transfer? This will decrement stock from your warehouse and mark it as in transit.')) {
      return;
    }

    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to dispatch transfer');
      }

      // Refresh transfers list
      await fetchTransfers();
      if (userRole === 'OPERATOR') {
        await fetchDeliveries();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to dispatch transfer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Transfers</h1>
        {canCreate && (
          <Link
            href="/transfers/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            New Transfer
          </Link>
        )}
      </div>

      {/* Tabs for Operators */}
      {userRole === 'OPERATOR' && (
        <div className="flex gap-2 border-b border-black/10 dark:border-white/10">
          <button
            onClick={() => setViewType('transfers')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'transfers'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setViewType('pending-transfers')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'pending-transfers'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Transfers ({pendingTransfersCount})
          </button>
          <button
            onClick={() => setViewType('pending')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'pending'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Deliveries ({pendingDeliveries.length})
          </button>
          <button
            onClick={() => setViewType('approved')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewType === 'approved'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Approved Deliveries ({approvedDeliveries.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Transfers Table */}
          {viewType === 'transfers' && (
            <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      To
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
                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                  {transfers.map((transfer) => (
                    <tr key={transfer._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {transfer.transferNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {transfer.sourceWarehouseId?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {transfer.targetWarehouseId?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                            transfer.status
                          )}`}
                        >
                          {transfer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(transfer.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {/* Accept button for IN_TRANSIT transfers */}
                          {transfer.status === 'IN_TRANSIT' && 
                           userRole === 'OPERATOR' && 
                           (() => {
                             const targetWarehouseId = transfer.targetWarehouseId?._id || transfer.targetWarehouseId;
                             const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
                             return assignedWarehouses.some((whId: any) => {
                               const whIdStr = whId?.toString ? whId.toString() : String(whId);
                               return whIdStr === targetWarehouseIdStr;
                             });
                           })() && (
                            <button
                              onClick={() => handleAcceptTransfer(transfer._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg transition-all duration-200"
                              title="Mark as Received"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Accept
                            </button>
                          )}
                          <Link
                            href={`/transfers/${transfer._id}`}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transfers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No transfers found</div>
              )}
            </div>
          )}

          {/* Pending Deliveries Table */}
          {viewType === 'pending' && (
            <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Delivery Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      To Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {pendingDeliveries.map((delivery) => (
                    <tr key={delivery._id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {delivery.deliveryNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {delivery.targetWarehouseId?.name || '-'} ({delivery.targetWarehouseId?.code || ''})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {delivery.lines?.length || 0} items
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(delivery.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/deliveries/${delivery._id}`}
                          className="text-primary hover:text-primary/80 transition-colors mr-3"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pendingDeliveries.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No pending deliveries waiting for approval</div>
              )}
            </div>
          )}

          {/* Pending Transfers Table */}
          {viewType === 'pending-transfers' && (
            <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Action Required
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {transfers
                    .filter((transfer) => {
                      // Show DRAFT transfers where operator is from source warehouse (can dispatch)
                      if (transfer.status === 'DRAFT') {
                        const sourceWarehouseId = transfer.sourceWarehouseId?._id || transfer.sourceWarehouseId;
                        if (!sourceWarehouseId) return false;
                        const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
                        return assignedWarehouses.some((whId: any) => {
                          const whIdStr = whId?.toString ? whId.toString() : String(whId);
                          return whIdStr === sourceWarehouseIdStr;
                        });
                      }
                      // Show IN_TRANSIT transfers where operator is from target warehouse (can receive)
                      if (transfer.status === 'IN_TRANSIT') {
                        const targetWarehouseId = transfer.targetWarehouseId?._id || transfer.targetWarehouseId;
                        if (!targetWarehouseId) return false;
                        const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
                        return assignedWarehouses.some((whId: any) => {
                          const whIdStr = whId?.toString ? whId.toString() : String(whId);
                          return whIdStr === targetWarehouseIdStr;
                        });
                      }
                      return false;
                    })
                    .map((transfer) => (
                      <tr key={transfer._id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {transfer.transferNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {transfer.sourceWarehouseId?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {transfer.targetWarehouseId?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                              transfer.status
                            )}`}
                          >
                            {transfer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {transfer.status === 'DRAFT' ? (
                            <span className="text-muted-foreground">Dispatch Required</span>
                          ) : transfer.status === 'IN_TRANSIT' ? (
                            <span className="text-primary">Receive Required</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(transfer.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {transfer.status === 'DRAFT' && (() => {
                              const sourceWarehouseId = transfer.sourceWarehouseId?._id || transfer.sourceWarehouseId;
                              if (!sourceWarehouseId) return null;
                              const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
                              const canDispatch = assignedWarehouses.some((whId: any) => {
                                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                                return whIdStr === sourceWarehouseIdStr;
                              });
                              return canDispatch ? (
                                <button
                                  onClick={() => handleDispatchTransfer(transfer._id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg transition-all duration-200"
                                  title="Dispatch Transfer"
                                >
                                  <Truck className="w-3 h-3" />
                                  Dispatch
                                </button>
                              ) : null;
                            })()}
                            {transfer.status === 'IN_TRANSIT' && (() => {
                              const targetWarehouseId = transfer.targetWarehouseId?._id || transfer.targetWarehouseId;
                              if (!targetWarehouseId) return null;
                              const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
                              const canReceive = assignedWarehouses.some((whId: any) => {
                                const whIdStr = whId?.toString ? whId.toString() : String(whId);
                                return whIdStr === targetWarehouseIdStr;
                              });
                              return canReceive ? (
                                <button
                                  onClick={() => handleAcceptTransfer(transfer._id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg transition-all duration-200"
                                  title="Mark as Received"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Accept
                                </button>
                              ) : null;
                            })()}
                            <Link
                              href={`/transfers/${transfer._id}`}
                              className="text-primary hover:text-primary/80 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {transfers.filter((transfer) => {
                if (transfer.status === 'DRAFT') {
                  const sourceWarehouseId = transfer.sourceWarehouseId?._id || transfer.sourceWarehouseId;
                  const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
                  return assignedWarehouses.some((whId: any) => {
                    const whIdStr = whId?.toString ? whId.toString() : String(whId);
                    return whIdStr === sourceWarehouseIdStr;
                  });
                }
                if (transfer.status === 'IN_TRANSIT') {
                  const targetWarehouseId = transfer.targetWarehouseId?._id || transfer.targetWarehouseId;
                  const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
                  return assignedWarehouses.some((whId: any) => {
                    const whIdStr = whId?.toString ? whId.toString() : String(whId);
                    return whIdStr === targetWarehouseIdStr;
                  });
                }
                return false;
              }).length === 0 && (
                <div className="text-center py-12 text-gray-400">No pending transfers requiring your action</div>
              )}
            </div>
          )}

          {/* Approved Deliveries Table */}
          {viewType === 'approved' && (
            <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Delivery Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      To Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {approvedDeliveries.map((delivery) => (
                    <tr key={delivery._id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {delivery.deliveryNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {delivery.targetWarehouseId?.name || '-'} ({delivery.targetWarehouseId?.code || ''})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {delivery.lines?.length || 0} items
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(delivery.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/transfers/new?deliveryId=${delivery._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-lg transition-all duration-200 mr-2"
                        >
                          <Package className="w-3 h-3" />
                          Create Transfer
                        </Link>
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
              {approvedDeliveries.length === 0 && (
                <div className="text-center py-12 text-gray-400">No approved deliveries waiting for dispatch</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

