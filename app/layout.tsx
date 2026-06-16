import type { Metadata } from 'next';
import AuthProvider from '../components/AuthProvider';

import './globals.css';

export const metadata: Metadata = {
  title: '元分 · 智解',
  description: 'A divination application using local chart algorithms and expert AI interpretation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
