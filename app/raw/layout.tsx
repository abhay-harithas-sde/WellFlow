import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'WellFlow',
  description: 'WellFlow wellness dashboard',
};

export default function BJPLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
