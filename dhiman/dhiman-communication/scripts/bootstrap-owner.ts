import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getArg(name: string) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const [{ env }, { connectToDatabase }, { bootstrapOwner }] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/db"),
    import("@/services/auth-service"),
  ]);

  await connectToDatabase();

  const owner = await bootstrapOwner({
    name: getArg("name") || "Primary Owner",
    email: getArg("email") || env.ownerEmail,
    password: getArg("password") || env.ownerPassword,
    phone: getArg("phone") || env.shopPhone,
    bootstrapCode: getArg("code") || env.ownerBootstrapCode,
  });

  console.log(`Owner account ready for ${owner.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
