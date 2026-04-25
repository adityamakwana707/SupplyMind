'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { useSession } from '@/components/AuthProvider';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

export function WarehouseFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(
    searchParams.get('warehouse') || ''
  );

  const userRole = (session?.user as any)?.role;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;

  // Filter warehouses based on role
  const availableWarehouses = userRole === 'ADMIN' 
    ? warehouses 
    : warehouses.filter((wh) => assignedWarehouses.includes(wh._id));

  const isLocked = userRole !== 'ADMIN' && availableWarehouses.length <= 1;

  useEffect(() => {
    fetch('/api/warehouses')
      .then((res) => res.json())
      .then((data) => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setWarehouses(data);
        } else {
          setWarehouses([]);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch warehouses:', error);
        setWarehouses([]);
      });
  }, []);

  useEffect(() => {
    if (userRole && userRole !== 'ADMIN' && availableWarehouses.length > 0) {
      const urlWarehouse = searchParams.get('warehouse');
      
      // If they only have one warehouse, force it
      if (availableWarehouses.length === 1) {
        if (urlWarehouse !== availableWarehouses[0]._id) {
          handleChange(availableWarehouses[0]._id);
        }
      } else if (availableWarehouses.length > 1 && !urlWarehouse) {
        // if no warehouse selected, default to primary or first available
        const defaultWh = primaryWarehouseId || availableWarehouses[0]._id;
        handleChange(defaultWh);
      } else if (urlWarehouse && !assignedWarehouses.includes(urlWarehouse)) {
        // they're trying to access a warehouse not assigned to them
        const defaultWh = primaryWarehouseId || availableWarehouses[0]?._id;
        if (defaultWh) handleChange(defaultWh);
      }
    }
  }, [userRole, availableWarehouses, searchParams, assignedWarehouses, primaryWarehouseId]);

  const handleChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    const params = new URLSearchParams(searchParams.toString());
    if (warehouseId) {
      params.set('warehouse', warehouseId);
    } else {
      params.delete('warehouse');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl);
  };

  if (!userRole) return null; // Wait for session to load

  return (
    <div className="flex items-center gap-2">
      <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
      <select
        value={selectedWarehouse}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isLocked}
        className="px-3 py-2 bg-background border border-black/10 dark:border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
        style={{
          backgroundImage: 'none'
        }}
      >
        {userRole === 'ADMIN' && (
          <option value="" className="bg-background text-foreground">All Warehouses</option>
        )}
        {availableWarehouses.map((wh) => (
          <option key={wh._id} value={wh._id} className="bg-background text-foreground">
            {wh.name} ({wh.code})
          </option>
        ))}
      </select>
    </div>
  );
}

