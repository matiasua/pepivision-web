import type { Metadata } from 'next';
import { poppins, inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pepi Visión 360',
  description: 'Fundación técnica en construcción (Fase 2).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
