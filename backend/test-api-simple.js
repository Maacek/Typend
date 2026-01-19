require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log('API Key:', process.env.GOOGLE_AI_API_KEY?.substring(0, 10) + '...');

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    try {
        const result = await model.generateContent('Hello, how are you?');
        console.log('✅ API works!');
        console.log('Response:', result.response.text());
    } catch (error) {
        console.error('❌ API failed:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testGemini();
