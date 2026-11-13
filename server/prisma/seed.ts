import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const organization = await prisma.organization.upsert({
    where: { id: "seed-org-demo-franchise" },
    update: { name: "Demo Franchise Co." },
    create: { id: "seed-org-demo-franchise", name: "Demo Franchise Co." },
  });

  const locationData = [
    { code: "ST-001", name: "Downtown Store" },
    { code: "ST-002", name: "Riverside Store" },
    { code: "ST-003", name: "Airport Store" },
  ];

  const locations = {} as Record<string, { id: string; code: string; name: string }>;
  for (const data of locationData) {
    locations[data.code] = await prisma.location.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: data.code } },
      update: { name: data.name },
      create: { ...data, organizationId: organization.id },
    });
  }

  const users = [
    { email: "admin@demo.com", name: "Avery Admin", role: "HQ_ADMIN", locationCodes: [] as string[] },
    { email: "manager@demo.com", name: "Morgan Manager", role: "REGIONAL_MANAGER", locationCodes: [] },
    { email: "clerk@demo.com", name: "Casey Clerk", role: "AP_CLERK", locationCodes: ["ST-001"] },
    { email: "clerk2@demo.com", name: "Rowan Clerk", role: "AP_CLERK", locationCodes: ["ST-002", "ST-003"] },
    { email: "auditor@demo.com", name: "Audrey Auditor", role: "AUDITOR", locationCodes: [] },
  ] as const;

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        organizationId: organization.id,
      },
    });

    const locationIds = (user.locationCodes.length > 0
      ? user.locationCodes.map((code) => locations[code].id)
      : Object.values(locations).map((l) => l.id)
    ).filter(Boolean);

    for (const locationId of locationIds) {
      await prisma.userLocation.upsert({
        where: { userId_locationId: { userId: created.id, locationId } },
        update: {},
        create: { userId: created.id, locationId },
      });
    }
  }

  console.log("Seed complete. Organization:", organization.name);
  console.log("Locations:", locationData.map((l) => l.code).join(", "));
  console.log("Users (password: " + DEMO_PASSWORD + "):");
  for (const user of users) {
    console.log(`  ${user.role.padEnd(16)} ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
