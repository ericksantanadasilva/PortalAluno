'use client';

import React from 'react';
import { PageContainer, PageHeader, SubNav } from '@/components/layout';
import { UploadCloud, FileText, Share2, CheckSquare, BarChart2 } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'presential', href: '/corrections/presential', label: 'Recebimento Presencial', icon: UploadCloud },
  { id: 'submissions', href: '/corrections/submissions', label: 'Entregas & Submissões', icon: FileText },
  { id: 'distribution', href: '/corrections/distribution', label: 'Distribuição de Lotes', icon: Share2 },
  { id: 'corrector', href: '/corrections/corrector', label: 'Minhas Correções', icon: CheckSquare },
  { id: 'results', href: '/corrections/results', label: 'Resultados & Boletim', icon: BarChart2 },
];

export default function CorrectionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <PageHeader
        variant="banner"
        title="Gestão e Correção Discursiva"
        description="Centralize entregas presenciais, controle submissões online, distribua pacotes em lotes e digite notas discursivas com segurança e auditoria."
        badge={{ label: "Simulados Discursivos Presenciais & Online", icon: <CheckSquare /> }}
      />


      {/* Conteúdo da Rota Ativa */}
      <div className="pt-2">
        {children}
      </div>
    </PageContainer>
  );
}
