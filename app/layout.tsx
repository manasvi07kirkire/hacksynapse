import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProjectAccess } from "../components/ProjectAccess";

export const metadata: Metadata = {
  title: "SearchOps — The Field Manual",
  description:
    "SearchOps Field Manual: Automated discoverability CI/CD for search crawlers and AI answer engines.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body className="bg-bone-100 text-ink-900 font-sans antialiased selection:bg-ember-600/20 selection:text-ember-600 min-h-screen">
        <ProjectAccess>{children}</ProjectAccess>
      </body>
    </html>
  );
}
