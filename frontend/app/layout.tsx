import type { Metadata } from 'next';
import NavBar from './components/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Blog application',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-white text-slate-900 antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
