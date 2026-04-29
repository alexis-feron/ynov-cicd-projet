'use client';

import { useEffect, useState } from 'react';
import { createPost, updatePost } from './actions';
import type { Post, PostStatus, CreatePostPayload } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

interface PostFormProps {
  editPost?: Post | null;
  onCancel?: () => void;
  onSaved?: (post: Post) => void;
  onCreateOverride?: (payload: CreatePostPayload) => Promise<{ post?: Post; error?: string }>;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function PostForm({
  editPost,
  onCancel,
  onSaved,
  onCreateOverride,
  onDirtyChange,
}: PostFormProps) {
  const isEditing = !!editPost;

  const [title, setTitle] = useState(editPost?.title ?? '');
  const [content, setContent] = useState(editPost?.content ?? '');
  const [excerpt, setExcerpt] = useState(editPost?.excerpt ?? '');
  const [status, setStatus] = useState<PostStatus>(editPost?.status ?? 'DRAFT');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset fields when switching to a different post
  useEffect(() => {
    setTitle(editPost?.title ?? '');
    setContent(editPost?.content ?? '');
    setExcerpt(editPost?.excerpt ?? '');
    setStatus(editPost?.status ?? 'DRAFT');
    setError(null);
    setSuccess(null);
  }, [editPost?.id]);

  // Notify parent of dirty state
  useEffect(() => {
    if (!onDirtyChange) return;
    const dirty = isEditing
      ? title !== (editPost?.title ?? '') ||
        content !== (editPost?.content ?? '') ||
        excerpt !== (editPost?.excerpt ?? '') ||
        status !== (editPost?.status ?? 'DRAFT')
      : title !== '' || content !== '' || excerpt !== '';
    onDirtyChange(dirty);
  }, [title, content, excerpt, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    const payload = { title, content, excerpt: excerpt || undefined, status };

    const result = isEditing
      ? await updatePost(editPost.id, payload)
      : onCreateOverride
        ? await onCreateOverride(payload)
        : await createPost(payload);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.post) {
      setSuccess(isEditing ? 'Article mis à jour !' : 'Article créé avec succès !');
      onDirtyChange?.(false);
      onSaved?.(result.post);
      if (!isEditing) {
        setTitle('');
        setContent('');
        setExcerpt('');
        setStatus('DRAFT');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3.5 py-2"
          role="alert"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3.5 py-2"
          role="status"
        >
          {success}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          placeholder="Mon super article"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excerpt">Extrait</Label>
        <Input
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Courte description affichée en aperçu"
          maxLength={300}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content">Contenu *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder="Rédigez votre article en Markdown…"
          className="resize-y min-h-30"
        />
      </div>

      <div className="flex gap-3 items-center">
        <Label htmlFor="status">Statut</Label>
        <Select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PostStatus)}
          className="flex-1"
        >
          <option value="DRAFT">Brouillon</option>
          <option value="PUBLISHED">Publié</option>
          <option value="ARCHIVED">Archivé</option>
        </Select>
      </div>

      <div className="flex gap-3 mt-1">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending
            ? isEditing ? 'Enregistrement…' : 'Création…'
            : isEditing ? 'Enregistrer' : "Créer l'article"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
