import { expect, test } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Tests E2E Auth - vérifient les flux utilisateur complets via le navigateur.
 * Ces tests ciblent les pages Next.js qui appellent le backend.
 */
test.describe('Authentication flow', () => {
  test.describe('Register', () => {
    test('user can register and is redirected to dashboard', async ({
      page,
    }) => {
      const timestamp = Date.now();

      await page.goto('/register');
      await page.getByLabel('Adresse email').fill(`e2e-${timestamp}@test.com`);
      await page.getByLabel("Nom d'utilisateur").fill(`e2e_${timestamp}`);
      await page.getByLabel('Nom affiché').fill('E2E Test User');
      await page.getByLabel('Mot de passe').first().fill('Password1!');
      await page.getByLabel('Confirmer le mot de passe').fill('Password1!');

      await page.getByRole('button', { name: /créer mon compte/i }).click();

      // Après inscription réussie → redirigé vers le dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('shows validation error for weak password', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Adresse email').fill('weak@test.com');
      await page.getByLabel("Nom d'utilisateur").fill('weakuser');
      await page.getByLabel('Nom affiché').fill('Weak');
      await page.getByLabel('Mot de passe').first().fill('weak');
      await page.getByLabel('Confirmer le mot de passe').fill('weak');

      await page.getByRole('button', { name: /créer mon compte/i }).click();

      await expect(page.locator("p[role='alert']")).toBeVisible();
    });

    test('shows error when email is already taken', async ({
      page,
      request,
    }) => {
      // Crée le compte via API d'abord
      await request.post(`${API}/auth/register`, {
        data: {
          email: 'existing@test.com',
          username: 'existing_user',
          displayName: 'Existing',
          password: 'Password1!',
        },
      });

      await page.goto('/register');
      await page.getByLabel('Adresse email').fill('existing@test.com');
      await page.getByLabel("Nom d'utilisateur").fill('other_user');
      await page.getByLabel('Nom affiché').fill('Other');
      await page.getByLabel('Mot de passe').first().fill('Password1!');
      await page.getByLabel('Confirmer le mot de passe').fill('Password1!');

      await page.getByRole('button', { name: /créer mon compte/i }).click();

      await expect(page.locator("p[role='alert']")).toContainText(
        /already|déjà/i
      );
    });
  });

  test.describe('Login', () => {
    test('user can log in with valid credentials', async ({
      page,
      request,
    }) => {
      const timestamp = Date.now();
      const email = `login-${timestamp}@test.com`;

      // Crée le compte via API
      await request.post(`${API}/auth/register`, {
        data: {
          email,
          username: `login_${timestamp}`,
          displayName: 'Login Test',
          password: 'Password1!',
        },
      });

      await page.goto('/login');
      await page.getByLabel('Adresse email').fill(email);
      await page.getByLabel('Mot de passe').fill('Password1!');
      await page.getByRole('button', { name: /se connecter/i }).click();

      await expect(page).toHaveURL(/\/(dashboard|blog|$)/);
    });

    test('shows error for wrong password', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Adresse email').fill('nonexistent@test.com');
      await page.getByLabel('Mot de passe').fill('WrongPassword1!');
      await page.getByRole('button', { name: /se connecter/i }).click();

      await expect(page.locator("p[role='alert']")).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('authenticated user can log out', async ({ page, request }) => {
      const timestamp = Date.now();

      // Register + login via API pour avoir un token
      await request.post(`${API}/auth/register`, {
        data: {
          email: `logout-${timestamp}@test.com`,
          username: `logout_${timestamp}`,
          displayName: 'Logout Test',
          password: 'Password1!',
        },
      });

      // Login via la page
      await page.goto('/login');
      await page
        .getByLabel('Adresse email')
        .fill(`logout-${timestamp}@test.com`);
      await page.getByLabel('Mot de passe').fill('Password1!');
      await page.getByRole('button', { name: /se connecter/i }).click();
      await page.waitForURL(/\/dashboard/);

      // Logout
      const logoutBtn = page.getByRole('button', { name: /se déconnecter/i });
      await expect(logoutBtn).toBeVisible({ timeout: 15000 });
      await logoutBtn.click();

      await expect(page).toHaveURL('/login');
    });
  });
});
