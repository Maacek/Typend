require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

async function testNewSDK() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Tell me a joke.',
        });
        console.log('Success (gemini-2.0-flash)!', response.text);
    } catch (err) {
        console.error('Failed (gemini-2.0-flash):', err.message);
    }
}

testNewSDK();
