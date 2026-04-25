'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/components/AuthProvider';
import { 
  BarChart3, 
  Truck, 
  MapPin, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  Package,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';

export default function VendorClient() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const vendorId = (session?.user as any)?.vendorId;
  const vendorName = session?.user?.name || 'Lifeline Pharma Hub';

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch Reliability Metrics
        const mRes = await fetch(`/api/vendor/metrics`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMetrics(mData);
        }

        // Fetch My Purchase Orders + Shipments
        const sRes = await fetch(`/api/vendor/purchase-orders`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setPurchaseOrders(sData);
        }
      } catch (err: any) {
        
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vendorId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-500 gap-4">
       <BarChart3 className="w-12 h-12 animate-pulse" />
       <p className="text-xs font-black tracking-widest uppercase opacity-60">Initializing Intelligence Feed...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="bg-blue-600 p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-black uppercase tracking-tight">Lifeline Pharma Analytics</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest -mt-1">Critical Tier Partner Portal</p>
             </div>
          </div>
          <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-emerald-400 uppercase">Operational Status: Peak</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Reliability Score */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-12 text-blue-500/5 -z-10 group-hover:scale-125 transition-transform">
                 <ShieldCheck className="w-32 h-32" />
              </div>
              
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Network Reliability Score</p>
              <div className="flex items-baseline gap-2">
                 <h2 className="text-7xl font-black text-white">{metrics?.reliabilityScore || 0}</h2>
                 <span className="text-sm font-bold text-slate-500">/ 100</span>
              </div>
              
              <div className="mt-8 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">On-Time Delivery</span>
                    <span className="text-emerald-400 font-black">
                      {metrics?.totalOrders ? Math.round((metrics?.onTimeCount / metrics?.totalOrders) * 100) : 0}%
                    </span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${metrics?.totalOrders ? Math.round((metrics?.onTimeCount / metrics?.totalOrders) * 100) : 0}%` }}
                    />
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">Quality Compliance</span>
                    <span className="text-blue-400 font-black">98.2%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '98%' }} />
                 </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                 <div className="flex items-center gap-3 text-emerald-400">
                    <TrendingDown className="w-5 h-5 rotate-180" />
                    <p className="text-xs font-bold uppercase tracking-wide">Elite Tier: Top 2% of Partners</p>
                 </div>
              </div>
            </div>

            <div className="bg-card/50 border border-white/5 rounded-2xl p-6 shadow-xl">
               <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Supply Resilience Monitor
               </h3>
               <p className="text-xs text-slate-400 leading-relaxed">
                  Your current supply chain resilience index is **High**. Your diversified transport routes for "Essential Medicine" cargo are mitigating 92% of local transit bottlenecks.
               </p>
            </div>
          </div>

          {/* RIGHT: Active Pipelines */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-500" />
                  Outbound Logistics Pipeline
               </h3>
               <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                  {purchaseOrders.length} ACTIVE ENTRIES
               </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {purchaseOrders.length > 0 ? purchaseOrders.map((sh, idx) => (
                 <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 group hover:border-blue-500/50 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className={shipmentStatusColor(sh.status)}>
                             <Package className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-xs font-black text-white">{sh.reference || sh.id}</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase">{sh.sourceType}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Current ETA</p>
                          <p className="text-xs font-black text-blue-400">
                             {sh.eta ? new Date(sh.eta?.toDate ? sh.eta.toDate() : sh.eta).toLocaleDateString() : 'N/A'}
                          </p>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm mb-6">
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-600 uppercase">To Center</p>
                          <p className="font-bold text-slate-300 truncate">{sh.warehouseId || 'N/A'}</p>
                       </div>
                       <ArrowRight className="w-4 h-4 text-slate-600" />
                       <div className="flex-1 text-right">
                          <p className={`text-[10px] font-black uppercase mb-1 ${sh.status === 'DELAYED' ? 'text-red-500' : 'text-emerald-500'}`}>
                             {sh.status === 'DELAYED' ? 'High Risk' : 'Operational'}
                          </p>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full ${sh.status === 'DELAYED' ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${sh.status === 'DELAYED' ? 80 : 40}%` }} 
                             />
                          </div>
                       </div>
                    </div>
                    
                    {sh.status === 'DELAYED' && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                         <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                         <p className="text-[10px] font-black text-red-400 uppercase tracking-tighter">
                            Active Bottleneck: AI Resolution Recommended to SCM Head
                         </p>
                      </div>
                    )}
                 </div>
               )) : (
                 <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <Package className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No Active Logistics Pipeline</p>
                 </div>
               )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function shipmentStatusColor(status: string) {
  switch (status) {
    case 'IN_TRANSIT': return 'p-2 bg-blue-500/10 text-blue-500 rounded-lg';
    case 'DELAYED': return 'p-2 bg-red-500/10 text-red-500 rounded-lg';
    case 'DISPATCHED': return 'p-2 bg-emerald-500/10 text-emerald-500 rounded-lg';
    default: return 'p-2 bg-slate-500/10 text-slate-500 rounded-lg';
  }
}
