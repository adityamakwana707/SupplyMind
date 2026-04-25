'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/components/AuthProvider';
interface Receipt {
  _id: string;
  receiptNumber: string;
  supplierName?: string;
  warehouseId: any;
  status: string;
  reference?: string;
  notes?: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  validatedBy?: any;
  validatedAt?: string;
}

export default function ReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const receiptId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    fetchReceipt();
  }, [receiptId]);

  const fetchReceipt = async () => {
    try {
      const response = await fetch(`/api/receipts/${receiptId}`);
      if (!response.ok) throw new Error('Failed to fetch receipt');
      const data = await response.json();
      setReceipt(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!confirm('Are you sure you want to validate this receipt? This will update stock levels.')) {
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to validate receipt');
      }

      router.push('/receipts');
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
        return 'bg-primary/20 text-primary border-primary/30';
      case 'WAITING':
        return 'bg-muted/50 text-muted-foreground border-border';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const userRole = (session?.user as any)?.role;
  const canValidate = ['ADMIN', 'OPERATOR'].includes(userRole) && receipt?.status !== 'DONE';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading receipt...</div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Receipt not found'}
        </div>
        <Link href="/receipts" className="text-primary hover:text-primary/80 transition-colors">
          ← Back to Receipts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/receipts"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receipt</h1>
            <p className="text-muted-foreground mt-1">{receipt.receiptNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
              receipt.status
            )}`}
          >
            {receipt.status}
          </span>
          {canValidate && (
            <button
              onClick={handleValidate}
              disabled={validating}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <CheckCircle className="w-4 h-4" />
              {validating ? 'Validating...' : 'Validate'}
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
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Supplier Name
            </label>
            <p className="text-foreground">{receipt.supplierName || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Warehouse
            </label>
            <p className="text-foreground">
              {receipt.warehouseId?.name} ({receipt.warehouseId?.code})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Reference
            </label>
            <p className="text-foreground">{receipt.reference || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <p className="text-foreground">
              {typeof receipt.createdBy === 'string' ? receipt.createdBy : (receipt.createdBy?.name || '-')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created At
            </label>
            <p className="text-foreground">{formatDate(receipt.createdAt)}</p>
          </div>

          {receipt.validatedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Validated By
                </label>
                <p className="text-foreground">{receipt.validatedBy?.name || (typeof receipt.validatedBy === 'string' ? receipt.validatedBy : '-')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Validated At
                </label>
                <p className="text-foreground">{formatDate(receipt.validatedAt!)}</p>
              </div>
            </>
          )}

          {receipt.notes && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Notes
              </label>
              <p className="text-foreground">{receipt.notes}</p>
            </div>
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
                    Location
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {receipt.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-foreground">
                      {typeof line.productId === 'string' 
                        ? `[${line.productId}] Unknown Product` 
                        : `[${line.productId?.sku || '??'}] ${line.productId?.name || 'Unknown Product'}`
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {typeof line.locationId === 'string'
                        ? line.locationId
                        : (line.locationId?.name || (typeof line.locationId === 'string' ? line.locationId : '-'))}
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

