import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LawAI - Søk i Tvisteløsningsnemndas avgjørelser",
  description:
    "Søk og finn relevante avgjørelser fra Tvisteløsningsnemnda med AI-drevet søk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className={`${inter.variable} antialiased flex flex-col min-h-screen`}>
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
