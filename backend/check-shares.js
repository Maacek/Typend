// Check database for batches with share tokens
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBatches() {
    try {
        const batches = await prisma.batch.findMany({
            select: {
                id: true,
                name: true,
                shareToken: true,
                shareSlug: true,
                isPublic: true,
            },
            take: 10
        });

        console.log('Batches in database:');
        console.log(JSON.stringify(batches, null, 2));

        const publicBatches = batches.filter(b => b.isPublic);
        console.log(`\nPublic batches: ${publicBatches.length}/${batches.length}`);

        if (publicBatches.length > 0) {
            console.log('\nPublic batch examples:');
            publicBatches.forEach(b => {
                const identifier = b.shareSlug || b.shareToken;
                console.log(`- ${b.name}: /share/${identifier}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBatches();
