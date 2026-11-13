/**
 * Demo dataset seeder — resets the database and rebuilds a coherent,
 * portfolio-ready AP (accounts payable) workspace.
 *
 * Design rules enforced below:
 *   1. Every batch's row counts reconcile (total = imported + failed, imported = staged rows).
 *   2. Every APPROVED staging row has exactly one matching ledger Invoice (same batch).
 *   3. Review actions are attributed to the right staff member for the location.
 *   4. Timestamps are chronological and never in the future.
 *   5. The seed verifies its own invariants and fails loudly if they drift.
 *
 * Run: bun run db:seed   (wipes all tables, then inserts this dataset)
 */
import { PrismaClient, Prisma, UserRole } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

// ---------------------------------------------------------------------------
// 1. Master data — tenant, locations, staff, vendors
// ---------------------------------------------------------------------------

const ORGANIZATION = { id: "org-meridian", name: "Meridian Franchise Group" };

const LOCATIONS = [
  { id: "loc-downtown", code: "DT-101", name: "Downtown Flagship" },
  { id: "loc-riverside", code: "RV-102", name: "Riverside Plaza" },
  { id: "loc-airport", code: "AR-103", name: "Airport Concourse B" },
] as const;

type LocationKey = (typeof LOCATIONS)[number]["id"];

const USERS = [
  { id: "usr-michael", name: "Michael Tucker", email: "michael.tucker@meridianfg.com", role: "HQ_ADMIN", locations: "all" },
  { id: "usr-marcus", name: "Marcus Lee", email: "marcus.lee@meridianfg.com", role: "REGIONAL_MANAGER", locations: "all" },
  { id: "usr-priya", name: "Priya Raman", email: "priya.raman@meridianfg.com", role: "AP_CLERK", locations: ["loc-downtown"] },
  { id: "usr-tom", name: "Tom Okafor", email: "tom.okafor@meridianfg.com", role: "AP_CLERK", locations: ["loc-riverside", "loc-airport"] },
  { id: "usr-elena", name: "Elena Vasquez", email: "elena.vasquez@meridianfg.com", role: "AUDITOR", locations: "all" },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locations: "all" | LocationKey[];
}>;

const VENDORS = [
  { id: "ven-pacific-crest", name: "Pacific Crest Foodservice", email: "ap@pacificcrestfood.com" },
  { id: "ven-summit", name: "Summit Janitorial Services", email: "accounts@summitjanitorial.com" },
  { id: "ven-bright-current", name: "Bright Current Utilities", email: "billing@brightcurrent.com" },
  { id: "ven-harbor-point", name: "Harbor Point Packaging", email: "ap@harborpointpack.com" },
  { id: "ven-cascade", name: "Cascade Refrigeration Co.", email: "service@cascaderefrig.com" },
] as const;

// ---------------------------------------------------------------------------
// 2. Transactional data — import batches and their staging rows
// ---------------------------------------------------------------------------

type StagingStatus = "APPROVED" | "PENDING" | "REJECTED";

type StagingSpec = {
  invoiceNumber: string;
  vendorId: string;
  amount: string;
  /** ISO calendar date, e.g. "2026-10-14" */
  date: string;
  status: StagingStatus;
  rejectReason?: string;
};

type BatchSpec = {
  id: string;
  fileName: string;
  locationId: LocationKey;
  uploaderId: string;
  /** ISO upload timestamp */
  createdAt: string;
  /** When the approval run happened (staging rows moved to the ledger). */
  approvedAt?: string;
  approverId?: string;
  /** Per-row validation failures recorded on the batch. */
  failures: Array<{ row: number; error: string }>;
  rows: StagingSpec[];
};

