const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');

async function testVertexAI() {
    try {
        console.log('Testing Vertex AI connection...');

        // Set the credentials path explicitly
        const credentialsPath = path.join(__dirname, 'google-service-account.json');
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        console.log(`Credentials path: ${credentialsPath}`);

        const projectId = 'visual-analyzer-ocr';

        // Try different regions
        const regionsToTry = ['us-east4', 'europe-west1', 'us-central1'];
        const modelsToTry = ['gemini-1.5-pro', 'gemini-1.5-pro-001', 'gemini-pro-vision'];

        for (const location of regionsToTry) {
            for (const modelName of modelsToTry) {
                try {
                    console.log(`\nTrying ${modelName} in ${location}...`);

                    const vertexAI = new VertexAI({ project: projectId, location: location });
                    const model = vertexAI.getGenerativeModel({
                        model: modelName,
                    });

                    console.log('Model initialized, sending test request...');
                    const result = await model.generateContent('Say "Hello" in one word.');
                    const response = await result.response;
                    const text = response.candidates[0].content.parts[0].text;

                    console.log(`✅ SUCCESS with ${modelName} in ${location}!`);
                    console.log(`Response: ${text}`);
                    return { model: modelName, location: location };

                } catch (error) {
                    console.log(`❌ Failed: ${error.message.substring(0, 100)}...`);
                }
            }
        }

        console.log('\n❌ All combinations failed');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
}

testVertexAI();
