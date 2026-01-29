const axios = require('axios');

async function testApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/projects');
        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testApi();
