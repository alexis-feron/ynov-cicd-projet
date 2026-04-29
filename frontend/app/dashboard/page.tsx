import { apiUrl } from '@/lib/api';
import { getAccessToken, getCurrentUser } from '@/lib/auth';
import type { PaginatedPosts } from '@/types';
import { redirect } from 'next/navigation';
import DashboardShell from './DashboardShell';
import LogoutButton from './LogoutButton';

async function fetchAllPosts(token: string): Promise<PaginatedPosts> {
  const res = await fetch(apiUrl('/posts?page=1&limit=100'), {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } };
  }
  return res.json() as Promise<PaginatedPosts>;
}

export default async function DashboardPage() {
  const token = await getAccessToken();
  const user = await getCurrentUser();

  if (!token || !user) {
    redirect('/login');
  }

  const { data: posts } = await fetchAllPosts(token);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Bienvenue,{' '}
            <span className="font-medium text-foreground">
              {user.displayName} !
            </span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <DashboardShell initialPosts={posts} />
    </main>
  );
}
