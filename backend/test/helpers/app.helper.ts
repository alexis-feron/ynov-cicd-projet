import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../../src/app.module";

/**
 * Démarre une instance NestJS complète pour les tests d'intégration.
 * Les variables d'environnement doivent être définies AVANT l'appel.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  // Fastify doit être prêt avant que Supertest puisse émettre des requêtes
  await app.getHttpAdapter().getInstance().ready();

  return app;
}
