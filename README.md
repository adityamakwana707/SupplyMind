<div align="center">

<img src="public/sm.png" alt="SupplyMind Logo" width="160" />

# SupplyMind
### AI-Powered Supply Chain Intelligence Control Tower

**Google SkillBuild Hackathon 2026 — Smart Supply Chains Track**

*Transforming supply chain volatility into autonomous strategic advantage.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Vertex AI](https://img.shields.io/badge/Vertex_AI-Gemini_1.5-4285F4?style=for-the-badge&logo=googlecloud)](https://cloud.google.com/vertex-ai)
[![Google Maps](https://img.shields.io/badge/Google_Maps-Platform-34A853?style=for-the-badge&logo=googlemaps)](https://developers.google.com/maps)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

[🌐 Live Demo](https://stock-master-indol.vercel.app/) · [📋 PRD](./PRD_SupplyMind_v3.md) · [💰 Cost Analysis](./docs/implementation_cost.md)

</div>

---

## 📌 The Problem

Modern global supply chains manage millions of concurrent shipments across highly complex and inherently volatile transportation networks. Critical transit disruptions — ranging from sudden weather events to hidden operational bottlenecks — are chronically identified **only after** delivery timelines are already compromised.

By the time a human operator raises an alert, the disruption has already cascaded: stock has depleted at the destination warehouse, hospital orders have missed their deadlines, and revenue has been lost.

---

## 🚀 The Solution

**SupplyMind** is a proactive, AI-driven logistics intelligence platform that continuously monitors every active shipment across five real-time risk signals, simulates the full downstream cascade of any detected disruption, and presents ranked, financially-quantified mitigation strategies — all before the first delivery deadline is missed.

> **One-sentence pitch:** SupplyMind compresses a 4–6 hour human escalation chain into an autonomous AI loop that fires 2–8 hours before impact.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SUPPLYMIND PLATFORM                   │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ Driver PWA  │───▶│  Risk Engine │───▶│  Cascade  │  │
│  │ (GPS Ping)  │    │ (15-min cron)│    │ Simulator │  │
│  └─────────────┘    └──────┬───────┘    └─────┬─────┘  │
│                            │                  │         │
│  ┌─────────────┐           ▼                  ▼         │
│  │ Google Maps │    ┌──────────────┐    ┌───────────┐  │
│  │  Platform   │───▶│  Vertex AI   │───▶│ Decision  │  │
│  │ (Traffic +  │    │ Gemini 1.5F  │    │   Card    │  │
│  │  Directions)│    └──────────────┘    └─────┬─────┘  │
│  └─────────────┘                             │         │
│                                              ▼         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Control Tower (SCM Head Dashboard)         │  │
│  │   Map · Risk Ticker · Decision Cards · Ledger    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Core Features

### 🗺️ Live Control Tower Map
Real-time Google Maps embed showing every active shipment as a color-coded dot. Green (safe), Amber (watch), Red (critical). Click any marker to open the full decision panel.

### ⚡ Continuous Risk Engine
A 15-minute background cron job evaluates every `IN_TRANSIT` shipment across five signals:

| Signal | Weight | Source |
|---|---|---|
| Traffic delay vs. planned ETA | 35% | Google Maps Distance Matrix API |
| Weather severity at route midpoint | 20% | OpenWeatherMap API |
| Vendor historical reliability score | 25% | Receipt history computation |
| Customs hold probability | 15% | Customs event logs |
| Driver Hours-of-Service fatigue | 5% | Driver PWA HOS tracker |

### 🔗 Cascade Simulation Engine
When risk ≥ 65, the engine traces forward: delayed shipment → projected stock depletion → affected pending orders → **exact revenue at risk (₹)**. Named orders, named customers, hard deadlines — not aggregate counts.

### 🤖 Vertex AI Decision Generation
Cascade output is fed to **Gemini 1.5 Flash via Vertex AI**. The model returns 2–4 ranked mitigation options with confidence scores, cost premiums, and time saved. Options include:
- **REROUTE** — alternate geometry from Maps Directions API
- **REDISTRIBUTE** — emergency internal transfer from backup warehouse
- **BACKUP_SUPPLIER** — draft PO to highest-reliability vendor
- **GIG_TRANSPORT** — dispatch nearest available partner

### ✅ One-Click Execution
SCM Head approves an option → system simultaneously updates route geometry, creates transfer/receipt documents, notifies warehouse managers, and logs an immutable audit trail entry.

### 📡 Offline-First Driver PWA
Driver opens `/driver/[shipmentId]` on mobile. GPS pings every 30 seconds. When network is unavailable (tunnels, rural routes), pings are queued in `localStorage` and flushed automatically on reconnection — no data loss.

### 🌓 Adaptive Theming
Full Dark/Light mode support via `next-themes` with a sidebar toggle, optimized for 24/7 operations center environments.

---

## 👥 User Roles & Portals

| Role | Portal | Key Capabilities |
|---|---|---|
| **SCM Head / Admin** | `/dashboard` | Control tower map, decision cards, risk ticker, full P&L impact |
| **Warehouse Manager** | `/dashboard` | Warehouse KPIs, stock health, requisition approvals, transfers |
| **Warehouse Operator** | `/receipts`, `/deliveries` | Receipt validation, stock adjustments, delivery dispatch |
| **Vendor / Supplier** | `/vendor` | Own POs only, reliability score, shipment visibility |
| **Transport Partner** | `/driver/[shipmentId]` | Live navigation, HOS tracking, offline sync, reroute alerts |

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components) |
| **Language** | TypeScript 5.x |
| **Database** | Firebase Firestore (serverless, real-time) |
| **Auth** | Firebase Auth + custom session middleware |
| **AI Engine** | Google Vertex AI — Gemini 1.5 Flash |
| **Maps** | Google Maps Platform (JS API, Directions, Distance Matrix) |
| **Styling** | Tailwind CSS + custom glassmorphism design system |
| **Animations** | Framer Motion |
| **Background Jobs** | `node-cron` (risk scan every 15 min) |
| **Email** | Resend API |
| **Deployment** | Vercel |

---

## 🗄️ Database Collections

| Collection | Purpose |
|---|---|
| `shipments` | Core entity — every physical movement of goods |
| `warehouses` | Hub registry with coordinates |
| `products` | SKU catalog with pricing |
| `stockLevels` | Per-warehouse stock quantities |
| `stockMovements` | Immutable ledger of all inventory changes |
| `receipts` | Inbound procurement records |
| `deliveries` | Outbound customer orders |
| `transfers` | Internal warehouse-to-warehouse movements |
| `riskEvents` | Detected disruptions with cascade simulation output |
| `decisionCards` | AI-generated mitigation options awaiting approval |
| `vendors` | Supplier registry with reliability scores |
| `transportPartners` | Driver/fleet registry with HOS data |
| `locationPings` | Raw GPS telemetry stream |
| `auditLogs` | Immutable record of every system action |

---

## 🎯 Quick Start (Judges)

### Live Environment
🌐 **[https://stock-master-indol.vercel.app/](https://stock-master-indol.vercel.app/)**

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin / SCM Head** | `admin@stockmaster.com` | `password123` |
| **Vendor Partner** | `vendor@stockmaster.com` | `password123` |
| **Manager / Warehouse Head** | `manager@stockmaster.com` | `password123` |
| **Operator** | `operator@stockmaster.com` | `password123` |
| **Transport Driver** | `transport@stockmaster.com` | `password123` |


### 3-Minute Demo Flow
1. **Login as Admin** → navigate to **Control Tower**
2. Observe the live map — locate the **red marker** (SHP_EMERG_01, Risk: 85%)
3. Click the marker → open **Decision Card** showing ₹5,25,000 revenue at risk
4. Review the **Vertex AI mitigation options** with confidence scores
5. Click **Approve** on the top-ranked option
6. Navigate to **Ledger** — confirm the AI action is immutably recorded
7. Switch to **Driver view**: `http://localhost:3000/driver/SHP_DRIVER_DEMO`

---

## 🏃 Local Development

### Prerequisites
- Node.js 18+
- Firebase project with Firestore enabled
- Google Cloud project with Vertex AI + Maps Platform APIs enabled

### Setup

```bash
# Clone and install
git clone <repo>
cd StockMaster-main
npm install

# Configure environment
cp .env.example .env.local
# Fill in FIREBASE_*, GOOGLE_MAPS_*, GOOGLE_CLOUD_* keys

# Seed the database
npx tsx scripts/seedDemoData.ts

# Start dev server
npm run dev
```

### Environment Variables

```env
# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_API_KEY=

# Vertex AI
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=us-central1

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

### Utility Scripts

| Command | Description |
|---|---|
| `npx tsx scripts/seedDemoData.ts` | Seed full demo dataset |
| `npx tsx scripts/seedDriver.ts` | Seed driver dashboard data only |
| `npx tsx reset-db.ts` | Clear all operational collections |

---

## 📁 Project Structure

```
/app
  /api              — All API route handlers
    /shipments      — CRUD + GPS ping + cascade endpoint
    /decisions      — Pending cards + approval execution
    /risk-scan      — Manual risk scan trigger
    /vendor         — Vendor-scoped endpoints
  /dashboard        — Admin + Manager portal
  /driver/[id]      — Transport partner PWA
  /vendor           — Supplier portal
  /ledger           — Stock movement audit trail
  /receipts         — Inbound procurement
  /deliveries       — Outbound orders
  /transfers        — Internal movements
  /requisitions     — Replenishment requests

/lib
  /firebase         — Admin SDK + client SDK setup
  /services
    riskEngine.ts       — 5-signal risk score computation
    cascadeEngine.ts    — Downstream impact simulation
    shipmentService.ts  — Shipment creation + route geometry
    geminiService.ts    — Vertex AI prompt execution
    reliabilityEngine.ts — Vendor score computation
    cronService.ts      — Background job scheduler

/components
  /landing          — Public marketing page components
  ControlTowerMap.tsx — Google Maps real-time shipment map
  Sidebar.tsx        — RBAC-aware nav with theme toggle

/scripts
  seedDemoData.ts   — Full ecosystem seeder
  seedDriver.ts     — Driver dashboard seeder
```

---

## 💰 Implementation Cost Summary

| | Cost |
|---|---|
| **Initial Development (16 weeks)** | ~$69,000 |
| **Monthly Infrastructure (GCP + Firebase)** | $1,020–$2,350 |
| **Monthly Google Maps API** | ~$1,100 |
| **Year 1 TCO** | ~$105,000–$120,000 |

**ROI:** One successfully mitigated high-value crisis (e.g., ₹5,25,000 ventilator shipment) recovers the platform's full annual operating cost. See [full cost analysis](./docs/implementation_cost.md).

---

## 🏆 Why SupplyMind Wins

1. **Deep Google Cloud integration** — not surface-level API calls. Vertex AI, Maps Platform (3 APIs), Firebase Auth + Firestore all work together in a production-grade architecture.
2. **End-to-end automation** — from raw GPS ping to AI decision to execution, zero manual steps required.
3. **Financial precision** — every risk alert quantifies exact revenue at risk with named orders and deadlines. Judges see real impact, not placeholder text.
4. **Built for scale** — serverless Firestore, stateless API routes, and rate-limited AI calls mean the system handles enterprise load without rearchitecting.

---

<div align="center">

*Designed and engineered for the Google SkillBuild 2026 Hackathon.*

**SupplyMind — Logistics, Solved.**

</div>
