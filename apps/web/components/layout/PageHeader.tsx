import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /**
   * Ícone do Lucide exibido ao lado do título.
   * @example <Layers className="w-8 h-8 text-primary" />
   */
  icon?: React.ReactNode;
  /** Título principal da página. Renderiza como <h2>. */
  title: string;
  /** Descrição/subtítulo abaixo do título. */
  description?: string;
  /**
   * Badge decorativo acima do título (usado na variante "banner").
   * @example { label: "Simulados Discursivos", icon: <CheckSquare /> }
   */
  badge?: { label: string; icon?: React.ReactNode };
  /**
   * Botões de ação posicionados à direita do título.
   * @example
   * <PageHeader
   *   title="Disciplinas"
   *   actions={
   *     <>
   *       <Button variant="outline">Importar</Button>
   *       <Button>Nova Disciplina</Button>
   *     </>
   *   }
   * />
   */
  actions?: React.ReactNode;
  /**
   * Estilo do cabeçalho.
   * - `default`: título + descrição simples
   * - `banner`: card com gradient decorativo (como na página de Correções)
   * @default "default"
   */
  variant?: "default" | "banner";
  className?: string;
}

/**
 * Cabeçalho padronizado de página.
 *
 * Sempre renderiza `<h2>` porque o layout pai `(private)/layout.tsx`
 * já renderiza `<h1>Dashboard</h1>` no header global.
 *
 * @example
 * // Padrão simples
 * <PageHeader
 *   title="Disciplinas"
 *   description="Gerencie as matérias oferecidas na sua unidade."
 *   actions={<Button>+ Nova</Button>}
 * />
 *
 * @example
 * // Banner decorativo
 * <PageHeader
 *   variant="banner"
 *   title="Gestão e Correção Discursiva"
 *   description="Centralize entregas, distribua lotes e digite notas."
 *   badge={{ label: "Simulados Discursivos", icon: <CheckSquare /> }}
 * />
 */
export function PageHeader({
  icon,
  title,
  description,
  badge,
  actions,
  variant = "default",
  className,
}: PageHeaderProps) {
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/20 shadow-sm",
          className
        )}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary mb-2">
                {badge.icon && (
                  <span className="[&>svg]:size-3.5">{badge.icon}</span>
                )}
                <span>{badge.label}</span>
              </div>
            )}
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {icon && (
                <span className="inline-flex items-center gap-3 [&>svg]:size-8">
                  {icon}
                </span>
              )}
              {title}
            </h2>
            {description && (
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm md:text-base">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Variante default
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4",
        className
      )}
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          {icon && <span className="[&>svg]:size-8 [&>svg]:text-primary">{icon}</span>}
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
