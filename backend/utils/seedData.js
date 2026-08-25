// Run with: npm run seed  (after setting MONGO_URI in .env)
// Wipes and repopulates the DB with realistic sample data so every screen
// looks populated during a presentation.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

const workerSeed = [
  { name: 'Rahul Sharma', category: 'electrician', experience: 6, price: 250, rating: 4.8, area: 'Model Town, Ludhiana' },
  { name: 'Aman Kumar', category: 'plumber', experience: 5, price: 200, rating: 4.7, area: 'Sarabha Nagar, Ludhiana' },
  { name: 'Vikram Singh', category: 'ac_repair', experience: 8, price: 400, rating: 4.9, area: 'Civil Lines, Ludhiana' },
  { name: 'Arjun Verma', category: 'ro_repair', experience: 4, price: 180, rating: 4.6, area: 'Dugri, Ludhiana' },
  { name: 'Suresh Yadav', category: 'carpenter', experience: 7, price: 300, rating: 4.5, area: 'Pakhowal Road, Ludhiana' },
  { name: 'Priya Nair', category: 'cleaning', experience: 3, price: 150, rating: 4.7, area: 'BRS Nagar, Ludhiana' },
  { name: 'Manoj Tiwari', category: 'appliance_repair', experience: 5, price: 220, rating: 4.4, area: 'Ferozepur Road, Ludhiana' },
];

const run = async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}), Worker.deleteMany({}), Booking.deleteMany({}),
    Complaint.deleteMany({}), Review.deleteMany({}), Notification.deleteMany({}),
  ]);

  console.log('Creating admin...');
  await User.create({
    name: 'LocalFix Admin', email: 'admin@localfix.com', phone: '9999999999',
    password: 'admin123', role: 'admin', location: 'Ludhiana, Punjab',
  });

  console.log('Creating customers...');
  const customers = await User.create([
    { name: 'Neha Gupta', email: 'neha@example.com', phone: '9876500001', password: 'password123', role: 'customer', location: 'Model Town, Ludhiana' },
    { name: 'Rohit Malhotra', email: 'rohit@example.com', phone: '9876500002', password: 'password123', role: 'customer', location: 'Sarabha Nagar, Ludhiana' },
    { name: 'Simran Kaur', email: 'simran@example.com', phone: '9876500003', password: 'password123', role: 'customer', location: 'Dugri, Ludhiana' },
  ]);

  console.log('Creating workers...');
  const workers = [];
  for (const w of workerSeed) {
    const user = await User.create({
      name: w.name,
      email: `${w.name.split(' ')[0].toLowerCase()}@localfix.com`,
      phone: '98' + Math.floor(10000000 + Math.random() * 89999999),
      password: 'password123',
      role: 'worker',
      location: w.area,
    });
    const worker = await Worker.create({
      userId: user._id,
      serviceCategory: w.category,
      experience: w.experience,
      skills: ['On-time', 'Verified', 'Genuine parts'],
      serviceArea: w.area,
      pricing: { startingPrice: w.price },
      verificationStatus: 'approved',
      rating: w.rating,
      totalReviews: Math.floor(20 + Math.random() * 120),
      completedJobs: Math.floor(30 + Math.random() * 200),
      about: `Experienced ${w.category.replace('_', ' ')} worker serving ${w.area} and nearby areas.`,
    });
    workers.push(worker);
  }

  // One worker still pending verification, to populate the admin's queue
  const pendingUser = await User.create({
    name: 'Deepak Rana', email: 'deepak@localfix.com', phone: '9876511111',
    password: 'password123', role: 'worker', location: 'Model Town, Ludhiana',
  });
  await Worker.create({
    userId: pendingUser._id, serviceCategory: 'electrician', experience: 2,
    skills: ['Wiring', 'Fan installation'], serviceArea: 'Model Town, Ludhiana',
    pricing: { startingPrice: 200 }, verificationStatus: 'pending',
  });

  console.log('Creating sample bookings, reviews, complaints, notifications...');
  const booking1 = await Booking.create({
    customerId: customers[0]._id, workerId: workers[0]._id, serviceCategory: 'electrician',
    problemDescription: 'Ceiling fan not switching on', address: 'H.No 45, Model Town, Ludhiana',
    date: new Date(Date.now() - 86400000 * 5), timeSlot: '10:00 AM - 12:00 PM', status: 'completed', price: 250,
  });
  const booking2 = await Booking.create({
    customerId: customers[1]._id, workerId: workers[1]._id, serviceCategory: 'plumber',
    problemDescription: 'Kitchen tap leaking', address: 'H.No 12, Sarabha Nagar, Ludhiana',
    date: new Date(Date.now() + 86400000 * 2), timeSlot: '2:00 PM - 4:00 PM', status: 'accepted', price: 200,
  });
  await Booking.create({
    customerId: customers[2]._id, workerId: workers[2]._id, serviceCategory: 'ac_repair',
    problemDescription: 'AC not cooling properly', address: 'H.No 78, Dugri, Ludhiana',
    date: new Date(Date.now() + 86400000), timeSlot: '11:00 AM - 1:00 PM', status: 'requested', price: 400,
  });

  await Review.create({
    customerId: customers[0]._id, workerId: workers[0]._id, bookingId: booking1._id,
    rating: 5, comment: 'Fixed the fan quickly and explained the issue clearly. Highly recommended!',
  });

  await Complaint.create({
    customerId: customers[1]._id, workerId: workers[1]._id, bookingId: booking2._id,
    serviceCategory: 'plumber', subject: 'Late arrival', description: 'Worker arrived 40 minutes after the scheduled slot.',
    priority: 'low', status: 'pending',
  });

  await Notification.create([
    { userId: customers[0]._id, title: 'Booking completed', message: 'Your electrician booking was marked completed. Please rate your experience.', type: 'booking' },
    { userId: workers[0].userId, title: 'New review', message: 'You received a new 5-star review.', type: 'review' },
  ]);

  console.log('Seed complete. Sample logins:');
  console.log('  Admin:    admin@localfix.com / admin123');
  console.log('  Customer: neha@example.com / password123');
  console.log('  Worker:   rahul@localfix.com / password123');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
