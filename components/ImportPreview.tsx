'use client';

import React, { useState } from 'react';
import { ExcelImportResult } from '@/lib/services/excelImportService';

interface ImportPreviewProps<T> {
  result: ExcelImportResult<T>;
  onConfirm: (data: T[]) => void;
  onCancel: () => void;
  columns: { key: keyof T; label: string; render?: (value: any) => string }[];
  isProcessing?: boolean;
}

export default function ImportPreview<T>({
  result,
  onConfirm,
  onCancel,
  columns,
  isProcessing = false,
}: ImportPreviewProps<T>) {
  const [showErrors, setShowErrors] = useState(false);

  if (!result.success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Import Failed</h3>
          <p className="text-gray-600 mb-4">
            The Excel file contains errors that need to be fixed before importing.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-red-800 mb-2">Errors found:</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {result.errors?.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-green-600 mb-2">Import Preview</h3>
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <span>Total Rows: <span className="font-medium">{result.totalRows}</span></span>
          <span>Valid Rows: <span className="font-medium text-green-600">{result.validRows}</span></span>
          {result.errors && result.errors.length > 0 && (
            <span>Errors: <span className="font-medium text-red-600">{result.errors.length}</span></span>
          )}
        </div>
      </div>

      {/* Error Summary */}
      {result.errors && result.errors.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showErrors ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">
              {showErrors ? 'Hide' : 'Show'} Errors ({result.errors.length})
            </span>
          </button>
          
          {showErrors && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Data Preview Table */}
      {result.data && result.data.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3">Data Preview (First 10 rows)</h4>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.data.slice(0, 10).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-3 text-sm text-gray-900">
                        {column.render
                          ? column.render(item[column.key])
                          : String(item[column.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {result.data.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">
              ... and {result.data.length - 10} more rows
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        
        <div className="flex space-x-4">
          {result.data && result.data.length > 0 && (
            <button
              onClick={() => onConfirm(result.data!)}
              disabled={isProcessing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {isProcessing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>
                {isProcessing ? 'Importing...' : `Import ${result.validRows} Records`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
