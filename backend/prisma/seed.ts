import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const workspace = await prisma.workspace.upsert({
        where: { id: 'default-workspace' },
        update: {},
        create: {
            id: 'default-workspace',
            name: 'Moje Agentura',
        },
    });

    const user = await prisma.user.upsert({
        where: { email: 'admin@agentura.cz' },
        update: {},
        create: {
            email: 'admin@agentura.cz',
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
            workspaceId: workspace.id,
        } as any,
    });

    console.log({ workspace, user });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
