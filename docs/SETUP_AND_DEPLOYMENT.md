# Setup & Deployment — SupplyMind v3

This guide provides the mandatory configuration required to run the SupplyMind v3 ecosystem in production and local development environments.

---

## 🔑 Environment Variables (`.env.local`)

Create a `.env.local` file in the root directory with the following keys:

### 1. Database & Auth (Firebase)
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Found in Firebase Console (Project Settings).
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: `[project-id].firebaseapp.com`.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Google Cloud / Firebase Project ID.
- `FIREBASE_CLIENT_EMAIL`: Service Account Email (Service Accounts tab).
- `FIREBASE_PRIVATE_KEY`: Service Account Private Key.

### 2. AI Intelligence (Google Cloud)
- `GOOGLE_MAPS_API_KEY`: Required for Distance Matrix and Places Autocomplete.
- `GEMINI_API_KEY`: (Optional if using Vertex) Standard AI Studio key.
- `GOOGLE_CLOUD_PROJECT`: Required for Vertex AI and Cloud Logging.
- `GOOGLE_CLOUD_LOCATION`: Regional location (e.g., `us-central1`).

### 3. External Integrations
- `OPENWEATHER_API_KEY`: Required for live weather severity ingest.
- `N8N_ORCHESTRATION_SECRET`: Secure string shared with your n8n workflows.
- `RESEND_API_KEY`: Required for automated email notifications.

### 4. NextAuth Core
- `NEXTAUTH_URL`: `http://localhost:3000` (Dev) or your production domain.
- `NEXTAUTH_SECRET`: A secure random string for JWT encryption.

---

## 📦 2. Strategic Data Seeding

The system requires specific data hierarchies to demonstrate intelligence properly.

### Step 1: Inventory Core
Run the local seeding script to create Warehouses, Products, and Users:
```bash
npm run seed
```

### Step 2: Intelligent Disruption Scenario
Run the administrative provisioning endpoint to inject high-stakes pharmaceutical logistics data:
```bash
POST /api/admin/seed-intel
Header: Authorised Admin Session
```
*This script specifically creates the "Lifeline Pharma" and "Global Pro Dispatch" entities for the pitch demo.*

---

## 🚀 3. n8n Orchestration Setup

1.  **Workflow Import**: Locate `n8n/supplymind_sync_v1.json` in the project root.
2.  **Import**: In the n8n UI, go to `Workflow Settings` -> `Import from JSON`.
3.  **Webhook Sync**: Update the `HTTP Request` node to target your live `/api/orchestration/risk-scan` endpoint.
4.  **Credential Sync**: Ensure the `x-n8n-secret` header in n8n matches your `.env.local`.

---

## 🌍 4. Vercel Deployment

1.  **Push to GitHub**: Connect your repository to Vercel.
2.  **Configure Environment**: Add all the keys above to Vercel's environment variable settings.
3.  **Deploy**: The project handles RSC and Middleware out-of-the-box.
