// Login and test share endpoint
const fetch = require('node-fetch');

async function testShareEndpoint() {
    try {
        // 1. Login to get JWT
        const loginRes = await fetch('http://localhost:4010/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@agentura.cz',
                password: 'admin123'
            })
        });

        const loginData = await loginRes.json();
        console.log('Login response:', loginData);

        if (!loginData.access_token) {
            console.error('No token received!');
            return;
        }

        const token = loginData.access_token;
        console.log('Got token:', token.substring(0, 20) + '...');

        // 2. Get batch ID from database
        const batchId = 'cmkfzokk90000f1vk66jzrbon'; // From database check

        // 3. Try to generate share token
        console.log(`\nTesting POST /batches/${batchId}/share...`);
        const shareRes = await fetch(`http://localhost:4010/api/v1/batches/${batchId}/share`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        console.log('Share response status:', shareRes.status);
        const shareData = await shareRes.json();
        console.log('Share response data:', JSON.stringify(shareData, null, 2));

        if (shareData.shareToken) {
            console.log('\n✅ SUCCESS! Share token generated:', shareData.shareToken);

            // 4. Test public access
            console.log('\nTesting public access...');
            const publicRes = await fetch(`http://localhost:4010/api/v1/batches/share/${shareData.shareToken}`);
            console.log('Public access status:', publicRes.status);
            const publicData = await publicRes.json();
            console.log('Public data:', publicData.batchId ? '✅ Works!' : '❌ Failed');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testShareEndpoint();
