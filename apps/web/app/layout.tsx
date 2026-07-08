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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // Busca a configuração do Tenant da API pública (para Single-tenant, pega o primeiro)
  let tenantConfig = tenantConfigMock;
  const backendUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${backendUrl}/api/tenant/public-config`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // Mapeia do backend pro formato esperado pelo frontend
      tenantConfig = {
        ...tenantConfigMock,
        cor_primaria: data.primaryColor || tenantConfigMock.cor_primaria,
        cor_secundaria: data.secondaryColor || tenantConfigMock.cor_secundaria,
        logo_url: data.logoUrl ? data.logoUrl.replace(backendUrl, '') : tenantConfigMock.logo_url,
        background_login: data.loginUrl ? data.loginUrl.replace(backendUrl, '') : tenantConfigMock.background_login,
        nome: data.name || tenantConfigMock.nome
      };
    }
  } catch (error) {
    console.error('Erro ao buscar tenant config:', error);
  }

  return (
    // O suppressHydrationWarning impede que extensões de terceiros que injetam 
    // atributos nas tags quebrem o ciclo de vida do React no mobile.
    <html lang="pt-BR" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <TenantProvider tenantConfig={tenantConfig}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}