const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');

const analyzeDocument = async (fileBuffer, originalName, mimetype) => {
  try {
    const form = new FormData();
    // FormData requires a filename if passing a raw buffer
    form.append('file', fileBuffer, {
      filename: originalName || 'upload',
      contentType: mimetype
    });

    const response = await axios.post(`${env.flaskAiUrl}/analyze`, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    if (response.data) {
      return {
        fraudScore: response.data.fraud_score,
        ocrText: response.data.text
      };
    }
    
    throw new Error('Invalid response from AI engine');
  } catch (error) {
    if (error.response) {
      throw new Error(`AI Engine Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('AI Engine is unreachable');
    } else {
      throw new Error(`Error preparing AI analysis: ${error.message}`);
    }
  }
};

module.exports = {
  analyzeDocument
};
