require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB\n');

    // Find all team leaders
    const teamLeaders = await User.find({ role: 'team_leader' });
    console.log(`Team Leaders found: ${teamLeaders.length}`);
    teamLeaders.forEach(tl => {
        console.log(`- ${tl.name} (${tl.loginId}) - Role: ${tl.role}`);
    });

    // Get role distribution
    const allRoles = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    console.log('\nAll roles in database:');
    allRoles.forEach(r => {
        console.log(`- ${r._id}: ${r.count} users`);
    });

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
