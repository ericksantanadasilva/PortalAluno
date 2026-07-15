"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/components/TenantProvider";
import { FrequenciaProvider } from "@/contexts/FrequenciaContext";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantConfig = useTenant();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("tenant_slug");
    router.push("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.replace('/login');
      return;
    }

    const role = localStorage.getItem('user_role');
    setUserRole(role);

    // Carrega o perfil logado
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) setUserProfile(data);
    })
    .catch(err => console.error(err));

    // Se o usuário for aluno e tentar acessar páginas restritas, redireciona para o boletim
    if (role === 'aluno' && (pathname.includes('/dashboard/frequencia') || pathname.includes('/admin/settings'))) {
      router.replace('/dashboard/boletim');
    } else if (!['admin', 'super_admin'].includes(role || '') && pathname.includes('/admin/tri')) {
      // Bloqueia qualquer não-admin de acessar o Mapeador TRI
      router.replace('/dashboard/boletim');
    } else {
      setIsCheckingRole(false);
    }
  }, [pathname, router]);

  // Evita o "flash" da página protegida enquanto o useEffect avalia o redirecionamento
  if (isCheckingRole) {
    return <div className="h-screen w-full flex items-center justify-center bg-muted text-muted-foreground text-sm">Carregando acessos...</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar 
        userRole={userRole} 
        userProfile={userProfile} 
        tenantConfig={tenantConfig} 
        onLogout={handleLogout} 
      />
      
      <SidebarInset>
        {/* Header Responsivo */}
        <header className="sticky top-0 h-16 shrink-0 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 z-30 bg-background shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground ml-2">Dashboard</h1>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#F8FAFC]">
          <div className="p-4 py-6 md:p-8 min-h-full">
            <FrequenciaProvider>{children}</FrequenciaProvider>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
