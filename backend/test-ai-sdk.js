const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    console.log('API Key:', apiKey ? 'FOUND' : 'MISSING');

    try {
        const genAI = new GoogleGenAI({ apiKey });
        console.log('SDK initialized');

        // Let's try to list models if possible, or just try a standard one
        const response = await genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Say hi' }] }]
        });

        console.log('Response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

test();
