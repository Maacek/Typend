const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    try {
        console.log('Listing available Gemini models...\n');

        const apiKey = process.env.GOOGLE_AI_API_KEY;

        if (!apiKey) {
            console.error('❌ GOOGLE_AI_API_KEY not found in .env');
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // List all available models
        const models = await genAI.listModels();

        console.log(`Found ${models.length} models:\n`);

        models.forEach((model, index) => {
            console.log(`${index + 1}. ${model.name}`);
            console.log(`   Display Name: ${model.displayName}`);
            console.log(`   Description: ${model.description}`);
            console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
            console.log('');
        });

        // Find models that support generateContent
        const contentModels = models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent')
        );

        console.log('\n✅ Models supporting generateContent:');
        contentModels.forEach(m => {
            console.log(`   - ${m.name}`);
        });

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    }
}

listModels();
