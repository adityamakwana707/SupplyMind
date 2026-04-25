# API Catalog — SupplyMind v3

The SupplyMind v3 backend consists of **45+ production-ready endpoints** built on the Next.js 14 App Router, using the Firebase Admin SDK for all persistence and AI operations.

---

## 📦 1. Inventory Infrastructure
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/products` | `GET/POST` | Product catalog CRUD & Search. |
| `/api/warehouses` | `GET/POST` | Multi-facility node management. |
| `/api/locations` | `GET/POST/PUT` | Granular storage location management. |
| `/api/stock` | `GET` | Real-time stock balance queries across the network. |

---

## 🔄 2. Logistics & Workflows
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/receipts` | `POST` | Inbound stock validation and entry. |
| `/api/deliveries` | `POST` | Outbound stock fulfillment and deduction. |
| `/api/transfers` | `POST` | Inter-warehouse stock movement tracking. |
| `/api/requisitions` | `POST` | Internal department inventory requests. |
| `/api/adjustments` | `POST` | Stock correction ledger with reason tracking. |

---

## 🧠 3. AI & Intelligence (SupplyMind)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/shipments` | `GET/POST` | Global transit unit management and tracking. |
| `/api/shipments/[id]/location` | `PATCH` | Edge telemetry interface for GPS/HOS pings. |
| `/api/decisions` | `GET` | Retrieval of AI Decision Cards. |
| `/api/decisions/[id]/approve` | `POST` | One-click execution of AI reroute suggestions. |
| `/api/orchestration/risk-scan` | `POST` | n8n-powered autonomous network risk diagnostic. |

---

## 📊 4. Executive & Analytics
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/dashboard` | `GET` | High-level KPIs (Revenue at Risk, Stockout Events). |
| `/api/analytics/low-stock` | `GET` | Predictive low stock alerts. |
| `/api/ledger` | `GET` | Full immutable transaction history (The Audit Trail). |
| `/api/admin/audit-logs` | `GET` | Network Flight Recorder system logs for forensics. |

---

## 🔐 5. System Administration
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | `POST` | JWT + Firebase Auth session management. |
| `/api/admin/users` | `GET/POST/PUT` | Enterprise Role-Based Access Control (RBAC). |
| `/api/admin/seed-intel` | `POST` | Intelligent demo data provisioning (Secret Script). |

---

### Security Standards
All endpoints are protected by the `getServerSessionFirebase` middleware, enforcing custom claims for **ADMIN**, **MANAGER**, and **OPERATOR** roles.
