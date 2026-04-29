import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { PostsService } from "./application/posts.service";
import { POST_REPOSITORY } from "./domain/repositories/post.repository.interface";
import { PostsPrismaRepository } from "./infrastructure/repositories/posts.prisma.repository";
import { PostsController } from "./presentation/posts.controller";

/**
 * Design pattern : Dependency Inversion via token Symbol.
 * PostsService dépend de IPostRepository (interface),
 * NestJS injecte PostsPrismaRepository (implémentation concrète).
 * Pour les tests, on substitue avec un mock sans changer le service.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PostsController],
  providers: [
    PostsService,
    {
      provide: POST_REPOSITORY,
      useClass: PostsPrismaRepository,
    },
  ],
  exports: [PostsService],
})
export class PostsModule {}

