# CRM - WP

SaaS de gestão de atendimento e leads via WhatsApp.

Veja [`ROADMAP.md`](./ROADMAP.md) para o plano completo de construção.

## Requisitos

- Node.js ≥ 20
- npm ≥ 10
- Docker + Docker Compose

## Subindo o ambiente (Fase 0)

```bash
cp .env.example .env           # se ainda não tiver um .env na raiz
docker compose up -d           # Postgres, Redis, MinIO, Evolution API

# backend
cd backend
npm run start:dev              # http://localhost:3333/health

# frontend (outro terminal)
cd frontend
npm run dev                    # http://localhost:5173
```

## Portas

| Serviço         | Porta        |
|-----------------|--------------|
| Backend (Nest)  | 3333         |
| Frontend (Vite) | 5173         |
| Postgres        | 5432         |
| Redis           | 6379         |
| MinIO (API)     | 9000         |
| MinIO (console) | 9001         |
| Evolution API   | 8080         |
