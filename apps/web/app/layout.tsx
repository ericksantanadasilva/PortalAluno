import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Ubuntu } from "next/font/google";
import { cn } from "@/lib/utils";
import TenantProvider from "@/components/TenantProvider";
import { tenantConfigMock } from "@repo/database-mocks";
import { headers } from "next/headers";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
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
  // Extrai o slug do header (injetado pelo middleware)
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug') || '';

  // Busca a configuração do Tenant da API pública
  let tenantConfig: Record<string, any> = { ...tenantConfigMock, slug };
  const backendUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  
  try {
    const fetchUrl = slug ? `${backendUrl}/api/tenant/public-config?slug=${slug}` : `${backendUrl}/api/tenant/public-config`;
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    
    if (res.ok) {
      const data = await res.json();
      const tenantName = data.name || tenantConfigMock.nome;
      let primaryColor = data.primaryColor || '1e3a8a';
      
      // Limpa a cor para o ui-avatars (aceita apenas hex sem hashtag)
      if (primaryColor.startsWith('#')) {
        primaryColor = primaryColor.replace('#', '');
      } else if (primaryColor.includes(' ')) {
        // Se for um HSL legado do mock (ex: '130 30% 45%'), cai pro fallback azul padrão
        primaryColor = '1e3a8a';
      }

      const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName)}&background=${primaryColor}&color=fff&size=128`;

      // Normaliza URLs de upload para caminhos relativos (/api/upload/...),
      // evitando erros com 'localhost:3001' ou portas antigas gravadas no banco.
      const normalizeImageUrl = (url: string | null | undefined) => {
        if (!url) return null;
        const uploadIndex = url.indexOf('/api/upload/');
        if (uploadIndex !== -1) {
          return url.substring(uploadIndex);
        }
        return url;
      };

      const logoUrlClean = normalizeImageUrl(data.logoUrl);
      const loginUrlClean = normalizeImageUrl(data.loginUrl);

      // Mapeia do backend pro formato esperado pelo frontend
      tenantConfig = {
        ...tenantConfig,
        cor_primaria: data.primaryColor || tenantConfigMock.cor_primaria,
        cor_secundaria: data.secondaryColor || tenantConfigMock.cor_secundaria,
        logo_url: logoUrlClean || fallbackLogo,
        background_login: loginUrlClean || tenantConfigMock.background_login,
        nome: tenantName,
        allowedReportTemplates: data.allowedReportTemplates || (tenantConfigMock as any).allowedReportTemplates || ["ENEM", "UERJ", "ENEM_PARCIAL", "DISCURSIVO"]
      };
    }
  } catch (error) {
    console.error('Erro ao buscar tenant config:', error);
  }

  return (
    // O suppressHydrationWarning impede que extensões de terceiros que injetam 
    // atributos nas tags quebrem o ciclo de vida do React no mobile.
    <html lang="pt-BR" className={cn("font-sans", ubuntu.variable)} suppressHydrationWarning>
      <body
        className={`${ubuntu.className} ${geistMono.variable} antialiased min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <TenantProvider tenantConfig={tenantConfig as any}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}