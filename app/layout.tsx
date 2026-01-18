import "./globals.css";

export const metadata = {
  title: "DeepSeek R1 Playground",
  description: "Next.js app powered by DeepSeek R1 via a secure backend."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
