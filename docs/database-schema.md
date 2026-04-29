# Schéma de base de données - Blog CMS

## Modélisation ERD

```
User ──────────────── Post ──────────────── PostTag ──── Tag
 │                     │
 │                     ├── Category (parentId self-ref)
 │                     │
 └────────── Comment ──┘ (postId + parentId self-ref)
```

## Tables et relations

### users

| Colonne     | Type      | Contrainte     | Note                           |
| ----------- | --------- | -------------- | ------------------------------ |
| id          | String    | PK, cuid()     |                                |
| email       | String    | UNIQUE         |                                |
| password    | String    |                | bcrypt hash                    |
| username    | String    | UNIQUE         |                                |
| displayName | String    |                |                                |
| avatar      | String?   |                | URL MinIO                      |
| role        | Role      | DEFAULT READER | ADMIN / AUTHOR / READER        |
| isActive    | Boolean   | DEFAULT true   | désactivation sans suppression |
| deletedAt   | DateTime? |                | soft delete                    |
| createdAt   | DateTime  | DEFAULT now()  |                                |
| updatedAt   | DateTime  | @updatedAt     |                                |

### posts

| Colonne     | Type       | Contrainte         | Note                         |
| ----------- | ---------- | ------------------ | ---------------------------- |
| id          | String     | PK, cuid()         |                              |
| title       | String     |                    |                              |
| slug        | String     | UNIQUE             | généré depuis le titre       |
| content     | String     |                    | Markdown                     |
| excerpt     | String?    |                    | résumé court                 |
| status      | PostStatus | DEFAULT DRAFT      | DRAFT / PUBLISHED / ARCHIVED |
| authorId    | String     | FK → users.id      |                              |
| categoryId  | String?    | FK → categories.id | nullable                     |
| publishedAt | DateTime?  |                    | horodatage de publication    |
| deletedAt   | DateTime?  |                    | soft delete                  |
| createdAt   | DateTime   | DEFAULT now()      |                              |
| updatedAt   | DateTime   | @updatedAt         |                              |

**Index** : authorId, status, categoryId, publishedAt, deletedAt

### categories

| Colonne     | Type    | Contrainte         | Note          |
| ----------- | ------- | ------------------ | ------------- |
| id          | String  | PK, cuid()         |               |
| name        | String  |                    |               |
| slug        | String  | UNIQUE             |               |
| description | String? |                    |               |
| parentId    | String? | FK → categories.id | self-relation |

**Relation** : arborescence illimitée via self-relation (Tech > Backend > NestJS)

### tags

| Colonne | Type   | Contrainte | Note |
| ------- | ------ | ---------- | ---- |
| id      | String | PK, cuid() |      |
| name    | String | UNIQUE     |      |
| slug    | String | UNIQUE     |      |

### post_tags (pivot many-to-many)

| Colonne    | Type     | Contrainte             |
| ---------- | -------- | ---------------------- |
| postId     | String   | FK → posts.id, CASCADE |
| tagId      | String   | FK → tags.id, CASCADE  |
| assignedAt | DateTime | DEFAULT now()          |

**PK composite** : (postId, tagId) - empêche les doublons

### comments

| Colonne   | Type      | Contrainte            | Note                                      |
| --------- | --------- | --------------------- | ----------------------------------------- |
| id        | String    | PK, cuid()            |                                           |
| content   | String    |                       |                                           |
| postId    | String    | FK → posts.id CASCADE | supprimé si le post est supprimé          |
| authorId  | String    | FK → users.id         |                                           |
| parentId  | String?   | FK → comments.id      | self-relation pour fils de discussion     |
| deletedAt | DateTime? |                       | soft delete - contenu affiché "[deleted]" |

## Soft Delete

**Principe** : au lieu de `DELETE`, on pose `deletedAt = NOW()`.

**Avantages** :

- Auditabilité (on sait quand/qui a supprimé)
- Restauration possible
- Intégrité référentielle préservée

**Implémentation** : tous les `findMany/findFirst` ajoutent `WHERE deletedAt IS NULL`.
Le filtre est centralisé dans le repository, invisible pour le service.

```typescript
// Dans PostsPrismaRepository.findAll()
where: {
  deletedAt: null, // <-- appliqué systématiquement
  ...autresFilters,
}
```

## Justification des choix

### cuid() vs uuid()

`cuid()` est préféré pour les IDs : plus court, ordonné dans le temps,
meilleur pour les index B-tree PostgreSQL.

### Many-to-many Post ↔ Tag via table pivot explicite

Prisma supporte les relations implicites many-to-many, mais la table explicite
`PostTag` permet d'ajouter des colonnes métier (`assignedAt`) et offre
un meilleur contrôle des index.

### Self-relations (Category, Comment)

Les catégories imbriquées et les fils de commentaires utilisent une
self-relation `parentId`. L'arborescence est illimitée en profondeur.

### CASCADE sur post_tags et comments

Si un post est supprimé physiquement (migrations/admin), les tags et
commentaires associés disparaissent. En mode applicatif, le soft delete
rend ce CASCADE inopérant.

### Timestamps @updatedAt

Prisma met à jour `updatedAt` automatiquement à chaque `update()`.
Pas de trigger SQL nécessaire.

## Commandes Prisma

```bash
# Créer une migration
npx prisma migrate dev --name init

# Appliquer en production
npx prisma migrate deploy

# Synchroniser le client TypeScript
npx prisma generate

# Remplir avec des données de test
npx ts-node prisma/seed.ts

# Interface d'administration
npx prisma studio
```
