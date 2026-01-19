# AGENTS — Creative QA & Visual Review Tool

Tento dokument popisuje technická, provozní a vývojová pravidla cílového projektu.
Slouží jako referenční manuál pro vývojáře, AI asistenty i review procesy.

## Tech Stack

### Backend
- Node.js 20 LTS
- NestJS (API-first, modulární architektura)
- BullMQ + Redis (async job orchestration) - *Fallback: Local/Mock for MVP*
- PostgreSQL 15 (Local installation)
- Prisma ORM
- Storage: Local Filesystem (Alternative to MinIO)
- Auth: invite-based JWT

### Frontend
- Next.js 14 (App Router)
- React
- Tailwind CSS
- React Query
- Virtualized tables (batch až 50 kreativ)

### Testing
- Jest (backend)
- Playwright (frontend + E2E)
- Supertest (API)
- k6 (batch/load scénáře)

## Project Architecture

### Runtime Architecture (Local Native)

Local / Dev:
- Frontend (Next.js): http://localhost:3000
- Backend API (NestJS): http://localhost:4010
- Worker: samostatná služba (spouštěná přes npm)
- PostgreSQL: localhost:5432 (Local install)
- Storage: složka `backend/uploads`
- **Povinná dokumentace:** Všechny instalované programy (Node, Postgres, atd.) musí být zapsány v [SETUP.md](file:///C:/Users/ondre/.gemini/antigravity/scratch/visual-analyzer/SETUP.md).

### Port Allocation (Dev Defaults)

| Service | Port | Notes |
|------|------|------|
| Frontend | 3000 | UI |
| Backend API | 4010 | REST API |
| Redis | 6379 | Queue (BullMQ) |
| Worker | – | npm run start:worker:dev |
| PostgreSQL | 5432 | DB (Local) |
| Storage | – | Local folder |

### Communication Flow

- Frontend → Backend: REST (JSON)
- Backend → Worker: Redis queue (BullMQ)
- Worker → DB / Storage: direct access

Prod (Cíl):
- **Dostupnost:** Služba bude nasazena na veřejný server (např. Vercel + Cloud VPS), aby byla přístupná online odkudkoliv přes prohlížeč.
- Frontend: HTTPS (Vercel / Next.js hosting)
- Backend API: Dockerizovaný kontejner nebo Managed Service na Linux serveru
- DB / Redis: Managed cloudové služby (např. Supabase, Upstash) nebo vlastní instance
- Object storage: S3-compatible (např. AWS S3, DigitalOcean Spaces)
Principy:
- Frontend nikdy nevolá workery napřímo
- Backend jest jediný orchestrátor
- Pipeline je fail-soft (jedna kreativa nesmí shodit batch)

## Processing Artifacts

Worker ukládá výstupy analýz jako:
- Strukturovaná data (JSON) do DB:
  - scores
  - issues
  - confidence
  - explanations
- Binární artefakty (TTL) do MinIO:
  - heatmap overlay (PNG)
  - případné další vizualizace

Heatmap artefakt:
- je verzovaný (heatmap_version)
- má metadata (rozměr, timestamp)
- slouží jako explainability pomůcka, ne absolutní pravda

## Project Structure

/frontend  
/backend  
/shared  
/infra/docker-compose.yml  

Principy:
- Striktní oddělení frontend / backend / worker
- Analytická logika mimo API controllery
- Sdílené typy a validační schémata v /shared
- Infra konfigurace pouze v /infra

## Commands

Lokální vývoj (Native):
# Backend
cd backend && npm run start:dev

# Worker
cd backend && npm run start:worker:dev

# Frontend
cd frontend && npm run dev

DB migrace:
npx prisma migrate dev

## Code Conventions

Backend:
- Striktní typování (žádné any)
- Žádná business logika v controllerech
- Každý async job má input schema, output schema a error handling

Frontend:
- Feature-based struktura
- Žádný globální state bez důvodu
- Virtualized tables povinné
- Každý score musí mít explainability tooltip
- Pokud existuje heatmapa, musí být vizuálně propojena se score

## Logging

- Strukturované JSON logy
- Úrovně: info / warn / error
- Logujeme:
  - start / end batchů
  - selhání OCR
  - generování heatmap (success/fail)
- V produkci žádná citlivá data ani raw assety

## Database

Základní entity:
- Workspace
- Batch
- Creative
- AnalysisResult

Pravidla:
- Migrace pouze přes Prisma
- Žádné ruční zásahy v produkci
- Reference na artefakty (např. heatmap) pouze přes metadata

## Testing Strategy

Test pyramid:
- Unit: text QA logika, scoring heuristiky
- Integration: pipeline (OCR → analysis → heatmap → output)
- E2E: batch upload, filtrování, detail kreativy s overlay

Out of scope:
- Benchmarking model accuracy
- Testování reálné kampanové performance

## History Documentation Strategy

Git:
- Feature branches
- Main = vždy releasable
- Squash merge

Tests:
- Každý bug → test
- Regresní testy pro batch UX

Errors & Error Handling:
- Každá chyba má error code a user-safe message
- Interní detaily pouze v logách

Commits:
- Conventional commits
- Smysluplné messages

Backups:
- DB denně
- Object storage TTL-based (není archiv)

## Vibecoding Workflow AI/Human Strategy

AI:
- generuje boilerplate
- navrhuje heuristiky
- píše testy

Člověk:
- schvaluje scoring logiku
- validuje UX a wording
- rozhoduje o produkčních změnách

Každý AI výstup:
- musí projít lidským review
- nesmí se nasazovat bez kontroly
