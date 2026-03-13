import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS for NextJS frontend and Mobile Flutter app
  app.enableCors({
    origin: '*', // For MVP. Restrict later.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Global Validation Pipe to automatically strip unexpected properties and validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // More lenient for now to avoid blocking requests with extra fields
      transform: true,
    }),
  );

  // 3. Setup Swagger for API documentation
  const config = new DocumentBuilder()
    .setTitle('AgriPlan API')
    .setDescription('The AgriPlan backend platform for Kazakhstan farmers and buyers.')
    .setVersion('1.0')
    .addBearerAuth() // for JWT token injection in Swagger UI
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
  console.log(`API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
