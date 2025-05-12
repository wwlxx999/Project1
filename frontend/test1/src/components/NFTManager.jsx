import React, { useState, useEffect } from 'react';
import { getNFTContract } from './nftConnect';
import { getContract } from './contractConnect';

const NFTManager = () => {
    const [nftContract, setNFTContract] = useState(null);
    const [merchantContract, setMerchantContract] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 初始化合约连接
    useEffect(() => {
        const initContracts = async () => {
            try {
                const nftCont = await getNFTContract();
                const merchantCont = await getContract();
                setNFTContract(nftCont);
                setMerchantContract(merchantCont);
            } catch (err) {
                setError(err.message);
            }
        };
        initContracts();
    }, []);

    // 铸造NFT证书
    const mintCertificate = async (merchantId, ipfsHash, validityPeriod) => {
        try {
            setLoading(true);
            const tx = await nftContract.mintMerchantNFT(
                merchantId,
                ipfsHash,
                validityPeriod
            );
            await tx.wait();
            alert('证书铸造成功！');
        } catch (err) {
            setError(err.message);
            alert('证书铸造失败：' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 验证证书
    const verifyCertificate = async (tokenId) => {
        try {
            const [isValid, message] = await nftContract.verifyCertificate(tokenId);
            return { isValid, message };
        } catch (err) {
            setError(err.message);
            return { isValid: false, message: err.message };
        }
    };

    // 获取证书详情
    const getCertificateDetails = async (tokenId) => {
        try {
            const details = await nftContract.getCertificateDetails(tokenId);
            return details;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <div className="nft-manager">
            <h2>商户证书管理</h2>
            {error && <div className="error">{error}</div>}
            
            {/* 铸造证书表单 */}
            <div className="mint-form">
                <h3>铸造新证书</h3>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const merchantId = e.target.merchantId.value;
                    const ipfsHash = e.target.ipfsHash.value;
                    const validityPeriod = parseInt(e.target.validityPeriod.value) * 24 * 60 * 60; // 转换天数为秒
                    await mintCertificate(merchantId, ipfsHash, validityPeriod);
                }}>
                    <input type="number" name="merchantId" placeholder="商户ID" required />
                    <input type="text" name="ipfsHash" placeholder="IPFS哈希" required />
                    <input type="number" name="validityPeriod" placeholder="有效期(天)" required />
                    <button type="submit" disabled={loading}>
                        {loading ? '处理中...' : '铸造证书'}
                    </button>
                </form>
            </div>

            {/* 证书验证表单 */}
            <div className="verify-form">
                <h3>验证证书</h3>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const tokenId = e.target.tokenId.value;
                    const result = await verifyCertificate(tokenId);
                    alert(result.message);
                }}>
                    <input type="number" name="tokenId" placeholder="证书ID" required />
                    <button type="submit">验证证书</button>
                </form>
            </div>

            {/* 证书列表 */}
            <div className="certificates-list">
                <h3>我的证书</h3>
                {certificates.map((cert) => (
                    <div key={cert.tokenId} className="certificate-item">
                        <p>证书ID: {cert.tokenId}</p>
                        <p>商户ID: {cert.merchantId}</p>
                        <p>状态: {cert.status}</p>
                        <p>有效期至: {new Date(cert.expiryDate * 1000).toLocaleDateString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NFTManager;