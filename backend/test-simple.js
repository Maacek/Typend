const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testSimple() {
    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        console.log(`Testing with key: ${apiKey.substring(0, 20)}...`);

        const genAI = new GoogleGenerativeAI(apiKey);

        // Try gemini-pro (older, more stable)
        console.log('\nTrying gemini-pro...');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say hello');
        const response = await result.response;
        const text = response.text();

        console.log('✅ SUCCESS!');
        console.log(`Response: ${text}`);
        return true;

    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.message);
        return false;
    }
}

testSimple();
