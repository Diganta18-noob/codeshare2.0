import type { Metadata } from 'next';
import '@/styles/globals.css';
import GSAPProvider from '@/components/providers/GSAPProvider';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';

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
      <body>
        <GSAPProvider>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </GSAPProvider>
      </body>
    </html>
  );
}

