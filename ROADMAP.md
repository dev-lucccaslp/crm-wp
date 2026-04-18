# CRM - WP — Roadmap de Construção

> SaaS de gestão de atendimento e leads via WhatsApp.
> Documento vivo — marcamos `[x]` à medida que cada item é concluído e validado.

---

## 📌 Decisões já tomadas

| Tópico | Decisão |
|---|---|
| Localização | `/Users/lucaslessa/Desktop/CRM - WP` |
| Package manager | `npm` |
| Frontend | **React + Vite + TypeScript** (SPA, sem Next.js) |
| Backend | **NestJS + TypeScript** (DDD + Clean Architecture) |
| Banco | PostgreSQL + Prisma |
| Filas | Redis + BullMQ |
| Tempo real | Socket.io |
| WhatsApp | **Evolution API** (self-hosted, grátis, wrapper estável sobre Baileys com REST + webhooks) |
| Storage | MinIO local (S3-compatible) — trocável por S3 em prod |
| Billing | Stripe (planos Free / Pro / Enterprise) |
| Deploy | **Somente local** nesta fase — Docker Compose |
| Auth | JWT + Refresh Token + RBAC (admin / user / agent) |

### Por que Evolution API (e não Baileys direto ou Cloud API)?
- **Cloud API oficial (Meta)**: ~US$ 0,005–0,08 por conversa + aprovação de número → caro e burocrático para MVP.
- **Baileys cru**: você implementa tudo (sessão, reconnect, QR, mídia) — alto custo de manutenção.
- **Evolution API**: container Docker pronto, REST + webhooks, suporta múltiplas instâncias (multi-número), QR Code, mídia. **Grátis, self-hosted, escala por container.** Risco de ban existe (é não-oficial) mas é o padrão do mercado BR para CRMs WhatsApp.

---

## 🏛️ Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  React+Vite │ WS  │   NestJS     │     └──────────────┘
│             │◀───▶│              │     ┌──────────────┐
└─────────────┘     │              │────▶│    Redis     │
                    │              │     │   (BullMQ)   │
                    └──────┬───────┘     └──────────────┘
                           │ webhook
                    ┌──────▼───────┐     ┌──────────────┐
                    │ Evolution API│     │    MinIO     │
                    │  (WhatsApp)  │     │   (mídia)    │
                    └──────────────┘     └──────────────┘
```

### Princípios
- **Multi-tenant por `workspace_id`** em toda tabela (row-level isolation via middleware Prisma).
- **Clean Architecture**: `domain` (entidades + regras puras) ← `application` (use cases) ← `infra` (Prisma, HTTP, filas) ← `modules` (composição Nest).
- **Eventos internos** via `EventEmitter` do Nest → desacoplar automações.
- **Webhooks externos assinados** (Stripe + Evolution API).

---

## 📁 Estrutura de pastas (alvo)

```
/CRM - WP
├── docker-compose.yml
├── ROADMAP.md                    ← este arquivo
├── .env.example
├── backend/
│   ├── src/
│   │   ├── modules/              ← composição Nest (controllers, providers)
│   │   │   ├── auth/
│   │   │   ├── workspace/
│   │   │   ├── kanban/
│   │   │   ├── whatsapp/
│   │   │   ├── chat/
│   │   │   ├── automation/
│   │   │   ├── billing/
│   │   │   └── admin/
│   │   ├── domain/               ← entidades + value objects puros
│   │   ├── application/          ← use cases + DTOs
│   │   ├── infra/
│   │   │   ├── prisma/
│   │   │   ├── queue/            ← BullMQ
│   │   │   ├── storage/          ← MinIO
│   │   │   ├── websocket/        ← Socket.io gateway
│   │   │   └── http/             ← guards, interceptors, filters
│   │   └── shared/               ← logger, errors, utils
│   ├── prisma/schema.prisma
│   └── test/
└── frontend/
    ├── src/
    │   ├── app/                  ← routing (React Router)
    │   ├── pages/
    │   ├── components/
    │   │   └── ui/               ← shadcn
    │   ├── features/             ← kanban, chat, auth, etc.
    │   ├── hooks/
    │   ├── services/             ← axios + socket
    │   ├── store/                ← Zustand
    │   └── lib/
    └── index.html
