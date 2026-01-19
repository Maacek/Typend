# IMPLEMENTATION PLAN — Creative QA & Visual Review Tool (MVP)

Tento dokument popisuje detailní plán implementace MVP včetně milníků, rozpadů úkolů,
Definition of Done, pořadí prací a hlavních rizik.

---

## 1. Základní principy implementace

- MVP je zaměřené na kvalitu výstupů, ne na množství feature
- Explainability-first (včetně vizuální evidence: heatmap overlay)
- Batch až 50 kreativ, fail-soft processing
- Full docker-compose pro lokální vývoj

---

## 2. Fáze implementace

### Phase 0 — Project Setup & Foundations
**Cíl:** stabilní základ projektu

**Tasks**
- Repo + struktura (frontend / backend / shared / infra)
- Docker-compose (frontend, backend, worker, postgres, redis, minio)
- CI pipeline
- Prisma schema (Workspace, Batch, Creative, AnalysisResult)
- Auth (invite-based)

**DoD**
- `docker compose up` spustí celý stack
- Migrace fungují
- Frontend ↔ backend komunikace OK

---

### Phase 1 — Batch Upload & Orchestration
**Cíl:** upload batchů + stav zpracování

**Tasks**
- Upload endpointy + validace typů (JPG/PNG)
- Uložení do MinIO (TTL)
- Job orchestrace (1 kreativa = 1 job) + stav (queued/processing/done/partial-failed)
- UI: batch list + progress + přehled výsledků

**DoD**
- Batch do 50 kreativ funguje
- Stav se aktualizuje průběžně
- Fail-soft: jedna kreativa nespadne celý batch

---

### Phase 2 — OCR & Text QA Pipeline
**Cíl:** textové chyby + confidence

**Tasks**
- OCR (single engine)
- Language detection (CZ/EN/SK)
- Text QA (typos, gramatika, čitelnost)
- Confidence scoring + UI označení nejistoty
- Ukládání strukturovaných výsledků (issues, severity, bounding boxes)
- UI: text highlights na vizuálu

**DoD**
- Pro každou kreativou: extrahovaný text + issues + confidence
- Low-confidence = warning (viditelné v UI)
- Výstupy jsou strukturované a vysvětlitelné

---

### Phase 3 — Visual Analysis, Heatmap & Senior Reviewer
**Cíl:** multi-dim scoring + heatmap + expertní doporučení

**Tasks**
- Feature extraction (layout, kontrast, hierarchie, hustota prvků)
- Heuristický scoring do dimenzí:
  - Start Focus, End Focus, Engagement Potential, Memory Potential,
    Visual Hierarchy, Clarity of Message
- Heatmap generation (attention/saliency)
  - výstup jako PNG overlay (uložit do MinIO, reference do DB)
  - metadata: heatmap_version, size, timestamp
- LLM reviewer:
  - interpretace feature + heatmap signálů
  - vysvětlení „proč“ + návrhy „jak zlepšit“
- Persist výsledků (DB + artefakty)

**DoD**
- Každá kreativa má:
  - dimenzionální score
  - senior reviewer komentář (why/how)
  - heatmap overlay (pokud generování proběhlo)
- Žádné black-box verdikty
- Fail-soft: pokud heatmap selže, zbytek analýzy doběhne

---

### Phase 4 — Batch UX & Comparison
**Cíl:** přehled pro 50 kreativ

**Tasks**
- Virtualized tabulka
- Filtrování (text issues, low score, low confidence)
- Řazení a porovnání kreativ
- Detail view:
  - toggle overlay: heatmap / text highlights / none
  - rychlá navigace next/prev
- UX prioritizace: „fix first“ seznam

**DoD**
- 50 kreativ je přehledných (filtrovatelné, řaditelné)
- Heatmap overlay jde zapnout/vypnout bez zdržení
- Uživatel rychle najde priority úprav

---

### Phase 5 — Export & Sharing
**Cíl:** sdílení a export

**Tasks**
- CSV export (scores, flags, confidence, top issues)
- Read-only share link
- Access control + retention

**DoD**
- CSV odpovídá UI datům
- Share link je bezpečný a read-only
- Retence se dodržuje (včetně artefaktů jako heatmap)

---

## 3. Kritická cesta (pořadí prací)

1. docker-compose + CI + DB
2. upload + storage
3. orchestrace jobů
4. OCR + text QA
5. visual heuristiky
6. heatmap generation
7. LLM reviewer
8. batch UX (overlay toggles)
9. export + sharing

---

## 4. Odhady (orientační)

| Fáze | Odhad |
|----|----|
| Phase 0 | 3–5 dní |
| Phase 1 | 5–7 dní |
| Phase 2 | 7–10 dní |
| Phase 3 | 9–13 dní (včetně heatmap) |
| Phase 4 | 5–7 dní |
| Phase 5 | 3–5 dní |

Celkem cca 32–47 pracovních dní.

---

## 5. Rizika & mitigace

- OCR nepřesnost → confidence + warnings
- LLM halucinace → striktní input schema, interpretace signálů
- Heatmap „neodpovídá realitě“ → označit jako explainability pomůcku, ne absolutní pravdu
- UX zahlcení → batch-first design, filtry, prioritizace

---

## 6. Globální Definition of Done (MVP)

- Batch 50 kreativ projde bez pádu
- Každá kreativa má text QA + vizuální score + vysvětlení
- Heatmap overlay je dostupný (pokud generování proběhlo) a je přehledně zobrazitelný v detail view
- Interní tým chce nástroj používat dál
