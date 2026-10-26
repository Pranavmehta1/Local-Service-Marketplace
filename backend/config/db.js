const mongoose = require('mongoose');

// Connects securely to MongoDB Atlas or local MongoDB using MONGODB_URI (or fallback MONGO_URI)
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    console.error('FATAL: Neither MONGODB_URI nor MONGO_URI is defined in environment variables.');
    process.exit(1);
  }

  // Set up connection lifecycle monitoring for production resilience
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established successfully.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Reconnection will be attempted automatically...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully.');
  });

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (err) {
    console.error(`Initial MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
