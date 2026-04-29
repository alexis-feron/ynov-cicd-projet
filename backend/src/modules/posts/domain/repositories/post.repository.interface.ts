import { Post, PostStatus } from "../entities/post.entity";

export interface FindAllOptions {
  page: number;
  limit: number;
  status?: PostStatus;
  authorId?: string;
  categoryId?: string;
  tag?: string;
  includeDeleted?: boolean;
}

export interface PaginatedPosts {
  data: Post[];
  total: number;
}

export interface CreatePostData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: PostStatus;
  authorId: string;
  categoryId?: string;
  tagIds?: string[];
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: PostStatus;
  categoryId?: string | null;
  tagIds?: string[];
  publishedAt?: Date | null;
}

export const POST_REPOSITORY = Symbol("POST_REPOSITORY");

export interface IPostRepository {
  findAll(options: FindAllOptions): Promise<PaginatedPosts>;
  findById(id: string): Promise<Post | null>;
  findBySlug(slug: string): Promise<Post | null>;
  create(data: CreatePostData): Promise<Post>;
  update(id: string, data: UpdatePostData): Promise<Post>;
  softDelete(id: string): Promise<void>;
  slugExists(slug: string, excludeId?: string): Promise<boolean>;
}
