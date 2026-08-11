'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageContainer, PageHeader, SubNav } from '@/components/layout';
import { WhiteLabelTab } from './WhiteLabelTab';
import { StudentsTab } from './StudentsTab';
import { EmployeesTab } from './EmployeesTab';
import { OmrImportTab } from './OmrImportTab';
import { Palette, Users, Briefcase, FileSignature } from 'lucide-react';

const TABS = [
  { id: 'whitelabel', label: 'Personalização', icon: Palette, component: WhiteLabelTab },
  { id: 'students', label: 'Alunos e Matrículas', icon: Users, component: StudentsTab },
  { id: 'employees', label: 'Equipe e Funcionários', icon: Briefcase, component: EmployeesTab },
  { id: 'omr', label: 'Importação OMR', icon: FileSignature, component: OmrImportTab },
];

export function WorkspaceSettings() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams.get('tab') || 'students';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [userRole, setUserRole] = useState<string | null>(null);

  React.useEffect(() => {
    const role = localStorage.getItem('user_role');
    setUserRole(role);
    if (!searchParams.has('tab') && ['admin', 'super_admin'].includes(role || '')) {
      setActiveTab('whitelabel');
    } else if (searchParams.has('tab')) {
      setActiveTab(searchParams.get('tab') as string);
    }
  }, [searchParams]);

  const activeTabConfig = TABS.find(t => t.id === activeTab) || TABS[0]!;
  const Icon = activeTabConfig.icon;

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    router.push(`/admin/settings?tab=${id}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Configurações da Escola"
        icon={<Briefcase className="w-8 h-8 text-primary" />}
        description="Gerencie as configurações gerais da sua escola, membros, alunos e importações OMR."
      />


      <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <activeTabConfig.component />
      </div>
    </PageContainer>
  );
}
