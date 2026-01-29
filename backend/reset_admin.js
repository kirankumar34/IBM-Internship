const mongoose = require('mongoose');
const User = require('./models/userModel');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/project_mgmt_app';

async function resetPass() {
    try {
        await mongoose.connect(uri);
        const user = await User.findOne({ loginId: 'superadmin01' });
        if (user) {
            user.password = '123456';
            await user.save();
            console.log('Password reset to 123456 for superadmin01');
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

resetPass();
