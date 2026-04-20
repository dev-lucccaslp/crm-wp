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
- [x] 5.1 Entidade `AutomationRule` (trigger JSON + actions JSON) — já no schema; CRUD admin-only
- [x] 5.2 Triggers: `lead.created`, `lead.moved`, `message.received` (via `@nestjs/event-emitter`)
- [x] 5.3 Actions: `send_message`, `move_to_column`, `add_tag`
- [ ] 5.4 Worker BullMQ consumindo eventos e executando regras _(adiado — execução síncrona por EventEmitter2, migra p/ BullMQ junto com 4.5)_
- [x] 5.5 UI de editor de regras (simples, sem DSL) — página `/app/automations`

### Fase 6 — Stripe 💳 ✅
- [x] 6.1 `Subscription` (já no schema) + config `PLANS` (FREE/PRO/ENTERPRISE) com limites e features
- [x] 6.2 `POST /billing/checkout` (Stripe Checkout) + `POST /billing/portal` (customer portal)
- [x] 6.3 `POST /webhooks/stripe` com `rawBody` + `constructEvent` (assinatura HMAC)
- [x] 6.4 `PlanGuard` + `@RequiresPlan` e `ensureWithinLimit` aplicado em create instance / board / automation
- [x] 6.5 Cron diário `@Cron(EVERY_DAY_AT_3AM)` — PAST_DUE > 3d → downgrade p/ FREE
- [x] 6.6 Página `/app/billing` — plano atual, uso vs limites, cards dos planos, portal Stripe

### Fase 7 — Admin 🛠️ ✅
- [x] 7.1 Role super-admin (`User.isSuperAdmin`, `SuperAdminGuard` com check via DB)
- [x] 7.2 Listagem de workspaces + usuários (`GET /admin/workspaces`, `/admin/users`)
- [x] 7.3 Métricas: totais, leads 30/7d, mensagens in/out, tempo médio resposta, conversão (`GET /admin/metrics`)
- [x] 7.4 Viewer de `AuditLog` (`GET /admin/audit-logs`) + página `/app/admin` com abas

### Fase 8 — Hardening 🔐 ✅
- [x] 8.1 Helmet com política de referrer/COEP/CORP tightened + CORS por env (`CORS_ORIGIN`)
- [x] 8.2 `CryptoService` AES-256-GCM (encrypt/decrypt) + hash/HMAC; `webhookSecret` armazenado como SHA-256 (não reversível)
- [x] 8.3 Frontend sem `dangerouslySetInnerHTML` — toda renderização via React escapa por padrão
- [x] 8.4 `AuditLogInterceptor` global — registra mutations (POST/PUT/PATCH/DELETE) com user+workspace+entityId
- [x] 8.5 `CorrelationIdMiddleware` (X-Request-Id) propagado no Pino via `genReqId`/`customProps`
- [x] 8.6 `initTracing()` stub no-op em `shared/otel/tracer.ts` (chamado em `main.ts` antes do Nest)

### Fase 9 — UX polish ✨ ✅
- [x] 9.1 Dark mode (Tailwind `class` strategy + CSS vars já existente; revisão final na Fase 10)
- [x] 9.2 Framer Motion — `PageTransition` (fade+slide) entre rotas do AppShell
- [x] 9.3 `EmptyState` + `ErrorState` (componentes reutilizáveis com ícone, descrição e ação)
- [x] 9.4 `CommandPalette` (⌘K) com navegação, tema e logout via teclado
- [x] 9.5 AppShell responsivo — top bar mobile, drawer com backdrop, fecha ao navegar

### Fase 10 — QA pós-fase 9 (feedback do usuário 2026-04-20) 🐛 ✅
- [x] 10.1 **Dark mode**: `Field`, `SignupPage`, `NewWorkspacePage` e `ChatPage` migrados
      de `neutral-*`/hardcoded (`#111b21`, `#0b141a`, `#202c33`, `#2a3942`, `#005c4b`)
      para tokens (`bg-surface`, `bg-bg`, `text-fg`, `bg-accent`, etc.). Padrão de fundo
      do chat também usa `hsl(var(--fg) / 0.04)` para respeitar o tema.
