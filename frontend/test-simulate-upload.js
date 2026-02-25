const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
    try {
        const formData = new FormData();
        // Vytvorime maly dummy file jako buffer a pridejime
        const buffer = Buffer.from('test image content', 'utf8');
        formData.append('files', buffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

        console.log('Posting to Railway...');

        // Test without auth first, just to see what kind of error we get 
        // Usually 401 Unauthorized is good, means we reached the server
        const res = await axios.post('https://typend-production.up.railway.app/api/v1/batches/upload', formData, {
            headers: {
                ...formData.getHeaders(),
            }
        });

        console.log('Success:', res.status, res.data);
    } catch (err) {
        if (err.response) {
            console.error('Server responded with:', err.response.status, err.response.data);
        } else if (err.request) {
            console.error('No response received (Network Error):', err.message);
        } else {
            console.error('Error in request setup:', err.message);
        }
    }
}

testUpload();
