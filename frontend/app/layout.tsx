import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Sidebar } from '@/components/sidebar';
import { LiveAlertLogs } from '@/components/LiveAlertLogs';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased flex overflow-hidden">
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
