const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 MerchantManager 合约
  console.log("Deploying MerchantManager...");
  const MerchantManager = await ethers.getContractFactory("MerchantManager");
  const merchantManager = await MerchantManager.deploy();
  await merchantManager.waitForDeployment();
  console.log("MerchantManager deployed to:", merchantManager.target);

  // 部署 MerchantNFT 合约
  console.log("\nDeploying MerchantNFT...");
  const MerchantNFT = await ethers.getContractFactory("MerchantNFT");
  const merchantNFT = await MerchantNFT.deploy(merchantManager.target);
  await merchantNFT.waitForDeployment();
  console.log("MerchantNFT deployed to:", merchantNFT.target);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });