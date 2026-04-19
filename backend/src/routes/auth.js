const express = require('express');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Institution = require('../models/Institution');
const env = require('../config/env');

const router = express.Router();

// POST /api/auth/nonce
router.post('/nonce',
  body('walletAddress').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const walletAddress = req.body.walletAddress.toLowerCase();
      let user = await User.findOne({ walletAddress });

      if (!user) {
        // Create new user (default verifier role, not whitelisted)
        // Check if this wallet exists in Institution to auto-whitelist or set role
        const inst = await Institution.findOne({ walletAddress });
        user = new User({
          walletAddress,
          role: inst ? 'institution' : 'verifier',
          isWhitelisted: !!inst
        });
      } else {
        // rotate nonce
        user.nonce = Math.floor(Math.random() * 1000000).toString();
      }
      
      await user.save();
      
      res.json({ success: true, nonce: user.nonce });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/verify
router.post('/verify',
  body('walletAddress').isString().notEmpty(),
  body('signature').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const walletAddress = req.body.walletAddress.toLowerCase();
      const signature = req.body.signature;

      const user = await User.findOne({ walletAddress });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found, request nonce first' });
      }

      // Recreate the message that was signed
      const message = `Sign this message to authenticate with DACVS. Nonce: ${user.nonce}`;
      
      let recoveredAddress;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch (err) {
        return res.status(400).json({ success: false, error: 'Invalid signature format' });
      }

      if (recoveredAddress.toLowerCase() !== walletAddress) {
        return res.status(401).json({ success: false, error: 'Signature verification failed' });
      }

      // Rotate nonce after successful login
      user.nonce = Math.floor(Math.random() * 1000000).toString();
      await user.save();

      const payload = {
        walletAddress: user.walletAddress,
        role: user.role
      };

      const token = jwt.sign(payload, env.jwtSecret, { expiresIn: '1d' });

      res.json({
        success: true,
        token,
        user: {
          walletAddress: user.walletAddress,
          role: user.role,
          name: user.name,
          isWhitelisted: user.isWhitelisted
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
