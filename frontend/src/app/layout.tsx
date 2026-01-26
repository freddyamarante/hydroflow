import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HydroFlow - Sistema de Monitoreo IoT",
  description: "Sistema de monitoreo para gestión hídrica de fincas camaroneras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} antialiased dark`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
