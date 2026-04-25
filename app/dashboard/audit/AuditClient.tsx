'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  Cpu, 
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SCANS' | 'DECISIONS'>('DECISIONS');

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const [lRes, dRes] = await Promise.all([
          fetch('/api/admin/audit-logs'), // We'll need this endpoint
          fetch('/api/decisions')
        ]);
        
        if (lRes.ok) setLogs(await lRes.json());
        if (dRes.ok) setDecisions(await dRes.json());
      } catch (err: any) {
        console.error('Audit fetch failed', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Terminal className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Network Flight Recorder</span>
           </div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">System Audit Trail</h1>
           <p className="text-sm text-muted-foreground max-w-md mt-2">
             Chronological log of all autonomous risk assessments and AI-driven mitigation interventions.
           </p>
        </div>
        
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
           <button 
             onClick={() => setActiveTab('DECISIONS')}
             className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'DECISIONS' ? 'bg-background shadow-lg text-foreground' : 'text-muted-foreground'}`}
           >
             AI DECISIONS
           </button>
           <button 
             onClick={() => setActiveTab('SCANS')}
             className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'SCANS' ? 'bg-background shadow-lg text-foreground' : 'text-muted-foreground'}`}
           >
             NETWORK SCANS
           </button>
        </div>
      </header>

      <main className="bg-card/30 backdrop-blur-3xl border border-black/5 dark:border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
           <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <History className="w-4 h-4" />
              {activeTab === 'DECISIONS' ? `${decisions.length} Historical Interventions` : `${logs.length} Diagnostic Cycles`}
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search audit trail..."
                className="bg-background/50 border border-border rounded-lg pl-10 pr-4 py-2 text-xs focus:ring-2 ring-blue-500/20 outline-none w-64"
              />
           </div>
        </div>

        <div className="divide-y divide-border">
          <AnimatePresence mode="wait">
            {activeTab === 'DECISIONS' ? (
              <motion.div 
                key="decisions"
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left">
                   <thead className="bg-muted/30 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      <tr>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Shipment</th>
                         <th className="px-6 py-4">Intervention Type</th>
                         <th className="px-6 py-4">Impact Score</th>
                         <th className="px-6 py-4 text-right">Timestamp</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {decisions.map((dec, idx) => (
                        <tr key={idx} className="group hover:bg-blue-500/[0.02] transition-colors cursor-pointer">
                           <td className="px-6 py-5">
                              <div className={`flex items-center gap-2 w-fit px-2 py-1 rounded-md text-[10px] font-bold border ${
                                dec.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              }`}>
                                 {dec.status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                 {dec.status}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-foreground">{dec.shipmentId}</span>
                                 <span className="text-[10px] text-muted-foreground uppercase">{dec.vendorName || 'Global Pharma'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                 <Cpu className="w-4 h-4 text-blue-500" />
                                 <span className="text-sm font-medium">{dec.approvedOption?.type || 'PENDING EVALUATION'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                 <div className="flex-1 w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${dec.riskScore}%` }} />
                                 </div>
                                 <span className="text-xs font-black text-foreground">{dec.riskScore}%</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-right font-mono text-[10px] text-muted-foreground">
                              {new Date(dec.createdAt).toLocaleString()}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, x: 10 }} 
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 grid grid-cols-1 gap-4"
              >
                {logs.map((log, idx) => (
                  <div key={idx} className="bg-muted/20 border border-border rounded-2xl p-6 flex items-start gap-6 hover:border-blue-500/30 transition-all">
                     <div className={`p-3 rounded-xl ${log.status === 'SUCCESS' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                        {log.status === 'SUCCESS' ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="text-sm font-black uppercase tracking-widest text-foreground">{log.type}</h4>
                           <span className="text-[10px] font-mono text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Status</p>
                              <p className="text-xs font-bold text-blue-400">{log.status}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Nodes Analyzed</p>
                              <p className="text-xs font-bold text-foreground">{(log.results || []).length} Shipments</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">High Risk Detected</p>
                              <p className="text-xs font-bold text-red-500">{(log.results || []).filter((r: any) => r.riskScore >= 65).length}</p>
                           </div>
                           <div className="flex items-end justify-end">
                              <button className="text-[10px] font-black text-blue-500 hover:underline flex items-center gap-1">
                                 VIEW DIAGNOSTIC DATA <ExternalLink className="w-3 h-3" />
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
