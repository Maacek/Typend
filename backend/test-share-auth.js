// Test share endpoint directly with auth
const token = 'YOUR_JWT_TOKEN_HERE'; // Replace with real token from localStorage
const batchId = 'cmkfzokk90000f1vk66jzrbon'; // Real batch ID from database

fetch(`http://localhost:4010/api/v1/batches/${batchId}/share`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
})
    .then(r => {
        console.log('Status:', r.status);
        return r.json();
    })
    .then(data => {
        console.log('Response:', JSON.stringify(data, null, 2));
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
