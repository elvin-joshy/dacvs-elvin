const express = require('express');
const rateLimit = require('express-rate-limit');
const Credential = require('../models/Credential');
const blockchainService = require('../services/blockchainService');

const router = express.Router();

// 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

router.use(apiLimiter);

// GET /api/verify/:hash
router.get('/:hash', async (req, res, next) => {
  try {
    const defaultData = { isValid: false, isOnChain: false };
    
    // 1. Fetch from local DB
    const credential = await Credential.findOne({ credentialHash: req.params.hash })
      .select('-ocrText'); // Hide raw OCR text for public verification for privacy
    
    // 2. Fetch from Blockchain (Read-Only)
    const onChainResult = await blockchainService.verifyOnChain(req.params.hash);

    if (!credential && !onChainResult) {
      return res.status(404).json({ success: false, error: 'Credential completely unknown.' });
    }

    res.json({
      success: true,
      data: {
        dbRecord: credential || null,
        onChainRecord: onChainResult || null,
        status: {
          isRevoked: (credential?.isRevoked) || (onChainResult?.isRevoked) || false,
          isIssuedInDB: !!credential,
          isIssuedOnChain: !!(onChainResult && onChainResult.isValid)
        }
      }
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
