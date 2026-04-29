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

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const displayName = (form.elements.namedItem('displayName') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      setPending(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, displayName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message)
          ? data.message.join(' ')
          : (data.message ?? "Erreur lors de l'inscription.");
        setError(msg);
        return;
      }

      window.location.assign('/dashboard');
    } catch {
      setError('Une erreur réseau est survenue. Réessayez.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>Rejoignez la communauté des rédacteurs</CardDescription>
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
              <Label htmlFor="username">Nom d&apos;utilisateur</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                placeholder="jean_dupont"
                pattern="^[a-z0-9_]+$"
              />
              <span className="text-xs text-muted-foreground">
                Minuscules, chiffres et underscores (3–30 caractères)
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Nom affiché</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Jean Dupont"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
              />
              <span className="text-xs text-muted-foreground">
                Au moins 8 caractères, une majuscule, une minuscule et un chiffre
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={pending} className="w-full mt-2">
              {pending ? 'Création du compte…' : 'Créer mon compte'}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
