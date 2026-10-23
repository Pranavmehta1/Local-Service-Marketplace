const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix');
    const db = mongoose.connection.db;
    console.log('Connected to DB:', db.databaseName);

    // 1. Delete all customers and workers from users collection
    const delUsers = await db.collection('users').deleteMany({
      role: { $in: ['customer', 'worker'] }
    });
    console.log('Deleted customer and worker users:', delUsers.deletedCount);

    // 2. Delete all worker documents
    const delWorkers = await db.collection('workers').deleteMany({});
    console.log('Deleted workers:', delWorkers.deletedCount);

    // 3. Clear bookings, reviews, complaints, otps, notifications
    const delBookings = await db.collection('bookings').deleteMany({});
    const delReviews = await db.collection('reviews').deleteMany({});
    const delComplaints = await db.collection('complaints').deleteMany({});
    const delOtps = await db.collection('otps').deleteMany({});
    const delNotifications = await db.collection('notifications').deleteMany({});
    console.log('Cleared operational collections.');

    // 4. Ensure admin account exists
    let admin = await db.collection('users').findOne({ role: 'admin' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await db.collection('users').insertOne({
        name: 'LocalFix Admin',
        email: 'admin@localfix.com',
        phone: '9999999999',
        password: hash,
        role: 'admin',
        location: 'Ludhiana, Punjab',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created admin account: admin@localfix.com');
    } else {
      console.log('Preserved existing admin account:', admin.email);
    }

    const remainingUsers = await db.collection('users').find({}).toArray();
    console.log('Users remaining in DB:', remainingUsers.map(u => ({ email: u.email, role: u.role })));
    const remainingWorkers = await db.collection('workers').countDocuments();
    console.log('Workers remaining in DB:', remainingWorkers);

    console.log('RESET_SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('Reset error:', err);
    process.exit(1);
  }
};

run();
