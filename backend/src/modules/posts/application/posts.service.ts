import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Post, PostStatus } from "../domain/entities/post.entity";
import {
  FindAllOptions,
  IPostRepository,
  PaginatedPosts,
  POST_REPOSITORY,
} from "../domain/repositories/post.repository.interface";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-");
}

@Injectable()
export class PostsService {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
  ) {}

  async findAll(options: FindAllOptions): Promise<PaginatedPosts> {
    return this.postRepository.findAll(options);
  }

  async findById(id: string): Promise<Post> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postRepository.findBySlug(slug);
    if (!post)
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    return post;
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    if (!(await this.postRepository.slugExists(base, excludeId))) return base;
    let i = 2;
    while (await this.postRepository.slugExists(`${base}-${i}`, excludeId)) i++;
    return `${base}-${i}`;
  }

  async create(dto: CreatePostDto, authorId: string): Promise<Post> {
    const slug = await this.uniqueSlug(generateSlug(dto.title));

    return this.postRepository.create({
      title: dto.title,
      slug,
      content: dto.content,
      excerpt: dto.excerpt,
      status: dto.status ?? PostStatus.DRAFT,
      authorId,
      categoryId: dto.categoryId,
      tagIds: dto.tagIds ?? [],
    });
  }

  async update(
    id: string,
    dto: UpdatePostDto,
    requesterId: string,
  ): Promise<Post> {
    const post = await this.findById(id);

    if (!post.belongsTo(requesterId)) {
      throw new ForbiddenException("You can only edit your own posts");
    }

    return this.postRepository.update(id, {
      title: dto.title,
      content: dto.content,
      excerpt: dto.excerpt,
      status: dto.status,
      categoryId: dto.categoryId,
      tagIds: dto.tagIds,
      // Horodatage automatique à la première publication
      ...(dto.status === PostStatus.PUBLISHED && !post.isPublished()
        ? { publishedAt: new Date() }
        : {}),
    });
  }

  async delete(id: string, requesterId: string): Promise<void> {
    const post = await this.findById(id);

    if (!post.belongsTo(requesterId)) {
      throw new ForbiddenException("You can only delete your own posts");
    }

    await this.postRepository.softDelete(id);
  }
}
