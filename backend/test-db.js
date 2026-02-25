const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_87etWMXvjuEV@ep-spring-sun-agj4xvbn-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const prisma = new PrismaClient();
async function run() {
    const creative = await prisma.creative.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { status: true, id: true, filename: true }
    });
    console.log('Latest creative:', creative);
}
run().finally(() => prisma.$disconnect());
