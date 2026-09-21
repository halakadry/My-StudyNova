const mongoose = require('mongoose');

const scheduleEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  task: { type: String, required: true },
  hours: { type: Number, required: true }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entries: [scheduleEntrySchema],
  overloadedDays: [{
    date: String,
    totalHours: Number,
    excessHours: Number
  }],
  isOverloaded: { type: Boolean, default: false },
  reliableSchedule: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);