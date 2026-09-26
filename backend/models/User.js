const mongoose = require('mongoose');

const commitmentSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  label: { type: String, required: true },
  startHour: { type: Number, required: true }, // 24-hour format, e.g. 18 for 6 PM
  endHour: { type: Number, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true },
  availableHoursPerDay: { type: Number, default: 4 },
  constraints: {
    commutingHours: { type: Number, default: 0 }
  },
  sleepTime: { type: Number, default: 23 },  // 24-hour format, e.g. 23 = 11 PM
  wakeTime: { type: Number, default: 8 },    // e.g. 8 = 8 AM
  recurringCommitments: [commitmentSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);