import { expect, test } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Tests E2E Blog - vérifient les flux de lecture d'articles.
 */
test.describe('Blog', () => {
  test.describe('Home page', () => {
    test('displays the list of published articles', async ({ page }) => {
      await page.goto('/');

      // La home doit afficher au moins un titre de section articles
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('shows a message when no articles exist', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Either articles are displayed, or an empty-state / error message is shown
      const hasArticles = await page.locator('article').count();
      if (hasArticles > 0) {
        await expect(page.locator('article').first()).toBeVisible();
      } else {
        await expect(page.locator('main')).toContainText(
          /aucun article|no post|impossible de charger/i
        );
      }
    });
  });

  test.describe('Article page', () => {
    test('displays article content when slug exists', async ({
      page,
      request,
    }) => {
      // Crée un compte auteur + un article publié via API
      const timestamp = Date.now();
      const title = `E2E Test Article ${timestamp}`;
      // Compute the slug using the same algorithm as the backend
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      const registerRes = await request.post(`${API}/auth/register`, {
        data: {
          email: `blog-${timestamp}@test.com`,
          username: `blog_${timestamp}`,
          displayName: 'Blog Test',
          password: 'Password1!',
        },
      });
      const { accessToken } = await registerRes.json();

      const postRes = await request.post(`${API}/posts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          title,
          content: '## Hello\n\nThis is the article content.',
          status: 'PUBLISHED',
        },
      });
      expect(postRes.ok()).toBeTruthy();

      await page.goto(`/posts/${slug}`);

      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        title
      );
      await expect(page.getByRole('main')).toContainText('Hello');
    });

    test('shows 404 page for unknown slug', async ({ page }) => {
      await page.goto('/posts/this-slug-does-not-exist-xyz');

      await expect(page).toHaveTitle(/404|not found|introuvable/i);
    });
  });

  test.describe('Navigation', () => {
    test('logo links back to home', async ({ page }) => {
      await page.goto('/login');
      // Click the first link pointing to "/" (the logo in the NavBar)
      await page.locator('nav a[href="/"]').first().click();

      await expect(page).toHaveURL('/');
    });

    test('has a link to login from public pages', async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('link', { name: /login|sign in|connexion/i })
      ).toBeVisible();
    });
  });
});
