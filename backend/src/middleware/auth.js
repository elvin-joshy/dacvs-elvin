const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided, authorization denied' });
    }

    token = token.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Find user by walletAddress
    const user = await User.findOne({ walletAddress: decoded.walletAddress });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token, user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Token is not valid' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
