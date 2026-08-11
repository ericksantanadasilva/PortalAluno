'use client';

import React, { useState } from 'react';
import { PageContainer, PageHeader, SubNav } from '@/components/layout';
import { ExamsManager } from '@/components/simulados/ExamsManager';
import { AnswerKeysManager } from '@/components/simulados/AnswerKeysManager';
import { DiscursiveSubmissionsManager } from '@/components/simulados/DiscursiveSubmissionsManager';
import { FileSignature, LayoutList, FileText } from 'lucide-react';

const TABS = [
  { id: 'exams', label: 'Gestão de Simulados', icon: FileSignature, component: ExamsManager },
  { id: 'answers', label: 'Gabaritos', icon: LayoutList, component: AnswerKeysManager },
  { id: 'discursive', label: 'Simulados Discursivos', icon: FileText, component: DiscursiveSubmissionsManager },
];

export default function SimuladosPage() {
  const [activeTab, setActiveTab] = useState<string>('exams');
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Simulados e Avaliações"
        description="Gerencie os simulados, crie provas e importe os gabaritos dos seus alunos."
      />

      <SubNav
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content Container */}
      <div className="mt-2">
        {TABS.map((tab) => (
          <div key={tab.id} className={activeTab === tab.id ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
            <tab.component onUpdate={handleUpdate} updateTrigger={updateTrigger} />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
