"use client";

import { useEffect, createContext, useContext } from "react";
import { TenantConfig } from "@repo/database-mocks";
import { hexToHSL } from "@/lib/utils";

// Cria o contexto para as configurações
export const TenantContext = createContext<TenantConfig | null>(null);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export default function TenantProvider({
  children,
  tenantConfig,
}: {
  children: React.ReactNode;
  tenantConfig: TenantConfig;
}) {
  useEffect(() => {
    // Injeta as variáveis de cor no :root
    document.documentElement.style.setProperty("--primary", hexToHSL(tenantConfig.cor_primaria));
    document.documentElement.style.setProperty("--secondary", hexToHSL(tenantConfig.cor_secundaria));
    document.documentElement.style.setProperty("--background-login", `url('${tenantConfig.background_login}')`);
  }, [tenantConfig]);

  return (
    <TenantContext.Provider value={tenantConfig}>
      {children}
    </TenantContext.Provider>
  );
}
