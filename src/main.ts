import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // เปิด Static file serving สำหรับรูปแปลนอาคาร (Blueprint Uploads)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // เปิด CORS เพื่อให้ Frontend (Next.js port 3000) ดึงข้อมูลและรูปภาพได้
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Indoor CMS API')
    .setDescription('Indoor CMS API Documentation & Specification')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Indoor Maps')
    .addTag('Booths')
    .addTag('Paths & Navigation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('cms', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/cms`);
}
bootstrap();
