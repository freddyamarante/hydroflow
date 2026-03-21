import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { publicSans, barlow, barlowCondensed } from "@/lib/fonts";

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
    <html lang="en" className="dark">
      <body className={`${publicSans.variable} ${barlow.variable} ${barlowCondensed.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
