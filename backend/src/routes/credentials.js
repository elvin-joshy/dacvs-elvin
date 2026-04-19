const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { ethers } = require('ethers');

const { verifyToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const aiService = require('../services/aiService');
const blockchainService = require('../services/blockchainService');
const qrService = require('../services/qrService');
const parserService = require('../services/parserService');
const Credential = require('../models/Credential');

const router = express.Router();

/**
 * @route POST /api/credentials/analyze
 * @desc Uploads a document, extracts text, computes fraud score and cryptographic hash.
 * @access Private (Institution, Admin)
 */
router.post('/analyze',
  verifyToken,
  requireRole('institution', 'admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No document file provided' });
      }

      // 1. Call AI Engine
      const aiResult = await aiService.analyzeDocument(req.file.buffer, req.file.originalname, req.file.mimetype);

      if (aiResult.fraudScore >= 0.4) {
        return res.status(400).json({ 
          success: false, 
          error: 'Document failed fraud check', 
          fraudScore: aiResult.fraudScore 
        });
      }

      // 2. Hash the file locally to represent physical document
      const fileHashBuffer = crypto.createHash('sha256').update(req.file.buffer).digest();
      const bytes32Hash = '0x' + fileHashBuffer.toString('hex');

      // 3. Extract suggested fields from OCR text & filename
      const extractedData = parserService.parseCertificateText(aiResult.ocrText, req.file.originalname);
      console.log(`[AI Analysis] Extracted for auto-fill from ${req.file.originalname}:`, extractedData);

      // Return hashing details to frontend to finish minting 
      res.json({
        success: true,
        data: {
          credentialHash: bytes32Hash,
          fraudScore: aiResult.fraudScore,
          ocrText: aiResult.ocrText,
          // Support auto-fill by providing extracted suggestions
          suggestedData: extractedData
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/credentials/issue 
// Saves the finalized mined transactions to MongoDB
router.post('/issue',
  verifyToken,
  requireRole('institution', 'admin'),
  async (req, res, next) => {
    try {
      const { studentName, degree, institution, credentialHash, fraudScore, ocrText, txHashIssue, txHashMint, tokenId } = req.body;
      
      if (!credentialHash || !studentName) {
        return res.status(400).json({ success: false, error: 'Incomplete credential record' });
      }

      // Generate Dynamic QR Image Base64 Data URI
      const verifyPayload = {
        hash: credentialHash,
        verifyUrl: `https://dacvs.app/verify?hash=${credentialHash}`,
        txHash: txHashMint || txHashIssue,
        issuedAt: new Date().toISOString()
      };
      const qrDataUrl = await qrService.generateCredentialQR(verifyPayload);

      // Save to MongoDB
      const credential = new Credential({
        studentName,
        degree,
        institution,
        walletAddress: req.user.walletAddress,
        credentialHash,
        fraudScore,
        ocrText,
        txHash: txHashMint || txHashIssue,
        tokenId,
        qrCodeBase64: qrDataUrl
      });

      await credential.save();

      res.json({ success: true, data: credential });

    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, error: 'This exact document has already been issued via Hash conflict' });
      }
      next(err);
    }
  }
);

// GET /api/credentials/institution/:address
router.get('/institution/:address',
  verifyToken,
  async (req, res, next) => {
    try {
      const address = req.params.address.toLowerCase();
      const credentials = await Credential.find({ walletAddress: address }).sort({ issuedAt: -1 });
      res.json({ success: true, data: credentials });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /api/credentials/:hash
 * @desc Returns full metadata of an issued credential.
 * @access Private
 */
router.get('/:hash',
  verifyToken,
  async (req, res, next) => {
    try {
      const credential = await Credential.findOne({ credentialHash: req.params.hash });
      if (!credential) return res.status(404).json({ success: false, error: 'Credential not found in local DB' });

      res.json({ success: true, data: credential });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /api/credentials/:hash/qr
 * @desc Exposes the base64 QR payload mapping of the credential directly.
 * @access Public
 */
router.get('/:hash/qr', async (req, res, next) => {
  try {
    const credential = await Credential.findOne({ credentialHash: req.params.hash });
    if (!credential || !credential.qrCodeBase64) {
      return res.status(404).json({ success: false, error: 'QR Code not found' });
    }
    res.json({ success: true, qrCodeBase64: credential.qrCodeBase64 });
  } catch (err) {
    next(err);
  }
});

// POST /api/credentials/revoke/:hash
router.post('/revoke/:hash',
  verifyToken,
  requireRole('institution', 'admin'),
  async (req, res, next) => {
    try {
      const credential = await Credential.findOne({ credentialHash: req.params.hash });
      
      if (!credential) return res.status(404).json({ success: false, error: 'Not found' });

      // Ensure the institution revoking is the one who issued it
      if (req.user.role !== 'admin' && credential.walletAddress !== req.user.walletAddress) {
        return res.status(403).json({ success: false, error: 'Cannot revoke a credential you did not issue' });
      }

      credential.isRevoked = true;
      // Optional: txHash passed from frontend confirming the on-chain revocation
      if (req.body.txHash) {
        credential.txHash = req.body.txHash;
      }
      
      await credential.save();
      
      res.json({ success: true, data: credential });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
