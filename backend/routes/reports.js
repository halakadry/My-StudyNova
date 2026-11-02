const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { sendSupportEmail } = require('../services/emailService');
const { isAdmin, requireAdmin } = require('../middleware/admin');

// req.user / req.firebaseUser = the logged-in user (set in server.js)

function cleanText(text) {
  return String(text || '').trim().slice(0, 5000);
}

/* ---------- For every user ---------- */

// Is the logged-in user an admin? (shows the "Support inbox" tab)
router.get('/is-admin', (req, res) => {
  res.json({ isAdmin: isAdmin(req) });
});

// How many of my conversations have a reply I haven't opened
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Report.countDocuments({ userId: req.user._id, userUnread: true });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// My conversations, newest activity first
router.get('/mine', async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start a new conversation (the "Contact support" form), then email it to the StudyNova inbox
router.post('/', async (req, res) => {
  try {
    const { category, message, page, language, userAgent } = req.body;
    const text = cleanText(message);
    if (!text) return res.status(400).json({ error: 'Message is required' });

    const email = req.firebaseUser.email || req.user.email;

    const report = await Report.create({
      userId: req.user._id,
      email: email ? String(email).slice(0, 200) : undefined,
      category: ['bug', 'question', 'idea'].includes(category) ? category : 'bug',
      message: text,
      page: page ? String(page).slice(0, 50) : undefined,
      language: language ? String(language).slice(0, 5) : undefined,
      userAgent: userAgent ? String(userAgent).slice(0, 300) : undefined,
      supportUnread: true,
    });

    // The message is already saved in MongoDB, so an email problem never loses it
    try {
      await sendSupportEmail(report);
    } catch (emailErr) {
      console.error('Support email failed (message is still saved in MongoDB):', emailErr.message);
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// I reply in one of my own conversations
router.post('/:id/reply', async (req, res) => {
  try {
    const text = cleanText(req.body.message);
    if (!text) return res.status(400).json({ error: 'Message is required' });

    const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report) return res.status(404).json({ error: 'Conversation not found' });

    report.replies.push({ from: 'user', message: text, authorEmail: req.firebaseUser.email });
    report.supportUnread = true;
    if (report.status === 'resolved') report.status = 'new'; // reopened by the user
    await report.save();

    // Also email the team, so a follow-up is not missed
    try {
      await sendSupportEmail({ ...report.toObject(), message: `[Follow-up]\n\n${text}`, createdAt: new Date() });
    } catch (emailErr) {
      console.error('Support email failed (reply is still saved):', emailErr.message);
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// I opened one of my conversations -> no longer unread
router.post('/:id/read', async (req, res) => {
  try {
    await Report.updateOne({ _id: req.params.id, userId: req.user._id }, { userUnread: false });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Admins only (the StudyNova team) ---------- */

// All conversations, newest activity first
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find({}).sort({ updatedAt: -1 }).limit(200);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reply to a user (they see it in their "Messages" tab with a badge)
router.post('/admin/:id/reply', requireAdmin, async (req, res) => {
  try {
    const text = cleanText(req.body.message);
    if (!text) return res.status(400).json({ error: 'Message is required' });

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Conversation not found' });

    report.replies.push({ from: 'support', message: text, authorEmail: req.firebaseUser.email });
    report.userUnread = true;
    report.supportUnread = false;
    if (report.status === 'new') report.status = 'in-progress';
    await report.save();

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change status: new / in-progress / resolved
router.patch('/admin/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const update = { status };
    if (status === 'resolved') update.supportUnread = false;

    const report = await Report.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
    if (!report) return res.status(404).json({ error: 'Conversation not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The team opened a conversation -> no longer unread for the team
router.post('/admin/:id/read', requireAdmin, async (req, res) => {
  try {
    await Report.updateOne({ _id: req.params.id }, { supportUnread: false });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;