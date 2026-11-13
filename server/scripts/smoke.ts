// Smoke script touches arbitrary API payloads; `any` keeps it terse on purpose.
/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE = "http://localhost:8080";
const PASSWORD = "Password123!";
const ADMIN_EMAIL = "michael.tucker@meridianfg.com";
const AUDITOR_EMAIL = "elena.vasquez@meridianfg.com";
const CLERK_EMAIL = "priya.raman@meridianfg.com";

type Json = Record<string, any>;

async function post(path: string, token?: string, body?: unknown): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
}

async function get(path: string, token?: string): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
}

async function upload(token: string, csv: string, fileName: string, locationId: string) {
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), fileName);
  form.append("locationId", locationId);
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Json };
}

async function main() {
  const results: Array<[string, string, boolean]> = [];
  const check = (name: string, detail: string, ok: boolean) => {
    results.push([ok ? "PASS" : "FAIL", name, detail]);
  };

  // 1. Auth guard: protected route without token
  const noAuth = await get("/api/upload/staging");
  check("protected route rejects anonymous", `status=${noAuth.status}`, noAuth.status === 401);

  // 2. Login
  const badLogin = await post("/api/auth/login", undefined, { email: ADMIN_EMAIL, password: "wrong" });
  check("wrong password rejected", `status=${badLogin.status}`, badLogin.status === 401);

  const login = await post("/api/auth/login", undefined, { email: ADMIN_EMAIL, password: PASSWORD });
  check("admin login", `status=${login.status}`, login.status === 200 && typeof login.json.token === "string");
  const token = login.json.token as string;
  const locations = (login.json.user?.locations as Json[]) ?? [];
  const locationId = (locations.find((l) => l.name === "Downtown Flagship") ?? locations[0])?.id as string;
  check("session returns locations", `locations=${locations.length}`, !!locationId);

  // 3. Upload CSV with good rows, dupes, and invalid rows
  const runTag = Math.random().toString(36).substring(2, 6).toUpperCase();
  const inv1 = `SMK-${runTag}-9001`;
  const inv2 = `SMK-${runTag}-9002`;
  const inv3 = `SMK-${runTag}-9003`;
  const inv4 = `SMK-${runTag}-9004`;
  const inv5 = `SMK-${runTag}-9005`;
  const inv6 = `SMK-${runTag}-9006`;
  const csv = [
    "invoice_number,amount,date,vendor_name,vendor_email",
    `${inv1},100.50,2026-01-15,Acme Supplies,billing@acme.com`,
    `${inv2},250,1/20/2026,Acme Supplies,billing@acme.com`,
    `${inv3},99.99,2026-02-01,Globex,office@globex.io`,
    `${inv1},100.50,2026-01-15,Acme Supplies,billing@acme.com`,
    ",42.00,2026-02-02,Bad Row",
    `${inv4},abc,2026-02-03,Bad Row`,
    `${inv5},0,2026-02-04,Bad Row`,
    `${inv6},75.25,2026-13-40,Bad Row`,
  ].join("\n");

  const upload1 = await upload(token, csv, "smoke-batch-1.csv", locationId);
  const batchId1 = upload1.json.batchId as string;
  check(
    "upload validates rows",
    `status=${upload1.status} batch=${batchId1} imported=${upload1.json.importedRows} failed=${upload1.json.failedRows} dupes=${upload1.json.duplicateRows}`,
    upload1.status === 200 && !!batchId1 && upload1.json.importedRows === 3 && upload1.json.failedRows === 4 && upload1.json.duplicateRows === 1,
  );
  check("failure details reported", `first=${upload1.json.failures?.[0]?.error}`, Array.isArray(upload1.json.failures) && upload1.json.failures.length === 4);

  // 4. Staging list, filtered to this batch (the DB may hold seeded rows too)
  const staging = await get("/api/upload/staging?status=ALL&pageSize=100", token);
  const rows1 = ((staging.json.data as Json[]) ?? []).filter((r) => r.batchId === batchId1);
  check(
    "staging lists uploaded batch rows",
    `batchRows=${rows1.length} total=${staging.json.total}`,
    staging.status === 200 && rows1.length === 3,
  );

  // 5. Approve this batch's pending rows
  const pendingIds1 = rows1.filter((r) => r.status === "PENDING").map((r) => r.id);
  const approve = await post("/api/upload/approve", token, { ids: pendingIds1 });
  check(
    "approve moves rows to ledger",
    `approved=${approve.json.approved} dupes=${approve.json.duplicates}`,
    approve.status === 200 && approve.json.approved === 3 && approve.json.duplicates === 0,
  );

  // 6. Re-upload + re-approve same file → all duplicates this time
  const upload2 = await upload(token, csv, "smoke-batch-2.csv", locationId);
  const batchId2 = upload2.json.batchId as string;
  check(
    "second upload stages rows",
    `status=${upload2.status} batch=${batchId2} imported=${upload2.json.importedRows}`,
    upload2.status === 200 && !!batchId2 && upload2.json.importedRows === 3,
  );

  const staging2 = await get("/api/upload/staging?status=ALL&pageSize=100", token);
  const pendingIds2 = ((staging2.json.data as Json[]) ?? [])
    .filter((r) => r.batchId === batchId2 && r.status === "PENDING")
    .map((r) => r.id);
  const approve2 = await post("/api/upload/approve", token, { ids: pendingIds2 });
  check(
    "re-approving same file yields duplicates only",
    `approved=${approve2.json.approved} dupes=${approve2.json.duplicates}`,
    approve2.status === 200 && approve2.json.approved === 0 && approve2.json.duplicates === 3,
  );

  // 7. Ledger shows approved invoices
  const invoices = await get("/api/invoices?pageSize=100", token);
  const invMatch = (invoices.json.data as Json[])?.find((i) => i.invoiceNumber === inv1);
  check(
    "ledger lists invoices with vendor + decimal amounts",
    `total=${invoices.json.total} ${inv1}.amount=${invMatch?.amount} vendor=${invMatch?.vendor?.name}`,
    invoices.status === 200 && invoices.json.total >= 3 && invMatch?.amount === 100.5 && invMatch?.vendor?.name === "Acme Supplies",
  );

  // 8. Both smoke batches are identifiable in the audit trail
  const audit = await get("/api/upload/staging?status=ALL&pageSize=100", token);
  const smokeRows = ((audit.json.data as Json[]) ?? []).filter(
    (r) => r.batchId === batchId1 || r.batchId === batchId2,
  );
  const approvedRows = smokeRows.filter((r) => r.status === "APPROVED");
  const rejectedRows = smokeRows.filter((r) => r.status === "REJECTED");
  check(
    "approved staging rows kept for audit, duplicates rejected",
    `approved=${approvedRows.length} rejected=${rejectedRows.length} smokeRows=${smokeRows.length}`,
    approvedRows.length === 3 && rejectedRows.length === 3 && smokeRows.length === 6,
  );

  // 9. Auditor role can read but not write
  const auditorLogin = await post("/api/auth/login", undefined, { email: AUDITOR_EMAIL, password: PASSWORD });
  const auditorToken = auditorLogin.json.token as string;
  const auditorRead = await get("/api/invoices?pageSize=5", auditorToken);
  const auditorWrite = await post("/api/upload/approve", auditorToken, {});
  check(
    "auditor read-only enforced",
    `read=${auditorRead.status} write=${auditorWrite.status}`,
    auditorRead.status === 200 && auditorWrite.status === 403,
  );

  // 10. Clerk scope: Priya (DT-101 only) cannot upload to another location
  const clerkLogin = await post("/api/auth/login", undefined, { email: CLERK_EMAIL, password: PASSWORD });
  const clerkToken = clerkLogin.json.token as string;
  const otherLocation = locations.find((l) => l.name !== "Downtown Flagship")!;
  const otherCsv = `invoice_number,amount,date\nSMK-${runTag}-7777,10.00,2026-03-01\n`;
  const clerkUpload = await upload(clerkToken, otherCsv, "other.csv", otherLocation.id as string);
  check(
    "clerk cannot upload to another location",
    `location=${otherLocation.code} status=${clerkUpload.status}`,
    clerkUpload.status === 403,
  );

  console.log("\n=== SMOKE TEST RESULTS ===");
  for (const [status, name, detail] of results) {
    console.log(`${status}  ${name}  (${detail})`);
  }
  const failed = results.filter((r) => r[0] === "FAIL");
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
