# Franchise Invoice Import & Ledger System

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Midastouch8k/invoice-import)

A multi-tenant accounts payable (AP) invoice staging, deduplication, and ledger management portal built with **React**, **Express**, **Prisma ORM**, and **PostgreSQL (Neon)**.

---

## 🌟 Key Features

* **Multi-Tenant Franchise Architecture:** Organization &rarr; Locations &rarr; Users with strict location-scoping.
* **Role-Based Access Control (RBAC):**
  * `HQ_ADMIN`: Full organization oversight and management.
  * `REGIONAL_MANAGER`: Multi-store oversight and review.
  * `AP_CLERK`: Location-scoped CSV uploads and invoice approvals.
  * `AUDITOR`: Read-only financial ledger access with export capabilities.
* **CSV Import & Staging Pipeline:**
  * Multi-format CSV ingestion with validation error reporting.
  * Batch tracking (`ImportBatch`) with staging review table (`InvoiceStaging`).
  * Deduplication detection at upload, staging, and approval stages.
* **Accounting Ledger:**
  * High-contrast table with alternating column striping and grid outlines.
  * Multi-location filtering, status filtering, and paginated queries.
* **Comprehensive Audit Trail:** Immutable logs for all batch uploads, row approvals, and rejections.

---

## 🚀 Live Cloud Deployment

| Component | Platform | Role |
| :--- | :--- | :--- |
| **Source Code** | [GitHub](https://github.com/Midastouch8k/invoice-import) | Version control & CI/CD trigger |
| **Database** | [Neon](https://neon.tech) | Serverless PostgreSQL database |
| **Hosting** | [Render](https://render.com) | Full-stack deployment via `render.yaml` |

### One-Click Deploy to Render
Click the badge above or navigate to:  
👉 **[https://render.com/deploy?repo=https://github.com/Midastouch8k/invoice-import](https://render.com/deploy?repo=https://github.com/Midastouch8k/invoice-import)**

---

## 🔐 Demo Credentials

All demo accounts use password: `Password123!`

| Role | Email | Scope |
| :--- | :--- | :--- |
| **HQ Admin** | `michael.tucker@meridianfg.com` | All Locations |
| **Regional Manager** | `marcus.lee@meridianfg.com` | All Locations |
| **AP Clerk (Downtown)** | `priya.raman@meridianfg.com` | Downtown Flagship (`DT-101`) |
| **AP Clerk (Multi)** | `tom.okafor@meridianfg.com` | Riverside (`RV-102`) & Airport (`AR-103`) |
| **Auditor** | `elena.vasquez@meridianfg.com` | Read-only organization-wide |

---

## 💻 Local Development

### Prerequisites
* [Bun](https://bun.sh) (v1.1+) or Node.js (v20+)
* PostgreSQL connection string (e.g. Neon)

### Server Setup
```bash
cd server
bun install
bun run db:generate
bun run db:seed      # Seeds demo organization and invoices
bun run dev          # Runs on http://localhost:8080
```

### Client Setup
```bash
cd client
bun install
bun run dev          # Runs on http://localhost:5173
```

### Running Tests & Verification
```bash
# Client tests
cd client && bun run test && bun run lint

# Server tests & smoke integration
cd server && bun run test && bun run lint && bun run scripts/smoke.ts
```
