import type { PaginatedPosts, Post } from '@/types';

/**
 * INTERNAL_API_URL : URL interne Docker (server-side SSR dans le container).
 * NEXT_PUBLIC_API_URL : URL publique utilisée par le browser (localhost:3001).
 * Fallback à http://backend:3001 pour le dev local sans Docker.
 */
const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Liste paginée des articles publiés - utilisée en SSR sur la homepage. */
export async function fetchPosts(
  page = 1,
  limit = 10
): Promise<PaginatedPosts> {
  const res = await fetch(
    apiUrl(`/posts?page=${page}&limit=${limit}&status=PUBLISHED`),
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`fetchPosts failed: ${res.status}`);
  return res.json() as Promise<PaginatedPosts>;
}

/** Tous les slugs publiés - utilisé par generateStaticParams. */
export async function fetchAllSlugs(): Promise<string[]> {
  try {
    const res = await fetch(
      apiUrl('/posts?page=1&limit=1000&status=PUBLISHED'),
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as PaginatedPosts;
    return data.data.map((p) => p.slug);
  } catch {
    return [];
  }
}

/** Détail d'un article par slug - pas de cache pour garantir des données fraîches. */
export async function fetchPostBySlug(slug: string): Promise<Post> {
  const res = await fetch(apiUrl(`/posts/slug/${slug}`), {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Post not found: ${slug}`);
  return res.json() as Promise<Post>;
}
