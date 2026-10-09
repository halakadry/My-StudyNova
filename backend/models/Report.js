const mongoose = require('mongoose');

// A problem report / question / suggestion sent from the "Contact support" form
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  category: { type: String, enum: ['bug', 'question', 'idea'], default: 'bug' },
  message: { type: String, required: true, maxlength: 5000 },
  page: { type: String },       // which tab the user was on
  language: { type: String },   // en / he / ar
  userAgent: { type: String },  // browser info, helps reproduce bugs
  status: { type: String, enum: ['new', 'in-progress', 'resolved'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);