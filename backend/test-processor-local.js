const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { AnalysisProcessor } = require('./dist/batches/analysis.processor');

async function bootstrap() {
    console.log('Bootstrapping local NestJS app...');
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('App created. Getting processor...');
    const processor = app.get(AnalysisProcessor);

    console.log('Running process on existing creative...');
    // We need a recent creative ID from the db. Let's find one.
    const { PrismaService } = require('./dist/prisma/prisma.service');
    const prisma = app.get(PrismaService);
    const latestCreative = await prisma.creative.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!latestCreative) {
        console.error('No creative found in DB');
        await app.close();
        return;
    }

    console.log('Processing creative ID:', latestCreative.id);

    try {
        await processor.process({ data: { creativeId: latestCreative.id } });
        console.log('Processing succeeded!');
    } catch (err) {
        console.error('Processing FAILED:', err);
    }

    await app.close();
}

bootstrap().catch(console.error);
