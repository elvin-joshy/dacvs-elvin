/**
 * @file parserService.js
 * @description Extracts structured data (Name, Degree, Institution) from raw OCR text or filenames.
 */

/**
 * Parses raw OCR text to extract student name, degree, and institution.
 * Uses regex-based heuristic matching.
 * 
 * @param {string} text - The raw OCR text extracted from the document.
 * @param {string} [filename] - Optional filename to use as a fallback.
 * @returns {Object} Extracted fields { studentName, degree, institution }.
 */
function parseCertificateText(text, filename = '') {
  if (!text) text = '';

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  
  const result = {
    studentName: '',
    degree: '',
    institution: ''
  };

  // 1. Extract Student Name
  const nameMarkers = [
    /this is to certify that\s+([^,.\n]{2,50})/i,
    /presented to\s+([^,.\n]{2,50})/i,
    /awarded to\s+([^,.\n]{2,50})/i,
    /certifies that\s+([^,.\n]{2,50})/i,
    /hereby awarded to\s+([^,.\n]{2,50})/i,
    /student name\s*:\s*([^,.\n]{2,50})/i,
    /name\s*:\s*([^,.\n]{2,50})/i
  ];

  for (const regex of nameMarkers) {
    const match = text.match(regex);
    if (match && match[1]) {
      result.studentName = match[1].split(/\n/)[0].trim();
      break;
    }
  }

  // 2. Extract Institution - We do this BEFORE degree to avoid confusion
  const institutionKeywords = [
    'university', 'institute', 'college', 'academy', 'school', 'polytechnic', 
    'iit', 'nit', 'bits', 'iim', 'delhi', 'mumbai', 'kharagpur', 'kanpur', 'chennai',
    'mit', 'harvard', 'stanford', 'oxford', 'cambridge'
  ];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    // Don't pick the student name as the institution
    if (result.studentName && lowerLine.includes(result.studentName.toLowerCase())) continue;
    
    if (institutionKeywords.some(kw => lowerLine.includes(kw))) {
      result.institution = line;
      break;
    }
  }

  // 3. Extract Degree / Program / Workshop
  const degreeKeywords = [
    'bachelor', 'master', 'doctor', 'associate', 'diploma', 'bsc', 'msc', 'phd', 
    'engineering', 'arts', 'science', 'workshop', 'participation', 'course', 
    'completion', 'specialization', 'certification', 'training', 'fellowship',
    'b.tech', 'm.tech', 'b.a.', 'm.a.', 'postgraduate'
  ];
  const institutionMarkers = ['college', 'university', 'institute', 'academy', 'school'];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Safety check: If a line contains "College" or "University", it's likely an institution, not a degree name
    if (institutionMarkers.some(im => lowerLine.includes(im))) continue;
    if (result.studentName && lowerLine.includes(result.studentName.toLowerCase())) continue;
    if (result.institution && lowerLine.includes(result.institution.toLowerCase())) continue;

    if (degreeKeywords.some(kw => lowerLine.includes(kw))) {
      result.degree = line;
      break;
    }
  }

  // 4. Fallback to Filename Heuristics
  if (filename) {
    const cleanFilename = filename.replace(/\.(pdf|png|jpg|jpeg)$/i, '').replace(/[_-]/g, ' ');
    
    if (!result.studentName) {
      const nameMatch = cleanFilename.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      if (nameMatch) result.studentName = nameMatch[1];
    }

    if (!result.degree) {
      const lowerFile = cleanFilename.toLowerCase();
      if (lowerFile.includes('workshop')) result.degree = "Workshop Certificate";
      else if (lowerFile.includes('participation')) result.degree = "Participation Certificate";
      else if (lowerFile.includes('certificate')) result.degree = "Academic Certificate";
    }

    if (!result.institution) {
      const lowerFile = cleanFilename.toLowerCase();
      if (lowerFile.includes('iit')) result.institution = "IIT Delhi";
      else if (lowerFile.includes('delhi')) result.institution = "University established in Delhi";
      else if (lowerFile.includes('mit')) result.institution = "MIT";
    }
  }

  // 5. Final Cleanup: remove trailing punctuation
  Object.keys(result).forEach(key => {
    if (result[key]) {
      result[key] = result[key].replace(/^[\s,.:]+|[\s,.:]+$/g, '').trim();
    }
  });

  return result;
}

module.exports = {
  parseCertificateText
};
