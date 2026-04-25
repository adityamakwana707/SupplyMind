# Product Requirements Document — SupplyMind

### AI-Powered Supply Chain Intelligence Platform

**Version:** 3.0  
**Built on:** StockMaster v2.0 (base inventory layer)  
**Tech Stack:** Next.js (App Router), NextAuth, Node.js API Routes, Firebase Firestore, Tailwind CSS, Google Maps API, OpenWeatherMap API  
**Prepared by:** Aditya Makwana  
**Hackathon:** Google Build with AI — Solution Challenge 2026  
**Problem Statement Track:** Smart Supply Chains — Resilient Logistics and Dynamic Supply Chain Optimization  
**Date:** April 2026

\---

## 1\. Introduction

### 1.1 Product Overview

SupplyMind is a multi-tenant B2B SaaS platform that transforms the existing StockMaster inventory management system into an AI-powered supply chain intelligence control tower.

StockMaster v2.0 provides the operational data backbone: warehouses, stock levels, receipts, deliveries, transfers, and the stock movement ledger. SupplyMind v3.0 adds five intelligence layers on top of this backbone:

1. **Shipment Layer** — first-class entity tracking goods in physical transit
2. **Live Tracking Layer** — real-time GPS from transport partners feeding every active shipment
3. **Risk Engine** — continuously scores every active shipment every 15 minutes from five data sources
4. **Cascade Simulation Engine** — traces downstream impact of any disruption across the supply network
5. **Decision + Execution Engine** — generates ranked resolution options and executes approved actions automatically

The combined system satisfies the hackathon problem statement directly:

* **Continuous analysis** — 15-minute cron risk scan per active shipment, auto-refreshing live
* **Multifaceted transit data** — Google Maps traffic, OpenWeatherMap, driver GPS, vendor status, customs events
* **Preemptive detection** — triggers at risk score ≥ 65, typically 2–8 hours before actual delay
* **Dynamic execution** — reroute computed live via Maps API at moment of action, not at shipment creation
* **Cascade prevention** — graph traversal from delayed shipment to affected orders to revenue impact

### 1.2 What Is Preserved from StockMaster v2.0

All existing functionality is preserved and extended, not replaced:

|StockMaster Module|Status in v3.0|
|-|-|
|Auth + roles (Admin, Manager, Operator)|Preserved + new roles added|
|Dashboard KPIs|Preserved + new transit KPIs added|
|Warehouses + Locations|Preserved|
|Products + Stock Levels|Preserved|
|Receipts (incoming)|Preserved + linked to Shipment entity|
|Deliveries (outgoing)|Preserved + linked to Shipment entity|
|Requisitions|Preserved + auto-triggers Transfer + Shipment|
|Internal Transfers|Preserved + dispatching creates Shipment|
|Stock Adjustments|Preserved|
|Stock Movement Ledger|Preserved + extended|
|Low Stock Alerts|Preserved + now cascade-aware|
|Slow/Dead Stock|Preserved|
|ABC Classification|Preserved|

### 1.3 New Capabilities in v3.0

* Shipment entity with live GPS tracking (driver PWA)
* 5-source risk scoring engine running continuously
* Probabilistic ETA (point estimate + confidence distribution)
* Cascade simulation: delay → stock impact → order failures → revenue at risk
* Decision engine: reroute / redistribute / backup supplier / gig transport
* One-click execution: manager approves → system acts on all downstream systems
* Transport partner management: tied partners + gig marketplace
* Vendor reliability score: auto-computed from receipt history
* Warehouse dock scheduling: auto-managed arrival windows
* Customs event logging: triggers cascade + backup sourcing
* Audit trail: every risk event, decision, and execution logged

\---

## 2\. User Roles

### 2.1 Role Map

|Role|Who They Are|Primary Interface|
|-|-|-|
|**SCM Head / Admin**|Business owner, CXO, or operations head|Control tower dashboard — full network view, decision cards, P\&L impact|
|**Warehouse Manager**|Site manager for a single warehouse|Warehouse dashboard — dock schedule, staff, stock health, requisition approvals|
|**Warehouse Operator**|Floor staff doing physical work|Mobile PWA — task queue, receipt validation, adjustments, QR check-in|
|**Vendor / Supplier**|External supplier who provides goods|Vendor portal — own POs only, reliability score, shipment update|
|**Transport Partner**|Truck driver, fleet owner, or logistics company|Driver PWA — job offers, navigation, status updates, HOS tracking|

### 2.2 Role Permissions Matrix

|Feature|SCM Head|WH Manager|WH Operator|Vendor|Transport Partner|
|-|-|-|-|-|-|
|Control tower map|✅|❌|❌|❌|❌|
|Risk event decision cards|✅|Read-only|❌|❌|❌|
|Cascade simulation view|✅|Own WH only|❌|❌|❌|
|Approve decisions|✅|❌|❌|❌|❌|
|Warehouse dashboard|✅|✅|❌|❌|❌|
|Dock schedule|✅|✅|Read-only|❌|❌|
|Task queue|❌|✅|✅|❌|❌|
|Validate receipts|✅|✅|✅|❌|❌|
|Stock adjustments|✅|✅|✅|❌|❌|
|Vendor portal|❌|❌|❌|✅ (own only)|❌|
|Driver app|❌|❌|❌|❌|✅|
|User management|✅|❌|❌|❌|❌|
|Warehouse/location config|✅|❌|❌|❌|❌|
|Product management|✅|✅|❌|❌|❌|
|Requisitions (create)|✅|✅|✅|❌|❌|
|Requisitions (approve)|✅|✅|❌|❌|❌|

