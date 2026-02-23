import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#121212" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
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
      </body>
    </html>
  );
}
