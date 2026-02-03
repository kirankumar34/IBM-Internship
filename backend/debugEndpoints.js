const axios = require('axios');

async function testEndpoints() {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
        loginId: 'superadmin01',
        password: 'password123'
    });
    const token = loginRes.data.token;
    const userId = loginRes.data._id;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    console.log('Login successful. Testing endpoints...');

    try {
        console.time('fetchTimesheet');
        // Construct a dynamic week ID just to be safe, or hardcode current
        const currentWeek = '2026-W06'; // Approximate
        await axios.get(`http://localhost:5000/api/timesheets/user/${userId}/week/${currentWeek}`, config);
        console.timeEnd('fetchTimesheet');
        console.log('Timesheet endpoint OK');
    } catch (e) {
        console.error('Timesheet endpoint failed:', e.message);
    }

    try {
        console.time('fetchTasks');
        await axios.get('http://localhost:5000/api/tasks', config);
        console.timeEnd('fetchTasks');
        console.log('Tasks endpoint OK');
    } catch (e) {
        console.error('Tasks endpoint failed:', e.message);
    }

    try {
        console.time('fetchPending');
        await axios.get('http://localhost:5000/api/timesheets/pending', config);
        console.timeEnd('fetchPending');
        console.log('Pending endpoint OK');
    } catch (e) {
        console.error('Pending endpoint failed:', e.response ? e.response.data : e.message);
    }
}

testEndpoints();
