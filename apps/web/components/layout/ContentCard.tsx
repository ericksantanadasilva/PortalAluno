import React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ContentCardProps {
  /** Título do card (opcional). */
  title?: string;
  /** Descrição abaixo do título (opcional). */
  description?: string;
  /** Ações no canto superior direito do header (opcional). */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Remove o padding interno do CardContent.
   * Útil para tabelas que precisam ir borda-a-borda dentro do card.
   * @default false
   */
  noPadding?: boolean;
  className?: string;
}

/**
 * Wrapper semântico para seções de conteúdo com Card.
 * Compõe `CardHeader` e `CardContent` internamente com espaçamentos consistentes.
 *
 * @example
 * // Card com título e tabela sem padding
 * <ContentCard
 *   title="Disciplinas Cadastradas"
 *   description="Lista completa de todas as disciplinas ativas."
 *   noPadding
 * >
 *   <Table>...</Table>
 * </ContentCard>
 *
 * @example
 * // Card simples sem título
 * <ContentCard>
 *   <p>Conteúdo livre...</p>
 * </ContentCard>
 */
export function ContentCard({
  title,
  description,
  headerActions,
  children,
  noPadding = false,
  className,
}: ContentCardProps) {
  const hasHeader = title || description || headerActions;

  return (
    <Card className={cn("border-border shadow-sm", className)}>
      {hasHeader && (
        <CardHeader
          className={cn(
            "flex flex-row items-start justify-between gap-4",
            !title && !description && "pb-0"
          )}
        >
          <div className="space-y-1.5">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding && "p-0")}>{children}</CardContent>
    </Card>
  );
}
