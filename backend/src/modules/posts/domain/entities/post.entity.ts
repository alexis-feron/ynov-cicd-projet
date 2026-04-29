export enum PostStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export interface TagRef {
  id: string;
  name: string;
  slug: string;
}

export interface PostProps {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: PostStatus;
  authorId: string;
  categoryId: string | null;
  tags: TagRef[];
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entité domaine - aucune dépendance framework/ORM.
 * Encapsule les règles métier d'un article.
 */
export class Post {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly content: string;
  readonly excerpt: string | null;
  readonly status: PostStatus;
  readonly authorId: string;
  readonly categoryId: string | null;
  readonly tags: TagRef[];
  readonly publishedAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PostProps) {
    this.id = props.id;
    this.title = props.title;
    this.slug = props.slug;
    this.content = props.content;
    this.excerpt = props.excerpt;
    this.status = props.status;
    this.authorId = props.authorId;
    this.categoryId = props.categoryId;
    this.tags = props.tags;
    this.publishedAt = props.publishedAt;
    this.deletedAt = props.deletedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isPublished(): boolean {
    return this.status === PostStatus.PUBLISHED;
  }

  isDraft(): boolean {
    return this.status === PostStatus.DRAFT;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  belongsTo(userId: string): boolean {
    return this.authorId === userId;
  }

  canBeEditedBy(userId: string): boolean {
    return this.belongsTo(userId) && !this.isPublished();
  }
}
