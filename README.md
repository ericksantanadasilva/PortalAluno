<div align="center">

# 🎓 PortalAluno

Plataforma SaaS multi-tenant para gestão acadêmica de cursos pré-vestibulares.

Desenvolvida para substituir processos manuais realizados em planilhas e centralizar a administração da instituição em uma única aplicação.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## 📖 Sobre o projeto

O **PortalAluno** é uma plataforma web desenvolvida para auxiliar instituições de ensino na gestão acadêmica.

O sistema foi pensado para substituir processos realizados manualmente em planilhas e documentos, centralizando em um único ambiente funcionalidades como:

- Gestão de alunos
- Gestão de colaboradores
- Turmas e modalidades
- Chamadas e frequência
- Abonos
- Simulados objetivos e discursivos
- Boletins
- Correção de provas
- Personalização por instituição (multi-tenant)

O projeto está sendo desenvolvido como um **SaaS Multi-Tenant**, permitindo que múltiplas instituições utilizem a mesma aplicação com isolamento completo de dados.

---

# ✨ Funcionalidades

## ✅ Implementadas

- Autenticação JWT
- Arquitetura Multi-Tenant
- Row Level Security (PostgreSQL)
- Cadastro de alunos
- Cadastro de colaboradores
- Gestão de turmas
- Gestão de modalidades
- Gestão de disciplinas
- Sistema de chamadas
- Sistema de abonos
- Simulados ENEM
- Simulados UERJ
- Upload de PDFs
- Integração com Google Drive
- Personalização por tenant
- Dashboard administrativo

---

## 🚧 Em desenvolvimento

- Fluxo completo de simulados discursivos
- Correção online
- Boletim discursivo
- Templates adicionais de relatórios
- Melhorias de UX/UI
- Testes automatizados

---

# 🏗 Arquitetura

```text
apps/
 ├── api/          Express + Node.js
 └── web/          Next.js

packages/
 ├── database/
 ├── database-mocks/
 ├── ui/
 ├── eslint-config/
 └── typescript-config/
```

Projeto organizado em **Monorepo** utilizando **Turborepo**.

---

# 🛠 Tecnologias

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI
- Radix UI

### Backend

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- Supabase
- JWT
- Bcrypt

### Infraestrutura

- Turborepo
- Google Drive API
- Row Level Security (PostgreSQL)

---

# 🔒 Segurança

O sistema possui arquitetura preparada para múltiplas instituições.

Principais mecanismos implementados:

- JWT
- Multi-Tenant
- Row Level Security (RLS)
- Isolamento de dados por `tenant_id`
- Middleware de autorização por perfil
- Controle de permissões administrativas

---

# 📂 Principais módulos

- Gestão Acadêmica
- Gestão de Alunos
- Gestão de Funcionários
- Gestão de Turmas
- Gestão de Modalidades
- Chamadas
- Abonos
- Simulados
- Boletins
- Upload de Arquivos
- Configurações da Instituição

---

# 🚀 Roadmap

- [x] Estrutura Multi-Tenant
- [x] Gestão de alunos
- [x] Gestão de funcionários
- [x] Gestão de turmas
- [x] Sistema de chamadas
- [x] Sistema de abonos
- [x] Simulados ENEM
- [x] Upload de PDFs
- [x] Integração Google Drive
- [ ] Correção completa de discursivos
- [ ] Área do corretor
- [ ] Dashboard analítico
- [ ] Testes automatizados
- [ ] Deploy de produção

---

# 📸 Screenshots

> Em breve

---

# 💡 Objetivo

Este projeto está sendo desenvolvido como meu principal projeto de portfólio, com foco em aplicar conceitos de desenvolvimento Full Stack, arquitetura multi-tenant, organização de código e construção de aplicações voltadas para problemas reais.

---

# 📄 Licença

Este projeto está licenciado sob a licença MIT.