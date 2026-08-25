const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    serviceCategory: { type: String, required: true },
    problemDescription: { type: String, required: true },
    address: { type: String, required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true }, // e.g. "10:00 AM - 12:00 PM"
    status: {
      type: String,
      enum: ['requested', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'],
      default: 'requested',
    },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
