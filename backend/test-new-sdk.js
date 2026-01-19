const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testNewSDK() {
    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        console.log(`Testing new @google/genai SDK...`);
        console.log(`API Key: ${apiKey.substring(0, 20)}...`);

        const genAI = new GoogleGenAI({ apiKey });
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        console.log('\nSending test request...');
        const result = await model.generateContent('Say "Hello World" in one word.');
        const response = await result.response;
        const text = response.text();

        console.log('\n✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
        console.log(`Response: ${text}`);
        console.log('\n🎉 Gemini API is working with new SDK!');
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

testNewSDK();
