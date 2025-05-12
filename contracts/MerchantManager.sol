// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerchantManager
 * @dev 商户管理合约，负责商户的创建、更新、审核和管理
 * 该合约实现了商户信息的存储、商户审核流程和商户信誉管理
 */
contract MerchantManager is Ownable {
    /**
     * @dev 商户结构体，存储商户的基本信息
     */
    struct Merchant {
        string name; // 商户名称
        string description; // 商户描述
        string metadataURI; // 元数据URI，指向IPFS上的详细信息
        bool isActive; // 活跃状态，表示商户是否处于活跃状态
        uint256 reputationScore; // 信誉分数，表示商户的信誉评级
        address owner; // 所有者地址，关联到用户
        bool isApproved; // 审核状态，表示商户是否通过审核
    }

    Merchant[] public unapprovedMerchants; // 未审核商户列表
    mapping(uint256 => Merchant) public merchants; // 商户ID到商户信息的映射
    uint256 public _merchantCounter; // 商户ID计数器，用于生成唯一的商户ID

    // 事件定义
    event MerchantCreated(uint256 indexed merchantId, address indexed owner); // 商户创建事件
    event MerchantUpdated(uint256 indexed merchantId, string name); // 商户信息更新事件
    event ReputationUpdated(uint256 indexed merchantId, uint256 newScore); // 信誉分数更新事件
    event MerchantApproved(uint256 indexed merchantId, bool approved); // 商户审核事件
    event MerchantSubmitted(string name, string description, address owner); // 商户提交事件
    event MerchantDeactivated(
        uint256 indexed merchantId,
        string name,
        address indexed owner
    ); // 商户停用事件

    /**
     * @dev 构造函数，初始化合约
     * 继承自Ownable合约，设置部署者为合约拥有者
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev 提交商户到未审核列表
     * @param name 商户名称
     * @param description 商户描述
     * @param metadataURI 元数据URI
     * 任何用户都可以调用此函数提交商户信息，等待管理员审核
     */
    function submitMerchant(
        string memory name,
        string memory description,
        string memory metadataURI
    ) public {
        unapprovedMerchants.push(
            Merchant({
                name: name,
                description: description,
                metadataURI: metadataURI,
                isActive: false,
                reputationScore: 0,
                owner: msg.sender,
                isApproved: false
            })
        );

        emit MerchantSubmitted(name, description, msg.sender);
    }

    /**
     * @dev 创建商户
     * @param owner 商户所有者地址
     * @param name 商户名称
     * @param description 商户描述
     * @param metadataURI 元数据URI
     * @return 新创建的商户ID
     * 任何用户都可以调用此函数创建商户
     */
    function createMerchant(
        address owner,
        string memory name,
        string memory description,
        string memory metadataURI
    ) external returns (uint256) {
        uint256 merchantId = _merchantCounter++;
        merchants[merchantId] = Merchant(
            name,
            description,
            metadataURI,
            true,
            60,
            msg.sender,
            false
        );
        emit MerchantCreated(merchantId, owner);
        return merchantId;
    }

    /**
     * @dev 更新商户信息
     * @param merchantId 商户ID
     * @param newName 新的商户名称
     * @param newDescription 新的商户描述
     * 仅商户拥有者可以调用此函数更新商户信息
     */
    function updateMerchant(
        uint256 merchantId,
        string memory newName,
        string memory newDescription
    ) external {
        require(merchants[merchantId].owner == msg.sender, "Not owner");
        merchants[merchantId].name = newName;
        merchants[merchantId].description = newDescription;
        emit MerchantUpdated(merchantId, newName);
    }

    /**
     * @dev 更新商户信誉分数
     * @param merchantId 商户ID
     * @param newScore 新的信誉分数
     * 仅合约拥有者可以调用此函数更新商户信誉分数
     */
    function updateReputation(
        uint256 merchantId,
        uint256 newScore
    ) external onlyOwner {
        require(merchants[merchantId].isActive, "Merchant not active");
        merchants[merchantId].reputationScore = newScore;
        emit ReputationUpdated(merchantId, newScore);
    }

    /**
     * @dev 审核商户
     * @param index 未审核商户列表中的索引
     * @param approved 是否批准
     * 仅合约拥有者可以调用此函数审核商户
     */
    function approveMerchant(uint256 index, bool approved) external onlyOwner {
        require(index < unapprovedMerchants.length, "Invalid merchant index");

        Merchant memory merchant = unapprovedMerchants[index];

        if (approved) {
            uint256 merchantId = _merchantCounter++;
            merchants[merchantId] = Merchant(
                merchant.name,
                merchant.description,
                merchant.metadataURI,
                true, // isActive
                60, // reputationScore
                merchant.owner,
                true // isApproved
            );
            emit MerchantCreated(merchantId, merchant.owner);
        }

        _removeUnapprovedMerchant(index);
        emit MerchantApproved(index, approved);
    }

    /**
     * @dev 从未审核列表中删除商户
     * @param index 未审核商户列表中的索引
     * 内部函数，用于从未审核列表中删除商户
     */
    function _removeUnapprovedMerchant(uint256 index) internal {
        require(index < unapprovedMerchants.length, "Invalid index");

        // 将最后一个元素移到当前索引位置，然后删除最后一个元素
        unapprovedMerchants[index] = unapprovedMerchants[
            unapprovedMerchants.length - 1
        ];
        unapprovedMerchants.pop();
    }

    /**
     * @dev 获取未审核商户数量
     * @return 未审核商户数量
     */
    function getUnapprovedMerchantCount() external view returns (uint256) {
        return unapprovedMerchants.length;
    }

    /**
     * @dev 获取未审核商户信息
     * @param index 未审核商户列表中的索引
     * @return 未审核商户信息
     */
    function getUnapprovedMerchant(
        uint256 index
    ) external view returns (Merchant memory) {
        require(index < unapprovedMerchants.length, "Invalid index");
        return unapprovedMerchants[index];
    }

    /**
     * @dev 设置商户活跃状态
     * @param merchantId 商户ID
     * @param isActive 是否活跃
     * 仅商户拥有者可以调用此函数设置商户活跃状态
     */
    function setMerchantActiveStatus(
        uint256 merchantId,
        bool isActive
    ) external {
        require(merchants[merchantId].owner == msg.sender, "Not owner");
        merchants[merchantId].isActive = isActive;
    }

    /**
     * @dev 获取商户信息
     * @param merchantId 商户ID
     * @return 商户信息
     * 任何用户都可以调用此函数获取商户信息
     */
    function getMerchant(
        uint256 merchantId
    ) external view returns (Merchant memory) {
        return merchants[merchantId];
    }

    /**
     * @dev 下架商户
     * @param merchantId 商户ID
     * 仅合约拥有者可以调用此函数下架商户
     */
    function deactivateMerchant(uint256 merchantId) public onlyOwner {
        require(merchantId < _merchantCounter, "Invalid merchant ID");
        Merchant storage merchant = merchants[merchantId];
        require(merchant.isActive, "Merchant is already deactivated");

        merchant.isActive = false;
        emit MerchantDeactivated(merchantId, merchant.name, merchant.owner);
    }
}
