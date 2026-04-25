'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, CheckCircle, Package, TrendingUp } from 'lucide-react';
import { useSession } from '@/components/AuthProvider';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  _id?: string;
  id?: string;
  name: string;
  sku: string;
  category?: string;
  unit: string;
  price?: number;
  reorderLevel: number;
  abcClass?: string;
  totalQuantity?: number;
}

const containerVars = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVars = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

function ProductsClientContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === 'ADMIN' || userRole === 'MANAGER';

  const getProductId = (product: Product) => product.id || product._id || '';

  // Check for import success message
  useEffect(() => {
    const importSuccess = searchParams?.get('import_success');
    
    if (importSuccess === 'true') {
      setShowImportSuccess(true);
      setTimeout(() => setShowImportSuccess(false), 5000);
    }
  }, [searchParams]);

  const warehouseId = searchParams?.get('warehouse');

  useEffect(() => {
    fetchProducts();
  }, [search, warehouseId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (warehouseId) params.append('warehouseId', warehouseId);
      
      const url = `/api/products?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete product');
      }

      fetchProducts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showImportSuccess && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-sm"
          >
            <CheckCircle className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <h3 className="text-primary font-bold">Import Intelligence Successful!</h3>
              <p className="text-muted-foreground text-sm font-medium">
                Catalog updated.
                {searchParams?.get('created') && ` ${searchParams.get('created')} nodes created.`}
                {searchParams?.get('updated') && ` ${searchParams.get('updated')} nodes updated.`}
              </p>
            </div>
            <button onClick={() => setShowImportSuccess(false)} className="text-primary hover:text-primary/80 font-bold p-2">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Products</h1>
           <p className="text-muted-foreground font-medium mt-1 italic">Global SKU Master Catalog</p>
        </div>
        {canCreate && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/products/new-enhanced"
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all duration-200 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
            >
              <Plus className="w-5 h-5" />
              Intelligence Onboarding
            </Link>
          </motion.div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SKUs or Product Intelligence Profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
           <p className="text-muted-foreground font-medium">Syncing catalog data...</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="visible"
          className="bg-card/40 backdrop-blur-2xl rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Stock Health</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Reorder</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {Array.isArray(products) && products.map((product) => {
                const productId = getProductId(product);

                return (
                <motion.tr 
                  variants={itemVars}
                  key={productId || product.sku} 
                  className="hover:bg-primary/5 transition-colors group"
                >
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-foreground font-mono">{product.sku}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-foreground">{product.name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-muted-foreground">{product.category || '-'}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold">
                    <div className="flex items-center gap-2">
                       <span className={product.totalQuantity !== undefined && product.totalQuantity < product.reorderLevel ? 'text-destructive' : 'text-emerald-500'}>
                         {product.totalQuantity !== undefined ? `${product.totalQuantity} ${product.unit || 'units'}` : '-'}
                       </span>
                       {product.totalQuantity !== undefined && product.totalQuantity >= product.reorderLevel && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-muted-foreground">{product.reorderLevel}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {product.abcClass && (
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border shadow-sm ${
                        product.abcClass === 'A' ? 'bg-primary/20 text-primary border-primary/30' : 
                        product.abcClass === 'B' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                        'bg-slate-500/20 text-slate-500 border-slate-500/30'
                      }`}>
                        CLASS {product.abcClass}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4 justify-end">
                      {canCreate && productId && (
                        <Link href={`/products/${productId}/edit`} className="inline-flex items-center gap-1.5 text-primary hover:text-white transition-all font-bold">
                          <Edit className="w-4 h-4" /> Edit
                        </Link>
                      )}
                      {canCreate && productId && (
                        <button
                          onClick={() => handleDelete(productId)}
                          className="inline-flex items-center gap-1.5 text-destructive hover:text-red-400 transition-all font-bold"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )})}
            </tbody>
          </table>
          {(!Array.isArray(products) || products.length === 0) && (
            <div className="text-center py-24 text-muted-foreground flex flex-col items-center gap-3">
               <Package className="w-12 h-12 opacity-20" />
               <p className="text-lg font-bold">No strategic products found in current filter.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default function ProductsClient() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Initializing strategic catalog...</div>}>
      <ProductsClientContent />
    </Suspense>
  );
}
