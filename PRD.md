# PRD — Creative QA & Visual Review Tool (MVP)

## 1. Executive Summary

Tento produkt je webová aplikace pro digitální agentury, která umožňuje hromadně analyzovat statické vizuály (JPG/PNG) pro performance kampaně. Funguje jako kombinace rychlé QA kontroly a seniorního expertního review, které odhaluje chyby i kvalitativní slabiny, jež uživatel často přehlédne nebo nedokáže správně vyhodnotit.

**Value proposition**
- Odhalení gramatických, typografických a čitelnostních chyb ve velkém objemu kreativ.
- Expertní hodnocení atraktivity a srozumitelnosti vizuálů napříč více faktory.
- Konkrétní, akční doporučení, co a proč zlepšit.
- Heatmapa pozornosti pro vysvětlitelnost (vizualizace „kam to táhne oči“).

**MVP goal statement**  
Dodat vysvětlitelný, přehledný a důvěryhodný nástroj, který zvyšuje kvalitu kreativy před spuštěním kampaní a zvládne efektivně pracovat s batchi až 50 vizuálů.

---

## 2. Mission

**Mise produktu**  
Pomáhat týmům vytvářet lepší performance kreativy tím, že jim poskytne spolehlivé QA a expertní feedback dříve, než utratí rozpočet v kampaních.

**Core principy**
1. Explainability over magic – každý výstup má jasné „proč“.
2. Senior reviewer mindset – doporučení, ne absolutní pravdy.
3. Přehlednost při velkém objemu – 50 kreativ musí být zvládnutelné.
4. Kombinace rychlých checků a hlubšího hodnocení.
5. Transparentní práce s nejistotou (confidence, warnings).
6. Vizualizuj důvody (např. heatmapa pozornosti).

---

## 3. Target Users

### Persony
- Performance specialista (medior/senior)
- Creative / Art Director
- Account / Project Manager

### Technická úroveň
- Pokročilí uživatelé marketingových nástrojů
- Bez nutnosti technických znalostí AI

### Pain points
- Manuální kontrola je subjektivní a nekonzistentní
- Překlepy a chyby přehlédnuté před spuštěním kampaně
- Nedostatek expertního know-how v týmu

---

## 4. MVP Scope

### In Scope ✅
**Core**
- Hromadný upload JPG/PNG
- Batch analýza až 50 kreativ
- Přehledná tabulka + detail vizuálu

**Technical**
- OCR s confidence (CZ / EN / SK)
- Text QA (gramatika, typos, čitelnost)
- Multi-dimenzionální scoring atraktivity
- Heatmapa pozornosti (overlay na vizuálu) jako součást explainability
- Explainability výstupy (why / how / confidence)

**Integration**
- CSV export
- Read-only share link

### Out of Scope ❌
- Video / animace
- Generování kreativ
- Garance výkonu kampaní
- PDF reporty
- Trénování na klientských datech

---

## 5. User Stories

1. As a performance specialist, I want to upload a batch of creatives, so that I can quickly identify risky visuals.
2. As a creative, I want to understand why a visual scores poorly, so that I know how to improve it.
3. As a PM, I want to share read-only results with a client.
4. As a user, I want to filter creatives with text errors.
5. As a user, I want confidence indicators.
6. As a user, I want to compare creatives in a batch.
7. As a user, I want CSV export.
8. As a user, I want to see a heatmap overlay, so that I can quickly understand what likely draws attention first.

---

## 6. Core Architecture & Patterns

- Web frontend
- Backend API
- Async processing pipeline (fail-soft)

Patterns:
- Async job processing
- Explainability-first (včetně heatmap overlay)
- Structured + narrative outputs

---

## 7. Tools / Features

- Batch upload & progress
- OCR text extraction + highlights
- Text QA issues (severity-based)
- Visual scoring dashboard
- Heatmap (attention/visual focus) overlay toggle v detailu kreativy
- Senior reviewer comments
- Filtering, sorting, ranking

---

## 8. Technology Stack

**Backend**
- API-first backend
- Async job queue
- Object storage (TTL)

**Frontend**
- SPA web app
- Table + detail views
- Optimalizace pro velké batchy
- Overlay rendering (heatmap + text highlights)

---

## 9. Security & Configuration

- Invite-based access
- Workspace isolation
- Konfigurovatelná data retention
- Žádné trénování na datech klientů

---

## 10. API Specification (MVP)

- POST /batches
- GET /batches/{id}
- GET /creatives/{id}
- GET /creatives/{id}/heatmap   (image/png nebo signed URL)
- GET /exports/{batchId}.csv

---

## 11. Success Criteria

- Relevance nálezů potvrzená uživateli
- Výstupy označené jako „nová informace“
- Doporučení vedoucí k úpravám kreativ
- Důvěra v systém
- Používání jako standardní krok před kampaní

---

## 12. Implementation Phases

1. Core pipeline
2. Visual scoring + heatmap explainability
3. Batch UX & export

---

## 13. Future Considerations

- Konfigurovatelné váhy
- Brand guidelines
- Video creatives
- PDF reporty
- Pokročilé porovnávání heatmap mezi variantami

---

## 14. Risks & Mitigations

- OCR nepřesnost → confidence
- Subjektivita → explainability + heatmap jako vizuální evidence
- UX zahlcení → batch-first design

---

## 15. Appendix

- Researcher_kontext
- Researcher_tech
- Repo struktura
