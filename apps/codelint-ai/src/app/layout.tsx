import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserAttrCleaner } from '@/features/layout/components';
import { SupabaseConfigWarning } from '@/features/layout/components/supabase-config-warning';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'CodeLint AI Workspace',
  description: 'A shadcn-based workspace for code analysis, refactoring, chat, and preview.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.svg'],
    apple: ['/favicon.svg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head />
      <body suppressHydrationWarning className="min-h-dvh overflow-y-auto bg-background text-foreground antialiased lg:h-dvh lg:overflow-hidden">
        <BrowserAttrCleaner />
        <SupabaseConfigWarning />
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
