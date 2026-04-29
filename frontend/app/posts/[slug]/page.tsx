import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchAllSlugs, fetchPostBySlug } from '@/lib/api';

interface PostPageProps {
  readonly params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  try {
    const post = await fetchPostBySlug(slug);
    return {
      title: post.title,
      description: post.excerpt ?? undefined,
    };
  } catch {
    return { title: 'Article introuvable' };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  let post;
  try {
    post = await fetchPostBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <main className="max-w-prose mx-auto px-4 sm:px-6 py-10 pb-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 mb-8 hover:text-blue-500 hover:no-underline transition-colors"
      >
        ← Retour aux articles
      </Link>

      <article>
        <header className="mb-8">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4">
            {post.title}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm text-slate-400 pb-6 border-b border-slate-200">
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>
                Publié le {formatDate(post.publishedAt)}
              </time>
            )}
            <span>Mis à jour le {formatDate(post.updatedAt)}</span>
          </div>

          {post.excerpt && (
            <p className="mt-6 text-lg text-slate-500 leading-relaxed italic pl-4 border-l-4 border-blue-400">
              {post.excerpt}
            </p>
          )}
        </header>

        <div className="prose mt-8 leading-relaxed text-base">
          {post.content.split('\n').map((line, i) => (
            <p key={`${i}-${line.slice(0, 16)}`}>{line}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