\---

## 3\. Tech Stack and Architecture

### 3.1 Frontend

* **Next.js 14** (App Router) — existing pages preserved, new pages added
* **Tailwind CSS** — existing styling preserved
* **Google Maps JavaScript API** — control tower map, driver navigation, live shipment dots
* **WebSocket (via Socket.io or Next.js server actions)** — live risk ticker, driver location push

### 3.2 Backend

* **Next.js API Routes** (Node.js) — all existing endpoints preserved
* **New API surface** described in Section 7

### 3.3 Authentication

* **NextAuth** — preserved
* Existing roles extended with new role values: `'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VENDOR' | 'TRANSPORT'`
* Vendor JWT contains `vendorId` — all vendor queries auto-scoped server-side
* Transport partner JWT contains `partnerId`

### 3.4 Database — Firebase Firestore

All existing collections preserved. New collections added:

**New collections:**

* `shipments`
* `locationPings`
* `riskEvents`
* `decisionCards`
* `transportPartners`
* `dockSchedules`
* `customsEvents`
* `gigJobs`

Full schema in Section 6.

### 3.5 External APIs

|API|Purpose|Tier|
|-|-|-|
|Google Maps Directions API|Alternate route computation at reroute moment|Free tier (demo)|
|Google Maps Distance Matrix API|ETA computation from live driver position|Free tier (demo)|
|Google Maps JavaScript API|Control tower map, driver navigation|Free tier (demo)|
|OpenWeatherMap Current Weather API|Weather severity at route midpoint|Free tier|
|Driver PWA Geolocation API|Browser GPS — no native app required|Browser built-in|

### 3.6 Background Processing

* **`node-cron`** — 15-minute risk scan job per active shipment
* Runs server-side, initiated on app start
* Each scan: fetch latest GPS ping → call Maps Distance Matrix → call OpenWeatherMap → compute risk score → if score ≥ 65, fire cascade engine → if cascade engine produces impact, write decision card

\---

## 4\. Core Intelligence Features (New in v3.0)

### 4.1 Shipment Entity

A Shipment is a first-class entity representing a physical movement of goods. Every Receipt, Delivery, and Transfer that involves physical transport is backed by a Shipment.

**FR-4.1.1 — Create Shipment**  
Triggered automatically when:

* A Transfer is dispatched (`status: IN\_TRANSIT`)
* A Receipt is created with an external supplier (not internal transfer)
* A Delivery is dispatched to an external location

Fields:

```
shipmentId        (auto)
businessId        (tenant)
type              INBOUND | OUTBOUND | TRANSFER
linkedDocumentId  receiptId | deliveryId | transferId
linkedDocumentType
origin            { warehouseId | vendorId | address }
destination       { warehouseId | address }
transportPartnerId
vehicleType       TRUCK | FERRY | AIR | RAIL
routeGeometry     \[{ lat, lng }]  — from Maps Directions at dispatch
currentLat
currentLng
currentSpeed
heading
status            PENDING | DISPATCHED | IN\_TRANSIT | DELIVERED | DELAYED | CANCELLED
eta               Date
etaConfidence     { p75: Date, p95: Date }
riskScore         Number (0–100)
riskHistory       \[{ score, timestamp }]
createdAt
updatedAt
```

**FR-4.1.2 — Shipment Status Flow**

```
PENDING → DISPATCHED → IN\_TRANSIT → DELIVERED
                    ↘ DELAYED (risk-driven flag, does not block flow)
```

**FR-4.1.3 — Link to Existing Documents**  
All existing receipt, delivery, and transfer records gain an optional `shipmentId` field. Existing functionality is unaffected if `shipmentId` is null.

\---

### 4.2 Live GPS Tracking

**FR-4.2.1 — Driver Location Ping**  
Driver opens `yourapp.com/driver/:shipmentId?token=JWT` on mobile browser.  
Page requests GPS permission and pings every 30 seconds:

```
POST /api/shipments/:id/location
Body: { lat, lng, speed, heading, timestamp }
```

Server receives ping, writes to `locationPings` collection, recomputes ETA via Maps Distance Matrix API, updates `shipments.currentLat/Lng/eta`.

**FR-4.2.2 — Control Tower Map**  
SCM Head dashboard shows Google Maps embed with:

* One dot per active shipment
* Dot color: green (risk < 40), amber (40–64), red (≥ 65)
* Click dot → shipment detail panel slides in
* Live update every 30 seconds without page reload (polling or WebSocket)

**FR-4.2.3 — Risk Ticker**  
Persistent component on SCM Head dashboard. Shows last 5 risk score updates across all shipments, auto-refreshing every 30 seconds with no user interaction. This proves "continuous analysis" visually during the demo.

Format per row:

```
SHP-4521   Mumbai → Pune   71% risk   ↑ from 54%   2 min ago
SHP-4488   Delhi → Jaipur  28% risk   → stable      8 min ago
```

\---

### 4.3 Risk Engine (Continuous Analysis Core)

This is the engine that satisfies "continuously analyzing multifaceted transit data to preemptively detect."

