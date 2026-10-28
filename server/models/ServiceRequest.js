const mongoose = require('mongoose');

// Guest service requests (room service, housekeeping, maintenance) and customer-support tickets
const serviceRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    type: { type: String, enum: ['room_service', 'housekeeping', 'maintenance', 'support'], required: true },
    message: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
    status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffNote: { type: String, trim: true, maxlength: 300 },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ status: 1, createdAt: -1 });
serviceRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
