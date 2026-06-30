"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { alunoProfileMock } from "@repo/database-mocks";
import { useTenant } from "@/components/TenantProvider";
import { FrequenciaProvider } from "@/contexts/FrequenciaContext";
import { BookOpen, User, Calendar, LogOut, Menu, X, Laptop, Settings, FileSignature, Library } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantConfig = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    setUserRole(role);

    // Se o usuário for aluno e tentar acessar páginas restritas, redireciona para o boletim
    if (role === 'aluno' && (pathname.includes('/dashboard/frequencia') || pathname.includes('/admin/settings'))) {
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
    <div className="flex h-screen overflow-hidden bg-muted relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer (Sidebar deslizante) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-muted border-r border-border shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 ring-2 ring-primary">
              <img
                src={tenantConfig.logo_url}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight text-primary">
                {tenantConfig.nome}
              </h2>
              <p className="text-xs text-muted-foreground">Área do Aluno</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/dashboard/boletim" passHref>
            <Button
              variant={pathname === "/dashboard/boletim" ? "secondary" : "ghost"}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full justify-start font-medium ${pathname === "/dashboard/boletim"
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Meu Boletim
            </Button>
          </Link>
          <Link href="/dashboard/presenca-online" passHref>
            <Button
              variant={pathname === "/dashboard/presenca-online" ? "secondary" : "ghost"}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full justify-start font-medium ${pathname === "/dashboard/presenca-online"
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Laptop className="mr-3 h-5 w-5" />
              Confirmar Presença
            </Button>
          </Link>

          {userRole !== 'aluno' && (
            <>
              <Link href="/dashboard/frequencia" passHref>
                <Button
                  variant={pathname === "/dashboard/frequencia" ? "secondary" : "ghost"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full justify-start font-medium ${pathname === "/dashboard/frequencia"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Frequência & Abonos
                </Button>
              </Link>
              <Link href="/materias" passHref>
                <Button
                  variant={pathname === "/materias" ? "secondary" : "ghost"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full justify-start font-medium ${pathname === "/materias"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Library className="mr-3 h-5 w-5" />
                  Disciplinas
                </Button>
              </Link>
              <Link href="/simulados" passHref>
                <Button
                  variant={pathname === "/simulados" ? "secondary" : "ghost"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full justify-start font-medium ${pathname === "/simulados"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FileSignature className="mr-3 h-5 w-5" />
                  Simulados
                </Button>
              </Link>
              <Link href="/admin/settings" passHref>
                <Button
                  variant={pathname === "/admin/settings" ? "secondary" : "ghost"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full justify-start font-medium ${pathname === "/admin/settings"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Configurações
                </Button>
              </Link>
            </>
          )}

          <Link href="#" passHref>
            <Button
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full justify-start font-medium text-muted-foreground hover:text-foreground"
            >
              <User className="mr-3 h-5 w-5" />
              Perfil
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <Link href="/login" passHref>
            <Button
              variant="outline"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-none"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </Link>
        </div>
      </aside>

      {/* Sidebar Escaneável e Tematizada (Desktop) */}
      <aside className="hidden md:flex w-64 h-full flex-col bg-muted border-r border-border shadow-sm shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-border">
          <div className="w-10 h-10 rounded-full overflow-hidden mr-3 ring-2 ring-primary">
            <img 
              src={tenantConfig.logo_url} 
              alt="Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="font-semibold text-lg text-sidebar-foreground truncate max-w-[140px]">
              {tenantConfig.nome}
            </span>
            <p className="text-xs text-muted-foreground">Área do Aluno</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/dashboard/boletim" passHref>
            <Button
              variant={pathname === "/dashboard/boletim" ? "secondary" : "ghost"}
              className={`w-full justify-start font-medium ${pathname === "/dashboard/boletim"
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <BookOpen className="mr-3 h-5 w-5" />
              Meu Boletim
            </Button>
          </Link>
          <Link href="/dashboard/presenca-online" passHref>
            <Button
              variant={pathname === "/dashboard/presenca-online" ? "secondary" : "ghost"}
              className={`w-full justify-start font-medium ${pathname === "/dashboard/presenca-online"
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Laptop className="mr-3 h-5 w-5" />
              Confirmar Presença
            </Button>
          </Link>

          {userRole !== 'aluno' && (
            <>
              <Link href="/dashboard/frequencia" passHref>
                <Button
                  variant={pathname === "/dashboard/frequencia" ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${pathname === "/dashboard/frequencia"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Frequência & Abonos
                </Button>
              </Link>
              <Link href="/materias" passHref>
                <Button
                  variant={pathname === "/materias" ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${pathname === "/materias"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Library className="mr-3 h-5 w-5" />
                  Disciplinas
                </Button>
              </Link>
              <Link href="/simulados" passHref>
                <Button
                  variant={pathname === "/simulados" ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${pathname === "/simulados"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FileSignature className="mr-3 h-5 w-5" />
                  Simulados
                </Button>
              </Link>
              <Link href="/admin/settings" passHref>
                <Button
                  variant={pathname === "/admin/settings" ? "secondary" : "ghost"}
                  className={`w-full justify-start font-medium ${pathname === "/admin/settings"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Configurações
                </Button>
              </Link>
            </>
          )}

          <Link href="#" passHref>
            <Button
              variant="ghost"
              className="w-full justify-start font-medium text-muted-foreground hover:text-foreground"
            >
              <User className="mr-3 h-5 w-5" />
              Perfil
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <Link href="/login" passHref>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-none"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Header Responsivo */}
        <header className="h-20 backdrop-blur-md bg-white/80 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 z-30 relative shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-foreground">
                {alunoProfileMock.nome}
              </p>
              <p className="text-xs text-muted-foreground">{alunoProfileMock.turma}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold border border-primary/20">
              {alunoProfileMock.nome
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 md:px-8 overflow-y-auto">
          <FrequenciaProvider>{children}</FrequenciaProvider>
        </div>
      </main>
    </div>
  );
}