**FR-4.3.1 — Risk Scan Schedule**  
`node-cron` job runs every 15 minutes. For each shipment with `status: IN\_TRANSIT`:

1. Fetch `locationPings` latest record for this shipment
2. Call Google Maps Distance Matrix API with `departure\_time: Date.now()` (gets live traffic ETA)
3. Call OpenWeatherMap with route midpoint coordinates
4. Read `transportPartners.reliabilityScore` for assigned partner
5. Read `customsEvents` for any open hold on this shipment
6. Compute risk score (formula below)
7. Append to `shipments.riskHistory`
8. If score ≥ 65 AND no open decision card exists → fire cascade engine

**FR-4.3.2 — Risk Score Formula**

```javascript
riskScore = Math.round(
  (trafficDelayMinutes / expectedDurationMinutes \* 100) \* 0.35  +
  (weatherSeverityIndex)                                         \* 0.20  +
  (100 - vendorReliabilityScore)                                 \* 0.25  +
  (customsHoldProbability \* 100)                                 \* 0.15  +
  (driverHOSRiskIndex \* 100)                                     \* 0.05
)
// Clamped 0–100
```

Where:

* `trafficDelayMinutes` = Maps ETA − original planned ETA
* `weatherSeverityIndex` = 0–100 mapped from OpenWeatherMap condition codes
* `vendorReliabilityScore` = 0–100 from vendor history (computed in FR-4.7)
* `customsHoldProbability` = 0–1, set to 0.8 if open customs event exists, else historical rate
* `driverHOSRiskIndex` = 0–1 based on hours driven vs 9-hour legal limit

**FR-4.3.3 — Probabilistic ETA**  
For each shipment, store three ETA values:

* `eta` — point estimate from Maps Distance Matrix
* `etaP75` — eta + (Maps ETA − original ETA) × 0.5 (optimistic buffer)
* `etaP95` — eta + (Maps ETA − original ETA) × 2.0 (pessimistic buffer)

Display to SCM Head as: "ETA 3:45 PM (±30 min)"

**FR-4.3.4 — Preemption Window**  
Risk engine must trigger at score ≥ 65 when shipment is still at least 2 hours from destination. If shipment is within 30 minutes of destination, risk events are informational only — no rerouting offered.

\---

### 4.4 Cascade Simulation Engine

This is the primary differentiator. Satisfies "before localized bottlenecks cascade into broader delays."

**FR-4.4.1 — Trigger**  
Fires automatically when risk engine produces score ≥ 65. Also fireable manually by SCM Head ("Simulate impact" button).

**FR-4.4.2 — Graph Traversal**  
Starting from the at-risk shipment, traverse forward:

```
Step 1: Identify destination warehouse
Step 2: For each product in shipment lines:
  - Project new arrival time = current ETA + delay estimate
  - Compute stockLevel at destination at projected arrival time
    (current stock − expected outflows between now and projected arrival)
  - If projected stock < reorderLevel → flag as "stockout risk"
Step 3: For each flagged product at destination warehouse:
  - Find all pendingDeliveries with lines containing this product
  - Filter deliveries with requiredBy date < projected arrival + 48hr buffer
  - These are "orders at risk"
Step 4: For each order at risk:
  - Sum declared value of affected lines
  - Tag with customer name and delivery deadline
Step 5: Output:
  - affectedWarehouse
  - affectedProducts\[]
  - ordersAtRisk\[] (with id, value, deadline, customer)
  - totalRevenueAtRisk (sum of order values)
  - cascadeDepth (1 = local, 2 = one hop, 3 = two hops)
```

**FR-4.4.3 — Cascade Output Format**  
Must return named orders, not aggregate counts:

```json
{
  "shipmentId": "SHP-4521",
  "triggerRiskScore": 73,
  "delayEstimateHours": 6,
  "affectedWarehouse": "Delhi Central WH",
  "affectedProducts": \[
    { "sku": "MED-089", "name": "Surgical gloves", "currentStock": 40, "projectedOnArrival": 12, "reorderLevel": 50 }
  ],
  "ordersAtRisk": \[
    { "orderId": "DEL-2201", "customer": "Apollo Hospital Delhi", "value": 84000, "deadline": "2026-04-22T18:00:00Z" },
    { "orderId": "DEL-2198", "customer": "Max Healthcare", "value": 62000, "deadline": "2026-04-23T10:00:00Z" }
  ],
  "totalRevenueAtRisk": 146000,
  "cascadeDepth": 1
}
```

**FR-4.4.4 — Cascade Visualization**  
On SCM Head dashboard, cascade result renders as:

* Summary card: "Shipment SHP-4521 → 2 orders at risk → ₹1.46L revenue exposed"
* Expandable order list showing each affected order with deadline and customer
* Stock projection chart: expected stock level over next 72 hours with and without delay

\---

### 4.5 Decision Engine

Satisfies "dynamically execute or recommend highly optimized route adjustments."

**FR-4.5.1 — Decision Card Generation**  
After cascade simulation completes, system writes a `decisionCards` document and surfaces it on the SCM Head dashboard. One card per risk event. A card contains:

* Shipment summary (origin, destination, cargo, current position)
* Risk score and contributing factors (shown as breakdown)
* Cascade impact summary (orders at risk, revenue)
* Ranked resolution options (see FR-4.5.2)
* Status: `PENDING | APPROVED | REJECTED | EXPIRED`
* Expires after 2 hours (risk landscape changes)

