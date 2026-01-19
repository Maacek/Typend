const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
    try {
        console.log('Testing Google AI (Gemini) connection...');

        const apiKey = process.env.GOOGLE_AI_API_KEY;

        if (!apiKey) {
            console.error('❌ GOOGLE_AI_API_KEY not found in .env');
            return;
        }

        console.log('✅ API key found');
        console.log('Initializing Gemini Pro Vision...');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'models/gemini-pro-vision' });

        console.log('Sending test request...');
        const result = await model.generateContent('Say "Hello World" in one word.');
        const response = await result.response;
        const text = response.text();

        console.log('\n✅ SUCCESS!');
        console.log('Response:', text);
        console.log('\n🎉 Gemini API is working correctly!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    }
}

testGemini();
