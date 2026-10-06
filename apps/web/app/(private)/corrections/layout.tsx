'use client';

import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';

export default function CorrectionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <PageHeader
        title="Gestão e Correção Discursiva"
        description="Centralize entregas presenciais, controle submissões online, distribua pacotes em lotes e digite notas discursivas com segurança e auditoria."
      />


      {/* Conteúdo da Rota Ativa */}
      <div className="pt-2">
        {children}
      </div>
    </PageContainer>
  );
}
