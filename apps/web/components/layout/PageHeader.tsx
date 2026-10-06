import React from "react";
import { cn } from "@/lib/utils";
import { PageTitle } from "../ui/typography";

interface PageHeaderProps {
  /**
   * Ícone do Lucide exibido ao lado do título.
   * @example <Layers className="w-8 h-8 text-primary" />
   */
  icon?: React.ReactNode;
  /** Título principal da página. Renderiza como <h1>. */
  title: string;
  /** Descrição/subtítulo abaixo do título. */
  description?: string;
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
  className?: string;
}

/**
 * Cabeçalho padronizado de página.
 *
 * Sempre renderiza `<h1>`: é o título principal da página. O layout pai
 * `(private)/layout.tsx` usa só um `<span>` no header global.
 *
 * @example
 * <PageHeader
 *   title="Disciplinas"
 *   description="Gerencie as matérias oferecidas na sua unidade."
 *   actions={<Button>+ Nova</Button>}
 * />
 */
export function PageHeader({
  icon,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4",
        className
      )}
    >
      <div>
        <PageTitle className="flex items-center gap-3">
          {icon && <span className="[&>svg]:size-8 [&>svg]:text-primary">{icon}</span>}
          {title}
        </PageTitle>
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