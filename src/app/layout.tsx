import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GTT Live — Torino Bus & Tram Tracker",
  description:
    "Mappa live dei bus e tram GTT a Torino. Fermate, avvisi e preferiti. Open source, senza account.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GTT Live",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0B5FFF",
};

const themeBoot = `(function(){try{var k='gtt.theme.v1';var v=localStorage.getItem(k);if(v!=='dark'&&v!=='light'){var h=new Date().getHours();v=(h>=19||h<7)?'dark':'light';}document.documentElement.setAttribute('data-theme',v);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
