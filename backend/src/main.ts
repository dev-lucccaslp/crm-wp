import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { Server } from 'socket.io';

import { AppModule } from './app.module';
import { WsGateway } from './infra/websocket/ws.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  const corsOrigin = process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173';
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = Number(process.env.BACKEND_PORT ?? 3333);
  await app.listen(port);

  const httpServer = app.getHttpServer();
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    path: '/socket.io',
  });
  app.get(WsGateway).attachServer(io);

  app.get(Logger).log(`🚀 backend ready on http://localhost:${port}`);
}
bootstrap();
