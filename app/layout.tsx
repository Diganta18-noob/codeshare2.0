import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CodeShare — Real-time Code Sharing',
  description:
    'Share code in real-time with anyone. No login, no setup. Just paste a URL and start coding together.',
  keywords: ['code sharing', 'real-time', 'collaborative', 'editor', 'monaco'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
