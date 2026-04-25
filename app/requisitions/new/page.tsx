'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/AuthProvider';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';

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

interface RequisitionLine {
  productId: string;
  quantityRequested: number;
  neededByDate: string;
}

export default function NewRequisitionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    requestingWarehouseId: '',
    suggestedSourceWarehouseId: '',
  });
  const [lines, setLines] = useState<RequisitionLine[]>([
    { productId: '', quantityRequested: 1, neededByDate: '' },
  ]);

  const userRole = (session?.user as any)?.role;
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];

  useEffect(() => {
    // Redirect Admins and Operators - only Managers can create requisitions
    if (session && (userRole === 'ADMIN' || userRole === 'OPERATOR')) {
      router.push('/requisitions');
      return;
    }
    if (session && userRole === 'MANAGER') {
      fetchData();
    }
  }, [session, userRole, router]);

  useEffect(() => {
    // Auto-select Manager's or Operator's warehouse
    if ((userRole === 'MANAGER' || userRole === 'OPERATOR') && warehouses.length > 0) {
      const mainWarehouseId = primaryWarehouseId || (assignedWarehouses.length > 0 ? assignedWarehouses[0] : null);
      if (mainWarehouseId && !formData.requestingWarehouseId) {
        // Check if the warehouse exists in the fetched warehouses list
        const warehouseExists = warehouses.some((wh) => wh._id === mainWarehouseId);
        if (warehouseExists) {
          setFormData((prev) => ({ ...prev, requestingWarehouseId: mainWarehouseId }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses.length, userRole, primaryWarehouseId, assignedWarehouses.length]);

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

  const addLine = () => {
    setLines([...lines, { productId: '', quantityRequested: 1, neededByDate: '' }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof RequisitionLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.requestingWarehouseId) {
      setError('Please select a requesting warehouse');
      return;
    }

    const validLines = lines.filter(
      (line) => line.productId && line.quantityRequested > 0
    );

    if (validLines.length === 0) {
      setError('Please add at least one product line');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lines: validLines.map((line) => ({
            productId: line.productId,
            quantityRequested: line.quantityRequested,
            neededByDate: line.neededByDate || undefined,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create requisition');
      }

      router.push('/requisitions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show access denied for Admins and Operators
  if (session && (userRole === 'ADMIN' || userRole === 'OPERATOR')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/requisitions"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">New Requisition</h1>
        </div>
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
            Access Denied: Only Managers can create requisitions. Requisitions are automatically submitted upon creation.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/requisitions"
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <h1 className="text-3xl font-bold text-foreground">New Requisition</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 space-y-6 shadow-lg">
        {error && (
          <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Requesting Warehouse *
            </label>
            {(userRole === 'MANAGER' || userRole === 'OPERATOR') && formData.requestingWarehouseId ? (
              <div className="w-full px-4 py-2 bg-muted/30 border border-border rounded-lg text-muted-foreground">
                {warehouses.find((wh) => wh._id === formData.requestingWarehouseId)?.name || 'Loading...'} (
                {warehouses.find((wh) => wh._id === formData.requestingWarehouseId)?.code || ''})
                <span className="ml-2 text-xs text-primary">(Auto-selected)</span>
              </div>
            ) : (
              <select
                required
                value={formData.requestingWarehouseId}
                onChange={(e) => setFormData({ ...formData, requestingWarehouseId: e.target.value })}
                className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Suggested Source Warehouse
            </label>
            <select
              value={formData.suggestedSourceWarehouseId}
              onChange={(e) => setFormData({ ...formData, suggestedSourceWarehouseId: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No suggestion</option>
              {warehouses
                .filter((wh) => wh._id !== formData.requestingWarehouseId)
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
                <div className="col-span-5">
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

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity Requested *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={line.quantityRequested}
                    onChange={(e) => updateLine(index, 'quantityRequested', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Needed By Date
                  </label>
                  <input
                    type="date"
                    value={line.neededByDate}
                    onChange={(e) => updateLine(index, 'neededByDate', e.target.value)}
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
            href="/requisitions"
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
            {loading ? 'Creating...' : 'Create Requisition'}
          </button>
        </div>
      </form>
    </div>
  );
}

