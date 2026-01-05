import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    // Using 3333 to avoid conflict with current Express server on 5000 during migration
    // or use process.env.PORT if ready to switch
    const port = process.env.PORT || 3333;

    await app.listen(port);
    console.log(`NestJS Server running on port ${port}`);
}
bootstrap();
