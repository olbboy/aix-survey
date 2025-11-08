import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS configuration - allow frontend access
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe - transform and validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,              // Auto-transform payloads to DTO instances
      whitelist: true,               // Strip properties not in DTO
      forbidNonWhitelisted: true,    // Throw error if unknown properties
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter - standardize error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor - log all requests/responses
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('AI Maturity Assessment API')
    .setDescription(
      `
      ## Overview
      RESTful API for the AI Maturity Assessment Platform.

      ## Authentication
      This API uses JWT Bearer tokens for authentication.
      Register a user, login to get a token, then use the token in the Authorization header.

      ## Rate Limiting
      API calls are rate limited to prevent abuse.
      - Auth endpoints: 5 requests per minute
      - API endpoints: 100 requests per minute

      ## Support
      For API support, contact: support@aix-survey.com
      `
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Health', 'Service health checks and status')
    .addTag('Authentication', 'User authentication and authorization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AIX Survey API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(`🚀 Backend is running on: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  Logger.log(`🏥 Health Check: http://localhost:${port}/api/health`, 'Bootstrap');
}

bootstrap();
