'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, ArrowUpRight } from 'lucide-react';

interface TickerEvent {
  id: string;
  shipmentId: string;
  originName: string;
  destinationName: string;
  risk: number;
  delta: string;
  time: string;
  highRisk: boolean;
}

// Resolve a warehouseId to a human-readable name from a name map
const resolveEndpointName = (endpoint: any, warehouseNames: Record<string, string>): string => {
  if (!endpoint) return 'Unknown';
  const warehouseId = endpoint.warehouseId;
  if (warehouseId && warehouseNames[warehouseId]) return warehouseNames[warehouseId];
  if (endpoint.address) return String(endpoint.address).split(',')[0];
  if (endpoint.vendorId) return `Vendor-${String(endpoint.vendorId).slice(0, 6)}`;
  return 'Unknown';
};

export default function LiveRiskTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  // Cache warehouse names to avoid re-fetching
  const [warehouseNames, setWarehouseNames] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch warehouse name cache once
    const loadWarehouseNames = async () => {
      try {
        const res = await fetch('/api/warehouses');
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        (Array.isArray(data) ? data : []).forEach((wh: any) => {
          const id = wh.id || wh._id;
          const name = wh.name || wh.code || id;
          if (id) map[id] = name;
        });
        setWarehouseNames(map);
      } catch {
        // Fail silently — ticker still shows partial info
      }
    };
    loadWarehouseNames();
  }, []);

  useEffect(() => {
    const fetchRiskEvents = async () => {
      try {
        const res = await fetch('/api/shipments?status=IN_TRANSIT');
        if (!res.ok) return;
        const data = await res.json();

        // SPEC: Format per row: SHP-ID | Origin → Dest | Score | Δ from last | time ago
        const mapped: TickerEvent[] = (Array.isArray(data) ? data : []).map((sh: any) => {
          const history = Array.isArray(sh.riskHistory) ? sh.riskHistory : [];
          const prevScore = history.length > 1 ? Number(history[history.length - 2]?.score ?? 0) : 0;
          const currentScore = Number(sh.riskScore ?? 0);
          const delta = currentScore - prevScore;

          return {
            id: sh.id || sh._id,
            shipmentId: sh.shipmentId || sh.id || sh._id,
            originName: resolveEndpointName(sh.origin, warehouseNames),
            destinationName: resolveEndpointName(sh.destination, warehouseNames),
            risk: currentScore,
            delta: delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0',
            time: sh.updatedAt
              ? new Date(sh.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Now',
            highRisk: currentScore >= 65
          };
        });
        setEvents(mapped);
      } catch (err: any) {
        console.error('Ticker fetch failed', err);
      }
    };

    fetchRiskEvents();
    const interval = setInterval(fetchRiskEvents, 30000); // SPEC: Poll every 30 seconds
    return () => clearInterval(interval);
  }, [warehouseNames]);

  return (
    <div className="w-full bg-black/90 backdrop-blur-xl text-white border-b border-white/5 flex items-center overflow-hidden h-12 px-6 text-xs relative shadow-2xl">
      <div className="font-black flex items-center gap-2 mr-10 text-blue-500 shrink-0 tracking-widest border-r border-white/10 pr-6 h-full">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
        SCM INTELLIGENCE TICKER
      </div>

      <div className="flex-1 overflow-hidden relative h-full">
        <div className="absolute whitespace-nowrap flex items-center h-full gap-12 animate-marquee">
          {events.length > 0 ? events.map((ev, idx) => (
            <div key={idx} className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors">
              <span className="font-black text-slate-100">{ev.shipmentId}</span>
              <span className="text-slate-500 font-medium">
                {ev.originName}
                <ArrowRight className="w-3 h-3 inline mx-1 opacity-50" />
                {ev.destinationName}
              </span>
              <div className={`flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${
                ev.highRisk ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {ev.highRisk ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                {ev.risk}% RISK
              </div>
              <span className={`text-[10px] font-bold ${
                ev.delta.startsWith('+') ? 'text-red-400' : ev.delta === '0' ? 'text-slate-500' : 'text-emerald-400'
              }`}>
                {ev.delta !== '0' && (ev.delta.startsWith('+')
                  ? <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
                  : <ArrowRight className="w-3 h-3 inline mr-0.5 rotate-45" />)}
                {ev.delta !== '0' ? ev.delta : 'STABLE'}
              </span>
              <span className="text-[10px] text-slate-600 font-mono">{ev.time}</span>
            </div>
          )) : (
            <div className="text-slate-500 italic tracking-wider">ESTABLISHING SECURE CONNECTION TO LOGISTICS NETWORK...</div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(20%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}