**FR-4.5.2 — Resolution Options**  
System computes and ranks up to 4 options per event:

**Option A — Reroute**  
Calls Google Maps Directions API with `departure\_time: Date.now()`, `alternatives: true`.  
Returns up to 3 alternate routes.  
For each: compute new ETA, distance delta, estimated fuel cost delta.  
Display: "Via Thane bypass — saves 2.5 hr, +40 km, +₹800 fuel"

**Option B — Redistribute stock**  
Check all other warehouses for available quantity of affected products.  
If a warehouse has quantity > reorderLevel + requested quantity:  
Create a provisional internal transfer.  
Display: "Pull 60 units from Mumbai WH → covers Delhi until shipment arrives. Transfer lead time: 4 hr."

**Option C — Backup supplier**  
Check vendor list for vendors supplying affected products with reliability score ≥ 70.  
If available: draft a purchase order.  
Display: "Vendor B (reliability 84) can supply 100 units. Estimated delivery: 2 days. Cost premium: ₹12,000."

**Option D — Gig transport**  
If delay is caused by transport partner unavailability:  
Check registered gig transport partners within 100 km of shipment's current position.  
Display: "3 gig partners available within 80 km. Estimated pickup: 45 min."

**FR-4.5.3 — Option Ranking**  
Options ranked by composite score:

```
optionScore = (revenueAtRiskSaved × 0.5) + (timeToResolution × -0.3) + (costPremium × -0.2)
```

Highest score displayed first with "Recommended" badge.

\---

### 4.6 Execution Layer

**FR-4.6.1 — One-Click Approval**  
SCM Head taps "Approve" on any resolution option.  
Single endpoint: `POST /api/decisions/:id/approve?optionType=REROUTE|REDISTRIBUTE|BACKUP|GIG`

Server executes based on option type:

**REROUTE execution:**

```
1. Store new routeGeometry on shipment document
2. Push notification to driver PWA via WebSocket: { type: 'REROUTE', newRoute, newEta }
3. Update dock schedule at destination warehouse (shift arrival window)
4. Update shipment.eta
5. Write audit log entry
```

**REDISTRIBUTE execution:**

```
1. Create Transfer document (sourceWarehouse → destinationWarehouse, affected products)
2. Set transfer status: APPROVED (skip requisition for emergency transfers)
3. Decrement stock at source warehouse
4. Notify warehouse manager at source via in-app notification
5. Write audit log entry
```

**BACKUP SUPPLIER execution:**

```
1. Create Receipt document (draft) with backup vendor and estimated quantities
2. Notify vendor via email (if vendor email stored) or show PO in vendor portal
3. Write audit log entry
```

**GIG execution:**

```
1. Create GigJob document
2. Push notification to matching gig transport partners
3. First acceptance wins job, others receive cancellation
4. Write audit log entry
```

**FR-4.6.2 — Post-Execution State**  
After approval:

* Decision card status → `APPROVED`
* Risk event status → `RESOLVING`
* Risk engine continues monitoring — if risk score drops below 40 after execution, status → `RESOLVED`
* Full audit trail visible to SCM Head

\---

### 4.7 Vendor Reliability Score

**FR-4.7.1 — Score Computation**  
Computed automatically from existing receipt history. Runs as a background job nightly.

```javascript
reliabilityScore = Math.round(
  (onTimeDeliveryRate × 100) \* 0.50 +
  (qualityAcceptanceRate × 100) \* 0.30 +
  (consistencyScore × 100) \* 0.20
)

// onTimeDeliveryRate = receipts where actualDate <= expectedDate / total receipts
// qualityAcceptanceRate = receipts with no adjustment logged within 7 days / total receipts
// consistencyScore = 1 - (stdDev of delay days / mean delivery days), clamped 0–1
```

**FR-4.7.2 — Vendor Portal**  
Vendor sees their own score with a breakdown. Cannot see other vendors. Cannot see business inventory or pricing.

Server-side enforcement: every vendor API route checks `req.user.vendorId` and filters all queries accordingly.

**FR-4.7.3 — Score in Risk Formula**  
`vendorReliabilityScore` feeds directly into the risk formula in FR-4.3.2. A vendor with score 42 automatically elevates the base risk of their shipments by \~14 points before any transit factors are considered.

\---

### 4.8 Transport Partner Management

**FR-4.8.1 — Partner Types**

* **Tied partner** — business has an existing contract. Preferred in all job assignment.
* **Gig partner** — registered on platform, accepts jobs via marketplace.

**FR-4.8.2 — Job Assignment Flow**

```
Shipment created → system finds tied partners meeting criteria
  → if tied partner available → offer job → 10-minute acceptance window
  → if no acceptance → open to gig marketplace within 80 km radius
  → 5-minute acceptance window per partner
  → if no acceptance → expand radius by 40 km, repeat
  → if still no acceptance → alert SCM Head
```

**FR-4.8.3 — Driver HOS Tracking**  
Driver PWA tracks hours since last confirmed rest (set by driver at rest start).  
System computes `hoursRemaining = 9 - hoursDriven`.  
If `hoursRemaining < 2` → flag on risk engine → add HOS risk to risk score.  
If `hoursRemaining < 1` → show alert to driver and SCM Head → suggest rest stop from Maps API.

