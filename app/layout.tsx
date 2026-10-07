import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IRVE — Communes sous-équipées',
  description:
    'Détecteur de communes sous-équipées en bornes de recharge pour véhicules électriques (hackathon).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
