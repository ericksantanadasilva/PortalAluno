'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WhiteLabelTab } from './WhiteLabelTab';
import { StudentsTab } from './StudentsTab';
import { ExamsTab } from './ExamsTab';
import { AnswerKeysTab } from './AnswerKeysTab';
import { EmployeesTab } from './EmployeesTab';
import { Palette, Users, FileSignature, LayoutList, Briefcase } from 'lucide-react';

const TABS = [
  { id: 'whitelabel', label: 'Personalização', icon: Palette, component: WhiteLabelTab },
  { id: 'students', label: 'Alunos e Matrículas', icon: Users, component: StudentsTab },
  { id: 'employees', label: 'Equipe e Funcionários', icon: Briefcase, component: EmployeesTab },
  { id: 'exams', label: 'Simulados', icon: FileSignature, component: ExamsTab },
  { id: 'answers', label: 'Gabaritos', icon: LayoutList, component: AnswerKeysTab },
];

export function WorkspaceSettings() {
  const [activeTab, setActiveTab] = useState<string>('students'); // Alterar padrão inicial
  const [userRole, setUserRole] = useState<string | null>(null);

  React.useEffect(() => {
    const role = localStorage.getItem('user_role');
    setUserRole(role);
    if (role === 'admin') {
      setActiveTab('whitelabel');
    }
  }, []);

  const filteredTabs = React.useMemo(() => {
    if (userRole === 'admin') return TABS;
    return TABS.filter(t => t.id !== 'whitelabel');
  }, [userRole]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Unidade</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie a identidade visual, alunos matriculados, simulados e gabaritos da sua instituição.
        </p>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Mobile Navigation (Select) */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-12 bg-background">
              <SelectValue placeholder="Navegar pelas configurações...">
                {filteredTabs.find(t => t.id === activeTab)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {tab.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Navigation (Tabs) */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="hidden md:block w-full"
        >
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex-1 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Tab Content Container */}
        <div className="mt-6">
          {filteredTabs.map((tab) => (
            <div key={tab.id} className={activeTab === tab.id ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
              <tab.component />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
