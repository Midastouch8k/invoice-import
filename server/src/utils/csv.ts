import { Readable } from "stream";
import csvParser from "csv-parser";

export type ParsedRow = {
  invoiceNumber: string;
  vendorName: string | null;
  vendorEmail: string | null;
  /** Decimal-safe amount string, e.g. "100.50" */
  amount: string;
  /** ISO date string, e.g. "2024-05-01" */
  date: string;
  raw: Record<string, string>;
};

export type RowFailure = { row: number; error: string };

/** Max integer digits for DECIMAL(12,2) minus 2 decimal places. */
const MAX_AMOUNT = 9_999_999_999.99;

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function pickColumn(row: Record<string, string>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

function normalizeInvoiceNumber(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) throw new Error("Missing invoice_number");
  if (value.length > 64) throw new Error("Invoice number is longer than 64 characters");
  // \u0000 is rejected on purpose: NUL bytes break DB storage and exports.
  // eslint-disable-next-line no-control-regex
  if (/[\r\n\u0000]/.test(value)) throw new Error("Invoice number contains invalid characters");
  return value;
}

function normalizeAmount(raw: string | undefined): string {
  let value = (raw ?? "").trim();
  if (!value) throw new Error("Missing amount");

  let negative = false;
  if (/^\(.+\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }
  value = value.replace(/[$,\s]/g, "");
  if (value.startsWith("-")) {
    negative = !negative;
    value = value.slice(1);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error(`Invalid amount "${raw}"`);
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount > MAX_AMOUNT) {
    throw new Error(`Amount ${raw} exceeds DECIMAL(12,2) range`);
  }
  if (amount === 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (negative) {
    throw new Error("Negative amounts are not supported (use a credit memo process)");
  }
  return value;
}

function normalizeDate(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) throw new Error("Missing date");

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === value) {
      return value;
    }
    throw new Error(`Invalid date "${raw}"`);
  }

  // US format M/D/YYYY
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = Date.parse(`${iso}T00:00:00Z`);
    if (!Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === iso) {
      return iso;
    }
  }
  throw new Error(`Unrecognized date "${raw}" (use YYYY-MM-DD or M/D/YYYY)`);
}

function normalizeVendorName(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.length > 120) throw new Error("Vendor name is longer than 120 characters");
  return value;
}

function normalizeVendorEmail(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.length > 200) throw new Error("Vendor email is longer than 200 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`Invalid vendor email "${raw}"`);
  }
  return value;
}

function parseCsvBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];
    const stream = Readable.from(buffer).pipe(csvParser());
    stream.on("data", (row: Record<string, string>) => results.push(row));
    stream.on("end", () => resolve(results));
    stream.on("error", (error: unknown) => reject(error));
  });
}

/**
 * Parses an uploaded CSV into validated staging rows and per-row failures.
 * Bad rows never silently become $0.00 invoices — they are reported.
 */
export async function parseInvoiceCsv(
  buffer: Buffer,
): Promise<{ rows: ParsedRow[]; failures: RowFailure[] }> {
  // Strip a UTF-8 BOM if present so the header parses cleanly.
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const records = await parseCsvBuffer(Buffer.from(text));

  const rows: ParsedRow[] = [];
  const failures: RowFailure[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +2: header is row 1, data starts at row 2
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      normalized[normalizeHeaderKey(key)] = value;
    }

    try {
      rows.push({
        invoiceNumber: normalizeInvoiceNumber(pickColumn(normalized, ["invoice_number", "invoicenumber"])),
        vendorName: normalizeVendorName(pickColumn(normalized, ["vendor_name", "vendorname", "vendor"])),
        vendorEmail: normalizeVendorEmail(pickColumn(normalized, ["vendor_email", "vendoremail"])),
        amount: normalizeAmount(pickColumn(normalized, ["amount"])),
        date: normalizeDate(pickColumn(normalized, ["date", "invoice_date"])),
        raw: record,
      });
    } catch (error) {
      failures.push({ row: rowNumber, error: (error as Error).message });
    }
  });

  return { rows, failures };
}
