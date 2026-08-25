const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the Bearer token, loads the user, and attaches it to req.user.
// Every field on req.user comes from the DB record found via the token's
// id — never from anything the client sent in the request body/query.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (user.isSuspended) return res.status(403).json({ message: 'Account suspended' });

    req.user = user; // trusted, server-verified identity for this request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };
