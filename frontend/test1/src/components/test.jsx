import React, { useState, useEffect } from "react";
import { getContract } from './contractConnect';
import { PINATA_CONFIG } from '../config';
import "./test.css";

const MerchantManager2 = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [merchantInfo, setMerchantInfo] = useState(null); // 定义 merchantInfo 状态变量
    const [modalType, setModalType] = useState(""); // "update" 或 "create"
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [metadataURI, setMetadataURI] = useState("");
    const [merchantId, setMerchantId] = useState("");
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [merchants, setMerchants] = useState([]); // 存储所有商户信息
    const [hasSearched, setHasSearched] = useState(false); // 是否已经搜索过商户
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchResultsRef = React.useRef(null); // 添加这一行
    const searchContainerRef = React.useRef(null); // 添加这一行
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [approvalProgresses, setApprovalProgresses] = useState([]); // 改为数组存储多个商户的进度
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [currentAddress, setCurrentAddress] = useState(null);
    const [showMyMerchantsOnly, setShowMyMerchantsOnly] = useState(false);

    // 添加处理图片上传的函数
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // 搜索建议函数
    const handleSearchInput = (value) => {
        setSearchKeyword(value);
        if (!value.trim()) {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // 从merchants中筛选匹配的建议
        const suggestions = merchants.filter(merchant =>
            merchant.name.toLowerCase().includes(value.toLowerCase()) ||
            merchant.description.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5); // 最多显示5个建议

        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
    };

    // 执行搜索
    const handleSearch = () => {
        if (!searchKeyword.trim()) {
            alert('请输入搜索关键词');
            return;
        }

        const results = merchants.filter(merchant =>
            merchant.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            merchant.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            merchant.owner.toLowerCase().includes(searchKeyword.toLowerCase())
        );

        if (results.length > 0) {
            // 设置第一个搜索结果为商户信息
            setMerchantInfo(results[0]);
            setShowSearchResults(true);
            setHasSearched(true);
        } else {
            alert('未找到匹配的商户信息');
            setMerchantInfo(null);
            setShowSearchResults(false);
            setHasSearched(false);
        }

        setSearchResults(results);
        setShowSuggestions(false);
    };

    // 选择搜索建议
    const handleSelectSuggestion = (merchant) => {
        setSearchKeyword(merchant.name);
        setMerchantInfo(merchant);
        setShowSearchResults(true);
        setShowSuggestions(false);
    };

    // 创建商户的函数
    const submitMerchant = async (name, description, metadataURI) => {
        try {
            // 检查参数是否有效
            if (!name || !description || !metadataURI) {
                alert("请填写完整的商户信息");
                return;
            }

            const contract = await getContract();
            const tx = await contract.submitMerchant(name, description, metadataURI);
            console.log(tx)
            await tx.wait();
            alert("您的申请信息已提交");
        } catch (error) {
            console.error("提交商户信息失败:", error);
            alert("提交商户信息失败");
        }
    };

    // 更新商户信息的函数
    const updateMerchant = async (merchantId, newName, newDescription) => {
        try {
            const contract = await getContract();
            const tx = await contract.updateMerchant(merchantId, newName, newDescription);
            await tx.wait(); // 等待交易完成
            console.log("商户信息更新成功:", tx);
            alert("商户信息更新成功！");
        } catch (error) {
            console.error("更新商户信息失败:", error);
            alert("更新商户信息失败！");
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

    // 获取所有商户信息的函数
    const fetchAllMerchants = async () => {
        try {
            const contract = await getContract();
            const merchantCount = await getMaxMerchantId() + 1; // 获取商户总数
            const merchantList = [];

            for (let i = 0; i < merchantCount; i++) {
                try {
                    const merchant = await contract.getMerchant(i);
                    merchantList.push({
                        id: i,
                        name: merchant.name,
                        description: merchant.description,
                        metadataURI: merchant.metadataURI,
                        isActive: merchant.isActive,
                        reputationScore: merchant.reputationScore?.toString(),
                        owner: merchant.owner,
                        isApproved: merchant.isApproved,
                    });
                    console.log(`商户 ID ${i} 信息:`, merchantList[i]);
                } catch (error) {
                    console.error(`获取商户 ID ${i} 信息失败:`, error);
                }
            }

            setMerchants(merchantList); // 更新商户列表
        } catch (error) {
            console.error("获取商户列表失败:", error);
        }
    };

    // 检查当前用户是否为管理员
    const checkAdmin = async () => {
        try {
            const contract = await getContract();
            const signer = contract.runner;
            const signerAddress = await signer.getAddress(); // 获取当前用户地址
            const ownerAddress = await contract.owner(); // 获取合约拥有者地址

            console.log("当前用户地址:", signerAddress);
            console.log("合约拥有者地址:", ownerAddress);

            return signerAddress.toLowerCase() === ownerAddress.toLowerCase(); // 比较地址
        } catch (error) {
            console.error("检查管理员权限失败:", error);
            return false;
        }
    };
    const handleCreateMerchant = async () => {
        if (!name || !description) {
            alert("请填写商户名称和描述");
            return;
        }
    
        try {
            let imageUrl = "https://gateway.pinata.cloud/ipfs/bafkreicpbolqp2bgjsaeoqfwtoyagqq6itao4ae3wmjeuwc4562y4e6vde"; // 默认图片
    
            if (imageFile) {
                // 上传图片到 IPFS
                const formData = new FormData();
                formData.append('file', imageFile);
    
                const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                    method: 'POST',
                    headers: {
                        'pinata_api_key': PINATA_CONFIG.apiKey,
                        'pinata_secret_api_key': PINATA_CONFIG.apiSecret,
                    },
                    body: formData
                });
    
                const data = await response.json();
                imageUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
            }
    
            await submitMerchant(name, description, imageUrl);
            
            // 重置表单
            setName("");
            setDescription("");
            setImageFile(null);
            setImagePreview(null);
            setShowModal(false);
            
            // 刷新商户列表
            fetchAllMerchants();
        } catch (error) {
            console.error("创建商户失败:", error);
            alert("创建商户失败，请重试");
        }
    };
    

    const handleUpdateMerchant = async () => {
        if (!merchantId || !newName || !newDescription) {
            alert("请填写完整的商户信息");
            return;
        }

        await updateMerchant(merchantId, newName, newDescription);
    };

    // 添加获取审核进度的函数
    const fetchApprovalProgress = async () => {
        try {
            const contract = await getContract();
            const signer = contract.runner;
            const signerAddress = await signer.getAddress();
            let merchantProgresses = [];
    
            // 获取未审核商户列表
            const unapprovedCount = await contract.getUnapprovedMerchantCount();
            console.log("未审核商户数量:", unapprovedCount);
    
            // 遍历未审核商户
            for (let i = 0; i < unapprovedCount; i++) {
                try {
                    const merchant = await contract.getUnapprovedMerchant(i);
                    if (merchant.owner.toLowerCase() === signerAddress.toLowerCase()) {
                        // 直接添加未审核商户
                        merchantProgresses.push({
                            id: i,
                            name: merchant.name,
                            submitted: true,
                            pending: true,
                            approved: false,
                        });
                    }
                } catch (error) {
                    console.error(`获取未审核商户 ${i} 信息失败:`, error);
                }
            }
    
            // 获取已审核商户列表
            const merchantCount = await getMaxMerchantId() + 1;
            console.log("已审核商户数量:", merchantCount);
    
            for (let i = 0; i < merchantCount; i++) {
                try {
                    const merchant = await contract.getMerchant(i);
                    if (merchant.owner.toLowerCase() === signerAddress.toLowerCase()) {
                        // 检查是否已经添加过这个商户
                        const existingProgress = merchantProgresses.find(p => p.name === merchant.name);
                        if (!existingProgress) {
                            merchantProgresses.push({
                                id: i,
                                name: merchant.name,
                                submitted: true,
                                pending: true,
                                approved: merchant.isApproved,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`获取商户 ID ${i} 信息失败:`, error);
                    continue; // 跳过错误继续执行
                }
            }
    
            console.log("找到的商户进度数量:", merchantProgresses.length);
            console.log("商户进度列表:", merchantProgresses);
    
            if (merchantProgresses.length === 0) {
                alert("未找到您提交的商户信息");
            } else {
                setApprovalProgresses(merchantProgresses);
                setShowProgressModal(true);
            }
    
        } catch (error) {
            console.error("获取审核进度失败:", error);
            alert("获取审核进度失败，请稍后重试");
        }
    };

    // 页面加载时获取所有商户信息
    useEffect(() => {
        const getCurrentAddress = async () => {
            try {
                const contract = await getContract();
                const signer = contract.runner;
                const address = await signer.getAddress();
                setCurrentAddress(address);
            } catch (error) {
                console.error("获取当前地址失败:", error);
            }
        };

        getCurrentAddress();
        fetchAllMerchants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const handleClickOutside = (event) => {
            if ((showSearchResults || showSuggestions) &&
                searchResultsRef.current &&
                searchContainerRef.current &&
                !searchResultsRef.current.contains(event.target) &&
                !searchContainerRef.current.contains(event.target)) {
                setShowSearchResults(false);
                setShowSuggestions(false);
                setSearchResults([]);
                setMerchantInfo(null);
                setHasSearched(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [searchResults, showSuggestions]);

    return (
        <div className="container">
            {/* 导航栏 */}
            <div className="navbar">
                <div className="navbar-brand">商户认证系统</div>
                {currentAddress && (
                    <div className="wallet-display">
                        <span className="address">
                            {`当前登录地址:${currentAddress.slice(0, 10)}...${currentAddress.slice(-6)}`}
                        </span>
                    </div>
                )}
                {/*搜索栏*/}
                <div className="search-container" ref={searchContainerRef}>
                    <div className="search-bar">

                        <input
                            type="text"
                            placeholder="输入商户名称、描述或地址搜索"
                            value={searchKeyword}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            className="search-input"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch();
                                }
                            }}
                            onFocus={() => {
                                if (searchSuggestions.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                        />
                        <button className="search-button" onClick={handleSearch}>
                            搜索
                        </button>
                    </div>

                    {/* 搜索建议 */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="search-suggestions">
                            {searchSuggestions.map((merchant) => (
                                <div
                                    key={merchant.id}
                                    className="suggestion-item"
                                    onClick={() => handleSelectSuggestion(merchant)}
                                >
                                    <div className="suggestion-name">{merchant.name}</div>
                                    <div className="suggestion-description">{merchant.description}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 搜索结果 */}
                {hasSearched && merchantInfo && (
                    <div className="search-results" ref={searchResultsRef}>
                        <div className="merchant-info">
                            <h3>{merchantInfo.name}</h3>
                            <p className="merchant-description">{merchantInfo.description}</p>
                            <p className="merchant-owner">所有者: {merchantInfo.owner}</p>
                            <p className="merchant-status">
                                状态: {merchantInfo.isActive ? "活跃" : "非活跃"}
                            </p>
                            <p className="merchant-reputation">
                                信誉积分: {merchantInfo.reputationScore}
                            </p>
                            <p>审核状态: {merchantInfo.isApproved ? "已审核" : "未审核"}</p>
                        </div>
                    </div>
                )}


                <div className="navbar-buttons">
                    <button
                        className="button progress-button"
                        onClick={() => {
                            fetchApprovalProgress();
                            setShowProgressModal(true);
                        }}
                    >
                        查看审核进度
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button
                            className="button button--function"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            功能选项
                        </button>
                        {showDropdown && (
                            <div className="dropdown">
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setModalType("create");
                                        setShowModal(true);
                                        setShowDropdown(false);
                                    }}
                                >
                                    创建商户
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setModalType("update");
                                        setShowModal(true);
                                        setShowDropdown(false);
                                    }}
                                >
                                    更新商户
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className="button button--admin"
                        onClick={async () => {
                            const isAdmin = await checkAdmin();
                            if (isAdmin) {
                                window.location.href = "/admin";
                            } else {
                                alert("您不是系统管理员，无法访问此界面");
                            }
                        }}
                    >
                        管理员入口
                    </button>
                </div>
            </div>

            {/*首页商户列表*/}
            <div className="container">
                <div className="section-header">
                    <h2 className="page-title">商户列表</h2>
                    <button
                        className="my-merchants-toggle"
                        onClick={() => setShowMyMerchantsOnly(!showMyMerchantsOnly)}
                    >
                        {showMyMerchantsOnly ? "查看全部商户" : "只看我的商户"}
                    </button>
                </div>
                <div className="section-divider"></div>
                <div className="merchant-grid">
                    {merchants
                        .filter(merchant => !showMyMerchantsOnly || 
                            (currentAddress && merchant.owner.toLowerCase() === currentAddress.toLowerCase()))
                        .map((merchant) => (
                            <div
                                className="merchant-card"
                                key={merchant.id}
                                onClick={() => window.location.href = `/merchant/${merchant.id}`}
                                style={{ cursor: 'pointer' }}
                            >
                                <img
                                    src={merchant.metadataURI || "https://gateway.pinata.cloud/ipfs/bafkreicpbolqp2bgjsaeoqfwtoyagqq6itao4ae3wmjeuwc4562y4e6vde"}
                                    alt={merchant.name}
                                    className="merchant-image"
                                />
                                <div className="merchant-info">
                                    <h3 className="merchant-name">{merchant.name}</h3>
                                    <p className="merchant-description">{merchant.description}</p>
                                    <p className="merchant-owner">所有者: {merchant.owner}</p>
                                    <p className="merchant-status">
                                        状态: {merchant.isActive ? "活跃" : "非活跃"}
                                    </p>
                                    <p className="merchant-reputation">
                                        信誉积分: {merchant.reputationScore}
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
            {/* 模态框 */}
            {showModal && modalType === "create" && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>创建商户</h2>
                        <input
                            type="text"
                            placeholder="商户名称"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                        />
                        <input
                            type="text"
                            placeholder="商户描述"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input"
                        />
                        <div className="image-upload-container">
                            <label className="file-input-label">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="file-input"
                                />
                                选择商户图片
                            </label>
                            {imagePreview && (
                                <div className="image-preview">
                                    <img src={imagePreview} alt="预览" />
                                </div>
                            )}
                        </div>
                        <button 
                            className="button" 
                            onClick={handleCreateMerchant}
                        >
                            创建商户
                        </button>
                        <button
                            className="button cancel-button"
                            onClick={() => {
                                setShowModal(false);
                                setName("");
                                setDescription("");
                                setImageFile(null);
                                setImagePreview(null);
                            }}
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}
            {showModal && modalType === "update" && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>更新商户信息</h2>
                        <input
                            type="number"
                            placeholder="商户 ID"
                            value={merchantId}
                            onChange={(e) => setMerchantId(e.target.value)}
                            className="input"
                        />
                        <input
                            type="text"
                            placeholder="新的商户名称"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="input"
                        />
                        <input
                            type="text"
                            placeholder="新的商户描述"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            className="input"
                        />
                        <button className="button" onClick={handleUpdateMerchant}>
                            更新商户
                        </button>
                        <button
                            className="button cancel-button"
                            onClick={() => {
                                setShowModal(false);
                                // 清空所有输入框
                                setName("");
                                setDescription("");
                                setMetadataURI("");
                                setMerchantId("");
                                setNewName("");
                                setNewDescription("");
                            }}
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}
            {/* 在最外层 div 的末尾添加 */}
            {showProgressModal && (
                <div className="modal">
                    <div className="modal-content progress-modal">
                        <div className="modal-header">
                            <button
                                className="refresh-button"
                                onClick={() => fetchApprovalProgress()}
                            >
                                刷新
                            </button>
                            <button
                                className="close-button"
                                onClick={() => setShowProgressModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <h2>审核进度</h2>
                        {approvalProgresses.map((progress, index) => (
                            <div key={index} className="merchant-progress">
                                <h3 className="merchant-name">{progress.name}</h3>
                                <div className="progress-container">
                                    <div className="progress-timeline">
                                        <div className={`progress-step ${progress.submitted ? 'active' : ''}`}>
                                            <div className="step-icon">
                                                <i className="fas fa-file-alt"></i>
                                            </div>
                                            <div className="step-label">已提交申请</div>
                                            {progress.timestamp && (
                                                <div className="step-time">{progress.timestamp}</div>
                                            )}
                                        </div>
                                        <div className={`progress-line ${progress.pending ? 'active' : ''}`}></div>
                                        <div className={`progress-step ${progress.pending ? 'active' : ''}`}>
                                            <div className="step-icon">
                                                <i className="fas fa-clock"></i>
                                            </div>
                                            <div className="step-label">等待审核</div>
                                        </div>
                                        <div className={`progress-line ${progress.approved ? 'active' : ''}`}></div>
                                        <div className={`progress-step ${progress.approved ? 'active' : ''}`}>
                                            <div className="step-icon">
                                                <i className="fas fa-check-circle"></i>
                                            </div>
                                            <div className="step-label">审核通过</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantManager2;