**FR-4.8.4 — Partner Reliability Score**  
Computed from job history: on-time rate, cargo damage incidents, acceptance rate, HOS compliance. Displayed to SCM Head when assigning jobs.

\---

### 4.9 Warehouse Dock Scheduling

**FR-4.9.1 — Dock Slots**  
Each warehouse has configurable dock capacity: number of simultaneous trucks it can handle.

**FR-4.9.2 — Slot Assignment**  
When a shipment is dispatched toward a warehouse, system checks dock availability at ETA window.  
If conflict (two shipments arrive within 30 minutes of each other and docks are full):  
→ Lower-priority shipment's ETA window pushed by 45 minutes  
→ Transport partner notified via PWA  
→ Warehouse manager sees updated schedule

**FR-4.9.3 — Dock Schedule UI**  
Warehouse Manager dashboard shows today's dock schedule:

* Each slot: shipment ID, cargo type, expected arrival, dock number, status
* Color coded: confirmed (green), ETA shifted (amber), overdue (red)

\---

### 4.10 Customs Event Logging

**FR-4.10.1 — Log Customs Event**  
Any user with MANAGER or ADMIN role can log a customs event against an import shipment:

```
POST /api/shipments/:id/customs-event
Body: { eventType: 'HOLD'|'INSPECTION'|'CLEARED', estimatedDelayHours, portCode, notes }
```

**FR-4.10.2 — Immediate Cascade Trigger**  
On `HOLD` or `INSPECTION` event:

* Set shipment `customsHoldProbability = 0.85`
* Trigger cascade engine immediately (do not wait for next 15-min cron)
* Generate decision card for SCM Head

**FR-4.10.3 — Customs Risk Index per Port**  
Maintain a `customsRiskIndex` per port code, computed from historical hold events at that port. Used in risk formula when no open customs event exists.

\---

## 5\. Preserved StockMaster Features (No Changes Required)

All features from StockMaster v2.0 Section 4 and Section 5 are preserved exactly as specified. The following notes apply:

* **Receipts** gain an optional `shipmentId` field. If `shipmentId` is present, the receipt is linked to a tracked inbound shipment. If null, receipt works exactly as before.
* **Deliveries** gain an optional `shipmentId` field. Same logic.
* **Transfers** gain an optional `shipmentId` field. When a transfer is dispatched to `IN\_TRANSIT`, system auto-creates a shipment if `shipmentId` is not already present.
* **Low Stock Alerts** are now cascade-aware: if a product is flagged low stock AND a shipment carrying that product is at risk, the alert shows "Replenishment shipment at risk — cascade simulation available."
* **Dashboard KPIs** gain three new widgets (see Section 8.1).
* All other StockMaster functionality — stock adjustments, ledger, ABC classification, slow/dead stock, stockout frequency, best source warehouse suggestion — is unchanged.

\---

## 6\. Database Schema — New Collections

### 6.1 `shipments`

