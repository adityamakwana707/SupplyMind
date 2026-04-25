'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from '@/components/AuthProvider';
import { ShieldAlert, Globe, Anchor, Clock, AlertTriangle, CheckCircle, Ship, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Shipment {
  id: string;
  origin: { warehouseId: string; name: string };
  destination: { warehouseId: string; name: string };
  status: string;
  type: string;
  riskScore: number;
  customsStatus?: string;
  customsPort?: string;
  lastCustomsEventAt?: string;
}

function CustomsClientContent() {
  const { data: session } = useSession();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipments?type=INTERNATIONAL');
      const data = await res.json();
      setShipments(data);
    } catch (err: any) {
      console.error('Failed to fetch shipments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleLogEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedShipment) return;

    setLogging(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      event: formData.get('event'),
      port: formData.get('port'),
      severity: formData.get('severity'),
      triggerCascade: formData.get('triggerCascade') === 'on'
    };

    try {
      const res = await fetch(`/api/shipments/${selectedShipment.id}/customs-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Customs event logged and AI Risk Model updated.' });
        setSelectedShipment(null);
        fetchShipments();
        setTimeout(() => setMessage(null), 5000);
      } else {
        throw new Error('Failed to log event');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLogging(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Initializing Customs Data Stream...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Globe className="text-blue-500 w-8 h-8" />
            Customs Control Center
          </h1>
          <p className="text-muted-foreground mt-1">Cross-border logistics monitoring and regulatory hold management.</p>
        </div>
        <button 
           onClick={fetchShipments}
           className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-white/10 hover:bg-muted/50 transition-all font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Ship className="text-blue-400" />
                Active International Pipeline
              </h2>
            </div>
            
            <div className="divide-y divide-white/5">
              {shipments.length > 0 ? shipments.map((sh) => (
                <div key={sh.id} className="p-6 hover:bg-white/5 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm font-mono text-blue-400 mb-1">{sh.id}</div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        {sh.origin.warehouseId} 
                        <span className="text-muted-foreground font-light text-base">→</span> 
                        {sh.destination.warehouseId}
                      </h3>
                    </div>
                    <div className="text-right">
                       <div className={`text-xs font-black px-2 py-1 rounded border mb-2 uppercase inline-block ${
                         sh.status === 'HELD_IN_CUSTOMS' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                       }`}>
                         {sh.status.replace(/_/g, ' ')}
                       </div>
                       <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                         <Clock className="w-3 h-3" />
                         {sh.lastCustomsEventAt ? new Date(sh.lastCustomsEventAt).toLocaleString() : 'No recent events'}
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">Risk Score</div>
                      <div className={`text-xl font-black ${sh.riskScore >= 65 ? 'text-red-400' : 'text-emerald-400'}`}>
                         {sh.riskScore}%
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">Current Port</div>
                      <div className="text-lg font-bold text-slate-200">
                         {sh.customsPort || 'At Sea'}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">Last Event</div>
                      <div className="text-lg font-medium text-slate-300 truncate font-mono">
                         {sh.customsStatus || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedShipment(sh)}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20"
                  >
                    <Anchor className="w-4 h-4" />
                    Log Customs Event
                  </button>
                </div>
              )) : (
                <div className="p-12 text-center text-muted-foreground italic">
                   No international shipments currently in transit.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <AnimatePresence mode="wait">
             {selectedShipment ? (
               <motion.div 
                 key="form"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="bg-card border border-white/10 rounded-2xl p-6 shadow-2xl h-fit sticky top-6"
               >
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <ShieldAlert className="text-red-400" />
                      Log Event
                    </h2>
                    <button onClick={() => setSelectedShipment(null)} className="text-muted-foreground hover:text-white p-1">✕</button>
                 </div>

                 <p className="text-xs text-muted-foreground mb-6 bg-white/5 p-3 rounded-lg leading-relaxed border border-white/5">
                   Logging an event for <span className="text-blue-400 font-mono font-bold">{selectedShipment.id}</span> will update the real-time AI risk profiles.
                 </p>

                 <form onSubmit={handleLogEvent} className="space-y-4">
                   <div>
                     <label className="block text-xs font-black text-muted-foreground uppercase mb-2 tracking-wider">Event Type</label>
                     <select name="event" required className="w-full bg-background border border-white/10 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                       <option value="Doc Audit - High Priority">Doc Audit - High Priority</option>
                       <option value="Physical Inspection Hold">Physical Inspection Hold</option>
                       <option value="Quarantine - Biosecurity">Quarantine - Biosecurity</option>
                       <option value="Port Congestion Delay">Port Congestion Delay</option>
                       <option value="Manifest Discrepancy">Manifest Discrepancy</option>
                       <option value="Cleared for Final Departure">Cleared for Final Departure</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-black text-muted-foreground uppercase mb-2 tracking-wider">Port / Checkpoint</label>
                     <input name="port" type="text" placeholder="e.g. Dubai Jebel Ali, Port of Singapore" required className="w-full bg-background border border-white/10 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                   </div>

                   <div>
                     <label className="block text-xs font-black text-muted-foreground uppercase mb-2 tracking-wider">Impact Severity</label>
                     <div className="grid grid-cols-3 gap-2">
                       {['LOW', 'MED', 'HIGH'].map(sev => (
                         <label key={sev} className="relative cursor-pointer group">
                           <input type="radio" name="severity" value={sev} defaultChecked={sev === 'MED'} className="peer sr-only" />
                           <div className={`py-2 text-center rounded-lg border border-white/10 transition-all peer-checked:bg-blue-500 peer-checked:border-blue-500 text-xs font-bold text-muted-foreground peer-checked:text-white group-hover:bg-white/5`}>
                             {sev}
                           </div>
                         </label>
                       ))}
                     </div>
                   </div>

                   <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <input type="checkbox" name="triggerCascade" id="triggerCascade" className="w-4 h-4 accent-blue-500 rounded" defaultChecked />
                      <label htmlFor="triggerCascade" className="text-[11px] font-medium text-slate-300 leading-tight">
                        Trigger AI Cascade Simulation immediately for predictive mitigation
                      </label>
                   </div>

                   <button 
                     type="submit" 
                     disabled={logging}
                     className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 active:scale-[0.98]"
                   >
                     {logging ? 'CALCULATING LLM IMPACT...' : 'COMMIT LOG & BROADCAST'}
                   </button>
                 </form>
               </motion.div>
             ) : (
               <motion.div 
                 key="empty"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="bg-card/30 border border-white/5 rounded-2xl p-12 text-center border-dashed"
               >
                 <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                 <p className="text-muted-foreground text-sm font-medium">Select a shipment to log a regulatory or customs event.</p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function CustomsClient() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground animate-pulse font-medium italic">Streaming Regulatory Data Intelligence...</div>}>
      <CustomsClientContent />
    </Suspense>
  );
}
