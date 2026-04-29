import Link from 'next/link';
import { fetchPosts } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface HomeProps {
  readonly searchParams: { page?: string };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function HomePage({ searchParams }: HomeProps) {
  const page = Math.max(1, Number(searchParams.page ?? '1'));

  let posts;
  let meta;

  try {
    const response = await fetchPosts(page, 10);
    posts = response.data;
    meta = response.meta;
  } catch {
    return (
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">
            Impossible de charger les articles. Vérifiez que le backend est
            démarré.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 pb-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {meta.total} article{meta.total === 1 ? '' : 's'} publié
            {meta.total === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <p className="text-sm">Aucun article publié pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {posts.map((post) => (
            <article key={post.id}>
              <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  {post.publishedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <time dateTime={post.publishedAt}>
                        {formatDate(post.publishedAt)}
                      </time>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold leading-snug">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 pt-0">
                  {post.excerpt && (
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                      {post.excerpt}
                    </p>
                  )}

                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {post.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </article>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          {page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/?page=${page - 1}`}>
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
          )}

          <span className="text-sm text-muted-foreground">
            Page {page} / {meta.totalPages}
          </span>

          {page < meta.totalPages ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/?page=${page + 1}`}>
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
