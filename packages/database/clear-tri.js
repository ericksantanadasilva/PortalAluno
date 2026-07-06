const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.triReference.deleteMany({});
  console.log('Deleted all rows from triReference');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
