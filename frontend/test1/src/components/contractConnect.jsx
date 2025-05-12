import { ethers } from "ethers";
import { BrowserProvider } from "ethers";
import { MERCHANT_MANAGER_ADDRESS, MERCHANT_MANAGER_ABI }from '../config'

// 获取合约实例的函数
export const getContract = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask 未安装");
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new BrowserProvider(window.ethereum); // 使用 ethers.js 的 BrowserProvider
    const signer = await provider.getSigner();

    if (!signer) {
        throw new Error("无法获取签名者 (signer)");
    }

    console.log("Signer Address:", await signer.getAddress()); // 调试日志
    const contract = new ethers.Contract(MERCHANT_MANAGER_ADDRESS, MERCHANT_MANAGER_ABI, signer);
    return contract;
};