# 区块链商户认证系统

## 项目概述
本项目是一个基于区块链技术的商户认证系统，旨在提供去中心化的商户身份验证和管理解决方案。系统通过智能合约实现商户信息的提交、审核、更新和查询功能，并使用NFT技术为认证商户颁发数字证书。

## 技术架构
### 后端
- 智能合约 ：使用Solidity语言开发，部署在Sepolia测试网络上
  - MerchantManager.sol ：负责商户信息管理和审核流程
  - MerchantNFT.sol ：负责商户认证证书的铸造和管理
- 开发环境 ：Hardhat框架，支持合约编译、测试、部署和验证
### 前端
- 框架 ：React.js
- Web3交互 ：ethers.js
- 数据存储 ：IPFS (通过Pinata服务)

## 主要功能
### 商户管理
- 商户信息提交与审核
- 商户信息更新
- 商户信息查询
### 认证证书
- NFT证书铸造
- 证书查询与验证
### 管理员功能
- 商户审核
- 系统事件监控
- 数据统计
## 快速开始
### 环境准备
1. 安装Node.js和npm
2. 安装MetaMask钱包并配置Sepolia测试网络

后端部署
# 安装依赖
npm install

# 编译合约
npx hardhat compile

# 部署合约到Sepolia测试网
npx hardhat run scripts/deploy.js --network sepolia

# 验证合约
npx hardhat run scripts/verify.js --network sepolia

前端运行
# 进入前端目录
cd frontend/test1

# 安装依赖
npm install

# 启动开发服务器
npm start

## 配置说明
项目需要以下环境变量，请在根目录创建 .env 文件：
API_URL=<Infura或Alchemy的API URL>
PRIVATE_KEY=<部署合约的钱包私钥>
ETHERSCAN_API_KEY=<Etherscan API密钥>
PINATA_API_KEY=<Pinata API密钥>
PINATA_API_SECRET=<Pinata API密钥>
PINATA_JWT=<Pinata JWT令牌>

同时，需要在 frontend/test1/src/ 目录下创建 config.js 文件，包含以下内容：
// 合约地址和ABI配置
export const MERCHANT_MANAGER_ADDRESS = "<已部署的MerchantManager合约地址>";
export const MERCHANT_NFT_ADDRESS = "<已部署的MerchantNFT合约地址>";
export const MERCHANT_MANAGER_ABI = [...]; // MerchantManager合约ABI
export const MERCHANT_NFT_ABI = [...]; // MerchantNFT合约ABI

// Pinata配置
export const PINATA_CONFIG = {
  apiKey: "<Pinata API密钥>",
  apiSecret: "<Pinata API密钥>",
  gateway: "https://gateway.pinata.cloud/ipfs/"
};

## 贡献指南
1. Fork本仓库
2. 创建您的特性分支 ( git checkout -b feature/amazing-feature )
3. 提交您的更改 ( git commit -m 'Add some amazing feature' )
4. 推送到分支 ( git push origin feature/amazing-feature )
5. 打开Pull Request
## 许可证
本项目采用MIT许可证 - 详情请参见LICENSE文件。