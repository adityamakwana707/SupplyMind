# Hackathon Pitch Protocol — SupplyMind v3

This protocol details how to execute a high-impact, 3-minute demo of SupplyMind v3 using the built-in "God Mode" demo orchestration tools.

---

## 🎭 The 3-Minute Demo Flow

### Scene 1: The Status Quo (0:00 - 0:45)
1.  **Dashboard**: Start on the **Executive Dashboard**. 
2.  **Highlight**: Point out the **Revenue at Risk ($)** and **Vendor Diversification** metrics.
3.  **Control Tower**: Switch to the map and show the network in a "Healthy" state (Green).

### Scene 2: The Orchestrated Disruption (0:45 - 2:00)
1.  **Director Mode**: Open the secret `/admin/demo` panel (The "God Mode" Controller).
2.  **The Trigger**: Click **"Inject Severe Weather + Traffic"** for the *Lifeline Pharma* shipment.
3.  **The Pulse**: Switch back to the Control Tower. Watch the **Live Risk Ticker** pulse red and the shipment icon transition from green to pulsing orange/red.

### Scene 3: The AI Mitigation (2:00 - 2:40)
1.  **Selection**: Click on the high-risk shipment on the map.
2.  **AI Insight**: Show the **Gemini AI Decision Card**. 
3.  **The Logic**: Explain the **Cascade Simulation**—"AI isn't just rerouting; it's predicting that this delay causes a stockout at our Northern Hub."
4.  **Action**: Hit **Approve Reroute** to show the autonomous status update.

### Scene 4: The Audit Trail (2:40 - 3:00)
1.  **Forensics**: Go to the **Audit Log** (`/dashboard/audit`).
2.  **Transparency**: Show the **Network Flight Recorder** logs proving the autonomous diagnostic steps.
3.  **Closing**: "SupplyMind turns logistics volatility into a strategic enterprise advantage."

---

## 🛠️ Key Demo Endpoints

### 1. `/admin/demo` (Pitch Director)
- **Use Case**: Orchestrate live disruptions for your recording.
- **Controls**: Force high traffic, inject thunderstorms, or simulate driver fatigue.

### 2. `/api/admin/seed-intel` (Provisioning)
- **Use Case**: Reset the demo environment immediately before recording.
- **Result**: Creates the specific "High-Stakes" shipment IDs used in the pitch script.

### 3. `/driver/[USER_ID]` (Pro Dispatch PWA)
- **Use Case**: Show the mobile view on your phone or Chrome DevTools.
- **Feature**: Real-time HOS (Hours of Service) slider and duty status updates.

---

## 💡 Pitching Tips for Google Judges
- **Mention Scale**: "We are using n8n to scale our orchestration across thousands of nodes."
- **Focus on Impact**: "Every 1% improvement in network resilience saves our users millions in capital at risk."
- **Vertex AI callout**: "By migrating to Vertex AI, we've enabled enterprise-grade safety and residency for our logistics intelligence."
