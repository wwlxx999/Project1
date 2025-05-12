import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getContract } from './contractConnect';
import { getNFTContract } from './nftConnect';
import { MERCHANT_NFT_ADDRESS } from '../config';
import './MerchantDetail.css';

const MerchantDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [merchant, setMerchant] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [txMessage, setTxMessage] = useState(null);
    const [currentAccount, setCurrentAccount] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [certificates, setCertificates] = useState([]); // 改为存储证书列表
    const [showCertificateModal, setShowCertificateModal] = useState(false);
    const [hasCertificate, setHasCertificate] = useState(false);  // 标记商户是否有证书
    const [loadingCertificate, setLoadingCertificate] = useState(false);  // 加载证书状态
    const [selectedCertificate, setSelectedCertificate] = useState(null); // 当前选中的证书
    // 获取商户证书函数
    const fetchMerchantCertificates = async () => {
        try {
            setLoadingCertificate(true);
            const nftContract = await getNFTContract();
            if (!nftContract) {
                throw new Error("获取NFT合约实例失败");
            }

            if (merchant && merchant.owner) {
                const tokenIds = await nftContract.getCertificatesByOwner(merchant.owner);

                if (tokenIds && tokenIds.length > 0) {
                    const certificatesList = [];

                    // 遍历所有证书，找出属于当前商户的证书
                    for (let i = 0; i < tokenIds.length; i++) {
                        const certDetails = await nftContract.getCertificateDetails(tokenIds[i]);
                        if (certDetails && certDetails.merchantId && certDetails.merchantId.toString() === id) {
                            // 格式化证书状态
                            const statusMap = ["有效", "已过期", "已撤销"];
                            const status = statusMap[certDetails.status] || "未知";

                            // 格式化时间戳
                            const issueDate = new Date(Number(certDetails.issueDate) * 1000).toLocaleString();
                            const expiryDate = new Date(Number(certDetails.expiryDate) * 1000).toLocaleString();

                            certificatesList.push({
                                tokenId: tokenIds[i],
                                merchantId: certDetails.merchantId.toString(),
                                certificateNumber: certDetails.certificateNumber,
                                issueDate,
                                expiryDate,
                                ipfsHash: certDetails.ipfsHash,
                                status,
                                revokeReason: certDetails.revokeReason
                            });
                        }
                    }

                    // 按发行时间降序排序
                    certificatesList.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

                    setCertificates(certificatesList);
                    setHasCertificate(certificatesList.length > 0);
                    // 默认选中最新的证书
                    if (certificatesList.length > 0) {
                        setSelectedCertificate(certificatesList[0]);
                    }
                    return;
                }
            }

            // 如果没有找到证书
            setCertificates([]);
            setHasCertificate(false);
            setSelectedCertificate(null);
        } catch (error) {
            console.error("获取商户证书失败:", error);
            setCertificates([]);
            setHasCertificate(false);
            setSelectedCertificate(null);
        } finally {
            setLoadingCertificate(false);
        }
    };

    // 显示证书详情
    // 显示证书详情
    const showCertificateDetails = () => {
        if (certificates.length > 0) {
            console.log("使用现有证书:", certificates); // 打印现有证书
            setShowCertificateModal(true);
        } else {
            setTxMessage({
                type: 'info',
                content: '正在获取证书信息...'
            });
            fetchMerchantCertificates().then(() => {
                if (certificates.length > 0) {
                    console.log("证书详情:", certificates); // 打印证书详情到控制台
                    setShowCertificateModal(true);
                } else {
                    setTxMessage({
                        type: 'error',
                        content: '未找到该商户的证书'
                    });
                }
            });
        }
    };

    // 在组件加载时检查商户是否有证书
    useEffect(() => {
        if (merchant && merchant.isApproved) {
            fetchMerchantCertificates();
        }
    }, [merchant]);

    // 添加地址格式化函数
    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 20)}...${address.slice(-10)}`;
    };

    // 添加铸造NFT证书函数
    const mintNFTCertificate = async () => {
        try {
            setIsLoading(true);
            // 检查商户是否已审核通过
            if (!merchant.isApproved) {
                throw new Error("商户未通过审核，无法铸造证书");
            }

            setTxMessage({ type: 'info', content: '准备铸造NFT证书...' });

            // 直接使用getNFTContract函数获取NFT合约实例
            const nftContract = await getNFTContract();
            if (!nftContract) {
                throw new Error("获取NFT合约实例失败");
            }

            
            // 检查是否已有证书，如果有则需要先获取所有证书
            if (certificates.length === 0) {
                await fetchMerchantCertificates();
            }

            // 如果有旧证书，提示用户将使旧证书失效
            if (certificates.length > 0) {
                setTxMessage({ 
                    type: 'info', 
                    content: '该商户已有证书，铸造新证书将使旧证书失效。正在继续...' 
                });
            }
            // 设置铸造参数
            const merchantId = id; // 商户ID
            const ipfsHash = merchant.metadataURI || "https://ipfs.io/ipfs/QmDefaultHash"; // 使用商户的metadata或默认值
            const validityPeriod = 31536000; // 一年有效期（以秒为单位）

            // 打印铸造参数到控制台
            console.log("铸造参数:", {
                merchantId,
                ipfsHash,
                validityPeriod
            });

            setTxMessage({ type: 'info', content: '正在发送交易...' });
            // 发送铸造交易
            console.log("发送铸造交易...");
            const tx = await nftContract.mintMerchantNFT(merchantId, ipfsHash, validityPeriod);
            console.log("交易已提交，等待确认...");
            setTxMessage({ type: 'info', content: '交易已提交，等待确认...' });
            // 等待交易确认
            const receipt = await tx.wait();

            // 解析事件找到tokenId
            const { ethers } = await import('ethers');
            const certificateIssuedEvent = receipt.logs
                .filter(log => log.topics[0] === ethers.id("CertificateIssued(uint256,uint256,uint256)"))
                .map(log => {
                    // 从topics中获取tokenId和merchantId（因为它们是indexed参数）
                    const tokenId = parseInt(log.topics[1], 16);
                    const merchantId = parseInt(log.topics[2], 16);
                    console.log("事件主题:", log.topics);
                    console.log("事件数据:", log.data);
                    // 从data中只解码expiryDate
                    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                        ["uint256"],
                        log.data
                    );
                    const expiryDate = decoded[0];

                    return {
                        tokenId,
                        merchantId,
                        expiryDate
                    };
                })[0];

            const tokenId = certificateIssuedEvent?.tokenId;

            // 获取证书详情
            if (tokenId) {
                const certDetails = await nftContract.getCertificateDetails(tokenId);

                // 格式化证书状态
                const statusMap = ["有效", "已过期", "已撤销"];
                const status = statusMap[certDetails.status] || "未知";

                // 格式化时间戳
                const issueDate = new Date(Number(certDetails.issueDate) * 1000).toLocaleString();
                const expiryDate = new Date(Number(certDetails.expiryDate) * 1000).toLocaleString();

                const newCertificate = {
                    tokenId,
                    merchantId: certDetails.merchantId.toString(),
                    certificateNumber: certDetails.certificateNumber,
                    issueDate,
                    expiryDate,
                    ipfsHash: certDetails.ipfsHash,
                    status,
                    revokeReason: certDetails.revokeReason
                };

                // 撤销旧证书
                if (certificates.length > 0) {
                    setTxMessage({ 
                        type: 'info', 
                        content: '新证书铸造成功，正在撤销旧证书...' 
                    });
                    
                    // 遍历所有旧证书并撤销
                    for (const oldCert of certificates) {
                        // 只撤销状态为"有效"的证书
                        if (oldCert.status === "有效") {
                            try {
                                console.log(`正在撤销证书 ID: ${oldCert.tokenId}`);
                                const revokeTx = await nftContract.revokeCertificate(
                                    oldCert.tokenId, 
                                    "已被新证书替代"
                                );
                                await revokeTx.wait();
                                console.log(`证书 ID: ${oldCert.tokenId} 已成功撤销`);
                            } catch (revokeError) {
                                console.error(`撤销证书 ${oldCert.tokenId} 失败:`, revokeError);
                            }
                        }
                    }
                }

                // 更新旧证书状态为"已撤销"
                const updatedCertificates = certificates.map(cert => ({
                    ...cert,
                    status: "已撤销",
                    revokeReason: "已被新证书替代"
                }));
                
                // 将新证书添加到列表最前面
                setCertificates([newCertificate, ...updatedCertificates]);
                setSelectedCertificate(newCertificate);
                setHasCertificate(true);
                setShowCertificateModal(true);
            }

            setTxMessage({
                type: 'success',
                content: `NFT证书铸造成功！Token ID: ${tokenId}`
            });

            // 重新获取所有证书以确保状态正确
            await fetchMerchantCertificates();

        } catch (error) {
            console.error("铸造NFT证书失败:", error);
            setTxMessage({
                type: 'error',
                content: `铸造失败: ${error.message || error}`
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 检查当前用户是否是商户所有者
    const checkOwnership = async () => {
        try {
            if (!window.ethereum || !merchant) return;

            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                const userAccount = accounts[0].toLowerCase();
                setCurrentAccount(userAccount);
                setIsOwner(userAccount === merchant.owner.toLowerCase());
            }
        } catch (error) {
            console.error("检查所有权失败:", error);
        }
    };

    useEffect(() => {
        const fetchMerchantDetails = async () => {
            try {
                // 获取合约实例
                const contract = await getContract();
                if (!contract) {
                    throw new Error("获取合约实例失败");
                }

                // 获取 provider
                const provider = contract.runner?.provider ?? contract.runner;
                if (!provider) {
                    throw new Error("获取 provider 失败");
                }

                // 获取商户数据
                const merchantData = await contract.getMerchant(id);
                if (!merchantData) {
                    throw new Error("未找到商户数据");
                }

                // 定义事件过滤器
                const filter = {
                    address: contract.target,
                    fromBlock: 0n,  // 使用 BigInt
                    toBlock: "latest"
                };

                // 获取创建事件和审核事件的日志
                try {
                    // 使用合约的 queryFilter 方法
                    const createFilter = contract.filters.MerchantCreated(id);
                    const approveFilter = contract.filters.MerchantApproved(id);

                    const [createLogs, approveLogs] = await Promise.all([
                        contract.queryFilter(createFilter),
                        contract.queryFilter(approveFilter)
                    ]);
                    console.log("createLogs:", createLogs);
                    console.log("approveLogs:", approveLogs);

                    // 获取创建时间 - 修改这部分代码
                    let creationTime = "未知";
                    let approver = createLogs[0]?.args?.owner || merchantData.owner || "未知";
                    if (createLogs[0]) {
                        // 使用 provider.getBlock() 的新方式
                        const blockNumber = createLogs[0].blockNumber;
                        const block = await provider.getBlock(blockNumber);
                        // 注意：时间戳现在是 BigInt，需要转换
                        creationTime = block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "未知";
                    }
                    if (createLogs[0]?.transactionHash) {
                        try {
                            const tx = await provider.getTransaction(createLogs[0].transactionHash);
                            approver = tx?.from || approver;
                        } catch (e) {
                            // 保持默认 approver
                        }
                    }

                    // 设置商户数据
                    setMerchant({
                        id: id,
                        name: merchantData.name || "未知",
                        description: merchantData.description || "暂无描述",
                        metadataURI: merchantData.metadataURI || "",
                        isActive: merchantData.isActive || false,
                        reputationScore: (merchantData.reputationScore?.toString()) || "0",
                        owner: merchantData.owner || "未知",
                        isApproved: merchantData.isApproved || false,
                        // 更新事件相关数据
                        creationBlock: createLogs[0]?.blockNumber?.toString() || "未知",
                        creationTime: creationTime,
                        creationTx: createLogs[0]?.transactionHash || "未知",
                        approver, // 创建交易发起人
                        approvalBlock: createLogs[0]?.blockNumber?.toString() || "未知",      // 创建区块高度
                        approvalTx: createLogs[0]?.transactionHash || "未知"                 // 创建交易哈希
                    });

                } catch (error) {
                    console.error("获取事件日志失败:", error);
                    // 即使获取事件失败，也设置基本商户数据
                    setMerchant({
                        id: id,
                        name: merchantData.name || "未知",
                        description: merchantData.description || "暂无描述",
                        metadataURI: merchantData.metadataURI || "",
                        isActive: merchantData.isActive || false,
                        reputationScore: (merchantData.reputationScore?.toString()) || "0",
                        owner: merchantData.owner || "未知",
                        isApproved: merchantData.isApproved || false
                    });
                }

            } catch (error) {
                console.error("获取商户详情失败:", error);
            }
        };

        fetchMerchantDetails();
    }, [id]);

    // 当商户数据加载完成后检查所有权
    useEffect(() => {
        if (merchant) {
            checkOwnership();
        }
    }, [merchant]);

    // 添加MetaMask账户变更监听
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setCurrentAccount(accounts[0].toLowerCase());
                    if (merchant) {
                        setIsOwner(accounts[0].toLowerCase() === merchant.owner.toLowerCase());
                    }
                } else {
                    setCurrentAccount('');
                    setIsOwner(false);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, [merchant]);

    if (!merchant) {
        return <div className="loading">加载中...</div>;

    }


    return (
        <div className="merchant-detail-container">
            <nav className="detail-nav">
                <button
                    className="back-button"
                    onClick={() => navigate('/')}
                >
                    <i className="fas fa-arrow-left"></i>
                    返回首页
                </button>
            </nav>
            <div className="merchant-detail-card">
                <div className="merchant-detail-info">
                    <div className="merchant-buttons">
                        <button
                            className="view-license-btn"
                            onClick={() => setShowImageModal(true)}
                        >
                            <i className="fas fa-id-card"></i>
                            查看经营许可证
                        </button>

                        {/* 修改：所有人都可以看到铸造按钮，只要商户已审核通过 */}
                        {merchant.isApproved && (
                            <button
                                className="mint-nft-btn"
                                onClick={mintNFTCertificate}
                                disabled={isLoading}
                            >
                                <i className="fas fa-certificate"></i>
                                {isLoading ? '处理中...' : '铸造NFT证书'}
                            </button>
                        )}

                        {/* 新增：查看证书按钮 */}
                        {merchant.isApproved && (
                            <button
                                className="view-certificate-btn"
                                onClick={showCertificateDetails}
                                disabled={loadingCertificate}
                            >
                                <i className="fas fa-award"></i>
                                {loadingCertificate ? '加载中...' : '查看数字证书'}
                            </button>
                        )}
                    </div>

                    {/* 交易信息显示 */}
                    {txMessage && (
                        <div className={`tx-message ${txMessage.type}`}>
                            <i className={`fas fa-${txMessage.type === 'success' ? 'check-circle' : txMessage.type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
                            {txMessage.content}
                            {txMessage.type === 'success' && (
                                <button
                                    className="close-message"
                                    onClick={() => setTxMessage(null)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    <div className="info-left">
                        <h1>{merchant.name}</h1>
                        <p className="description">{merchant.description}</p>
                    </div>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="label">商户ID:</span>
                            <span>{merchant.id}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">所有者:</span>
                            <span title={merchant.owner}>{formatAddress(merchant.owner)}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">状态:</span>
                            <span>{merchant.isActive ? "活跃" : "非活跃"}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">信誉积分:</span>
                            <span>{merchant.reputationScore}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">审核状态:</span>
                            <span>{merchant.isApproved ? "审核通过" : "未审核"}</span>
                        </div>
                        <div className="info-item blockchain-info">
                            <span className="label">创建区块:</span>
                            <span className="block-number">
                                <i className="fas fa-cube"></i>
                                {merchant.creationBlock}
                            </span>
                        </div>

                        <div className="info-item blockchain-info">
                            <span className="label">创建时间:</span>
                            <span>
                                <i className="fas fa-clock"></i>
                                {merchant.creationTime}
                            </span>
                        </div>

                        <div className="info-item blockchain-info">
                            <span className="label">创建交易:</span>
                            <a
                                href={`https://sepolia.etherscan.io/tx/${merchant.creationTx}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tx-hash"
                                title={merchant.creationTx}
                            >
                                <i className="fas fa-external-link-alt"></i>
                                {`${merchant.creationTx.slice(0, 8)}...${merchant.creationTx.slice(-6)}`}
                            </a>
                        </div>

                        <div className="info-item blockchain-info">
                            <span className="label">审核人:</span>
                            <span title={merchant.approver}>
                                <i className="fas fa-user-shield"></i>
                                {formatAddress(merchant.approver)}
                            </span>
                        </div>

                        <div className="info-item blockchain-info">
                            <span className="label">审核区块:</span>
                            <span className="block-number">
                                <i className="fas fa-cube"></i>
                                {merchant.approvalBlock}
                            </span>
                        </div>

                        <div className="info-item blockchain-info">
                            <span className="label">审核交易:</span>
                            <a
                                href={`https://sepolia.etherscan.io/tx/${merchant.approvalTx}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tx-hash"
                                title={merchant.approvalTx}
                            >
                                <i className="fas fa-external-link-alt"></i>
                                {`${merchant.approvalTx.slice(0, 8)}...${merchant.approvalTx.slice(-6)}`}
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* 证书模态框 */}
            {showCertificateModal && (
                <div className="modal">
                    <div className="modal-content certificate-modal">
                        {/* 添加右上角关闭按钮 */}
                        <button className="close-button" onClick={() => setShowCertificateModal(false)}>
                            <i className="fas fa-times"></i>
                            ×
                        </button>
                        
                        <h2>商户数字证书</h2>
                        
                        {/* 证书选择器 */}
                        {certificates.length > 1 && (
                            <div className="certificate-selector-container">
                                <div className="certificate-selector">
                                    <label>选择证书版本：</label>
                                    <select 
                                        value={selectedCertificate?.tokenId.toString()} 
                                        onChange={(e) => {
                                            console.log("选择证书:", e.target.value);
                                            const selected = certificates.find(cert => 
                                                cert.tokenId.toString() === e.target.value
                                            );
                                            console.log("找到证书:", selected);
                                            if (selected) {
                                                setSelectedCertificate(selected);
                                            }
                                        }}
                                    >
                                        {certificates.map((cert, index) => (
                                            <option key={cert.tokenId.toString()} value={cert.tokenId.toString()}>
                                                证书 #{index + 1} - 发行日期: {cert.issueDate}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        {selectedCertificate ? (
                            <div className="certificate-details">
                                <div className="certificate-header">
                                    <div className="certificate-title">商户数字证书</div>
                                    <div className="certificate-subtitle">Merchant digital License</div>
                                </div>
                                
                                <div className="certificate-body">
                                    <div className="certificate-item">
                                        <span className="label">TOKEN ID:</span>
                                        <span>{selectedCertificate.tokenId.toString()}</span>
                                    </div>
                                    
                                    <div className="certificate-item">
                                        <span className="label">商户ID:</span>
                                        <span>{selectedCertificate.merchantId}</span>
                                    </div>
                                    
                                    <div className="certificate-item">
                                        <span className="label">证书编号:</span>
                                        <span>{selectedCertificate.certificateNumber}</span>
                                    </div>
                                    
                                    <div className="certificate-item">
                                        <span className="label">发行日期:</span>
                                        <span>{selectedCertificate.issueDate}</span>
                                    </div>
                                    
                                    <div className="certificate-item">
                                        <span className="label">到期日期:</span>
                                        <span>{selectedCertificate.expiryDate}</span>
                                    </div>
                                    
                                    <div className="certificate-item">
                                        <span className="label">证书状态:</span>
                                        <span className={`status ${selectedCertificate.status === "有效" ? "valid" : selectedCertificate.status === "已过期" ? "expired" : "revoked"}`}>
                                            {selectedCertificate.status}
                                        </span>
                                    </div>
                                    {selectedCertificate.status === "已撤销" && (
                                        <div className="certificate-item">
                                            <span className="label">撤销原因:</span>
                                            <span>{selectedCertificate.revokeReason || "无"}</span>
                                        </div>
                                    )}
                                    <div className="certificate-item ipfs-hash-item">
                                        <span className="label">IPFS HASH:</span>
                                        <a 
                                            href={selectedCertificate.ipfsHash} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="ipfs-link"
                                        >
                                            {selectedCertificate.ipfsHash}
                                            <i className="fas fa-external-link-alt"></i>
                                        </a>
                                    </div>
                                </div>
                                
                                <div className="certificate-footer">
                                    <div className="certificate-verification">
                                        <p>区块链验证信息</p>
                                        <p>合约地址: {MERCHANT_NFT_ADDRESS}</p>
                                    </div>
                                    <div className="certificate-actions">
                                        <button 
                                            className="verify-btn"
                                            onClick={() => window.open(`https://sepolia.etherscan.io/token/${MERCHANT_NFT_ADDRESS}?a=${selectedCertificate.tokenId}`, '_blank')}
                                        >
                                            在区块浏览器上查看
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-certificate">未找到证书信息</div>
                        )}
                    </div>
                </div>
            )}

            {/* 经营许可证模态框 */}
            {showImageModal && (
                <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
                    <div className="image-modal" onClick={e => e.stopPropagation()}>
                        <span className="close" onClick={() => setShowImageModal(false)}>&times;</span>
                        <img
                            src={merchant.metadataURI || "https://via.placeholder.com/800x500"}
                            alt={`${merchant.name}的经营许可证`}
                            className="modal-image"
                            onError={(e) => {
                                e.target.src = "https://via.placeholder.com/800x500?text=暂无许可证图片";
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantDetail;
