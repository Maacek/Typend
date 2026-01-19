const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyAkDVzTw5KAWzE9WCwR8oLS6gyFiG46CbA';
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const models = await genAI.listModels();
        console.log('Available models:');
        models.forEach(model => {
            console.log(`- ${model.name}`);
            console.log(`  Display name: ${model.displayName}`);
            console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
            console.log('');
        });
    } catch (error) {
        console.error('Error listing models:', error.message);
    }
}

listModels();
