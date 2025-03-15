// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerchantNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    mapping(uint256 => Merchant) public merchants;

    struct Merchant {
        string name;
        string description;
        string metadataURI;
        bool isActive;
    }

    event MerchantUpdated(uint256 indexed tokenId, string name);

    constructor() ERC721("MerchantNFT", "MCHT") 
                  Ownable(msg.sender)
    {}

    // 创建商户NFT（仅合约所有者可调用）
    function createMerchant(
        address to,
        string memory name,
        string memory description,
        string memory metadataURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        merchants[tokenId] = Merchant(name, description, metadataURI, true);
        return tokenId;
    }

    // 更新商户信息（仅NFT所有者可调用）
    function updateMerchant(
        uint256 tokenId,
        string memory newName,
        string memory newDescription
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        merchants[tokenId].name = newName;
        merchants[tokenId].description = newDescription;
        emit MerchantUpdated(tokenId, newName);
    }

    // 下架商户（软删除）
    function deactivateMerchant(uint256 tokenId) external onlyOwner {
        merchants[tokenId].isActive = false;
    }

    // 查询所有活跃商户
    function getAllActiveMerchants() external view returns (Merchant[] memory) {
        Merchant[] memory activeList = new Merchant[](_tokenIdCounter);
        uint256 count;
        for (uint256 i=0; i<_tokenIdCounter; i++) {
            if (merchants[i].isActive) {
                activeList[count] = merchants[i];
                count++;
            }
        }
        // 裁剪数组长度
        Merchant[] memory result = new Merchant[](count);
        for (uint256 i=0; i<count; i++) {
            result[i] = activeList[i];
        }
        return result;
    }
}