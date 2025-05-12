import React, { useState, useEffect } from "react";
import { getContract } from "./contractConnect";
import { getNFTContract } from "./nftConnect";
import { ethers } from 'ethers';
import "./AdminPanel.css"; // 引入样式文件

const AdminPanel = () => {
    const [pendingMerchants, setPendingMerchants] = useState([]); // 添加状态变量
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [events, setEvents] = useState([]); // 添加监听事件状态
    const [showAllEvents, setShowAllEvents] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [totalMerchants, setTotalMerchants] = useState(0);
    const [totalMintedNFTs, setTotalMintedNFTs] = useState(0);

    // 获取未审核商户的函数
    const fetchUnapprovedMerchants = async () => {
        try {
            const contract = await getContract();
            const count = await contract.getUnapprovedMerchantCount(); // 获取未审核商户数量
            const merchants = [];

            for (let i = 0; i < count; i++) {
                try {
                    const merchant = await contract.getUnapprovedMerchant(i); // 获取每个未审核商户的信息
                    merchants.push({
                        name: merchant.name,
                        description: merchant.description,
                        metadataURI: merchant.metadataURI,
                        owner: merchant.owner,
                    });
                } catch (error) {
                    console.error(`获取商户 ${i} 信息失败:`, error);
                }
            }

            setPendingMerchants(merchants);
            console.log(merchants) // 更新状态
        } catch (error) {
            console.error("获取未审核商户失败:", error);
        }
    };

    // 审核商户的函数
    const approveMerchant = async (index, approved) => {
        try {
            const contract = await getContract();
            const merchant = pendingMerchants[index];

            if (approved) {
                const tx = await contract.approveMerchant(index, approved); // 审核通过
                await tx.wait(); // 等待交易完成
                alert(`商户 ${merchant.name} 审核通过并已创建`);
            } else {
                // 向用户发送拒绝原因
                const tx = await contract.approveMerchant(index, approved); // 审核通过
                await tx.wait();
                alert(`商户 ${merchant.name} 审核拒绝，原因：`);
            }

            // 从未审核列表中移除商户
            setPendingMerchants((prev) => prev.filter((_, i) => i !== index));
        } catch (error) {
            console.error("审核商户失败:", error);
            alert("审核商户失败");
        }
    };

    // 获取最大商户 ID 的函数

    const getMaxMerchantId = async () => {
        try {
            const contract = await getContract();
            let merchantId = 0;

            // 假设商户 ID 是从 0 开始递增的
            while (true) {
                try {
                    const merchant = await contract.getMerchant(merchantId);
                    if (!merchant || !merchant[0]) {
                        throw new Error(`商户 ID ${merchantId} 信息为空或无效`);
                    }
                    merchantId++;
                } catch (error) {
                    console.log(`商户 ID ${merchantId} 不存在，退出循环`);
                    break;
                }
            }

            console.log("最大商户 ID:", merchantId - 1);
            return merchantId - 1; // 返回最大有效商户 ID
        } catch (error) {
            console.error("获取最大商户 ID 失败:", error);
            return -1; // 返回 -1 表示获取失败
        }
    };

    const handleGetMaxMerchantId = async () => {
        const maxMerchantId = await getMaxMerchantId();
        if (maxMerchantId !== -1) {
            alert(`当前最大商户 ID 为: ${maxMerchantId}`);
        } else {
            alert("获取最大商户 ID 失败");
        }
    };

    // 以下是监听函数
    // 监听商户创建事件
    const fetchHistoricalEvents = async () => {
        try {
            const contract = await getContract();
            const nftContract = await getNFTContract();
            const contractAddress = contract.target;
            const nftContractAddress = nftContract.target;

            console.log("正在获取合约地址:", contractAddress, "的事件");
            console.log("正在获取合约地址:", nftContractAddress, "的事件");

            // 获取事件并添加错误处理
            const getEventsWithErrorHandling = async (eventName, contractInstance) => {
                try {
                    const events = await contractInstance.queryFilter(eventName);
                    console.log(`成功获取 ${eventName} 事件`);
                    console.log('事件详情:', events);
                    return events;
                } catch (error) {
                    console.error(`获取 ${eventName} 事件失败:`, error);
                    return [];
                }
            };

            // 分别获取各类事件
            const [createdEvents, updatedEvents, approvedEvents, submittedEvents] = await Promise.all([
                getEventsWithErrorHandling("MerchantCreated", contract),
                getEventsWithErrorHandling("MerchantUpdated", contract),
                getEventsWithErrorHandling("MerchantApproved", contract),
                getEventsWithErrorHandling("MerchantSubmitted", contract)
            ]);

            // 获取NFT相关事件
            const [certificateIssuedEvents] = await Promise.all([
                getEventsWithErrorHandling("CertificateIssued", nftContract)
            ]);

            console.log(`找到证书铸造事件: ${certificateIssuedEvents ? certificateIssuedEvents.length : 0} 个`);
            console.log(`找到创建事件: ${createdEvents ? createdEvents.length : 0} 个`);
            console.log(`找到更新事件: ${updatedEvents ? updatedEvents.length : 0} 个`);
            console.log(`找到审核事件: ${approvedEvents ? approvedEvents.length : 0} 个`);
            console.log(`找到提交事件: ${submittedEvents ? submittedEvents.length : 0} 个`);
            console.log(`找到证书铸造事件: ${certificateIssuedEvents ? certificateIssuedEvents.length : 0} 个`);

            // 处理事件时添加错误处理
            const processEvent = async (event, type, isNFTEvent = false, createdEvents = [], submittedEvents = []) => {
                try {
                    // 检查事件是否存在
                    if (!event || !event.topics) {
                        console.error(`事件或事件主题为空: ${type}`);
                        return null;
                    }

                    // 获取区块信息以获取时间戳
                    const provider = isNFTEvent ?
                        (await getNFTContract()).runner.provider :
                        (await getContract()).runner.provider;
                    const block = await provider.getBlock(event.blockNumber);
                    const timestamp = block ? new Date(block.timestamp * 1000).toLocaleString() : "未知时间";

                    let message;
                    let initiator;

                    if (isNFTEvent) {
                        // 处理NFT事件
                        switch (type) {
                            case "证书铸造":
                                try {
                                    // 从事件数据中解析tokenId和merchantId
                                    const tokenId = parseInt(event.topics[1], 16).toString();
                                    const merchantId = parseInt(event.topics[2], 16).toString();
                                    // 只解码一个 uint256
                                    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                        ["uint256"],
                                        event.data
                                    );
                                    const expiryDate = new Date(Number(decoded[0]) * 1000).toLocaleDateString();

                                    message = `商户(ID: ${merchantId})的NFT证书(ID: ${tokenId})已铸造，有效期至${expiryDate}`;
                                    const tx = await provider.getTransaction(event.transactionHash);
                                    initiator = tx ? tx.from : "未知";
                                    return {
                                        type,
                                        timestamp,
                                        message,
                                        initiator: initiator || "未知",
                                        txHash: event.transactionHash,
                                        blockNumber: event.blockNumber,
                                        tokenId,                                // 添加tokenId字段
                                        merchantId,                             // 添加merchantId字段
                                        expiryDate: Number(decoded[0]) * 1000,  // 添加expiryDate字段（毫秒时间戳）
                                        expiryDateFormatted: expiryDate         // 添加格式化的到期日期
                                    };
                                } catch (error) {
                                    console.error("解析证书铸造事件失败:", error);
                                    message = "NFT证书已铸造";
                                    initiator = "未知";
                                }
                                break;
                            default:
                                message = `未知NFT事件`;
                                initiator = "未知";
                        }
                        return {
                            type,
                            timestamp,
                            message,
                            initiator: initiator || "未知",
                            txHash: event.transactionHash,
                            blockNumber: event.blockNumber
                        };
                    } else {
                        // 从topics中获取merchantId (第二个topic)
                        const merchantId = parseInt(event.topics[1], 16).toString();

                        switch (type) {
                            case "创建商户":
                                try {
                                    // 获取商户信息
                                    const merchant = await contract.getMerchant(merchantId);
                                    if (merchant && merchant.name) {
                                        message = `商户 ${merchant.name} (ID: ${merchantId}) 已创建`;
                                        initiator = "0x" + event.topics[2].slice(26); // 从事件主题中获取创建者地址
                                    } else {
                                        message = `商户 (ID: ${merchantId}) 已创建`;
                                        initiator = "0x" + event.topics[2].slice(26);
                                    }
                                } catch (error) {
                                    console.error(`获取商户信息失败:`, error);
                                    message = `商户 (ID: ${merchantId}) 已创建`;
                                    initiator = "0x" + event.topics[2].slice(26);
                                }
                                break;

                            case "更新商户":
                                const updatedName = new ethers.AbiCoder().decode(['string'], event.data)[0];
                                message = `商户 ${updatedName} (ID: ${merchantId}) 信息已更新`;
                                const updateTx = await contract.runner.provider.getTransaction(event.transactionHash);
                                initiator = updateTx ? updateTx.from : "未知";
                                break;

                            case "商户审核":
                                try {
                                    const merchantIndex = event.args[0].toString();
                                    const isApproved = event.args[1];

                                    // 尝试获取商户名称
                                    let merchantName = "";

                                    // 从提交事件中查找对应的商户名称
                                    const relatedSubmitEvent = submittedEvents.find(se => {
                                        // 通常提交事件和审核事件会关联同一个商户索引
                                        try {
                                            return se.args && se.args[1].toString() === merchantIndex;
                                        } catch (e) {
                                            return false;
                                        }
                                    });

                                    if (relatedSubmitEvent && relatedSubmitEvent.args) {
                                        // 从提交事件中获取商户名称
                                        merchantName = relatedSubmitEvent.args[0] || "未知商户";
                                    }
                                    // 获取交易信息以确定审核人
                                    const tx = await provider.getTransaction(event.transactionHash);
                                    initiator = tx ? tx.from : "未知";
                                    message = `商户 ${merchantName}的审核${isApproved ? "通过" : "被拒绝"}`;
                                } catch (error) {
                                    console.error("解析商户审核事件失败:", error);
                                    message = "商户审核事件";
                                    initiator = "未知";
                                }
                                break;

                            case "申请提交":
                                try {
                                    // 从事件参数中获取数据
                                    const decodedData = contract.interface.parseLog({
                                        topics: event.topics,
                                        data: event.data
                                    });

                                    // 直接从解码后的数据中获取商户名称和提交者地址
                                    const merchantName = decodedData.args[0];  // 商户名称
                                    const submitter = decodedData.args[2];     // 提交者地址

                                    message = `新商户 ${merchantName} 申请已提交`;
                                    initiator = submitter;
                                } catch (error) {
                                    console.error("解析申请提交事件失败:", error);
                                    message = `新商户申请已提交 (ID: ${merchantId})`;
                                    initiator = "未知提交者";
                                }
                                break;

                            default:
                                console.error(`未知事件类型: ${type}`);
                                return null;
                        }

                        return {
                            type,
                            timestamp,
                            message,
                            initiator: initiator || "未知",
                            txHash: event.transactionHash,
                            blockNumber: event.blockNumber  // 确保包含区块高度
                        };
                    }
                } catch (error) {
                    console.error(`处理事件失败: ${type}`, error);
                    return null;
                }
            };

            // 处理所有事件
            const processedEvents = await Promise.all([
                ...createdEvents.map(event => processEvent(event, "创建商户")),
                ...updatedEvents.map(event => processEvent(event, "更新商户")),
                ...approvedEvents.map(event => processEvent(event, "商户审核")),
                ...submittedEvents.map(event => processEvent(event, "申请提交")),
                ...certificateIssuedEvents.map(event => processEvent(event, "证书铸造", true))
            ]);

            // 过滤掉处理失败的事件
            const validEvents = processedEvents.filter(event => event != null);

            // 按时间戳排序
            validEvents.sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            setEvents(validEvents);
            return validEvents;
        } catch (error) {
            console.error("获取历史事件失败:", error);
        }
    };

    // 在 AdminPanel 组件内添加 handleMerchantSelect 函数
    const handleMerchantSelect = (merchant) => {
        setSelectedMerchant(merchant);
        setShowModal(true);

        // 可以在这里添加显示商户详细信息的逻辑
        // 例如，显示一个带有审核选项的模态框
        const merchantDetails = `
                商户名称: ${merchant.name}
                描述: ${merchant.description}
                所有者: ${merchant.owner}
                经营许可证: ${merchant.metadataURI}
                `;
    };

    // Fetch total minted NFTs
    const fetchTotalMintedNFTs = async () => {
        try {
            const contract = await getNFTContract();
            const totalMinted = await contract.totalSupply();
            setTotalMintedNFTs(totalMinted.toString());
        } catch (error) {
            console.error("获取已发行NFT总数失败:", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                await fetchUnapprovedMerchants();
                // 获取总商户数
                const maxId = await getMaxMerchantId();
                setTotalMerchants(maxId + 1);
                // 获取总发行NFT数量
                await fetchTotalMintedNFTs();
                // 先获取历史事件
                const historicalEvents = await fetchHistoricalEvents();
                setEvents(historicalEvents);

                // 设置实时事件监听
                const contract = await getContract();

                // 监听新的商户创建事件
                contract.on("MerchantCreated", (merchantId, name, owner, event) => {
                    const newEvent = {
                        type: "创建商户",
                        message: `商户 ${name} (ID: ${merchantId}) 已创建`,
                        timestamp: new Date().toLocaleString(),
                        txHash: event.transactionHash,
                        initiator: owner,
                        blockNumber: event.blockNumber
                    };
                    setEvents(prev => [newEvent, ...prev]);
                });

                // 监听新的商户更新事件
                contract.on("MerchantUpdated", (merchantId, name, owner, event) => {
                    const newEvent = {
                        type: "更新商户",
                        message: `商户 ${name} (ID: ${merchantId}) 信息已更新`,
                        timestamp: new Date().toLocaleString(),
                        txHash: event.transactionHash,
                        initiator: owner || event.from || "未知",
                        blockNumber: event.blockNumber
                    };
                    setEvents(prev => [newEvent, ...prev]);
                });

                // 监听新的商户审核事件
                contract.on("MerchantApproved", async (merchantId, approved, event) => {
                    let merchantName = "未知商户";
                    if (approved) {
                        // 审核通过，查找同一交易下的创建事件获取商户名
                        const createdEvents = await contract.queryFilter("MerchantCreated", event.blockNumber, event.blockNumber);
                        const createdEvent = createdEvents.find(
                            ce => ce.transactionHash === event.transactionHash
                        );
                        if (createdEvent) {
                            merchantName = createdEvent.args?.name || createdEvent.args?.[1] || "未知商户";
                        }
                    } else {
                        // 审核拒绝，查找同一交易下的提交事件获取商户名
                        const submittedEvents = await contract.queryFilter("MerchantSubmitted", event.blockNumber, event.blockNumber);
                        const submittedEvent = submittedEvents.find(
                            se => se.transactionHash === event.transactionHash
                        );
                        if (submittedEvent) {
                            merchantName = submittedEvent.args?.name || submittedEvent.args?.[0] || "商户";
                        }
                    }
                    const newEvent = {
                        type: "商户审核",
                        message: `商户 ${merchantName}${approved ? '审核通过' : '被审核拒绝'}`,
                        timestamp: new Date().toLocaleString(),
                        txHash: event.transactionHash,
                        initiator: event.from || "未知",
                        blockNumber: event.blockNumber
                    };
                    setEvents(prev => {
                        const exists = prev.some(e => e.txHash === event.transactionHash && e.type === "商户审核");
                        if (exists) return prev;
                        return [newEvent, ...prev];
                    });
                });

                // 监听新的商户提交事件
                contract.on("MerchantSubmitted", (merchantId, name, owner, event) => {
                    const newEvent = {
                        type: "申请提交",
                        ID: merchantId,
                        message: `新商户 ${name} 申请已提交`,
                        timestamp: new Date().toLocaleString(),
                        txHash: event.transactionHash,
                        initiator: owner,
                        blockNumber: event.blockNumber
                    };
                    setEvents(prev => [newEvent, ...prev]);
                });

                // 监听NFT证书铸造事件
                const nftContract = await getNFTContract();
                nftContract.on("CertificateIssued", async (tokenId, merchantId, expiryDate, event) => {
                    const formattedExpiryDate = new Date(Number(expiryDate) * 1000).toLocaleDateString();
                    const newEvent = {
                        type: "证书铸造",
                        message: `商户(商户ID: ${merchantId})的NFT证书(证书ID: ${tokenId})已铸造，有效期至${formattedExpiryDate}`,
                        timestamp: new Date().toLocaleString(),
                        txHash: event.transactionHash,
                        initiator: event.from || "未知",
                        blockNumber: event.blockNumber,
                        tokenId: tokenId.toString(),                    // 添加tokenId字段
                        merchantId: merchantId.toString(),              // 添加merchantId字段
                        expiryDate: Number(expiryDate) * 1000,          // 添加expiryDate字段（毫秒时间戳）
                        expiryDateFormatted: formattedExpiryDate        // 添加格式化的到期日期
                    };
                    setEvents(prev => [newEvent, ...prev]);
                });

            } catch (error) {
                console.error("初始化失败:", error);
            }
        };

        init();

        return () => {
            const cleanup = async () => {
                try {
                    const contract = await getContract();
                    await contract.removeAllListeners();
                } catch (error) {
                    console.error("清理事件监听器失败:", error);
                }
            };
            cleanup();
        };
    }, []);

    return (
        <div className="admin-container">
            {/* 导航栏 */}
            <nav className="admin-nav">
                <div className="nav-container">
                    <h1 className="admin-title">管理员控制面板</h1>
                    <button
                        className="back-button"
                        onClick={() => window.location.href = '/'}
                    >
                        <i className="fas fa-arrow-left"></i>
                        返回首页
                    </button>
                </div>
            </nav>

            <div className="admin-layout">
                {/* 主要内容区 */}
                <div className="main-content">
                    <div className="statistics-card">
                        <h2>链上数据一览</h2>
                        <div className="stat-grid">
                            <div className="stat-item">
                                <i className="fas fa-store"></i>
                                <div className="stat-info">
                                    <span className="stat-label">总商户数量</span>
                                    <span className="stat-value">{totalMerchants}</span>
                                </div>
                            </div>
                            <div className="stat-item">
                                <i className="fas fa-clock"></i>
                                <div className="stat-info">
                                    <span className="stat-label">待审核商户</span>
                                    <span className="stat-value">{pendingMerchants.length}</span>
                                </div>
                            </div>
                            <div className="stat-item">
                                <i className="fas fa-list-alt"></i>
                                <div className="stat-info">
                                    <span className="stat-label">总事件数量</span>
                                    <span className="stat-value">{events.length}</span>
                                </div>
                            </div>
                            <div className="stat-item">
                                <i className="fas fa-certificate"></i>
                                <div className="stat-info">
                                    <span className="stat-label">已发行NFT数量</span>
                                    <span className="stat-value">{totalMintedNFTs}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧待审核商户列表 */}
                <div className="pending-merchants-panel">
                    <div className="panel-header">
                        <h2>待审核商户</h2>
                        {pendingMerchants.length > 5 && (
                            <button className="toggle-btn" onClick={() => setShowAllPending(!showAllPending)}>
                                {showAllPending ? '收起' : '展开'}
                            </button>
                        )}
                    </div>
                    <div className="merchants-list">
                        {(showAllPending ? pendingMerchants : pendingMerchants.slice(0, 5))
                            .map((merchant, index) => (
                                <div key={index} className="merchant-item" onClick={() => handleMerchantSelect(merchant)}>
                                    <div className="merchant-brief">
                                        <h3>{merchant.name}</h3>
                                        <p className="merchant-id">简介: {merchant.description}</p>
                                    </div>
                                </div>
                            ))}
                        {!showAllPending && pendingMerchants.length > 5 && (
                            <div className="more-merchants">
                                还有 {pendingMerchants.length - 5} 个待审核商户
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* 底部事件监控 */}
            <div className="events-monitor">
                <div className="events-header">
                    <h2>事件监控</h2>
                    {events.length > 5 && (
                        <button className="toggle-btn" onClick={() => setShowAllEvents(!showAllEvents)}>
                            {showAllEvents ? '收起' : '展开'}
                        </button>
                    )}
                </div>
                <div className="events-list">
                    {(showAllEvents ? events : events.slice(0, 5)).map((event, index) => (
                        <div key={index} className="event-item" data-type={event.type}>
                            <div className="event-content">
                                <span className="event-type">{event.type}</span>
                                <span className="event-message">{event.message}</span>
                                <span className="event-time">{event.timestamp}</span>
                            </div>
                            <div className="event-details">
                                <span className="event-initiator" title={event.initiator}>
                                    {event.type === "商户审核" ? (
                                        // 对于商户审核事件，直接显示完整文本
                                        `审核人: ${event.initiator}`
                                    ) : (
                                        // 对于其他事件，只处理地址部分
                                        `申请人: ${event.initiator}`
                                    )}
                                </span>
                                <span className="event-block">区块: {event.blockNumber}</span>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="event-tx"
                                >
                                    查看交易
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && selectedMerchant && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>商户审核详情</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="merchant-info-grid">
                                <div className="info-group">
                                    <label>商户名称</label>
                                    <p>{selectedMerchant.name}</p>
                                </div>
                                <div className="info-group">
                                    <label>商户描述</label>
                                    <p>{selectedMerchant.description}</p>
                                </div>
                                <div className="info-group">
                                    <label>所有者地址</label>
                                    <p className="address">{selectedMerchant.owner}</p>
                                </div>
                                <div className="info-group license-preview">
                                    <label>经营许可证</label>
                                    <img
                                        src={selectedMerchant.metadataURI}
                                        alt="营业执照"
                                        onError={(e) => e.target.src = "https://via.placeholder.com/400x300?text=无法加载图片"}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="approve-button"
                                onClick={() => {
                                    const index = pendingMerchants.findIndex(
                                        (m) => m.owner === selectedMerchant.owner && m.name === selectedMerchant.name
                                    );
                                    if (index !== -1) {
                                        approveMerchant(index, true);
                                        setShowModal(false);
                                    }
                                }}
                            >
                                <i className="fas fa-check"></i>
                                审核通过
                            </button>
                            <button
                                className="reject-button"
                                onClick={() => {
                                    const index = pendingMerchants.findIndex(
                                        (m) => m.owner === selectedMerchant.owner && m.name === selectedMerchant.name
                                    );
                                    if (index !== -1) {
                                        approveMerchant(index, false);
                                        setShowModal(false);
                                    }
                                }}
                            >
                                <i className="fas fa-times"></i>
                                审核拒绝
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminPanel;