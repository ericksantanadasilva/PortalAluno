"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Laptop, FileSignature, Briefcase, LogOut, Settings, ChevronsUpDown, ChevronRight, GraduationCap, LayoutDashboard } from "lucide-react";

interface AppSidebarProps {
  userRole: string | null;
  userProfile: any;
  tenantConfig: any;
  onLogout: () => void;
}

export function AppSidebar({ userRole, userProfile, tenantConfig, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")
    : "US";

  return (
    <Sidebar collapsible="icon" className="border-r shadow-sm">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default">
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-transparent overflow-hidden border border-border shrink-0">
                {tenantConfig?.logo_url ? (
                  <img src={tenantConfig.logo_url} alt="Logo" className="size-full object-cover" />
                ) : (
                  <GraduationCap className="size-4 text-primary" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{tenantConfig?.nome || "Portal de Ensino"}</span>
                <span className="truncate text-xs text-muted-foreground">Área do {userRole === 'aluno' ? 'Aluno' : 'Colaborador'}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {userRole === 'aluno' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/dashboard/boletim" />} isActive={pathname === "/dashboard/boletim"} tooltip="Meu Boletim">
                  <BookOpen />
                  <span>Meu Boletim</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/dashboard/presenca-online" />} isActive={pathname === "/dashboard/presenca-online"} tooltip="Confirmar Presença">
                  <Laptop />
                  <span>Confirmar Presença</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/dashboard/simulados" />} isActive={pathname.startsWith("/dashboard/simulados")} tooltip="Meus Simulados">
                  <FileSignature />
                  <span>Meus Simulados</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Painel de Controle</SidebarGroupLabel>
            <SidebarMenu>
              {/* Principal Collapsible para não alunos */}
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <SidebarMenuButton render={<CollapsibleTrigger />} tooltip="Principal">
                    <LayoutDashboard />
                    <span>Principal</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/dashboard/boletim" />} isActive={pathname === "/dashboard/boletim"}>
                          <BookOpen className="size-4" />
                          <span>Meu Boletim</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/dashboard/presenca-online" />} isActive={pathname === "/dashboard/presenca-online"}>
                          <Laptop className="size-4" />
                          <span>Confirmar Presença</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/dashboard/simulados" />} isActive={pathname.startsWith("/dashboard/simulados")}>
                          <FileSignature className="size-4" />
                          <span>Meus Simulados</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Acadêmico Collapsible */}
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <SidebarMenuButton render={<CollapsibleTrigger />} tooltip="Acadêmico">
                    <GraduationCap />
                    <span>Acadêmico</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/dashboard/frequencia" />} isActive={pathname === "/dashboard/frequencia"}>
                          <span>Frequência & Abonos</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/materias" />} isActive={pathname === "/materias"}>
                          <span>Disciplinas</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/simulados" />} isActive={pathname === "/simulados"}>
                          <span>Simulados Banco</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/admin/settings?tab=omr" />} isActive={pathname === "/admin/settings" && tab === "omr"}>
                          <span>Importação OMR</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {userRole === 'admin' && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<Link href="/admin/tri" />} isActive={pathname === "/admin/tri"}>
                            <span>Mapeador TRI</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Administração Collapsible */}
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <SidebarMenuButton render={<CollapsibleTrigger />} tooltip="Administração">
                    <Briefcase />
                    <span>Administração</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/admin/settings?tab=students" />} isActive={pathname === "/admin/settings" && tab === "students"}>
                          <span>Gestão de Alunos</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton render={<Link href="/admin/settings?tab=employees" />} isActive={pathname === "/admin/settings" && tab === "employees"}>
                          <span>Gestão de Equipe</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {userRole === 'admin' && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton render={<Link href="/admin/settings?tab=whitelabel" />} isActive={pathname === "/admin/settings" && tab === "whitelabel"}>
                            <span>Personalização (Tema)</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground outline-none transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 h-12">
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    <AvatarImage src="" alt={userProfile?.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{userProfile?.name || "Carregando..."}</span>
                    <span className="truncate text-xs opacity-80">{userProfile?.email || "portal@exemplo.com"}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-lg border-border z-50"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-3 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src="" alt={userProfile?.name} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{userProfile?.name || "Usuário"}</span>
                        <span className="truncate text-xs opacity-75">{userProfile?.email || "portal@exemplo.com"}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuGroup>
                  <DropdownMenuItem className="cursor-pointer flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                    Meu Perfil
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
