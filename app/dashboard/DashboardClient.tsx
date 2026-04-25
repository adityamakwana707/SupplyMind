'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@/components/AuthProvider';
import { Package, AlertTriangle, FileText, Truck, Clock, TrendingDown, Users, Warehouse } from 'lucide-react';
import Link from 'next/link';
import LiveRiskTicker from '@/components/LiveRiskTicker';
import ControlTowerMap, { Shipment } from '@/components/ControlTowerMap';

interface DashboardData {
  totalSKUs: number;
  lowStockCount: number;
  pendingRequisitions: number;
  pendingTransfers: number;
  slowDeadStockCount: number;
  stockoutEvents: number;
  revenueAtRisk: number;
  impactedOrdersCount: number;
  vendorDiversificationIndex: number;
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  description?: string;
  trend?: { value: number; label: string };
}

interface DecisionOption {
  type: 'REROUTE' | 'REDISTRIBUTE' | 'BACKUP_SUPPLIER' | 'GIG_TRANSPORT';
  label: string;
  summary: string;
  timeSavedMinutes: number;
  costPremium: number;
}

interface DecisionCard {
  id: string;
  shipmentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  options: DecisionOption[];
  cascadePayload?: {
    triggerRiskScore?: number;
    delayEstimateHours?: number;
    totalRevenueAtRisk?: number;
    ordersAtRisk?: Array<{ orderId: string }>;
  };
}

