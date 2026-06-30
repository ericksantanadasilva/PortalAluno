'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExamsManager } from '@/components/simulados/ExamsManager';
import { AnswerKeysManager } from '@/components/simulados/AnswerKeysManager';
import { FileSignature, LayoutList } from 'lucide-react';

const TABS = [
  { id: 'exams', label: 'Gestão de Simulados', icon: FileSignature, component: ExamsManager },
  { id: 'answers', label: 'Gabaritos', icon: LayoutList, component: AnswerKeysManager },
];

export default function SimuladosPage() {
  const [activeTab, setActiveTab] = useState<string>('exams');
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulados e Avaliações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os simulados, crie provas e importe os gabaritos dos seus alunos.
        </p>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Mobile Navigation (Select) */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={(val) => { if (val) setActiveTab(val); }}>
            <SelectTrigger className="w-full h-12 bg-background">
              <SelectValue placeholder="Navegar...">
                {TABS.find(t => t.id === activeTab)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TABS.map((tab) => {
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
            {TABS.map((tab) => {
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
          {TABS.map((tab) => (
            <div key={tab.id} className={activeTab === tab.id ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
              <tab.component onUpdate={handleUpdate} updateTrigger={updateTrigger} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
