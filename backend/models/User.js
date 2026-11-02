const mongoose = require('mongoose');

// A weekly commitment, e.g. Gym every Monday 14:00-16:00
const recurringCommitmentSchema = new mongoose.Schema({
  day: { type: String, required: true },        // 'Sunday' ... 'Saturday'
  label: { type: String, required: true },      // e.g. 'Gym'
  startHour: { type: Number, required: true },  // 0-23
  endHour: { type: Number, required: true }     // 1-24
});

// A one-time event, e.g. Dentist on 2026-11-12 from 10:00 to 12:00
const oneTimeEventSchema = new mongoose.Schema({
  date: { type: String, required: true },       // 'YYYY-MM-DD'
  label: { type: String, required: true },
  startHour: { type: Number, required: true },
  endHour: { type: Number, required: true }
});

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String },
  availableHoursPerDay: { type: Number, default: 4 },
  constraints: {
    commutingHours: { type: Number, default: 0 }
  },
  sleepTime: { type: Number, default: 23 },
  wakeTime: { type: Number, default: 8 },
  recurringCommitments: [recurringCommitmentSchema],
  oneTimeEvents: [oneTimeEventSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);