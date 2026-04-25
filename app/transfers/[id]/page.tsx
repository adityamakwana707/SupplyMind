'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/components/AuthProvider';
interface Transfer {
  _id: string;
  transferNumber: string;
  requisitionId?: any;
  deliveryId?: any;
  sourceWarehouseId: any;
  targetWarehouseId: any;
  status: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  validatedBy?: any;
  dispatchedAt?: string;
  receivedAt?: string;
}

export default function TransferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const transferId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [transfer, setTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    fetchTransfer();
  }, [transferId]);

  const fetchTransfer = async () => {
    try {
      const response = await fetch(`/api/transfers/${transferId}`);
      if (!response.ok) throw new Error('Failed to fetch transfer');
      const data = await response.json();
      setTransfer(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!confirm('Are you sure you want to dispatch this transfer? This will decrement stock from the source warehouse.')) {
      return;
    }

    setValidating(true);
    setError('');

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

      fetchTransfer();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleAccept = async () => {
    if (!confirm('Are you sure you want to mark this transfer as received? This will increment stock at your warehouse and complete the transfer.')) {
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark transfer as received');
      }

      fetchTransfer();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-primary/20 text-primary border-primary/50';
      case 'IN_TRANSIT':
        return 'bg-muted text-muted-foreground border-muted-foreground/50';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/50';
    }
  };

  const userRole = (session?.user as any)?.role;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  
  // Admin or Operator at source warehouse can dispatch
  const canDispatch = (() => {
    if (!session || !transfer || loading) return false;
    if (!['ADMIN', 'OPERATOR'].includes(userRole || '')) return false;
    if (transfer.status !== 'DRAFT') return false;
    
    // Admin can dispatch from any warehouse
    if (userRole === 'ADMIN') return true;
    
    // Operator must be from source warehouse
    if (!transfer.sourceWarehouseId) return false;
    const sourceWarehouseIdObj = transfer.sourceWarehouseId;
    const sourceWarehouseId = (sourceWarehouseIdObj as any)?._id || sourceWarehouseIdObj;
    const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
    
    return assignedWarehouses.some((whId: any) => {
      const whIdStr = whId?.toString ? whId.toString() : String(whId);
      return whIdStr === sourceWarehouseIdStr;
    });
  })();
  
  // Admin or Operator at target warehouse can receive
  const canAccept = (() => {
    if (!session || !transfer || loading) return false;
    if (!['ADMIN', 'OPERATOR'].includes(userRole || '')) return false;
    if (transfer.status !== 'IN_TRANSIT') return false;
    
    // Admin can receive at any warehouse
    if (userRole === 'ADMIN') return true;
    
    // Operator must be from target warehouse
    if (!transfer.targetWarehouseId) return false;
    const targetWarehouseIdObj = transfer.targetWarehouseId;
    const targetWarehouseId = (targetWarehouseIdObj as any)?._id || targetWarehouseIdObj;
    const targetWarehouseIdStr = targetWarehouseId?.toString ? targetWarehouseId.toString() : String(targetWarehouseId);
    
    return assignedWarehouses.some((whId: any) => {
      const whIdStr = whId?.toString ? whId.toString() : String(whId);
      return whIdStr === targetWarehouseIdStr;
    });
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading transfer...</div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Transfer not found'}
        </div>
        <Link href="/transfers" className="text-primary hover:text-primary/80 transition-colors">
          ← Back to Transfers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/transfers"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transfer</h1>
            <p className="text-muted-foreground mt-1">{transfer.transferNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
              transfer.status
            )}`}
          >
            {transfer.status}
          </span>
          {canDispatch && (
            <button
              onClick={handleDispatch}
              disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Dispatching...' : 'Dispatch'}
            </button>
          )}
          {canAccept && (
            <button
              onClick={handleAccept}
              disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Marking as Received...' : 'Mark as Received'}
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 space-y-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transfer.requisitionId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Requisition
              </label>
              <Link
                href={`/requisitions/${transfer.requisitionId._id || transfer.requisitionId}`}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {transfer.requisitionId?.requisitionNumber || transfer.requisitionId}
              </Link>
            </div>
          )}

          {transfer.deliveryId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Delivery
              </label>
              <Link
                href={`/deliveries/${transfer.deliveryId._id || transfer.deliveryId}`}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {transfer.deliveryId?.deliveryNumber || transfer.deliveryId}
              </Link>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Source Warehouse
            </label>
            <p className="text-foreground">
              {transfer.sourceWarehouseId?.name} ({transfer.sourceWarehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Target Warehouse
            </label>
            <p className="text-foreground">
              {transfer.targetWarehouseId?.name} ({transfer.targetWarehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <p className="text-foreground">{transfer.createdBy?.name || (typeof transfer.createdBy === 'string' ? transfer.createdBy : '-')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created At
            </label>
            <p className="text-foreground">{formatDate(transfer.createdAt)}</p>
          </div>

          {transfer.dispatchedAt && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Dispatched At
              </label>
              <p className="text-foreground">{formatDate(transfer.dispatchedAt)}</p>
            </div>
          )}

          {transfer.validatedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Accepted By
                </label>
                <p className="text-foreground">{transfer.validatedBy?.name || (typeof transfer.validatedBy === 'string' ? transfer.validatedBy : '-')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Received At
                </label>
                <p className="text-foreground">{formatDate(transfer.receivedAt!)}</p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-black/10 dark:border-white/10 pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Products</h2>
          <div className="bg-muted/30 rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Source Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Target Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {transfer.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-foreground">
                      {line.productId?.sku ? `[${line.productId.sku}] ` : ''}{line.productId?.name || (typeof line.productId === 'string' ? `[${line.productId}] Unknown Product` : 'Unknown Product')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.sourceLocationId?.name || (typeof line.sourceLocationId === 'string' ? line.sourceLocationId : '-')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.targetLocationId?.name || (typeof line.targetLocationId === 'string' ? line.targetLocationId : '-')}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {line.quantity} {line.productId?.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

