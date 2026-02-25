const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'https://typend-production.up.railway.app/api/v1';

async function run() {
    console.log('1. Logging in...');
    const loginRes = await fetch(API_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@agentura.cz', password: 'admin123' })
    });
    if (!loginRes.ok) throw new Error('Login failed: ' + loginRes.status);
    const { access_token } = await loginRes.json();
    console.log('Logged in. Token length:', access_token.length);

    console.log('2. Uploading file...');
    const form = new FormData();
    form.append('name', 'API Test Batch');
    const fileBuf = fs.readFileSync('C:\\Users\\ondre\\.gemini\\antigravity\\brain\\122258b3-68ee-4e58-85a5-65e50e33de45\\test_ad_banner_1771969791575.png');
    form.append('files', fileBuf, { filename: 'test.png', contentType: 'image/png' });

    const uploadRes = await fetch(API_URL + '/batches/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + access_token, ...form.getHeaders() },
        body: form
    });
    if (!uploadRes.ok) throw new Error('Upload failed: ' + uploadRes.status + ' ' + await uploadRes.text());

    const { batchId } = await uploadRes.json();
    console.log('Upload successful. Batch ID:', batchId);

    console.log('3. Polling for results...');
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const resultsRes = await fetch(API_URL + '/batches/' + batchId + '/results', {
            headers: { 'Authorization': 'Bearer ' + access_token }
        });
        console.log('Poll', i, 'Status:', resultsRes.status);
        if (!resultsRes.ok) {
            console.error('Error body:', await resultsRes.text());
            continue;
        }
        const data = await resultsRes.json();
        const statuses = data.creatives.map(c => c.status);
        console.log('Creative statuses:', statuses);
        if (statuses.every(s => s === 'DONE' || s === 'FAILED' || s === 'PARTIAL_FAILED')) {
            console.log('Processing complete!');
            break;
        }
    }
}
run().catch(console.error);
