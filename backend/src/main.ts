import helmet from "@fastify/helmet";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true }, // buffer until Pino logger is ready
  );

  // Replace the default NestJS logger with PinoLogger
  app.useLogger(app.get(Logger));

  // Helmet - doit être enregistré avant les autres middlewares
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans les DTOs
      forbidNonWhitelisted: true,
      transform: true, // convertit automatiquement les types (ex: string → number)
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port, "0.0.0.0");

  const logger = app.get(Logger);
  logger.log(`Backend running on http://0.0.0.0:${port}`);
}

bootstrap();
