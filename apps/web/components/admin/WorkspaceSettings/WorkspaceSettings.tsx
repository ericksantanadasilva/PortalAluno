'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WhiteLabelTab } from './WhiteLabelTab';
import { StudentsTab } from './StudentsTab';
import { EmployeesTab } from './EmployeesTab';
import { Palette, Users, Briefcase } from 'lucide-react';

const TABS = [
  { id: 'whitelabel', label: 'Personalização', icon: Palette, component: WhiteLabelTab },
  { id: 'students', label: 'Alunos e Matrículas', icon: Users, component: StudentsTab },
  { id: 'employees', label: 'Equipe e Funcionários', icon: Briefcase, component: EmployeesTab },
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
    if (!searchParams.has('tab') && role === 'admin') {
      setActiveTab('whitelabel');
    } else if (searchParams.has('tab')) {
      setActiveTab(searchParams.get('tab') as string);
    }
  }, [searchParams]);

  const activeTabConfig = TABS.find(t => t.id === activeTab) || TABS[1];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <activeTabConfig.icon className="w-8 h-8 text-primary" />
          {activeTabConfig.label}
        </h1>
      </div>

      <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <activeTabConfig.component />
      </div>
    </div>
  );
}
