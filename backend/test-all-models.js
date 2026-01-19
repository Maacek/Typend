const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAllModels() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        console.error('❌ GOOGLE_AI_API_KEY not found');
        return;
    }

    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.0-pro',
        'gemini-1.0-pro-vision',
        'gemini-1.0-pro-latest'
    ];

    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTry) {
        try {
            console.log(`\nTrying: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Say "Hello" in one word.');
            const response = await result.response;
            const text = response.text();

            console.log(`✅ SUCCESS with ${modelName}!`);
            console.log(`Response: ${text}`);
            return modelName;

        } catch (error) {
            console.log(`❌ Failed: ${error.message.substring(0, 80)}...`);
        }
    }

    console.log('\n❌ No models worked. The API key may not have access to Gemini models.');
    console.log('You may need to enable Gemini API in Google Cloud Console.');
}

testAllModels();
