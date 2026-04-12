import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CafeToolbox - Dashboard",
  description: "Your all-in-one dashboard and toolbox",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased">
        <Script
          src="https://code.iconify.design/3/3.1.1/iconify.min.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
