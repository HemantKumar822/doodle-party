import type { Metadata } from "next";
import { Permanent_Marker } from "next/font/google";
import "./globals.css";

const permanentMarker = Permanent_Marker({
  weight: "400",
  variable: "--font-permanent-marker",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doodle Party",
  description: "A hand-drawn multiplayer drawing game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${permanentMarker.variable} antialiased`}
      >
        {/* Global SVG Filters for CSS Effects */}
        <svg
          style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <defs>
            <filter id="rough-paper">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
            </filter>
          </defs>
        </svg>

        {children}
      </body>
    </html>
  );
}