```

---

## 🗄️ Modelagem do banco (Prisma — alvo)

Entidades principais:
- `User` — conta global (pode pertencer a múltiplos workspaces)
- `Workspace` — tenant (empresa)
- `Membership` — `User ↔ Workspace` com `role`
- `Subscription` — plano Stripe do workspace
- `WhatsappInstance` — conexão Evolution API (1 por número)
- `Contact` — lead/cliente dentro do workspace
- `KanbanBoard` / `KanbanColumn` / `Lead` — pipeline
- `LeadMovement` — histórico de arrasto
- `Conversation` — thread com um contato
- `Message` — mensagem (com `mediaUrl`, `status`, `direction`)
- `AutomationRule` — gatilho → ação
- `AuditLog` — ações de usuário

Schema completo será escrito na **Fase 2**.

---

## 🚦 Plano de execução (fases)

### Fase 0 — Fundação ✅
- [x] 0.1 Criar `docker-compose.yml` (Postgres, Redis, MinIO, Evolution API)
- [x] 0.2 Criar `.env.example` do monorepo
- [x] 0.3 Inicializar `backend/` (NestJS + Prisma 6 + config Zod + logger Pino + helmet + throttler)
- [x] 0.4 Inicializar `frontend/` (Vite + React + TS + Tailwind v3 + libs base)
- [x] 0.5 tsconfig strict nos dois lados (vindos dos scaffolders)
- [x] 0.6 Backend sobe e responde `/health` 200 ✅ / frontend buildado ✅
- [ ] 0.7 ⚠️ **Usuário precisa instalar Docker Desktop** (comando `docker` ausente na máquina) antes da Fase 1, que exige Postgres/Redis

**Observações da Fase 0:**
- Prisma 7 quebra compatibilidade (url sai do schema, entra em `prisma.config.ts`) — usamos **Prisma 6** por estabilidade.
- Tailwind **v3** (v4 mudou a config para CSS-first e o ecossistema shadcn ainda aponta para v3).
- shadcn/ui **ainda não** instalado — faremos sob demanda por componente na Fase 1, para não inflar o bundle.
- ESLint/Prettier usam defaults dos scaffolders; ajustes finos ficam para quando incomodarem.

### Fase 1 — Auth + Multi-tenant 🔒 ✅
- [x] 1.1 Schema Prisma: `User`, `Workspace`, `Membership`, `RefreshToken` + enum `Role`
- [x] 1.2 Módulo `auth`: signup, login, refresh (rotativo), logout, me
- [x] 1.3 Hash de senha argon2
- [x] 1.4 Guard `JwtAuthGuard` + decorator `@CurrentUser()` + `@Public()`
- [x] 1.5 Guard `WorkspaceGuard` + decorator `@CurrentWorkspace()` (header `x-workspace-id`)
- [x] 1.6 RBAC: decorator `@Roles('ADMIN')` + `RolesGuard`
- [x] 1.7 Módulo `workspace`: criar, listar meus, listar membros, convidar, update role, remover
- [ ] 1.8 Middleware Prisma multi-tenant — **adiado para Fase 3** (quando surgirem entidades com `workspaceId`); até lá o `WorkspaceGuard` resolve
- [x] 1.9 `ValidationPipe` global + class-validator
- [x] 1.10 Rate limit global 120/min + `auth/signup` 10/min + `auth/login` 20/min
- [x] 1.11 Frontend: `/login`, `/signup`, `/workspaces/new`, `/app` (shell com seletor + logout)
- [x] 1.12 Frontend: axios interceptor — injeta `Authorization` + `x-workspace-id` + refresh automático em 401
- [x] 1.13 Frontend: Zustand store persistente (`crmwp-auth` em localStorage)
- [x] 1.14 Teste e2e via curl: signup → me → workspaces → login → 409 duplicado → 401 senha errada ✅

**Checkpoint Fase 1** — pronto para validação do usuário antes de seguir para Fase 2.

### Fase 2 — Schema Prisma completo 🗄️ ✅
- [x] 2.1 `schema.prisma` completo: User, Workspace, Membership, RefreshToken, Subscription, WhatsappInstance, Contact, KanbanBoard, KanbanColumn, Lead, LeadMovement, Conversation, Message, AutomationRule, AuditLog + 7 enums
- [x] 2.2 `@@index([workspaceId])` em todas as tabelas multi-tenant
- [x] 2.3 Migration `full_schema` aplicada
- [x] 2.4 Seed: admin@crmwp.local + agent@crmwp.local (senha `12345678`), workspace "Workspace Dev" (plano PRO), board default com 5 colunas, 3 contatos, 3 leads — rodar com `npm run db:seed`

### Fase 3 — Kanban de Leads 🎯 ✅
- [x] 3.1 CRUD de `KanbanBoard` + `KanbanColumn` (+ reorder)
- [x] 3.2 CRUD de `Lead` (contato, valor, tags, assignee, notes)
- [x] 3.3 `POST /kanban/leads/:id/move` transacional — renumera coluna destino e compacta origem
- [x] 3.4 `LeadMovement` criado automaticamente em cada move
- [x] 3.5 Socket.io gateway com auth por JWT + `workspaceId`; eventos `lead.moved`, `lead.created`, `lead.updated`, `lead.deleted`, `column.changed`
- [x] 3.6 Página `/app/kanban` com `dnd-kit` (colunas + cards sortable + overlay)
- [x] 3.7 `LeadDrawer` com histórico de movimentos
- [x] 3.8 Optimistic update via React Query (`onMutate` → `setQueryData`, rollback em `onError`)
- [x] 3.9 **Checkpoint pronto para validação do usuário**

### Fase 4 — WhatsApp + Chat tempo real 💬
- [x] 4.1 Serviço `EvolutionApiClient` (REST) + DTOs
- [x] 4.2 Módulo `whatsapp`: criar instância, obter QR Code, status da sessão
- [x] 4.3 Endpoint webhook `/webhooks/evolution` (valida origem por token)
- [x] 4.4 Processar eventos: mensagem recebida, status atualizado, conexão
- [ ] 4.5 Fila `messages.ingest` (BullMQ) para processar mensagens de entrada _(adiado — processamento síncrono por enquanto)_
- [ ] 4.6 Fila `messages.send` (BullMQ) com retry/backoff _(adiado)_
- [x] 4.7 Persistência: `Conversation` + `Message` (suporta mídia — metadados)
- [ ] 4.8 Upload de mídia → MinIO → URL assinada _(adiado)_
- [x] 4.9 Gateway Socket.io: `conversation.upsert`, `message.new`, `message.status`, `whatsapp.status`, `whatsapp.qr`
- [x] 4.10 Namespaces/rooms por `workspaceId`
- [x] 4.11 Frontend: página `/chat` estilo WhatsApp Web (lista + thread)
- [x] 4.12 Frontend: React Query para histórico + socket para live
- [ ] 4.13 Frontend: anexar áudio/imagem/vídeo, preview, indicadores de status _(parcial — status sim, anexos adiados com 4.8)_
- [x] 4.14 Auto-criação de `Contact` + `Lead` ao chegar nova mensagem de número novo

### Fase 5 — Automação ⚡
- [ ] 5.1 Entidade `AutomationRule` (trigger JSON + actions JSON)
- [ ] 5.2 Triggers: `lead.created`, `lead.moved`, `message.received`
- [ ] 5.3 Actions: `send_message`, `move_to_column`, `add_tag`
- [ ] 5.4 Worker BullMQ consumindo eventos e executando regras
- [ ] 5.5 UI de editor de regras (simples, sem DSL)

### Fase 6 — Stripe 💳
- [ ] 6.1 Modelo `Subscription` + planos em código (`PlanId` enum)
- [ ] 6.2 Checkout session + customer portal
- [ ] 6.3 Webhook Stripe (assinatura validada)
- [ ] 6.4 Guard `PlanGuard` — bloqueia features acima do plano
- [ ] 6.5 Bloqueio automático por inadimplência (cron diário)
- [ ] 6.6 UI de planos + billing

### Fase 7 — Admin 🛠️
- [ ] 7.1 Role super-admin (fora do `Membership`)
- [ ] 7.2 Listagem de workspaces + usuários
- [ ] 7.3 Métricas: leads criados, conversões, tempo médio de resposta
- [ ] 7.4 Viewer de `AuditLog`

### Fase 8 — Hardening 🔐
- [ ] 8.1 Helmet + CORS restrito
- [ ] 8.2 Criptografia AES-GCM para campos sensíveis (tokens Evolution)
- [ ] 8.3 Sanitização XSS no frontend (rich text se houver)
- [ ] 8.4 `AuditLog` interceptor automático em mutations
- [ ] 8.5 Logs estruturados Pino + correlation id
- [ ] 8.6 OpenTelemetry-ready (tracer no-op instalado)

### Fase 9 — UX polish ✨
- [ ] 9.1 Dark mode (Tailwind `class` strategy)
- [ ] 9.2 Framer Motion nas transições-chave
- [ ] 9.3 Skeletons + estados de erro consistentes
- [ ] 9.4 Atalhos de teclado (Cmd+K command palette)
- [ ] 9.5 Responsivo mobile

---

## 🧭 Como usamos este documento

1. Trabalhamos **uma fase por vez**, em ordem.
2. Ao concluir um item, marco `[x]` e reporto o que foi feito.
3. **Checkpoint obrigatório** ao fim das Fases 1, 3, 4, 6 — você valida antes de seguir.
4. Mudanças de escopo → editamos este arquivo antes de codificar.

---

## ▶️ Próximo passo

**Fase 1 — Auth + Multi-tenant.**

Bloqueio atual: instalar **Docker Desktop** para rodar Postgres/Redis localmente (`docker` não encontrado no PATH). Assim que Docker estiver disponível, rodamos `docker compose up -d` e começamos pelo schema Prisma de `User / Workspace / Membership`.
