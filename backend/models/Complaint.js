const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    // Denormalized on purpose: lets a worker's complaint list be filtered
    // with a single indexed field instead of a join through Booking.
    serviceCategory: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'under_review', 'resolved', 'rejected'], default: 'pending' },
    adminNote: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// This is the index that makes "each service sees only its own complaints" fast.
complaintSchema.index({ serviceCategory: 1, workerId: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
