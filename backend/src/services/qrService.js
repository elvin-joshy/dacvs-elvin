/**
 * @file qrService.js
 * @description Provides QR Code generation capabilities abstracting standard JSON strings into base64.
 */

const QRCode = require('qrcode');

/**
 * Generates a base64 encoded PNG representation of a payload directly.
 * 
 * @param {Object} payload - The structured JSON dictionary payload to embed.
 * @returns {Promise<string>} Base64 data URI string containing the QR code.
 */
async function generateCredentialQR(payload) {
  try {
    const jsonString = JSON.stringify(payload);
    // Return standard data string: data:image/png;base64,...
    const qrDataUrl = await QRCode.toDataURL(jsonString, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400
    });
    return qrDataUrl;
  } catch (err) {
    console.error("QR Generation Failed:", err);
    throw new Error('Failed to generate QR Code mapping');
  }
}

module.exports = {
  generateCredentialQR
};
