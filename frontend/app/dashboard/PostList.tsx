'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Post, PostStatus } from '@/types';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { deletePost } from './actions';

const MONTHS_FR = [
  'jan.',
  'fév.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

const statusVariant: Record<PostStatus, 'success' | 'warning' | 'muted'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'muted',
};

const statusLabel: Record<PostStatus, string> = {
  PUBLISHED: 'Publié',
  DRAFT: 'Brouillon',
  ARCHIVED: 'Archivé',
};

interface PostListProps {
  posts: Post[];
  onPostsChange: (updater: (prev: Post[]) => Post[]) => void;
  onRequestEdit: (post: Post) => void;
}

export default function PostList({
  posts,
  onPostsChange,
  onRequestEdit,
}: PostListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await deletePost(id);
    setDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setConfirmDeleteId(null);
    onPostsChange((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">
          Mes articles ({posts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2">
            Aucun article pour l&apos;instant.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {posts.map((post) => {
              const isOptimistic = post.id.startsWith('optimistic-');
              const isConfirming = confirmDeleteId === post.id;

              return (
                <li
                  key={post.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 bg-background"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={statusVariant[post.status]}>
                          {statusLabel[post.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.updatedAt)}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium leading-snug truncate">
                        {isOptimistic ? (
                          <span className="opacity-60">{post.title}</span>
                        ) : (
                          <Link
                            href={`/posts/${post.slug}`}
                            target="_blank"
                            className="hover:text-primary transition-colors inline-flex items-center gap-1"
                          >
                            {post.title}
                          </Link>
                        )}
                      </h3>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onRequestEdit(post);
                          setConfirmDeleteId(null);
                        }}
                        title="Éditer"
                        disabled={isOptimistic || isConfirming}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setConfirmDeleteId(post.id);
                          setDeleteError(null);
                        }}
                        title="Supprimer"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={isOptimistic || isConfirming}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isConfirming && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t">
                      {deleteError && (
                        <p className="text-xs text-destructive">
                          {deleteError}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground flex-1">
                          Confirmer la suppression ?
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                          disabled={deleting}
                        >
                          {deleting ? 'Suppression…' : 'Supprimer'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setDeleteError(null);
                          }}
                          disabled={deleting}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
