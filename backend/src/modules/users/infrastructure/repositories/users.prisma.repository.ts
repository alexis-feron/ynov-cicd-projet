import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../prisma/prisma.service";
import { Role, User } from "../../domain/entities/user.entity";
import {
  CreateUserData,
  IUserRepository,
} from "../../domain/repositories/user.repository.interface";

@Injectable()
export class UsersPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        username: data.username,
        displayName: data.displayName,
        role: data.role ?? "READER",
      },
    });
    return this.toDomain(record);
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email, deletedAt: null },
    });
    return count > 0;
  }

  async usernameExists(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { username, deletedAt: null },
    });
    return count > 0;
  }

  private toDomain(record: {
    id: string;
    email: string;
    password: string;
    username: string;
    displayName: string;
    avatar: string | null;
    role: string;
    isActive: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User({
      id: record.id,
      email: record.email,
      password: record.password,
      username: record.username,
      displayName: record.displayName,
      avatar: record.avatar,
      role: record.role as Role,
      isActive: record.isActive,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
