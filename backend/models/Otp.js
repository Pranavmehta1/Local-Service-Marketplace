const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    identifierType: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['login', 'register'],
      default: 'login',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-delete expired documents
    },
  },
  { timestamps: true }
);

// Compound index for fast lookup of active challenge
otpSchema.index({ identifier: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
