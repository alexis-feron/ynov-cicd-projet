# Stratégie de tests

## Pyramide des tests

```
        ╱‾‾‾‾‾‾‾‾‾‾‾‾╲
       ╱  E2E (Playwright) ╲         ← peu nombreux, lents, coûteux
      ╱  flux utilisateur   ╲        ← browser réel, UI + API
     ╱────────────────────────╲
    ╱  Intégration (Supertest)  ╲    ← moyennement nombreux
   ╱  HTTP → service → DB réelle ╲   ← Testcontainers Docker
  ╱────────────────────────────────╲
 ╱         Unitaires (Vitest)        ╲ ← très nombreux, rapides
╱  logique pure, tout mocké           ╲ ← pas de I/O
╲──────────────────────────────────────╱

Cible : ≥ 70% de couverture (lines, functions, branches)
```

## Ce que chaque niveau teste

### Niveau 1 - Unitaires (`src/**/*.spec.ts`)

**Quoi :** logique pure sans I/O (services, guards, stratégies, entités)

**Mocking :** tout ce qui sort du SUT est mocké (repositories, JWT, Redis)

| Fichier                           | Ce qui est testé                                       |
| --------------------------------- | ------------------------------------------------------ |
| `post.entity.spec.ts`             | Règles métier (isPublished, canBeEditedBy...)          |
| `posts.service.spec.ts`           | Orchestration, génération slug, ownership, publication |
| `posts.prisma.repository.spec.ts` | Mapping Prisma → entité, soft delete, pagination       |
| `auth.service.spec.ts`            | Credentials, hash password, rotation token, révocation |
| `jwt.strategy.spec.ts`            | Validation payload, user inactif/inexistant            |
| `roles.guard.spec.ts`             | Hiérarchie de rôles, comportement sans rôle requis     |
| `users.service.spec.ts`           | findById, findByEmail, assertUnique (parallel check)   |

**Commande :** `npm test`

---

### Niveau 2 - Intégration (`test/integration/**/*.integration-spec.ts`)

**Quoi :** stack HTTP complète contre de vrais services (DB + Redis)

**Infrastructure :** Testcontainers démarre PostgreSQL et Redis dans Docker pour la durée des tests, puis les détruit.

```
Test → HTTP (Supertest) → NestJS complet → Prisma → PostgreSQL (container)
                                        → Redis (container)
```

| Fichier                     | Ce qui est testé                                       |
| --------------------------- | ------------------------------------------------------ |
| `auth.integration-spec.ts`  | Register, login, refresh, logout, rotation, révocation |
| `posts.integration-spec.ts` | CRUD complet, pagination, auth 401/403, soft delete    |

**Prérequis :** Docker en cours d'exécution

**Commande :** `npm run test:integration`

---

### Niveau 3 - E2E (`frontend/tests/e2e/**/*.spec.ts`)

**Quoi :** flux utilisateur complets dans un vrai navigateur (Chromium)

**Infrastructure :** Playwright contrôle le navigateur, Next.js + NestJS doivent être démarrés.

| Fichier        | Ce qui est testé                                        |
| -------------- | ------------------------------------------------------- |
| `auth.spec.ts` | Inscription, connexion, déconnexion, erreurs formulaire |
| `blog.spec.ts` | Affichage articles, 404, navigation                     |

**Commande :** `npm run test:e2e` (depuis `frontend/`)

---

## Stratégie de mocking

### Tests unitaires - mock total

```typescript
// Pattern : factory function qui crée des mocks vi.fn()
const makeRepositoryMock = (): IPostRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  // ...
});

// Injection directe sans NestJS IoC
const service = new PostsService(repository);

// Arrange
vi.mocked(repository.findById).mockResolvedValue(makePost());

// Act + Assert
await expect(service.findById("id")).resolves.toBeDefined();
```

**Règle :** jamais de vraie DB ni de vrai réseau en tests unitaires.

### Tests d'intégration - Testcontainers (pas de mocks)

```typescript
// Démarrage de vrais containers Docker
const databaseUrl = await startTestDatabase(); // PostgreSQL éphémère
const redisUrl = await startTestRedis(); // Redis éphémère

// Tout est réel : NestJS, Prisma, ioredis
process.env.DATABASE_URL = databaseUrl;
const app = await createTestApp();
```

**Règle :** aucun mock - tester le vrai comportement de bout en bout.

### Tests E2E - Playwright Request API pour le setup

```typescript
// Crée des données de test via l'API REST (pas accès direct DB)
const res = await request.post(`${API}/auth/register`, { data: { ... } });

// Puis test l'UI
await page.goto('/login');
await page.fill('[name=email]', email);
```

---

## Gestion de la DB de test (Testcontainers)

```
beforeAll → startTestDatabase()
              ├── PostgreSqlContainer('postgres:16-alpine').start()
              └── execSync('prisma migrate deploy', { env: { DATABASE_URL } })

beforeEach → factories.createAuthor(prisma)  // données fraîches par test

afterAll  → stopTestDatabase()
              └── container.stop()  // container supprimé, port libéré
```

**Isolation :** chaque suite de tests crée ses propres données.
Les timestamps dans les factories (`Date.now()`) évitent les collisions de contraintes UNIQUE.

### Réinitialisation entre les tests

Pour les tests où l'état doit être parfaitement propre, utiliser :

```typescript
// Option A : données avec timestamp unique (approche actuelle)
const email = `user-${Date.now()}@test.com`;

// Option B : truncate entre les suites (plus lent)
await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
```

---

## Couverture (70%)

Configuration dans `vitest.config.ts` :

```typescript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  },
  // Exclusions : modules NestJS (pas de logique), main.ts, interfaces, DTOs
  exclude: ['**/*.module.ts', '**/main.ts', 'src/prisma/**', '**/*.dto.ts'],
}
```

**Générer le rapport :** `npm run test:coverage`
**Rapport HTML :** `coverage/index.html`

### Ce qui compte pour la couverture

| Couvert                   | Exclu                         |
| ------------------------- | ----------------------------- |
| Services (logique métier) | `*.module.ts` (wiring NestJS) |
| Guards et decorators      | `main.ts` (bootstrap)         |
| Strategies Passport       | `*.dto.ts` (déclaratif)       |
| Repositories (mapping)    | `*.interface.ts`              |
| Entités domaine           | `prisma/**`                   |

---

## CI - workflow tests

```yaml
# .github/workflows/ci.yml
jobs:
  unit-tests: npm test # rapide, pas de Docker
  integration: npm run test:integration # Docker requis
  e2e: playwright test # browser + stack complète
```

Les tests unitaires tournent sur chaque PR.
Les tests d'intégration et E2E tournent sur merge vers `main`.
