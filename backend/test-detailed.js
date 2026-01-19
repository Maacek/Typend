const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function detailedTest() {
    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;

        console.log('=== Detailed Gemini API Test ===\n');
        console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}`);
        console.log(`API Key Length: ${apiKey.length} characters\n`);

        const genAI = new GoogleGenerativeAI(apiKey);

        // Try the most common model
        console.log('Testing: gemini-1.5-flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('Sending request to Gemini API...\n');

        const result = await model.generateContent('Say "Hello World" in one word.');
        const response = await result.response;
        const text = response.text();

        console.log('✅ ✅ ✅ SUCCESS! ✅ ✅ ✅\n');
        console.log(`Response: "${text}"\n`);
        console.log('🎉 Gemini API is working correctly!');
        console.log('You can now proceed with Phase 3 visual analysis.\n');

        return true;

    } catch (error) {
        console.log('\n❌ ❌ ❌ FAILED ❌ ❌ ❌\n');
        console.log('Error Type:', error.constructor.name);
        console.log('Error Message:', error.message);

        if (error.response) {
            console.log('\nResponse Status:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        }

        if (error.message.includes('404')) {
            console.log('\n📋 Diagnosis:');
            console.log('- The API is enabled but the model is not accessible');
            console.log('- Possible causes:');
            console.log('  1. API activation takes 1-2 minutes - wait and try again');
            console.log('  2. API key was created BEFORE enabling the API - create a new key');
            console.log('  3. Wrong project - verify the API key project matches the enabled API');
        }

        if (error.message.includes('API_KEY_INVALID')) {
            console.log('\n📋 Diagnosis:');
            console.log('- The API key format is invalid or revoked');
            console.log('- Solution: Generate a new API key');
        }

        console.log('\n');
        return false;
    }
}

detailedTest();
