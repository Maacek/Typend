# Project Setup Guide (No-Docker Environment)

Tento dokument slouží jako seznam všech nezbytných programů a konfigurací pro spuštění projektu na novém počítači. Protože nepoužíváme Docker, je nutné tyto služby nainstalovat přímo do operačního systému.

## 1. Základní software
Tyto programy jsou nezbytné pro vývoj a běh aplikace:

| Program | Účel | Odkaz ke stažení |
|---------|------|-----------------|
| **Node.js (v20 LTS)** | Runtime pro JavaScript (Backend & Frontend) | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL (v15+)** | Hlavní databáze pro ukládání dat | [postgresql.org](https://www.postgresql.org/download/windows/) |
| **Memurai (Redis)** | Queue pro zpracování úkolů na pozadí | [memurai.com](https://www.memurai.com/get-memurai) |
| **Visual Studio Code** | Doporučený editor kódu | [code.visualstudio.com](https://code.visualstudio.com/) |

## 2. Doporučené nástroje (UI pro databáze)
Pro snadnější správu dat doporučuji:

- **pgAdmin 4:** Grafické rozhraní pro PostgreSQL (instaluje se většinou přímo s Postgres).
- **Insonmia / Postman:** Pro testování API endpointů.

## 3. Prvotní nastavení po instalaci
Jakmile máte software nainstalovaný, postupujte takto:

1. **Vytvoření databáze:** 
   Otevřete `pgAdmin 4` a vytvořte novou databázi s názvem `visual_analyzer`.
2. **Konfigurace `.env`:**
   V kořenu projektu upravte soubor `.env` a zkontrolujte `DATABASE_URL` (uživatelské jméno a heslo k Postgres).
3. **Instalace závislostí:**
   V terminálu spusťte:
   ```powershell
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
4. **Migrace databáze:**
   V adresáři `backend` spusťte:
   ```powershell
   npx prisma migrate dev
   ```

## 4. Běh aplikace (Lokálně)
Pro spuštění celého stacku musíte mít otevřená dvě okna terminálu:

- **Backend:** `cd backend && npm run start:dev`
- **Frontend:** `cd frontend && npm run dev`

---

### Poznámka k přenosu na jiný počítač
Změna počítače **bude mít vliv**. Na novém počítači budete muset znovu nainstalovat Node.js a PostgreSQL (kroky v sekci 1 a 2). Samotný kód aplikace si pak stačí jen zkopírovat nebo stáhnout z repozitáře a následovat kroky v sekci 3.

---

## 5. Produkční Deployment (Railway + Vercel)

### URLs
| Služba | URL | Stav |
|--------|-----|------|
| **Frontend** | https://typend.vercel.app | ✅ Funguje |
| **Backend API** | https://typend-production.up.railway.app/api/v1 | ⚠️ Debugging (viz níže) |
| **GitHub repo** | https://github.com/Maacek/Typend | ✅ Aktivní |

### Přihlašovací údaje (produkce)
- **Email:** admin@agentura.cz
- **Heslo:** admin123

### Infrastruktura
| Komponenta | Poskytovatel | Detail |
|------------|-------------|--------|
| Database | Neon (PostgreSQL 16) | `ep-spring-sun-agj4xvbn-pooler.c-2.eu-central-1.aws.neon.tech` |
| Backend | Railway (Hobby $5/mo) | Port 4010, us-west2 |
| Redis | Railway (addon) | `redis.railway.internal:6379` |
| Frontend | Vercel (Free) | Auto-deploy z GitHub `main` |

### Deployment stav (aktualizováno 2026-02-24)
Backend ✅ **FUNGUJE** – login ověřen, dashboard dostupný.

**Co způsobovalo 502 a jak bylo opraveno:**
- `tsconfig.json` měl `module: nodenext` → `nest build` generoval soubory do `dist/src/` místo `dist/`
- `railway.toml` obsahoval `startCommand = "node dist/main"` který přebíjel Dockerfile CMD
- Řešení: vytvořen `backend/Dockerfile` (node:18-alpine) + odstraněn startCommand z `railway.toml`

### Konfigurace (finální, funkční)
`backend/Dockerfile` – Railway automaticky detekuje a používá:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
CMD ["node", "dist/src/main"]
```

`backend/railway.toml` – pouze komentář, žádné override:
```toml
# railway.toml - startCommand is intentionally empty so Dockerfile CMD is used
```


### Konfigurace `backend/railway.toml`
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npx prisma generate && npm run build && echo 'BUILD OK' && ls -la dist/"

[deploy]
startCommand = "npm run start:prod"
```

### Railway ENV Variables (nutné mít nastavené)
```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require  (z Neon dashboard)
JWT_SECRET=<silný náhodný string>
GOOGLE_AI_API_KEY=<z Google AI Studio>
GOOGLE_APPLICATION_CREDENTIALS_JSON=<service account JSON jako string>
AZURE_VISION_KEY=<z Azure portal>
AZURE_VISION_ENDPOINT=https://visual-analyzer-vision.cognitiveservices.azure.com/
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=<z Railway Redis service Variables>
PORT=4010
```


