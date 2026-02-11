const mongoose = require('mongoose');
const User = require('./models/userModel');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/project_mgmt_app';

async function checkUser() {
    try {
        console.log(`Checking DB: ${uri.includes('localhost') ? 'Local' : 'Remote'}`);
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to DB');

        const user = await User.findOne({ loginId: 'superadmin01' });
        if (user) {
            console.log('User found:', user.email, user.role);
            // Verify password manually if needed, but just existence is good first step
        } else {
            console.log('User superadmin01 NOT FOUND');
            // List some users
            const users = await User.find({}).limit(5);
            console.log('First 5 users:', users.map(u => u.loginId));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();
