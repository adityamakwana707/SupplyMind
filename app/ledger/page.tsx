'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StockMovement {
  _id: string;
  productId: any;
  warehouseFromId?: any;
  warehouseToId?: any;
  locationFromId?: any;
  locationToId?: any;
  change: number;
  type: string;
  createdAt: string;
  createdBy: any;
}

export default function LedgerPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      setMovements(Array.isArray(data.movements) ? data.movements : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return 'text-primary';
      case 'DELIVERY':
        return 'text-destructive';
      case 'TRANSFER':
        return 'text-primary';
      case 'ADJUSTMENT':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Move History</h1>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search movements..."
            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading movements...</div>
      ) : (
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {movements.map((movement) => (
                <tr
                  key={movement._id}
                  className={`hover:bg-muted/30 transition-colors duration-200 ${
                    movement.type === 'RECEIPT' ? 'bg-primary/5' : ''
                  } ${movement.type === 'DELIVERY' ? 'bg-destructive/5' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(movement.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {movement.productId?.name || movement.productId?.sku || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {movement.warehouseFromId?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {movement.warehouseToId?.name || '-'}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(
                      movement.type
                    )}`}
                  >
                    {movement.change > 0 ? '+' : ''}
                    {movement.change}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(
                        movement.type
                      )} border-current/30`}
                    >
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {movement.createdBy?.name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No movements found</div>
          )}
        </div>
      )}
    </div>
  );
}

