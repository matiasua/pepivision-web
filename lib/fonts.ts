import localFont from 'next/font/local';

// Self-hosted brand typefaces (Poppins for display/headings, Inter for
// body text), matching design-reference/. Files live in public/fonts/ —
// no Google Fonts CDN dependency at runtime.
export const poppins = localFont({
  src: [
    { path: '../public/fonts/poppins-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/poppins-latin-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/poppins-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

export const inter = localFont({
  src: [
    { path: '../public/fonts/inter-latin-400-600.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/inter-latin-400-600.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/inter-latin-400-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});
