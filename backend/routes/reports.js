const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { sendSupportEmail } = require('../services/emailService');

// Save a support message from the logged-in user, then email it to the StudyNova inbox
router.post('/', async (req, res) => {
  try {
    const { category, message, page, language, userAgent } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // The sender's identity comes from the verified login, not from the browser
    const email = req.firebaseUser.email || req.user.email;

    const report = await Report.create({
      userId: req.user._id,
      email: email ? String(email).slice(0, 200) : undefined,
      category: ['bug', 'question', 'idea'].includes(category) ? category : 'bug',
      message: String(message).trim().slice(0, 5000),
      page: page ? String(page).slice(0, 50) : undefined,
      language: language ? String(language).slice(0, 5) : undefined,
      userAgent: userAgent ? String(userAgent).slice(0, 300) : undefined,
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

module.exports = router;