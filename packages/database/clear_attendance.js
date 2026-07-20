const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.attendanceRecord.deleteMany({});
    console.log("Deleted all attendance records.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
