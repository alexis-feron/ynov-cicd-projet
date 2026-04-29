import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../prisma/prisma.service";
import { Post, PostStatus, TagRef } from "../../domain/entities/post.entity";
import {
  CreatePostData,
  FindAllOptions,
  IPostRepository,
  PaginatedPosts,
  UpdatePostData,
} from "../../domain/repositories/post.repository.interface";

// Type Prisma avec les relations chargées
type PostWithRelations = Prisma.PostGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

const POST_INCLUDE = {
  tags: { include: { tag: true } },
} as const;

/**
 * Implémentation Prisma du repository.
 * Applique le soft delete sur toutes les requêtes (deletedAt: null).
 */
@Injectable()
export class PostsPrismaRepository implements IPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({
    page,
    limit,
    status,
    authorId,
    categoryId,
    tag,
    includeDeleted = false,
  }: FindAllOptions): Promise<PaginatedPosts> {
    const where: Prisma.PostWhereInput = {
      ...(!includeDeleted && { deletedAt: null }),
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(categoryId && { categoryId }),
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
    };

    const [records, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { data: records.map(this.toDomain), total };
  }

  async findById(id: string): Promise<Post | null> {
    const record = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: POST_INCLUDE,
    });
    return record ? this.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Post | null> {
    const record = await this.prisma.post.findFirst({
      where: { slug, deletedAt: null },
      include: POST_INCLUDE,
    });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreatePostData): Promise<Post> {
    const record = await this.prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt ?? null,
        status: data.status,
        authorId: data.authorId,
        categoryId: data.categoryId ?? null,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: POST_INCLUDE,
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdatePostData): Promise<Post> {
    const record = await this.prisma.post.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.publishedAt !== undefined && {
          publishedAt: data.publishedAt,
        }),
        // Remplacement complet des tags : supprime les anciens, recrée
        ...(data.tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: data.tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: POST_INCLUDE,
    });
    return this.toDomain(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.post.count({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  private toDomain(record: PostWithRelations): Post {
    const tags: TagRef[] = record.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
    }));

    return new Post({
      id: record.id,
      title: record.title,
      slug: record.slug,
      content: record.content,
      excerpt: record.excerpt,
      status: record.status as PostStatus,
      authorId: record.authorId,
      categoryId: record.categoryId,
      tags,
      publishedAt: record.publishedAt,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
