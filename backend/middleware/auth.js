const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Access denied.' });
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

const isAdmin = (req) => {
  return req.user && req.user.role === 'admin';
};

const findStudentForUser = (user) => {
  if (!user) return null;
  return user;
};

module.exports = { authenticateToken, requireRole, isAdmin, findStudentForUser };
