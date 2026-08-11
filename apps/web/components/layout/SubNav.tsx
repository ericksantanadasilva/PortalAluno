"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubNavTab {
  /** Identificador único da tab. */
  id: string;
  /** Texto exibido na tab. */
  label: string;
  /** Ícone do Lucide (componente, não instância). */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Se preenchido, renderiza como `<Link>` ao invés de tab controlada.
   * Útil para navegação por rotas (ex: `/corrections/presential`).
   */
  href?: string;
  /** Contador exibido ao lado do label. */
  count?: number;
}

interface SubNavProps {
  /** Lista de tabs a renderizar. */
  tabs: SubNavTab[];
  /**
   * Tab ativa (para tabs controladas, sem `href`).
   * Quando as tabs usam `href`, a tab ativa é determinada automaticamente pelo pathname.
   */
  activeTab?: string;
  /** Callback chamado ao trocar de tab (para tabs controladas). */
  onTabChange?: (id: string) => void;
  /**
   * Renderiza um `<Select>` no mobile ao invés das pills.
   * @default true
   */
  mobileSelect?: boolean;
  className?: string;
}

/**
 * Navegação secundária em tabs/pills.
 *
 * Suporta dois modos:
 * 1. **Controlado** (`activeTab` + `onTabChange`): para tabs que alternam conteúdo na mesma página.
 * 2. **Link-based** (`href` em cada tab): para navegação entre rotas Next.js.
 *
 * @example
 * // Modo controlado (tabs na mesma página)
 * <SubNav
 *   tabs={[
 *     { id: "chamada", label: "Chamada Diária", icon: ClipboardList },
 *     { id: "abonos", label: "Abonos", icon: ShieldAlert },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 *
 * @example
 * // Modo link-based (navegação entre rotas)
 * <SubNav
 *   tabs={[
 *     { id: "presential", label: "Recebimento Presencial", icon: UploadCloud, href: "/corrections/presential" },
 *     { id: "submissions", label: "Entregas", icon: FileText, href: "/corrections/submissions" },
 *   ]}
 * />
 */
export function SubNav({
  tabs,
  activeTab,
  onTabChange,
  mobileSelect = true,
  className,
}: SubNavProps) {
  const pathname = usePathname();

  const isLinkMode = tabs.some((tab) => tab.href);

  const getIsActive = (tab: SubNavTab) => {
    if (isLinkMode && tab.href) {
      return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    }
    return tab.id === activeTab;
  };

  const currentTab = tabs.find(getIsActive) || tabs[0];

  const handleTabClick = (tab: SubNavTab) => {
    if (!isLinkMode && onTabChange) {
      onTabChange(tab.id);
    }
  };

  return (
    <div className={cn("flex flex-col space-y-0", className)}>
      {/* Mobile: Select dropdown */}
      {mobileSelect && (
        <div className="md:hidden">
          <Select
            value={currentTab?.id}
            onValueChange={(val) => {
              if (!val) return;
              if (isLinkMode) {
                const tab = tabs.find((t) => t.id === val);
                if (tab?.href) {
                  window.location.href = tab.href;
                }
              } else {
                onTabChange?.(val);
              }
            }}
          >
            <SelectTrigger className="w-full h-12 bg-background">
              <SelectValue placeholder="Navegar...">
                {currentTab && (
                  <span className="flex items-center gap-2">
                    {currentTab.icon && <currentTab.icon className="w-4 h-4 text-muted-foreground" />}
                    {currentTab.label}
                    {currentTab.count !== undefined && ` (${currentTab.count})`}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                      {tab.label}
                      {tab.count !== undefined && ` (${tab.count})`}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Desktop: Pills */}
      <div className={cn("hidden md:flex justify-center w-full", !mobileSelect && "flex")}>
        <div className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab);

            const pillClasses = cn(
              "inline-flex items-center gap-2 px-6 py-2 font-semibold rounded-lg text-sm transition-all shrink-0",
              isActive
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
            );

            if (isLinkMode && tab.href) {
              return (
                <Link key={tab.id} href={tab.href} className={pillClasses}>
                  {Icon && <Icon className="w-4 h-4" />}
                  {tab.label}
                  {tab.count !== undefined && ` (${tab.count})`}
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={pillClasses}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {tab.label}
                {tab.count !== undefined && ` (${tab.count})`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
