'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/components/AuthProvider';
interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface Location {
  _id: string;
  name: string;
}

interface Requisition {
  _id: string;
  requisitionNumber: string;
  requestingWarehouseId: any;
  finalSourceWarehouseId?: any;
  suggestedSourceWarehouseId?: any;
  lines: any[];
}

interface TransferLine {
  productId: string;
  sourceLocationId?: string;
  targetLocationId?: string;
  quantity: number;
}

interface Delivery {
  _id: string;
  deliveryNumber: string;
  warehouseId: any;
  targetWarehouseId?: any;
  requisitionId?: any;
  lines: any[];
}

export default function NewTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const requisitionId = searchParams.get('requisitionId');
  const deliveryId = searchParams.get('deliveryId');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceLocations, setSourceLocations] = useState<Location[]>([]);
  const [targetLocations, setTargetLocations] = useState<Location[]>([]);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
  const [formData, setFormData] = useState({
    requisitionId: requisitionId || '',
    deliveryId: deliveryId || '',
    sourceWarehouseId: '',
    targetWarehouseId: '',
  });
  const [lines, setLines] = useState<TransferLine[]>([]);

  useEffect(() => {
    fetchData();
    if (requisitionId) {
      fetchRequisition();
    }
    if (deliveryId) {
      fetchDelivery();
    }
    // Fetch available deliveries for operators
    const userRole = (session?.user as any)?.role;
    if (userRole === 'OPERATOR') {
      fetchAvailableDeliveries();
    }
  }, [requisitionId, deliveryId, session]);

  useEffect(() => {
    if (formData.sourceWarehouseId) {
      fetchLocations(formData.sourceWarehouseId, 'source');
    }
    if (formData.targetWarehouseId) {
      fetchLocations(formData.targetWarehouseId, 'target');
    }
  }, [formData.sourceWarehouseId, formData.targetWarehouseId]);

  const fetchData = async () => {
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/warehouses'),
      ]);
      const productsData = await productsRes.json();
      const warehousesData = await warehousesRes.json();
      setProducts(Array.isArray(productsData.products) ? productsData.products : Array.isArray(productsData) ? productsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
    }
  };

  const fetchRequisition = async () => {
    try {
      const res = await fetch(`/api/requisitions/${requisitionId}`);
      if (res.ok) {
        const data = await res.json();
        setRequisition(data);
        setFormData({
          requisitionId: data._id,
          deliveryId: '',
          sourceWarehouseId: data.finalSourceWarehouseId?._id || data.suggestedSourceWarehouseId?._id || '',
          targetWarehouseId: data.requestingWarehouseId?._id || '',
        });
        setLines(
          data.lines.map((line: any) => ({
            productId: line.productId._id || line.productId,
            sourceLocationId: '',
            targetLocationId: '',
            quantity: line.quantityRequested,
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch requisition:', err);
    }
  };

  const fetchDelivery = async () => {
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`);
      if (res.ok) {
        const data = await res.json();
        setDelivery(data);
        setFormData({
          requisitionId: data.requisitionId?._id || data.requisitionId || '',
          deliveryId: data._id,
          sourceWarehouseId: data.warehouseId._id || data.warehouseId,
          targetWarehouseId: data.targetWarehouseId?._id || data.targetWarehouseId || '',
        });
        setLines(
          data.lines.map((line: any) => ({
            productId: line.productId._id || line.productId,
            sourceLocationId: line.fromLocationId?._id || line.fromLocationId || '',
            targetLocationId: '',
            quantity: line.quantity,
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch delivery:', err);
    }
  };

  const fetchAvailableDeliveries = async () => {
    try {
      // Fetch READY deliveries where operator's warehouse is the source warehouse
      const res = await fetch('/api/deliveries?status=READY');
      if (res.ok) {
        const data = await res.json();
        const deliveries = Array.isArray(data) ? data : [];
        const userRole = (session?.user as any)?.role;
        const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
        
        // Filter deliveries where operator's warehouse is the source warehouse (warehouseId)
        const filtered = deliveries.filter((del: Delivery) => {
          if (!del.warehouseId || !del.requisitionId) return false; // Only requisition-based deliveries
          const sourceWarehouseId = (del.warehouseId as any)?._id || del.warehouseId;
          const sourceWarehouseIdStr = sourceWarehouseId?.toString ? sourceWarehouseId.toString() : String(sourceWarehouseId);
          return assignedWarehouses.some((whId: any) => {
            const whIdStr = whId?.toString ? whId.toString() : String(whId);
            return whIdStr === sourceWarehouseIdStr;
          });
        });
        
        setAvailableDeliveries(filtered);
      }
    } catch (err: any) {
      console.error('Failed to fetch available deliveries:', err);
    }
  };

  const handleDeliverySelect = async (selectedDeliveryId: string) => {
    if (!selectedDeliveryId) {
      setDelivery(null);
      setFormData(prev => ({ ...prev, deliveryId: '', sourceWarehouseId: '', targetWarehouseId: '' }));
      setLines([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/deliveries/${selectedDeliveryId}`);
      if (res.ok) {
        const data = await res.json();
        setDelivery(data);
        setFormData({
          requisitionId: data.requisitionId?._id || data.requisitionId || '',
          deliveryId: data._id,
          sourceWarehouseId: data.warehouseId._id || data.warehouseId,
          targetWarehouseId: data.targetWarehouseId?._id || data.targetWarehouseId || '',
        });
        setLines(
          data.lines.map((line: any) => ({
            productId: line.productId._id || line.productId,
            sourceLocationId: line.fromLocationId?._id || line.fromLocationId || '',
            targetLocationId: '',
            quantity: line.quantity,
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch selected delivery:', err);
      setError('Failed to load delivery details');
    }
  };

  const fetchLocations = async (warehouseId: string, type: 'source' | 'target') => {
    try {
      const res = await fetch(`/api/locations?warehouseId=${warehouseId}`);
      const data = await res.json();
      if (type === 'source') {
        setSourceLocations(data || []);
      } else {
        setTargetLocations(data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const addLine = () => {
    setLines([...lines, { productId: '', sourceLocationId: '', targetLocationId: '', quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof TransferLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.sourceWarehouseId || !formData.targetWarehouseId) {
      setError('Please select both source and target warehouses');
      return;
    }

    if (formData.sourceWarehouseId === formData.targetWarehouseId) {
      setError('Source and target warehouses must be different');
      return;
    }

    const validLines = lines.filter(
      (line) => line.productId && line.quantity > 0
    );

    if (validLines.length === 0) {
      setError('Please add at least one product line');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionId: formData.requisitionId || undefined,
          deliveryId: formData.deliveryId || undefined,
          sourceWarehouseId: formData.sourceWarehouseId,
          targetWarehouseId: formData.targetWarehouseId,
          lines: validLines.map((line) => ({
            productId: line.productId,
            sourceLocationId: line.sourceLocationId || undefined,
            targetLocationId: line.targetLocationId || undefined,
            quantity: line.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create transfer');
      }

      router.push('/transfers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/transfers"
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <h1 className="text-3xl font-bold text-foreground">New Transfer</h1>
        {requisition && (
          <span className="text-sm text-muted-foreground">
            (From Requisition: {requisition.requisitionNumber})
          </span>
        )}
        {delivery && (
          <span className="text-sm text-muted-foreground">
            (From Delivery: {delivery.deliveryNumber})
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 space-y-6 shadow-lg">
        {error && (
          <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
            {error}
          </div>
        )}

        {/* Delivery Selection for Operators */}
        {(session?.user as any)?.role === 'OPERATOR' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Approved Delivery (Waiting for Dispatch)
            </label>
            <select
              value={formData.deliveryId}
              onChange={(e) => handleDeliverySelect(e.target.value)}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a delivery to create transfer (optional)</option>
              {availableDeliveries.length > 0 ? (
                availableDeliveries.map((del) => (
                  <option key={del._id} value={del._id}>
                    {del.deliveryNumber} - To: {del.targetWarehouseId?.name || 'Unknown'} ({del.targetWarehouseId?.code || ''}) - {del.lines?.length || 0} items
                  </option>
                ))
              ) : (
                <option value="" disabled>No approved deliveries waiting for dispatch</option>
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              These are deliveries approved by managers that are waiting to be dispatched from your warehouse. Selecting one will auto-fill the transfer details.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Source Warehouse *
            </label>
            <select
              required
              value={formData.sourceWarehouseId}
              onChange={(e) => setFormData({ ...formData, sourceWarehouseId: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={!!delivery}
            >
              <option value="">Select source warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Warehouse *
            </label>
            <select
              required
              value={formData.targetWarehouseId}
              onChange={(e) => setFormData({ ...formData, targetWarehouseId: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={!!delivery}
            >
              <option value="">Select target warehouse</option>
              {warehouses
                .filter((wh) => wh._id !== formData.sourceWarehouseId)
                .map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="border-t border-black/10 dark:border-white/10 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Products</h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 p-4 bg-muted/30 rounded-lg border border-black/10 dark:border-white/10"
              >
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Product *
                  </label>
                  <select
                    required
                    value={line.productId}
                    onChange={(e) => updateLine(index, 'productId', e.target.value)}
                    className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        [{product.sku}] {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Source Location
                  </label>
                  <select
                    value={line.sourceLocationId}
                    onChange={(e) => updateLine(index, 'sourceLocationId', e.target.value)}
                    className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!formData.sourceWarehouseId}
                  >
                    <option value="">No location</option>
                    {sourceLocations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Target Location
                  </label>
                  <select
                    value={line.targetLocationId}
                    onChange={(e) => updateLine(index, 'targetLocationId', e.target.value)}
                    className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!formData.targetWarehouseId}
                  >
                    <option value="">No location</option>
                    {targetLocations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="col-span-1 flex items-end">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="p-2 text-destructive hover:text-destructive/80 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-black/10 dark:border-white/10">
          <Link
            href="/transfers"
            className="px-6 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
}

