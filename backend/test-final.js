const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testCorrectSDK() {
    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        console.log('Testing correct @google/genai SDK...\n');

        const ai = new GoogleGenAI({ apiKey });

        console.log('Sending request to Gemini 2.0 Flash...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Say "Hello World" in one word.',
        });

        console.log('\n✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
        console.log(`Response: ${response.text}`);
        console.log('\n🎉 Gemini API is working correctly!');
        console.log('Phase 3 visual analysis is ready to go!\n');
        return true;

    } catch (error) {
        console.log('\n❌ FAILED');
        console.log('Error:', error.message);
        if (error.stack) {
            console.log('Stack:', error.stack);
        }
        return false;
    }
}

testCorrectSDK();
