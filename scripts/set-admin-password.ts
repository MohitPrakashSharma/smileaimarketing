/**
 * Sets (or resets) a user's login password. The password is read from a
 * hidden prompt so it never lands in shell history.
 *
 *   npx tsx scripts/set-admin-password.ts [email]
 *
 * Defaults to the seeded admin, hello@smileaimarketing.com.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.argv[2] ?? "hello@smileaimarketing.com";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(130);
        if (c === "\u007f") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user with email ${email}. Run \`npx prisma db seed\` to create the admin.`);
      process.exit(1);
    }

    const password = await promptHidden(`New password for ${email}: `);
    // The login route rejects anything shorter than 6 characters.
    if (password.length < 6) {
      console.error("Password must be at least 6 characters.");
      process.exit(1);
    }
    const confirm = await promptHidden("Confirm password: ");
    if (password !== confirm) {
      console.error("Passwords do not match.");
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    console.log(`Password updated for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
  process.exit(0);
}

main();
