import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { TransformInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import * as qs from 'qs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const server = app.getHttpAdapter().getInstance();
  server.set('query parser', (str: string) =>
    qs.parse(str, {
      allowDots: true,
      allowSparse: true,
    }),
  );
  
  const allowedOrigins =
    process.env.FRONTEND_URLS?.split(',').map((o) => o.trim()) ?? [];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'docs'), {
    prefix: '/schema/doc',
  });


  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());

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

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
