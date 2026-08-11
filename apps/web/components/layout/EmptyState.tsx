import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Ícone do Lucide (componente, não instância). */
  icon: React.ComponentType<{ className?: string }>;
  /** Título principal do estado vazio. */
  title: string;
  /** Descrição adicional. */
  description?: string;
  /** Botão de ação (opcional). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vazio padronizado para listas, tabelas e seções sem dados.
 *
 * @example
 * <EmptyState
 *   icon={FileText}
 *   title="Nenhum simulado discursivo pendente"
 *   description="Os simulados discursivos para envio de PDF aparecerão aqui."
 * />
 *
 * @example
 * // Com ação
 * <EmptyState
 *   icon={BookOpen}
 *   title="Nenhum tema encontrado"
 *   description="Importe sua planilha ou crie os temas manualmente."
 *   action={<Button>Importar Planilha</Button>}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center p-12 bg-card border border-dashed border-border rounded-xl shadow-sm mx-auto max-w-2xl",
        className
      )}
    >
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