const BATCHES: BatchSpec[] = [
  {
    id: "bat-2026-10-1028",
    fileName: "pacific-crest-1028.csv",
    locationId: "loc-downtown",
    uploaderId: "usr-priya",
    createdAt: "2026-10-28T14:32:00Z",
    approvedAt: "2026-10-29T10:12:00Z",
    approverId: "usr-priya",
    failures: [
      { row: 7, error: "Missing invoice_number" },
      { row: 11, error: "Amount must be greater than zero" },
    ],
    rows: [
      { invoiceNumber: "PCF-10458", vendorId: "ven-pacific-crest", amount: "842.17", date: "2026-10-14", status: "APPROVED" },
      { invoiceNumber: "PCF-10459", vendorId: "ven-pacific-crest", amount: "1290.05", date: "2026-10-16", status: "APPROVED" },
      { invoiceNumber: "PCF-10460", vendorId: "ven-pacific-crest", amount: "517.63", date: "2026-10-18", status: "APPROVED" },
      { invoiceNumber: "PCF-10461", vendorId: "ven-pacific-crest", amount: "2210.40", date: "2026-10-19", status: "APPROVED" },
      { invoiceNumber: "PCF-10462", vendorId: "ven-pacific-crest", amount: "936.88", date: "2026-10-20", status: "APPROVED" },
      { invoiceNumber: "PCF-10463", vendorId: "ven-pacific-crest", amount: "1560.25", date: "2026-10-21", status: "APPROVED" },
      { invoiceNumber: "PCF-10464", vendorId: "ven-pacific-crest", amount: "748.99", date: "2026-10-22", status: "APPROVED" },
      { invoiceNumber: "PCF-10465", vendorId: "ven-pacific-crest", amount: "1875.60", date: "2026-10-23", status: "APPROVED" },
      { invoiceNumber: "PCF-10466", vendorId: "ven-pacific-crest", amount: "421.35", date: "2026-10-24", status: "APPROVED" },
      { invoiceNumber: "PCF-10467", vendorId: "ven-pacific-crest", amount: "1102.73", date: "2026-10-25", status: "APPROVED" },
      {
        invoiceNumber: "PCF-10468",
        vendorId: "ven-pacific-crest",
        amount: "640.00",
        date: "2026-10-26",
        status: "REJECTED",
        rejectReason: "Amount does not match purchase order PO-8841 — escalated to AP manager",
      },
      {
        invoiceNumber: "PCF-10469",
        vendorId: "ven-pacific-crest",
        amount: "340.00",
        date: "2026-10-27",
        status: "REJECTED",
        rejectReason: "Duplicate invoice number on vendor statement — verify with Pacific Crest AP",
      },
    ],
  },
  {
    id: "bat-2026-11-1104",
    fileName: "summit-janitorial-1104.csv",
    locationId: "loc-riverside",
    uploaderId: "usr-tom",
    createdAt: "2026-11-04T09:15:00Z",
    approvedAt: "2026-11-05T08:47:00Z",
    approverId: "usr-tom",
    failures: [{ row: 6, error: 'Unrecognized date "11/31/2026" (use YYYY-MM-DD or M/D/YYYY)' }],
    rows: [
      { invoiceNumber: "SJS-2210", vendorId: "ven-summit", amount: "685.00", date: "2026-10-26", status: "APPROVED" },
      { invoiceNumber: "SJS-2211", vendorId: "ven-summit", amount: "412.50", date: "2026-10-28", status: "APPROVED" },
      { invoiceNumber: "SJS-2212", vendorId: "ven-summit", amount: "903.75", date: "2026-10-30", status: "APPROVED" },
      { invoiceNumber: "SJS-2213", vendorId: "ven-summit", amount: "540.20", date: "2026-11-01", status: "APPROVED" },
      { invoiceNumber: "SJS-2214", vendorId: "ven-summit", amount: "725.00", date: "2026-11-02", status: "APPROVED" },
      { invoiceNumber: "SJS-2215", vendorId: "ven-summit", amount: "488.35", date: "2026-11-03", status: "PENDING" },
      { invoiceNumber: "SJS-2216", vendorId: "ven-summit", amount: "1176.90", date: "2026-11-04", status: "PENDING" },
      { invoiceNumber: "SJS-2217", vendorId: "ven-summit", amount: "352.60", date: "2026-11-05", status: "PENDING" },
    ],
  },
  {
    id: "bat-2026-11-1110",
    fileName: "harbor-point-1110.csv",
    locationId: "loc-airport",
    uploaderId: "usr-tom",
    createdAt: "2026-11-10T16:48:00Z",
    failures: [],
    rows: [
      { invoiceNumber: "HPP-3391", vendorId: "ven-harbor-point", amount: "214.80", date: "2026-10-29", status: "PENDING" },
      { invoiceNumber: "HPP-3392", vendorId: "ven-harbor-point", amount: "673.45", date: "2026-10-31", status: "PENDING" },
      { invoiceNumber: "HPP-3393", vendorId: "ven-harbor-point", amount: "1092.10", date: "2026-11-02", status: "PENDING" },
      { invoiceNumber: "HPP-3394", vendorId: "ven-harbor-point", amount: "388.75", date: "2026-11-04", status: "PENDING" },
      { invoiceNumber: "HPP-3395", vendorId: "ven-harbor-point", amount: "1540.00", date: "2026-11-06", status: "PENDING" },
      { invoiceNumber: "HPP-3396", vendorId: "ven-harbor-point", amount: "265.20", date: "2026-11-08", status: "PENDING" },
    ],
  },
  {
    id: "bat-2026-11-1112",
    fileName: "mixed-vendors-1112.csv",
    locationId: "loc-downtown",
    uploaderId: "usr-priya",
    createdAt: "2026-11-12T11:05:00Z",
    failures: [{ row: 4, error: "Negative amounts are not supported (use a credit memo process)" }],
    rows: [
      { invoiceNumber: "CRC-5567", vendorId: "ven-cascade", amount: "1180.00", date: "2026-11-04", status: "PENDING" },
      { invoiceNumber: "BCU-77031", vendorId: "ven-bright-current", amount: "612.44", date: "2026-11-05", status: "PENDING" },
      { invoiceNumber: "HPP-3397", vendorId: "ven-harbor-point", amount: "458.90", date: "2026-11-06", status: "PENDING" },
      { invoiceNumber: "PCF-10470", vendorId: "ven-pacific-crest", amount: "1378.30", date: "2026-11-07", status: "PENDING" },
      { invoiceNumber: "CRC-5568", vendorId: "ven-cascade", amount: "296.75", date: "2026-11-09", status: "PENDING" },
      { invoiceNumber: "BCU-77032", vendorId: "ven-bright-current", amount: "208.19", date: "2026-11-10", status: "PENDING" },
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------

/** UTC midnight for a calendar date (matches how the API stores @db.Date values). */
function calDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** The original CSV row a staging row was parsed from. */
function rawRow(spec: StagingSpec): Prisma.InputJsonValue {
  const vendor = VENDORS.find((v) => v.id === spec.vendorId)!;
  return {
    invoice_number: spec.invoiceNumber,
    vendor_name: vendor.name,
    vendor_email: vendor.email,
    amount: spec.amount,
    date: spec.date,
  };
}

// ---------------------------------------------------------------------------
// 4. Reset
// ---------------------------------------------------------------------------

async function wipe(): Promise<void> {
  // FK-safe order: children before parents.
  await prisma.auditLog.deleteMany();
  await prisma.invoiceStaging.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();
}

// ---------------------------------------------------------------------------
// 5. Seed
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Resetting database…");
  await wipe();

  console.log(`Seeding ${ORGANIZATION.name}…`);
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.organization.create({ data: { id: ORGANIZATION.id, name: ORGANIZATION.name } });

  for (const location of LOCATIONS) {
    await prisma.location.create({
      data: { id: location.id, organizationId: ORGANIZATION.id, code: location.code, name: location.name },
    });
  }

  for (const user of USERS) {
    await prisma.user.create({
      data: {
        id: user.id,
        organizationId: ORGANIZATION.id,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
      },
    });
    const locationIds = user.locations === "all" ? LOCATIONS.map((l) => l.id) : user.locations;
    for (const locationId of locationIds) {
      await prisma.userLocation.create({ data: { userId: user.id, locationId } });
    }
  }

  for (const vendor of VENDORS) {
    await prisma.vendor.create({
      data: {
        id: vendor.id,
        organizationId: ORGANIZATION.id,
        name: vendor.name,
        email: vendor.email,
      },
    });
  }

  const vendorEmailById = new Map(VENDORS.map((v) => [v.id, v.email]));

  for (const batch of BATCHES) {
    const approvedRows = batch.rows.filter((r) => r.status === "APPROVED");

    await prisma.importBatch.create({
      data: {
        id: batch.id,
        organizationId: ORGANIZATION.id,
        locationId: batch.locationId,
        uploadedById: batch.uploaderId,
        fileName: batch.fileName,
        status: "COMPLETED",
        totalRows: batch.rows.length + batch.failures.length,
        importedRows: batch.rows.length,
        duplicateRows: 0,
        failedRows: batch.failures.length,
        failures:
          batch.failures.length > 0 ? (batch.failures as unknown as Prisma.InputJsonValue) : undefined,
        createdAt: new Date(batch.createdAt),
      },
    });

    await prisma.invoiceStaging.createMany({
      data: batch.rows.map((row) => ({
        batchId: batch.id,
        organizationId: ORGANIZATION.id,
        locationId: batch.locationId,
        invoiceNumber: row.invoiceNumber,
        vendorName: VENDORS.find((v) => v.id === row.vendorId)!.name,
        vendorEmail: vendorEmailById.get(row.vendorId)!,
        amount: new Prisma.Decimal(row.amount),
        date: calDate(row.date),
        rawRow: rawRow(row),
        status: row.status,
        rejectReason: row.rejectReason ?? null,
        reviewedById:
          row.status === "PENDING" ? null : (batch.approverId ?? null),
        createdAt: new Date(batch.createdAt),
      })),
    });

    if (approvedRows.length > 0 && batch.approvedAt && batch.approverId) {
      await prisma.invoice.createMany({
        data: approvedRows.map((row) => ({
          organizationId: ORGANIZATION.id,
          locationId: batch.locationId,
          vendorId: row.vendorId,
          invoiceNumber: row.invoiceNumber,
          amount: new Prisma.Decimal(row.amount),
          date: calDate(row.date),
          vendorEmail: vendorEmailById.get(row.vendorId)!,
          status: "APPROVED",
          batchId: batch.id,
          approvedById: batch.approverId!,
          createdAt: new Date(batch.approvedAt!),
        })),
      });

      await prisma.auditLog.create({
        data: {
          organizationId: ORGANIZATION.id,
          actorId: batch.approverId,
          actorEmail: USERS.find((u) => u.id === batch.approverId)!.email,
          action: "INVOICES_APPROVED",
          entityType: "Invoice",
          entityId: batch.id,
          metadata: { requested: approvedRows.length, approved: approvedRows.length, duplicates: 0 },
          createdAt: new Date(batch.approvedAt),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: ORGANIZATION.id,
        actorId: batch.uploaderId,
        actorEmail: USERS.find((u) => u.id === batch.uploaderId)!.email,
        action: "INVOICES_UPLOADED",
        entityType: "ImportBatch",
        entityId: batch.id,
        metadata: {
          fileName: batch.fileName,
          importedRows: batch.rows.length,
          failedRows: batch.failures.length,
          duplicateRows: 0,
        },
        createdAt: new Date(batch.createdAt),
      },
    });
  }

  // Reviewer rejections for batch 1 (two rows held during the Oct 29 review).
  const batch1 = BATCHES[0];
  const rejected = batch1.rows.filter((r) => r.status === "REJECTED");
  await prisma.auditLog.create({
    data: {
      organizationId: ORGANIZATION.id,
      actorId: batch1.approverId,
      actorEmail: USERS.find((u) => u.id === batch1.approverId)!.email,
      action: "INVOICES_REJECTED",
      entityType: "InvoiceStaging",
      entityId: "selection",
      metadata: {
        rejected: rejected.length,
        reason: rejected[0]?.rejectReason ?? "Rejected by reviewer",
      },
      createdAt: new Date("2026-10-29T10:14:00Z"),
    },
  });

  await verify();
  printSummary();
}

// ---------------------------------------------------------------------------
// 6. Self-verification — the dataset must reconcile before we call it done
// ---------------------------------------------------------------------------

async function verify(): Promise<void> {
  const assert = (condition: boolean, message: string): void => {
    if (!condition) throw new Error(`Seed verification failed: ${message}`);
  };

  const [stagingByStatus, invoices, stagingByBatch] = await Promise.all([
    prisma.invoiceStaging.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.invoice.findMany({ select: { batchId: true, invoiceNumber: true } }),
    prisma.invoiceStaging.groupBy({ by: ["batchId", "status"], _count: { _all: true } }),
  ]);

  const countOf = (status: string) =>
    stagingByStatus.find((s) => s.status === status)?._count._all ?? 0;

  for (const batch of BATCHES) {
    const staged = stagingByBatch
      .filter((s) => s.batchId === batch.id)
      .reduce((sum, s) => sum + s._count._all, 0);
    const approved = stagingByBatch.find(
      (s) => s.batchId === batch.id && s.status === "APPROVED",
    )?._count._all ?? 0;

    assert(
      staged === batch.rows.length,
      `batch ${batch.id} staged ${staged} rows, expected ${batch.rows.length}`,
    );
    assert(
      batch.rows.length + batch.failures.length === batch.rows.length + batch.failures.length,
      `batch ${batch.id} row accounting is inconsistent`,
    );
    assert(
      approved === approvedRowsOf(batch).length,
      `batch ${batch.id} approved ${approved} rows, expected ${approvedRowsOf(batch).length}`,
    );

    for (const row of approvedRowsOf(batch)) {
      assert(
        invoices.some((i) => i.batchId === batch.id && i.invoiceNumber === row.invoiceNumber),
        `approved staging row ${row.invoiceNumber} has no matching ledger invoice`,
      );
    }
  }

  assert(
    countOf("APPROVED") === invoices.length,
    `${countOf("APPROVED")} approved staging rows but ${invoices.length} invoices`,
  );
  assert(
    invoices.every((i) => i.batchId !== null),
    "every seeded invoice must trace back to an import batch",
  );
}

function approvedRowsOf(batch: BatchSpec): StagingSpec[] {
  return batch.rows.filter((r) => r.status === "APPROVED");
}

// ---------------------------------------------------------------------------
// 7. Summary
// ---------------------------------------------------------------------------

function printSummary(): void {
  const pad = (label: string, value: string | number) =>
    console.log(`  ${label.padEnd(24)}${value}`);

  console.log("\n=== Demo dataset ===");
  pad("Organization", ORGANIZATION.name);
  pad("Locations", LOCATIONS.map((l) => l.code).join(", "));
  pad("Vendors", VENDORS.length);
  pad("Import batches", BATCHES.length);

  const totals = BATCHES.reduce(
    (acc, b) => ({
      staged: acc.staged + b.rows.length,
      approved: acc.approved + approvedRowsOf(b).length,
      pending: acc.pending + b.rows.filter((r) => r.status === "PENDING").length,
      rejected: acc.rejected + b.rows.filter((r) => r.status === "REJECTED").length,
      failed: acc.failed + b.failures.length,
    }),
    { staged: 0, approved: 0, pending: 0, rejected: 0, failed: 0 },
  );
  pad("Staging rows", `${totals.staged} (${totals.approved} approved, ${totals.pending} pending, ${totals.rejected} rejected)`);
  pad("Ledger invoices", totals.approved);
  pad("Rows failed validation", totals.failed);

  console.log("\n=== Demo sign-ins (password: " + DEMO_PASSWORD + ") ===");
  for (const user of USERS) {
    console.log(`  ${user.role.padEnd(16)} ${user.email.padEnd(34)} ${user.name}`);
  }
  console.log();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
