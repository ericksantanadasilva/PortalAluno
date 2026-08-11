# 📐 Guia de Padronização de Layout & UI — Portal do Aluno

Este documento serve como guia oficial para a criação de novas páginas e componentes no sistema, garantindo consistência visual, estrutural e manutenibilidade em todo o projeto.

---

## 🏗️ 1. Estrutura Padrão de uma Página Privada

Todas as páginas dentro de `app/(private)/` devem seguir obrigatoriamente a estrutura abaixo, utilizando os componentes padronizados de `@/components/layout`.

### Exemplo Base

```tsx
'use client';

import React, { useState } from 'react';
import { PageContainer, PageHeader, ContentCard, SubNav, EmptyState } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';

export default function ExemploPage() {
  return (
    <PageContainer>
      {/* 1. Cabeçalho da Página */}
      <PageHeader
        title="Nome da Página"
        description="Descrição clara do objetivo desta tela."
        icon={<BookOpen />}
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Ação
          </Button>
        }
      />

      {/* 2. Conteúdo Principal em Card */}
      <ContentCard title="Seção Principal" description="Subtítulo descritivo da seção">
        <p>Conteúdo da página aqui...</p>
      </ContentCard>
    </PageContainer>
  );
}
```

---

## 🧩 2. Componentes de Layout Padrão (`@/components/layout`)

### 📦 `PageContainer`
Container-raiz de todas as páginas privadas.

*   **Por que usar:** O `(private)/layout.tsx` já aplica padding global (`p-4 py-6 md:p-8`). O `PageContainer` cuida do `max-w-7xl mx-auto` e do espaçamento vertical (`space-y-8`) sem duplicar paddings.
*   **Props Principais:**
    *   `maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '7xl' | 'full'` (default: `'7xl'`)
    *   `fullBleed?: boolean` — Use `true` para páginas que precisam "sangrar" até as bordas (ex: Frequência). Substitui hacks de margem negativa (`-mx-4`).
    *   `gap?: 'sm' | 'md' | 'lg'` (default: `'lg'`)

```tsx
// Página normal
<PageContainer> ... </PageContainer>

// Página de largura total sem margens internas (ex: Frequência/Dashboard cheio)
<PageContainer fullBleed> ... </PageContainer>
```

---

### 🏷️ `PageHeader`
Cabeçalho padronizado da página.

*   **Regra Importante:** **SEMPRE usa `<h2>` internamente**, pois o layout pai já renderiza o `<h1>Dashboard</h1>` no topo da sidebar.
*   **Props Principais:**
    *   `title: string` (Obrigatório)
    *   `description?: string`
    *   `icon?: React.ReactNode` (Ícone ao lado do título)
    *   `actions?: React.ReactNode` (Botões de ação alinhados à direita)
    *   `variant?: 'default' | 'banner'` (default: `'default'`). A variante `banner` cria um destaque em gradient para páginas especiais.
    *   `badge?: { label: string; icon?: React.ReactNode }` (Utilizado principalmente na variante `banner`)

```tsx
// Variante Padrão
<PageHeader
  title="Disciplinas"
  description="Gerencie as disciplinas e áreas de conhecimento."
  actions={<Button>+ Nova Disciplina</Button>}
/>

// Variante Banner
<PageHeader
  variant="banner"
  title="Gestão de Correções"
  description="Acompanhe o lote de correções discursivas em tempo real."
  badge={{ label: "Simulados", icon: <FileText /> }}
/>
```

---

### 📑 `SubNav`
Navegação secundária por abas (tabs) ou rotas (pills).

*   **Por que usar:** Unifica a navegação interna de uma tela, oferecendo botões em estilo pill no desktop e um `<Select>` responsivo automaticamente no mobile.
*   **Modos de Uso:**
    1.  **Modo Controlado (`useState`):** Altera abas na mesma página sem mudar a URL.
    2.  **Modo Link-based (`href`):** Funciona como navegação por rotas do Next.js.

```tsx
// Modo Controlado (Tabs na mesma página)
<SubNav
  tabs={[
    { id: 'chamada', label: 'Chamada Diária', icon: ClipboardList },
    { id: 'abonos', label: 'Abonos', icon: ShieldAlert, count: 3 },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>

// Modo Link (Navegação entre rotas)
<SubNav
  tabs={[
    { id: 'presential', label: 'Presencial', href: '/corrections/presential' },
    { id: 'submissions', label: 'Entregas', href: '/corrections/submissions' },
  ]}
/>
```

---

### 🪟 `ContentCard`
Wrapper semântico para organizar blocos de conteúdo ou tabelas.

*   **Props Principais:**
    *   `title?: string`
    *   `description?: string`
    *   `headerActions?: React.ReactNode`
    *   `noPadding?: boolean` — Use `true` para tabelas que devem encostar nas bordas do card.

```tsx
<ContentCard
  title="Alunos Matriculados"
  description="Lista completa da turma"
  headerActions={<Button variant="outline" size="sm">Exportar</Button>}
  noPadding
>
  <Table> ... </Table>
</ContentCard>
```

---

### 📭 `EmptyState`
Estado vazio padronizado para listas sem dados.

*   **Props Principais:**
    *   `icon: ComponentType` (Ícone do Lucide)
    *   `title: string`
    *   `description?: string`
    *   `action?: React.ReactNode` (Botão para criar/importar)

```tsx
<EmptyState
  icon={FileText}
  title="Nenhum simulado cadastrado"
  description="Comece criando o primeiro simulado para esta turma."
  action={<Button>+ Criar Simulado</Button>}
/>
```

---

## 🎨 3. Regras de Design System & Design Tokens

1.  **Nunca use cores hexadecimais ou `bg-[#F8FAFC]` hardcoded.**
    *   Use tokens do Tailwind: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`.
2.  **Modo Dark:**
    *   Sempre use os tokens nativos (`text-foreground`, `text-muted-foreground`, `bg-card`) pois eles já se adaptam automaticamente ao tema dark/light ativado pelo `TenantProvider`.
3.  **Tamanhos de Fonte e Cabeçalhos:**
    *   Título de página: `text-3xl font-bold tracking-tight` (gerenciado pelo `PageHeader`).
    *   Subtítulo / Descrição: `text-muted-foreground mt-2`.
    *   Títulos de seções internas: `text-xl font-semibold`.
4.  **Feedback ao Usuário:**
    *   Evite alert native (`window.alert()` / `window.confirm()`).
    *   Utilize Dialogs Shadcn ou badges de estado.

---

## 📋 4. Checklist para Criar uma Nova Tela

- [ ] A página está dentro de `app/(private)/`?
- [ ] O componente raiz da página é um `<PageContainer>`?
- [ ] O topo da página utiliza `<PageHeader>`?
- [ ] O título da página utiliza `<h2>` (prop default do `PageHeader`)?
- [ ] Caso a tela possua sub-seções ou navegação interna, foi utilizado `<SubNav>`?
- [ ] O conteúdo está envelopado em `<ContentCard>`?
- [ ] Tabelas estão usando `noPadding` no `<ContentCard>` para bom alinhamento?
- [ ] Listas ou buscas sem resultados utilizam `<EmptyState>`?
- [ ] Foi verificado se há padding duplicado (`p-4 md:p-8` solto na página)?
