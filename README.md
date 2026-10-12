# Smart Xerox — QR-Based Private Document Printing Platform

> A production-oriented, full-stack web platform connecting customers with verified local Xerox, photocopy, printing, scanning, and document service centers through unique QR codes without requiring personal phone numbers or accounts.

---

## 1. Executive Summary & Problem Solved

In traditional walk-in Xerox / photocopy centers, customers are routinely forced to share their personal phone numbers with shop counter staff via WhatsApp, Bluetooth, or email to transfer documents (resumes, Aadhaar cards, tax returns, bank statements, legal agreements). This creates severe privacy hazards:
- **Phone Number Harvesting:** Personal numbers and WhatsApp profile pictures are exposed to unfamiliar operators.
- **Permanent Residual Media:** Documents remain saved on the shop owner's personal phone and WhatsApp media gallery indefinitely.
- **Queue Delays:** Shop staff spend time adding contacts and waiting for chat syncing.

**Smart Xerox solves this completely:**
1. **Zero Phone Number Sharing:** Guest customers never provide a phone number, email address, or account password.
2. **Instant QR Storefront:** Customers scan the shop's counter QR poster to immediately load the shop's live web storefront.
3. **Private File Storage & Malware Quarantine:** Uploaded documents are validated by actual magic bytes (PDF, JPG, PNG) and stored in private isolated storage outside the web root.
4. **Non-Sequential Reference & Cryptographic Token:** Customers receive an anonymous order reference (e.g. `SX-7K9M-2026`) and secret access token (`crypto.randomBytes(32)`).
5. **Private In-Order Messaging:** Customers and shop owners can message each other regarding document specifications without exchanging phone numbers.
6. **Automated Lifecycle Purging:** All uploaded document bytes are permanently unlinked and erased from primary storage per published retention policy.

---

## 2. Architecture & Tech Stack

```
smart-xerox/
├── backend/
│   ├── src/
│   │   ├── config/          # Central configuration & policy constants
│   │   ├── controllers/     # Auth, Shop, Order workflow, Admin controllers
│   │   ├── db/              # PostgreSQL schema DDL, connection pool, seed data
│   │   ├── middleware/      # JWT auth, RBAC, tenancy guards, Multer upload
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Pricing engine, audit logger, retention worker
│   │   ├── storage/         # Magic byte inspector, malware heuristics, disk manager
│   │   ├── app.ts           # Express application with Helmet & CORS
│   │   └── server.ts        # Service bootstrap & retention scheduler
│   └── tests/               # Pricing, Storage security, and End-to-end API suites
├── frontend/
│   ├── public/              # PWA manifest, service worker, icons
│   └── src/
│       ├── components/      # Navbar, Footer, StatusBadge, QrScanner, PosterModal
│       ├── context/         # AuthContext
│       ├── pages/           # Storefront, Tracking, Owner Dashboard, Admin, Legal
│       ├── services/        # API client
│       └── types/           # TypeScript domain definitions
├── docker-compose.yml       # Production container orchestration
├── Dockerfile               # Multi-stage production container build
├── .env.example             # Environment variable template
└── README.md
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router, jsPDF, QRCode.
- **Backend:** Node.js, Express, TypeScript, Helmet, CORS, Zod, JWT, Bcrypt, Multer, PDF-lib.
- **Database:** PostgreSQL schema with 15 normalized tables, foreign keys, constraints, and indexes. Seamlessly connects to external PostgreSQL via `DATABASE_URL` or embedded in-process PostgreSQL (`PGlite`) for zero-dependency local runs.
- **Security:** Magic-byte header validation, SHA-256 integrity checksums, sandboxed document preview (`Content-Security-Policy: sandbox`), token hashing, and tamper-evident audit logs.

---

## 3. Seed Accounts & Demo Credentials

The platform includes seed data for immediate demonstration:

| Role | Email | Password | Details |
|---|---|---|---|
| **Platform Administrator** | `admin@smartxerox.io` | `Admin@12345` | Platform metrics, shop verification queue, audit logs |
| **Verified Shop Owner 1** | `owner1@smartxerox.io` | `Owner@12345` | QuickCopy Express (Slug: `quickcopy-express`) |
| **Verified Shop Owner 2** | `owner2@smartxerox.io` | `Owner@12345` | Metro Document Hub (Slug: `metro-doc-hub`) |
| **Pending Shop Owner 3** | `owner3@smartxerox.io` | `Owner@12345` | Campus Print Point (Awaiting admin approval) |

### Pre-Seeded Demonstration Orders:
- **Order 1:** Reference `SX-7K9M-2026` • Token: `tok_secure_test_token_customer_001` (Status: `READY_FOR_PICKUP`, OTP: `8421`)
- **Order 2:** Reference `SX-9B3X-2026` • Token: `tok_secure_test_token_customer_002` (Status: `AWAITING_APPROVAL`, OTP: `9103`)

---

## 4. Quick Start & Local Execution

### Prerequisites
- Node.js v20+ and npm installed

### Running the Full-Stack Application
You can start the unified server using the provided scripts:

**Windows Command Prompt:**
```cmd
run-dev.bat
```

**Windows PowerShell:**
```powershell
.\run-dev.ps1
```

**Or directly via terminal:**
```bash
# Seed database
npm run seed --prefix backend

# Launch backend & frontend
npm run dev
```

Open your browser at **`http://localhost:5000`** to access the complete application.

---

## 5. Automated Testing Suite

Smart Xerox includes 22 unit, security, and integration tests covering all critical paths:

```bash
cd backend
npx vitest run
```

