import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import ConvexClerkProvider from "./providers/ConvexProviderWithClerk";
import AudioProvider from "./providers/AudioProvider";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Podcast App",
  description: "Generate podcasts with AI",
  icons: "favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <ConvexClerkProvider>
          <AudioProvider>
            {children}
          </AudioProvider>
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
