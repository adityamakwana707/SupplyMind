'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/AuthProvider';
import { ArrowLeft, Save, Upload, Download, FileSpreadsheet, Plus } from 'lucide-react';
import Link from 'next/link';
import ExcelDropzone from '@/components/ExcelDropzone';
import ImportPreview from '@/components/ImportPreview';
import ExcelImportService, { ReceiptImportData, ExcelImportResult } from '@/lib/services/excelImportService';

type ImportMode = 'manual' | 'excel';
type ImportStep = 'upload' | 'preview' | 'processing';

export default function NewReceiptPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<ImportMode>('manual');
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<ExcelImportResult<ReceiptImportData> | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  // Manual form data
  const [formData, setFormData] = useState({
    receiptNumber: '',
    supplier: '',
    warehouseId: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{
      productId: '',
      quantity: 0,
      unitPrice: 0,
      batchNumber: '',
      expiryDate: '',
    }]
  });

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (session && userRole && !['ADMIN', 'MANAGER', 'OPERATOR'].includes(userRole)) {
      router.push('/receipts');
    }
  }, [session, userRole, router]);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
    }
  };

  if (!session || (userRole && !['ADMIN', 'MANAGER', 'OPERATOR'].includes(userRole))) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to create receipts.</p>
        </div>
      </div>
    );
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/receipts');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create receipt');
      }
    } catch (error) {
      setError('An error occurred while creating the receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelFileProcessed = (data: any[]) => {
    const result = ExcelImportService.validateReceiptImport(data);
    setImportResult(result);
    setImportStep('preview');
  };

  const handleExcelError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleImportConfirm = async (receipts: ReceiptImportData[]) => {
    setLoading(true);
    setImportStep('processing');
    
    try {
      const response = await fetch('/api/receipts/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipts }),
      });

      const result = await response.json();
      
      if (response.ok) {
        router.push(`/receipts?import_success=true&created=${result.results.created}&updated=${result.results.updated}`);
      } else {
        setError(result.error || 'Failed to import receipts');
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
      const response = await fetch('/api/templates?type=receipts');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'receipts_template.xlsx';
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

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: '',
        quantity: 0,
        unitPrice: 0,
        batchNumber: '',
        expiryDate: '',
      }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const receiptColumns = [
    { key: 'receiptNumber' as keyof ReceiptImportData, label: 'Receipt Number' },
    { key: 'supplier' as keyof ReceiptImportData, label: 'Supplier' },
    { key: 'warehouseName' as keyof ReceiptImportData, label: 'Warehouse' },
    { key: 'productSKU' as keyof ReceiptImportData, label: 'Product SKU' },
    { key: 'quantity' as keyof ReceiptImportData, label: 'Quantity' },
    { 
      key: 'unitPrice' as keyof ReceiptImportData, 
      label: 'Unit Price',
      render: (value: any) => value ? `$${Number(value).toFixed(2)}` : '-'
    },
    { key: 'batchNumber' as keyof ReceiptImportData, label: 'Batch Number' },
    { 
      key: 'expiryDate' as keyof ReceiptImportData, 
      label: 'Expiry Date',
      render: (value: any) => value ? new Date(value).toLocaleDateString() : '-'
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/receipts"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Receipts
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Add New Receipts
        </h1>
        <p className="text-muted-foreground">
          Choose between manual entry for single receipts or Excel import for bulk operations.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setMode('manual');
              setImportStep('upload');
              setImportResult(null);
              setError('');
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              mode === 'manual'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border'
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
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              mode === 'excel'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Import</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-destructive/20 border border-destructive rounded-lg p-4">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Receipt Information</h2>
          
          <form onSubmit={handleManualSubmit} className="space-y-6">
            {/* Receipt Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Receipt Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter receipt number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Supplier *
                </label>
                <input
                  type="text"
                  required
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select warehouse</option>
                  {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Received Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter any notes or comments"
                rows={3}
              />
            </div>

            {/* Receipt Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-foreground">Receipt Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-muted/50 rounded-lg mb-4 border border-border">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Product *
                    </label>
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select product</option>
                      {Array.isArray(products) && products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={item.batchNumber}
                      onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href="/receipts"
                className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors border border-border"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>}
                <Save className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create Receipt'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Excel Import Mode */}
      {mode === 'excel' && (
        <div className="space-y-6">
          {/* Download Template */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Download className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="text-primary font-medium mb-1">Download Template</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Download the Excel template with the required column format and sample data.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Receipts Template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Upload Step */}
          {importStep === 'upload' && (
            <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-border p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">Upload Excel File</h2>
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
              columns={receiptColumns}
              onConfirm={handleImportConfirm}
              onCancel={handleImportCancel}
              isProcessing={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}
