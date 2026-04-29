# Authentification - JWT + Refresh Token

## Flow complet

```
┌─────────────────────────────────────────────────────────────────┐
│ REGISTER / LOGIN                                                │
│                                                                 │
│  Client → POST /auth/register|login                             │
│         ← { accessToken, refreshToken, user }                   │
│                                                                 │
│  accessToken  : JWT signé, durée 15 min, stateless              │
│  refreshToken : JWT signé, durée 7 jours, JTI stocké en Redis   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ APPEL PROTÉGÉ                                                   │
│                                                                 │
│  Client → GET /posts  Authorization: Bearer <accessToken>       │
│         → JwtStrategy vérifie signature + expiration            │
│         → vérifie que l'utilisateur existe encore en DB         │
│         ← 200 OK / 401 Unauthorized                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REFRESH (token rotation)                                        │
│                                                                 │
│  Client → POST /auth/refresh { refreshToken }                   │
│         → vérifie signature JWT du refresh token                │
│         → vérifie JTI présent en Redis                          │
│         → supprime l'ancien JTI (rotation)                      │
│         → émet un nouveau access + refresh token                │
│         → stocke le nouveau JTI en Redis                        │
│         ← { accessToken, refreshToken }                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LOGOUT                                                          │
│                                                                 │
│  Client → POST /auth/logout  Authorization: Bearer <access>     │
│                              { refreshToken }                   │
│         → extrait le JTI du refreshToken                        │
│         → supprime refresh:userId:jti de Redis                  │
│         ← 204 No Content                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Tokens

|                     | Access Token              | Refresh Token        |
| ------------------- | ------------------------- | -------------------- |
| **Durée**           | 15 minutes                | 7 jours              |
| **Stockage client** | mémoire / httpOnly cookie | httpOnly cookie      |
| **Révocable**       | Non (stateless)           | Oui (JTI en Redis)   |
| **Secret**          | `JWT_SECRET`              | `JWT_REFRESH_SECRET` |
| **Payload**         | `sub`, `email`, `role`    | `sub`, `jti`         |

## Stockage Redis des refresh tokens

```
Clé   : refresh:{userId}:{jti}
Valeur: "1"
TTL   : 7 jours (identique à l'expiration JWT)
```

Si le JTI n'est plus en Redis → token révoqué → 401.
Si quelqu'un réutilise un token déjà rotaté → 401 (détection de vol possible).

## Rôles

| Rôle   | Peut créer articles | Peut publier       | Accès admin |
| ------ | ------------------- | ------------------ | ----------- |
| READER | Non                 | Non                | Non         |
| AUTHOR | Oui                 | Oui (ses articles) | Non         |
| ADMIN  | Oui                 | Oui (tous)         | Oui         |

### Usage dans les controllers

```typescript
@Get('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
listUsers(@CurrentUser() user: JwtPayload) { ... }

@Post('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUTHOR, Role.ADMIN)
createPost(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostDto) { ... }
```

## Bonnes pratiques appliquées

| Pratique                        | Implémentation                                                |
| ------------------------------- | ------------------------------------------------------------- |
| **Passwords**                   | bcrypt, 12 rounds                                             |
| **Timing attacks**              | `bcrypt.compare` - durée constante                            |
| **Pas d'info dans les erreurs** | `"Invalid credentials"` (pas "email inconnu" / "mauvais mdp") |
| **Token rotation**              | Chaque refresh invalide l'ancien token                        |
| **Deux secrets distincts**      | `JWT_SECRET` ≠ `JWT_REFRESH_SECRET`                           |
| **Validation stricte DTOs**     | Regex password, email format, longueur username               |
| **Compte inactif**              | Rejeté à la validation ET à chaque requête JWT                |
| **CORS restreint**              | `FRONTEND_URL` en variable d'env                              |

## Variables d'environnement requises

```env
JWT_SECRET=<secret-long-et-aleatoire>
JWT_REFRESH_SECRET=<autre-secret-long-et-aleatoire>
REDIS_URL=redis://localhost:6379
```
