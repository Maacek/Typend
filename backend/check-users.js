// Check users and their workspaces
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                workspaceId: true,
                workspace: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        console.log('Users:');
        users.forEach(u => {
            console.log(`- ${u.email} → workspace: ${u.workspace.name} (${u.workspaceId})`);
        });

        // Check which workspace the batches belong to
        const batches = await prisma.batch.findMany({
            select: {
                id: true,
                name: true,
                workspaceId: true,
            },
            take: 5
        });

        console.log('\nBatches:');
        batches.forEach(b => {
            console.log(`- ${b.name} → workspace: ${b.workspaceId}`);
        });

        // Check if there's a mismatch
        const uniqueWorkspaces = [...new Set(batches.map(b => b.workspaceId))];
        console.log('\nWorkspace IDs in use:', uniqueWorkspaces);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
