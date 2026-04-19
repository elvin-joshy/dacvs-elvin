const { parseCertificateText } = require('./src/services/parserService');

const sampleText = `
UNIVERSITY OF OXFORD
This is to certify that
ALAN TURING
has been awarded the degree of
Bachelor of Science in Mathematics
on this day of 1934
`;

const result = parseCertificateText(sampleText);
console.log('Test Result:', JSON.stringify(result, null, 2));

const sample2 = `
Massachusetts Institute of Technology
Awarded to
Nikola Tesla
Degree: Engineering
`;
console.log('Test Result 2:', JSON.stringify(parseCertificateText(sample2), null, 2));
