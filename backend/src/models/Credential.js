const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true
  },
  degree: {
    type: String,
    required: true
  },
  institution: {
    type: String,
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  credentialHash: {
    type: String,
    required: true,
    unique: true
  },
  txHash: {
    type: String
  },
  tokenId: {
    type: String
  },
  fraudScore: {
    type: Number,
    required: true
  },
  ocrText: {
    type: String
  },
  ipfsHash: {
    type: String
  },
  qrCodeBase64: {
    type: String
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Credential', credentialSchema);
