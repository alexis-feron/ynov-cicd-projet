import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UsersService } from "./application/users.service";
import { USER_REPOSITORY } from "./domain/repositories/user.repository.interface";
import { UsersPrismaRepository } from "./infrastructure/repositories/users.prisma.repository";

@Module({
  imports: [PrismaModule],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: UsersPrismaRepository },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
