import { Prisma, InvoiceStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../db/index";
import { getLocationScope } from "../utils/scope";
import { getPagination } from "../utils/pagination";
import { sendSuccess } from "../utils/response";

const invoiceSelection = {
  id: true,
  invoiceNumber: true,
  amount: true,
  date: true,
  vendorEmail: true,
  status: true,
  batchId: true,
  createdAt: true,
  vendor: { select: { id: true, name: true } },
  location: { select: { id: true, code: true, name: true } },
} satisfies Prisma.InvoiceSelect;

type InvoiceRow = Prisma.InvoiceGetPayload<{ select: typeof invoiceSelection }>;

function serializeInvoice(row: InvoiceRow) {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

// GET /api/invoices — paginated, scoped approved-invoice ledger
export async function listInvoices(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const scope = getLocationScope(user);
  const { page, pageSize, skip } = getPagination(req.query);

  const statusParam = String(req.query.status ?? "ALL").toUpperCase();
  const status =
    statusParam !== "ALL" && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)
      ? (statusParam as InvoiceStatus)
      : undefined;

  const requestedLocationId = typeof req.query.locationId === "string" ? req.query.locationId : "";
  if (requestedLocationId && scope.where.locationId) {
    // Non org-wide users may only ever query their own locations.
    if (!scope.locationIds.includes(requestedLocationId)) {
      return sendSuccess(res, { data: [], page, pageSize, total: 0 });
    }
  }

  const where: Prisma.InvoiceWhereInput = {
    ...scope.where,
    ...(status ? { status } : {}),
    ...(requestedLocationId ? { locationId: requestedLocationId } : {}),
    ...(typeof req.query.from === "string" && req.query.from
      ? { date: { ...(typeof req.query.to === "string" && req.query.to ? { lte: new Date(`${req.query.to}T00:00:00Z`) } : {}), gte: new Date(`${req.query.from}T00:00:00Z`) } }
      : typeof req.query.to === "string" && req.query.to
        ? { date: { lte: new Date(`${req.query.to}T00:00:00Z`) } }
        : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      select: invoiceSelection,
    }),
    prisma.invoice.count({ where }),
  ]);

  sendSuccess(res, {
    data: data.map(serializeInvoice),
    page,
    pageSize,
    total,
  });
}
