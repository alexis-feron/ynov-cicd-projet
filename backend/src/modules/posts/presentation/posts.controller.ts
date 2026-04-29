import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../auth/application/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/infrastructure/guards/jwt-auth.guard";
import { JwtPayload } from "../../auth/infrastructure/strategies/jwt.strategy";
import { CreatePostDto } from "../application/dto/create-post.dto";
import {
  PaginatedPostsResponseDto,
  PostResponseDto,
} from "../application/dto/post-response.dto";
import { UpdatePostDto } from "../application/dto/update-post.dto";
import { PostsService } from "../application/posts.service";
import { PostStatus } from "../domain/entities/post.entity";

/**
 * Couche présentation - gère uniquement HTTP.
 * Traduit requêtes HTTP → appels service → réponse HTTP.
 * Aucune logique métier ici.
 */
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("status") status?: PostStatus,
    @Query("tag") tag?: string,
  ): Promise<PaginatedPostsResponseDto> {
    const { data, total } = await this.postsService.findAll({
      page,
      limit,
      status,
      tag,
    });

    return {
      data: data.map(PostResponseDto.fromEntity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get("slug/:slug")
  async findBySlug(@Param("slug") slug: string): Promise<PostResponseDto> {
    const post = await this.postsService.findBySlug(slug);
    return PostResponseDto.fromEntity(post);
  }

  @Get(":id")
  async findById(@Param("id") id: string): Promise<PostResponseDto> {
    const post = await this.postsService.findById(id);
    return PostResponseDto.fromEntity(post);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostResponseDto> {
    const post = await this.postsService.create(dto, user.sub);
    return PostResponseDto.fromEntity(post);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostResponseDto> {
    const post = await this.postsService.update(id, dto, user.sub);
    return PostResponseDto.fromEntity(post);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.postsService.delete(id, user.sub);
  }
}
