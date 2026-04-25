'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from '@/components/AuthProvider';
import { Warehouse, Calendar, Clock, AlertCircle, CheckCircle, ArrowRight, Truck, Info, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface Slot {
  slotId: string;
  time: string;
  slotTime?: string;
  displayTime: string;
  dockNumber?: number;
  status?: string;
  shipments: any[];
  occupancy: number;
  atCapacity: boolean;
}

interface DockData {
  warehouseName: string;
  capacity: number;
  schedule: Slot[];
}

function DocksClientContent() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<DockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'CONFLICTS'>('TODAY');

  const [rescheduling, setRescheduling] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${id}/dock-schedule`);
      const body = await res.json();
      setData(body);
    } catch (err) {
      console.error('Failed to fetch dock schedule', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (slot: Slot) => {
    setRescheduling(slot.slotId);
    try {
      const nextSlotTime = new Date(parseISO(slot.slotTime || slot.time).getTime() + 45 * 60000).toISOString();
      const res = await fetch(`/api/warehouses/${id}/dock-schedule/${slot.slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotTime: nextSlotTime,
          dockNumber: slot.dockNumber ?? 1,
          status: slot.status ?? 'DELAYED'
        })
      });

      if (res.status === 409) {
        const body = await res.json();
        alert(`Dock conflict with shipment ${body.conflictingShipmentId || 'unknown'} — choose different time or dock number`);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to reschedule dock slot.' }));
        throw new Error(body.error || 'Failed to reschedule dock slot.');
      }

      await fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Dock reschedule failed.');
    } finally {
      setRescheduling(null);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Calculating arrival windows and site capacity...</div>;
  if (!data) return <div className="p-12 text-center text-destructive font-bold bg-destructive/10 rounded-xl">Failed to load dock intelligence.</div>;

  const filteredSlots = data.schedule.filter(slot => {
     if (filter === 'CONFLICTS') return slot.atCapacity;
     if (filter === 'TODAY') return isToday(parseISO(slot.time));
     return true;
  });

  const slotsWithActivity = filteredSlots.filter(s => s.shipments.length > 0 || filter === 'ALL');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
           onClick={() => router.back()}
           className="p-2 hover:bg-muted rounded-full transition-all hover:scale-110"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Warehouse className="text-primary w-8 h-8" />
            Dock Intelligence: {data.warehouseName}
          </h1>
          <p className="text-muted-foreground mt-1">
             Site Capacity: <span className="text-foreground font-bold">{data.capacity} Docks</span> available per hour.
          </p>
        </div>
      </div>

      <div className="flex gap-2 bg-muted/30 p-1.5 rounded-xl w-fit border border-white/5 backdrop-blur-sm">
        {(['TODAY', 'CONFLICTS', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
              filter === f 
                ? 'bg-background text-primary shadow-lg border border-white/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {f === 'CONFLICTS' ? 'Alerts Only' : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {slotsWithActivity.length > 0 ? slotsWithActivity.map((slot, idx) => (
          <div key={idx} className={`relative group bg-card/60 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 border-white/5 hover:border-white/20 hover:shadow-xl ${
            slot.atCapacity ? 'bg-red-500/10 ring-1 ring-red-500/30 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : ''
          }`}>
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div className="text-center min-w-[80px] bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{format(parseISO(slot.time), 'EEE')}</div>
                      <div className="text-2xl font-black text-foreground">{format(parseISO(slot.time), 'HH:00')}</div>
                   </div>
                   
                   <div className="h-12 w-px bg-white/10 hidden md:block" />

                   <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          slot.atCapacity 
                            ? 'bg-red-500 text-white border-red-400' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {slot.occupancy} / {data.capacity} Docks Occupied
                        </span>
                        {slot.atCapacity && (
                           <div className="flex items-center gap-1.5 text-red-500 text-xs font-black animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              CAPACITY CONFLICT DETECTED
                           </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                         {slot.shipments.map((sh: any) => (
                           <div key={sh.id} className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                              <Truck className={`w-3.5 h-3.5 ${sh.riskScore >= 65 ? 'text-red-400' : 'text-slate-400'}`} />
                              <span className="text-xs font-mono font-bold text-foreground">{sh.id}</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${sh.riskScore >= 65 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`} />
                           </div>
                         ))}
                         {slot.shipments.length === 0 && (
                           <span className="text-sm text-muted-foreground/30 italic">No scheduled arrivals</span>
                         )}
                      </div>
                   </div>
                </div>

                <div className="md:text-right">
                   {slot.atCapacity ? (
                     <button 
                        onClick={() => handleReschedule(slot)}
                        disabled={rescheduling === slot.slotId}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-black rounded-lg transition-all flex items-center gap-2 ml-auto border border-red-500/30 group disabled:opacity-50"
                     >
                        {rescheduling === slot.slotId ? 'REBALANCING CONFLICT...' : 'RESCHEDULE PRIORITY LOAD'}
                        {rescheduling !== slot.slotId && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />}
                     </button>
                   ) : (
                     <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 justify-end">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Optimal Utilization
                     </div>
                   )}
                </div>
             </div>
          </div>
        )) : (
          <div className="p-20 text-center bg-muted/5 border border-dashed border-white/10 rounded-3xl backdrop-blur-sm">
             <Info className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
             <p className="text-muted-foreground font-medium text-lg">No dock activity predicted for this time window.</p>
             <p className="text-sm text-muted-foreground/60 mt-2">Active pipeline is currently clear for this site.</p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl flex items-start gap-4 shadow-xl">
         <AlertTriangle className="text-primary w-8 h-8 shrink-0 mt-0.5" />
         <div>
            <h4 className="font-black text-primary mb-1 uppercase tracking-wider text-sm">SupplyMind AI Prediction Engine</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
               The intelligence engine is actively monitoring high-risk arrivals (indicated by red status markers). If an incoming shipment is delayed due to weather, customs, or traffic, 
               our model will automatically re-sequence dock slots to ensure the fastest unloading of medical supplies with the highest criticality indices first.
            </p>
         </div>
      </div>
    </div>
  );
}

export default function DocksClient() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-muted-foreground animate-pulse italic font-medium">Synchronizing Warehouse Dock Capacity Data...</div>}>
      <DocksClientContent />
    </Suspense>
  );
}
