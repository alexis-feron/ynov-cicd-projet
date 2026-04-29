# Design Patterns - Catalogue

Référence des patterns utilisés dans le projet, avec le code concret
et la justification de chaque choix.

---

## 1. Repository Pattern + Dependency Inversion

**Couches concernées :** domain ← infrastructure ← application

### Problème résolu

Sans ce pattern, le service dépend directement de Prisma :

```typescript
// ❌ couplage fort - impossible à tester unitairement
class PostsService {
  constructor(private prisma: PrismaService) {}
  findById(id: string) { return this.prisma.post.findUnique(...); }
}
```

### Solution

```typescript
// 1. Contrat défini dans le DOMAINE (pas dans l'infra)
export const POST_REPOSITORY = Symbol("POST_REPOSITORY");

export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  findAll(opts: FindAllOptions): Promise<{ data: Post[]; total: number }>;
  create(data: CreatePostData): Promise<Post>;
  update(id: string, data: UpdatePostData): Promise<Post>;
  delete(id: string): Promise<void>;
}

// 2. Implémentation dans l'INFRASTRUCTURE
@Injectable()
export class PostsPrismaRepository implements IPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Post | null> {
    const row = await this.prisma.post.findUnique({ where: { id } });
    return row ? PostMapper.toDomain(row) : null;
  }
}

// 3. Assemblage dans le MODULE (le seul endroit qui connaît les deux)
@Module({
  providers: [
    PostsService,
    { provide: POST_REPOSITORY, useClass: PostsPrismaRepository },
  ],
})
export class PostsModule {}

// 4. Le SERVICE injecte l'interface - jamais l'implémentation
@Injectable()
export class PostsService {
  constructor(
    @Inject(POST_REPOSITORY) private readonly repo: IPostRepository,
  ) {}
}
```

### En test unitaire

```typescript
const repo: IPostRepository = {
  findById: vi.fn().mockResolvedValue(makePost()),
  // ... autres méthodes mockées
};
const service = new PostsService(repo);
// Aucune base de données, aucun Docker, tests en <10ms
```

**Règle :** aucune couche hors `infrastructure/` ne doit importer `@prisma/client`.

---

## 2. Clean Architecture - 4 couches

```
Presentation ──► Application ──► Domain ◄── Infrastructure
    HTTP           Logique         Entités      Prisma / Redis
  Controller       Service         métier       Repository impl.
```

### Flux d'une requête POST /posts

```
Request
  │
  ▼ PostsController.create(dto)         ← Presentation (HTTP uniquement)
       │  valide DTO, extrait user
       ▼
    PostsService.create(dto, authorId)  ← Application (orchestration)
       │  génère slug, vérifie droits
       ▼
    Post.create(data)                   ← Domain (règles métier)
       │  entité validée
       ▼
    repo.create(post)                   ← Infrastructure (persistence)
       │  PostsPrismaRepository
       ▼
    PostgreSQL INSERT
```

### Règles d'import (violations interdites)

| Couche         | Peut importer       | Ne peut PAS importer                      |
| -------------- | ------------------- | ----------------------------------------- |
| domain         | -                   | NestJS, Prisma, ioredis                   |
| application    | domain              | Prisma, ioredis, @nestjs/platform-fastify |
| infrastructure | domain, application | -                                         |
| presentation   | application         | domain (entités directement)              |

---

## 3. DTO Pattern (Data Transfer Object)

**Problème :** exposer les entités domaine directement dans l'API crée
un couplage entre le modèle interne et le contrat HTTP. Un refactoring
interne casse le contrat public.

```
CreatePostDto → PostsService → Post (entité) → PostResponseDto
   (entrée)                    (domaine)          (sortie)
```

### Input DTO - validation à la frontière

```typescript
export class CreatePostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
```

### Output DTO - contrôle exact de ce qui est exposé

```typescript
export class PostResponseDto {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: PostStatus;
  author: { id: string; displayName: string };
  createdAt: string;

  static fromEntity(post: Post): PostResponseDto {
    return {
      id: post.id,
      title: post.title,
      // password, deletedAt et autres champs internes ne sont jamais exposés
    };
  }
}
```

**Règle :** `fromEntity()` est la seule porte de sortie du domaine vers l'API.

---

## 4. Guard Pattern (NestJS)

Les guards implémentent la logique d'autorisation indépendamment des controllers.

```
Request → JwtAuthGuard → RolesGuard → Controller
            (authn)        (authz)
```

```typescript
// Composition déclarative dans le controller
@Get('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)  // ordre : authn avant authz
@Roles(Role.ADMIN)
getStats() { ... }
```

### Hiérarchie des rôles

```typescript
// roles.guard.ts - ADMIN > AUTHOR > READER
const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [Role.ADMIN]: [Role.ADMIN, Role.AUTHOR, Role.READER],
  [Role.AUTHOR]: [Role.AUTHOR, Role.READER],
  [Role.READER]: [Role.READER],
};
```

**Règle :** un guard ne lance jamais d'exception métier - uniquement
`UnauthorizedException` (401) ou `ForbiddenException` (403).

---

## 5. Interceptor Pattern

Les interceptors enveloppent le cycle de vie d'une requête pour des
comportements transversaux (cross-cutting concerns).

### HttpMetricsInterceptor

```
Request
  │  startTimer() + inFlight.inc()
  ▼
 Handler (controller + service)
  │  stopTimer({ status_code }) + requestsTotal.inc()
  ▼
Response
```

Chaque interceptor global est enregistré via `APP_INTERCEPTOR` pour
bénéficier de l'injection de dépendances NestJS.

### LoggingInterceptor

```typescript
// Utilise rxjs tap() pour observer sans modifier le flux
return next.handle().pipe(
  tap({
    next: () => this.logger.log(`${method} ${url} ${status} +${ms}ms`),
    error: (e) => this.logger.error(`${method} ${url} ${e.status} +${ms}ms`),
  }),
);
```

**Règle :** les interceptors ne doivent pas modifier la réponse (sauf
`TransformInterceptor` dédié à cet usage).

---

## 6. Health Indicator Pattern

Chaque dépendance externe dispose de son propre indicator isolé,
testable unitairement avec un simple mock.

```typescript
// Interface implicite respectée par tous les indicators
interface HealthIndicator {
  check(): Promise<{
    status: "ok" | "error";
    latencyMs?: number;
    error?: string;
  }>;
}

// HealthController agrège tous les indicators
const [database, redis] = await Promise.all([
  this.prismaIndicator.check(),
  this.redisIndicator.check(),
]);
```

**Avantage :** ajouter un nouvel indicator (MinIO, email…) ne modifie
pas les indicators existants - Open/Closed Principle.

---

## Synthèse SOLID

| Principe                  | Pattern            | Exemple concret                                                 |
| ------------------------- | ------------------ | --------------------------------------------------------------- |
| **S**ingle Responsibility | Clean Architecture | `PostsController` fait uniquement du routing HTTP               |
| **O**pen/Closed           | Health Indicators  | Ajouter MinIO ne modifie pas les indicators existants           |
| **L**iskov Substitution   | Repository Pattern | `PostsPrismaRepository` substituable par tout `IPostRepository` |
| **I**nterface Segregation | Interfaces narrow  | `IPostRepository` n'a que les méthodes du module posts          |
| **D**ependency Inversion  | Symbol injection   | `PostsService` dépend de `IPostRepository`, pas de Prisma       |
