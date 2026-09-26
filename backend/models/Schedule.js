const mongoose = require('mongoose');

// Entries now get an _id (needed to mark a specific session as done)
const scheduleEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  task: { type: String, required: true },
  hours: { type: Number, required: true },
  startHour: { type: Number },
  endHour: { type: Number },
  type: { type: String, enum: ['study', 'commitment'], default: 'study' },
  completed: { type: Boolean, default: false }
});

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