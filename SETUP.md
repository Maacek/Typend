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
