import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Sidebar } from '@/components/sidebar';
import { LiveAlertLogs } from '@/components/LiveAlertLogs';
import { TopographicBg } from '@/components/TopographicBg';

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
  title: 'LandSlide | GeoShield — Monitoramento Geotécnico e Estabilidade de Encostas',
  description: 'Plataforma de engenharia geotécnica preditiva, modelagem topográfica 3D e prevenção de deslizamentos.',
  icons: {
    icon: '/logo-landslide.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased flex overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto flex flex-col relative w-full bg-[var(--background)] text-[var(--foreground)]">
            <TopographicBg />
            <div className="relative z-10 flex-1 flex flex-col w-full">
              {children}
            </div>
          </main>
          <LiveAlertLogs />
        </ThemeProvider>
      </body>
    </html>
  );
}
