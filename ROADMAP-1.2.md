# Roadmap 1.2 — Design System & Dark Mode Premium

> Motivação: layout original muito genérico (neutral only, flat cards, sem identidade visual).
> Objetivo: SaaS dark-first premium com accent indigo, sidebar lateral, toggle persistente.

---

## Status das implementações

| Item                                         | Arquivo(s)                 | Status       |
| -------------------------------------------- | -------------------------- | ------------ |
| Sidebar lateral (AppShell redesign)          | `pages/AppShell.tsx`       | ✅ concluído |
| Hook `useTheme` + persist `localStorage`     | `hooks/useTheme.ts`        | ✅ concluído |
| Anti-flash script (sem piscar ao recarregar) | `index.html`               | ✅ concluído |
| Accent color indigo no tailwind              | `tailwind.config.js`       | ✅ concluído |
| color-scheme + base styles                   | `index.css`                | ✅ concluído |
| Button primary → indigo                      | `components/ui/Button.tsx` | ✅ concluído |
| Input focus → accent indigo                  | `components/ui/Input.tsx`  | ✅ concluído |
| LoginPage redesenhada                        | `pages/LoginPage.tsx`      | ✅ concluído |

---

## Decisões de design

| Decisão                              | Motivo                                                            |
| ------------------------------------ | ----------------------------------------------------------------- |
| Sidebar lateral em vez de top nav    | Padrão SaaS moderno (Linear, Notion, Vercel) — menos "site comum" |
| Accent `#6366f1` (indigo-500)        | Personalidade sem exagero — funciona bem em dark e light          |
| `darkMode: 'class'` + `localStorage` | Usuário controla; sem flash ao recarregar                         |
| Default: `dark`                      | CRM voltado a operadores — dark reduz fadiga visual               |
| Sem CSS vars por enquanto            | Tailwind `accent.*` resolve sem refatorar todos os componentes    |

---

## Backlog visual (próximas iterações)

- [ ] **SignupPage** e **NewWorkspacePage** — mesma linguagem do LoginPage
- [ ] **DashboardPage** — cards com ícones lucide, métricas reais (Fase 7)
- [ ] **ChatPage** — balões estilo WhatsApp Web, avatar de contato, timestamps
- [ ] **KanbanPage** — header de coluna mais rico, chips de prioridade com cores
- [ ] **LeadCard** — avatar do assignee, progress bar de valor, badge de prioridade
- [ ] **LeadDrawer** — timeline com ícones, status rich
- [ ] **WhatsAppPage** — QR code panel polished, status chip animado
- [ ] **Framer Motion** — transições: sidebar hover, card drag, drawer slide-in
- [ ] **Skeletons** — loading pulse nos cards e lista de conversas
- [ ] **Toasts** — feedback de ações (lead movido, mensagem enviada)
- [ ] **Command palette** `Cmd+K` — Fase 9.4 do ROADMAP principal
- [ ] **Responsivo mobile** — Fase 9.5 do ROADMAP principal
- [ ] **CSS vars completo** — quando shadcn/ui entrar, migrar para tokens semânticos

---

## Como usar este documento

- Abrir este arquivo antes de qualquer sessão de design.
- Marcar `[x]` nos itens do backlog ao concluir.
- Apontar aqui qualquer decisão visual que mudar de ideia (registrar o porquê).
