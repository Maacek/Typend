const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const apiKey = 'AIzaSyAkDVzTw5KAWzE9WCwR8oLS6gyFiG46CbA';
const ai = new GoogleGenAI({ apiKey });

const imagePath = 'C:/Users/ondre/.gemini/antigravity/brain/a10643a7-9b51-4268-bb99-1299ba27c219/uploaded_image_1768778454835.png';

const filterPrompt = `
Jsi expert na rozlišení GRAFICKÉHO TEXTU vytvořeného designérem od TEXTU NA FOTOGRAFOVANÝCH PRODUKTECH.

ÚKOL: Identifikuj POUZE text overlay, který designér VYTVOŘIL přímo pro banner (ne text na fotografiích).

✅ ZACHOVAT (text vytvořený designérem):
- Nadpisy kampaně (overlay text "zapsaný" pro banner)
- CTA buttony ("Koupit nyní", "Zjistit více")
- Akční nálepky/razítka ("-50% SLEVA", "NOVINKA") - jsou to GRAFICKÉ prvky, ne fotografie
- Kontaktní info (web, tel.) pokud je to overlay text
- Slogany kampaně

❌ VYMAZAT (text na fotografovaných objektech):
- VEŠKERÝ text NA kartičkách/kartách (jména, ceny, statistiky)
- VEŠKERÝ text NA krabicích/obalech produktů
- VEŠKERÝ text NA láhvích/lahvičkách
- VEŠKERÝ text NA etiketách produktů
- Prostě COKOLI co je na fotografovaném produktu/objektu

KLÍČ K ROZLIŠENÍ:
- Text overlay = vytvořen v grafickém editoru PŘES foto
- Text na produktu = je SOUČÁSTÍ fotografie

PŘÍKLADY:

**Banner: "Soutěž o vlastní hrací kartu!" + foto kartiček LINDA + krabice hry**
✅ ZACHOVAT: "Soutěž o vlastní hrací kartu!" (overlay text)
❌ VYMAZAT: "LINDA" (text NA kartičce)
❌ VYMAZAT: "Cena hráče 90 000 €" (text NA kartičce)
❌ VYMAZAT: "FOTBALOVÝ TÝM HVĚZD" (text NA krabici)

**Banner: "Získej vlasy snů -30%" + foto lahvičky šampónu**
✅ ZACHOVAT: "Získej vlasy snů" (overlay text)
✅ ZACHOVAT: "-30%" (pokud je to razítko/nálepka, ne text na produktu)
❌ VYMAZAT: "Head & Shoulders" (text NA lahvičce)
❌ VYMAZAT: "500ml" (text NA lahvičce)

FORMÁT ODPOVĚDI:
Vrať POUZE text overlay (ne text z produktů), jeden řádek per text.

BEZ komentářů, vysvětlení, odrážek.

Pokud není žádný overlay text → vrať prázdný řetězec.`.trim();

async function testFiltering() {
    console.log('Testing FIXED text filtering...\n');

    const imageBuffer = fs.readFileSync(imagePath);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
            {
                role: 'user',
                parts: [
                    { text: filterPrompt },
                    {
                        inlineData: {
                            data: imageBuffer.toString('base64'),
                            mimeType: 'image/png',
                        },
                    },
                ],
            },
        ],
    });

    const filteredText = response.text || '';

    console.log('=== FILTERED TEXT (what will be analyzed) ===');
    console.log(filteredText);
    console.log('=============================================\n');

    console.log('✅ SHOULD include: "Soutěž o vlastní hrací kartu!"');
    console.log('❌ SHOULD NOT include: LINDA, prices, FOTBALOVÝ, card stats');
}

testFiltering().catch(console.error);