- [x] 10.2 **Páginas que não carregavam**: rotas `/app/contacts`, `/app/reports` e
      `/app/settings` estavam no NAV mas sem registro — faziam bounce pro Dashboard.
      Criadas as páginas:
  - `ContactsPage`: lista leads consolidada a partir de `/kanban/boards` (com Skeleton,
    EmptyState e ErrorState).
  - `ReportsPage`: placeholder com EmptyState (endpoints de relatório no backlog).
  - `SettingsPage`: hub navegacional com atalhos p/ Billing e Admin (quando super-admin).
- [x] 10.3 Rotas agora registradas em `app/routes.tsx`; typecheck limpo.

#### Backlog derivado (para Fase 12+)
- [ ] Módulo Contatos real (dedup por telefone, histórico unificado, CRUD próprio)
- [ ] Endpoints de Relatórios por workspace (conversão/board, funil, heatmap)
- [ ] Edição de perfil e workspace em `SettingsPage`
- [ ] Auditoria contínua de dark mode conforme novas páginas forem criadas

### Fase 10.1 — Debug round (patches pós-fase 10) 🐛 ✅
- [x] 10.1.1 Auto-seed default board em `signup`, `workspace.create` e lazy-seed em
      `kanban.listBoards` (commit `db55fbc`)
- [x] 10.1.2 KanbanPage com EmptyState + ErrorState, botão "Criar pipeline padrão"
- [x] 10.1.3 QueryClient com `retry: 1` e backoff exponencial (corta skeleton infinito)
- [x] 10.1.4 Sidebar colapsada — ícones unificados 18px/stroke 1.9 (commits `e970e71`,
      `3277d2c`)
- [x] 10.1.5 **Bug crítico**: `TooltipTrigger asChild` serializava `className`-função
      do `NavLink` como texto literal → nav colapsada sem estilo. Refatorado para
      `NavItemLink` com `isActive` calculado via `useLocation` (commit `6fd2614`)
- [x] 10.1.6 SettingsPage: `<Link>` aninhado dentro de `<Link>` — clique não navegava.
      Trocado por chevron afordance (commit `bd43036`)
- [x] 10.1.7 ContactsPage: `listBoards` não inclui `columns.leads` — agora busca cada
      board completo via `getBoard(id)` e achata (commit `217d5a6`)
- [x] 10.1.8 Button `asChild` rejeitava filho único do Slot Radix (spinner + children).
      Quando asChild, renderiza só children (commit `697ebb5`)

---

## Fase 11 — SaaS Commercial (trial, billing, RBAC, painel do dono)

Feedback 2026-04-20: virar o produto em SaaS comercial — trial pago com cartão,
planos com limites, diferenciação OWNER × AGENT, painel gerencial do dono.

### Regras de negócio fechadas
- **SUPER_ADMIN** (dono da plataforma, você): painel gerencial vê todos os clientes
  que compraram, logs individuais, MRR, pode **bloquear cliente inteiro** ou agentes
  específicos, estender trial, dar cortesia.
- **Cliente (= WORKSPACE_OWNER)**: se cadastra, coloca cartão, usa 7d grátis, ao
  fim do trial cobra PRO automático. Gerencia seus próprios workspaces e agentes.
- **Agente**: não vê billing, não deleta direto — abre `DeletionRequest` que o
  owner aprova in-app. Owner controla a quais workspaces o agente tem acesso.
- Role rename: `ADMIN` → `OWNER`, `USER` → `AGENT`.

### Planos
```
TRIAL     — 7 dias grátis · exige cartão no signup · full features
PRO       — R$ 139,00/mês · 3 agentes · 3 workspaces
BUSINESS  — R$ 347,00/mês · 12 agentes · 10 workspaces
EXTRAS (ambos):  +R$ 10,00/agente adicional  |  +R$ 39,90/workspace adicional
```
Diferença PRO × BUSINESS é somente volume — sem feature-flag exclusiva.

