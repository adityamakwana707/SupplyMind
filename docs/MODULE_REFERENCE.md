# Module Reference — SupplyMind v3

This guide provides a functional breakdown of the SupplyMind v3 ecosystem, combining the original high-performance inventory modules with the new predictive intelligence portals.

---

## 🏭 1. Multi-Warehouse Inventory (Core)
The foundation of the platform—designed for high-volume warehouse operations.

### 📦 Product Management
- **ABC Classification**: Automatic categorization of products by value and turnover.
- **Unit Tracking**: Flexible unit management (Kg, Units, Pallets).
- **Global Catalog**: Single source of truth for SKUs across all facilities.

### 🔄 Inventory Workflows
- **Receipts**: Validated inbound stock entry with batch processing.
- **Deliveries**: Outbound fulfillments with stock check validation.
- **Internal Requisitions**: Cross-department requests for inventory usage.
- **Inter-Warehouse Transfers**: Trackable logistics movement between nodes.
- **Adjustments**: Forensic stock corrections with reason-coding and audit logs.

---

## 🧠 2. Logistics Intelligence (SupplyMind)
The AI layer designed to turn supply chain volatility into a strategic edge.

### 🗼 Control Tower Dashboard
- **Live Transit Visuals**: Real-time map view of all active shipments.
- **Impact Quantification**: Quantification of **Revenue at Risk ($)** and **Impacted Orders**.
- **Disruption Ticker**: A scrolling live feed of autonomous network diagnostics.

### 🔬 The Risk & Cascade Engines
- **Multifaceted Risk Scoring**: A 100-point index combining Traffic, Weather, Vendor Reliability, and Driver HOS.
- **Cascade Simulation**: Predictive analysis that calculates how a delay in one shipment will deplete stock at the destination warehouse and jeopardize pending orders.

### 🛠️ Decision Center
- **AI Decision Cards**: Vertex AI generated mitigation strategies (Reroute, Buffer Stocking, Backup Sourcing).
- **Actionable Execution**: One-click approval of AI recommendations.

---

## 📱 3. Edge Telemetry (Field Ops)

### 🚚 Driver Pro PWA
- **GPS Tracking**: Continuous location broadcasting for the Control Tower.
- **Duty Status (HOS)**: Hours of Service tracking to prevent driver fatigue-related risks.
- **Ping Status**: Automatic connectivity monitoring to detect "Blind Spot" risks.

### 🏬 Warehouse Portal
- **Location Hierarchy**: Granular tracking down to specific docks and racks.
- **Active Operations**: Streamlined view for receipt and delivery operators.

---

## 📊 4. Network Flight Recorder (Audit)
- **Chronological Logs**: Immutable records of every autonomous logic scan.
- **AI Diagnostic Trace**: Full visibility into the prompts and data inputs that led to an AI recommendation.
- **Stakeholder Transparency**: Provides "Why" behind every system-driven reroute.
