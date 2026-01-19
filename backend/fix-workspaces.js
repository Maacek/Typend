// Fix workspace assignment - move batches to ondrej.macku@gmail.com workspace
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWorkspaces() {
    try {
        const targetWorkspaceId = 'cmkg2odby0003f1gstlpxoujs'; // Ondra's Workspace

        // Update all batches to belong to Ondra's workspace
        const result = await prisma.batch.updateMany({
            where: {
                workspaceId: 'default-workspace'
            },
            data: {
                workspaceId: targetWorkspaceId
            }
        });

        console.log(`✅ Updated ${result.count} batches to workspace: ${targetWorkspaceId}`);

        // Verify
        const batches = await prisma.batch.findMany({
            select: {
                id: true,
                name: true,
                workspaceId: true
            },
            take: 5
        });

        console.log('\nVerification - Batches now:');
        batches.forEach(b => {
            console.log(`- ${b.name} → workspace: ${b.workspaceId}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixWorkspaces();
