import type { Metadata } from 'next';
import './globals.css';
import SiteNav from '../components/SiteNav';

export const metadata: Metadata = {
  title: 'Vision Therapy — HTS2 Modes',
  description:
    'Client-side red/cyan anaglyph vision therapy suite replicating HTS2 exercise mechanics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#05070a]">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
