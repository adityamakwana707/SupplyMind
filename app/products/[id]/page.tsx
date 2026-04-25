'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Package, Warehouse, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/components/AuthProvider';
import { isAdmin } from '@/lib/authRoles';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  unit: string;
  price?: number;
  reorderLevel: number;
  abcClass?: string;
  isActive: boolean;
}

interface StockLevelData {
  productId: string;
  totalQuantity: number;
  byWarehouse: Array<{
    warehouse: any;
    locations: Array<{
      location: any;
      quantity: number;
      updatedAt: string;
    }>;
    total: number;
  }>;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [stockLevels, setStockLevels] = useState<StockLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
    fetchStockLevels();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      const data = await res.json();
      setProduct(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockLevels = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/stock-levels`);
      if (!res.ok) throw new Error('Failed to fetch stock levels');
      const data = await res.json();
      setStockLevels(data);
    } catch (err: any) {
      console.error('Failed to fetch stock levels:', err);
    }
  };

  const userRole = (session?.user as any)?.role;
  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          {error || 'Product not found'}
        </div>
        <Link href="/products" className="text-primary hover:text-primary/80">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-muted-foreground mt-1">SKU: {product.sku}</p>
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/products/${productId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">SKU</label>
              <p className="text-foreground">{product.sku}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <p className="text-foreground">{product.category || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Unit</label>
              <p className="text-foreground">{product.unit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Price</label>
              <p className="text-foreground">{product.price ? `₹${product.price}` : '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reorder Level</label>
              <p className="text-foreground">{product.reorderLevel} {product.unit}</p>
            </div>
            {product.abcClass && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">ABC Class</label>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                  {product.abcClass}
                </span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                  product.isActive
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-border'
                }`}
              >
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            Stock Summary
          </h2>
          {stockLevels && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Total Quantity
                </label>
                <p className="text-2xl font-bold text-foreground">
                  {stockLevels.totalQuantity} {product.unit}
                </p>
                {stockLevels.totalQuantity < product.reorderLevel && (
                  <p className="text-sm text-destructive mt-1">
                    ⚠️ Below reorder level ({product.reorderLevel})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {stockLevels && stockLevels.byWarehouse.length > 0 && (
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Stock by Warehouse & Location
          </h2>
          <div className="space-y-6">
            {stockLevels.byWarehouse.map((warehouseStock, idx) => (
              <div key={idx} className="border border-black/10 dark:border-white/10 rounded-lg p-4 bg-background/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    {warehouseStock.warehouse?.name} ({warehouseStock.warehouse?.code})
                  </h3>
                  <span className="text-lg font-bold text-foreground">
                    Total: {warehouseStock.total} {product.unit}
                  </span>
                </div>
                {warehouseStock.locations.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {warehouseStock.locations.map((loc, locIdx) => (
                      <div
                        key={locIdx}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {loc.location?.name || 'Default Location'}
                        </span>
                        <span className="font-medium">
                          {loc.quantity} {product.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

