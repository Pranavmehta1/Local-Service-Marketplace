const mongoose = require('mongoose');

const SERVICE_CATEGORIES = [
  'electrician',
  'plumber',
  'ac_repair',
  'ro_repair',
  'carpenter',
  'cleaning',
  'appliance_repair',
];

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    serviceCategory: { type: String, enum: SERVICE_CATEGORIES, required: true },
    experience: { type: Number, required: true, min: 0 }, // years
    skills: { type: [String], default: [] },
    pricing: {
      startingPrice: { type: Number, required: true, min: 0 },
    },
    serviceArea: { type: String, required: true },
    workingHours: {
      from: { type: String, default: '09:00' },
      to: { type: String, default: '18:00' },
      days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    about: { type: String, default: '' },
  },
  { timestamps: true }
);

workerSchema.index({ serviceCategory: 1, verificationStatus: 1 });

module.exports = mongoose.model('Worker', workerSchema);
module.exports.SERVICE_CATEGORIES = SERVICE_CATEGORIES;
