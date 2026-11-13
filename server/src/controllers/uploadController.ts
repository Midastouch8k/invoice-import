import { Prisma, StagingStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../db/index";
import { ApiError } from "../utils/errors";
import { parseInvoiceCsv } from "../utils/csv";
import { getPagination, parseIdList } from "../utils/pagination";
import { sendSuccess } from "../utils/response";
import { assertLocationAccess, getLocationScope } from "../utils/scope";

const FAILURE_STORE_LIMIT = 200;
const FAILURE_SAMPLE_LIMIT = 20;
const INSERT_CHUNK_SIZE = 500;

const stagingSelection = {
  id: true,
  invoiceNumber: true,
  vendorName: true,
  vendorEmail: true,
  amount: true,
  date: true,
  status: true,
  rejectReason: true,
  batchId: true,
  createdAt: true,
  location: { select: { id: true, code: true, name: true } },
} satisfies Prisma.InvoiceStagingSelect;

type StagingRow = Prisma.InvoiceStagingGetPayload<{ select: typeof stagingSelection }>;

/** Serializes Decimal amounts into plain numbers for the JSON API. */
function serializeStaging(row: StagingRow) {
  return { ...row, amount: Number(row.amount) };
}

function serializeStagingList(rows: StagingRow[]) {
  return rows.map(serializeStaging);
}

async function recordAudit(
  actor: { id: string; email: string },
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      metadata,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/upload — parse CSV into staging rows for review
// ---------------------------------------------------------------------------

export async function uploadInvoices(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const locationId = typeof req.body?.locationId === "string" ? req.body.locationId : "";
  if (!locationId) throw ApiError.badRequest("locationId is required");
  assertLocationAccess(user, locationId);

  const file = req.file;
  if (!file) throw ApiError.badRequest("No CSV file uploaded");

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: user.organizationId },
    select: { id: true, name: true },
  });
  if (!location) throw ApiError.notFound("Location not found");

  const { rows, failures } = await parseInvoiceCsv(file.buffer);
  if (rows.length === 0 && failures.length === 0) {
    throw ApiError.badRequest("The CSV file contains no data rows");
  }

  // De-duplicate within the file: first occurrence wins, the rest are reported.
  const seen = new Set<string>();
  const uniqueRows: typeof rows = [];
  let withinFileDuplicates = 0;
  for (const row of rows) {
    if (seen.has(row.invoiceNumber)) {
      withinFileDuplicates += 1;
      continue;
    }
    seen.add(row.invoiceNumber);
    uniqueRows.push(row);
  }

  const batch = await prisma.importBatch.create({
    data: {
      organizationId: user.organizationId,
      locationId,
      uploadedById: user.id,
      fileName: file.originalname,
      status: "COMPLETED",
      totalRows: rows.length + failures.length,
      duplicateRows: withinFileDuplicates,
      failedRows: failures.length,
      failures: failures.length
        ? (failures.slice(0, FAILURE_STORE_LIMIT) as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  // Batched inserts instead of one upsert per row.
  let importedRows = 0;
  for (let i = 0; i < uniqueRows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = uniqueRows.slice(i, i + INSERT_CHUNK_SIZE);
    const created = await prisma.invoiceStaging.createMany({
      data: chunk.map((row) => ({
        batchId: batch.id,
        organizationId: user.organizationId,
        locationId,
        invoiceNumber: row.invoiceNumber,
        vendorName: row.vendorName,
        vendorEmail: row.vendorEmail,
        amount: new Prisma.Decimal(row.amount),
        date: new Date(`${row.date}T00:00:00Z`),
        rawRow: row.raw as Prisma.InputJsonValue,
        status: StagingStatus.PENDING,
      })),
      skipDuplicates: true,
    });
    importedRows += created.count;
  }

  // Persist the final counts (importedRows is only known after the inserts).
  const duplicateRows = withinFileDuplicates + (uniqueRows.length - importedRows);
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { importedRows, duplicateRows },
  });

  await recordAudit(
    { id: user.id, email: user.email },
    user.organizationId,
    "INVOICES_UPLOADED",
    "ImportBatch",
    batch.id,
    { fileName: file.originalname, importedRows, failedRows: failures.length, duplicateRows },
  );

  sendSuccess(res, {
    message: `Imported ${importedRows} row(s) to staging for ${location.name}. ${failures.length} row(s) failed validation, ${duplicateRows} duplicate(s) skipped.`,
    batchId: batch.id,
    totalRows: rows.length + failures.length,
    importedRows,
    duplicateRows,
    failedRows: failures.length,
    failures: failures.slice(0, FAILURE_SAMPLE_LIMIT),
  });
}

// ---------------------------------------------------------------------------
// GET /api/upload/staging — paginated, scoped staging review list
// ---------------------------------------------------------------------------

export async function getStagingInvoices(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const scope = getLocationScope(user);
  const { page, pageSize, skip } = getPagination(req.query);

  const statusParam = String(req.query.status ?? StagingStatus.PENDING).toUpperCase();
  const status =
    statusParam === "ALL"
      ? undefined
      : Object.values(StagingStatus).includes(statusParam as StagingStatus)
        ? (statusParam as StagingStatus)
        : undefined;

  const where: Prisma.InvoiceStagingWhereInput = {
    ...scope.where,
    ...(status ? { status } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.invoiceStaging.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      select: stagingSelection,
    }),
    prisma.invoiceStaging.count({ where }),
  ]);

  sendSuccess(res, { data: serializeStagingList(data), page, pageSize, total });
}

