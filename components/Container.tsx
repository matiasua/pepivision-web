import type { ReactNode } from 'react';

const maxWidths = {
  wide: 'max-w-6xl', // 1200px, mockup's home/catalog/faq(820)-ish wide sections
  default: 'max-w-5xl', // ~1080-1140px, ficha/nosotros/derechos-arco
  narrow: 'max-w-3xl', // ~820-860px, cotizador/faq/legal pages
} as const;

export function Container({
  children,
  size = 'wide',
  className = '',
}: {
  children: ReactNode;
  size?: keyof typeof maxWidths;
  className?: string;
}) {
  return <div className={`mx-auto w-full px-5 ${maxWidths[size]} ${className}`}>{children}</div>;
}
