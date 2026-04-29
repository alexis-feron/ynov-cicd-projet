import { cookies } from 'next/headers';
import type { AuthUser } from '@/types';

/**
 * Lit le cookie access_token (httpOnly) depuis le contexte serveur.
 * À utiliser uniquement dans des Server Components, Route Handlers et Server Actions.
 * cookies() est async depuis Next.js 15.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

/**
 * Vérifie si l'utilisateur est connecté (presence du token).
 */
export async function isAuthenticated(): Promise<boolean> {
  return !!(await getAccessToken());
}

/**
 * Décode le payload JWT sans vérification de signature (affichage uniquement).
 * Le token est httpOnly donc sa validité est garantie par le serveur.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Récupère les infos utilisateur stockées dans le cookie user_info
 * (non-httpOnly, écrit par le Route Handler de login).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('user_info')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Options communes pour les cookies auth. */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
} as const;
