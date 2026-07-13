import type { Metadata } from 'next';
import { poppins, inter } from '@/lib/fonts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppFloatButton } from '@/components/WhatsAppFloatButton';
import { CookieBanner } from '@/components/CookieBanner';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:8080';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Pepi Visión 360 · Ver bien nunca fue tan fácil',
    template: '%s · Pepi Visión 360',
  },
  description:
    'Pepi Visión 360 — óptica virtual en Chile. Armazones modernos, cristales personalizados y atención a domicilio. Cotiza tus lentes por WhatsApp.',
  openGraph: {
    title: 'Pepi Visión 360 · Ver bien nunca fue tan fácil',
    description:
      'Armazones modernos, cristales personalizados y atención cercana, sin salir de casa.',
    type: 'website',
    locale: 'es_CL',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable} antialiased`}>
      <body className="flex min-h-screen flex-col bg-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido principal
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsAppFloatButton />
        <CookieBanner />
      </body>
    </html>
  );
}
