'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Users, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/components/AuthProvider';
import { isAdmin } from '@/lib/authRoles';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  address?: string;
  description?: string;
  isActive: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | null;
  assignedWarehouses: string[];
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const warehouseId = params.id as string;
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canManage = isAdmin(userRole);

  useEffect(() => {
    if (warehouseId) {
      fetchWarehouse();
      fetchAssignedUsers();
      if (canManage) {
        fetchAllUsers();
      }
    }
  }, [warehouseId, canManage]);

  const fetchWarehouse = async () => {
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}`);
      if (!res.ok) throw new Error('Failed to fetch warehouse');
      const data = await res.json();
      setWarehouse(data);
    } catch (error) {
      console.error('Failed to fetch warehouse:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const users = await res.json();
      // Filter users assigned to this warehouse
      const assigned = (users || []).filter((user: User) =>
        user.assignedWarehouses?.includes(warehouseId)
      );
      setAssignedUsers(assigned);
    } catch (error) {
      console.error('Failed to fetch assigned users:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const users = await res.json();
      // Filter to only MANAGER and OPERATOR roles
      const managersAndOperators = (users || []).filter(
        (user: User) => user.role === 'MANAGER' || user.role === 'OPERATOR'
      );
      setAllUsers(managersAndOperators);
    } catch (error) {
      console.error('Failed to fetch all users:', error);
    }
  };

  const handleAddUser = async (userId: string) => {
    try {
      const user = allUsers.find((u) => u._id === userId);
      if (!user) return;

      const currentWarehouses = user.assignedWarehouses || [];
      if (currentWarehouses.includes(warehouseId)) {
        alert('User is already assigned to this warehouse');
        return;
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWarehouses: [...currentWarehouses, warehouseId],
        }),
      });

      if (!res.ok) throw new Error('Failed to assign user');
      fetchAssignedUsers();
      setShowAddUser(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from this warehouse?')) return;

    try {
      const user = assignedUsers.find((u) => u._id === userId);
      if (!user) return;

      const currentWarehouses = user.assignedWarehouses || [];
      const updatedWarehouses = currentWarehouses.filter((id) => id !== warehouseId);

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWarehouses: updatedWarehouses,
          primaryWarehouseId:
            user.assignedWarehouses?.[0] === warehouseId ? null : user.assignedWarehouses?.[0],
        }),
      });

      if (!res.ok) throw new Error('Failed to remove user');
      fetchAssignedUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading warehouse...</div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          Warehouse not found
        </div>
        <Link href="/settings/warehouses" className="text-primary hover:text-primary/80 transition-colors">
          ← Back to Warehouses
        </Link>
      </div>
    );
  }

  const availableUsers = allUsers.filter(
    (user) => !assignedUsers.some((au) => au._id === user._id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings/warehouses"
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{warehouse.name}</h1>
            <p className="text-muted-foreground mt-1">Code: {warehouse.code}</p>
          </div>
        </div>
        {canManage && (
          <Link
            href={`/settings/warehouses?edit=${warehouseId}`}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Edit className="w-4 h-4" />
            Edit Warehouse
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Warehouse Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
              <p className="text-foreground">{warehouse.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Code</label>
              <p className="text-foreground">{warehouse.code}</p>
            </div>
            {warehouse.address && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
                <p className="text-foreground">{warehouse.address}</p>
              </div>
            )}
            {warehouse.description && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <p className="text-foreground">{warehouse.description}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                  warehouse.isActive
                    ? 'bg-primary/20 text-primary border-primary/50'
                    : 'bg-muted text-muted-foreground border-muted-foreground/50'
                }`}
              >
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assigned Workers
              </h2>
              {availableUsers.length > 0 && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  Add Worker
                </button>
              )}
            </div>

            {showAddUser && availableUsers.length > 0 && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-black/10 dark:border-white/10">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddUser(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  defaultValue=""
                >
                  <option value="">Select user to assign...</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {assignedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No workers assigned</p>
                {availableUsers.length === 0 && (
                  <p className="text-xs mt-2 text-muted-foreground/70">
                    No available users to assign (all MANAGER/OPERATOR users are already assigned)
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {assignedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-black/10 dark:border-white/10"
                  >
                    <div>
                      <p className="text-foreground font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <span
                        className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          user.role === 'MANAGER'
                            ? 'bg-primary/20 text-primary border-primary/50'
                            : 'bg-primary/20 text-primary border-primary/50'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user._id)}
                      className="p-1.5 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded transition-colors"
                      title="Remove from warehouse"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