// ---------------------------------------------------------------------------
// POST /api/upload/approve — move selected (or all scoped pending) rows to Invoice
// ---------------------------------------------------------------------------

export async function approveStaging(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const scope = getLocationScope(user);
  const ids = parseIdList(req.body?.ids);
  const batchId = typeof req.body?.batchId === "string" ? req.body.batchId : undefined;

  const pending = await prisma.invoiceStaging.findMany({
    where: {
      ...scope.where,
      status: StagingStatus.PENDING,
      ...(ids ? { id: { in: ids } } : {}),
      ...(batchId ? { batchId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
  if (pending.length === 0) {
    throw ApiError.badRequest("No pending invoices to approve for your access scope");
  }

  // Find-or-create vendors for the batch of rows being approved.
  const vendorNames = [
    ...new Set(pending.map((row) => row.vendorName ?? "Unknown Vendor")),
  ];
  const vendorIdByName = new Map<string, string>();
  const existingVendors = await prisma.vendor.findMany({
    where: { organizationId: user.organizationId, name: { in: vendorNames } },
    select: { id: true, name: true },
  });
  for (const vendor of existingVendors) vendorIdByName.set(vendor.name, vendor.id);

  const missingVendorNames = vendorNames.filter((name) => !vendorIdByName.has(name));
  if (missingVendorNames.length > 0) {
    await prisma.vendor.createMany({
      data: missingVendorNames.map((name) => ({
        organizationId: user.organizationId,
        name,
      })),
      skipDuplicates: true,
    });
    const createdVendors = await prisma.vendor.findMany({
      where: { organizationId: user.organizationId, name: { in: missingVendorNames } },
      select: { id: true, name: true },
    });
    for (const vendor of createdVendors) vendorIdByName.set(vendor.name, vendor.id);
  }

  // De-duplicate within the approval set: same location+vendor+number, first wins.
  type RowWithVendor = (typeof pending)[number] & { vendorId: string };
  const approvedRows: RowWithVendor[] = [];
  const selfDuplicates: Array<{ row: (typeof pending)[number]; vendorId: string }> = [];
  const approvalKeys = new Set<string>();
  for (const row of pending) {
    const vendorId = vendorIdByName.get(row.vendorName ?? "Unknown Vendor")!;
    const key = `${row.locationId}:${vendorId}:${row.invoiceNumber}`;
    if (approvalKeys.has(key)) {
      selfDuplicates.push({ row, vendorId });
      continue;
    }
    approvalKeys.add(key);
    approvedRows.push({ ...row, vendorId });
  }

  // Existing invoices that already contain one of these rows → duplicates.
  const existingInvoices = await prisma.invoice.findMany({
    where: {
      locationId: { in: [...new Set(pending.map((r) => r.locationId))] },
      vendorId: { in: [...new Set(approvedRows.map((r) => r.vendorId))] },
      invoiceNumber: { in: approvedRows.map((r) => r.invoiceNumber) },
    },
    select: { locationId: true, vendorId: true, invoiceNumber: true },
  });
  const existingKeys = new Set(
    existingInvoices.map((i) => `${i.locationId}:${i.vendorId}:${i.invoiceNumber}`),
  );

  const toCreate = approvedRows.filter(
    (row) => !existingKeys.has(`${row.locationId}:${row.vendorId}:${row.invoiceNumber}`),
  );
  const duplicates = [
    ...selfDuplicates,
    ...approvedRows
      .filter((row) => existingKeys.has(`${row.locationId}:${row.vendorId}:${row.invoiceNumber}`))
      .map((row) => ({ row, vendorId: row.vendorId })),
  ];

  let createdCount = 0;
  const raceDuplicates: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < toCreate.length; i += INSERT_CHUNK_SIZE) {
        const chunk = toCreate.slice(i, i + INSERT_CHUNK_SIZE);
        const result = await tx.invoice.createMany({
          data: chunk.map((row) => ({
            organizationId: user.organizationId,
            locationId: row.locationId,
            vendorId: row.vendorId,
            invoiceNumber: row.invoiceNumber,
            amount: row.amount,
            date: row.date,
            vendorEmail: row.vendorEmail,
            status: "APPROVED",
            batchId: row.batchId,
            approvedById: user.id,
          })),
          skipDuplicates: true,
        });
        createdCount += result.count;
      }

      // Verify every intended row actually landed; anything missing lost a
      // concurrent race and is reported as a duplicate, never silently lost.
      if (toCreate.length > 0) {
        const inserted = await tx.invoice.findMany({
          where: {
            locationId: { in: [...new Set(toCreate.map((r) => r.locationId))] },
            vendorId: { in: [...new Set(toCreate.map((r) => r.vendorId))] },
            invoiceNumber: { in: toCreate.map((r) => r.invoiceNumber) },
          },
          select: { locationId: true, vendorId: true, invoiceNumber: true },
        });
        const insertedKeys = new Set(
          inserted.map((i) => `${i.locationId}:${i.vendorId}:${i.invoiceNumber}`),
        );
        for (const row of toCreate) {
          if (!insertedKeys.has(`${row.locationId}:${row.vendorId}:${row.invoiceNumber}`)) {
            raceDuplicates.push(row.id);
          }
        }
      }

      const approvedIds = toCreate
        .filter((row) => !raceDuplicates.includes(row.id))
        .map((row) => row.id);

      if (approvedIds.length > 0) {
        await tx.invoiceStaging.updateMany({
          where: { id: { in: approvedIds } },
          data: { status: StagingStatus.APPROVED, reviewedById: user.id },
        });
      }

      const rejectedIds = [...duplicates.map((d) => d.row.id), ...raceDuplicates];
      if (rejectedIds.length > 0) {
        await tx.invoiceStaging.updateMany({
          where: { id: { in: rejectedIds } },
          data: {
            status: StagingStatus.REJECTED,
            rejectReason: "Duplicate of an existing or concurrent invoice",
            reviewedById: user.id,
          },
        });
      }
    },
    { timeout: 30_000 },
  );

  await recordAudit(
    { id: user.id, email: user.email },
    user.organizationId,
    "INVOICES_APPROVED",
    "Invoice",
    batchId ?? "selection",
    { requested: pending.length, approved: createdCount, duplicates: duplicates.length + raceDuplicates.length },
  );

  sendSuccess(res, {
    message: `Approved ${createdCount} invoice(s). ${duplicates.length + raceDuplicates.length} duplicate(s) were skipped.`,
    approved: createdCount,
    duplicates: duplicates.length + raceDuplicates.length,
  });
}

// ---------------------------------------------------------------------------
// POST /api/upload/staging/reject — reject selected pending rows with a reason
// ---------------------------------------------------------------------------

export async function rejectStaging(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const scope = getLocationScope(user);
  const ids = parseIdList(req.body?.ids);
  const reason =
    typeof req.body?.reason === "string" && req.body.reason.trim()
      ? req.body.reason.trim().slice(0, 300)
      : "Rejected by reviewer";

  const result = await prisma.invoiceStaging.updateMany({
    where: { ...scope.where, status: StagingStatus.PENDING, id: { in: ids } },
    data: { status: StagingStatus.REJECTED, rejectReason: reason, reviewedById: user.id },
  });

  if (result.count === 0) {
    throw ApiError.badRequest("No matching pending rows to reject for your access scope");
  }

  await recordAudit(
    { id: user.id, email: user.email },
    user.organizationId,
    "INVOICES_REJECTED",
    "InvoiceStaging",
    "selection",
    { rejected: result.count, reason },
  );

  sendSuccess(res, { message: `Rejected ${result.count} row(s).`, rejected: result.count });
}

// ---------------------------------------------------------------------------
// GET /api/upload/batches — recent import batches for the scope
// ---------------------------------------------------------------------------

export async function getImportBatches(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const scope = getLocationScope(user);
  const { page, pageSize, skip } = getPagination(req.query, 20);

  const where: Prisma.ImportBatchWhereInput = { ...scope.where };

  const [data, total] = await prisma.$transaction([
    prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        fileName: true,
        status: true,
        totalRows: true,
        importedRows: true,
        duplicateRows: true,
        failedRows: true,
        failures: true,
        createdAt: true,
        location: { select: { id: true, code: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.importBatch.count({ where }),
  ]);

  sendSuccess(res, { data, page, pageSize, total });
}
