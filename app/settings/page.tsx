'use client';

import { useState, useEffect } from 'react';
import { Warehouse, MapPin, AlertTriangle } from 'lucide-react';
import { useSession } from '@/components/AuthProvider';
import Link from 'next/link';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  address?: string;
}

interface Location {
  _id: string;
  name: string;
  code?: string;
  warehouseId: any;
}

export default function SettingsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [warehousesRes, locationsRes] = await Promise.all([
        fetch('/api/warehouses'),
        fetch('/api/locations'),
      ]);
      const warehousesData = await warehousesRes.json();
      const locationsData = await locationsRes.json();
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const userRole = (session?.user as any)?.role;
  const canManage = userRole === 'ADMIN';

  const handleDemoReset = async () => {
    if (!confirm('Are you sure you want to reset the entire database to the demo state? This will recreate all test user accounts.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/demo-reset', { method: 'POST' });
      if (res.ok) {
        alert('Demo state reset successfully! All test accounts created.');
        window.location.reload();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Settings & Admin</h1>
        {canManage && (
          <button
            onClick={handleDemoReset}
            disabled={resetting}
            className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/20 font-bold transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {resetting ? 'Resetting Database...' : 'Reset Demo State'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          href="/settings/warehouses"
          className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <Warehouse className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-foreground">Warehouses</h2>
          </div>
          <p className="text-muted-foreground">
            {canManage ? 'Manage warehouses and their details' : 'View warehouses (read-only)'}
          </p>
        </Link>

        <Link
          href="/settings/locations"
          className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Locations</h2>
          </div>
          <p className="text-muted-foreground">
            {canManage ? 'Manage locations within warehouses' : 'View locations (read-only)'}
          </p>
        </Link>
      </div>

      {!canManage && (
        <div className="p-4 bg-muted/50 border border-muted-foreground/50 rounded-lg text-muted-foreground">
          You are viewing settings in read-only mode. Only administrators can create, edit, or delete warehouses and locations.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Warehouse className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Warehouses</h2>
          </div>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse._id}
                  className="p-3 bg-muted/30 rounded-lg border border-black/10 dark:border-white/10"
                >
                  <div className="font-medium text-foreground">{warehouse.name}</div>
                  <div className="text-sm text-muted-foreground">Code: {warehouse.code}</div>
                  {warehouse.address && (
                    <div className="text-sm text-muted-foreground/70 mt-1">{warehouse.address}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Locations</h2>
          </div>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <div
                  key={location._id}
                  className="p-3 bg-muted/30 rounded-lg border border-black/10 dark:border-white/10"
                >
                  <div className="font-medium text-foreground">{location.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Warehouse: {location.warehouseId?.name || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

