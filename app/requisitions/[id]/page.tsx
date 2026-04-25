'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/components/AuthProvider';
interface Requisition {
  _id: string;
  requisitionNumber: string;
  requestingWarehouseId: any;
  suggestedSourceWarehouseId?: any;
  finalSourceWarehouseId?: any;
  status: string;
  lines: any[];
  createdAt: string;
  createdBy: any;
  approvedBy?: any;
  rejectedReason?: string;
  approvedAt?: string;
}

interface Delivery {
  _id: string;
  deliveryNumber: string;
  status: string;
}

export default function RequisitionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const requisitionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [finalSourceWarehouse, setFinalSourceWarehouse] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [bestSourceSuggestions, setBestSourceSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [deliveryNotFound, setDeliveryNotFound] = useState(false);

  useEffect(() => {
    fetchRequisition();
    fetchWarehouses();
  }, [requisitionId]);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
      setWarehouses([]);
    }
  };

  const fetchRequisition = async () => {
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}`);
      if (!response.ok) throw new Error('Failed to fetch requisition');
      const data = await response.json();
      setRequisition(data);
      setFinalSourceWarehouse(data.finalSourceWarehouseId?._id || data.suggestedSourceWarehouseId?._id || '');
      
      // Fetch best source warehouse suggestions for each product
      if (data.lines && data.lines.length > 0) {
        fetchBestSourceSuggestions(data.lines, data.requestingWarehouseId?._id);
      }

      // Check if delivery is included in response or fetch it
      if (data.status === 'APPROVED') {
        if (data.delivery) {
          // Delivery is included in the response
          setDelivery(data.delivery);
          setDeliveryNotFound(false);
        } else {
          // Fetch the delivery created from this requisition
          // Wait a bit for delivery to be created, then fetch
          setDeliveryNotFound(false); // Reset flag
          setTimeout(() => {
            fetchDelivery(data._id, 0, true); // Pass isInitialSearch = true
          }, 1000);
        }
      } else {
        // Clear delivery if requisition is not approved
        setDelivery(null);
        setDeliveryNotFound(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDelivery = async (reqId: string, retryCount = 0, isInitialSearch = false) => {
    const maxRetries = 5; // Limit retries to prevent infinite loops
    
    try {
      const response = await fetch(`/api/deliveries?requisitionId=${reqId}`);
      if (response.ok) {
        const deliveries = await response.json();
        if (Array.isArray(deliveries) && deliveries.length > 0) {
          setDelivery(deliveries[0]);
          setDeliveryNotFound(false);
        } else {
          // If this is the initial search and no delivery found, show create button
          if (isInitialSearch && retryCount === 0) {
            setDeliveryNotFound(true);
            return; // Don't retry, show create button instead
          }
          
          if (retryCount < maxRetries) {
            console.log(`No delivery found for requisition: ${reqId}, retrying... (${retryCount + 1}/${maxRetries})`);
            // Retry after a short delay in case delivery is still being created
            setTimeout(() => {
              fetchDelivery(reqId, retryCount + 1, false);
            }, 2000);
          } else {
            console.error('Max retries reached. Delivery not found for requisition:', reqId);
            setDeliveryNotFound(true);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch delivery, status:', response.status, errorData);
        if (isInitialSearch && retryCount === 0) {
          setDeliveryNotFound(true);
          return;
        }
        if (retryCount < maxRetries) {
          // Retry after a short delay
          setTimeout(() => {
            fetchDelivery(reqId, retryCount + 1, false);
          }, 2000);
        } else {
          setDeliveryNotFound(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch delivery:', err);
      if (isInitialSearch && retryCount === 0) {
        setDeliveryNotFound(true);
        return;
      }
      if (retryCount < maxRetries) {
        // Retry after a short delay
        setTimeout(() => {
          fetchDelivery(reqId, retryCount + 1, false);
        }, 2000);
      } else {
        setDeliveryNotFound(true);
      }
    }
  };

  const fetchBestSourceSuggestions = async (lines: any[], excludeWarehouseId: string) => {
    setLoadingSuggestions(true);
    try {
      const suggestionsMap: Record<string, any> = {};
      
      for (const line of lines) {
        if (line.productId?._id) {
          const res = await fetch(
            `/api/analytics/best-source?productId=${line.productId._id}&excludeWarehouseId=${excludeWarehouseId}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.bestSource) {
              suggestionsMap[line.productId._id] = data.bestSource;
            }
          }
        }
      }
      
      setBestSourceSuggestions(Object.values(suggestionsMap));
      
      // Auto-select best source if available and not already set
      if (!finalSourceWarehouse && Object.keys(suggestionsMap).length > 0) {
        const firstSuggestion = Object.values(suggestionsMap)[0] as any;
        if (firstSuggestion?.warehouseId) {
          setFinalSourceWarehouse(firstSuggestion.warehouseId.toString());
        }
      }
    } catch (err) {
      console.error('Failed to fetch best source suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = async (action: 'approve' | 'reject') => {
    setProcessing(true);
    setError('');

    try {
      // Validate required fields
      if (action === 'approve' && !finalSourceWarehouse) {
        setError('Please select a source warehouse before approving');
        setProcessing(false);
        return;
      }

      const body: any = { action };
      if (action === 'approve' && finalSourceWarehouse) {
        body.finalSourceWarehouseId = finalSourceWarehouse;
      }
      if (action === 'reject') {
        body.reason = rejectReason || 'Rejected by manager';
      }

      const response = await fetch(`/api/requisitions/${requisitionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} requisition`);
      }

      const responseData = await response.json();
      
      // If delivery is included in the response (after approval), set it immediately
      if (action === 'approve' && responseData.delivery) {
        setDelivery(responseData.delivery);
        // Update requisition state with the response data (remove delivery from requisition object)
        const { delivery, ...requisitionData } = responseData;
        setRequisition(requisitionData);
        setShowApproveDialog(false);
        router.refresh();
        return; // Don't fetch again, we already have the data
      }

      setShowApproveDialog(false);
      setShowRejectDialog(false);
      
      // Refresh requisition to get updated status
      await fetchRequisition();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
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

  const userRole = (session?.user as any)?.role;
  const canApprove = userRole === 'MANAGER' && requisition?.status === 'SUBMITTED';
  const canReject = userRole === 'MANAGER' && requisition?.status === 'SUBMITTED';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading requisition...</div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Requisition not found'}
        </div>
        <Link href="/requisitions" className="text-primary hover:text-primary/80 transition-colors">
          ← Back to Requisitions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/requisitions"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Requisition</h1>
            <p className="text-muted-foreground mt-1">{requisition.requisitionNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
              requisition.status
            )}`}
          >
            {requisition.status}
          </span>
          {canApprove && (
            <button
              onClick={() => setShowApproveDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowRejectDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          )}
          {requisition?.status === 'APPROVED' && (
            delivery ? (
              <Link
                href={`/deliveries/${delivery._id}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200"
              >
                <FileText className="w-4 h-4" />
                View Delivery ({delivery.deliveryNumber})
              </Link>
            ) : deliveryNotFound ? (
              <Link
                href={`/deliveries/new?requisitionId=${requisitionId}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Create Delivery
              </Link>
            ) : (
              <div className="text-sm text-muted-foreground px-4 py-2">
                Checking for delivery...
              </div>
            )
          )}
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
              Requesting Warehouse
            </label>
            <p className="text-foreground">
              {requisition.requestingWarehouseId?.name} ({requisition.requestingWarehouseId?.code})
            </p>
          </div>

          {requisition.suggestedSourceWarehouseId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Suggested Source
              </label>
              <p className="text-foreground">
                {requisition.suggestedSourceWarehouseId?.name} ({requisition.suggestedSourceWarehouseId?.code})
              </p>
            </div>
          )}

          {requisition.finalSourceWarehouseId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Final Source
              </label>
              <p className="text-foreground">
                {requisition.finalSourceWarehouseId?.name} ({requisition.finalSourceWarehouseId?.code})
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created By
            </label>
            <p className="text-foreground">{requisition.createdBy?.name || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Created At
            </label>
            <p className="text-foreground">{formatDate(requisition.createdAt)}</p>
          </div>

          {requisition.approvedBy && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Approved By
                </label>
                <p className="text-foreground">{requisition.approvedBy?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Approved At
                </label>
                <p className="text-foreground">{formatDate(requisition.approvedAt!)}</p>
              </div>
            </>
          )}

          {requisition.rejectedReason && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Rejection Reason
              </label>
              <p className="text-destructive">{requisition.rejectedReason}</p>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Needed By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {requisition.lines?.map((line: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-foreground">
                      [{line.productId?.sku}] {line.productId?.name}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {line.quantityRequested} {line.productId?.unit}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.neededByDate ? formatDate(line.neededByDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">Approve Requisition</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Final Source Warehouse
                </label>
                {loadingSuggestions ? (
                  <div className="text-gray-400 text-sm py-2">Loading suggestions...</div>
                ) : bestSourceSuggestions.length > 0 ? (
                  <div className="mb-2 p-2 bg-primary/10 border border-primary/30 rounded text-sm text-primary">
                    💡 Suggested: {bestSourceSuggestions[0]?.warehouseName} ({bestSourceSuggestions[0]?.warehouseCode}) - {bestSourceSuggestions[0]?.totalQuantity} units available
                  </div>
                ) : null}
                <select
                  value={finalSourceWarehouse}
                  onChange={(e) => setFinalSourceWarehouse(e.target.value)}
                  className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select warehouse</option>
                  {warehouses
                    .filter((wh) => {
                      // Don't show the requesting warehouse
                      if (wh._id === requisition?.requestingWarehouseId?._id) return false;
                      // For Managers, only show their assigned warehouses
                      if (userRole === 'MANAGER') {
                        const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
                        const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
                        const managerWarehouseIds = primaryWarehouseId 
                          ? [primaryWarehouseId, ...assignedWarehouses]
                          : assignedWarehouses;
                        return managerWarehouseIds.some((id: any) => {
                          const idStr = id?.toString ? id.toString() : String(id);
                          const whIdStr = wh._id?.toString ? wh._id.toString() : String(wh._id);
                          return idStr === whIdStr;
                        });
                      }
                      // Admins can see all warehouses
                      return true;
                    })
                    .map((wh) => (
                      <option key={wh._id} value={wh._id}>
                        {wh.name} ({wh.code})
                        {bestSourceSuggestions.some((s: any) => {
                          const sId = s.warehouseId?.toString ? s.warehouseId.toString() : String(s.warehouseId);
                          const whId = wh._id?.toString ? wh._id.toString() : String(wh._id);
                          return sId === whId;
                        }) ? ' ⭐ Recommended' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowApproveDialog(false)}
                  className="px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit('approve')}
                  disabled={processing || !finalSourceWarehouse}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-200"
                >
                  {processing ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">Reject Requisition</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Enter rejection reason"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit('reject')}
                  disabled={processing || !rejectReason}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 disabled:bg-muted text-destructive-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {processing ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

