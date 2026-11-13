import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [staging, invoices] = await Promise.all([
    prisma.invoiceStaging.count(),
    prisma.invoice.count(),
  ]);
  console.log(JSON.stringify({ reachable: true, staging, invoices }));
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ reachable: false, error: String(e).slice(0, 300) }));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