### Test Coverage Highlights:
- **Storage Security (`tests/storage_security.test.ts`):**
  - Validation of `%PDF-`, PNG, and JPEG magic bytes.
  - Rejection of spoofed files (e.g. text file renamed to `.pdf`).
  - Quarantining of DOS/PE executables (`MZ` header) and `/Launch` command vectors.
  - Verification of physical disk deletion upon auto-purge.
- **Pricing Engine (`tests/pricing.test.ts`):**
  - Single-sided vs. double-sided (duplex) sheet calculation.
  - Odd-page duplex calculation.
  - Volume bulk discounts.
- **Workflow & Tenancy (`tests/api_workflow.test.ts`):**
  - Storefront resolution.
  - Customer order creation & token generation.
  - Token verification (rejects missing or wrong token).
  - Status progression machine (`SUBMITTED` -> `ACCEPTED` -> `PRINTING` -> `READY_FOR_PICKUP` -> `COMPLETED`).
  - Quotation revision & customer approval.
  - Cancellation rules (cancellation rejected once printing starts).
  - In-order private messaging.
  - Administrator verification review & audit logging.

---

## 6. REST API Specification

### Authentication & Profiles
- `POST /api/auth/register` — Register a new shop owner and submit verification details.
- `POST /api/auth/login` — Sign in as shop owner or administrator; returns JWT bearer token.
- `GET /api/auth/me` — Retrieve authenticated user profile and associated shop.

### Public Storefronts & QR Dispatch
- `GET /api/shops/public/:slug` — Retrieve public verified shop details, pricing rules, and services.
- `GET /api/shops/owner/qr` — Get shop counter QR code PNG Data URL and storefront URL.
- `POST /api/shops/owner/qr/regenerate` — Invalidate compromised QR token and generate new token.

### Customer Print Job Workflow
- `POST /api/orders/estimate` — Calculate estimated price for given page count, size, and duplex options.
- `POST /api/orders` — Upload document (multipart) and submit print order. Returns `{ orderReference, orderAccessToken, pickupOtp }`.
- `GET /api/orders/track/:reference?token=...` — Retrieve order status, status stepper, and chat messages.
- `POST /api/orders/track/:reference/approve-quote?token=...` — Customer approves shop's revised price quote.
- `POST /api/orders/track/:reference/cancel?token=...` — Cancel order before printing begins.
- `POST /api/orders/track/:reference/messages?token=...` — Send in-order message to shop counter.

### Shop Owner Order Management
- `GET /api/orders/owner?status=...` — List shop's orders with optional status filter and search.
- `GET /api/orders/owner/:id` — Full details of an order, customer notes, and message thread.
- `PATCH /api/orders/owner/:id/status` — Advance order state (`ACCEPTED`, `PRINTING`, `READY_FOR_PICKUP`, `COMPLETED`).
- `PATCH /api/orders/owner/:id/quote` — Propose revised price quote with explanation.
- `GET /api/orders/owner/:id/documents/:docId/preview` — Sandboxed document preview stream.
- `GET /api/orders/owner/:id/documents/:docId/download` — Authorized file download for printing.
- `POST /api/orders/owner/:id/messages` — Send message to customer.
- `GET /api/orders/owner/reports` — Shop revenue, job count, and volume breakdown.

### Administrator Console
- `GET /api/admin/metrics` — Platform-wide operational KPIs.
- `GET /api/admin/shops` — List all registered shops and verification statuses.
- `POST /api/admin/shops/:shopId/verify` — Approve or reject shop verification.
- `PATCH /api/admin/shops/:shopId/status` — Suspend or reactivate a shop.
- `GET /api/admin/audit-logs` — Tamper-evident activity logs.

---

## 7. Security Checklist & Threat Model Summary

| Threat Vector | Mitigation Strategy | Implementation |
|---|---|---|
| **Customer Phone Harvesting** | Zero-knowledge guest architecture | No phone/email inputs on order forms; indexed by random references. |
| **Cross-Shop Access (IDOR)** | Strict tenancy enforcement middleware | `requireShopTenancy` validates shop ownership on all order routes. |
| **Unauthorized Document Viewing** | Cryptographic token requirement | High-entropy SHA-256 hashed tokens; knowing order reference alone is rejected. |
| **Malicious File Uploads** | Deep binary magic bytes inspection | Validates `%PDF-`, PNG, and JPEG file headers; scans for `/Launch` and PE `MZ` blocks. |
| **Path Traversal Attacks** | Storage key sanitization | Storage keys use `path.basename` and root path boundaries. |
| **Long-Term Data Leakage** | Automated background deletion worker | `RetentionWorker` polls every 60s and physically unlinks files past their TTL. |
| **Admin Over-Privilege** | Role-based least privilege | Administrators have verification & audit oversight, but no bulk document browsing. |
| **Browser Execution Vulnerabilities** | HTTP sandboxing headers | `Content-Security-Policy: sandbox`, `X-Content-Type-Options: nosniff`, `no-store`. |

---

## 8. Production Deployment Checklist

- [x] Configure `.env` with strong 256-bit `JWT_SECRET`.
- [x] Set `DATABASE_URL` to production PostgreSQL cluster (AWS RDS, Supabase, Neon, or Docker).
- [x] Run database migrations via `npm run migrate --prefix backend`.
- [x] Ensure persistent disk or private object storage volume is mounted for `/app/private_storage`.
- [x] Enable SSL/TLS termination on reverse proxy (Nginx, Caddy, or Cloudflare).
- [x] Configure CORS allowed origins to match canonical production domain.
- [x] Verify Docker build: `docker compose up --build -d`.
