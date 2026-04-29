'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Identifiants invalides.');
        return;
      }

      globalThis.location.assign('/dashboard');
    } catch {
      setError('Une erreur réseau est survenue. Réessayez.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6 bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace rédacteur</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <p
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3.5 py-2.5"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="vous@exemple.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={pending} className="w-full mt-2">
              {pending ? 'Connexion…' : 'Se connecter'}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Créer un compte
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
