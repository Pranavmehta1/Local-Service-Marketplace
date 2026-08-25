// Usage: router.get('/admin/overview', protect, requireRole('admin'), handler)
// Reads the role off req.user, which was set by auth.js from the verified
// JWT + DB lookup — a customer editing the URL to /api/admin/... still gets
// blocked here because their token's role can't be forged client-side.
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

module.exports = { requireRole };
