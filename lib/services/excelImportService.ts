import * as XLSX from 'xlsx';

export interface ExcelImportResult<T> {
  success: boolean;
  data?: T[];
  errors?: string[];
  totalRows?: number;
  validRows?: number;
}

export interface ProductImportData {
  name: string;
  sku: string;
  category?: string;
  unit: string;
  price?: number;
  reorderLevel: number;
  abcClass?: 'A' | 'B' | 'C';
}

export interface ReceiptImportData {
  supplierName: string;
  warehouseName: string;
  productSku: string;
  locationName?: string;
  quantity: number;
  reference?: string;
}

export interface DeliveryImportData {
  customerName: string;
  warehouseName: string;
  productSku: string;
  locationName?: string;
  quantity: number;
  reference?: string;
}

class ExcelImportService {
  // Parse Excel file to JSON
  static parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          });
          
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Validate and process product import data
  static validateProductImport(rawData: any[]): ExcelImportResult<ProductImportData> {
    const errors: string[] = [];
    const validData: ProductImportData[] = [];
    
    if (!rawData || rawData.length < 2) {
      return {
        success: false,
        errors: ['Excel file must contain header row and at least one data row'],
      };
    }

    const headers = rawData[0] as string[];
    const requiredHeaders = ['name', 'sku', 'unit', 'reorderLevel'];
    
    // Check required headers
    for (const required of requiredHeaders) {
      if (!headers.some(h => h.toLowerCase().includes(required.toLowerCase()))) {
        errors.push(`Missing required column: ${required}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Process each row
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      const rowData: any = {};
      
      // Map row data to headers
      headers.forEach((header, index) => {
        if (row[index] !== undefined && row[index] !== '') {
          rowData[header.toLowerCase().replace(/\s+/g, '')] = row[index];
        }
      });

      // Validate required fields
      if (!rowData.name || !rowData.sku || !rowData.unit) {
        errors.push(`Row ${i + 1}: Missing required fields (name, sku, unit)`);
        continue;
      }

      // Create product object
      const product: ProductImportData = {
        name: String(rowData.name).trim(),
        sku: String(rowData.sku).trim().toUpperCase(),
        category: rowData.category ? String(rowData.category).trim() : undefined,
        unit: String(rowData.unit).trim(),
        price: rowData.price ? Number(rowData.price) : undefined,
        reorderLevel: Number(rowData.reorderlevel || rowData.reorder_level || 0),
        abcClass: rowData.abcclass ? String(rowData.abcclass).toUpperCase() as 'A' | 'B' | 'C' : undefined,
      };

      // Additional validations
      if (product.sku.length < 2) {
        errors.push(`Row ${i + 1}: SKU must be at least 2 characters`);
        continue;
      }

      if (product.reorderLevel < 0) {
        errors.push(`Row ${i + 1}: Reorder level must be non-negative`);
        continue;
      }

      if (product.price && product.price < 0) {
        errors.push(`Row ${i + 1}: Price must be non-negative`);
        continue;
      }

      validData.push(product);
    }

    return {
      success: errors.length === 0,
      data: validData,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: rawData.length - 1,
      validRows: validData.length,
    };
  }

  // Validate and process receipt import data
  static validateReceiptImport(rawData: any[]): ExcelImportResult<ReceiptImportData> {
    const errors: string[] = [];
    const validData: ReceiptImportData[] = [];
    
    if (!rawData || rawData.length < 2) {
      return {
        success: false,
        errors: ['Excel file must contain header row and at least one data row'],
      };
    }

    const headers = rawData[0] as string[];
    const requiredHeaders = ['supplierName', 'warehouseName', 'productSku', 'quantity'];
    
    // Check required headers
    for (const required of requiredHeaders) {
      if (!headers.some(h => h.toLowerCase().replace(/\s+/g, '').includes(required.toLowerCase()))) {
        errors.push(`Missing required column: ${required}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Process each row
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      const rowData: any = {};
      
      // Map row data to headers
      headers.forEach((header, index) => {
        if (row[index] !== undefined && row[index] !== '') {
          const key = header.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
          rowData[key] = row[index];
        }
      });

      // Validate required fields
      if (!rowData.suppliername || !rowData.warehousename || !rowData.productsku || !rowData.quantity) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      // Create receipt line object
      const receiptLine: ReceiptImportData = {
        supplierName: String(rowData.suppliername).trim(),
        warehouseName: String(rowData.warehousename).trim(),
        productSku: String(rowData.productsku).trim().toUpperCase(),
        locationName: rowData.locationname ? String(rowData.locationname).trim() : undefined,
        quantity: Number(rowData.quantity),
        reference: rowData.reference ? String(rowData.reference).trim() : undefined,
      };

      // Additional validations
      if (receiptLine.quantity <= 0) {
        errors.push(`Row ${i + 1}: Quantity must be positive`);
        continue;
      }

      validData.push(receiptLine);
    }

    return {
      success: errors.length === 0,
      data: validData,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: rawData.length - 1,
      validRows: validData.length,
    };
  }

  // Generate sample Excel templates
  static generateProductTemplate(): Blob {
    const sampleData = [
      ['Name', 'SKU', 'Category', 'Unit', 'Price', 'Reorder Level', 'ABC Class'],
      ['Sample Product 1', 'PROD001', 'Electronics', 'pcs', 100.50, 10, 'A'],
      ['Sample Product 2', 'PROD002', 'Raw Material', 'kg', 25.00, 50, 'B'],
      ['Sample Product 3', 'PROD003', 'Finished Goods', 'box', 75.25, 20, 'C'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  static generateReceiptTemplate(): Blob {
    const sampleData = [
      ['Supplier Name', 'Warehouse Name', 'Product SKU', 'Location Name', 'Quantity', 'Reference'],
      ['ABC Suppliers', 'Main Warehouse', 'PROD001', 'Rack A1', 100, 'PO-2025-001'],
      ['XYZ Corp', 'Main Warehouse', 'PROD002', 'Rack B2', 50, 'PO-2025-002'],
      ['Quality Parts Ltd', 'Secondary Warehouse', 'PROD003', 'Shelf C1', 25, 'PO-2025-003'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  static generateDeliveryTemplate(): Blob {
    const sampleData = [
      ['Customer Name', 'Warehouse Name', 'Product SKU', 'Location Name', 'Quantity', 'Reference'],
      ['Customer A', 'Main Warehouse', 'PROD001', 'Rack A1', 10, 'SO-2025-001'],
      ['Customer B', 'Main Warehouse', 'PROD002', 'Rack B2', 15, 'SO-2025-002'],
      ['Customer C', 'Secondary Warehouse', 'PROD003', 'Shelf C1', 5, 'SO-2025-003'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

export default ExcelImportService;
