import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ARMS Prototype | LNMIIT',
  description: 'Prototype for the Anti-Ragging Monitoring System requirements and UML workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
