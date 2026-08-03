'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UploadCloud, FileText, Share2, CheckSquare, BarChart2 } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/corrections/presential', label: 'Recebimento Presencial', icon: UploadCloud },
  { href: '/corrections/submissions', label: 'Entregas & Submissões', icon: FileText },
  { href: '/corrections/distribution', label: 'Distribuição de Lotes', icon: Share2 },
  { href: '/corrections/corrector', label: 'Minhas Correções', icon: CheckSquare },
  { href: '/corrections/results', label: 'Resultados & Boletim', icon: BarChart2 },
];

export default function CorrectionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      {/* Cabeçalho Premium com Efeito Moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/20 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary mb-2">
              <CheckSquare className="size-3.5" />
              <span>Simulados Discursivos Presenciais & Online</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Gestão e Correção Discursiva
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm md:text-base">
              Centralize entregas presenciais, controle submissões online, distribua pacotes em lotes e digite notas discursivas com segurança e auditoria.
            </p>
          </div>
        </div>
      </div>

      {/* Navegação Superior Em Abas/Pills */}
      {/* <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div> */}

      {/* Conteúdo da Rota Ativa */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
