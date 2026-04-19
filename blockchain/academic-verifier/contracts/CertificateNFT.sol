// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title CertificateNFT
/// @author DACVS Team
/// @notice ERC-721 NFT contract for tokenising academic certificates.
///         Each token stores its metadata entirely on-chain — no IPFS dependency
///         for the core verification data. The `tokenURI` override returns a
///         Base64-encoded JSON metadata blob built from on-chain storage.
/// @dev    Inherits ERC721URIStorage for optional IPFS URI support and Ownable
///         to restrict minting to the deployer (university admin / DAO).
contract CertificateNFT is ERC721URIStorage, Ownable {

    /// @notice On-chain certificate payload attached to every minted token.
    struct Certificate {
        string studentName;
        string degree;
        string university;
        uint64 issueDate;    // Unix timestamp (UTC)
        bytes32 hash;        // SHA-256 hash of the source document
    }

    /// @notice tokenId → Certificate struct storage.
    mapping(uint256 => Certificate) private _certificates;

    /// @notice Ensures each document hash can only be minted once.
    mapping(bytes32 => bool) public hashUsed;

    /// @dev Auto-incrementing counter starting at 1.
    uint256 private _nextTokenId = 1;

    /// @notice Emitted whenever a new certificate NFT is minted.
    /// @param tokenId     Newly minted token identifier.
    /// @param to          Recipient address.
    /// @param studentName Name of the student on the credential.
    /// @param degree      Degree title string.
    /// @param university  Issuing university name.
    /// @param issueDate   Unix timestamp of issuance.
    /// @param hash        Document hash anchoring the physical credential.
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed to,
        string studentName,
        string degree,
        string university,
        uint64 issueDate,
        bytes32 hash
    );

    /// @dev OpenZeppelin v5 Ownable requires initial owner in constructor.
    constructor() ERC721("CertificateNFT", "CERT") Ownable(msg.sender) {}

    /// @notice Mints a new certificate NFT with on-chain metadata.
    /// @param to          Recipient wallet address.
    /// @param studentName Student's full name.
    /// @param degree      Degree title (e.g. "BSc Computer Science").
    /// @param university  Issuing university name.
    /// @param issueDate   Unix timestamp — must not be more than 1 hour in the future.
    /// @param hash        SHA-256 hash of the original document.
    /// @return tokenId    The newly minted token's ID.
    function mintCertificate(
        address to,
        string memory studentName,
        string memory degree,
        string memory university,
        uint64 issueDate,
        bytes32 hash
    ) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "Invalid recipient");
        require(!hashUsed[hash], "Hash already used");
        require(issueDate <= uint64(block.timestamp) + 1 hours, "Future issueDate");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _certificates[tokenId] = Certificate({
            studentName: studentName,
            degree: degree,
            university: university,
            issueDate: issueDate,
            hash: hash
        });

        hashUsed[hash] = true;

        emit CertificateMinted(tokenId, to, studentName, degree, university, issueDate, hash);
    }

    /// @notice Mints a certificate and assigns an IPFS URI in one transaction.
    /// @param to          Recipient wallet address.
    /// @param studentName Student's full name.
    /// @param degree      Degree title.
    /// @param university  University name.
    /// @param issueDate   Unix timestamp of issuance.
    /// @param hash        Document hash.
    /// @param uri         IPFS metadata URI (e.g. "ipfs://Qm...").
    /// @return tokenId    The newly minted token's ID.
    function mintCertificateWithURI(
        address to,
        string memory studentName,
        string memory degree,
        string memory university,
        uint64 issueDate,
        bytes32 hash,
        string memory uri
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = this.mintCertificate(to, studentName, degree, university, issueDate, hash);
        _setTokenURI(tokenId, uri);
    }

    /// @notice Updates the tokenURI for an existing token.
    /// @param tokenId  Token to update.
    /// @param uri      New metadata URI.
    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        require(ownerOf(tokenId) != address(0), "Nonexistent token");
        _setTokenURI(tokenId, uri);
    }

    /// @notice Returns certificate data as individual fields.
    /// @param tokenId  Token to query.
    /// @return studentName, degree, university, issueDate, hash
    function getCertificate(uint256 tokenId)
        external
        view
        returns (string memory, string memory, string memory, uint64, bytes32)
    {
        require(ownerOf(tokenId) != address(0), "Nonexistent token");
        Certificate storage c = _certificates[tokenId];
        return (c.studentName, c.degree, c.university, c.issueDate, c.hash);
    }

    /// @notice Returns the full Certificate struct (ethers v6 ABI-decodable).
    /// @param tokenId  Token to query.
    /// @return The Certificate struct.
    function certificateStruct(uint256 tokenId) external view returns (Certificate memory) {
        require(ownerOf(tokenId) != address(0), "Nonexistent token");
        return _certificates[tokenId];
    }

    /// @notice Alias for getCertificate — returns all on-chain metadata fields.
    /// @param tokenId  Token to query.
    /// @return studentName, degree, university, issueDate, hash
    function getTokenDetails(uint256 tokenId) external view returns (string memory, string memory, string memory, uint64, bytes32) {
        require(ownerOf(tokenId) != address(0), "Nonexistent token");
        Certificate memory c = _certificates[tokenId];
        return (c.studentName, c.degree, c.university, c.issueDate, c.hash);
    }

    /// @notice Returns the next token ID that will be assigned on mint.
    /// @return The upcoming token ID.
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Generates a fully on-chain Base64-encoded JSON metadata blob.
    /// @dev    Overrides ERC721URIStorage to build metadata from storage rather
    ///         than relying on an external URI. This makes the token self-describing.
    /// @param tokenId  Token to generate metadata for.
    /// @return A data URI containing the Base64-encoded JSON.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        require(ownerOf(tokenId) != address(0), "Nonexistent token");
        Certificate memory c = _certificates[tokenId];
        
        string memory json = string(
            abi.encodePacked(
                '{"name": "DACVS Certificate",',
                '"description": "Academic Credential on Ethereum",',
                '"studentName": "', c.studentName, '",',
                '"degree": "', c.degree, '",',
                '"university": "', c.university, '",',
                '"issueDate": "', Strings.toString(c.issueDate), '",',
                '"credentialHash": "', Strings.toHexString(uint256(c.hash), 32), '"}'
            )
        );
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    /// @notice ERC-165 interface detection override required by Solidity.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}