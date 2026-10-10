const mongoose = require('mongoose');

// One flashcard practice session: how many cards the student knew on the first try
const quizResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Practice' },
  total: { type: Number, required: true, min: 1 },
  known: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('QuizResult', quizResultSchema);