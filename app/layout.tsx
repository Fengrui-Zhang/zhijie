import type { Metadata } from 'next';
import Script from 'next/script';

import './globals.css';

export const metadata: Metadata = {
  title: '元分 · 智解',
  description: 'A mystical divination application using the Yuanfenju Qimen API for charting and DeepSeek R1 for expert interpretation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
