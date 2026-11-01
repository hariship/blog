import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, Inter, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Haripriya's Blog",
  description: "Personal blog by Hari - thoughts, projects, and life updates",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo192.png",
  },
  openGraph: {
    title: "Haripriya's Blog",
    description: "Personal blog by Hari - thoughts, projects, and life updates",
    url: "https://blog.haripriya.org",
    siteName: "Haripriya's Blog",
    images: [
      {
        url: "https://blog.haripriya.org/logo512.png",
        width: 512,
        height: 512,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Haripriya's Blog",
    description: "Personal blog by Hari - thoughts, projects, and life updates",
    images: ["https://blog.haripriya.org/logo512.png"],
  },
  verification: {
    google: 'kpYwakAHhinu9v6zxKNFILU-u5lumjWXp9DEqE5z9Fo',
  },
};

// Revamp type stack (Nov 2026): Space Grotesk titles, Inter body,
// JetBrains Mono for labels/codes. Exposed as CSS variables and consumed
// by src/styles/revamp.css (--rv-display / --rv-body / --rv-mono).
const fontDisplay = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });
const fontBody = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const fontMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });
// Long-form reading face for post bodies (matches the live blog's Source Sans Pro).
const fontReading = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--font-reading", display: "swap" });

// Theme detection script to prevent flash on load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The IndieWebClub webring is part of the *blog* identity, not the
  // personal site. Show it only when serving blog.haripriya.org (and
  // localhost / preview deploys, so dev still sees it).
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase()
  const isPersonalSite = host === 'haripriya.org' || host === 'www.haripriya.org'

  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} ${fontReading.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#121212" />
      </head>
      <body>
        <div className="site-main">
          <Providers>
            {children}
          </Providers>
        </div>
        {!isPersonalSite && (
          <footer style={{
            textAlign: 'center',
            padding: '1.5rem',
            fontSize: '0.85rem',
            opacity: 0.6,
            borderTop: '1px solid var(--color-border, #333)',
            marginTop: '2rem',
          }}>
            <a href="https://blr.indiewebclub.org/webring/previous.html">← Previous</a>
            {' · '}
            <a href="https://blr.indiewebclub.org/">IndieWebClub Bangalore</a>
            {' · '}
            <a href="https://blr.indiewebclub.org/webring/next.html">Next →</a>
          </footer>
        )}
      </body>
    </html>
  );
}
