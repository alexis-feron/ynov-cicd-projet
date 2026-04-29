'use client';

import { BookOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Articles' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/login', label: 'Connexion' },
  { href: '/register', label: 'Inscription' },
];

const ghostLink =
  'inline-flex items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-8';

// Lazy-load the mobile menu - it is never visible on desktop and does not
// affect the LCP element, so deferring it reduces Total Blocking Time.
const MobileMenu = dynamic(() => import('./MobileMenu'), { ssr: false });

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-80 transition-opacity"
          >
            <BookOpen className="h-5 w-5" />
            Blog
          </Link>

          {/* Desktop links - pure server HTML, zero client JS */}
          <ul className="hidden sm:flex gap-1 items-center list-none m-0 p-0">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={ghostLink}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile menu - lazy loaded, not in the critical JS path */}
          <MobileMenu links={navLinks} />
        </div>
      </div>
    </nav>
  );
}
