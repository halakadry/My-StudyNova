// Admins = the login emails listed in ADMIN_EMAILS (comma-separated), e.g. in .env and Render
function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isAdmin(req) {
  const email = (req.firebaseUser?.email || '').toLowerCase();
  return Boolean(email) && adminEmails().includes(email);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admins only' });
  next();
}

module.exports = { isAdmin, requireAdmin };