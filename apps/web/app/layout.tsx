import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import TenantProvider from "@/components/TenantProvider";
import { tenantConfigMock } from "@repo/database-mocks";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Portal do Aluno - SaaS de Gestão Pedagógica",
  description: "Sistema escolar de alta performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // O suppressHydrationWarning impede que extensões de terceiros que injetam 
    // atributos nas tags quebrem o ciclo de vida do React no mobile.
    <html lang="pt-BR" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <TenantProvider tenantConfig={tenantConfigMock}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}