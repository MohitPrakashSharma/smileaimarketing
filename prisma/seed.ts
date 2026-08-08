import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "hello@smileaimarketing.com";
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("admin123", salt);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Lead Orchestrator Admin",
        passwordHash,
        role: "SUPERADMIN",
      },
    });
    console.log("Admin user seeded: hello@smileaimarketing.com / admin123");
  } else {
    console.log("Admin user already exists");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
