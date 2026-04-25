'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/components/AuthProvider';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const params = useParams();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: 'pcs',
    price: '',
    reorderLevel: '0',
    quantity: '',
    abcClass: '',
    description: '',
    isActive: true,
  });

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (session && userRole && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      router.push('/products');
    } else if (session && (userRole === 'ADMIN' || userRole === 'MANAGER')) {
      fetchProduct();
    }
  }, [productId, session, userRole, router]);

  if (!session || (userRole && userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to edit products.</p>
        </div>
      </div>
    );
  }

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      const product = await response.json();
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || '',
        unit: product.unit || 'pcs',
        price: product.price?.toString() || '',
        reorderLevel: product.reorderLevel?.toString() || '0',
        quantity: product.quantity?.toString() || '',
        abcClass: product.abcClass || '',
        description: product.description || '',
        isActive: product.isActive !== undefined ? product.isActive : true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? parseFloat(formData.price) : undefined,
          reorderLevel: parseInt(formData.reorderLevel) || 0,
          quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
          abcClass: formData.abcClass || undefined,
          description: formData.description || undefined,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product');
      }

      router.push('/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
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
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              SKU *
            </label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Unit *
            </label>
            <select
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="L">Liters (L)</option>
              <option value="mL">Milliliters (mL)</option>
              <option value="m">Meters (m)</option>
              <option value="cm">Centimeters (cm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Price (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reorder Level *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Edit Quantity
            </label>
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter new quantity..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              ABC Class
            </label>
            <select
              value={formData.abcClass}
              onChange={(e) => setFormData({ ...formData, abcClass: e.target.value })}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Not Set</option>
              <option value="A">A - High Value</option>
              <option value="B">B - Medium Value</option>
              <option value="C">C - Low Value</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-background/50 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter product description..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 bg-background border-input rounded text-primary focus:ring-primary"
              />
              Active Status
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.isActive ? 'Product is active and visible' : 'Product is inactive and hidden'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-black/10 dark:border-white/10">
          <Link
            href="/products"
            className="px-6 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

