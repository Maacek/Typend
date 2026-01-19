const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testLiteModel() {
    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        console.log('Testing Gemini 2.5 Flash Lite (higher quota)...\n');

        const ai = new GoogleGenAI({ apiKey });

        console.log('Sending request...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: 'Say "Hello World" in one word.',
        });

        console.log('\n✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
        console.log(`Response: ${response.text}`);
        console.log('\n🎉 Gemini API is working!');
        console.log('Phase 3 is ready for E2E testing!\n');
        return true;

    } catch (error) {
        console.log('\n❌ FAILED');
        console.log('Error:', error.message);
        return false;
    }
}

testLiteModel();
