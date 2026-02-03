const axios = require('axios');

async function checkLogin() {
    try {
        console.log('Testing login with Excel credentials...');
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            loginId: 'superadmin01',
            password: 'SAdmin@123'
        });
        console.log('Login SUCCESS:', res.data.message || 'OK');
        console.log('User:', res.data.name);
    } catch (e) {
        console.error('Login FAILED:', e.response ? e.response.data : e.message);
    }
}

checkLogin();
