import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('Worker is running...');
    // The worker will be driven by BullMQ listeners defined in the module
}
bootstrap();
