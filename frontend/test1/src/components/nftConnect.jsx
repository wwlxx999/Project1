import { ethers } from "ethers";
import { BrowserProvider } from "ethers";
import { MERCHANT_NFT_ADDRESS, MERCHANT_NFT_ABI } from "../config";

// 获取合约实例的函数
export const getNFTContract = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask 未安装");
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    if (!signer) {
        throw new Error("无法获取签名者");
    }

    const contract = new ethers.Contract(MERCHANT_NFT_ADDRESS, MERCHANT_NFT_ABI, signer);
    return contract;
};