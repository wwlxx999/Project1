const { ethers } = require("hardhat");

// 延迟函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 验证单个合约
async function verifyContract(address, constructorArguments, retries = 3) {
    for (let i = 0; i < retries; i++) {
        console.log(`开始验证合约...（第 ${i + 1} 次尝试）`);
        try {
            await sleep(5000); // 等待 5 秒
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: constructorArguments || [],
            });
            console.log("合约验证成功！");
            return true;
        } catch (error) {
            console.error(`验证失败（第 ${i + 1} 次）：`, error.message);
            if (i < retries - 1) {
                console.log("等待 10 秒后重试...");
                await sleep(10000);
            }
        }
    }
    console.error("验证失败：已达到最大重试次数");
    return false;
}

// 验证所有合约
async function verifyContracts(contracts) {
    console.log("\n开始验证所有合约...");
    console.log("等待 30 秒后开始验证...");
    await sleep(30000);

    for (const contract of contracts) {
        console.log(`\n验证合约: ${contract.name}`);
        const success = await verifyContract(
            contract.address, 
            contract.constructorArguments
        );
        if (!success) {
            console.error(`${contract.name} 验证失败`);
        }
        await sleep(5000); // 合约验证之间等待 5 秒
    }
}

// 主函数
async function main() {
    const contracts = [
        // {
        //     name: "MerchantManager",
        //     address: "0x0385624DCEc36AfC7a340c3cc332a97BccdB3AF0",
        //     constructorArguments: []
        // },
        {
            name: "MerchantNFT",
            address: "0xe4Ee06826F8DA18eD31CF76F0df7F20Fc1383e0e",
            constructorArguments: ["0x209d80ef9D0399C2A990572Be59B2B35Dcb9d0a3"]
        }
    ];

    await verifyContracts(contracts);
}

// 运行脚本
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });