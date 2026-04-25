'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/components/AuthProvider';
import { Truck, MapPin, Navigation, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function TransportClient() {
  const { data: session } = useSession();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const partnerId = (session?.user as any)?.partnerId;

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }

    const fetchShipments = async () => {
      try {
        const res = await fetch('/api/shipments');
        if (res.ok) {
          const data = await res.json();
          // Filter to only shipments belonging to this transport partner
          // In a real app this should happen on the server side via query params
          const myShipments = Array.isArray(data) 
            ? data.filter(s => s.partnerId === partnerId || (s.carrier && s.carrier.includes(partnerId)))
            : [];
          setShipments(myShipments);
        }
      } catch (err) {
        console.error('Failed to fetch shipments', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [partnerId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center text-emerald-500 gap-4 mt-32">
      <Truck className="w-12 h-12 animate-pulse" />
      <p className="text-xs font-black tracking-widest uppercase opacity-60">Loading Assigned Shipments...</p>
    </div>
  );

  return (
    <div className="p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-900/50">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Driver Portal</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Transport Fleet Gateway</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Active Route Assignments
          </h2>

          <div className="space-y-4">
            {shipments.length > 0 ? shipments.map((sh, idx) => (
              <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{sh.shipmentId || sh.id}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {sh.destination?.location || sh.targetWarehouseId || 'Unknown Destination'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Status</p>
                    <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold uppercase">
                      {sh.status}
                    </span>
                  </div>
                  
                  <Link 
                    href={`/driver/${sh.shipmentId || sh._id || sh.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors w-full md:w-auto justify-center"
                  >
                    Open Dispatch PWA
                    <Navigation className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )) : (
              <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-xl">
                <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No assigned routes at this time</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
