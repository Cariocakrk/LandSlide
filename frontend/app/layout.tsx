import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Sidebar } from '@/components/Sidebar';
import { LiveAlertLogs } from '@/components/LiveAlertLogs';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GeoShield Monitor - Deslizamentos',
  description: 'Sistema inteligente de monitoramento preventivo de deslizamentos via IoT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background antialiased flex overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto flex flex-col relative w-full">
            {children}
          </main>
          <LiveAlertLogs />
        </ThemeProvider>
      </body>
    </html>
  );
}
