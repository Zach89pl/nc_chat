import type { ReactNode } from "react";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata = {
  title: "Nyan Problem Solver",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={pixelFont.variable}>
      <body>{children}</body>
    </html>
  );
}
