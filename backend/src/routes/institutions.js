const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const Institution = require('../models/Institution');
const User = require('../models/User');

const router = express.Router();

// POST /api/institutions/whitelist
router.post('/whitelist',
  verifyToken,
  requireRole('admin'),
  body('walletAddress').isString().notEmpty(),
  body('name').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const walletAddress = req.body.walletAddress.toLowerCase();
      
      let inst = await Institution.findOne({ walletAddress });
      if (inst) {
        return res.status(400).json({ success: false, error: 'Institution already whitelisted' });
      }

      inst = new Institution({
        name: req.body.name,
        walletAddress: walletAddress,
        isWhitelisted: true,
        addedByAdmin: req.user.walletAddress
      });

      await inst.save();

      // Upgrade existing user if they exist
      await User.updateOne(
        { walletAddress },
        { $set: { role: 'institution', isWhitelisted: true, name: req.body.name } }
      );

      res.json({ success: true, data: inst });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
