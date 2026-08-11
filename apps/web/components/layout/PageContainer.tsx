import React from "react";
import { cn } from "@/lib/utils";

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
} as const;

interface PageContainerProps {
  children: React.ReactNode;
  /**
   * Remove o padding herdado do layout pai para o conteúdo "sangrar" até as bordas.
   * Substitui o hack de margem negativa usado pela página de Frequência.
   */
  fullBleed?: boolean;
  /**
   * Largura máxima do conteúdo.
   * @default "7xl"
   */
  maxWidth?: keyof typeof MAX_WIDTH_MAP;
  /**
   * Espaçamento vertical entre seções filhas.
   * @default "lg" (space-y-8)
   */
  gap?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

const GAP_MAP = {
  sm: "space-y-4",
  md: "space-y-6",
  lg: "space-y-8",
} as const;

/**
 * Container-raiz padronizado para páginas do dashboard.
 *
 * O layout pai `(private)/layout.tsx` já aplica `p-4 py-6 md:p-8`,
 * então este componente NÃO adiciona padding próprio — apenas centraliza
 * e limita a largura do conteúdo.
 *
 * @example
 * // Página padrão
 * <PageContainer>
 *   <PageHeader title="Disciplinas" />
 *   <ContentCard>...</ContentCard>
 * </PageContainer>
 *
 * @example
 * // Página que precisa sangrar até as bordas (ex: Frequência)
 * <PageContainer fullBleed>
 *   <Tabs>...</Tabs>
 * </PageContainer>
 */
export function PageContainer({
  children,
  fullBleed = false,
  maxWidth = "7xl",
  gap = "lg",
  className,
  style,
}: PageContainerProps) {
  if (fullBleed) {
    return (
      <div
        style={style}
        className={cn(
          "-mx-4 md:-mx-8 -my-6 flex flex-col min-h-full w-[calc(100%+2rem)] md:w-[calc(100%+4rem)]",
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "w-full mx-auto",
        MAX_WIDTH_MAP[maxWidth],
        GAP_MAP[gap],
        className
      )}
    >
      {children}
    </div>
  );
}
