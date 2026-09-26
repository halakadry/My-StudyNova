const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  date: { type: Date, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  prepHoursNeeded: { type: Number, default: null } // optional; auto-estimated if not provided
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);