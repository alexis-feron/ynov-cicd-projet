import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { PostStatus } from "../../domain/entities/post.entity";

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus = PostStatus.DRAFT;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}
