"use server";

import type { CreatePostPayload, Post } from "@/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

async function authHeaders(): Promise<HeadersInit> {
  const token = (await cookies()).get("access_token")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createPost(
  payload: CreatePostPayload,
): Promise<{ post?: Post; error?: string }> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      error:
        (err as { message?: string }).message ?? "Erreur lors de la création.",
    };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { post: (await res.json()) as Post };
}

export async function updatePost(
  id: string,
  payload: Partial<CreatePostPayload>,
): Promise<{ post?: Post; error?: string }> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      error:
        (err as { message?: string }).message ??
        "Erreur lors de la mise à jour.",
    };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { post: (await res.json()) as Post };
}

export async function deletePost(id: string): Promise<{ error?: string }> {
  const token = (await cookies()).get("access_token")?.value;
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 204 || res.status === 200) {
    revalidatePath("/");
    revalidatePath("/dashboard");
    return {};
  }

  const err = await res.json().catch(() => ({}));
  return {
    error:
      (err as { message?: string }).message ?? "Erreur lors de la suppression.",
  };
}
