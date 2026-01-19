// Test share endpoint
const testIdentifier = process.argv[2] || 'test-slug';

fetch(`http://localhost:4010/api/v1/batches/share/${testIdentifier}`)
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
