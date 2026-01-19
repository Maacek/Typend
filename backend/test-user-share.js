// Test share with user's actual account
const fetch = require('node-fetch');

async function testWithUserAccount() {
    try {
        // Login with user's account
        const loginRes = await fetch('http://localhost:4010/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'ondrej.macku@gmail.com',
                password: 'admin123' // Try default password
            })
        });

        if (!loginRes.ok) {
            console.log('Login failed with admin123, user might have different password');
            console.log('Status:', loginRes.status);
            const error = await loginRes.json();
            console.log('Error:', error);
            return;
        }

        const loginData = await loginRes.json();
        console.log('✅ Login successful!');
        console.log('User:', loginData.user.email);
        console.log('Workspace:', loginData.user.workspaceId);

        const token = loginData.access_token;

        // Get user's batches
        const batchesRes = await fetch('http://localhost:4010/api/v1/batches', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const batches = await batchesRes.json();
        console.log(`\nUser has ${batches.length} batches`);

        if (batches.length === 0) {
            console.log('No batches found for this user!');
            return;
        }

        const firstBatch = batches[0];
        console.log(`\nTesting share for batch: ${firstBatch.name || firstBatch.id}`);

        // Try to share
        const shareRes = await fetch(`http://localhost:4010/api/v1/batches/${firstBatch.id}/share`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!shareRes.ok) {
            console.log('❌ Share failed!');
            console.log('Status:', shareRes.status);
            const error = await shareRes.json();
            console.log('Error:', error);
            return;
        }

        const shareData = await shareRes.json();
        console.log('\n✅ Share SUCCESS!');
        console.log('Share token:', shareData.shareToken);
        console.log('Share URL:', `http://localhost:3000${shareData.shareUrl}`);

        // Test public access
        const publicRes = await fetch(`http://localhost:4010/api/v1/batches/share/${shareData.shareToken}`);
        if (publicRes.ok) {
            console.log('\n✅ Public access works!');
        } else {
            console.log('\n❌ Public access failed');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testWithUserAccount();
