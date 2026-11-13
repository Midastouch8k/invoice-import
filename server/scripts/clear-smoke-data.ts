import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Order matters: staging -> invoices -> batches -> audit -> vendors
  const staging = await prisma.invoiceStaging.deleteMany({});
  const invoices = await prisma.invoice.deleteMany({});
  const batches = await prisma.importBatch.deleteMany({});
  const audit = await prisma.auditLog.deleteMany({});
  const vendors = await prisma.vendor.deleteMany({});
  console.log(
    JSON.stringify({
      staging: staging.count,
      invoices: invoices.count,
      batches: batches.count,
      audit: audit.count,
      vendors: vendors.count,
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
