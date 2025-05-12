const { ethers } = require("hardhat");

// async function verifyContract(address, constructorArguments) {
//     console.log("开始验证合约...");
//     try {
//         await hre.run("verify:verify", {
//             address: address,
//             constructorArguments: constructorArguments || [],
//         });
//         console.log("合约验证成功！");
//     } catch (error) {
//         console.error("验证失败：", error.message);
//     }
// }

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 MerchantManager 合约
  // console.log("Deploying MerchantManager...");
  // const MerchantManager = await ethers.getContractFactory("MerchantManager");
  // const merchantManager = await MerchantManager.deploy();
  // await merchantManager.waitForDeployment();
  // console.log("MerchantManager deployed to:", merchantManager.target);

  // 部署 MerchantNFT 合约
  console.log("\nDeploying MerchantNFT...");
  const MerchantNFT = await ethers.getContractFactory("MerchantNFT");
  const merchantNFT = await MerchantNFT.deploy('0x209d80ef9D0399C2A990572Be59B2B35Dcb9d0a3');
  await merchantNFT.waitForDeployment();
  console.log("MerchantNFT deployed to:", merchantNFT.target);

  // 验证合约部署
  console.log("\nDeployment completed!");
  console.log("MerchantManager:", merchantManager.target);
  console.log("MerchantNFT:", merchantNFT.target);
     
    // 验证合约
    // console.log("\nVerifying contracts...");
    // await verifyContract(merchantManager.target, []);
    // await verifyContract(merchantNFT.target, [merchantManager.target]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });