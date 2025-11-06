import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import {TransformInterceptor} from "./interceptors/response.interceptor";
import {AllExceptionsFilter} from "./common/filters/http-exception.filter";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import cookieParser from 'cookie-parser'; // 👈 Импортируем

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);


  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // удаляет лишние поля из body
      forbidNonWhitelisted: true, // выбрасывает ошибку если есть лишние поля
      transform: true,       // автоматически преобразует типы (string -> number)
    }),
  );


  // Serve static files from the docs folder under the /schema/doc path
  app.useStaticAssets(join(process.cwd(), 'docs'), {
    prefix: '/schema/doc',
  });

  app.useGlobalInterceptors(new TransformInterceptor())

  app.useGlobalFilters(new AllExceptionsFilter())

  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('The ERP API')
    .setVersion('1.0')
    .setContact('API Support', '@hy_21', 'support@gmail.com')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'x-tenant-key', in: 'header' },
      'x-tenant-key', // <-- идентификатор схемы безопасности
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    // include: [AppModule],
    // extraModels: [MovieDto],
    // operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('/docs', app, document, {
    jsonDocumentUrl: '/swagger-json',
    yamlDocumentUrl: '/swagger-yaml',
    customSiteTitle: 'ERP API',
    // customSwaggerUiPath: '/swagger',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
