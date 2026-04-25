# System Architecture — SupplyMind v3

SupplyMind v3 is built as a unified, serverless logistics intelligence platform. While evolving from the StockMaster core, it has been fully migrated to the Google Cloud ecosystem for maximum scalability and real-time performance.

## 🏗️ High-Level Stack

- **Frontend**: Next.js 14 (App Router) with React Server Components (RSC).
- **Styling**: Tailwind CSS with Framer Motion for high-performance animations.
- **Primary Database**: **Google Firebase Firestore** (NoSQL).
- **Authentication**: Firebase Authentication with custom role-based claims.
- **AI Engine**: **Google Vertex AI** (Gemini 1.5 Flash).
- **Orchestration**: External **n8n.io** instance via secure Webhooks.
- **External Sensors**: Google Maps (Traffic), OpenWeatherMap (Atmospheric).

---

## 🗄️ Database Schema Design (Firestore)

The system utilizes 15+ high-performance collections to manage the bridge between inventory and intelligence.

### 📦 Inventory Layer (Legacy Core)
Managed as traditional business documents with atomic updates:
- **`warehouses`**: Facility metadata, coordinates, and operational status.
- **`products`**: Global catalog including ABC classification and pricing.
- **`stockLevels`**: Real-time inventory mapped to specific `warehouseId` and `productId`.
- **`receipts` / `deliveries`**: Inbound/Outbound transaction logs with status workflows.
- **`requisitions` / `transfers`**: Internal stock movement and Inter-warehouse logistics.

### 🧠 Intelligence Layer (SupplyMind Engine)
Real-time streams optimized for fast retrieval:
- **`shipments`**: Active transit units with live GPS telemetry (`currentLat`, `currentLng`).
- **`riskHistory`**: Time-series data of weighted risk scores for every active shipment.
- **`decisionCards`**: AI-generated mitigation strategies (Reroutes, Redstributions).
- **`auditLogs`**: The "Network Flight Recorder" capturing every autonomous intervention.

---

## 🤖 AI & Logic Flow

1.  **Telemetry Ingestion**: Driver PWAs send location and HOS (Hours of Service) pings to `/api/shipments/[id]/location`.
2.  **Autonomous Polling**: n8n triggers the Risk Engine via `/api/orchestration/risk-scan`.
3.  **Risk Assessment**: The engine pulls Traffic (Google Maps) and Weather (OpenWeather) to compute a weighted risk score.
4.  **AI Formulation**: If risk is critical, the **Vertex AI Engine** simulates cascading impacts on the `stockLevels` and generates human-readable mitigation cards.
5.  **Executive Approval**: Managers approve AI suggestions, triggering status updates across the network.

---

## 🔐 Security & Roles

The system enforces strict **Context-Aware Security**:
- **ADMIN**: Access to the Full Control Tower and Audit Logs.
- **MANAGER**: Restricted to assigned warehouses; manages requisitions and approvals.
- **OPERATOR**: Edge worker access for Receipts, Transfers, and Deliveries.
- **DRIVER**: PWA-only access for assigned shipments and duty updates.