### Trial countdown UX
Banner fixo no topo do AppShell (só quando `subscription.status = TRIAL`):
- `> 2 dias` — banner info azul muted ("faltam X dias")
- `≤ 2 dias` — amarelo + ícone relógio
- `≤ 1 dia` — laranja pulsante
- `≤ 12h / 6h / 1h` — vermelho com countdown ao vivo (hh:mm:ss)
- `≤ 30 min` — vermelho cheio + modal bloqueador ("Confirmar cobrança ou cancelar")
- CTA: "Ativar PRO agora" → Stripe checkout/portal
- Toast único por gatilho (2d/1d/12h/6h/1h/30min) via `localStorage` anti-repeat
- **Backend**: cron BullMQ horário dispara e-mail nos mesmos gatilhos (independente do front)

### Commits previstos (ordem)

- [ ] **11.1 — Modelo Plan + Subscription + Trial com cartão**
  - Prisma `Plan` (id, name, priceCents, includedAgents, extraAgentCents,
    includedWorkspaces, extraWorkspaceCents, trialDays)
  - Prisma `Subscription` (ownerId, planId, status:
    `TRIAL|ACTIVE|PAST_DUE|BLOCKED|CANCELED`, trialEndsAt, currentPeriodEnd,
    stripeSubscriptionId, stripeCustomerId, blockedAt, blockReason)
  - `Workspace.blockedAt`, `Membership.blockedAt`
  - Seed dos 2 planos
  - Signup com Stripe SetupIntent obrigatório → cria Subscription TRIAL
  - `<TrialBanner />` no AppShell com escalas de cor/urgência + toast anti-repeat
  - Cron BullMQ horário → e-mail nos gatilhos 2d/1d/12h/6h/1h/30min

- [ ] **11.2 — Guards de limite e suspensão**
  - `PlanLimitGuard`: valida `includedAgents+extras` ao convidar agente e
    `includedWorkspaces+extras` ao criar workspace
  - `SubscriptionActiveGuard`: bloqueia rotas quando `BLOCKED/CANCELED`
  - UI: "Limite do plano atingido — faça upgrade ou compre extra"

- [ ] **11.3 — RBAC OWNER/AGENT + solicitação de exclusão**
  - Migration rename Role (`ADMIN`→`OWNER`, `USER`→`AGENT`)
  - Model `DeletionRequest` (workspaceId, requesterId, targetType, targetId,
    status: `PENDING|APPROVED|REJECTED`, reviewerId, decidedAt, reason)
  - Endpoints: `POST /deletion-requests`, `GET /deletion-requests?status=PENDING`,
    `POST /deletion-requests/:id/approve|reject`
  - Agente: DELETE vira `DeletionRequest` + toast "Solicitação enviada"
  - Owner: bandeja `/app/settings/requests` com aprovar/negar inline
  - UI esconde `/app/billing` e gestão de workspace do AGENT

- [ ] **11.4 — Painel SUPER_ADMIN gerencial**
  - Cards topo: MRR total, clientes ativos, trials em andamento, churn 30d
  - Tabela de clientes: nome, e-mail, plano, status, MRR individual, #agentes,
    último login
  - Detalhe do cliente (`/app/admin/customers/:id`): uso (msgs/sessões/leads),
    pagamentos, audit log dele, logs por workspace
  - Ações: bloquear cliente, bloquear agente, estender trial, cortesia,
    desbloquear, forçar cancelamento

- [ ] **11.5 — Cobrança de extras via Stripe (metered)**
  - Itens "extra-agent" e "extra-workspace" no Stripe
  - Ao ultrapassar incluídos, reporta uso ao Stripe no fim do ciclo
  - Webhook `invoice.payment_failed` → `PAST_DUE`; após N dias → `BLOCKED`
  - UI de billing mostra preview do próximo ciclo (base + extras)
  - Portal Stripe para trocar cartão / plano / cancelar

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
