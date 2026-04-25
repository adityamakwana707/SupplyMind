'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/AuthProvider';
import { ArrowLeft, Save, Upload, Download, FileSpreadsheet, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelDropzone from '@/components/ExcelDropzone';
import ImportPreview from '@/components/ImportPreview';
import ExcelImportService, { ProductImportData, ExcelImportResult } from '@/lib/services/excelImportService';

type ImportMode = 'manual' | 'excel';
type ImportStep = 'upload' | 'preview' | 'processing';

export default function NewProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<ImportMode>('manual');
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ExcelImportResult<ProductImportData> | null>(null);
  
  // Manual form data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: 'pcs',
    price: '',
    reorderLevel: '0',
    abcClass: '',
  });

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (session && userRole && !['ADMIN', 'MANAGER'].includes(userRole)) {
      router.push('/products');
    }
  }, [session, userRole, router]);

  if (!session || (userRole && !['ADMIN', 'MANAGER'].includes(userRole))) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to create products.</p>
        </div>
      </div>
    );
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price ? parseFloat(formData.price) : undefined,
          reorderLevel: parseInt(formData.reorderLevel),
          abcClass: formData.abcClass || undefined,
        }),
      });

      if (response.ok) {
        router.push('/products');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create product');
      }
    } catch (error) {
      setError('An error occurred while creating the product');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelFileProcessed = (data: any[]) => {
    const result = ExcelImportService.validateProductImport(data);
    setImportResult(result);
    setImportStep('preview');
  };

  const handleExcelError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleImportConfirm = async (products: ProductImportData[]) => {
    setLoading(true);
    setImportStep('processing');
    
    try {
      const response = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      const result = await response.json();
      
      if (response.ok) {
        router.push(`/products?import_success=true&created=${result.results.created}&updated=${result.results.updated}`);
      } else {
        setError(result.error || 'Failed to import products');
        setImportStep('preview');
      }
    } catch (error) {
      setError('An error occurred during import');
      setImportStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCancel = () => {
    setImportResult(null);
    setImportStep('upload');
    setError('');
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/templates?type=products');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'products_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download template');
      }
    } catch (error) {
      setError('An error occurred while downloading template');
    }
  };

  const productColumns = [
    { key: 'name' as keyof ProductImportData, label: 'Product Name' },
    { key: 'sku' as keyof ProductImportData, label: 'SKU' },
    { key: 'category' as keyof ProductImportData, label: 'Category' },
    { key: 'unit' as keyof ProductImportData, label: 'Unit' },
    { 
      key: 'price' as keyof ProductImportData, 
      label: 'Price',
      render: (value: any) => value ? `$${Number(value).toFixed(2)}` : '-'
    },
    { key: 'reorderLevel' as keyof ProductImportData, label: 'Reorder Level' },
    { key: 'abcClass' as keyof ProductImportData, label: 'ABC Class' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-6xl mx-auto"
    >
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/products"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-all duration-200 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Products
          </Link>
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
          Add New Products
        </h1>
        <p className="text-muted-foreground text-lg">
          Onboard single SKUs or execute massive catalog imports with SupplyMind engine.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="mb-8">
        <div className="flex p-1.5 bg-muted/30 backdrop-blur-md rounded-xl border border-black/5 dark:border-white/5 w-fit">
          <button
            onClick={() => {
              setMode('manual');
              setImportStep('upload');
              setImportResult(null);
              setError('');
            }}
            className={`px-8 py-3 rounded-lg font-bold transition-all duration-300 flex items-center space-x-2 ${
              mode === 'manual'
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
          
          <button
            onClick={() => {
              setMode('excel');
              setImportStep('upload');
              setImportResult(null);
              setError('');
            }}
            className={`px-8 py-3 rounded-lg font-bold transition-all duration-300 flex items-center space-x-2 ${
              mode === 'excel'
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Import</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            <p className="text-destructive font-semibold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'manual' ? (
          <motion.div 
            key="manual"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-card/40 backdrop-blur-2xl rounded-2xl p-8 border border-black/10 dark:border-white/10 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Sparkles className="w-24 h-24" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-8 flex items-center gap-2">
               <Plus className="w-5 h-5 text-primary" />
               Product Intelligence Profile
            </h2>
            
            <form onSubmit={handleManualSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Enter global product name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    SKU Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                    placeholder="E.g., LIFE-PH-001"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    Strategic Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Pharmaceuticals, Electronics, etc."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    Measurement Unit *
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none outline-none"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ltr">Liters (ltr)</option>
                    <option value="box">Box (box)</option>
                    <option value="pack">Pack (pack)</option>
                    <option value="roll">Roll (roll)</option>
                    <option value="meter">Meter (meter)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    Unit Valuation ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    Safety Reorder Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Min stock threshold"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-muted-foreground ml-1">
                    ABC Classification (Value Priority)
                  </label>
                  <select
                    value={formData.abcClass}
                    onChange={(e) => setFormData({ ...formData, abcClass: e.target.value })}
                    className="w-full px-5 py-3 bg-muted/20 border border-black/10 dark:border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none outline-none"
                  >
                    <option value="">Auto-calculate (Recommended)</option>
                    <option value="A">Class A - High Value (Critical)</option>
                    <option value="B">Class B - Medium Value (Strategic)</option>
                    <option value="C">Class C - Low Value (General)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center gap-6 pt-6 border-t border-black/10 dark:border-white/10">
                <Link
                  href="/products"
                  className="text-muted-foreground hover:text-foreground font-semibold px-4 py-2 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-3 scale-100 hover:scale-[1.03] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{loading ? 'Transmitting...' : 'Execute Onboarding'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="excel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Download Template */}
            <div className="bg-primary/10 border border-primary/20 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform">
                 <Download className="w-32 h-32" />
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">Standardized Intelligence Template</h3>
                  <p className="text-muted-foreground mb-4 max-w-xl">
                    Download the SupplyMind standardized format to ensure high-fidelity data injection for bulk catalog operations.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:shadow-lg transition-all flex items-center space-x-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Products Template (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Step */}
            {importStep === 'upload' && (
              <div className="bg-card/40 backdrop-blur-2xl rounded-2xl p-8 border border-black/10 dark:border-white/10 shadow-2xl">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                   <Upload className="w-5 h-5 text-primary" />
                   High-Speed Data Ingestion
                </h2>
                <ExcelDropzone
                  onFileProcessed={handleExcelFileProcessed}
                  onError={handleExcelError}
                />
              </div>
            )}

            {/* Preview Step */}
            {importStep === 'preview' && importResult && (
              <ImportPreview
                result={importResult}
                columns={productColumns}
                onConfirm={handleImportConfirm}
                onCancel={handleImportCancel}
                isProcessing={loading}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
