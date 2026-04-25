'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Location {
  _id: string;
  name: string;
  code?: string;
  warehouseId: any;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface ReceiptLine {
  productId: string;
  locationId?: string;
  quantity: number;
}

export default function NewReceiptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    supplierName: '',
    warehouseId: '',
    reference: '',
    notes: '',
  });
  const [lines, setLines] = useState<ReceiptLine[]>([
    { productId: '', locationId: '', quantity: 1 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.warehouseId) {
      fetchLocations(formData.warehouseId);
    }
  }, [formData.warehouseId]);

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

  const fetchLocations = async (warehouseId: string) => {
    try {
      const res = await fetch(`/api/locations?warehouseId=${warehouseId}`);
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const addLine = () => {
    setLines([...lines, { productId: '', locationId: '', quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof ReceiptLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.warehouseId) {
      setError('Please select a warehouse');
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
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lines: validLines.map((line) => ({
            productId: line.productId,
            locationId: line.locationId || undefined,
            quantity: line.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create receipt');
      }

      router.push('/receipts');
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
          href="/receipts"
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <h1 className="text-3xl font-bold text-foreground">New Receipt</h1>
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
              Receive From (Supplier Name)
            </label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter supplier name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Warehouse *
            </label>
            <select
              required
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reference (PO/Invoice)
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional reference number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional notes"
            />
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
                    Location
                  </label>
                  <select
                    value={line.locationId}
                    onChange={(e) => updateLine(index, 'locationId', e.target.value)}
                    className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={!formData.warehouseId}
                  >
                    <option value="">No location</option>
                    {locations.map((location) => (
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
            href="/receipts"
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
            {loading ? 'Creating...' : 'Create Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
}

