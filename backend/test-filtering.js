const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const apiKey = 'AIzaSyAkDVzTw5KAWzE9WCwR8oLS6gyFiG46CbA';
const ai = new GoogleGenAI({ apiKey });

const imagePath = 'C:/Users/ondre/.gemini/antigravity/brain/a10643a7-9b51-4268-bb99-1299ba27c219/uploaded_image_1768778454835.png';

const filterPrompt = `
Analyzuj tento reklamní banner a IDENTIFIKUJ text, který je VIDITELNĚ SOUČÁSTÍ designu banneru.

ZÁKLADNÍ PRAVIDLO:
**Pokud je text VIDITELNÝ a PROMINENTNÍ v designu banneru → ZACHOVEJ**
Odstranuj POUZE text, který je jasně na POZADÍ/REKVIZITĚ (ne hlavní součást)

✅ VŽDY ZAHRNOUT:
1. **Hlavní nadpisy** - jakýkoliv velký, výrazný text
2. **Propagované položky** - pokud banner propaguje kartičku/hru/produkt, text NA NÍ je součást banneru!
   - Příklad: Banner "Získej vlastní kartu" → text na kartičce = BANNER TEXT ✅
   - Příklad: Banner propaguje hru → název hry na obalu = BANNER TEXT ✅
3. **Slevové štítky** - "-50%", "SLEVA", "AKCE"
4. **CTA** - "Koupit", "Objednat", "Zjistit více"
5. **Veškerý výrazný text** v hlavním designu

❌ ODSTRANIT POUZE:
- Drobný text na pozadě (ingredience na NÁHODNÉM produktu v pozadí)
- Text na dekoračních prvcích (ne hlavní vizuál)
- Malý technický text (čárkové kódy, certifikace) na vedlejších objektech

**KDYŽ SI NEJSI JISTÝ → ZACHOVEJ!**

FORMÁT:
Vrať POUZE čistý text, každý řádek text zvlášť.

NEPIŠ:
- "Banner text:"
- Vysvětlení
- Odrážky
`.trim();

async function testFiltering() {
    console.log('Testing text filtering on real banner...\n');

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

    console.log('=== AI FILTERED TEXT ===');
    console.log(filteredText);
    console.log('========================\n');

    console.log('Expected to include:');
    console.log('- Soutěž o vlastní hrací kartu');
    console.log('- FOTBALOVÝ TÝM HVĚZD (game title)');
    console.log('- LINDA');
    console.log('- Card statistics (90 000 000 €, etc.)');
}

testFiltering().catch(console.error);
