const BASE = "http://localhost:8080";

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

async function main() {
  const results: Array<[string, string, boolean]> = [];
  const check = (name: string, detail: string, ok: boolean) => {
    results.push([ok ? "PASS" : "FAIL", name, detail]);
  };

  // 1. Auth guard: protected route without token
  const noAuth = await get("/api/upload/staging");
  check("protected route rejects anonymous", `status=${noAuth.status}`, noAuth.status === 401);

  // 2. Login
  const badLogin = await post("/api/auth/login", undefined, { email: "admin@demo.com", password: "wrong" });
  check("wrong password rejected", `status=${badLogin.status}`, badLogin.status === 401);

  const login = await post("/api/auth/login", undefined, { email: "admin@demo.com", password: "Password123!" });
  check("admin login", `status=${login.status}`, login.status === 200 && typeof login.json.token === "string");
  const token = login.json.token as string;
  const locationId = login.json.user?.locations?.[0]?.id as string;
  check("session returns locations", `locations=${login.json.user?.locations?.length}`, !!locationId);

  // 3. Upload CSV with good rows, dupes, and invalid rows
  const csv = [
    "invoice_number,amount,date,vendor_name,vendor_email",
    "INV-9001,100.50,2026-01-15,Acme Supplies,billing@acme.com",
    "INV-9002,250,1/20/2026,Acme Supplies,billing@acme.com",
    "INV-9003,99.99,2026-02-01,Globex,office@globex.io",
    "INV-9001,100.50,2026-01-15,Acme Supplies,billing@acme.com",
    ",42.00,2026-02-02,Bad Row",
    "INV-9004,abc,2026-02-03,Bad Row",
    "INV-9005,0,2026-02-04,Bad Row",
    "INV-9006,75.25,2026-13-40,Bad Row",
  ].join("\n");

  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "smoke.csv");
  form.append("locationId", locationId);
  const uploadRes = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadJson = (await uploadRes.json()) as Json;
  check(
    "upload validates rows",
    `status=${uploadRes.status} imported=${uploadJson.importedRows} failed=${uploadJson.failedRows} dupes=${uploadJson.duplicateRows}`,
    uploadRes.status === 200 && uploadJson.importedRows === 3 && uploadJson.failedRows === 4 && uploadJson.duplicateRows === 1,
  );
  check("failure details reported", `first=${uploadJson.failures?.[0]?.error}`, Array.isArray(uploadJson.failures) && uploadJson.failures.length === 4);

  // 4. Staging list (scoped + paginated)
  const staging = await get("/api/upload/staging?pageSize=100", token);
  check(
    "staging lists pending rows",
    `total=${staging.json.total}`,
    staging.status === 200 && staging.json.total === 3,
  );

  // 5. Approve everything pending
  const approve = await post("/api/upload/approve", token, {});
  check(
    "approve moves rows to ledger",
    `approved=${approve.json.approved} dupes=${approve.json.duplicates}`,
    approve.status === 200 && approve.json.approved === 3,
  );

  // 6. Re-approve same file → all duplicates this time
  const form2 = new FormData();
  form2.append("file", new Blob([csv], { type: "text/csv" }), "smoke2.csv");
  form2.append("locationId", locationId);
  const upload2 = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form2,
  });
  await upload2.json();
  const approve2 = await post("/api/upload/approve", token, {});
  check(
    "re-approving same file yields duplicates only",
    `approved=${approve2.json.approved} dupes=${approve2.json.duplicates}`,
    approve2.status === 200 && approve2.json.approved === 0 && approve2.json.duplicates === 3,
  );

  // 7. Ledger shows approved invoices
  const invoices = await get("/api/invoices?pageSize=10", token);
  const inv9001 = (invoices.json.data as Json[])?.find((i) => i.invoiceNumber === "INV-9001");
  check(
    "ledger lists invoices with vendor + decimal amounts",
    `total=${invoices.json.total} inv9001.amount=${inv9001?.amount} vendor=${inv9001?.vendor?.name}`,
    invoices.status === 200 && invoices.json.total >= 3 && inv9001?.amount === 100.5 && inv9001?.vendor?.name === "Acme Supplies",
  );

  // 8. Reject endpoint with row ids
  const stagingEmpty = await get("/api/upload/staging?status=ALL&pageSize=100", token);
  const approvedRows = (stagingEmpty.json.data as Json[])?.filter((r) => r.status === "APPROVED") ?? [];
  const rejectedRows = (stagingEmpty.json.data as Json[])?.filter((r) => r.status === "REJECTED") ?? [];
  check(
    "approved staging rows kept for audit, duplicates rejected",
    `approved=${approvedRows.length} rejected=${rejectedRows.length} total=${stagingEmpty.json.total}`,
    approvedRows.length === 3 && rejectedRows.length === 3 && stagingEmpty.json.total === 6,
  );

  // 9. Auditor role can read but not write
  const auditorLogin = await post("/api/auth/login", undefined, { email: "auditor@demo.com", password: "Password123!" });
  const auditorToken = auditorLogin.json.token as string;
  const auditorRead = await get("/api/invoices?pageSize=5", auditorToken);
  const auditorWrite = await post("/api/upload/approve", auditorToken, {});
  check(
    "auditor read-only enforced",
    `read=${auditorRead.status} write=${auditorWrite.status}`,
    auditorRead.status === 200 && auditorWrite.status === 403,
  );

  // 10. Clerk scope: ST-001 clerk cannot approve another location's rows
  const clerkLogin = await post("/api/auth/login", undefined, { email: "clerk@demo.com", password: "Password123!" });
  const clerkToken = clerkLogin.json.token as string;
  const otherLocation = (login.json.user?.locations as Json[])?.find((l) => l.name !== "Downtown Store");
  const otherCsv = "invoice_number,amount,date\nINV-7777,10.00,2026-03-01\n";
  const form3 = new FormData();
  form3.append("file", new Blob([otherCsv], { type: "text/csv" }), "other.csv");
  form3.append("locationId", otherLocation.id);
  const clerkUpload = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${clerkToken}` },
    body: form3,
  });
  const clerkUploadJson = await clerkUpload.json();
  check(
    "clerk cannot upload to another location",
    `status=${clerkUpload.status}`,
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
