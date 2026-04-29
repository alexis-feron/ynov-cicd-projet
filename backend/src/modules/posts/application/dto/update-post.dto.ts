import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { PostStatus } from "../../domain/entities/post.entity";

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}
