const { getAuth } = require('firebase-admin/auth');
const User = require('../models/User');

// Checks the Firebase login token sent by the website ("Authorization: Bearer <token>").
// Sets req.firebaseUser (who is logged in) and req.user (their MongoDB profile, if it exists yet).
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    req.firebaseUser = await getAuth().verifyIdToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired login. Please log in again.' });
  }

  try {
    req.user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// For routes that need an existing StudyNova profile (everything except creating the profile)
function requireUser(req, res, next) {
  if (!req.user) return res.status(403).json({ error: 'User profile not found' });
  next();
}

module.exports = { requireAuth, requireUser };