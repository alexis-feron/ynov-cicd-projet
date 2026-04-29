'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreatePostPayload, Post } from '@/types';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPost } from './actions';
import PostForm from './PostForm';
import PostList from './PostList';

interface DashboardShellProps {
  initialPosts: Post[];
}

export default function DashboardShell({ initialPosts }: DashboardShellProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [editing, setEditing] = useState<Post | null>(null);
  // Pending switch: the post the user wants to edit while dirty
  const [pendingEdit, setPendingEdit] = useState<Post | null | 'new'>(null);
  const isDirtyRef = useRef(false);

  function requestEdit(post: Post | null) {
    if (isDirtyRef.current) {
      setPendingEdit(post ?? 'new');
      return;
    }
    setEditing(post);
  }

  function confirmSwitch() {
    isDirtyRef.current = false;
    setEditing(pendingEdit === 'new' ? null : (pendingEdit as Post | null));
    setPendingEdit(null);
  }

  function cancelSwitch() {
    setPendingEdit(null);
  }

  async function handleCreate(
    payload: CreatePostPayload
  ): Promise<{ post?: Post; error?: string }> {
    const optimisticId = `optimistic-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: Post = {
      id: optimisticId,
      title: payload.title,
      content: payload.content,
      excerpt: payload.excerpt ?? null,
      status: payload.status ?? 'DRAFT',
      slug: '',
      authorId: '',
      categoryId: null,
      tags: [],
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    setPosts((prev) => [optimistic, ...prev]);

    const result = await createPost(payload);

    if (result.error) {
      setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
      return result;
    }

    if (result.post) {
      setPosts((prev) =>
        prev.map((p) => (p.id === optimisticId ? result.post! : p))
      );
    }

    return result;
  }

  function handleSaved(updated: Post) {
    setPosts((prev) =>
      prev.some((p) => p.id === updated.id)
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...prev]
    );
    setEditing(null);
  }

  const isEditing = editing !== null;

  return (
    <div className="">
      {pendingEdit !== null && (
        <Card className="border-warning bg-warning/5 mb-6">
          <CardContent className="py-4 flex flex-col gap-3">
            <p className="text-sm text-warning-foreground">
              Des modifications ne sont pas enregistrées. Les abandonner ?
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={confirmSwitch}>
                Abandonner
              </Button>
              <Button variant="outline" size="sm" onClick={cancelSwitch}>
                Continuer l&apos;édition
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isEditing ? "Modifier l'article" : 'Nouvel article'}
                </CardTitle>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => requestEdit(null)}
                    title="Nouveau article"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <PostForm
                key={editing?.id ?? 'new'}
                editPost={editing}
                onCancel={isEditing ? () => requestEdit(null) : undefined}
                onSaved={handleSaved}
                onCreateOverride={!isEditing ? handleCreate : undefined}
                onDirtyChange={(dirty) => {
                  isDirtyRef.current = dirty;
                }}
              />
            </CardContent>
          </Card>
        </div>

        <PostList
          posts={posts}
          onPostsChange={setPosts}
          onRequestEdit={requestEdit}
        />
      </div>
    </div>
  );
}
