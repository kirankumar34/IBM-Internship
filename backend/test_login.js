const axios = require('axios');

async function login() {
    try {
        console.log('Attempting login with superadmin01...');
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            loginId: 'superadmin01',
            password: '123456'
        });
        console.log('Login Success!');
        console.log('Token:', res.data.token ? 'Received' : 'Missing');
    } catch (error) {
        console.error('Login Failed Status:', error.response?.status);
        console.error('Login Failed Data:', error.response?.data);
    }
}

login();
