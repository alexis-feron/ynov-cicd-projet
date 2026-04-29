# Architecture Backend NestJS - Clean Architecture

## Arborescence des dossiers

```
backend/src/
├── main.ts                          # Bootstrap NestJS (Fastify)
├── app.module.ts                    # Module racine
│
├── prisma/
│   ├── prisma.service.ts            # Singleton PrismaClient
│   └── prisma.module.ts             # Module global (@Global)
│
├── common/                          # Transversal à tous les modules
│   ├── decorators/                  # @CurrentUser, @Roles, etc.
│   ├── filters/                     # GlobalExceptionFilter
│   ├── guards/                      # JwtAuthGuard, RolesGuard
│   ├── interceptors/                # LoggingInterceptor, TransformInterceptor
│   └── pipes/                       # ParseUuidPipe, etc.
│
└── modules/
    └── posts/                       # Exemple complet
        ├── domain/                  # Couche 1 - aucune dépendance externe
        │   ├── entities/
        │   │   └── post.entity.ts
        │   └── repositories/
        │       └── post.repository.interface.ts
        │
        ├── application/             # Couche 2 - dépend du domaine uniquement
        │   ├── dto/
        │   │   ├── create-post.dto.ts
        │   │   ├── update-post.dto.ts
        │   │   └── post-response.dto.ts
        │   └── posts.service.ts
        │
        ├── infrastructure/          # Couche 3 - implémentations concrètes
        │   └── repositories/
        │       └── posts.prisma.repository.ts
        │
        ├── presentation/            # Couche 4 - HTTP uniquement
        │   └── posts.controller.ts
        │
        └── posts.module.ts          # Assemblage DI
```

## Rôles de chaque couche

### Domain (cœur)

- **Entités** : objets métier avec état et comportement (`Post`, `User`)
- **Interfaces de repository** : contrats que l'infrastructure doit respecter
- **Règles métier** : `post.canBeEditedBy(userId)`, `post.isPublished()`
- **Zéro dépendance** : pas de NestJS, pas de Prisma, pas de framework

### Application

- **Services** : orchestrent la logique métier (`PostsService`)
- **DTOs** : contrats d'entrée/sortie avec validation (`class-validator`)
- **Dépend de** : interfaces du domaine (jamais des implémentations)

### Infrastructure

- **Repositories Prisma** : implémentent `IPostRepository`
- **Services externes** : Redis, MinIO, emails
- **Traduit** : entités domaine ↔ modèles Prisma

### Presentation

- **Controllers** : routing HTTP, parsing paramètres, codes de statut
- **Aucune logique métier** : délègue tout au service
- **Traduit** : DTO response ← entité domaine

## Flux de dépendances

```
Presentation → Application → Domain ← Infrastructure
```

La flèche `←` pour l'infrastructure signifie qu'elle implémente l'interface
définie dans le domaine (Dependency Inversion Principle).

## Design Patterns utilisés

### 1. Repository Pattern

**Quoi** : interface dans le domaine, implémentation en infrastructure.

```typescript
// Domaine - définit le contrat
export const POST_REPOSITORY = Symbol('POST_REPOSITORY');
export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  create(data: CreatePostData): Promise<Post>;
  // ...
}

// Infrastructure - implémente le contrat
@Injectable()
export class PostsPrismaRepository implements IPostRepository { ... }

// Module - fait le lien via le token Symbol
{ provide: POST_REPOSITORY, useClass: PostsPrismaRepository }

// Service - injecte l'interface, pas l'implémentation
constructor(@Inject(POST_REPOSITORY) private repo: IPostRepository) {}
```

**Pourquoi** : permet de substituer Prisma par n'importe quelle autre
implémentation (mock, autre ORM, API externe) sans changer le service.
Les tests unitaires injectent un mock, pas une vraie DB.

---

### 2. DTO Pattern (Data Transfer Object)

**Quoi** : classes dédiées à chaque direction du flux de données.

```
CreatePostDto  →  PostsService  →  Post (entity)  →  PostResponseDto
  (entrée)                         (domaine)           (sortie)
```

**Pourquoi** :

- Sépare la validation HTTP du modèle domaine
- Le domaine ne dépend pas de `class-validator`
- L'API peut évoluer indépendamment du domaine
- `PostResponseDto.fromEntity()` contrôle précisément ce qui est exposé

---

### 3. Dependency Inversion (via Symbol NestJS)

**Quoi** : les modules de haut niveau (service) ne dépendent pas
des modules de bas niveau (Prisma), mais d'abstractions (interfaces).

```typescript
// Mauvais - couplage direct
constructor(private repo: PostsPrismaRepository) {}

// Correct - dépend de l'abstraction
constructor(@Inject(POST_REPOSITORY) private repo: IPostRepository) {}
```

**Pourquoi** : facilite les tests, rend les couches substituables,
suit le principe SOLID D.

## Où placer Prisma

- `PrismaService` → `src/prisma/` (singleton global)
- `PrismaModule` → `@Global()` : injecté automatiquement partout
- Les repositories Prisma → `modules/*/infrastructure/repositories/`
- Le schéma Prisma → `prisma/schema.prisma` (racine du backend)
- Les migrations → `prisma/migrations/`

**Règle** : aucune couche hors infrastructure ne doit importer `@prisma/client`.
