const mongoose = require('mongoose');

// One message in the conversation (from the user or from StudyNova support)
const replySchema = new mongoose.Schema({
  from: { type: String, enum: ['user', 'support'], required: true },
  message: { type: String, required: true, maxlength: 5000 },
  authorEmail: { type: String }
}, { timestamps: true });

// A support conversation, started from the "Contact support" form
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  category: { type: String, enum: ['bug', 'question', 'idea'], default: 'bug' },
  message: { type: String, required: true, maxlength: 5000 },
  page: { type: String },       // which tab the user was on
  language: { type: String },   // en / he / ar
  userAgent: { type: String },  // browser info, helps reproduce bugs
  status: { type: String, enum: ['new', 'in-progress', 'resolved'], default: 'new' },
  replies: [replySchema],
  userUnread: { type: Boolean, default: false },    // the user has a support reply they haven't opened
  supportUnread: { type: Boolean, default: true }   // the team hasn't opened the latest user message
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);