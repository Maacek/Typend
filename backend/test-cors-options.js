const http = require('http');
const https = require('https');

const req = https.request('https://typend-production.up.railway.app/api/v1/batches/upload', {
    method: 'OPTIONS',
    headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('HEADERS:');
    console.log(res.headers);
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
