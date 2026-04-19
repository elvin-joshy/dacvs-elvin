const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DACVS Blockchain Integration Tests", function () {
  let AcademicVerification;
  let CertificateNFT;
  let avConfig;
  let nftConfig;
  
  let owner;
  let institution;
  let student;
  let attacker;

  beforeEach(async function () {
    [owner, institution, student, attacker] = await ethers.getSigners();
    
    AcademicVerification = await ethers.getContractFactory("AcademicVerification");
    avConfig = await AcademicVerification.deploy();
    await avConfig.waitForDeployment();
    
    CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    nftConfig = await CertificateNFT.deploy();
    await nftConfig.waitForDeployment();
  });

  describe("AcademicVerification.sol", function () {
    const studentId = "STU-999";
    const institutionId = "INST-001";
    let hash1;
    let hash2;

    beforeEach(async function () {
      hash1 = ethers.keccak256(ethers.toUtf8Bytes("doc-1"));
      hash2 = ethers.keccak256(ethers.toUtf8Bytes("doc-2"));
      await avConfig.setInstitution(await institution.getAddress(), true);
    });

    it("should allow a whitelisted institution to issue a credential", async function () {
      await expect(avConfig.connect(institution).issueCredential(hash1, studentId, institutionId))
        .to.emit(avConfig, "CredentialIssued")
        .withArgs(hash1, studentId, institutionId, await institution.getAddress(), () => true);

      const cred = await avConfig.getCredential(hash1);
      expect(cred.studentId).to.equal(studentId);
      expect(cred.revoked).to.be.false;
    });

    it("should reject non-institution from issuing", async function () {
      await expect(
        avConfig.connect(attacker).issueCredential(hash1, studentId, institutionId)
      ).to.be.revertedWith("Not a registered institution");
    });

    it("should prevent duplicate hash issuance", async function () {
      await avConfig.connect(institution).issueCredential(hash1, studentId, institutionId);
      await expect(
        avConfig.connect(institution).issueCredential(hash1, studentId, institutionId)
      ).to.be.revertedWith("Already issued");
    });

    it("should revoke and output CredentialRevoked event with revokedBy parameter alias", async function () {
      await avConfig.connect(institution).issueCredential(hash1, studentId, institutionId);
      await expect(avConfig.connect(institution).revokeCredential(hash1))
        .to.emit(avConfig, "CredentialRevoked")
        .withArgs(hash1, await institution.getAddress(), () => true);

      const cred = await avConfig.getCredential(hash1);
      expect(cred.revoked).to.be.true;
    });

    it("should prevent revocation of non-existent credential", async function () {
      await expect(avConfig.connect(institution).revokeCredential(hash1)).to.be.revertedWith("Not issued");
    });

    it("should effectively use batchVerify", async function () {
      await avConfig.connect(institution).issueCredential(hash1, studentId, institutionId);
      await avConfig.connect(institution).issueCredential(hash2, studentId, institutionId);
      await avConfig.connect(institution).revokeCredential(hash2);

      const hash3 = ethers.keccak256(ethers.toUtf8Bytes("doc-3"));

      const results = await avConfig.batchVerify([hash1, hash2, hash3]);
      expect(results[0]).to.be.true;  // Issued and active
      expect(results[1]).to.be.false; // Revoked
      expect(results[2]).to.be.false; // Not issued
    });

    it("should safely use verifyCredential", async function () {
      await avConfig.connect(institution).issueCredential(hash1, studentId, institutionId);
      const res = await avConfig.verifyCredential(hash1);
      expect(res[0]).to.be.true;
      
      const resUnk = await avConfig.verifyCredential(hash2);
      expect(resUnk[0]).to.be.false;
    });
  });

  describe("CertificateNFT.sol", function () {
    let hash1;
    let now;

    beforeEach(async function () {
      hash1 = ethers.keccak256(ethers.toUtf8Bytes("nft-doc-1"));
      now = Math.floor(Date.now() / 1000);
    });

    it("should solely allow owner to mint and save getTokenDetails correctly", async function () {
      await expect(
        nftConfig.connect(attacker).mintCertificate(
          await student.getAddress(), "Alice", "BSc", "Uni", now, hash1
        )
      ).to.be.revertedWithCustomError(nftConfig, "OwnableUnauthorizedAccount");

      await nftConfig.connect(owner).mintCertificate(
        await student.getAddress(), "Alice", "BSc", "Uni", now, hash1
      );

      const details = await nftConfig.getTokenDetails(1);
      expect(details[0]).to.equal("Alice");
      expect(details[2]).to.equal("Uni");
      expect(details[4]).to.equal(hash1);
    });

    it("should prevent minting duplicate hashes", async function () {
      await nftConfig.connect(owner).mintCertificate(
        await student.getAddress(), "Alice", "BSc", "Uni", now, hash1
      );
      await expect(
        nftConfig.connect(owner).mintCertificate(
          await student.getAddress(), "Bob", "BA", "Uni2", now, hash1
        )
      ).to.be.revertedWith("Hash already used");
    });

    it("should render on-chain Base64 tokenURI properly", async function () {
      await nftConfig.connect(owner).mintCertificate(
        await student.getAddress(), "Alice", "BSc CS", "Demo University", now, hash1
      );

      const uri = await nftConfig.tokenURI(1);
      expect(uri).to.contain("data:application/json;base64,");

      const base64Str = uri.split(",")[1];
      const jsonStr = Buffer.from(base64Str, 'base64').toString("utf-8");
      
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).to.equal("DACVS Certificate");
      expect(parsed.studentName).to.equal("Alice");
      expect(parsed.degree).to.equal("BSc CS");
      expect(parsed.credentialHash).to.equal(hash1);
    });
  });
});
