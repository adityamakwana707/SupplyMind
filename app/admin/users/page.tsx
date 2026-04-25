'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Filter,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { isAdmin } from '@/lib/authRoles';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  assignedWarehouses: Warehouse[];
  primaryWarehouseId?: Warehouse | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showManagerConfirm, setShowManagerConfirm] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<any>(null);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (!isAdmin(userRole)) {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
    fetchWarehouses();
  }, [userRole, filterStatus]);

  const fetchUsers = async () => {
    try {
      const url = filterStatus !== 'ALL' ? `/api/admin/users?status=${filterStatus}` : '/api/admin/users';
      const res = await fetch(url);
      
      if (!res.ok) {
        console.error('Failed to fetch users:', res.status, res.statusText);
        setUsers([]);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Invalid response format:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setWarehouses(data);
      } else {
        console.error('Invalid warehouses response format:', data);
        setWarehouses([]);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setWarehouses([]);
    }
  };

  const handleApprove = async (user: User, role: 'MANAGER' | 'OPERATOR', assignedWarehouses: string[], primaryWarehouseId?: string) => {
    if (role === 'MANAGER' && !showManagerConfirm) {
      setPendingApproval({ user, role, assignedWarehouses, primaryWarehouseId });
      setShowManagerConfirm(true);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          assignedWarehouses,
          primaryWarehouseId,
          confirmManager: role === 'MANAGER',
        }),
      });

      if (!res.ok) throw new Error('Failed to approve user');
      setShowManagerConfirm(false);
      setPendingApproval(null);
      setApprovingUser(null);
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reject user');
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate user');
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Ensure users is always an array before filtering - defensive check
  // This prevents "users.filter is not a function" errors
  const safeUsers: User[] = (() => {
    if (!users) return [];
    if (Array.isArray(users)) return users;
    console.error('Users is not an array:', typeof users, users);
    return [];
  })();
  
  const filteredUsers = safeUsers.filter((user) => {
    if (!user || typeof user !== 'object') return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (user.name && user.name.toLowerCase().includes(search)) ||
        (user.email && user.email.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Only filter if we have valid filtered users array
  const pendingUsers = Array.isArray(filteredUsers) ? filteredUsers.filter((u) => u?.status === 'PENDING') : [];
  const activeUsers = Array.isArray(filteredUsers) ? filteredUsers.filter((u) => u?.status === 'ACTIVE') : [];
  const inactiveUsers = Array.isArray(filteredUsers) ? filteredUsers.filter((u) => u?.status === 'INACTIVE') : [];

  if (!isAdmin(userRole)) {
    return null;
  }

  // Don't render filtered content until we have valid data
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8" />
            User Management
          </h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          Create User
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {pendingUsers.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            Pending Approvals ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user._id}
                className="bg-card/50 backdrop-blur-xl rounded-lg border border-black/10 dark:border-white/10 p-4 flex items-center justify-between shadow-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.role && (
                    <p className="text-sm text-primary mt-1">
                      Requested: <span className="font-medium">{user.role}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setApprovingUser(user)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user._id)}
                    className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-sm flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManagerConfirm && pendingApproval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Confirm Manager Role Assignment
            </h2>
            <p className="text-foreground mb-4">
              You are about to assign the <strong>MANAGER</strong> role to{' '}
              <strong>{pendingApproval.user.name}</strong>. This role grants:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Ability to approve/reject requisitions</li>
              <li>Ability to create and validate transfers</li>
              <li>Access to all operational data</li>
            </ul>
            <p className="text-yellow-600 text-sm mb-4">
              Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleApprove(
                    pendingApproval.user,
                    pendingApproval.role,
                    pendingApproval.assignedWarehouses,
                    pendingApproval.primaryWarehouseId
                  );
                }}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Yes, Assign Manager Role
              </button>
              <button
                onClick={() => {
                  setShowManagerConfirm(false);
                  setPendingApproval(null);
                }}
                className="flex-1 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {approvingUser && (
        <ApproveUserDialog
          user={approvingUser}
          warehouses={warehouses}
          onApprove={handleApprove}
          onClose={() => setApprovingUser(null)}
        />
      )}

      <div className="bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-lg">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                Assigned Warehouse
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-muted/30 transition-colors duration-200">
                <td className="px-6 py-4 text-foreground">{user.name}</td>
                <td className="px-6 py-4 text-foreground">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : user.role === 'MANAGER'
                        ? 'bg-blue-500/20 text-blue-400'
                        : user.role === 'OPERATOR'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {user.role || 'No Role'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400'
                        : user.status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">
                  {user.assignedWarehouses?.length > 0
                    ? user.assignedWarehouses[0].name
                    : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowForm(true);
                      }}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {user.status !== 'INACTIVE' && (
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No users found</div>
        )}
      </div>

      {showForm && (
        <UserFormDialog
          user={editingUser}
          warehouses={warehouses}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function ApproveUserDialog({
  user,
  warehouses,
  onApprove,
  onClose,
}: {
  user: User;
  warehouses: Warehouse[];
  onApprove: (user: User, role: 'MANAGER' | 'OPERATOR', warehouses: string[], primary?: string) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState<'MANAGER' | 'OPERATOR'>(
    (user.role === 'MANAGER' || user.role === 'OPERATOR') ? user.role : 'OPERATOR'
  );
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [primaryWarehouse, setPrimaryWarehouse] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWarehouses.length === 0) {
      alert('Please select a warehouse');
      return;
    }
    onApprove(user, role, selectedWarehouses, primaryWarehouse || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold text-foreground mb-4">Approve User</h2>
        <p className="text-muted-foreground mb-2">
          Approve <strong className="text-foreground">{user.name}</strong> and assign role and warehouses.
        </p>
        {user.role && (
          <div className="mb-4 p-3 bg-primary/20 border border-primary/50 rounded-lg">
            <p className="text-primary text-sm">
              📋 <strong>Requested Role:</strong> {user.role}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'MANAGER' | 'OPERATOR')}
              required
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="OPERATOR">Operator</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assigned Warehouse *
            </label>
            <select
              value={selectedWarehouses[0] || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedWarehouses([e.target.value]);
                  setPrimaryWarehouse(e.target.value);
                } else {
                  setSelectedWarehouses([]);
                  setPrimaryWarehouse('');
                }
              }}
              required
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserFormDialog({
  user,
  warehouses,
  onClose,
  onSuccess,
}: {
  user: User | null;
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | '';
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
    assignedWarehouses: string[];
    primaryWarehouseId: string;
  }>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'OPERATOR',
    status: user?.status || 'ACTIVE',
    assignedWarehouses: user?.assignedWarehouses.map((wh) => wh._id) || [],
    primaryWarehouseId: user?.primaryWarehouseId?._id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !formData.password) {
      alert('Password is required for new users');
      return;
    }

    try {
      const url = user ? `/api/admin/users/${user._id}` : '/api/admin/users';
      const method = user ? 'PUT' : 'POST';

      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        assignedWarehouses: formData.assignedWarehouses,
        primaryWarehouseId: formData.primaryWarehouseId || undefined,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      if (formData.role === 'MANAGER' && user?.role !== 'MANAGER') {
        body.confirmManager = true;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save user');
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {user ? 'Edit User' : 'Create User'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password {!user && '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={user ? 'Leave blank to keep current' : 'At least 6 characters'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role *</label>
            <select
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'MANAGER' | 'OPERATOR' })}
              required
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select role</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="OPERATOR">Operator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              required
              className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          {formData.role && formData.role !== 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Assigned Warehouse *
              </label>
              <select
                value={formData.assignedWarehouses[0] || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData({
                      ...formData,
                      assignedWarehouses: [e.target.value],
                      primaryWarehouseId: e.target.value,
                    });
                  } else {
                    setFormData({
                      ...formData,
                      assignedWarehouses: [],
                      primaryWarehouseId: '',
                    });
                  }
                }}
                required={formData.role === 'MANAGER' || formData.role === 'OPERATOR'}
                className="w-full px-4 py-2 bg-background/50 border border-black/10 dark:border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {user ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