function KPICard({ title, value, icon, href, description, trend }: KPICardProps) {
  const content = (
    <div className="p-6 rounded-xl border border-black/10 dark:border-white/10 bg-card/50 backdrop-blur-xl hover:shadow-xl transition-all duration-300 cursor-pointer shadow-lg group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-muted-foreground/70 group-hover:text-foreground/70 transition-colors">
              {icon}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-4">
        <div className="text-4xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground/60">{trend.label}</div>
            <div className={`text-sm font-semibold ${trend.value > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

import { useRouter } from 'next/navigation';

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [managerWarehouse, setManagerWarehouse] = useState<any>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [decisionCards, setDecisionCards] = useState<DecisionCard[]>([]);
  const [approvingDecision, setApprovingDecision] = useState<string | null>(null);
  
  const userRole = (session?.user as any)?.role;
  const primaryWarehouseId = (session?.user as any)?.primaryWarehouseId;
  const assignedWarehouses = (session?.user as any)?.assignedWarehouses || [];

  useEffect(() => {
    if (userRole === 'VENDOR') {
      router.push('/vendor');
    } else if (userRole === 'TRANSPORT') {
      router.push('/transport');
    }
    
    if (userRole === 'MANAGER') {
      const mainWarehouseId = primaryWarehouseId || (assignedWarehouses.length > 0 ? assignedWarehouses[0] : null);
      if (mainWarehouseId) {
        fetch(`/api/warehouses/${mainWarehouseId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setManagerWarehouse(data);
            }
          })
          .catch((err) => console.error('Failed to fetch warehouse:', err));
      }
    }
  }, [userRole, primaryWarehouseId, assignedWarehouses]);

  const warehouseId = useMemo(() => {
    return searchParams.get('warehouse') || '';
  }, [searchParams]);

  useEffect(() => {
    if (!warehouseId) {
      setData(initialData);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/dashboard?warehouseId=${warehouseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        return res.json();
      })
      .then((newData) => {
        if (!cancelled) {
          setData(newData);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Dashboard fetch error:', error);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [warehouseId, initialData]);

  useEffect(() => {
    if (userRole !== 'ADMIN') return;

    let mounted = true;
    const fetchDecisionCards = async () => {
      try {
        const response = await fetch('/api/decisions/pending');
        if (!response.ok) return;
        const payload = await response.json();
        if (!mounted) return;
        setDecisionCards(Array.isArray(payload) ? payload : []);
      } catch {
        if (mounted) {
          setDecisionCards([]);
        }
      }
    };

    fetchDecisionCards();
    const intervalId = window.setInterval(fetchDecisionCards, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [userRole]);



  const selectedDecisionCard = useMemo(() => {
    if (!selectedShipment) return null;
    const shipmentId = selectedShipment.id || selectedShipment._id || selectedShipment.shipmentId;
    return decisionCards.find((card) => card.shipmentId === shipmentId || card.shipmentId === selectedShipment.shipmentId) || null;
  }, [decisionCards, selectedShipment]);

  const handleApprove = async (decisionId: string, optionType: DecisionOption['type']) => {
    setApprovingDecision(decisionId);
    try {
      const response = await fetch(`/api/decisions/${decisionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionType })
      });

      if (response.ok) {
        setDecisionCards((prev) => prev.filter((card) => card.id !== decisionId));
      }
    } finally {
      setApprovingDecision(null);
    }
  };

  return (
    <div className="space-y-6">
      {userRole === 'ADMIN' && (
        <div className="-mx-4 md:-mx-8 -mt-8 mb-6">
          <LiveRiskTicker />
        </div>
      )}

      {loading && (
        <div className="text-center text-muted-foreground py-4">Loading dashboard data...</div>
      )}

      {userRole === 'MANAGER' && managerWarehouse && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Your Center</p>
              <p className="text-lg text-foreground font-semibold">{managerWarehouse.name} ({managerWarehouse.code})</p>
            </div>
          </div>
          <Link 
            href={`/dashboard/warehouses/${primaryWarehouseId || assignedWarehouses[0]}/docks`}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary font-bold rounded-lg transition-all"
          >
            <Clock className="w-4 h-4" />
            Manage Site Docks
          </Link>
        </div>
      )}

      {userRole === 'ADMIN' && (
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none -z-10"></div>
          <ControlTowerMap
            onShipmentClick={(shipment) => setSelectedShipment(shipment)}
            highlightedShipmentId={selectedShipment?.id || selectedShipment?._id}
          />
          <div className="mt-4 rounded-xl border border-black/10 bg-card/50 p-5 dark:border-white/10">
            {selectedShipment ? (
              <>
                <div className="mb-4 flex flex-col gap-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selected Shipment</h3>
                  <p className="text-lg font-bold text-foreground">{selectedShipment.shipmentId || selectedShipment.id}</p>
                  <p className="text-sm text-muted-foreground">Risk Score: {selectedShipment.riskScore ?? 0}%</p>
                </div>

                {selectedDecisionCard ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">
                      Pending mitigation options ({selectedDecisionCard.options?.length || 0})
                    </div>
                    {selectedDecisionCard.options?.map((option, index) => (
                      <div key={`${selectedDecisionCard.id}-${option.type}-${index}`} className="glass glass-shadow rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:bg-background/80">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-foreground">{option.label}</span>
                          <span className="text-[10px] uppercase tracking-widest font-black text-primary bg-primary/10 px-2 py-1 rounded-full">{option.type}</span>
                        </div>
                        <p className="mb-4 text-xs text-muted-foreground leading-relaxed">{option.summary}</p>
                        
                        <div className="mb-5 bg-background/40 backdrop-blur-md p-3 rounded-lg border border-border flex flex-col gap-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Current Plan</span>
                            <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">At Risk</span>
                          </div>
                          {((selectedShipment as any)?.eta || (selectedShipment as any)?.expectedDeliveryDate) && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Current ETA</span>
                              <span className="text-[10px] text-foreground font-medium">{new Date((selectedShipment as any).eta || (selectedShipment as any).expectedDeliveryDate).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Current Cost</span>
                            <span className="text-[10px] text-foreground font-medium">{(selectedShipment as any)?.baseCost ? `$${(selectedShipment as any).baseCost}` : 'Standard Rate'}</span>
                          </div>

                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Proposed Plan</span>
                              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Optimized</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Time Saved</span>
                              <span className="text-[10px] text-emerald-500 font-bold">+{option.timeSavedMinutes} mins</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Cost Premium</span>
                              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">{option.costPremium}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleApprove(selectedDecisionCard.id, option.type)}
                            disabled={approvingDecision === selectedDecisionCard.id}
                            className="rounded-lg bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                          >
                            {approvingDecision === selectedDecisionCard.id ? 'Executing...' : 'Approve Plan Change'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No pending decision card is linked to this shipment.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click a shipment marker on the map to view decision options.
              </p>
            )}
          </div>
        </div>
      )}

      {userRole === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {/* REVENUE AT RISK */}
           <div className="relative group overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-red-600 to-rose-700 shadow-2xl shadow-red-500/20">
              <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:scale-110 transition-transform">
                 <AlertTriangle className="w-24 h-24" />
              </div>
              <p className="text-xs font-black text-rose-100 uppercase tracking-widest mb-1">Revenue at Risk (Active)</p>
              <h4 className="text-4xl font-black text-white">${data.revenueAtRisk?.toLocaleString()}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-rose-200 uppercase bg-black/10 w-fit px-3 py-1 rounded-full border border-white/10">
                 <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                 Potential Network Loss
              </div>
           </div>

           {/* IMPACTED ORDERS */}
           <div className="relative group overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20">
              <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:scale-110 transition-transform">
                 <Package className="w-24 h-24" />
              </div>
              <p className="text-xs font-black text-blue-100 uppercase tracking-widest mb-1">Impacted Order Lines</p>
              <h4 className="text-4xl font-black text-white">{data.impactedOrdersCount}</h4>
              <p className="mt-4 text-[10px] font-black text-blue-200 uppercase tracking-tighter">Awaiting Mitigation Execution</p>
           </div>

           {/* VENDOR DIVERSIFICATION */}
           <div className="relative group overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-emerald-600 to-teal-700 shadow-2xl shadow-emerald-500/20">
              <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:scale-110 transition-transform">
                 <Warehouse className="w-24 h-24" />
              </div>
              <p className="text-xs font-black text-emerald-100 uppercase tracking-widest mb-1">Network Resilience Index</p>
              <h4 className="text-4xl font-black text-white">{data.vendorDiversificationIndex}%</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-100 uppercase bg-white/10 w-fit px-3 py-1 rounded-full">
                 {data.vendorDiversificationIndex > 70 ? 'Optimal Diversification' : 'High Concentration Risk'}
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total SKUs"
          value={data.totalSKUs}
          icon={<Package className="w-6 h-6" />}
          description="Active products in inventory"
        />
        <KPICard
          title="Low Stock Items"
          value={data.lowStockCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          href="/products?filter=low-stock"
          description="Products below reorder point"
          trend={{ value: data.lowStockCount, label: 'Requires attention' }}
        />
        <KPICard
          title="Pending Requisitions"
          value={data.pendingRequisitions}
          icon={<FileText className="w-6 h-6" />}
          href="/requisitions?status=SUBMITTED"
          description="Awaiting approval or fulfillment"
        />
        <KPICard
          title="Pending Transfers"
          value={data.pendingTransfers}
          icon={<Truck className="w-6 h-6" />}
          href="/transfers?status=DRAFT"
          description="In-transit between warehouses"
        />
        <KPICard
          title="Slow/Dead Stock"
          value={data.slowDeadStockCount}
          icon={<Clock className="w-6 h-6" />}
          href="/products"
          description="No movement in 90+ days"
          trend={{ value: data.slowDeadStockCount, label: 'Total items' }}
        />
        <KPICard
          title="Stockout Events (30d)"
          value={data.stockoutEvents}
          icon={<TrendingDown className="w-6 h-6" />}
          description="Zero-stock occurrences last month"
        />
      </div>

      {/* Role-specific Quick Links */}
      <div className="mt-8 bg-card/50 backdrop-blur-xl rounded-xl border border-black/10 dark:border-white/10 p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userRole === 'ADMIN' && (
            <>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Manage Users</div>
                  <div className="text-sm text-muted-foreground">Approve and manage user accounts</div>
                </div>
              </Link>
              <Link
                href="/settings/warehouses"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Warehouse className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Manage Warehouses</div>
                  <div className="text-sm text-muted-foreground">Create and configure warehouses</div>
                </div>
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Add Product</div>
                  <div className="text-sm text-muted-foreground">Create new product master data</div>
                </div>
              </Link>
              <button
                onClick={async () => {
                  if (confirm('Recompute reliability scores for all vendors based on historical data?')) {
                    const res = await fetch('/api/admin/recompute-reliability', { method: 'POST' });
                    if (res.ok) {
                      const result = await res.json();
                      alert(`Reliability scores updated for ${result.details?.length || 0} vendors.`);
                    }
                  }
                }}
                className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-all font-bold"
              >
                <TrendingDown className="w-4 h-4 rotate-180" />
                RECOMPUTE GLOBAL VENDOR RELIABILITY SCORES
              </button>
            </>
          )}
          
          {userRole === 'MANAGER' && (
            <>
              <Link
                href="/requisitions?status=SUBMITTED"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Approve Requisitions</div>
                  <div className="text-sm text-muted-foreground">Review and approve stock requests</div>
                </div>
              </Link>
              <Link
                href="/transfers?status=DRAFT"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Validate Transfers</div>
                  <div className="text-sm text-muted-foreground">Validate inter-warehouse transfers</div>
                </div>
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">Add Product</div>
                  <div className="text-sm text-muted-foreground">Create new product master data</div>
                </div>
              </Link>
            </>
          )}
          
          {userRole === 'OPERATOR' && (
            <>
              <Link
                href="/receipts/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">New Receipt</div>
                  <div className="text-sm text-muted-foreground">Record incoming stock</div>
                </div>
              </Link>
              <Link
                href="/deliveries/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">New Delivery</div>
                  <div className="text-sm text-muted-foreground">Record outgoing stock</div>
                </div>
              </Link>
              <Link
                href="/requisitions/new"
                className="flex items-center gap-3 p-4 bg-background/50 hover:bg-muted/50 border border-black/10 dark:border-white/10 rounded-lg transition-all duration-200"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-foreground font-medium">New Requisition</div>
                  <div className="text-sm text-muted-foreground">Request stock from other warehouses</div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