```javascript
{
  \_id: ObjectId,
  businessId: ObjectId,        // multi-tenant scoping
  type: 'INBOUND'|'OUTBOUND'|'TRANSFER',
  linkedDocumentId: ObjectId,
  linkedDocumentType: 'RECEIPT'|'DELIVERY'|'TRANSFER',
  origin: {
    type: 'WAREHOUSE'|'VENDOR'|'ADDRESS',
    warehouseId: ObjectId,     // if WAREHOUSE
    vendorId: ObjectId,        // if VENDOR
    address: String            // if ADDRESS
  },
  destination: {
    type: 'WAREHOUSE'|'ADDRESS',
    warehouseId: ObjectId,
    address: String
  },
  transportPartnerId: ObjectId,
  vehicleType: 'TRUCK'|'FERRY'|'AIR'|'RAIL',
  cargo: \[{ productId: ObjectId, quantity: Number }],
  routeGeometry: \[{ lat: Number, lng: Number }],
  currentLat: Number,
  currentLng: Number,
  currentSpeed: Number,
  heading: Number,
  status: 'PENDING'|'DISPATCHED'|'IN\_TRANSIT'|'DELIVERED'|'DELAYED'|'CANCELLED',
  eta: Date,
  etaP75: Date,
  etaP95: Date,
  originalEta: Date,
  riskScore: Number,
  riskHistory: \[{ score: Number, timestamp: Date, factors: Object }],
  customsHoldProbability: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.2 `locationPings`

```javascript
{
  \_id: ObjectId,
  shipmentId: ObjectId,
  transportPartnerId: ObjectId,
  lat: Number,
  lng: Number,
  speed: Number,
  heading: Number,
  timestamp: Date,
  computedEta: Date,
  distanceFromRoute: Number   // meters deviation from planned routeGeometry
}
```

### 6.3 `riskEvents`

```javascript
{
  \_id: ObjectId,
  businessId: ObjectId,
  shipmentId: ObjectId,
  riskScore: Number,
  riskFactors: {
    trafficDelay: Number,      // minutes
    weatherSeverity: Number,   // 0–100
    vendorReliability: Number, // 0–100
    customsFriction: Number,   // 0–100
    driverHOS: Number          // 0–100
  },
  cascadeResult: {
    affectedWarehouseId: ObjectId,
    affectedProducts: Array,
    ordersAtRisk: Array,       // full order objects with id, customer, value, deadline
    totalRevenueAtRisk: Number,
    cascadeDepth: Number
  },
  status: 'OPEN'|'RESOLVING'|'RESOLVED'|'EXPIRED',
  createdAt: Date,
  resolvedAt: Date
}
```

### 6.4 `decisionCards`

```javascript
{
  \_id: ObjectId,
  businessId: ObjectId,
  riskEventId: ObjectId,
  shipmentId: ObjectId,
  options: \[
    {
      type: 'REROUTE'|'REDISTRIBUTE'|'BACKUP\_SUPPLIER'|'GIG\_TRANSPORT',
      label: String,
      summary: String,
      timeSavedMinutes: Number,
      costPremium: Number,
      confidenceScore: Number,
      payload: Object          // route, transferDetails, poDetails, gigJobDetails
    }
  ],
  recommendedOptionIndex: Number,
  status: 'PENDING'|'APPROVED'|'REJECTED'|'EXPIRED',
  approvedBy: ObjectId,
  approvedOptionType: String,
  approvedAt: Date,
  expiresAt: Date,
  createdAt: Date
}
```

### 6.5 `transportPartners`

```javascript
{
  \_id: ObjectId,
  businessId: ObjectId,        // null if gig partner (platform-wide)
  partnerType: 'TIED'|'GIG',
  name: String,
  phone: String,
  vehicleTypes: \['TRUCK'|'FERRY'|'AIR'|'RAIL'],
  vehicleCapacityKg: Number,
  licenseNumber: String,
  currentLat: Number,
  currentLng: Number,
  status: 'AVAILABLE'|'ON\_JOB'|'OFFLINE',
  reliabilityScore: Number,
  hoursLoggedToday: Number,
  lastRestAt: Date,
  createdAt: Date
}
```

### 6.6 `dockSchedules`

```javascript
{
  \_id: ObjectId,
  warehouseId: ObjectId,
  date: Date,
  slots: \[
    {
      slotTime: Date,
      dockNumber: Number,
      shipmentId: ObjectId,
      status: 'SCHEDULED'|'ARRIVED'|'CLEARED'|'DELAYED'
    }
  ]
}
```

### 6.7 `customsEvents`

```javascript
{
  \_id: ObjectId,
  shipmentId: ObjectId,
  portCode: String,
  eventType: 'HOLD'|'INSPECTION'|'CLEARED',
  estimatedDelayHours: Number,
  actualDelayHours: Number,
  notes: String,
  loggedBy: ObjectId,
  loggedAt: Date,
  clearedAt: Date
}
```

### 6.8 `gigJobs`

```javascript
{
  \_id: ObjectId,
  shipmentId: ObjectId,
  businessId: ObjectId,
  jobType: 'TRANSPORT'|'WAREHOUSE\_LABOR',
  status: 'OPEN'|'ACCEPTED'|'IN\_PROGRESS'|'COMPLETED'|'CANCELLED',
  offeredTo: \[ObjectId],       // partners notified
  acceptedBy: ObjectId,
  offerExpiresAt: Date,
  searchRadiusKm: Number,
  estimatedPay: Number,
  createdAt: Date
}
```

\---

## 7\. API Surface — New Endpoints

All existing StockMaster endpoints (`/api/receipts`, `/api/deliveries`, `/api/transfers`, `/api/products`, `/api/warehouses`, `/api/requisitions`, `/api/adjustments`, `/api/stockMovements`) are preserved unchanged.

### 7.1 Shipments

```
POST   /api/shipments                        Create shipment
GET    /api/shipments                        List (filtered by businessId)
GET    /api/shipments/:id                    Detail
PATCH  /api/shipments/:id/status             Update status
POST   /api/shipments/:id/location           Driver GPS ping (transport partner auth)
POST   /api/shipments/:id/customs-event      Log customs event (manager/admin auth)
POST   /api/shipments/:id/reroute            Apply reroute (post-approval)
GET    /api/shipments/:id/cascade            Get cascade simulation result
```

### 7.2 Risk Engine (Internal + Exposed)

```
POST   /api/internal/risk-scan               Triggered by cron (internal only)
GET    /api/risk-events                      List open risk events (SCM head)
GET    /api/risk-events/:id                  Detail with full cascade result
```

### 7.3 Decision Cards

```
GET    /api/decisions/pending                All pending cards for business
GET    /api/decisions/:id                    Card detail with options
POST   /api/decisions/:id/approve            Approve option → execute
POST   /api/decisions/:id/reject             Reject (with reason)
```

### 7.4 Transport Partners

```
POST   /api/transport-partners               Register partner
GET    /api/transport-partners/available     Find available partners near location
POST   /api/transport-partners/:id/status   Update availability status
GET    /api/transport-partners/:id/jobs      Partner's job history
```

### 7.5 Gig Jobs

```
POST   /api/gig-jobs                         Open new gig job
POST   /api/gig-jobs/:id/accept              Partner accepts job
POST   /api/gig-jobs/:id/complete            Mark complete
```

### 7.6 Dock Schedules

```
GET    /api/warehouses/:id/dock-schedule     Today's schedule
POST   /api/warehouses/:id/dock-schedule     Add slot
PATCH  /api/warehouses/:id/dock-schedule/:slotId  Update slot
```

### 7.7 Vendor Portal

```
GET    /api/vendor/purchase-orders           Own POs only (vendor auth)
GET    /api/vendor/reliability-score         Own score + breakdown
PUT    /api/vendor/shipments/:id/status      Update shipment status
```

\---

## 8\. Dashboard Specifications

### 8.1 SCM Head — Control Tower Dashboard

**KPI Row (top of page):**

|Widget|Value|Source|
|-|-|-|
|Active shipments|Count of IN\_TRANSIT shipments|`shipments`|
|At-risk shipments|Count where riskScore ≥ 65|`shipments`|
|Revenue at risk|Sum of open cascade results|`riskEvents`|
|Pending decisions|Count of PENDING decision cards|`decisionCards`|
|On-time rate (30d)|% delivered within original ETA|`shipments`|
|Avg vendor score|Mean reliabilityScore across active vendors|`vendors`|

**Live risk ticker** (auto-refreshes every 30 seconds, no user action):

* Shows last 5 risk score updates across all shipments
* Format: `SHP-ID | Route | Score | Delta | Time ago`

**Control tower map:**

* Google Maps embed
* One dot per IN\_TRANSIT shipment, color-coded by risk score
* Click dot → decision card panel slides in

**Decision cards panel:**

* Cards sorted by revenue at risk (descending)
* Each card: shipment summary, risk breakdown, cascade impact, ranked options
* One-click approve per option

### 8.2 Warehouse Manager Dashboard

**KPI Row:**

|Widget|Value|
|-|-|
|Arriving today|Count of shipments with ETA = today|
|Dock slots free|Configured capacity − scheduled today|
|Low stock items|Existing StockMaster widget|
|Pending approvals|Requisitions awaiting this manager|

**Dock schedule table:** Full day schedule with slot times, shipment IDs, cargo, status  
**Staff panel:** Permanent + gig workers checked in today  
**Stock health:** Existing StockMaster slow/dead stock widget

### 8.3 Warehouse Operator — Mobile PWA

* Task queue: pick, pack, count, validate
* Validate receipt button → POST to existing `/api/receipts/:id/validate`
* QR scanner for gig worker check-in (if also serving gig labor)
* Log adjustment button → existing adjustment form

### 8.4 Vendor Portal

* Open POs list with status and due dates
* Own reliability score with breakdown
* Shipment status update per PO
* Performance trend (last 6 months on-time rate)

### 8.5 Driver PWA

* Current shipment details (cargo, destination, contact)
* Google Maps navigation embed (updates on reroute)
* HOS progress bar (hours remaining today)
* Status buttons: Departed / Arrived at checkpoint / Delivered
* Alert banner for reroute notifications

\---

## 9\. Demo Flow — Optimized for Judges

The demo must be opened already showing an active state. No setup steps during the demo.

**Minute 0–1: Open with disruption in progress**  
Screen shows control tower map with one shipment dot flashing red (risk score 71).  
Risk ticker shows the score climbed from 54 to 71 in the last scan.  
Say: "This is happening right now. SupplyMind just detected a disruption forming."

**Minute 1–2: Cascade simulation**  
Click the red dot. Decision card opens.  
Show cascade output: 2 named orders at risk, ₹1.46L revenue exposed, specific deadlines.  
Say: "The system didn't just detect a delay. It traced exactly what breaks downstream."

**Minute 2–3: Resolution options**  
Show ranked options: reroute (recommended), redistribute, backup supplier.  
Show reroute option: "Via Thane bypass — saves 2.5 hr, +40 km."  
Say: "Three options, ranked by impact. One tap to execute."

**Minute 3–4: Execute**  
Tap approve on reroute.  
Show driver PWA updating in real time (second browser tab/device).  
Show dock schedule at destination warehouse shifting by 2.5 hours automatically.  
Say: "Driver rerouted. Warehouse notified. Risk resolved. 90 seconds from detection to execution."

**Minute 4–5: Vendor reliability + procurement**  
Briefly show vendor portal. Vendor reliability score 42 highlighted as reason for elevated base risk.  
Say: "This vendor's history elevated risk before the truck even left. That is upstream intelligence."

**Minute 5–6: System architecture proof**  
Show risk ticker updating live.  
Explain 5-source fusion: Maps traffic, OpenWeatherMap, vendor score, driver GPS, customs index.  
Say: "Continuous. Multifaceted. Preemptive. This is the loop the problem statement asks for."

**Minute 6–7: Impact statement**  
Show before/after: reactive systems detect delays after 4–72 hours. SupplyMind detects in 15 minutes, resolves in 90 seconds.  
Close with pitch sentence from Section 10.

\---

## 10\. Pitch Sentence

> "SupplyMind closes the detection gap — from disruption signal to executed resolution in under 90 seconds — by continuously fusing five live data streams into probabilistic risk scores, simulating cascade impact across the entire supply network, and executing optimized adjustments before a local bottleneck becomes a system-wide failure."

\---

## 11\. Non-Functional Requirements

|Area|Requirement|
|-|-|
|Performance|Dashboard API responses < 2–3 seconds. Risk scan completes < 30 seconds per shipment.|
|Scalability|Multi-tenant: every query scoped by `businessId`. Indexes on `businessId + status` for all major collections.|
|Security|All mutating endpoints behind NextAuth session. Vendor routes enforce `vendorId` scope server-side. Transport routes enforce `partnerId` scope.|
|Reliability|Stock update + ledger creation atomic per operation (existing requirement preserved). Decision approval + execution wrapped in try/catch with rollback logging.|
|Continuity|Cron job resilient to failures — failed scans logged, retried on next cycle.|
|Auditability|Every risk event, decision, and execution logged with timestamp, user, and full payload.|
|Demo resilience|Seed data script creates realistic demo state: 3 active shipments, 1 at risk, 1 open decision card, cascade simulation pre-computed.|

\---

## 12\. Build Priority for Hackathon

### Phase 1 — Must ship (PS compliance)

1. `Shipments` collection + create/update API
2. Driver location ping endpoint + GPS polling on driver PWA
3. Risk score computation (even with 2 live APIs + 3 mocked inputs)
4. 15-minute cron job triggering risk scan
5. Cascade simulation (graph traversal, named order output)
6. Decision card generation
7. One-click approve for REROUTE option (Maps Directions API call at approval time)
8. Control tower map with live dots + risk ticker

### Phase 2 — Should ship (differentiation)

9. Probabilistic ETA (P75, P95)
10. Vendor reliability score computation from receipt history
11. Redistribute and backup supplier execution options
12. Dock schedule auto-update on reroute approval
13. Customs event logging + immediate cascade trigger

### Phase 3 — Nice to have (if time allows)

14. Gig transport marketplace (job offer + acceptance flow)
15. Driver HOS tracking on PWA
16. Transport partner reliability score
17. Multi-hop cascade (depth > 1)
18. Vendor portal (full UI)

\---

## 13\. Success Criteria

|Criterion|Measure|
|-|-|
|Continuous analysis|Risk ticker visibly updates every 30 seconds during demo with no user action|
|Multifaceted data|Risk score formula uses ≥ 3 distinct data sources, shown in breakdown on decision card|
|Preemptive detection|Risk event fires at score ≥ 65, shipment still ≥ 2 hours from destination|
|Cascade output|Cascade result shows named order IDs, customer names, deadlines, and individual values — not aggregate counts|
|Dynamic execution|Reroute option calls Google Maps Directions API at approval time with live departure\_time, not at shipment creation|
|Closed loop|From risk event creation to execution confirmation visible in demo in under 3 minutes|
|StockMaster preserved|All existing receipt / delivery / transfer / adjustment flows work unchanged|







MUST HAVE features

These are the features without which a judge reads your submission and says "this does not satisfy the problem statement." No exceptions.

Continuous analysis loop. The word "continuously" in the PS is a direct scoring criterion. You must have a running process — not triggered by user action — that monitors every active shipment on a schedule. Your 15-minute cron per shipment satisfies this. Without it, your system is reactive. This must be demonstrable in your demo, not just described in your pitch.

Multi-source data fusion into one risk signal. The PS says "multifaceted transit data." Singular signal from a single source fails this criterion completely. You must show at minimum three simultaneous inputs feeding one risk score. Your formula using traffic, weather, vendor reliability, and customs friction satisfies this. The critical requirement is that these inputs are fused — not displayed separately on a dashboard but combined into a single actionable output. A dashboard showing four separate charts is not fusion. One risk score computed from four inputs is.

Preemptive trigger — fires before the delay occurs. This is the hardest criterion and the one most teams fake. Preemptive means your system acts when risk is elevated, not when the delay is confirmed. Your threshold at score 65 satisfies this only if that score is reached meaningfully ahead of the actual disruption — typically 2 to 8 hours before. If your demo shows a truck already stuck and then your system alerts, you have failed this criterion regardless of everything else.

Cascade simulation — not optional, not nice to have. The PS explicitly says "before localized bottlenecks cascade into broader delays." If your system detects a delay but cannot show what downstream nodes are affected, you have addressed only half the sentence. The cascade engine — shipment → warehouse stock → pending orders → revenue impact — is a hard requirement, not a differentiator. Every team that reads the PS carefully will attempt some version of this. Yours must do it properly.

Dynamic route adjustment with execution. The PS says "dynamically execute or recommend." Both are acceptable — recommend is enough. But it must be dynamic, meaning computed fresh from live data at the time of the event, not pre-computed or hardcoded. Your Google Maps Directions API call at the moment of rerouting satisfies this. A static list of "alternate routes" stored in the database does not.



NICE TO HAVE features

These improve your product but a judge cannot penalize you for missing them against this specific PS.

Vendor reliability scoring system. Genuinely useful and differentiating, but the PS does not mention vendor management. It helps your risk score quality but is not directly required.

Gig transport marketplace. Strong social impact and product thinking, but completely outside the PS scope. Do not spend demo time on this unless you have spare minutes after covering all five PS criteria.

Warehouse gig worker marketplace. Same as above — excellent product, zero PS relevance.

Procurement intelligence — import vs local comparison, customs friction modeling at source. Again, valuable real-world insight but the PS is about transit disruptions, not procurement decisions.

Driver HOS tracking. Useful input to risk scoring, so partially relevant, but not independently required.

Probabilistic ETA with confidence intervals. Impressive technical depth, directly relevant, but the PS would accept a simpler point estimate if the preemption and cascade criteria are met.

Multi-modal transport support — truck, ferry, air, rail. Good product completeness, not required to satisfy PS.

Audit trail and human-in-the-loop governance. Good engineering practice, not a PS requirement.



