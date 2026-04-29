import { Post, TagRef } from "../../domain/entities/post.entity";

export class PostResponseDto {
  id!: string;
  title!: string;
  slug!: string;
  content!: string;
  excerpt!: string | null;
  status!: string;
  authorId!: string;
  categoryId!: string | null;
  tags!: TagRef[];
  publishedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(post: Post): PostResponseDto {
    const dto = new PostResponseDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.slug = post.slug;
    dto.content = post.content;
    dto.excerpt = post.excerpt;
    dto.status = post.status;
    dto.authorId = post.authorId;
    dto.categoryId = post.categoryId;
    dto.tags = post.tags;
    dto.publishedAt = post.publishedAt;
    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;
    return dto;
  }
}

export class PaginatedPostsResponseDto {
  data!: PostResponseDto[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
