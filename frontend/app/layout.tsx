import type { Metadata } from "next";
import { Manrope, Galindo } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
});

const galindo = Galindo({
  variable: "--font-galindo",
  subsets: ["latin"],
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Vault - Universal Preference Manager",
  description: "Your preferences, your rules, your playground",
};

import APIProvider from '../lib/providers/trpc-provider';
import { AuthProvider } from '../lib/contexts/auth-context';
import HealthCheck from '../components/HealthCheck';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${galindo.variable} font-[family-name:var(--font-manrope)] antialiased`}
      >
        <APIProvider>
          <AuthProvider>
            {children}
            <HealthCheck />
          </AuthProvider>
        </APIProvider>
      </body>
    </html>
  );
}
