# Guide de contribution

## Workflow Git

```
main          ──────────●──────────────●──────── (production)
                       ↑              ↑
develop       ──●──────●──●──────────●─────────
                       ↑       ↑
feature/xxx   ──────────●───────●
fix/yyy                       ────●
```

| Branche     | Rôle                       | Protection                     |
| ----------- | -------------------------- | ------------------------------ |
| `main`      | Production stable          | PRs uniquement, CI obligatoire |
| `develop`   | Intégration                | PRs uniquement                 |
| `feature/*` | Nouvelles fonctionnalités  | -                              |
| `fix/*`     | Corrections de bugs        | -                              |
| `chore/*`   | Maintenance (deps, config) | -                              |

### Nommage des branches

```
feature/add-comment-module
fix/jwt-refresh-expiration
chore/update-prisma-5.10
ci/add-trivy-scan
docs/update-api-reference
```

---

## Conventional Commits

Format : `<type>(<scope>): <description>`

### Types

| Type       | Usage                                        | Version bump |
| ---------- | -------------------------------------------- | ------------ |
| `feat`     | Nouvelle fonctionnalité                      | MINOR        |
| `fix`      | Correction de bug                            | PATCH        |
| `docs`     | Documentation uniquement                     | -            |
| `style`    | Formatage, lint (pas de logique)             | -            |
| `refactor` | Refactoring sans nouvelle feature ni bug fix | -            |
| `test`     | Ajout ou correction de tests                 | -            |
| `chore`    | Build, dépendances, config                   | -            |
| `ci`       | Pipelines CI/CD                              | -            |
| `perf`     | Amélioration de performance                  | PATCH        |
| `revert`   | Annulation d'un commit précédent             | -            |

### Scopes

| Scope        | Périmètre                     |
| ------------ | ----------------------------- |
| `backend`    | Code NestJS                   |
| `frontend`   | Code Next.js                  |
| `infra`      | Terraform, Ansible            |
| `ci`         | Workflows GitHub Actions      |
| `docker`     | Dockerfiles, compose          |
| `monitoring` | Prometheus, Grafana, alerting |
| `docs`       | Documentation                 |
| `deps`       | Mise à jour de dépendances    |

### Exemples corrects

```
feat(backend): add comment module with nested replies
fix(backend): prevent duplicate slug on concurrent post creation
fix(auth): resolve refresh token not invalidated on logout
test(backend): add integration tests for posts pagination
refactor(backend): extract post slug generation to domain entity
chore(deps): update prisma to 5.10.0
ci: add Trivy image scan to CD pipeline
docs: document health indicator pattern
perf(backend): add Redis cache for posts list endpoint
feat(backend)!: change auth response shape (BREAKING CHANGE)
```

### Exemples incorrects

```
# ❌ Pas de type
update posts service

# ❌ Majuscule dans la description
feat(backend): Add new endpoint

# ❌ Point final
fix(auth): resolve token expiry.

# ❌ Scope trop générique
feat(app): add feature
```

### Breaking changes

Ajouter `!` après le type/scope **et** un footer `BREAKING CHANGE:` :

```
feat(backend)!: rename /posts endpoint to /articles

BREAKING CHANGE: The /posts REST endpoint has been renamed to /articles.
Update all API clients accordingly.
```

---

## Processus de Pull Request

### Avant d'ouvrir une PR

- [ ] Les tests passent localement (`npm test`)
- [ ] La couverture ne régresse pas (`npm run test:coverage`)
- [ ] Le lint passe (`npm run lint`)
- [ ] La branche est à jour avec `develop` (`git rebase develop`)
- [ ] Les commits respectent Conventional Commits
- [ ] Pas de `console.log` oublié, pas de `TODO` non résolu

### Template de PR

Titre : reprend le commit principal - `feat(backend): add comment module`

Corps :

```markdown
## Changements

- Description courte de ce qui a été modifié et pourquoi

## Tests

- [ ] Tests unitaires ajoutés / mis à jour
- [ ] Tests d'intégration si comportement I/O
- [ ] Testé manuellement sur l'environnement local

## Impact

- Breaking change ? (oui / non)
- Variables d'env ajoutées ? (liste)
- Migration DB nécessaire ? (oui / non)
```

### Règles de review

- Minimum 1 approbation avant le merge
- Résoudre tous les commentaires avant merge
- Le merge est effectué par l'auteur de la PR
- Utiliser **Squash and merge** pour les features, **Merge commit** pour les releases

---

## Standards de code

### TypeScript

```typescript
// ✅ Types explicites sur les fonctions publiques
async findById(id: string): Promise<Post | null>

// ✅ Interfaces pour les contrats, types pour les unions/alias
interface IPostRepository { ... }
type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// ❌ any interdit (sauf avec commentaire justifié)
const data: any = ...;
```

### NestJS

```typescript
// ✅ Injection par interface (DIP)
constructor(@Inject(POST_REPOSITORY) private repo: IPostRepository) {}

// ✅ Un seul fichier = une seule responsabilité
// posts.controller.ts → routing uniquement
// posts.service.ts    → logique métier
// posts.prisma.repository.ts → accès DB

// ❌ Logique métier dans un controller
@Post() create(@Body() dto) {
  const slug = dto.title.toLowerCase().replace(/ /g, '-'); // ← dans le service
}
```

### Tests

```typescript
// ✅ Nom de test descriptif : "quand ... alors ..."
it('returns 403 when READER tries to create a post', ...)

// ✅ AAA : Arrange / Act / Assert
const post = makePost({ status: 'PUBLISHED' }); // Arrange
const result = post.canBeEditedBy(authorId);     // Act
expect(result).toBe(true);                       // Assert

// ❌ Logique dans les tests (conditions, boucles)
if (result.status === 'ok') expect(result).toBeDefined();
```

---

## Validation locale des commits

Installer les outils de validation :

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Tester un message de commit avant de committer :

```bash
echo "feat(backend): add health endpoint" | npx commitlint
# → 0 problems, 0 warnings

echo "add health endpoint" | npx commitlint
# → ✖ subject-empty, type-empty
```

Valider les N derniers commits de la branche :

```bash
./scripts/check-commits.sh          # depuis le dernier tag
./scripts/check-commits.sh 5        # les 5 derniers commits
```
