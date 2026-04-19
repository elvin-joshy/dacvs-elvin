import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a professional font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Inter',
    backgroundColor: '#FFFFFF',
  },
  border: {
    border: '3pt solid #1a3a5c',
    padding: 40,
    height: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    borderBottom: '2pt solid #1a3a5c',
    paddingBottom: 20,
  },
  universityName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a3a5c',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginTop: 6,
    letterSpacing: 1,
  },
  certTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: '#2563EB',
    marginTop: 30,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  awardedTo: {
    textAlign: 'center',
    fontSize: 10,
    color: '#888888',
    marginTop: 25,
    letterSpacing: 1,
  },
  studentName: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 700,
    color: '#111111',
    marginTop: 8,
  },
  degreeText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#333333',
    marginTop: 16,
    lineHeight: 1.6,
  },
  dateText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#888888',
    marginTop: 24,
  },
  blockchainSection: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#f0f4ff',
    borderRadius: 4,
  },
  blockchainTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#2563EB',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hashText: {
    fontSize: 7,
    color: '#555555',
    fontFamily: 'Courier',
    marginBottom: 4,
  },
  verificationStatement: {
    fontSize: 8,
    color: '#1a3a5c',
    marginTop: 8,
    lineHeight: 1.5,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 7,
    color: '#AAAAAA',
  },
});

interface PDFCertificateProps {
  studentName: string;
  degree: string;
  institution: string;
  credentialHash: string;
  txHash?: string;
  issueDate?: string;
  tokenId?: number;
}

export default function PDFCertificate({
  studentName,
  degree,
  institution,
  credentialHash,
  txHash,
  issueDate,
  tokenId,
}: PDFCertificateProps) {
  const displayDate = issueDate
    ? new Date(issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const truncatedHash = credentialHash
    ? `${credentialHash.slice(0, 10)}...${credentialHash.slice(-8)}`
    : '';

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.header}>
            <Text style={styles.universityName}>{institution}</Text>
            <Text style={styles.subtitle}>Blockchain-Verified Academic Credential</Text>
          </View>

          <Text style={styles.certTitle}>Certificate of Achievement</Text>

          <Text style={styles.awardedTo}>THIS IS PROUDLY AWARDED TO</Text>
          <Text style={styles.studentName}>{studentName}</Text>

          <Text style={styles.degreeText}>
            For the successful completion of {degree}
          </Text>

          <Text style={styles.dateText}>Issued on {displayDate}</Text>

          <View style={styles.blockchainSection}>
            <Text style={styles.blockchainTitle}>Blockchain Verification</Text>
            <Text style={styles.hashText}>Credential Hash: {credentialHash}</Text>
            {txHash && <Text style={styles.hashText}>Transaction: {txHash}</Text>}
            {tokenId !== undefined && tokenId > 0 && (
              <Text style={styles.hashText}>NFT Token ID: {tokenId}</Text>
            )}
            <Text style={styles.verificationStatement}>
              This credential is permanently recorded on the Ethereum blockchain (Sepolia Testnet).
              It can be independently verified at https://dacvs.app/verify?hash={truncatedHash}
            </Text>
          </View>

          <Text style={styles.footer}>
            DACVS — Decentralized Academic Credential Verification System | Powered by Ethereum Smart Contracts
          </Text>
        </View>
      </Page>
    </Document>
  );
}
