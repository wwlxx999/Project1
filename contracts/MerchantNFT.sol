// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./MerchantManager.sol";

/**
 * @title MerchantNFT
 * @dev 商户证书NFT合约，实现商户证书的铸造、验证、撤销和续期功能
 * 该合约基于ERC721标准，将商户证书表示为不可替代的代币
 */

// 自定义错误定义
/** @notice 证书错误，当证书操作失败时抛出 */
error CertificateError(uint256 tokenId, string reason);
/** @notice 验证错误，当输入验证失败时抛出 */
error ValidationError(string field, string reason);
/** @notice 计数器溢出错误，当计数器超过最大值时抛出 */
error CounterOverflow(string counter, uint256 value);

contract MerchantNFT is
    ERC721,
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard,
    Pausable
{
    MerchantManager public merchantManager; // 商户管理合约实例
    uint256 private _tokenIdCounter; // 令牌ID计数器
    string private constant CERTIFICATE_PREFIX = "MCHT"; // 证书编号前缀
    uint256 private _certificateCounter; // 证书计数器
    uint256 public constant VERSION = 1; // 合约版本
    uint256 public constant MAX_CERTIFICATE_COUNT = 9999; // 最大证书数量
    uint256 public constant MIN_VALIDITY_PERIOD = 30 days; // 最小有效期（30天）
    uint256 public constant MAX_VALIDITY_PERIOD = 365 days * 5; // 最大有效期（5年）

    /**
     * @dev 证书状态枚举
     * Valid: 有效
     * Expired: 过期
     * Revoked: 已撤销
     */
    enum CertificateStatus {
        Valid,
        Expired,
        Revoked
    }

    /**
     * @dev 证书结构体，存储证书的详细信息
     */
    struct Certificate {
        uint256 tokenId; // NFT令牌ID
        uint256 merchantId; // 商户ID
        uint256 issueDate; // 发行时间
        string certificateNumber; // 证书编号
        uint256 expiryDate; // 到期日期
        string ipfsHash; // IPFS哈希，指向证书元数据
        CertificateStatus status; // 证书状态
        string revokeReason; // 撤销原因
    }

    // 证书映射：tokenId => Certificate
    mapping(uint256 => Certificate) public certificates;

    // 事件定义
    event CertificateIssued(
        uint256 indexed tokenId,
        uint256 indexed merchantId,
        uint256 expiryDate
    ); // 证书发行事件
    event CertificateRevoked(uint256 indexed tokenId, string reason); // 证书撤销事件
    event CertificateExpired(uint256 indexed tokenId); // 证书过期事件
    event CertificateRenewed(uint256 indexed tokenId, uint256 newExpiryDate); // 证书续期事件
    event NFTMinted(uint256 indexed tokenId, uint256 indexed merchantId); // NFT铸造事件

    // 证书版本映射：tokenId => 版本号
    mapping(uint256 => uint256) private _certificateVersions;

    /**
     * @dev 构造函数，初始化合约
     * @param _merchantManager 商户管理合约地址
     */
    constructor(
        address _merchantManager
    ) ERC721("MerchantNFT", "MCHT") Ownable(msg.sender) {
        merchantManager = MerchantManager(_merchantManager);
    }

    /**
     * @dev 铸造商户NFT证书
     * @param merchantId 商户ID
     * @param ipfsHash IPFS哈希
     * @param validityPeriod 有效期（秒）
     * @return 新铸造的NFT的tokenId
     * 仅合约拥有者可以调用此函数铸造NFT证书
     */
    function mintMerchantNFT(
        uint256 merchantId, // 直接接收商户ID
        string memory ipfsHash,
        uint256 validityPeriod
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256) {
        // 验证商户是否存在
        MerchantManager.Merchant memory merchant = merchantManager.getMerchant(
            merchantId
        );
        if (merchant.owner == address(0)) {
            revert ValidationError("merchantId", "Merchant does not exist");
        }

        // 生成证书编号
        string memory certificateNumber = generateCertificateNumber();

        // 铸造NFT
        uint256 tokenId;
        tokenId = _tokenIdCounter++;
        _safeMint(merchant.owner, tokenId);

        // 使用 unchecked 块进行时间戳计算
        uint256 expiryDate;
        unchecked {
            expiryDate = block.timestamp + validityPeriod;
        }

        // 创建证书
        certificates[tokenId] = Certificate({
            tokenId: tokenId,
            merchantId: merchantId,
            certificateNumber: certificateNumber,
            issueDate: block.timestamp,
            expiryDate: expiryDate,
            ipfsHash: ipfsHash,
            status: CertificateStatus.Valid,
            revokeReason: ""
        });

        emit CertificateIssued(tokenId, merchantId, expiryDate);
        emit NFTMinted(tokenId, merchantId);

        // 版本记录
        _certificateVersions[tokenId] = VERSION;

        return tokenId;
    }

    /**
     * @dev 验证证书有效性
     * @param tokenId 证书令牌ID
     * @return isValid 是否有效
     * @return message 相关信息
     */
    function verifyCertificate(
        uint256 tokenId
    ) public view returns (bool, string memory) {
        _requireOwned(tokenId);
        Certificate memory cert = certificates[tokenId];

        if (cert.status == CertificateStatus.Revoked) {
            return (false, "Certificate has been revoked");
        }
        if (block.timestamp > cert.expiryDate) {
            return (false, "Certificate has expired");
        }
        return (true, "Certificate is valid");
    }

    /**
     * @dev 撤销证书
     * @param tokenId 证书令牌ID
     * @param reason 撤销原因
     * 仅合约拥有者可以调用此函数撤销证书
     */
    function revokeCertificate(
        uint256 tokenId,
        string memory reason
    ) external onlyOwner {
        _requireOwned(tokenId);
        require(
            certificates[tokenId].status == CertificateStatus.Valid,
            "Certificate is not valid"
        );

        certificates[tokenId].status = CertificateStatus.Revoked;
        certificates[tokenId].revokeReason = reason;

        emit CertificateRevoked(tokenId, reason);
    }

    /**
     * @dev 续期证书
     * @param tokenId 证书令牌ID
     * @param newValidityPeriod 新的有效期（秒）
     * 仅合约拥有者可以调用此函数续期证书
     */
    function renewCertificate(
        uint256 tokenId,
        uint256 newValidityPeriod
    ) external onlyOwner {
        _requireOwned(tokenId);
        require(
            certificates[tokenId].status != CertificateStatus.Revoked,
            "Cannot renew revoked certificate"
        );

        unchecked {
            certificates[tokenId].expiryDate =
                block.timestamp +
                newValidityPeriod;
        }
        certificates[tokenId].status = CertificateStatus.Valid;

        emit CertificateRenewed(tokenId, block.timestamp + newValidityPeriod);
    }

    /**
     * @dev 获取证书详细信息
     * @param tokenId 证书令牌ID
     * @return merchantId 商户ID
     * @return certificateNumber 证书编号
     * @return issueDate 发行时间
     * @return expiryDate 到期日期
     * @return ipfsHash IPFS哈希
     * @return status 证书状态
     * @return revokeReason 撤销原因
     */

    function getCertificateDetails(
        uint256 tokenId
    )
        public
        view
        returns (
            uint256 merchantId,
            string memory certificateNumber,
            uint256 issueDate,
            uint256 expiryDate,
            string memory ipfsHash,
            CertificateStatus status,
            string memory revokeReason
        )
    {
        _requireOwned(tokenId);
        Certificate memory cert = certificates[tokenId];
        return (
            cert.merchantId,
            cert.certificateNumber,
            cert.issueDate,
            cert.expiryDate,
            cert.ipfsHash,
            cert.status,
            cert.revokeReason
        );
    }

    /**
     * @dev 重写 tokenURI 函数，返回证书元数据URI
     * @param tokenId 证书令牌ID
     * @return 证书元数据URI
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        Certificate memory cert = certificates[tokenId];
        if (cert.status != CertificateStatus.Valid) {
            return ""; // 返回空字符串表示证书无效
        }
        MerchantManager.Merchant memory merchant = merchantManager.getMerchant(
            cert.merchantId
        );
        return merchant.metadataURI;
    }

    /**
     * @dev 生成证书编号
     * @return 新生成的证书编号
     * 内部函数，用于生成唯一的证书编号
     */
    function generateCertificateNumber() internal returns (string memory) {
        unchecked {
            if (_certificateCounter >= MAX_CERTIFICATE_COUNT) {
                revert CounterOverflow("certificate", _certificateCounter);
            }
            _certificateCounter++;
        }

        // 使用更精确的年份计算
        uint256 currentYear;
        unchecked {
            currentYear = 1970 + (block.timestamp / 365 days);
        }
        string memory yearStr = uintToString(currentYear % 100);

        // 优化序列号生成
        string memory sequenceStr = uintToPaddedString(_certificateCounter, 6);

        return
            string(
                abi.encodePacked(
                    CERTIFICATE_PREFIX,
                    "-",
                    yearStr,
                    "-",
                    sequenceStr
                )
            );
    }

    /**
     * @dev 将uint256转换为字符串
     * @param value 要转换的数值
     * @return 转换后的字符串
     * 内部纯函数，用于数值转字符串
     */
    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev 将uint256转换为固定长度的字符串
     * @param value 要转换的数值
     * @param length 字符串长度
     * @return 转换后的固定长度字符串
     * 内部纯函数，用于生成固定长度的数字字符串
     */
    function uintToPaddedString(
        uint256 value,
        uint256 length
    ) internal pure returns (string memory) {
        bytes memory buffer = new bytes(length);
        for (uint256 i = length; i > 0; i--) {
            buffer[i - 1] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev 更新证书状态
     * @param tokenId 证书令牌ID
     * 公共函数，用于更新证书状态（检查是否过期）
     */
    function updateCertificateStatus(uint256 tokenId) public {
        Certificate storage cert = certificates[tokenId];
        if (
            cert.status == CertificateStatus.Valid &&
            block.timestamp > cert.expiryDate
        ) {
            cert.status = CertificateStatus.Expired;
            emit CertificateExpired(tokenId);
        }
    }

    /**
     * @dev 重写 _update 函数，在转移前验证证书状态
     * @param to 接收者地址
     * @param tokenId 证书令牌ID
     * @param auth 授权地址
     * @return 前一个所有者地址
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        // 验证证书状态
        Certificate memory cert = certificates[tokenId];
        if (cert.status != CertificateStatus.Valid) {
            revert CertificateError(
                tokenId,
                "Cannot transfer invalid certificate"
            );
        }

        // 更新证书状态
        updateCertificateStatus(tokenId);

        // 调用父合约的实现
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev 重写 _increaseBalance 函数
     * @param account 账户地址
     * @param value 增加的数量
     */
    function _increaseBalance(
        address account,
        uint128 value
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev 重写 supportsInterface 函数
     * @param interfaceId 接口ID
     * @return 是否支持该接口
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 批量获取证书详细信息
     * @param tokenIds 证书令牌ID数组
     * @return 证书详细信息数组
     */
    function batchGetCertificateDetails(
        uint256[] calldata tokenIds
    ) external view returns (Certificate[] memory) {
        Certificate[] memory results = new Certificate[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _requireOwned(tokenIds[i]);
            results[i] = certificates[tokenIds[i]];
        }
        return results;
    }

    /**
     * @dev 暂停合约
     * 仅合约拥有者可以调用此函数暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约
     * 仅合约拥有者可以调用此函数恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 获取证书版本
     * @param tokenId 证书令牌ID
     * @return 证书版本
     */
    function getCertificateVersion(
        uint256 tokenId
    ) external view returns (uint256) {
        return _certificateVersions[tokenId];
    }

    /**
     * @dev 获取所有者的所有证书
     * @param owner 所有者地址
     * @return 证书令牌ID数组
     */
    function getCertificatesByOwner(
        address owner
    ) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            result[i] = tokenOfOwnerByIndex(owner, i);
        }
        return result;
    }

    /**
     * @dev 获取已铸造的NFT总数
     * @return 已铸造的NFT总数
     */
    function getTotalMintedNFTs() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
