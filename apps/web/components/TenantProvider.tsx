"use client";

import { useEffect } from "react";
import { TenantConfig } from "@repo/database-mocks";

export default function TenantProvider({
  children,
  tenantConfig,
}: {
  children: React.ReactNode;
  tenantConfig: TenantConfig;
}) {
  useEffect(() => {
    // Injeta as variáveis de cor no :root
    document.documentElement.style.setProperty("--primary", tenantConfig.cor_primaria);
    document.documentElement.style.setProperty("--secondary", tenantConfig.cor_secundaria);
    document.documentElement.style.setProperty("--background-login", `url('${tenantConfig.background_login}')`);
  }, [tenantConfig]);

  return <>{children}</>;
}
