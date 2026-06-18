"use client"

import { usePathname } from "next/navigation";
import { tenantConfigMock, alunoProfileMock } from "@repo/database-mocks";
import { BookOpen, User, Calendar, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      {/* Sidebar Escaneável e Tematizada */}
      <aside className="hidden md:flex w-64 h-full flex-col bg-background border-r border-border shadow-sm">
        <div className="h-20 flex items-center px-6 border-b border-border">
          <div className="w-10 h-10 rounded-full overflow-hidden mr-3 ring-2 ring-primary">
            <img src={tenantConfigMock.logo_url} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-tight text-primary">{tenantConfigMock.nome}</h2>
            <p className="text-xs text-muted-foreground">Área do Aluno</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/dashboard/boletim" passHref>
            <Button variant={pathname === "/dashboard/boletim" ? "secondary" : "ghost"}
              className={`w-full justify-start font-medium ${pathname === "/dashboard/boletim"
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}>
              <BookOpen className="mr-3 h-5 w-5" />
              Meu Boletim
            </Button>
          </Link>
          <Link href="/dashboard" passHref>
            <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"}
              className={`w-full justify-start font-medium ${pathname === "/dashboard"
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
                }`}>
              <BookOpen className="mr-3 h-5 w-5" />
              Meu Boletim json
            </Button>
          </Link>
          <Link href="#" passHref>
            <Button variant="ghost" className="w-full justify-start font-medium text-muted-foreground hover:text-foreground">
              <Calendar className="mr-3 h-5 w-5" />
              Calendário
            </Button>
          </Link>
          <Link href="#" passHref>
            <Button variant="ghost" className="w-full justify-start font-medium text-muted-foreground hover:text-foreground">
              <User className="mr-3 h-5 w-5" />
              Perfil
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <Link href="/login" passHref>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-none">
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header Responsivo */}
        <header className="h-20 bg-background border-b border-border flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center">
            {/* Ícone de menu mobile poderia vir aqui */}
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-foreground">{alunoProfileMock.nome}</p>
              <p className="text-xs text-muted-foreground">{alunoProfileMock.turma}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold border border-primary/20">
              {alunoProfileMock.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
