import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  // Serve static files from the docs folder under the /schema/doc path
  app.useStaticAssets(join(process.cwd(), 'docs'), {
    prefix: '/schema/doc',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
