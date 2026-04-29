import { PostStatus, PrismaClient, Role } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// Simule un hash bcrypt sans la dépendance (remplacé par bcrypt en prod)
function fakeHash(password: string): string {
  return `$2b$10$${crypto.createHash("sha256").update(password).digest("hex").slice(0, 53)}`;
}

async function main(): Promise<void> {
  console.log("Seeding database...");

  // ── Users ──────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@blog.dev" },
    update: {},
    create: {
      email: "admin@blog.dev",
      password: fakeHash("Admin1234!"),
      username: "admin",
      displayName: "Admin",
      role: Role.ADMIN,
    },
  });

  const author = await prisma.user.upsert({
    where: { email: "author@blog.dev" },
    update: {},
    create: {
      email: "author@blog.dev",
      password: fakeHash("Author1234!"),
      username: "john_doe",
      displayName: "John Doe",
      role: Role.AUTHOR,
    },
  });

  // ── Categories ─────────────────────────────────────────
  const techCategory = await prisma.category.upsert({
    where: { slug: "tech" },
    update: {},
    create: {
      name: "Tech",
      slug: "tech",
      description: "Articles sur la technologie",
    },
  });

  const backendCategory = await prisma.category.upsert({
    where: { slug: "backend" },
    update: {},
    create: {
      name: "Backend",
      slug: "backend",
      description: "NestJS, Node.js, bases de données",
      parentId: techCategory.id,
    },
  });

  // ── Tags ───────────────────────────────────────────────
  const nestjsTag = await prisma.tag.upsert({
    where: { slug: "nestjs" },
    update: {},
    create: { name: "NestJS", slug: "nestjs" },
  });

  const prismaTag = await prisma.tag.upsert({
    where: { slug: "prisma" },
    update: {},
    create: { name: "Prisma", slug: "prisma" },
  });

  // ── Posts ──────────────────────────────────────────────
  const post = await prisma.post.upsert({
    where: { slug: "introduction-a-nestjs" },
    update: {},
    create: {
      title: "Introduction à NestJS",
      slug: "introduction-a-nestjs",
      content:
        "# Introduction\n\nNestJS est un framework Node.js progressif...",
      excerpt:
        "Découvrez NestJS, le framework Node.js pour construire des APIs robustes.",
      status: PostStatus.PUBLISHED,
      authorId: author.id,
      categoryId: backendCategory.id,
      publishedAt: new Date(),
      tags: {
        create: [
          { tag: { connect: { id: nestjsTag.id } } },
          { tag: { connect: { id: prismaTag.id } } },
        ],
      },
    },
  });

  // ── Comments ───────────────────────────────────────────
  const comment = await prisma.comment.create({
    data: {
      content: "Super article, merci !",
      postId: post.id,
      authorId: admin.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Totalement d'accord !",
      postId: post.id,
      authorId: author.id,
      parentId: comment.id, // réponse au commentaire précédent
    },
  });

  console.log("Seed completed.");
  console.log(`  Users    : admin@blog.dev / author@blog.dev`);
  console.log(`  Category : Tech > Backend`);
  console.log(`  Tags     : NestJS, Prisma`);
  console.log(`  Post     : "${post.title}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
