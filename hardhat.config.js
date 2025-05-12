require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
const { 
  API_URL, 
  PRIVATE_KEY,
  ETHERSCAN_API_KEY, 
  PINATA_API_KEY,
  PINATA_API_SECRET,
  PINATA_JWT
} = process.env;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    sepolia: {
      url: API_URL ,
      accounts: [PRIVATE_KEY],
      timeout: 600000,
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.
        ETHERSCAN_API_KEY ,
    }
  },
  // 添加PINATA配置，可用于部署脚本或测试
  pinata: {
    apiKey: PINATA_API_KEY,
    apiSecret: PINATA_API_SECRET,
    jwt: PINATA_JWT
  }
};
