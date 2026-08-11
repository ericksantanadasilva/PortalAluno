# Regras de Desenvolvimento e Layout — Portal do Aluno

Ao criar ou refatorar páginas e componentes neste projeto, siga estritamente as regras abaixo:

## 1. Regras Globais de Idioma e Comunicação
- Toda a comunicação, planos de implementação, resumos e mensagens no chat devem ser em Português do Brasil (pt-BR).
- O código em si (nomes de variáveis, funções, componentes e arquivos) deve continuar em Inglês.

## 2. Padrões de Layout e Componentes
- **NÃO crie layouts avulsos ou containers manuais** (`max-w-7xl mx-auto p-4 md:p-8 space-y-8`) diretamente nas páginas.
- **SEMPRE utilize os componentes de layout centralizados em `@/components/layout`**:
  - `<PageContainer>` — Container raiz de todas as telas privadas.
  - `<PageHeader>` — Cabeçalhos de página (sempre renderiza `<h2>`, suporta ícones e ações).
  - `<SubNav>` — Abas e navegação secundária (desktop pills + mobile select).
  - `<ContentCard>` — Wrapper para seções e tabelas.
  - `<EmptyState>` — Exibição de estados vazios sem dados.

## 3. Preservação de Lógica e Contratos
- Ao refatorar o layout de uma tela existente, **NUNCA altere a lógica de estado (`useState`, `useEffect`), chamadas de API (`fetch`), nem regras de negócio**.
- Apenas altere o JSX / estrutura visual para envelopar o conteúdo existente nos novos componentes de layout.

## 4. Cores e Design Tokens
- Nunca use cores arbitrárias em hexadecimal ou classes hardcoded como `bg-[#F8FAFC]` ou `text-slate-800`.
- Use sempre tokens Tailwind (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`).

## 5. Referência
- Para detalhes completos de sintaxe e exemplos de uso de cada componente de layout, consulte `apps/web/INSTRUCTIONS.md`.
